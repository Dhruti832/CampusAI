import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.scrape_job import ScrapeJobStatus


class ScrapeJobTrigger(BaseModel):
    university_id: uuid.UUID


class ScrapeJobRead(BaseModel):
    id: uuid.UUID
    university_id: uuid.UUID
    celery_task_id: str | None
    status: ScrapeJobStatus
    pages_scraped: int
    pages_indexed: int
    error_message: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
