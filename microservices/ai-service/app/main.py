from typing import Dict, Any

from fastapi import FastAPI

from app.schemas import (
    EvalRequest,
    EvalResponse,
    DoubtRequest,
    DoubtResponse,
    IngestRequest,
    DoubtQualityRequest,
    DoubtQualityResponse,
    Citation,
)
from app.services.evaluation import evaluate_submission
from app.services.rag import ingest_material, retrieve_context

app = FastAPI(title="AI Digital Classroom Service", version="1.0.0")


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok", "service": "ai-service"}


@app.post("/ingest-material")
async def ingest(payload: IngestRequest) -> Dict[str, Any]:
    out = ingest_material(payload.course_id, payload.material_id, payload.title, payload.text)
    return {"status": "indexed", **out}


@app.post("/evaluate-assignment", response_model=EvalResponse)
async def evaluate_assignment(payload: EvalRequest) -> Dict[str, Any]:
    return evaluate_submission(payload)


@app.post("/ask-doubt-rag", response_model=DoubtResponse)
async def ask_doubt(payload: DoubtRequest) -> Dict[str, Any]:
    rows = retrieve_context(payload.course_id, payload.question, top_k=5)

    if not rows:
        return {
            "answer": "I could not find this in the uploaded professor materials for this course.",
            "citations": []
        }

    top = rows[:3]
    context = "\n\n".join(r["text"] for r in top)
    answer = (
        "Answer generated strictly from uploaded materials:\n\n"
        f"{context[:1200]}\n\n"
        "If you need deeper clarification, ask with chapter/topic keywords from your slides."
    )

    citations = [
        Citation(
            material_id=r["meta"].get("material_id", ""),
            chunk_id=r["meta"].get("chunk_id", ""),
            score=round(float(r.get("score", 0.0)), 4)
        ).model_dump()
        for r in top
    ]

    return {
        "answer": answer,
        "citations": citations
    }


@app.post("/score-doubt-quality", response_model=DoubtQualityResponse)
async def score_doubt(payload: DoubtQualityRequest) -> Dict[str, float]:
    base = 0.2
    if len(payload.question.split()) >= 8:
        base += 0.25
    if payload.citations_count > 0:
        base += 0.25
    if len(payload.answer.split()) >= 30:
        base += 0.2

    return {"quality_score": round(min(1.0, base), 3)}
