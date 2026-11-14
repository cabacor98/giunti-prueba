"""Text extractors for supported document formats."""
from .pdf import extract_pdf
from .docx import extract_docx
from .xlsx import extract_xlsx

__all__ = ["extract_pdf", "extract_docx", "extract_xlsx"]
