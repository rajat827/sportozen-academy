"""Validate the fictional authenticated football report downloaded by Playwright."""
import json
from pathlib import Path
import pdfplumber
from pypdf import PdfReader

root = Path(__file__).parent
report = root / "approved-parent-report.pdf"
reader = PdfReader(report)
text = "\n".join(page.extract_text() for page in reader.pages)
facts = ["Fictional A Football", "Fictional Child A", "Football", "Coach",
         "Dribbling", "Close-control practice", "2026-10-25",
         "Reviewed comparable attempts selected this individual focus.",
         "The coach reviewed this player's own comparable attempts.",
         "coach observation", "Review four comparable attempts.",
         "External delivery: Not sent"]
for fact in facts:
    assert fact in text, f"Missing approved source fact: {fact}"
for forbidden in ["STAFF ONLY SECRET", "PRIVATE STAFF NOTE", "Fictional Child B",
                  "Fictional Child C", "Cricket", "Badminton", "retired-", "50%", "91%"]:
    assert forbidden not in text, f"Private/unsupported content: {forbidden}"
assert "\ufffd" not in text, "Broken glyph"
assert len(reader.pages) == 1, "Unexpected pagination for the sparse fixture"
with pdfplumber.open(report) as document:
    for index, page in enumerate(document.pages):
        assert abs(page.width - 595.28) < 1 and abs(page.height - 841.89) < 1, "Not A4"
        assert page.extract_text().strip(), "Blank page"
        assert f"{index + 1} / {len(document.pages)}" in page.extract_text(), "Missing page number"
        for word in page.extract_words():
            assert 40 <= word["top"] and word["bottom"] <= 805, "Off-page text"
result = {"file": report.name, "pages": len(reader.pages), "checks": "PASS",
          "facts": "Approved football source snapshot", "privacy": "No private notes or other children",
          "layout": "Searchable A4, safe text bounds, no blank pages, numbered"}
(root / "pdf-validation.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2))
