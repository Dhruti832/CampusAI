from .auth import Token, TokenData, LoginRequest
from .user import UserCreate, UserRead, UserUpdate
from .university import UniversityCreate, UniversityRead, UniversityUpdate
from .document import DocumentRead
from .scrape_job import ScrapeJobRead, ScrapeJobTrigger
from .chat import ChatRequest, ChatResponse

__all__ = [
    "Token",
    "TokenData",
    "LoginRequest",
    "UserCreate",
    "UserRead",
    "UserUpdate",
    "UniversityCreate",
    "UniversityRead",
    "UniversityUpdate",
    "DocumentRead",
    "ScrapeJobRead",
    "ScrapeJobTrigger",
    "ChatRequest",
    "ChatResponse",
]
