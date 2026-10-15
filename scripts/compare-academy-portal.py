"""Compose approved reference / actual browser / inspected remaining differences.

Never creates browser evidence. Desktop inputs must share native viewport width.
For the parent board, use an explicit content crop excluding presentation chrome;
the crop is scaled proportionally to the requested mobile viewport and disclosed.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import argparse
import hashlib
import json
import textwrap

parser = argparse.ArgumentParser()
parser.add_argument("--reference", required=True)
parser.add_argument("--actual", required=True)
parser.add_argument("--notes", required=True)
parser.add_argument("--output", required=True)
parser.add_argument("--reference-crop", help="x,y,right,bottom in original pixels")
args = parser.parse_args()
reference_path, actual_path = Path(args.reference), Path(args.actual)
reference = Image.open(reference_path).convert("RGB")
actual = Image.open(actual_path).convert("RGB")
source_size = reference.size
crop = None
if args.reference_crop:
    crop = tuple(map(int, args.reference_crop.split(",")))
    if len(crop) != 4 or not (0 <= crop[0] < crop[2] <= reference.width and 0 <= crop[1] < crop[3] <= reference.height):
        raise ValueError("Invalid reference content crop")
    reference = reference.crop(crop)
    reference = reference.resize((actual.width, round(reference.height * actual.width / reference.width)), Image.Resampling.LANCZOS)
elif reference.width != actual.width:
    raise ValueError("Capture the actual at the approved reference width; do not resize desktop evidence")
notes = Path(args.notes).read_text(encoding="utf-8").strip()
if not notes:
    raise ValueError("Write observed differences after inspecting actual and reference")
scale = 1 if actual.width >= 1000 else 0.75
heading, pad, gap, notes_width = round(82*scale), round(24*scale), round(24*scale), round(430*scale)
height = max(reference.height, actual.height) + heading + pad
width = 2*pad + reference.width + actual.width + 2*gap + notes_width
canvas = Image.new("RGB", (width, height), "#edf3f7")
draw = ImageDraw.Draw(canvas)
regular = ImageFont.truetype("public/fonts/NotoSans-Regular.ttf", round(21*scale))
bold = ImageFont.truetype("public/fonts/NotoSans-Bold.ttf", round(25*scale))
positions = [pad, pad+reference.width+gap, pad+reference.width+actual.width+2*gap]
for title, x in zip(["Approved reference", "Actual browser implementation", "Remaining differences"], positions):
    draw.text((x, round(22*scale)), title, font=bold, fill="#09283e")
canvas.paste(reference, (positions[0], heading))
canvas.paste(actual, (positions[1], heading))
y = heading
for paragraph in notes.splitlines():
    if not paragraph.strip():
        y += round(16*scale)
        continue
    for line in textwrap.wrap(paragraph, width=32):
        if y + round(33*scale) > height:
            raise ValueError("Observed differences exceed panel height; shorten notes without omitting material limitations")
        draw.text((positions[2], y), line, font=regular, fill="#294b68")
        y += round(33*scale)
    y += round(18*scale)
output = Path(args.output)
output.parent.mkdir(parents=True, exist_ok=True)
canvas.save(output)
metadata = {
    "reference": str(reference_path), "referenceSha256": hashlib.sha256(reference_path.read_bytes()).hexdigest(),
    "referenceSourceSize": source_size, "referenceCrop": crop, "referenceDisplaySize": reference.size,
    "actual": str(actual_path), "actualSha256": hashlib.sha256(actual_path.read_bytes()).hexdigest(),
    "actualSize": actual.size, "notes": notes,
    "status": "Inspected implementation evidence; awaiting user visual approval",
}
output.with_suffix(".json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
print(str(output.resolve()))
