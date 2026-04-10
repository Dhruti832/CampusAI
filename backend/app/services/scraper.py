"""
Web scraper — crawls a university website, extracts text, splits into chunks,
embeds each chunk, and upserts into Qdrant.
"""
import hashlib
import logging
import re
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from app.config import settings
from app.services.embeddings import get_embedding
from app.services.vector_store import ensure_collection, upsert_chunks

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; CampusAI-Bot/1.0; +https://campusai.example.com/bot)"
    )
}


def _text_chunks(text: str, size: int = None, overlap: int = None) -> list[str]:
    size = size or settings.SCRAPE_CHUNK_SIZE
    overlap = overlap or settings.SCRAPE_CHUNK_OVERLAP
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + size
        chunks.append(" ".join(words[start:end]))
        start += size - overlap
    return [c for c in chunks if c.strip()]


def _is_same_domain(base_url: str, target_url: str) -> bool:
    base_host = urlparse(base_url).netloc
    target_host = urlparse(target_url).netloc
    return base_host == target_host


def _clean_text(soup: BeautifulSoup) -> str:
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()
    text = soup.get_text(separator=" ", strip=True)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def scrape_website(
    university_slug: str,
    start_url: str,
    max_pages: int = None,
    on_page_indexed=None,
) -> dict:
    max_pages = max_pages or settings.SCRAPE_MAX_PAGES
    ensure_collection(university_slug)

    visited: set[str] = set()
    queue: list[str] = [start_url]
    pages_scraped = 0
    pages_indexed = 0

    while queue and pages_scraped < max_pages:
        url = queue.pop(0)
        if url in visited:
            continue
        visited.add(url)

        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            if resp.status_code != 200:
                continue
            content_type = resp.headers.get("content-type", "")
            if "text/html" not in content_type:
                continue

            soup = BeautifulSoup(resp.text, "lxml")
            title = soup.title.string.strip() if soup.title else url
            text = _clean_text(soup)
            pages_scraped += 1

            if text:
                chunks = _text_chunks(text)
                chunk_dicts = []
                for i, chunk in enumerate(chunks):
                    chunk_id = hashlib.md5(f"{url}#{i}".encode()).hexdigest()
                    vector = get_embedding(chunk)
                    chunk_dicts.append(
                        {"id": chunk_id, "vector": vector, "title": title, "url": url, "text": chunk}
                    )
                if chunk_dicts:
                    upsert_chunks(university_slug, chunk_dicts)
                    pages_indexed += 1
                    if on_page_indexed:
                        on_page_indexed(url, title, len(chunk_dicts))

            # Discover new links
            for a in soup.find_all("a", href=True):
                href = urljoin(url, a["href"])
                href = href.split("#")[0]
                if _is_same_domain(start_url, href) and href not in visited:
                    queue.append(href)

        except Exception as exc:
            logger.warning("Failed to scrape %s: %s", url, exc)

    return {"pages_scraped": pages_scraped, "pages_indexed": pages_indexed}


def scrape_pdf(
    university_slug: str,
    pdf_url: str,
    title: str | None = None,
    on_indexed=None,
) -> dict:
    import io

    from pypdf import PdfReader

    ensure_collection(university_slug)

    try:
        resp = requests.get(pdf_url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        reader = PdfReader(io.BytesIO(resp.content))
        full_text = " ".join(page.extract_text() or "" for page in reader.pages)
        full_text = re.sub(r"\s+", " ", full_text).strip()
    except Exception as exc:
        logger.error("PDF fetch/parse failed for %s: %s", pdf_url, exc)
        return {"pages_scraped": 0, "pages_indexed": 0, "error": str(exc)}

    doc_title = title or pdf_url.split("/")[-1]
    chunks = _text_chunks(full_text)
    chunk_dicts = []
    for i, chunk in enumerate(chunks):
        chunk_id = hashlib.md5(f"{pdf_url}#{i}".encode()).hexdigest()
        vector = get_embedding(chunk)
        chunk_dicts.append(
            {"id": chunk_id, "vector": vector, "title": doc_title, "url": pdf_url, "text": chunk}
        )
    if chunk_dicts:
        upsert_chunks(university_slug, chunk_dicts)

    if on_indexed:
        on_indexed(pdf_url, doc_title, len(chunk_dicts))

    return {"pages_scraped": 1, "pages_indexed": 1}
