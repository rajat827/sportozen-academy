"""Check actual authorised exports against the shared parent presentation facts."""
import hashlib
import json
import re
from pathlib import Path
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'docs/screenshots/professional-reports'
exports = json.loads((EVIDENCE / 'verification.json').read_text(encoding='utf-8-sig'))['exports']
expected = json.loads((ROOT / '.local/professional-reports-safety/expected-pdf-content.json').read_text(encoding='utf-8-sig'))
assert len(exports) == len(expected) == 120
normalize = lambda value: re.sub(r'\s+', '', str(value)).replace('’', "'").replace('–', '-').replace('—', '-')
failures, checks = [], []
for entry in exports:
    filename = entry['file']
    file = ROOT / '.local/professional-report-pdfs' / filename
    assert hashlib.sha256(file.read_bytes()).hexdigest() == entry['pdfSha256'], filename
    facts = expected[filename]
    with pdfplumber.open(file) as pdf:
        pages = pdf.pages
        illustration_count = sum(len(page.images) for page in pages)
        if illustration_count < len(facts['activities']):
            failures.append({'file': filename, 'missingActivityPosters': True, 'expectedAtLeast': len(facts['activities']), 'actualImages': illustration_count})
        text = '\n'.join(page.extract_text() or '' for page in pages)
        # A coordinate-sorted page extraction interleaves the four activity
        # columns and the side-by-side next-step/note cards. The actual PDF
        # text stream preserves each paragraph's character order. Read that
        # selectable stream across continuation pages, excluding the repeated
        # fixed header/footer at the renderer's reserved page margins.
        body_flow = ''.join(char['text'] for page in pages for char in page.chars
                            if char['top'] >= 76 and char['bottom'] <= 800)
        selectable_flows = [normalize(text), normalize(body_flow)]
        parts = [facts['player'], facts['academy'], facts['period'], facts['focus'], facts['nextStep'], facts.get('nextDrill', ''), facts.get('observationCriteria', ''), facts.get('reviewDate', ''), facts['note']]
        for activity in facts['activities']:
            parts += [activity['name'], activity['purpose'], activity.get('activity', '')]
        parts += facts['observations'] + facts['coachEvaluation']
        for series in facts['measurements']:
            parts += [series['label']]
            for point in series['points']:
                parts += [point['dateLabel'], f"{point['value']}/{point['total']}" if point.get('total') is not None else str(point['value'])]
        missing = [part for part in parts if part and not any(normalize(part) in flow for flow in selectable_flows)]
        if missing:
            failures.append({'file': filename, 'missingApprovedParentFacts': missing})
        if re.search(r'\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b', text, re.I) or 'Attendance basis:' in text or 'Conditions:' in text or 'RAW_RECORD' in text:
            failures.append({'file': filename, 'technicalMetadataExposed': True})
        if re.search(r'\b(?:overall (?:ability|talent) score|8\.5/10|video evidence|player footage)\b', text, re.I):
            failures.append({'file': filename, 'unapprovedClaim': True})
        total_characters = 0
        for index, page in enumerate(pages):
            assert abs(page.width - 595.28) < 1 and abs(page.height - 841.89) < 1
            chars = page.chars
            total_characters += len(chars)
            outside = [c['text'] for c in chars if c['x0'] < 24 or c['x1'] > page.width - 24 or c['top'] < 18 or c['bottom'] > page.height - 18]
            if outside:
                failures.append({'file': filename, 'page': index + 1, 'outOfBoundsCharacters': ''.join(outside)})
            page_text = page.extract_text() or ''
            if facts['academy'] not in page_text or f'{index+1} / {len(pages)}' not in page_text or 'Powered by Sportozen' not in page_text:
                failures.append({'file': filename, 'page': index + 1, 'missingRepeatedBranding': True})
        if filename == 'U8-01-2026-08.pdf' and len(pages) != 1:
            failures.append({'file': filename, 'expectedSingleA4Page': True, 'actualPages': len(pages)})
        checks.append({'file': filename, 'pages': len(pages), 'activityPosters': illustration_count, 'selectableCharacters': total_characters, 'factsChecked': len([p for p in parts if p]), 'pdfSha256': entry['pdfSha256']})
result = {'status': 'FAIL' if failures else 'PASS', 'exports': len(checks), 'pages': sum(c['pages'] for c in checks), 'selectableTextVerified': True, 'noRawEvidenceMetadata': not any(f.get('technicalMetadataExposed') for f in failures), 'checks': checks, 'failures': failures}
(EVIDENCE / 'pdf-verification.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'status': result['status'], 'exports': result['exports'], 'pages': result['pages'], 'failures': failures[:8]}, indent=2))
raise SystemExit(bool(failures))
