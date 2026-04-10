"""
LLM backends: openai | anthropic | ollama
All return a plain string answer.
"""
from app.config import settings


def generate_answer(system_prompt: str, user_message: str) -> str:
    if settings.LLM_BACKEND == "openai":
        return _openai_generate(system_prompt, user_message)
    if settings.LLM_BACKEND == "anthropic":
        return _anthropic_generate(system_prompt, user_message)
    return _ollama_generate(system_prompt, user_message)


def _openai_generate(system_prompt: str, user_message: str) -> str:
    from openai import OpenAI

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        temperature=0.2,
    )
    return response.choices[0].message.content.strip()


def _anthropic_generate(system_prompt: str, user_message: str) -> str:
    import anthropic

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    message = client.messages.create(
        model=settings.ANTHROPIC_MODEL,
        max_tokens=1024,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    return message.content[0].text.strip()


def _ollama_generate(system_prompt: str, user_message: str) -> str:
    import httpx

    payload = {
        "model": settings.OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "stream": False,
    }
    response = httpx.post(
        f"{settings.OLLAMA_BASE_URL}/api/chat",
        json=payload,
        timeout=120,
    )
    response.raise_for_status()
    return response.json()["message"]["content"].strip()
