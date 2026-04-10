from app.routers.auth import router as auth_router
from app.routers.universities import router as universities_router
from app.routers.users import router as users_router
from app.routers.documents import router as documents_router
from app.routers.scraping import router as scraping_router
from app.routers.chat import router as chat_router

__all__ = [
    "auth_router",
    "universities_router",
    "users_router",
    "documents_router",
    "scraping_router",
    "chat_router",
]
