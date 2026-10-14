"""Compose supplied-reference/browser evidence only; never application artwork.

Usage:
    python scripts/home-ui-comparisons.py --actual path/to/1536-capture.png

The source and actual images are preserved at their native, matching 1536 px
width. Longer browser captures remain visible rather than being silently
cropped or stretched to conceal a layout difference.
"""

from argparse import ArgumentParser
from hashlib import sha256
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def main():
    root = Path(__file__).resolve().parents[1]
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--actual", type=Path, required=True)
    parser.add_argument(
        "--output", type=Path,
        default=root / "docs/screenshots/home-ui/reference-versus-actual-1536.png",
    )
    args = parser.parse_args()
    actual_path = args.actual if args.actual.is_absolute() else root / args.actual
    reference_path = root / "docs/reference/approved-ui/home-screen.png"
    reference = Image.open(reference_path).convert("RGB")
    actual = Image.open(actual_path).convert("RGB")
    if reference.size != (1536, 1024):
        raise ValueError(f"Unexpected supplied reference size: {reference.size}")
    if actual.width != reference.width:
        raise ValueError(
            "Use an actual 1536 px browser capture for the comparable desktop "
            f"comparison; received {actual.size}. No resampling was performed."
        )

    gap, top = 24, 70
    canvas = Image.new(
        "RGB", (reference.width + actual.width + gap * 3,
                max(reference.height, actual.height) + top + gap),
        "#edf2f6",
    )
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.truetype(str(root / "public/fonts/NotoSans-Bold.ttf"), 26)
    draw.text((gap, 18), "APPROVED REFERENCE", font=font, fill="#0b2939")
    draw.text((reference.width + gap * 2, 18),
              "ACTUAL BROWSER IMPLEMENTATION", font=font, fill="#0b2939")
    canvas.paste(reference, (gap, top))
    canvas.paste(actual, (reference.width + gap * 2, top))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(args.output)

    metadata = {
        "purpose": "Review evidence only. Not used by the product UI.",
        "reference": str(reference_path.relative_to(root)).replace("\\", "/"),
        "reference_pixels": list(reference.size),
        "reference_sha256": sha256(reference_path.read_bytes()).hexdigest(),
        "actual": str(actual_path.relative_to(root)).replace("\\", "/"),
        "actual_pixels": list(actual.size),
        "actual_sha256": sha256(actual_path.read_bytes()).hexdigest(),
        "comparison": str(args.output.relative_to(root)).replace("\\", "/"),
        "processing": "Native pixel dimensions; no source/screenshot crop or resampling.",
        "review_status": "Requires human visual review; no similarity score or approval inferred.",
    }
    manifest_path = args.output.with_suffix(".json")
    manifest_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
