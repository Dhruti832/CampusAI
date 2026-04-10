import logging
from datetime import datetime, timezone

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="tasks.scrape_university")
def scrape_university(self, job_id: str, university_id: str) -> dict:
    """
    Celery task: scrape a university's website and update the scrape-job record.
    """
    from app.database import SessionLocal
    from app.models.scrape_job import ScrapeJob, ScrapeJobStatus
    from app.models.university import University
    from app.models.document import Document, DocumentStatus
    from app.services.scraper import scrape_website

    db = SessionLocal()
    try:
        job = db.query(ScrapeJob).filter(ScrapeJob.id == job_id).first()
        university = db.query(University).filter(University.id == university_id).first()
        if not job or not university:
            return {"error": "Job or university not found"}

        job.status = ScrapeJobStatus.running
        job.started_at = datetime.now(timezone.utc)
        job.celery_task_id = self.request.id
        db.commit()

        def on_page_indexed(url: str, title: str, chunk_count: int):
            doc = db.query(Document).filter(
                Document.university_id == university_id,
                Document.source_url == url,
            ).first()
            if doc:
                doc.status = DocumentStatus.indexed
                doc.chunk_count = chunk_count
            else:
                doc = Document(
                    university_id=university_id,
                    title=title,
                    source_url=url,
                    doc_type="webpage",
                    status=DocumentStatus.indexed,
                    chunk_count=chunk_count,
                )
                db.add(doc)
            db.commit()
            job.pages_indexed += 1
            job.pages_scraped += 1
            db.commit()

        result = scrape_website(
            university_slug=university.slug,
            start_url=university.website_url,
            on_page_indexed=on_page_indexed,
        )

        job.status = ScrapeJobStatus.completed
        job.completed_at = datetime.now(timezone.utc)
        job.pages_scraped = result["pages_scraped"]
        job.pages_indexed = result["pages_indexed"]
        db.commit()
        return result

    except Exception as exc:
        logger.exception("Scrape job %s failed", job_id)
        if "job" in dir() and job:
            job.status = ScrapeJobStatus.failed
            job.error_message = str(exc)
            db.commit()
        raise
    finally:
        db.close()
