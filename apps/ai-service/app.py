"""
Stub de servicio de embeddings / NER para clasificación híbrida.
Sustituir por sentence-transformers + spaCy en despliegue Pro.
"""
import hashlib

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Alega AI import", version="0.1.0")


class EmbedBody(BaseModel):
    text: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/embed")
def embed(body: EmbedBody):
    """Placeholder: vector pseudo-aleatorio determinista por hash del texto."""
    h = hashlib.sha256(body.text.encode("utf-8", errors="ignore")).digest()
    vec = [((h[i % len(h)] - 128) / 128.0) for i in range(32)]
    return {"embedding": vec, "model": "stub-hash"}


@app.post("/classify-embedding")
def classify_embedding(body: EmbedBody):
    return {"label": "unknown", "score": 0.0, "note": "stub"}
