import io
import logging
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.schemas import QuestionnaireResult
from app.extractors import extract_pdf, extract_docx, extract_xlsx
from app.llm import extract_with_gemini
from app.services import detect_language

settings = get_settings()
logging.basicConfig(level=settings.log_level)
logger = logging.getLogger("giunti")

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx"}
MIME_MAP = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
}


def _extract_text(filename: str, data: bytes) -> str:
    ext = filename.lower().rsplit(".", 1)[-1]
    ext = "." + ext if not ext.startswith(".") else ext
    if ext == ".pdf":
        return extract_pdf(data)
    if ext == ".docx":
        return extract_docx(data)
    if ext == ".xlsx":
        return extract_xlsx(data)
    raise HTTPException(status_code=400, detail="Unsupported file format. Use PDF, DOCX or XLSX.")


app = FastAPI(title="Giunti Questionnaire Parser", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "model": settings.gemini_model}


@app.post("/api/parse")
async def parse(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    ext = "." + file.filename.lower().rsplit(".", 1)[-1] if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file format '{ext}'. Allowed: PDF, DOCX, XLSX.")

    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Empty file.")
    if len(data) > settings.max_file_size_bytes:
        raise HTTPException(status_code=413, detail=f"File too large. Max {settings.max_file_size_mb} MB.")

    try:
        text = _extract_text(file.filename, data)
    except Exception as e:
        logger.exception("Extraction failed")
        raise HTTPException(status_code=422, detail=f"Could not extract text: {e}")

    if not text or len(text.strip()) < 20:
        raise HTTPException(status_code=422, detail="No readable text detected in document.")

    lang_hint = detect_language(text)

    try:
        raw = await extract_with_gemini(text)
    except Exception as e:
        logger.exception("LLM extraction failed")
        raise HTTPException(status_code=502, detail=f"LLM extraction failed: {e}")

    # normalize / validate
    try:
        # ensure idioma present; fallback to detected
        if not raw.get("idioma") and lang_hint:
            raw["idioma"] = lang_hint
        if not raw.get("titulo"):
            raw["titulo"] = file.filename.rsplit(".", 1)[0]
        result = QuestionnaireResult.model_validate(raw)
    except Exception as e:
        logger.exception("Schema validation failed")
        raise HTTPException(status_code=422, detail=f"Invalid LLM output: {e}")

    if not result.items:
        raise HTTPException(status_code=422, detail="No items detected in document.")

    return result.model_dump()
