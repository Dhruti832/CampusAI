from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.university import University
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.auth import get_current_user
from app.services.rag import answer_question

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    uni = db.query(University).filter(
        University.slug == payload.university_slug,
        University.is_active == True,
    ).first()
    if not uni:
        raise HTTPException(status_code=404, detail="University not found")

    result = answer_question(
        university_slug=uni.slug,
        university_name=uni.name,
        website_url=uni.website_url,
        question=payload.message,
    )
    return ChatResponse(**result)
