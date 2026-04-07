from typing import Dict, Any, List

from app.schemas import EvalRequest


import json
from openai import AsyncOpenAI
from app.config import GROQ_API_KEY, GROQ_MODEL

groq_client = AsyncOpenAI(
    api_key=GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1"
) if GROQ_API_KEY else None

def _keyword_match_score(answer: str, rubric: List[str]) -> float:
    if not rubric:
        return 0.6

    answer_lower = answer.lower()
    hit = 0
    for criterion in rubric:
        tokens = [w for w in criterion.lower().split() if len(w) > 3]
        if not tokens:
            continue
        if any(tok in answer_lower for tok in tokens):
            hit += 1

    return min(1.0, hit / max(1, len(rubric)))


async def evaluate_submission(payload: EvalRequest) -> Dict[str, Any]:
    answer = (payload.submission_text or "").strip()
    if not answer:
        return {
            "marks": 0,
            "feedback": "No text could be extracted from your submission. Please ensure you uploaded a readable PDF with actual text content.",
            "mistakes": ["Missing or unreadable content"],
            "suggestions": ["Upload a standard text-based PDF/DOC rather than a scanned image."],
            "confidence": 0.25
        }

    if not groq_client:
        # Fallback to heuristic
        score = _keyword_match_score(answer, payload.rubric)
        marks = round(score * payload.max_marks, 2)
        return {
            "marks": marks,
            "feedback": "Using basic heuristic (AI API Key not loaded).",
            "mistakes": [],
            "suggestions": [],
            "confidence": 0.72
        }

    prompt = f"""You are a strict and helpful university Teaching Assistant evaluating an assignment submission.
    
    ## Assignment Description Context:
    {payload.description or "No overall description provided. Evaluate strictly using the rubric below."}
    
    ## Rubric Criteria:
    {json.dumps(payload.rubric, indent=2)}
    
    ## Target Max Marks:
    {payload.max_marks}
    
    ## Student Submission (extracted text):
    {answer}
    
    Evaluate the submission against the rubric. Be highly critical but fair. Provide your response as a valid JSON object matching EXACTLY this format:
    {{
        "marks": <float, out of {payload.max_marks}>,
        "feedback": "<detailed overall feedback string>",
        "mistakes": ["<bullet point 1>", "<bullet point 2>"],
        "suggestions": ["<suggestion 1>", "<suggestion 2>"]
    }}
    IMPORTANT: Return ONLY the raw JSON object. Do not wrap in markdown blocks like ```json."""

    try:
        response = await groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        data = json.loads(response.choices[0].message.content)
        return {
            "marks": min(float(data.get("marks", 0)), payload.max_marks),
            "feedback": data.get("feedback", "Evaluation completed successfully."),
            "mistakes": data.get("mistakes", []),
            "suggestions": data.get("suggestions", []),
            "confidence": 0.95
        }
    except Exception as e:
        print("LLM Eval Error:", e)
        # Fallback to heuristic
        score = _keyword_match_score(answer, payload.rubric)
        marks = round(score * payload.max_marks, 2)
        return {
            "marks": marks,
            "feedback": f"Evaluation fallback due to AI Error: {str(e)}",
            "mistakes": ["Evaluation ran on fallback heuristics due to an internal AI failure."],
            "suggestions": [],
            "confidence": 0.50
        }
