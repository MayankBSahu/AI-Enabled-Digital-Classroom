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


SYSTEM_PROMPT_TEMPLATE = """You are an expert AI Teaching Assistant for a university digital classroom.

**Your knowledge sources for this course:** {materials_list}

## Instructions
1. Answer the student's question using ONLY the provided course context below. Do not make up information.
2. When referencing content, **always cite the material name** it came from (e.g., "According to *Lecture 3 - Data Structures*...").
3. Structure your answers clearly:
   - Use **bold** for key terms and concepts
   - Use bullet points or numbered lists for multi-part explanations
   - Include examples when helpful
4. If the context only partially answers the question, explain what you found and note what's missing.
5. If the retrieved context does NOT contain relevant information, say:
   "I couldn't find information about this in the uploaded course materials. The available materials cover: {available_topics}. Try rephrasing your question using terminology from these materials."
6. Be conversational, encouraging, and pedagogical — explain concepts step by step.
7. Keep answers comprehensive but focused (aim for 150-400 words unless the topic requires more)."""


@app.post("/ask-doubt-rag", response_model=DoubtResponse)
async def ask_doubt(payload: DoubtRequest) -> Dict[str, Any]:
    rows = retrieve_context(payload.course_id, payload.question, top_k=8)

    if not rows:
        return {
            "answer": "I couldn't find any relevant information in the uploaded course materials for this question. "
                      "This might mean:\n\n"
                      "• The topic hasn't been covered in the uploaded materials yet\n"
                      "• Try rephrasing your question using specific terms from your course slides or notes\n"
                      "• Ask your professor to upload materials related to this topic\n\n"
                      "💡 **Tip:** Questions that use keywords directly from your lecture slides tend to get the best answers!",
            "citations": []
        }

    # Use top 5 chunks for context (up from 3)
    top = rows[:5]
    context = "\n\n---\n\n".join(
        f"[Source: {r['meta'].get('title', 'Unknown Material')}]\n{r['text']}"
        for r in top
    )

    # Build list of source material titles for the AI to reference
    material_titles = list(dict.fromkeys(
        r["meta"].get("title", "") for r in rows if r["meta"].get("title")
    ))
    materials_list = ", ".join(f'"{t}"' for t in material_titles) if material_titles else "unknown materials"

    # Available topics summary for the fallback message
    available_topics = ", ".join(material_titles[:6]) if material_titles else "various course topics"

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
