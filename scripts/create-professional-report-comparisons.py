"""Create honest analytical comparisons from the actual professional Reports outputs.

This tool composes QA boards, not application artwork. Only the supplied reference
is cropped, at the two explicitly recorded panel bounds. Actual images retain
all content and are scaled proportionally to the same panel width. The tool never
captures a browser, renders a PDF or substitutes offline sample files.

After actual browser and authenticated-endpoint PDF PNGs exist:
    python scripts/create-professional-report-comparisons.py --prepare-review
Inspect the inputs, enter factual differences, and mark each worksheet inspected.
Then run the same command without --prepare-review. Replaced inputs invalidate
prior inspection hashes. No similarity percentage or user approval is inferred.
"""

from argparse import ArgumentParser
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "docs/screenshots/professional-reports"
CROPS = {"management": (0, 0, 831, 1086), "report": (842, 18, 1440, 1086)}
PANEL = 780
NOTES = 620
PAD = 26
GAP = 26
HEADER = 150
COMMON_LIMITS = [
    "Noto Sans is the bundled font substitution; the reference's exact font is unidentified.",
    "Player, batch and coach names come from saved records and can differ from the design example.",
    "A missing saved academy crest or player photo uses honest text/initials; no child image is invented.",
    "The static football illustrations are original generic demonstrations, not recordings of this child.",
    "Review timestamps and dates appear only when available in the saved record; a next-review date is not an approval timestamp.",
    "Panels are proportionally scaled to equal width. Actual image content is neither cropped nor stretched. No design approval is inferred.",
]


def rel(path):
    return path.resolve().relative_to(ROOT).as_posix()


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def load_png(path, width=None):
    if not path.is_file():
        raise ValueError(f"Missing actual/reference PNG: {rel(path)}")
    with Image.open(path) as opened:
        if opened.format != "PNG":
            raise ValueError(f"PNG evidence required: {rel(path)}")
        if width is not None and opened.width != width:
            raise ValueError(f"{rel(path)}: expected native width {width}, got {opened.width}")
        return opened.convert("RGB")


def scaled(image, width=PANEL):
    height = round(image.height * width / image.width)
    return image.resize((width, height), Image.Resampling.LANCZOS)


def collect(args):
    reference = load_png(args.reference)
    if reference.size != (1448, 1086):
        raise ValueError(f"Approved reference dimensions changed: {reference.size}")
    records = {}
    for width in (1536, 1440):
        actual = args.actual_dir / f"reports-{width}.png"
        records[f"management-{width}"] = {
            "title": f"Reports management - actual {width}px browser capture",
            "kind": "approved-reference/browser",
            "panels": [
                ("Approved management reference", reference.crop(CROPS["management"])),
                (f"Actual browser implementation - {width}px", load_png(actual, width)),
            ],
            "inputs": {"reference": args.reference, "actual": actual},
            "reference_crop": list(CROPS["management"]),
        }
    pdf = args.actual_dir / "U8-01-2026-08.pdf"
    actual_page = args.actual_dir / "U8-01-2026-08-1.png"
    if not pdf.is_file():
        raise ValueError(f"Missing actual endpoint PDF: {rel(pdf)}")
    after_pages = len(PdfReader(pdf).pages)
    if after_pages != 1:
        raise ValueError(f"Aadi August actual export has {after_pages} pages; do not label it one page.")
    records["report-aadi-august"] = {
        "title": "Aadi August report - approved design / actual authenticated PDF",
        "kind": "approved-reference/actual-PDF",
        "panels": [
            ("Approved report reference panel", reference.crop(CROPS["report"])),
            ("Actual endpoint PDF - full A4 page 1 of 1", load_png(actual_page)),
        ],
        "inputs": {"reference": args.reference, "actual": actual_page, "actual_pdf": pdf},
        "reference_crop": list(CROPS["report"]),
        "actual_pdf_pages": after_pages,
    }
    before_pdf = args.before_dir / "aadi-august-original.pdf"
    if not before_pdf.is_file() or len(PdfReader(before_pdf).pages) != 3:
        raise ValueError("The original Aadi August PDF must exist and contain three pages.")
    before_paths = [args.before_dir / f"aadi-august-original-{page}.png" for page in (1, 2, 3)]
    before_images = [scaled(load_png(path)) for path in before_paths]
    strip = Image.new("RGB", (PANEL, sum(image.height for image in before_images) + GAP * 2), "white")
    top = 0
    for image in before_images:
        strip.paste(image, (0, top))
        top += image.height + GAP
    records["aadi-pagination-before-after"] = {
        "title": "Aadi August - three original PDF pages / one actual endpoint page",
        "kind": "actual-before/actual-after-PDF",
        "panels": [("Before - all three original pages", strip), ("After - full actual page 1 of 1", load_png(actual_page))],
        "inputs": {"before_pdf": before_pdf, **{f"before_page_{i + 1}": p for i, p in enumerate(before_paths)}, "actual": actual_page, "actual_pdf": pdf},
        "before_pdf_pages": 3,
        "actual_pdf_pages": after_pages,
    }
    mobile_390 = args.actual_dir / args.parent_390
    mobile_320 = args.actual_dir / args.parent_320
    records["parent-mobile-context"] = {
        "title": "Parent Reports - actual responsive context (no supplied mobile reference)",
        "kind": "actual-responsive-context-only",
        "panels": [("Actual Parent Reports - native 390px", load_png(mobile_390, 390)), ("Actual Parent Reports - native 320px", load_png(mobile_320, 320))],
        "inputs": {"actual_390": mobile_390, "actual_320": mobile_320},
        "reference_crop": None,
    }
    for record in records.values():
        record["input_sha256"] = {key: digest(path) for key, path in record["inputs"].items()}
        record["input_paths"] = {key: rel(path) for key, path in record["inputs"].items()}
    return records


def prepare(args, records):
    if args.notes.exists():
        raise ValueError("Inspection worksheet exists. Retain its notes, update changed hashes and reinspect explicitly.")
    sheet = {"purpose": "Factual image inspection only; not user visual approval.", "boards": {}}
    for key, record in records.items():
        sheet["boards"][key] = {
            "inspection_status": "pending",
            "input_sha256": record["input_sha256"],
            "observed_differences": [],
            "data_context_differences": [],
            "limitations": ["No approved mobile panel is supplied; this is a usability/context comparison only."] if key == "parent-mobile-context" else [],
        }
    args.notes.parent.mkdir(parents=True, exist_ok=True)
    args.notes.write_text(json.dumps(sheet, indent=2) + "\n", encoding="utf-8")
    print(f"Prepared {rel(args.notes)}. Inspect all input pages before marking the worksheet inspected.")


def inspected_notes(args, records):
    if not args.notes.is_file():
        raise ValueError("Run --prepare-review, inspect inputs and complete the worksheet first.")
    sheet = json.loads(args.notes.read_text(encoding="utf-8"))
    reviews = sheet.get("boards", {})
    for key, record in records.items():
        review = reviews.get(key, {})
        if review.get("inspection_status") != "inspected":
            raise ValueError(f"{key}: image inspection is pending.")
        if review.get("input_sha256") != record["input_sha256"]:
            raise ValueError(f"{key}: input changed; inspect the replacement before generating a board.")
        for field in ("observed_differences", "data_context_differences", "limitations"):
            if not isinstance(review.get(field), list) or any(not isinstance(s, str) or not s.strip() for s in review[field]):
                raise ValueError(f"{key}: {field} must be a list of factual nonempty strings.")
        if not review["observed_differences"] and not review["data_context_differences"]:
            raise ValueError(f"{key}: record actual observed visual or context differences.")
    return reviews


def wrapped(draw, value, font, width):
    lines = []
    current = ""
    for word in value.split():
        candidate = f"{current} {word}".strip()
        if draw.textlength(candidate, font=font) <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
            while draw.textlength(current, font=font) > width:
                split = max(i for i in range(1, len(current)) if draw.textlength(current[:i], font=font) <= width)
                lines.append(current[:split])
                current = current[split:]
    if current:
        lines.append(current)
    return lines


def blocks(draw, review, regular, bold):
    result = []
    for field, heading in (("observed_differences", "Observed visual differences"), ("data_context_differences", "Saved data and context"), ("limitations", "Comparison limitations")):
        result.append((heading, bold, 36))
        items = review[field] or ["No additional difference recorded in this inspected category."]
        for item in items:
            result.extend((line, regular, 29) for line in wrapped(draw, item, regular, NOTES - 36))
            result.append(("", regular, 14))
    result.append(("Awaiting user visual approval", bold, 36))
    result.extend((line, regular, 29) for line in wrapped(draw, "These observations and passing tests do not grant design approval.", regular, NOTES - 36))
    return result


def generate(args, records, reviews):
    regular = ImageFont.truetype(str(ROOT / "public/fonts/NotoSans-Regular.ttf"), 21)
    bold = ImageFont.truetype(str(ROOT / "public/fonts/NotoSans-Bold.ttf"), 23)
    title_font = ImageFont.truetype(str(ROOT / "public/fonts/NotoSans-Bold.ttf"), 29)
    foot_font = ImageFont.truetype(str(ROOT / "public/fonts/NotoSans-Regular.ttf"), 19)
    measure = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    total_width = PAD * 2 + PANEL * 2 + NOTES + GAP * 2
    footnotes = []
    for i, note in enumerate(COMMON_LIMITS, 1):
        footnotes.extend(wrapped(measure, f"{i}. {note}", foot_font, total_width - PAD * 2))
    footer_height = len(footnotes) * 28 + 42
    args.output_dir.mkdir(parents=True, exist_ok=True)
    manifest = {"created_at": datetime.now(timezone.utc).isoformat(), "status": "Inspected comparisons; awaiting user visual approval.", "boards": {}}
    for key, record in records.items():
        panels = [scaled(image) for _, image in record["panels"]]
        text = blocks(measure, reviews[key], regular, bold)
        content_height = max(*(p.height for p in panels), sum(line_height for _, _, line_height in text) + 36)
        height = HEADER + content_height + footer_height
        if height * total_width > 100_000_000:
            raise ValueError(f"{key}: board is too large to allocate safely; inspect the full inputs directly.")
        board = Image.new("RGB", (total_width, height), "#edf2f6")
        draw = ImageDraw.Draw(board)
        draw.text((PAD, 18), record["title"], font=title_font, fill="#102d44")
        draw.text((PAD, 65), "Equal panel width; proportional scale; full actual content retained. No fidelity percentage or approval claim.", font=regular, fill="#466078")
        offsets = [PAD, PAD + PANEL + GAP]
        panel_manifest = []
        for (label, original), image, left in zip(record["panels"], panels, offsets):
            draw.text((left, 109), label, font=bold, fill="#12354d")
            board.paste(image, (left, HEADER))
            draw.rectangle((left, HEADER, left + PANEL - 1, HEADER + image.height - 1), outline="#c4d1da", width=1)
            panel_manifest.append({"label": label, "source_pixels": list(original.size), "display_pixels": list(image.size), "proportional_scale": PANEL / original.width, "actual_cropped": False})
        note_x = PAD + PANEL * 2 + GAP * 2
        draw.rounded_rectangle((note_x, HEADER, note_x + NOTES, HEADER + content_height), radius=10, fill="white")
        draw.text((note_x + 18, 109), "Remaining differences / context", font=bold, fill="#12354d")
        y = HEADER + 18
        for value, font, line_height in text:
            draw.text((note_x + 18, y), value, font=font, fill="#27455b")
            y += line_height
        y = HEADER + content_height + 18
        for line in footnotes:
            draw.text((PAD, y), line, font=foot_font, fill="#405b70")
            y += 28
        output = args.output_dir / f"{key}.png"
        board.save(output, optimize=True)
        manifest["boards"][key] = {"file": rel(output), "kind": record["kind"], "inputs": record["input_paths"], "input_sha256": record["input_sha256"], "reference_crop": record.get("reference_crop"), "panels": panel_manifest, "before_pdf_pages": record.get("before_pdf_pages"), "actual_pdf_pages": record.get("actual_pdf_pages"), "inspection": reviews[key], "output_sha256": digest(output)}
    (args.output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(records)} honest comparison boards and their input/output manifest to {rel(args.output_dir)}.")


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--reference", type=Path, default=BASE / "approved-reference.png")
    parser.add_argument("--actual-dir", type=Path, default=BASE / "after")
    parser.add_argument("--before-dir", type=Path, default=BASE / "before")
    parser.add_argument("--output-dir", type=Path, default=BASE / "comparisons")
    parser.add_argument("--notes", type=Path, default=BASE / "comparisons/review-notes.json")
    parser.add_argument("--parent-390", default="parent-report-390.png")
    parser.add_argument("--parent-320", default="parent-report-320.png")
    parser.add_argument("--prepare-review", action="store_true")
    args = parser.parse_args()
    records = collect(args)
    if args.prepare_review:
        prepare(args, records)
    else:
        generate(args, records, inspected_notes(args, records))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, FileNotFoundError) as error:
        raise SystemExit(str(error)) from error
