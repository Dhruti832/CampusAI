from app.tasks.celery_app import celery_app
from app.tasks.scraping import scrape_university

__all__ = ["celery_app", "scrape_university"]
