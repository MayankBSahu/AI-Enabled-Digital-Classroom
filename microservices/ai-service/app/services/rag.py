from typing import Dict, Any, List
import re

import chromadb
from chromadb.config import Settings

from app.config import CHROMA_PATH
from app.services.embeddings import cheap_embedding
from app.services.text_utils import chunk_text

_client = chromadb.PersistentClient(path=CHROMA_PATH, settings=Settings(allow_reset=False))
_collection = _client.get_or_create_collection(name="course_materials")

# Minimum relevance score — filter out noise
RELEVANCE_THRESHOLD = 0.12


def _extract_keywords(text: str) -> List[str]:
    """Extract significant keywords from text (3+ char words, lowered)."""
    words = re.findall(r'[a-zA-Z]{3,}', text.lower())
    # Filter common stop words
    stop = {
        'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
        'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'will',
        'that', 'this', 'with', 'from', 'they', 'what', 'which', 'their',
        'about', 'would', 'there', 'could', 'other', 'into', 'more', 'some',
        'than', 'them', 'very', 'when', 'come', 'make', 'like', 'does'
    }
    return [w for w in words if w not in stop]


def _keyword_overlap_score(query_keywords: List[str], chunk_text_lower: str) -> float:
    """Calculate what fraction of query keywords appear in the chunk."""
    if not query_keywords:
        return 0.0
    hits = sum(1 for kw in query_keywords if kw in chunk_text_lower)
    return hits / len(query_keywords)


def ingest_material(course_id: str, material_id: str, title: str, text: str) -> Dict[str, Any]:
    chunks = chunk_text(text)
    if not chunks:
        return {"indexed_chunks": 0}

    ids: List[str] = []
    docs: List[str] = []
    embeddings: List[List[float]] = []
    metadatas: List[Dict[str, Any]] = []

    for idx, chunk in enumerate(chunks):
        cid = f"{course_id}:{material_id}:{idx}"
        ids.append(cid)
        docs.append(chunk)
        embeddings.append(cheap_embedding(chunk))
        metadatas.append(
            {
                "course_id": course_id,
                "material_id": material_id,
                "chunk_id": str(idx),
                "title": title or ""
            }
        )

    _collection.upsert(ids=ids, documents=docs, embeddings=embeddings, metadatas=metadatas)
    return {"indexed_chunks": len(ids)}


def retrieve_context(course_id: str, question: str, top_k: int = 8) -> List[Dict[str, Any]]:
    """
    Retrieve relevant chunks using vector similarity + keyword boosting.
    Returns more candidates and re-ranks with keyword overlap.
    """
    q_embedding = cheap_embedding(question)
    result = _collection.query(
        query_embeddings=[q_embedding],
        n_results=top_k,
        where={"course_id": course_id}
    )

    docs = result.get("documents", [[]])[0]
    metas = result.get("metadatas", [[]])[0]
    distances = result.get("distances", [[]])[0]

    query_keywords = _extract_keywords(question)

    rows = []
    for doc, meta, distance in zip(docs, metas, distances):
        # Base similarity score (ChromaDB returns L2 distance)
        base_score = max(0.0, 1.0 - float(distance)) if distance is not None else 0.0

        # Filter out irrelevant chunks
        if base_score < RELEVANCE_THRESHOLD:
            continue

        # Keyword boost: add up to 0.3 for keyword overlap
        kw_boost = _keyword_overlap_score(query_keywords, doc.lower()) * 0.3
        combined_score = min(1.0, base_score + kw_boost)

        rows.append({"text": doc, "meta": meta, "score": combined_score})

    # Re-rank by combined score (highest first)
    rows.sort(key=lambda r: r["score"], reverse=True)

    return rows
