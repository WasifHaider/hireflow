import logging
import os

import httpx
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("hireflow-ml")

# Groq stopped serving nomic-embed-text-v1.5 on /v1/embeddings (404
# model_not_found as of 2026-09) — moved embeddings to Voyage AI. Groq is kept
# for nothing here; chat-completion generation (job descriptions, dashboard
# suggestions) lives entirely in the NestJS backend's AiService, unrelated to
# this file.
EMBEDDING_MODEL = "voyage-3.5"
VOYAGE_EMBEDDINGS_URL = "https://api.voyageai.com/v1/embeddings"

app = FastAPI(title="HireFlow ML Service")

_api_key = os.getenv("VOYAGE_API_KEY")
if not _api_key:
    logger.warning("VOYAGE_API_KEY not set — /score will fail until it is provided")


class ScoreRequest(BaseModel):
    # min_length=1 rejects empty strings at the validation layer (422) so the
    # endpoint body never has to defend against blank input.
    resume_text: str = Field(min_length=1)
    job_description: str = Field(min_length=1)


class ScoreResponse(BaseModel):
    score: float


@app.get("/health")
def health():
    return {"status": "ok"}


def _embed(texts: list[str]) -> list[np.ndarray]:
    """Embed a batch of texts in one Voyage API call and return them as numpy vectors."""
    response = httpx.post(
        VOYAGE_EMBEDDINGS_URL,
        headers={"Authorization": f"Bearer {_api_key}", "Content-Type": "application/json"},
        json={"input": texts, "model": EMBEDDING_MODEL},
        timeout=30.0,
    )
    response.raise_for_status()
    data = response.json()["data"]
    return [np.array(item["embedding"], dtype=np.float32) for item in data]


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0.0:
        return 0.0
    return float(np.dot(a, b) / denom)


@app.post("/score", response_model=ScoreResponse)
def score(req: ScoreRequest) -> ScoreResponse:
    if _api_key is None:
        raise HTTPException(status_code=503, detail="VOYAGE_API_KEY not configured")

    # Whitespace-only text passes min_length=1 but is meaningless to embed.
    if not req.resume_text.strip() or not req.job_description.strip():
        raise HTTPException(status_code=422, detail="resume_text and job_description must not be blank")

    logger.info("Embedding resume + job with model %s", EMBEDDING_MODEL)
    try:
        resume_vec, job_vec = _embed([req.resume_text, req.job_description])
    except httpx.HTTPError as exc:
        logger.error("Voyage embedding call failed: %s", exc)
        # 502: upstream dependency failed. NestJS treats this as retryable.
        raise HTTPException(status_code=502, detail="Embedding provider error") from exc

    cosine = _cosine_similarity(resume_vec, job_vec)
    # voyage-3.5 vectors yield cosine in [-1, 1]; for real resume/JD pairs it
    # lands in ~[0.1, 0.6]. Clamp negatives to 0, then scale to 0-100.
    score_value = round(max(0.0, cosine) * 100, 2)
    logger.info("cosine=%.4f -> score=%.2f", cosine, score_value)

    return ScoreResponse(score=score_value)
