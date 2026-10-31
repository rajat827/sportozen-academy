"""Combine supplied reference crops and actual browser captures for review only."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
folder = root / "docs/design/locked-ui"
refs = root / "docs/reference/approved-ui/screens"
font = ImageFont.truetype(str(root / "public/fonts/NotoSans-Bold.ttf"), 18)


def pair(left, right, target, labels, output):
    pictures = []
    for picture in (left, right):
        pictures.append(picture.resize((target, round(picture.height * target / picture.width))))
    canvas = Image.new("RGB", (target * 2 + 48, max(p.height for p in pictures) + 64), "#eef3f6")
    draw = ImageDraw.Draw(canvas)
    for i, picture in enumerate(pictures):
        x = 16 + i * (target + 16)
        draw.text((x, 14), labels[i], font=font, fill="#142b3d")
        canvas.paste(picture, (x, 52))
    canvas.save(folder / output)


for screen, reference, width, crop in [
    ("coach-today", "01-coach-today.png", 1440, None),
    ("parent-home", "03-parent-home.png", 390, (15, 37, 251, 541)),
    ("parent-home", "03-parent-home.png", 320, (15, 37, 251, 541)),
]:
    source = Image.open(refs / reference).convert("RGB")
    if crop:
        source = source.crop(crop)
    actual = Image.open(folder / "after" / f"{screen}-{width}.png").convert("RGB")
    pair(source, actual, 1000 if width == 1440 else width,
         ["APPROVED REFERENCE", "ACTUAL IMPLEMENTATION"], f"{screen}-{width}-comparison.png")

for screen, width in [("coach-today", 1440), ("parent-home", 390), ("parent-home", 320), ("parent-home", 1440), ("coach-today", 390)]:
    before = Image.open(folder / "before" / f"{screen}-{width}.png").convert("RGB")
    after = Image.open(folder / "after" / f"{screen}-{width}.png").convert("RGB")
    pair(before, after, 1000 if width == 1440 else width,
         ["BEFORE — ACTUAL BROWSER", "AFTER — ACTUAL BROWSER"], f"{screen}-{width}-before-after.png")
