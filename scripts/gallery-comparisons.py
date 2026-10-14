"""Compose QA reference/browser comparisons; never used as application UI."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import textwrap

root = Path(__file__).resolve().parents[1]
out = root / "docs/design/gallery-prototype"
shots = out / "screenshots"
refs = root / "docs/reference/ui-gallery"
font_path = root / "public/fonts/NotoSans-Regular.ttf"
font = ImageFont.truetype(str(font_path), 16)
bold = ImageFont.truetype(str(root / "public/fonts/NotoSans-Bold.ttf"), 20)
panels = [
    ("coach-today", "01-coach-today.png", 1440, None, "Source fixture names, October dates, two sessions and actual counts. Low-resolution player crop clips part of the arm; hand-written slogan is omitted. The validated academy accent is darker. Initials replace unsupplied portraits."),
    ("player-profile", "02-player-profile.png", 1440, None, "Three fixture players instead of five illustrative names. Age, foot, position and earlier history remain Not recorded. Supplied portrait is labelled illustration. Longer source focuses and real controls change wrapping. No fabricated performance timeline."),
    ("parent-home", "03-parent-home.png", 390, (15, 37, 251, 541), "Source linked parent/child, October week, two sessions and reviewed September update. Receiving focus replaces illustrative finishing claims. Initials, source copy and accessible controls change spacing. Device frame/status bar are excluded."),
    ("weekly-plan", "05-weekly-batch-plan.png", 1440, None, "Shared focus, two confirmed sessions and actual squad. Edit team focus opens real fields; one save invalidates wording approval. Review then publish replaces misleading one-step live Send. No phone device frame around the wording preview."),
    ("parent-weekly", "06-parent-weekly-plan.png", 390, None, "Academy and linked child controls plus bottom navigation retain context. Two source sessions replace three illustrative sessions. Supplied photo banner, focus and functional session/focus tabs are retained. Longer source copy changes height."),
]
for route, source, width, crop, note in panels:
    reference = Image.open(refs / source).convert("RGB")
    if crop:
        reference = reference.crop(crop)
    actual = Image.open(shots / f"{route}-{width}.png").convert("RGB")
    target = 1000 if width == 1440 else 390
    reference = reference.resize((target, round(reference.height * target / reference.width)))
    actual = actual.resize((target, round(actual.height * target / actual.width)))
    lines = textwrap.wrap(note, 30 if width == 390 else 32)
    notes_width = 330
    height = max(reference.height, actual.height, len(lines)*27 + 40) + 75
    canvas = Image.new("RGB", (target*2 + notes_width + 64, height), "#eef3f6")
    draw = ImageDraw.Draw(canvas)
    draw.text((16, 16), "Supplied reference", font=bold, fill="#102735")
    draw.text((target+32, 16), "Actual browser", font=bold, fill="#102735")
    draw.text((target*2+48, 16), "Remaining differences", font=bold, fill="#102735")
    canvas.paste(reference, (16, 60))
    canvas.paste(actual, (target+32, 60))
    draw.multiline_text((target*2+48, 65), "\n".join(lines), font=font, fill="#344c5d", spacing=8)
    canvas.save(out / f"{route}-comparison.png")

files = sorted(shots.glob("*-390.png"))
canvas = Image.new("RGB", (1600, ((len(files)+3)//4)*610), "#eef3f6")
draw = ImageDraw.Draw(canvas)
for i, path in enumerate(files):
    picture = Image.open(path).convert("RGB")
    # Contact sheet shows top viewport, not an extreme reduction of a long page.
    picture = picture.crop((0, 0, picture.width, min(picture.height, 844)))
    picture.thumbnail((260, 562))
    x, y = (i%4)*400+20, (i//4)*610+36
    canvas.paste(picture, (x, y))
    draw.text((x, y-27), path.stem, fill="#102735", font=font)
canvas.save(out / "mobile-contact-sheet.jpg")
