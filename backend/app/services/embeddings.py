"""
Embedding backends: openai | sentence-transformers
Returns a list[float] for a given text.
"""
from app.config import settings


def get_embedding(text: str) -> list[float]:
    if settings.EMBEDDING_BACKEND == "openai":
        return _openai_embed(text)
    return _st_embed(text)


def _openai_embed(text: str) -> list[float]:
    from openai import OpenAI

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.embeddings.create(input=[text], model=settings.EMBEDDING_MODEL)
    return response.data[0].embedding


def _st_embed(text: str) -> list[float]:
    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return model.encode(text).tolist()
