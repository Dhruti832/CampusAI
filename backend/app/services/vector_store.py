"""
Qdrant vector store helpers.
Each university gets its own Qdrant collection named by its slug.
"""
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    PointStruct,
    VectorParams,
    Filter,
    FieldCondition,
    MatchValue,
)

from app.config import settings

_client: QdrantClient | None = None


def get_client() -> QdrantClient:
    global _client
    if _client is None:
        kwargs = {"host": settings.QDRANT_HOST, "port": settings.QDRANT_PORT}
        if settings.QDRANT_API_KEY:
            kwargs["api_key"] = settings.QDRANT_API_KEY
        _client = QdrantClient(**kwargs)
    return _client


def collection_name(university_slug: str) -> str:
    return f"campusai_{university_slug}"


def ensure_collection(university_slug: str) -> None:
    client = get_client()
    name = collection_name(university_slug)
    existing = [c.name for c in client.get_collections().collections]
    if name not in existing:
        client.create_collection(
            collection_name=name,
            vectors_config=VectorParams(size=settings.EMBEDDING_DIM, distance=Distance.COSINE),
        )


def upsert_chunks(university_slug: str, chunks: list[dict]) -> None:
    """
    chunks: list of dicts with keys: id (str), vector (list[float]),
            title (str), url (str), text (str)
    """
    client = get_client()
    name = collection_name(university_slug)
    points = [
        PointStruct(
            id=c["id"],
            vector=c["vector"],
            payload={"title": c["title"], "url": c["url"], "text": c["text"]},
        )
        for c in chunks
    ]
    client.upsert(collection_name=name, points=points)


def search(university_slug: str, query_vector: list[float], top_k: int = 5) -> list[dict]:
    client = get_client()
    name = collection_name(university_slug)
    results = client.search(
        collection_name=name,
        query_vector=query_vector,
        limit=top_k,
        with_payload=True,
    )
    return [
        {
            "title": r.payload.get("title", ""),
            "url": r.payload.get("url", ""),
            "text": r.payload.get("text", ""),
            "score": r.score,
        }
        for r in results
    ]


def delete_collection(university_slug: str) -> None:
    client = get_client()
    name = collection_name(university_slug)
    client.delete_collection(collection_name=name)
