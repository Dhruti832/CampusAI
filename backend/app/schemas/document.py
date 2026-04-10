import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.document import DocumentStatus


class DocumentRead(BaseModel):
    id: uuid.UUID
    university_id: uuid.UUID
    title: str
    source_url: str
    doc_type: str
    status: DocumentStatus
    chunk_count: int
    error_message: str | None
    created_at: datetime
    updated_at: datetime | None

    model_config = {"from_attributes": True}
