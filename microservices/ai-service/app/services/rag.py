from typing import Dict, Any, List
import re

import chromadb
from chromadb.config import Settings

from app.config import CHROMA_PATH
from app.services.embeddings import cheap_embedding
from app.services.text_utils import chunk_text

_client = chromadb.PersistentClient(path=CHROMA_PATH, settings=Settings(allow_reset=False))
_collection = _client.get_or_create_collection(
    name="course_materials",
    metadata={"hnsw:space": "cosine"}  # Use cosine similarity instead of L2
)


def _extract_keywords(text: str) -> List[str]:
    # Match words that are 2+ letters/numbers, OR single digits
    words = re.findall(r'\b[a-z0-9]{2,}\b|\b\d\b', text.lower())
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

    # Also upsert a dedicated title-only chunk so title searches always find this material
    title_chunk_id = f"{course_id}:{material_id}:title"
    title_doc = f"Material Title: {title}. This chunk represents the material titled \"{title}\". Any questions about {title} should reference this material."
    _collection.upsert(
        ids=[title_chunk_id],
        documents=[title_doc],
        embeddings=[cheap_embedding(title_doc)],
        metadatas=[{
            "course_id": course_id,
            "material_id": material_id,
            "chunk_id": "title",
            "title": title or ""
        }]
    )

    _collection.upsert(ids=ids, documents=docs, embeddings=embeddings, metadatas=metadatas)
    return {"indexed_chunks": len(ids)}


def retrieve_context(course_id: str, question: str, top_k: int = 10) -> List[Dict[str, Any]]:
    """
    Retrieve relevant chunks using cosine similarity + keyword boosting.
    ChromaDB cosine distance = 1 - cosine_similarity, so score = 1 - distance.
    """
    q_embedding = cheap_embedding(question)

    try:
        result = _collection.query(
            query_embeddings=[q_embedding],
            n_results=top_k,
            where={"course_id": course_id}
        )
    except Exception:
        return []

    docs = result.get("documents", [[]])[0]
    metas = result.get("metadatas", [[]])[0]
    distances = result.get("distances", [[]])[0]

    if not docs:
        return []

    query_keywords = _extract_keywords(question)

    rows = []
    for doc, meta, distance in zip(docs, metas, distances):
        # Cosine distance: 0 = identical, 2 = opposite
        # Convert to similarity: 1.0 = identical, -1.0 = opposite
        cosine_sim = 1.0 - float(distance) if distance is not None else 0.0

        # Keyword boost: add up to 0.35 for keyword overlap in chunk text
        kw_boost = _keyword_overlap_score(query_keywords, doc.lower()) * 0.35

        # Title boost: add up to 0.25 for keyword overlap with the material title
        title_text = (meta.get('title') or '').lower()
        title_boost = _keyword_overlap_score(query_keywords, title_text) * 0.25

        combined_score = min(1.0, cosine_sim + kw_boost + title_boost)

        rows.append({"text": doc, "meta": meta, "score": combined_score})

    # Re-rank by combined score (highest first)
    rows.sort(key=lambda r: r["score"], reverse=True)

    print(f"DEBUG RAG: Query '{question}' returned {len(docs)} raw docs. Top raw distances: {distances[:5]}")
    for i, r in enumerate(rows[:3]):
        print(f"DEBUG RAG [{i}]: Score: {r['score']:.3f} | Title: {r['meta'].get('title')} | snippet: {r['text'][:50]}")

    # Return top results - always return at least something if we have matches
    # Only filter truly irrelevant results (negative scores)
    rows = [r for r in rows if r["score"] > 0.0]
    
    print(f"DEBUG RAG: Returning {len(rows)} filtered docs")

    return rows
