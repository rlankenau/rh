#!/usr/bin/env python3
"""Wrap the atlas fragments in atlas/ into standalone pages under docs/ for GitHub Pages.

The files in atlas/ are written as fragments (no doctype, html, head or body tags) because
that is the form the Claude artifact publisher takes. This adds the document skeleton.
"""
import pathlib, shutil

ROOT = pathlib.Path(__file__).parent
WRAP = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0">
{fragment}
</body>
</html>
"""

def main():
    docs = ROOT / "docs"
    for name in ("alpoge", "masullo"):
        out = docs / name
        out.mkdir(parents=True, exist_ok=True)
        fragment = (ROOT / "atlas" / f"{name}.html").read_text()
        (out / "index.html").write_text(WRAP.format(fragment=fragment))
    shutil.copy(ROOT / "site" / "index.html", docs / "index.html")
    (docs / ".nojekyll").touch()

if __name__ == "__main__":
    main()
