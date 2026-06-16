import logging
import os

import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from openai import OpenAI, OpenAIError
from pydantic import BaseModel, Field

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("hireflow-ml")

EMBEDDING_MODEL = "text-embedding-3-small"

app = FastAPI(title="HireFlow ML Service")

# Instantiate the client once at module load. The SDK reads OPENAI_API_KEY from
# the environment; we surface a clear error at startup if it is missing rather
# than failing on the first request.
_api_key = os.getenv("OPENAI_API_KEY")
if not _api_key:
    logger.warning("OPENAI_API_KEY not set — /score will fail until it is provided")
client = OpenAI(api_key=_api_key) if _api_key else None


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
    """Embed a batch of texts in one API call and return them as numpy vectors."""
    response = client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
    return [np.array(item.embedding, dtype=np.float32) for item in response.data]


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0.0:
        return 0.0
    return float(np.dot(a, b) / denom)


@app.post("/score", response_model=ScoreResponse)
def score(req: ScoreRequest) -> ScoreResponse:
    if client is None:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not configured")

    # Whitespace-only text passes min_length=1 but is meaningless to embed.
    if not req.resume_text.strip() or not req.job_description.strip():
        raise HTTPException(status_code=422, detail="resume_text and job_description must not be blank")

    logger.info("Embedding resume + job with model %s", EMBEDDING_MODEL)
    try:
        resume_vec, job_vec = _embed([req.resume_text, req.job_description])
    except OpenAIError as exc:
        logger.error("OpenAI embedding call failed: %s", exc)
        # 502: upstream dependency failed. NestJS treats this as retryable.
        raise HTTPException(status_code=502, detail="Embedding provider error") from exc

    cosine = _cosine_similarity(resume_vec, job_vec)
    # text-embedding-3 vectors yield cosine in [-1, 1]; for real resume/JD pairs
    # it lands in ~[0.1, 0.6]. Clamp negatives to 0, then scale to 0-100.
    score_value = round(max(0.0, cosine) * 100, 2)
    logger.info("cosine=%.4f -> score=%.2f", cosine, score_value)

    return ScoreResponse(score=score_value)
