"""Compose actual browser/reference review evidence; never used in the UI."""
from pathlib import Path
from hashlib import sha256
import json
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
folder = root / "docs/screenshots/settings-ui"
reference_path = root / "docs/reference/approved-ui/settings-screen.png"
actual_path = folder / "after/settings-1536.png"
reference = Image.open(reference_path).convert("RGB")
actual = Image.open(actual_path).convert("RGB")
assert reference.size == actual.size == (1536, 1024), "Use matching actual 1536 × 1024 browser pixels."
font = ImageFont.truetype(str(root / "public/fonts/NotoSans-Bold.ttf"), 25)
canvas = Image.new("RGB", (3144, 1110), "#edf2f6")
draw = ImageDraw.Draw(canvas)
draw.text((24, 17), "APPROVED REFERENCE", font=font, fill="#09283e")
draw.text((1584, 17), "ACTUAL IMPLEMENTATION", font=font, fill="#09283e")
canvas.paste(reference, (24, 62))
canvas.paste(actual, (1584, 62))
canvas.save(folder / "reference-versus-actual-1536.png")
metadata = {
    "purpose": "QA comparison only; not application artwork or design approval.",
    "reference": str(reference_path.relative_to(root)),
    "reference_sha256": sha256(reference_path.read_bytes()).hexdigest(),
    "actual": str(actual_path.relative_to(root)),
    "actual_sha256": sha256(actual_path.read_bytes()).hexdigest(),
    "pixels": [1536, 1024],
    "processing": "Native dimensions; no source/screenshot crop, stretch or resampling.",
}
(folder / "comparison-provenance.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
mobile = Image.new("RGB", (782, 920), "#edf2f6")
draw = ImageDraw.Draw(mobile)
for width, x in [(390, 16), (320, 426)]:
    screenshot = Image.open(folder / f"after/settings-{width}.png").convert("RGB")
    assert screenshot.size == (width, 844)
    draw.text((x, 12), f"ACTUAL {width} px", font=font, fill="#09283e")
    mobile.paste(screenshot, (x, 56))
mobile.save(folder / "mobile-390-and-320.png")
print(json.dumps(metadata, indent=2))
