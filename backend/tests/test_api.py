import io
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import QuestionnaireResult, Item, Alternative

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_reject_unsupported_extension():
    r = client.post("/api/parse", files={"file": ("x.txt", b"hello", "text/plain")})
    assert r.status_code == 400


def test_reject_empty_file():
    r = client.post("/api/parse", files={"file": ("x.pdf", b"", "application/pdf")})
    assert r.status_code == 400


def test_reject_oversized_file(monkeypatch):
    from app import config
    settings = config.get_settings()
    monkeypatch.setattr(settings, "max_file_size_mb", 0)  # 0 MB -> any bytes oversized? max_bytes=0
    # Actually max_file_size_bytes uses mb*1024*1024 = 0, so 1 byte > 0
    r = client.post("/api/parse", files={"file": ("x.pdf", b"x", "application/pdf")})
    assert r.status_code in (400, 413, 422)


async def _fake_extract(text):
    return {
        "titulo": "Mocked",
        "idioma": "en",
        "total_items": 1,
        "items": [
            {
                "numero": 1,
                "enunciado": "Q?",
                "tipo": "desarrollo",
                "alternativas": [],
                "respuesta_correcta": None,
            }
        ],
    }


def test_parse_success_mocked(monkeypatch):
    monkeypatch.setattr("app.main.extract_with_gemini", _fake_extract)
    monkeypatch.setattr("app.main._extract_text", lambda fn, data: "Some questionnaire text with enough length to pass validation checks.")
    r = client.post("/api/parse", files={"file": ("q.pdf", b"%PDF-1.4", "application/pdf")})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["titulo"] == "Mocked"
    assert body["total_items"] == 1
    assert len(body["items"]) == 1


def test_no_items_returns_422(monkeypatch):
    async def _empty(text):
        return {"titulo": "T", "idioma": "en", "total_items": 0, "items": []}

    monkeypatch.setattr("app.main.extract_with_gemini", _empty)
    monkeypatch.setattr("app.main._extract_text", lambda fn, data: "Some text long enough to pass.")
    r = client.post("/api/parse", files={"file": ("q.pdf", b"%PDF", "application/pdf")})
    assert r.status_code == 422
