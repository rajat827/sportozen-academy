"""Validate the real, authorised server export from the synthetic training journey."""
import json
import re
from pathlib import Path
from pypdf import PdfReader
import pdfplumber

root = Path(__file__).parent
path = root / "approved-session-report.pdf"
reader = PdfReader(path)
text = "\n".join(page.extract_text() for page in reader.pages)
facts = ["Synthetic Training Academy", "Fictional Player A", "Football", "TrainingCoach",
         "Finishing", "Close-control practice", "3 successful out of 6 recorded attempts",
         "Six turns; 10m course; dry ground; same cones", "Recorded attendance: PRESENT",
         "RAW RECORD", "reviewed", "Session", "evidence", "drill version 1",
         "Continue the same course over four comparable sessions", "2026-10-30",
         "No video attached", "External delivery: Not sent"]
for fact in facts:
    assert fact in text, f"Missing approved fact: {fact}"
for forbidden in ["Fictional Player B", "Independent Academy Player", "PRIVATE_",
                  "INDEPENDENT_PRIVATE", "QA_DATABASE_FAILURE", "50%", "0%",
                  "Cricket", "Badminton", "\ufffd"]:
    assert forbidden not in text, f"Private, unsupported or broken text: {forbidden}"
assert not re.search(r"\b(?:SENT|DELIVERED|READ)\b", text), "False external delivery status"
with pdfplumber.open(path) as pdf:
    for index, page in enumerate(pdf.pages):
        assert abs(page.width - 595.28) < 1 and abs(page.height - 841.89) < 1, "Not A4"
        assert page.extract_text().strip(), "Blank page"
        assert f"{index + 1} / {len(pdf.pages)}" in page.extract_text(), "Missing numbering"
        for word in page.extract_words():
            assert 40 <= word["top"] and word["bottom"] <= 805, "Unsafe vertical bounds"
            assert 35 <= word["x0"] and word["x1"] <= 560, "Unsafe horizontal bounds"
result = {"file": path.name, "pages": len(reader.pages), "checks": "PASS",
          "facts": "Reviewed completed-session result, attendance, conditions, source and next step",
          "privacy": "Linked child only; no private evidence/plan/conversation notes",
          "layout": "Selectable A4, safe bounds, no blank pages or broken glyphs; every page must also be visually rendered"}
(root / "pdf-validation.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
