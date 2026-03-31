from typing import Dict, Any, List

from app.schemas import EvalRequest


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


def evaluate_submission(payload: EvalRequest) -> Dict[str, Any]:
    answer = (payload.submission_text or "").strip()
    if not answer:
        return {
            "marks": 0,
            "feedback": "No text was provided for evaluation. Please submit a readable document or extracted text.",
            "mistakes": ["Missing or unreadable content"],
            "suggestions": ["Upload a complete PDF/DOCX", "Include structured answers matching rubric points"],
            "confidence": 0.25
        }

    score = _keyword_match_score(answer, payload.rubric)
    marks = round(score * payload.max_marks, 2)

    mistakes = []
    suggestions = []
    if score < 0.5:
        mistakes.append("Several rubric criteria were not clearly addressed.")
        suggestions.append("Map each section explicitly to rubric points.")
    if len(answer.split()) < 120:
        mistakes.append("Answer is too brief for a full-quality evaluation.")
        suggestions.append("Add explanation depth, examples, and rationale.")

    feedback = (
        "Evaluation completed using rubric coverage heuristics. "
        "For production, plug in LLM-based rubric scoring with document parsing and professor override workflow."
    )

    return {
        "marks": marks,
        "feedback": feedback,
        "mistakes": mistakes,
        "suggestions": suggestions,
        "confidence": 0.72
    }
