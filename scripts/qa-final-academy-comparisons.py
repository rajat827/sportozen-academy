"""Build analytical, native-pixel reference/browser comparisons for seven screens.

This script never captures a browser or generates application artwork. It requires
the supplied approved references and actual 1536 px browser PNGs. No screenshot
is cropped, stretched, or resampled. Longer full-page captures remain visible.

After browser capture, prepare a review worksheet:
    python scripts/qa-final-academy-comparisons.py --prepare-review

Inspect both inputs for every screen, fill the worksheet's factual notes, and
change each inspection status to "inspected". Then generate seven boards, JSON,
and a README:
    python scripts/qa-final-academy-comparisons.py

The worksheet binds notes to input hashes, so replacement screenshots require a
fresh inspection. No similarity score or visual approval is inferred.
"""

from argparse import ArgumentParser
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SCREENS = ("home", "players", "calendar", "training", "reports", "fees", "settings")
WIDTH = 1536
PAD = 28
GAP = 28
NOTES_WIDTH = 720
HEADER = 150
FOOTER = 94
REVIEW_STATUS = "Awaiting user visual approval; no approval inferred."


def relative(path):
    """Keep artifact paths portable without reading or copying private files."""
    try:
        return path.resolve().relative_to(ROOT).as_posix()
    except ValueError:
        return str(path.resolve())


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def load_image(path, *, reference=False):
    if not path.is_file():
        raise ValueError(f"Missing actual/reference input: {relative(path)}")
    with Image.open(path) as source:
        if source.format != "PNG":
            raise ValueError(f"Use the original PNG input: {relative(path)}")
        if source.width != WIDTH:
            raise ValueError(
                f"{relative(path)} is {source.width}px wide; capture at {WIDTH}px. "
                "The comparison does not resize desktop evidence."
            )
        if reference and source.size != (1536, 1024):
            raise ValueError(f"Unexpected approved reference dimensions: {source.size}")
        return source.convert("RGB")


def inputs(args):
    result = {}
    for screen in SCREENS:
        reference_path = args.reference_dir / f"{screen}-screen.png"
        actual_path = args.actual_dir / f"{screen}-1536.png"
        reference = load_image(reference_path, reference=True)
        actual = load_image(actual_path)
        result[screen] = {
            "reference_path": reference_path,
            "actual_path": actual_path,
            "reference": reference,
            "actual": actual,
            "reference_sha256": digest(reference_path),
            "actual_sha256": digest(actual_path),
        }
    return result


def prepare_review(args, screens):
    if args.notes.exists():
        raise ValueError(
            f"Review worksheet already exists: {relative(args.notes)}. "
            "Keep prior inspection notes; update hashes and reinspect changed inputs explicitly."
        )
    worksheet = {
        "purpose": "Image inspection notes, not user visual approval.",
        "screens": {},
    }
    for screen, record in screens.items():
        worksheet["screens"][screen] = {
            "inspection_status": "pending",
            "reference_sha256": record["reference_sha256"],
            "actual_sha256": record["actual_sha256"],
            "context_differences": [],
            "visual_differences": [],
            "limitations": [],
        }
    args.notes.parent.mkdir(parents=True, exist_ok=True)
    args.notes.write_text(json.dumps(worksheet, indent=2) + "\n", encoding="utf-8")
    print(f"Prepared {relative(args.notes)}; inspect all seven image pairs before generating.")


def review_notes(args, screens):
    if not args.notes.is_file():
        raise ValueError("Prepare and complete --prepare-review before generating comparisons.")
    notes = json.loads(args.notes.read_text(encoding="utf-8"))
    for screen, record in screens.items():
        review = notes.get("screens", {}).get(screen, {})
        if review.get("inspection_status") != "inspected":
            raise ValueError(f"{screen}: actual and reference have not been marked inspected.")
        for key in ("reference_sha256", "actual_sha256"):
            if review.get(key) != record[key]:
                raise ValueError(f"{screen}: {key} changed; reinspect the replacement image.")
        for key in ("context_differences", "visual_differences", "limitations"):
            if not isinstance(review.get(key), list) or any(
                not isinstance(item, str) or not item.strip() for item in review[key]
            ):
                raise ValueError(f"{screen}: {key} must contain factual, nonempty strings.")
        if not review["context_differences"] and not review["visual_differences"]:
            raise ValueError(f"{screen}: record observed context or visual differences.")
    return notes["screens"]


def lines_for(draw, text, font, width):
    """Wrap by rendered glyph width; never spill notes into image panels."""
    words = text.split()
    lines = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textlength(candidate, font=font) <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
            if draw.textlength(current, font=font) > width:
                raise ValueError("A notes token exceeds the panel width; use readable prose.")
    if current:
        lines.append(current)
    return lines


def text_blocks(draw, review, regular, bold):
    result = []
    for key, title in (
        ("context_differences", "Actual data and context"),
        ("visual_differences", "Observed visual differences"),
        ("limitations", "Limits of this comparison"),
    ):
        result.append((title, bold, 39))
        entries = review[key]
        if not entries:
            entries = ["No additional difference recorded during this image inspection."]
        for entry in entries:
            for line in lines_for(draw, entry, regular, NOTES_WIDTH - 28):
                result.append((line, regular, 32))
            result.append(("", regular, 14))
        result.append(("", regular, 14))
    result.append(("VISUAL APPROVAL REMAINS WITH THE USER", bold, 39))
    for line in lines_for(draw, REVIEW_STATUS, regular, NOTES_WIDTH - 28):
        result.append((line, regular, 32))
    return result


def compose(args, screen, record, review, *, top_viewport=False):
    regular = ImageFont.truetype(str(ROOT / "public/fonts/NotoSans-Regular.ttf"), 22)
    bold = ImageFont.truetype(str(ROOT / "public/fonts/NotoSans-Bold.ttf"), 24)
    title = ImageFont.truetype(str(ROOT / "public/fonts/NotoSans-Bold.ttf"), 31)
    small = ImageFont.truetype(str(ROOT / "public/fonts/NotoSans-Regular.ttf"), 20)
    measure = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    blocks = text_blocks(measure, review, regular, bold)
    actual = record["actual"]
    if top_viewport:
        actual = actual.crop((0, 0, WIDTH, min(actual.height, 1024)))
    content_height = max(
        record["reference"].height,
        actual.height,
        sum(block[2] for block in blocks) + 28,
    )
    image = Image.new(
        "RGB", (PAD * 2 + WIDTH * 2 + GAP * 2 + NOTES_WIDTH,
                HEADER + content_height + FOOTER), "#edf2f6"
    )
    draw = ImageDraw.Draw(image)
    reference_x = PAD
    actual_x = PAD + WIDTH + GAP
    notes_x = PAD + WIDTH * 2 + GAP * 2
    draw.text((PAD, 15), f"SPORTOZEN / {screen.upper()} / NATIVE 1536 PX REVIEW", font=title, fill="#0b2939")
    for x, heading, detail in (
        (reference_x, "APPROVED REFERENCE", "Supplied design; full 1536 × 1024 image"),
        (actual_x, "ACTUAL BROWSER IMPLEMENTATION", "Explicit top 1024 px crop; full image in companion board" if top_viewport else f"Actual PNG; full 1536 × {actual.height} image"),
        (notes_x, "REMAINING DIFFERENCES", "Image inspection notes; no visual approval"),
    ):
        draw.text((x, 67), heading, font=bold, fill="#0b2939")
        draw.text((x, 106), detail, font=small, fill="#365167")
    for x, picture in ((reference_x, record["reference"]), (actual_x, actual)):
        draw.rectangle((x - 1, HEADER - 1, x + picture.width, HEADER + picture.height), outline="#bacad7")
        image.paste(picture, (x, HEADER))
        if picture.height < content_height - 40:
            draw.text((x + 16, HEADER + picture.height + 12), "End of native image — no hidden crop", font=small, fill="#597183")
    y = HEADER
    for text, font, advance in blocks:
        draw.text((notes_x, y), text, font=font, fill="#29465b")
        y += advance
    footer_y = HEADER + content_height + 17
    processing = "Review detail only. Actual top 1024 px crop is explicit; full actual image is preserved in the companion comparison." if top_viewport else "Review evidence only. Native pixels; no image crop, resizing, screenshot reconstruction, or similarity score."
    draw.text((PAD, footer_y), processing, font=small, fill="#365167")
    draw.text((PAD, footer_y + 31), "The actual screen uses persisted synthetic Bharat QA records. It is not a live customer data screenshot.", font=small, fill="#365167")
    suffix = "-top-viewport" if top_viewport else ""
    output = args.output_dir / f"{screen}-1536{suffix}-comparison.png"
    image.save(output)
    return output, image.size


def provenance(args):
    path = args.actual_dir / "manifest.json"
    if not path.is_file():
        return {"manifest": None, "status": "No capture/fixture manifest supplied."}
    source = json.loads(path.read_text(encoding="utf-8"))
    # Deliberately do not copy account, auth, contact, or arbitrary manifest fields.
    return {
        "manifest": relative(path),
        "manifest_sha256": digest(path),
        "scenario": source.get("scenario"),
        "fictional": source.get("fictional"),
        "months": source.get("months"),
        "totals": source.get("totals"),
    }


def capture_inventory(args):
    """Index responsive evidence without treating file presence as a test pass."""
    responsive_path = args.output_dir / "responsive-review.json"
    reviews = json.loads(responsive_path.read_text(encoding="utf-8")) if responsive_path.is_file() else {}
    inventory = []
    for screen in (*SCREENS, "parent-home", "parent-reports"):
        for width in (1536, 1440, 768, 390, 320):
            path = args.actual_dir / f"{screen}-{width}.png"
            if not path.is_file():
                continue
            with Image.open(path) as picture:
                size = list(picture.size)
            file_hash = digest(path)
            review = reviews.get(path.name)
            if review and review.get("sha256") != file_hash:
                raise ValueError(f"Responsive inspection is stale: {path.name}; reinspect the replacement.")
            inventory.append({
                "file": relative(path), "pixels": size, "sha256": file_hash,
                "image_inspection": review or {"inspection_status": "not recorded"},
            })
    core_path = args.actual_dir / "verification.json"
    capture_path = args.actual_dir / "capture-verification.json"
    mixed_path = args.actual_dir / "screenshot-manifest.json"
    verification_path = mixed_path if mixed_path.is_file() else capture_path if capture_path.is_file() else core_path
    verification = None
    if verification_path.is_file():
        source = json.loads(verification_path.read_text(encoding="utf-8"))
        if source.get("status") not in ("PASS", "COMPLETE_MIXED_CAPTURE_PROVENANCE"):
            raise ValueError("The browser capture run is incomplete or failed; do not publish partial evidence.")
        records = source.get("screenshots", source.get("captures", []))
        for capture in records:
            if capture.get("sha256") and digest(args.actual_dir / capture["file"]) != capture["sha256"]:
                raise ValueError(f"Capture verification hash is stale: {capture['file']}")
        verification = {
            "file": relative(verification_path), "sha256": digest(verification_path),
            "status": source.get("status"), "captures": records,
            "capture_provenance": source.get("source"),
            "capture_only_attempt": source.get("neutralCaptureAttempt"),
            "role_privacy": source.get("rolePrivacy"),
            "page_error_count": len(source.get("pageErrors", [])),
            "console_error_count": len(source.get("consoleErrors", [])),
            "external_request_count": len(source.get("externalRequests", [])),
        }
    return {
        "images": inventory, "browser_verification": verification,
        "separate_core_verification": {"file": relative(core_path), "sha256": digest(core_path)} if core_path.is_file() else None,
    }


def write_outputs(args, screens, notes):
    args.output_dir.mkdir(parents=True, exist_ok=True)
    metadata = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "purpose": "Approved reference / actual browser / remaining differences review evidence.",
        "processing": "Both full source PNGs copied at native pixels. No crop, stretch, resampling, generated artwork, or similarity score.",
        "review_status": REVIEW_STATUS,
        "fixture_provenance": provenance(args),
        "responsive_evidence": capture_inventory(args),
        "screens": {},
    }
    populated_fees = ROOT / "docs/screenshots/final-academy/regression/academy-portal/fees-1536.png"
    if populated_fees.is_file():
        with Image.open(populated_fees) as picture:
            metadata["supplemental_populated_fees"] = {
                "file": relative(populated_fees), "sha256": digest(populated_fees),
                "pixels": list(picture.size),
                "context": "Different isolated QA academy with real persisted invoice/payment records. Supplemental evidence; not the Bharat fixture or approved reference.",
            }
    readme = [
        "# Seven-screen reference comparison", "",
        "These are analytical comparisons of the supplied approved references and actual authenticated browser captures. "
        "Both images are preserved at native 1536 px width; any longer browser image remains visible. "
        "Open the PNG at full size to read the application text. The right column records inspected differences.", "",
        "**Awaiting user visual approval.** No similarity score, passing test, or image inspection establishes approval.", "",
        "The implementation captures use persisted synthetic Bharat Football Academy records. "
        "Reference example names, totals, dates, portraits, and provider/payment states must not be fabricated to match the design.", "",
        "Typography uses the existing Noto Sans substitution. The raster references do not identify an exact font source, "
        "so an exact typeface match is not claimed. The other widths are responsive adaptations; no matching per-screen mobile references were supplied for these seven desktop boards.", "",
        "| Screen | Native comparison | Approved reference | Actual browser |", "| --- | --- | --- | --- |",
    ]
    details = []
    for screen, record in screens.items():
        output, size = compose(args, screen, record, notes[screen])
        viewport = None
        if record["actual"].height > 2048:
            viewport_path, viewport_size = compose(args, screen, record, notes[screen], top_viewport=True)
            viewport = {
                "file": relative(viewport_path), "sha256": digest(viewport_path),
                "pixels": list(viewport_size), "actual_crop": [0, 0, 1536, 1024],
                "purpose": "Explicit initial-viewport detail only. Full actual image remains in the primary comparison.",
            }
        record_metadata = {
            "reference": relative(record["reference_path"]),
            "reference_sha256": record["reference_sha256"],
            "reference_pixels": list(record["reference"].size),
            "actual": relative(record["actual_path"]),
            "actual_sha256": record["actual_sha256"],
            "actual_pixels": list(record["actual"].size),
            "comparison": relative(output),
            "comparison_sha256": digest(output),
            "comparison_pixels": list(size),
            "optional_top_viewport_comparison": viewport,
            "inspection": notes[screen],
            "review_status": REVIEW_STATUS,
        }
        metadata["screens"][screen] = record_metadata
        output.with_suffix(".json").write_text(json.dumps(record_metadata, indent=2) + "\n", encoding="utf-8")
        readme.append(
            f"| {screen.title()} | [{screen}-1536-comparison.png]({output.name}) | "
            f"[{screen}-screen.png](../../../reference/approved-ui/{screen}-screen.png) | "
            f"[{screen}-1536.png](../bharat/{screen}-1536.png) |"
        )
        details.extend(["", f"## {screen.title()}", ""])
        if viewport:
            details.extend([f"[Initial viewport detail]({Path(viewport['file']).name}) shows an explicitly labelled top 1024 px actual crop; the primary board preserves the full actual page.", ""])
        for key, label in (("context_differences", "Data/context"), ("visual_differences", "Visual"), ("limitations", "Limit")):
            details.extend(f"- **{label}:** {note}" for note in notes[screen][key])
    readme.extend(details)
    if populated_fees.is_file():
        readme.extend([
            "", "## Populated Fees supplement", "",
            "[Actual populated Fees capture](../regression/academy-portal/fees-1536.png) uses a separate isolated QA academy "
            "with persisted finance records. It supplements the honest empty Bharat Fees state; it is not substituted into the Bharat comparison. "
            "Its hash and dimensions are recorded in `comparisons.json`.", "",
        ])
    readme.extend([
        "", "## Reproduction", "",
        "Run the comparison script after completing hash-bound image inspection notes:", "",
        "```text", "python scripts/qa-final-academy-comparisons.py", "```", "",
        "`review-notes.json` binds observations to the reference and actual input hashes. "
        "`comparisons.json` records dimensions, processing, provenance, and hashes. "
        "Browser verification and the other responsive widths are separate evidence; these desktop boards do not establish mobile fidelity.", "",
    ])
    responsive = metadata["responsive_evidence"]
    inspected = sum(
        item["image_inspection"].get("inspection_status") == "inspected"
        for item in responsive["images"]
    )
    readme.extend([
        "## Responsive evidence", "",
        f"The manifest indexes {len(responsive['images'])} actual capture files; {inspected} have hash-bound image inspection notes. "
        "File presence alone is not a test pass. See `responsive-review.json` for findings and `comparisons.json` for the browser verification file and hash.", "",
    ])
    verification = responsive["browser_verification"]
    if verification and verification["status"] == "COMPLETE_MIXED_CAPTURE_PROVENANCE":
        readme.extend([
            "Capture provenance is explicitly mixed on the same unchanged product build: 21 desktop/tablet images use the read-only "
            "neutral-scroll/focus capture attempt; 18 mobile/Parent images remain from the successful full Bharat verification. "
            "The redundant capture-only attempt stopped because its readiness predicate incorrectly waited for a lazy logo inside the CSS-hidden mobile sidebar. "
            "The helper predicate was corrected and type/lint checked, with no further browser retry. Its failed attempt remains recorded; "
            "it does not replace or invalidate the separate successful functional/privacy verification. "
            "See `../bharat/screenshot-manifest.json` and `../bharat/capture-verification.json` for exact per-image provenance and history.", "",
        ])
    (args.output_dir / "comparisons.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    (args.output_dir / "README.md").write_text("\n".join(readme), encoding="utf-8")
    print(f"Wrote seven native comparisons, JSON, and README to {relative(args.output_dir)}.")


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--reference-dir", type=Path, default=ROOT / "docs/reference/approved-ui")
    parser.add_argument("--actual-dir", type=Path, default=ROOT / "docs/screenshots/final-academy/bharat")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "docs/screenshots/final-academy/comparisons")
    parser.add_argument("--notes", type=Path)
    parser.add_argument("--prepare-review", action="store_true")
    args = parser.parse_args()
    for field in ("reference_dir", "actual_dir", "output_dir"):
        path = getattr(args, field)
        setattr(args, field, path if path.is_absolute() else ROOT / path)
    args.notes = args.notes or args.output_dir / "review-notes.json"
    if not args.notes.is_absolute():
        args.notes = ROOT / args.notes
    screens = inputs(args)
    if args.prepare_review:
        prepare_review(args, screens)
    else:
        write_outputs(args, screens, review_notes(args, screens))


if __name__ == "__main__":
    main()
