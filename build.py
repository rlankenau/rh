#!/usr/bin/env python3
"""Build the companion site into docs/ for GitHub Pages.

- site/chapters/<slug>.html are chapter bodies; each is wrapped in the shared shell
  (contents rail, stylesheet, lab library) and written to docs/<slug>/index.html.
- atlas/<name>.html are artifact fragments (no doctype, html, head or body tags, the form
  the Claude artifact publisher takes); each gets a bare document skeleton.
- The landing page is generated from the same table of contents.
"""
import html, pathlib, shutil

ROOT = pathlib.Path(__file__).parent
FONTS = ("https://fonts.googleapis.com/css2?family=STIX+Two+Text:wght@400;600"
         "&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono&display=swap")

# (part title, blurb, [(number, slug or None if not written yet, title)])
BOOK = [
    ("Background", "What both proofs are about. Start here.", [
        ("1", "primes", "Counting primes"),
        ("2", "zeta", "The zeta function"),
        ("3", "waves", "Zeros as waves"),
    ]),
    ("Alpöge with Claude", "A Lean 4 formalization: a one-sided bound on a smoothed prime sum.", [
        ("A", "alpoge", "Map of the whole proof"),
        ("A1", "a1-smoothed-error", "The smoothed error"),
        ("A2", None, "Why a one-sided bound is enough"),
        ("A3", None, "The chain of theta lifts"),
        ("A4", None, "The squeeze"),
    ]),
    ("Masullo", "A 940-page paper: a trace formula that only hears zeros near the line.", [
        ("M", "masullo", "Map of the whole proof"),
        ("M1", "m1-trace-two-ways", "A trace computed two ways"),
        ("M2", None, "One slot per zero"),
        ("M3", None, "The thin strip"),
        ("M4", None, "One circle per prime"),
        ("M5", None, "Reading off the zeros"),
    ]),
]
ATLASES = ("alpoge", "masullo")

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<link rel="stylesheet" href="{fonts}">
<link rel="stylesheet" href="{up}assets/site.css">
</head>
<body>
<div class="shell">
{toc}
<main>
"""
TAIL = """</main>
</div>
<script>if (matchMedia('(max-width: 860px)').matches) document.querySelector('.toc details').open = false;</script>
</body>
</html>
"""
ATLAS_WRAP = """<!doctype html>
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


def toc(up, current):
    parts = []
    for title, _, chapters in BOOK:
        items = []
        for num, slug, name in chapters:
            label = f'<span class="num">{num}</span>{html.escape(name)}'
            if slug is None:
                items.append(f"<li><span>{label}</span></li>")
            else:
                cur = ' aria-current="page"' if slug == current else ""
                items.append(f'<li><a href="{up}{slug}/"{cur}>{label}</a></li>')
        parts.append(f"<div><h2>{html.escape(title)}</h2><ol>{''.join(items)}</ol></div>")
    return (f'<nav class="toc" aria-label="Contents"><a class="brand" href="{up or "./"}">Two Riemann Proofs</a>'
            f'<details open><summary>Contents</summary>{"".join(parts)}</details></nav>')


def pager(slug):
    flat = [(n, s, t) for _, _, ch in BOOK for n, s, t in ch if s and s not in ATLASES]
    i = [s for _, s, _ in flat].index(slug)
    prev = f'<a href="../{flat[i-1][1]}/">← {flat[i-1][0]} {html.escape(flat[i-1][2])}</a>' if i else "<span></span>"
    nxt = (f'<a href="../{flat[i+1][1]}/">{flat[i+1][0]} {html.escape(flat[i+1][2])} →</a>'
           if i + 1 < len(flat) else '<a href="../">Contents →</a>')
    return f'<nav class="pager" aria-label="Chapter">{prev}{nxt}</nav>\n'


def landing():
    books = []
    for title, blurb, chapters in BOOK:
        rows = []
        for num, slug, name in chapters:
            if slug is None:
                rows.append(f'<li class="planned"><span class="num">{num}</span>{html.escape(name)} (planned)</li>')
            else:
                rows.append(f'<li><span class="num">{num}</span><a href="{slug}/">{html.escape(name)}</a></li>')
        books.append(f'<section class="book"><h2>{html.escape(title)}</h2><p>{html.escape(blurb)}</p>'
                     f'<ol>{"".join(rows)}</ol></section>')
    body = (ROOT / "site" / "index.html").read_text().replace("{books}", "\n".join(books))
    return HEAD.format(title="Two Riemann Proofs", fonts=FONTS, up="", toc=toc("", None)) + body + TAIL


def main():
    docs = ROOT / "docs"
    shutil.copytree(ROOT / "site" / "assets", docs / "assets", dirs_exist_ok=True)
    for name in ATLASES:
        (docs / name).mkdir(parents=True, exist_ok=True)
        fragment = (ROOT / "atlas" / f"{name}.html").read_text()
        (docs / name / "index.html").write_text(ATLAS_WRAP.format(fragment=fragment))
    for part, _, chapters in BOOK:
        for num, slug, name in chapters:
            if slug is None or slug in ATLASES:
                continue
            body = (ROOT / "site" / "chapters" / f"{slug}.html").read_text()
            page = (HEAD.format(title=f"{num} {name}", fonts=FONTS, up="../", toc=toc("../", slug))
                    + f'<div class="kicker">{html.escape(part)} · Chapter {num}</div>\n'
                    + '<script src="../assets/lab.js"></script>\n' + body + pager(slug) + TAIL)
            (docs / slug).mkdir(parents=True, exist_ok=True)
            (docs / slug / "index.html").write_text(page)
    (docs / "index.html").write_text(landing())
    (docs / ".nojekyll").touch()


if __name__ == "__main__":
    main()
