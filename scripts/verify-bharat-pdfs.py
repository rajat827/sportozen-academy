"""Inspect all authorised downloads; requires the bundled pdfplumber runtime."""
import json
from hashlib import sha256
import re
import unicodedata
from pathlib import Path
import pdfplumber

root = Path(__file__).resolve().parents[1]
evidence = root / "docs/screenshots/final-academy/bharat"
verification = json.loads((evidence / "pdf-verification.json").read_text(encoding="utf-8"))
checks = []
expected_content = json.loads((root / ".local/bharat-pdf-verification/expected-content.json").read_text(encoding="utf-8"))
def normalized(value):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", value).replace("\u00ad", "")).strip()

for item in verification["pdfChecks"]:
    filename = root / ".local/bharat-pdf-verification" / f"{item['scenarioKey']}-{item['month']}.pdf"
    violations = []
    if sha256(filename.read_bytes()).hexdigest() != item["sha256"]:
        violations.append({"file": "download hash differs from authenticated export manifest"})
    body_pages = []
    with pdfplumber.open(filename) as pdf:
        for number, page in enumerate(pdf.pages, 1):
            for char in page.chars:
                if (char["x0"] < -0.5 or char["x1"] > page.width + 0.5
                        or char["top"] < -0.5 or char["bottom"] > page.height + 0.5):
                    violations.append({"page": number, "text": char["text"], "x0": char["x0"], "top": char["top"]})
            text = page.extract_text() or ""
            if "PRIVATE_BHARAT" in text:
                violations.append({"page": number, "privacy": "staff marker"})
            # Branding occupies fixed header/footer bands. Read only the flowed
            # body so page furniture cannot interrupt long snapshot paragraphs.
            body_pages.append(page.crop((40, 95, page.width - 40, page.height - 78)).extract_text() or "")
        body = normalized("\n".join(body_pages))
        expected = expected_content[filename.name]
        expected_parts = expected["parts"]
        missing_parts = [index for index, part in enumerate(expected_parts) if normalized(part) not in body]
        if missing_parts:
            violations.append({"content": "approved snapshot body missing/truncated", "partIndexes": missing_parts})
        first_evidence = expected.get("firstShortEvidence")
        if first_evidence:
            heading = normalized(first_evidence["heading"])
            text = normalized(first_evidence["text"])
            source = normalized(first_evidence["source"])
            matched = [normalized(value) for value in body_pages if heading in normalized(value)]
            if len(matched) != 1 or text not in matched[0] or source not in matched[0] or matched[0].find(heading) >= matched[0].find(text):
                violations.append({"flow": "observation heading orphaned from first short evidence card"})
        checks.append({"reportId": item["reportId"], "pages": len(pdf.pages), "approvedBodyPartsChecked": len(expected_parts), "firstShortEvidenceHeadingChecked": bool(first_evidence), "geometryViolations": violations})

assert len(checks) == 120, f"Expected120 authorised downloads, found{len(checks)}"
result = {"status": "PASS" if all(not c["geometryViolations"] for c in checks) else "FAIL", "reports": len(checks), "pages": sum(c["pages"] for c in checks), "checks": checks}
(evidence / "pdf-geometry.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
assert result["status"] == "PASS", "PDF character bounds/privacy failure; inspectpdf-geometry.json"
print(json.dumps({key: value for key, value in result.items() if key != "checks"}))
