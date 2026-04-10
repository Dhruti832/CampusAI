from pydantic import BaseModel


class ChatRequest(BaseModel):
    university_slug: str
    message: str
    session_id: str | None = None


class ChatSource(BaseModel):
    title: str
    url: str
    score: float


class ChatResponse(BaseModel):
    answer: str
    sources: list[ChatSource] = []
    session_id: str
