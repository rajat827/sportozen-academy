import json
from pathlib import Path
from pypdf import PdfReader
import pdfplumber
root=Path('docs/screenshots/reports')
results=[]
for name in ['Aarav-Sharma-Development-Report-2026-10.pdf','repeat-report.pdf','long-report.pdf','missing-records-report.pdf']:
 p=root/name
 if not p.exists():continue
 reader=PdfReader(p); text='\n'.join(page.extract_text() for page in reader.pages)
 assert all(page.extract_text().strip() for page in reader.pages), 'Blank page'
 assert all(abs(float(page.mediabox.width)-595.28)<1 for page in reader.pages),'Not A4'
 assert chr(65533) not in text, 'Broken glyph'
 with pdfplumber.open(p) as doc:
  for page in doc.pages:
   for word in page.extract_words():
    assert 40 <= word['top'] and word['bottom'] <= 805, f'Off-page text: {word}'
 assert 'External delivery: Not sent' in text
 assert 'Private working note' not in text and 'Kabir Singh' not in text
 if name.startswith('Aarav') or name.startswith('repeat'):
  assert len(reader.pages)==1, f'Sparse report has {len(reader.pages)} pages'
  for fact in ['3 of 6','three of six introductory attempts','e1','Review date to be confirmed','Keep the focus specific and celebrate consistent practice.','1 / 1','October 2026']:
   assert fact in text, f'Missing {fact}'
  for bad in ['50%','50/100','91%','Cone slalom','guarantee','ranking']:
   assert bad not in text, f'Unsupported {bad}'
 if name=='long-report.pdf':
  assert len(reader.pages)>1
  assert 'Recorded observation 24' in text and 'END OF RECORDED NOTE' in text
  for i,page in enumerate(reader.pages):
   content=page.extract_text();assert 'Stallions FC Academy' in content and f'{i+1} / {len(reader.pages)}' in content
 results.append({'file':name,'pages':len(reader.pages),'characters':len(text),'checks':'passed'})
(root/'pdf-validation.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2))
