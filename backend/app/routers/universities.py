from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.university import University
from app.models.user import UserRole
from app.schemas.university import UniversityCreate, UniversityRead, UniversityUpdate
from app.services.auth import get_current_user, require_role
from app.services.vector_store import delete_collection, ensure_collection

router = APIRouter(prefix="/universities", tags=["universities"])


@router.get("/", response_model=list[UniversityRead])
def list_universities(db: Session = Depends(get_db)):
    return db.query(University).filter(University.is_active == True).all()


@router.get("/{slug}", response_model=UniversityRead)
def get_university(slug: str, db: Session = Depends(get_db)):
    uni = db.query(University).filter(University.slug == slug).first()
    if not uni:
        raise HTTPException(status_code=404, detail="University not found")
    return uni


@router.post(
    "/",
    response_model=UniversityRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.super_admin))],
)
def create_university(payload: UniversityCreate, db: Session = Depends(get_db)):
    if db.query(University).filter(University.slug == payload.slug).first():
        raise HTTPException(status_code=400, detail="Slug already exists")
    uni = University(**payload.model_dump())
    db.add(uni)
    db.commit()
    db.refresh(uni)
    ensure_collection(uni.slug)
    return uni


@router.patch(
    "/{slug}",
    response_model=UniversityRead,
    dependencies=[Depends(require_role(UserRole.super_admin))],
)
def update_university(slug: str, payload: UniversityUpdate, db: Session = Depends(get_db)):
    uni = db.query(University).filter(University.slug == slug).first()
    if not uni:
        raise HTTPException(status_code=404, detail="University not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(uni, k, v)
    db.commit()
    db.refresh(uni)
    return uni


@router.delete(
    "/{slug}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(UserRole.super_admin))],
)
def delete_university(slug: str, db: Session = Depends(get_db)):
    uni = db.query(University).filter(University.slug == slug).first()
    if not uni:
        raise HTTPException(status_code=404, detail="University not found")
    db.delete(uni)
    db.commit()
    try:
        delete_collection(slug)
    except Exception:
        pass
