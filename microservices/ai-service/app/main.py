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
    return await evaluate_submission(payload)


SYSTEM_PROMPT_TEMPLATE = """You are an expert AI Teaching Assistant for a university digital classroom.

**Your knowledge sources for this course:** {materials_list}

## Instructions
1. First, attempt to answer the user's question using the provided course context below.
2. When answering from the context, **always cite the material name** it came from (e.g., "According to *Lecture 3 - Data Structures*...").
3. If the retrieved context does NOT contain relevant information to answer the question, or if no context is provided, **you must still answer the question using your general knowledge**. However, when you do this, politely state that your answer is based on general knowledge since it wasn't explicitly found in the uploaded course materials.
4. Structure your answers clearly using **bold** for key terms and bullet points where appropriate.
5. Be conversational, encouraging, and pedagogical — explain concepts step by step.
6. Keep answers comprehensive but focused (aim for 150-400 words unless the topic requires more)."""


@app.post("/ask-doubt-rag", response_model=DoubtResponse)
async def ask_doubt(payload: DoubtRequest) -> Dict[str, Any]:
    rows = retrieve_context(payload.course_id, payload.question, top_k=8)

    top = rows[:5] if rows else []
    context = "\n\n---\n\n".join(
        f"[Source: {r['meta'].get('title', 'Unknown Material')}]\n{r['text']}"
        for r in top
    ) if top else "No relevant course context found."

    # Build list of source material titles for the AI to reference
    material_titles = list(dict.fromkeys(
        r["meta"].get("title", "") for r in rows if r["meta"].get("title")
    )) if rows else []
    
    materials_list = ", ".join(f'"{t}"' for t in material_titles) if material_titles else "No specific course materials available."
    available_topics = ", ".join(material_titles[:6]) if material_titles else "General topics"

    answer = ""

    if groq_client:
        try:
            system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
                materials_list=materials_list,
                available_topics=available_topics
            )

            messages = [
                {"role": "system", "content": system_prompt},
            ]
            # Inject conversation history for multi-turn awareness (last 5 exchanges)
            for h in (payload.history or [])[-5:]:
                messages.append({"role": "user", "content": h.question})
                messages.append({"role": "assistant", "content": h.answer})

            # Current question with context
            prompt = (
                f"## Retrieved Course Material Context\n\n{context}\n\n"
                f"---\n\n## Student's Question\n\n{payload.question}"
            )
            messages.append({"role": "user", "content": prompt})

            response = await groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                temperature=0.3,
                max_tokens=1200,
            )
            answer = response.choices[0].message.content
        except Exception as e:
            answer = f"Error generating answer via Groq: {str(e)}"
    else:
        answer = (
            "Groq AI is disabled (API Key missing). Showing raw context:\n\n"
            f"{context[:1500]}\n\n"
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
