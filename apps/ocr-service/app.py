"""
Servicio OCR on-prem (Tesseract via ocrmypdf).
POST /ocr con JSON { "base64": "...", "filename": "x.pdf", "mimeType": "application/pdf" }
o multipart file field "file".
"""
import base64
import io
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel

app = FastAPI(title="Alega OCR", version="0.1.0")


class OcrJsonBody(BaseModel):
    base64: str
    filename: str = "doc.pdf"
    mimeType: str = "application/pdf"


def _ocr_pdf_bytes(data: bytes) -> str:
    import ocrmypdf

    with tempfile.TemporaryDirectory() as tmp:
        inp = Path(tmp) / "in.pdf"
        out = Path(tmp) / "out.pdf"
        inp.write_bytes(data)
        ocrmypdf.ocr(
            inp,
            out,
            language="spa",
            progress_bar=False,
            skip_text=False,
        )
        try:
            from pypdf import PdfReader

            reader = PdfReader(str(out))
            return "\n".join((p.extract_text() or "") for p in reader.pages)
        except Exception:
            return ""


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/ocr")
async def ocr_json(body: OcrJsonBody):
    raw = base64.b64decode(body.base64)
    if not raw.startswith(b"%PDF"):
        return {"text": "", "note": "not a PDF"}
    text = _ocr_pdf_bytes(raw)
    return {"text": text}


@app.post("/ocr/upload")
async def ocr_upload(file: UploadFile = File(...)):
    data = await file.read()
    if not data.startswith(b"%PDF"):
        return {"text": ""}
    text = _ocr_pdf_bytes(data)
    return {"text": text}
