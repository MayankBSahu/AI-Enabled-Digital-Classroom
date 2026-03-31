from typing import Dict, Any, List

import chromadb
from chromadb.config import Settings

from app.config import CHROMA_PATH
from app.services.embeddings import cheap_embedding
from app.services.text_utils import chunk_text

_client = chromadb.PersistentClient(path=CHROMA_PATH, settings=Settings(allow_reset=False))
_collection = _client.get_or_create_collection(name="course_materials")


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


def retrieve_context(course_id: str, question: str, top_k: int = 5) -> List[Dict[str, Any]]:
    q_embedding = cheap_embedding(question)
    result = _collection.query(
        query_embeddings=[q_embedding],
        n_results=top_k,
        where={"course_id": course_id}
    )

    docs = result.get("documents", [[]])[0]
    metas = result.get("metadatas", [[]])[0]
    distances = result.get("distances", [[]])[0]

    rows = []
    for doc, meta, distance in zip(docs, metas, distances):
        score = max(0.0, 1.0 - float(distance)) if distance is not None else 0.0
        rows.append({"text": doc, "meta": meta, "score": score})

    return rows
