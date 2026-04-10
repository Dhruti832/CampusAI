from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.document import Document
from app.models.user import User, UserRole
from app.schemas.document import DocumentRead
from app.services.auth import get_current_user, require_role

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("/", response_model=list[DocumentRead])
def list_documents(
    university_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Document)
    if current_user.role == UserRole.university_admin:
        q = q.filter(Document.university_id == current_user.university_id)
    elif current_user.role == UserRole.student:
        if not current_user.university_id:
            raise HTTPException(status_code=403, detail="No university assigned")
        q = q.filter(Document.university_id == current_user.university_id)
    elif university_id:
        q = q.filter(Document.university_id == university_id)
    return q.order_by(Document.created_at.desc()).all()


@router.delete(
    "/{doc_id}",
    status_code=204,
    dependencies=[Depends(require_role(UserRole.super_admin, UserRole.university_admin))],
)
def delete_document(doc_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)
    db.commit()
