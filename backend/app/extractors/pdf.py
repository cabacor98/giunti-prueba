import io
import pdfplumber


def extract_pdf(data: bytes) -> str:
    parts: list[str] = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            txt = page.extract_text() or ""
            if txt.strip():
                parts.append(txt)
            # also extract tables as text
            for table in page.extract_tables() or []:
                for row in table:
                    cells = [str(c).strip() if c is not None else "" for c in row]
                    if any(cells):
                        parts.append(" | ".join(cells))
    return "\n".join(parts).strip()
