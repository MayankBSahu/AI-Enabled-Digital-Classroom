from pydantic import BaseModel
from typing import List, Optional


class EvalRequest(BaseModel):
    submission_id: str
    file_url: str = ""
    submission_text: str = ""
    rubric: List[str] = []
    max_marks: int = 100
    model_answer: Optional[str] = ""


class EvalResponse(BaseModel):
    marks: float
    feedback: str
    mistakes: List[str]
    suggestions: List[str]
    confidence: float


class HistoryItem(BaseModel):
    question: str
    answer: str


class DoubtRequest(BaseModel):
    course_id: str
    student_id: str
    question: str
    history: List[HistoryItem] = []


class Citation(BaseModel):
    material_id: str
    chunk_id: str
    score: float


class DoubtResponse(BaseModel):
    answer: str
    citations: List[Citation]


class IngestRequest(BaseModel):
    course_id: str
    material_id: str
    title: str = ""
    text: str


class DoubtQualityRequest(BaseModel):
    question: str
    answer: str
    citations_count: int = 0


class DoubtQualityResponse(BaseModel):
    quality_score: float
