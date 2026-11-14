from langdetect import detect, LangDetectException


def detect_language(text: str) -> str | None:
    try:
        code = detect(text)
        return code.split("-")[0].lower()
    except LangDetectException:
        return None
    except Exception:
        return None
