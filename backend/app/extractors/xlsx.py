import io
from openpyxl import load_workbook


def extract_xlsx(data: bytes) -> str:
    wb = load_workbook(io.BytesIO(data), data_only=True)
    parts: list[str] = []
    for ws in wb.worksheets:
        for row in ws.iter_rows():
            cells = [str(c.value).strip() if c.value is not None else "" for c in row]
            if any(cells):
                parts.append(" | ".join(cells))
    return "\n".join(parts).strip()
