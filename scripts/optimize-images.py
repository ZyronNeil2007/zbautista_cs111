#!/usr/bin/env python3
"""Write resized WebP copies of large images next to the originals.

Originals are never modified or deleted, and no HTML/JS is changed. Review the
report, then point the markup at the .webp files you want to use.

Usage (from the repository root):
    pip install pillow
    python scripts/optimize-images.py              # dry run: report only
    python scripts/optimize-images.py --write      # create the .webp copies
    python scripts/optimize-images.py --write --max 1600 --quality 80
"""
import argparse
import os
import sys

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow is required: pip install pillow")

SKIP_DIRS = {"icons"}          # logos and UI icons stay as they are
EXTS = {".jpg", ".jpeg", ".png"}


def human(n):
    for unit in ("B", "KB", "MB"):
        if n < 1024 or unit == "MB":
            return "%.1f %s" % (n, unit) if unit != "B" else "%d B" % n
        n /= 1024.0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", default="img", help="folder to scan (default: img)")
    ap.add_argument("--max", type=int, default=1600, help="longest side in pixels (default: 1600)")
    ap.add_argument("--quality", type=int, default=80, help="WebP quality (default: 80)")
    ap.add_argument("--min-kb", type=int, default=300, help="ignore files smaller than this (default: 300)")
    ap.add_argument("--write", action="store_true", help="actually write the .webp files")
    args = ap.parse_args()

    total_before = total_after = 0
    for folder, dirs, files in os.walk(args.root):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for name in sorted(files):
            base, ext = os.path.splitext(name)
            path = os.path.join(folder, name)
            if ext.lower() not in EXTS or os.path.getsize(path) < args.min_kb * 1024:
                continue
            out = os.path.join(folder, base + ".webp")
            before = os.path.getsize(path)
            try:
                with Image.open(path) as im:
                    im = ImageOps.exif_transpose(im)
                    im.thumbnail((args.max, args.max))
                    if args.write:
                        im.save(out, "WEBP", quality=args.quality, method=6)
                        after = os.path.getsize(out)
                    else:
                        after = None
            except Exception as exc:  # unreadable file: report and keep going
                print("skip  %s (%s)" % (path, exc))
                continue
            if after is None:
                print("would convert  %-70s %9s" % (path, human(before)))
            else:
                total_before += before
                total_after += after
                print("%-70s %9s -> %9s" % (path, human(before), human(after)))

    if args.write and total_before:
        saved = 100.0 * (1 - float(total_after) / total_before)
        print("\nTotal: %s -> %s (%.0f%% smaller)" % (human(total_before), human(total_after), saved))
    elif not args.write:
        print("\nDry run only. Re-run with --write to create the files.")


if __name__ == "__main__":
    main()
