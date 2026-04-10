import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.scrape_job import ScrapeJob, ScrapeJobStatus
from app.models.university import University
from app.models.user import User, UserRole
from app.schemas.scrape_job import ScrapeJobRead, ScrapeJobTrigger
from app.services.auth import get_current_user, require_role

router = APIRouter(prefix="/scrape-jobs", tags=["scraping"])


@router.get(
    "/",
    response_model=list[ScrapeJobRead],
    dependencies=[Depends(require_role(UserRole.super_admin, UserRole.university_admin))],
)
def list_scrape_jobs(
    university_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(ScrapeJob)
    if current_user.role == UserRole.university_admin:
        q = q.filter(ScrapeJob.university_id == current_user.university_id)
    elif university_id:
        q = q.filter(ScrapeJob.university_id == university_id)
    return q.order_by(ScrapeJob.created_at.desc()).all()


@router.post(
    "/",
    response_model=ScrapeJobRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.super_admin, UserRole.university_admin))],
)
def trigger_scrape(
    payload: ScrapeJobTrigger,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    uni = db.query(University).filter(University.id == payload.university_id).first()
    if not uni:
        raise HTTPException(status_code=404, detail="University not found")
    if (
        current_user.role == UserRole.university_admin
        and current_user.university_id != payload.university_id
    ):
        raise HTTPException(status_code=403, detail="Cannot trigger scrape for another university")

    job = ScrapeJob(
        university_id=payload.university_id,
        status=ScrapeJobStatus.queued,
        triggered_by=current_user.id,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    from app.tasks.scraping import scrape_university

    task = scrape_university.delay(str(job.id), str(uni.id))
    job.celery_task_id = task.id
    db.commit()
    db.refresh(job)
    return job


@router.get(
    "/{job_id}",
    response_model=ScrapeJobRead,
    dependencies=[Depends(require_role(UserRole.super_admin, UserRole.university_admin))],
)
def get_scrape_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(ScrapeJob).filter(ScrapeJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
