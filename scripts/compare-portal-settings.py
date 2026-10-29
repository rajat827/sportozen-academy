"""Compose saved authenticated browser evidence; never substitutes for inspection.

Run after the real acceptance screenshot exists. Supply a UTF-8 notes file with
the differences observed by inspecting reference and actual at the same width.
"""
from pathlib import Path
import argparse
import textwrap
from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser()
parser.add_argument("--actual", default="docs/screenshots/portal-integration/settings/settings-1536-viewport.png")
parser.add_argument("--reference", default="docs/reference/approved-ui/settings-screen.png")
parser.add_argument("--notes", required=True, help="UTF-8 text; one inspected difference per line")
parser.add_argument("--output", default="docs/screenshots/portal-integration/settings/reference-versus-actual-1536.png")
args = parser.parse_args()
reference, actual = Image.open(args.reference).convert("RGB"), Image.open(args.actual).convert("RGB")
if reference.width != actual.width:
    raise ValueError("Capture actual at the reference width; do not scale a different viewport to imply fidelity.")
font_dir = Path("public/fonts")
regular = ImageFont.truetype(str(font_dir / "NotoSans-Regular.ttf"), 22)
bold = ImageFont.truetype(str(font_dir / "NotoSans-Bold.ttf"), 26)
margin, gap, notes_width, heading = 24, 24, 440, 86
height = max(reference.height, actual.height) + heading + margin
width = margin * 2 + reference.width + actual.width + notes_width + gap * 2
canvas = Image.new("RGB", (width, height), "#edf3f7")
draw = ImageDraw.Draw(canvas)
positions = [margin, margin + reference.width + gap, margin + reference.width + actual.width + gap * 2]
for title, left in zip(["Approved reference", "Actual authenticated browser", "Remaining differences"], positions):
    draw.text((left, 22), title, font=bold, fill="#09283e")
canvas.paste(reference, (positions[0], heading))
canvas.paste(actual, (positions[1], heading))
notes = Path(args.notes).read_text(encoding="utf-8").strip()
if not notes:
    raise ValueError("Supply inspected differences or an explicit honest statement that no major mismatch was observed.")
y = heading
for paragraph in notes.splitlines():
    if not paragraph.strip():
        y += 18
        continue
    for line in textwrap.wrap(paragraph.strip(), width=32):
        if y + 34 > height:
            raise ValueError("Notes exceed the comparison panel; shorten them without omitting a material limitation.")
        draw.text((positions[2], y), line, font=regular, fill="#294b68")
        y += 34
    y += 20
output = Path(args.output)
output.parent.mkdir(parents=True, exist_ok=True)
canvas.save(output)
print(str(output.resolve()))
