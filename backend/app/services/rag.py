"""
RAG pipeline: retrieve relevant chunks from Qdrant, then generate an answer.
"""
import uuid

from app.config import settings
from app.services.embeddings import get_embedding
from app.services.llm import generate_answer
from app.services.vector_store import search

SYSTEM_TEMPLATE = """You are the official AI assistant for {university_name}.
Answer ONLY based on the context provided below. If the answer is not in the context,
say "I don't have that information. Please visit {website_url} for more details."
Do NOT make up information or use external knowledge.

Context:
{context}
"""


def answer_question(
    university_slug: str,
    university_name: str,
    website_url: str,
    question: str,
    top_k: int = 5,
) -> dict:
    query_vector = get_embedding(question)
    results = search(university_slug, query_vector, top_k=top_k)

    if not results:
        return {
            "answer": f"I don't have information about that yet. Please visit {website_url}.",
            "sources": [],
            "session_id": str(uuid.uuid4()),
        }

    context = "\n\n---\n\n".join(
        f"Source: {r['url']}\nTitle: {r['title']}\n{r['text']}" for r in results
    )
    system_prompt = SYSTEM_TEMPLATE.format(
        university_name=university_name,
        website_url=website_url,
        context=context,
    )
    answer = generate_answer(system_prompt, question)

    sources = [
        {"title": r["title"], "url": r["url"], "score": r["score"]}
        for r in results
    ]

    return {
        "answer": answer,
        "sources": sources,
        "session_id": str(uuid.uuid4()),
    }
