# -*- coding: utf-8 -*-
from fpdf import FPDF
from docx import Document
from openpyxl import Workbook

# English PDF (ASCII-only so extraction is clean)
pdf = FPDF()
pdf.add_page()
pdf.add_font("Arial", "", r"C:\Windows\Fonts\arial.ttf")
pdf.set_font("Arial", size=12)
lines = [
    "Sample Questionnaire",
    "",
    "1. I worry excessively about unimportant things.",
    "   0. Never",
    "   1. Sometimes",
    "   2. Often",
    "   3. Always",
    "",
    "2. Which number completes the series: 2, 4, 8, 16, ...?",
    "   A. 18",
    "   B. 24",
    "   C. 32  (correct)",
    "",
    "3. Describe a recent situation in which you felt under pressure.",
    "",
    "4. Match each concept with its definition:",
    "   A. Anxiety - 1. State of alertness",
    "   B. Stress - 2. Response to demands",
]
for l in lines:
    pdf.cell(0, 8, l, new_x="LMARGIN", new_y="NEXT")
pdf.output("examples/sample_en.pdf")

# Spanish DOCX
doc = Document()
doc.add_heading("Cuestionario de ejemplo", level=1)
doc.add_paragraph("1. Me preocupo excesivamente por cosas de poca importancia.")
for v, t in [(0, "Nunca"), (1, "A veces"), (2, "A menudo"), (3, "Siempre")]:
    doc.add_paragraph(f"   {v}. {t}")
doc.add_paragraph("2. ¿Qué número completa la serie: 2, 4, 8, 16, ...?")
for v, t in [("A", "18"), ("B", "24"), ("C", "32")]:
    doc.add_paragraph(f"   {v}. {t}")
doc.add_paragraph("Respuesta correcta: C")
doc.add_paragraph("3. Describa una situación reciente en la que se sintió bajo presión.")
doc.add_paragraph("4. Verdadero o Falso: El estrés siempre es dañino.")
doc.add_paragraph("   V. Verdadero")
doc.add_paragraph("   F. Falso")
doc.save("examples/sample_es.docx")

# Italian XLSX
wb = Workbook()
ws = wb.active
ws.title = "Questionario"
rows = [
    ["Questionario di esempio"],
    [],
    ["1", "Mi preoccupo eccessivamente per cose di poca importanza."],
    ["", "0. Mai"],
    ["", "1. A volte"],
    ["", "2. Spesso"],
    ["", "3. Sempre"],
    [],
    ["2", "Quale numero completa la serie: 2, 4, 8, 16, ...?"],
    ["", "A. 18"],
    ["", "B. 24"],
    ["", "C. 32 (corretta)"],
    [],
    ["3", "Descriva una situazione recente in cui si è sentito sotto pressione."],
]
for r in rows:
    ws.append(r)
wb.save("examples/sample_it.xlsx")
print("done")
