from typing import Dict, Any

from fastapi import FastAPI
from openai import AsyncOpenAI

from app.config import GROQ_API_KEY, GROQ_MODEL

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

# Initialize Groq via OpenAI SDK
groq_client = AsyncOpenAI(
    api_key=GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1"
) if GROQ_API_KEY else None


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
    
    answer = ""
    
    if groq_client:
        try:
            messages = [
                {"role": "system", "content": "You are a helpful AI teaching assistant for a digital classroom. Answer student questions using ONLY the provided course context. Be conversational and helpful. If you cannot find the answer in the context, say so honestly."},
            ]
            # Inject conversation history for multi-turn awareness
            for h in (payload.history or [])[-5:]:
                messages.append({"role": "user", "content": h.question})
                messages.append({"role": "assistant", "content": h.answer})
            # Current question with context
            prompt = f"Course material context:\n{context}\n\nStudent's question: {payload.question}"
            messages.append({"role": "user", "content": prompt})
            response = await groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                temperature=0.3,
                max_tokens=800,
            )
            answer = response.choices[0].message.content
        except Exception as e:
            answer = f"Error generating answer via Groq: {str(e)}"
    else:
        answer = (
            "Groq AI is disabled (API Key missing). Showing raw context:\n\n"
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
