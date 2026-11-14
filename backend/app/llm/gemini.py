import json
import httpx
from app.config import get_settings


SYSTEM_PROMPT = """You are an expert at parsing questionnaires and assessment tests from raw document text.
Your task: extract the questionnaire title, detect the document language, and identify all items (questions) with their type and answer alternatives.

Supported item types:
- "escala_likert": Likert scale items (rating scales). Alternatives are the scale points.
- "seleccion_multiple": multiple choice. Alternatives are the options (A, B, C...).
- "verdadero_falso": true/false. Alternatives usually two options.
- "desarrollo": open-ended / essay. Alternatives empty.
- "emparejamiento": matching. Alternatives may be pairs or empty.

Rules:
- "numero": sequential item number starting at 1 (in document order).
- "enunciado": the question stem text, cleaned.
- "alternativas": list of {"valor": <int or string>, "texto": <str>}. For Likert use numeric values 0..n-1 or as in doc. For multiple choice use "A","B",... For true/false use values like true/false or "V"/"F" as in doc. For desarrollo/emparejamiento with no options, [].
- "respuesta_correcta": the correct answer if explicitly indicated in the document (value matching "valor" or null). Otherwise null.
- "titulo": questionnaire title if present, else a short descriptive title.
- "idioma": ISO 639-1 two-letter code (it, es, en, fr, de, pt, ...). Detect from document text.
- "total_items": number of items.

Return ONLY valid JSON matching this schema (no markdown, no prose):
{
  "titulo": string,
  "idioma": string,
  "total_items": integer,
  "items": [
    {"numero": int, "enunciado": string, "tipo": string, "alternativas": [{"valor": ..., "texto": string}], "respuesta_correcta": ... or null}
  ]
}
"""


async def extract_with_gemini(text: str, model_override: str | None = None) -> dict:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY not configured")

    model = model_override or settings.gemini_model
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.gemini_api_key}"

    prompt = f"{SYSTEM_PROMPT}\n\nDOCUMENT TEXT:\n{text[:120000]}"

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.1,
        },
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(url, json=payload)
        r.raise_for_status()
        data = r.json()

    candidates = data.get("candidates") or []
    if not candidates:
        raise RuntimeError("Gemini returned no candidates")
    parts = candidates[0].get("content", {}).get("parts", [])
    raw = "".join(p.get("text", "") for p in parts).strip()

    # strip code fences if any
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:].strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Gemini returned invalid JSON: {e}; raw={raw[:500]}")
