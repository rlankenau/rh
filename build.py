#!/usr/bin/env python3
"""Build the companion site into docs/ for GitHub Pages.

- site/chapters/<slug>.html are chapter bodies; each is wrapped in the shared shell
  (contents rail, stylesheet, lab library) and written to docs/<slug>/index.html.
- atlas/<name>.html are artifact fragments (no doctype, html, head or body tags, the form
  the Claude artifact publisher takes); each gets a bare document skeleton.
- The landing page is generated from the same table of contents.
"""
import html, json, pathlib, re, shutil, subprocess

ROOT = pathlib.Path(__file__).parent
FONTS = ("https://fonts.googleapis.com/css2?family=STIX+Two+Text:wght@400;600"
         "&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono&display=swap")

# (part title, blurb, [(number, slug or None if not written yet, title)])
# Parts in reading order. A chapter is (slug, title); slug None means planned, and a slug
# starting with "quiz" is the part's quiz. Chapter numbers run through the whole book and are
# assigned here, so chapter files refer to each other as @@ch:slug@@ and to themselves as @@n@@.
PARTS = [
    ("Part I · Fundamentals", "What both proofs are about. Start here.", [
        ("primes", "Counting primes"),
        ("zeta", "The zeta function"),
        ("complex-zeta", "Complex inputs"),
        ("taylor", "Taylor series"),
        ("analytic", "Analytic functions"),
        ("continuation", "Analytic continuation"),
        ("continuing-zeta", "Continuing zeta"),
        ("zeta-zeros", "The zeros and the Riemann Hypothesis"),
        ("waves", "Zeros as waves"),
        ("quiz-1", "Quiz: Part I"),
    ]),
    ("Part II · Masullo", "A 940-page paper: a trace formula in which only the zeros near the critical line appear.", [
        ("masullo", "Map of the whole proof"),
        ("m1-trace-two-ways", "A trace computed two ways"),
        ("mellin", "The Mellin transform"),
        ("circle-slots", "One slot per mode"),
        ("theta-sums", "Summing over whole numbers"),
        ("m2-one-slot-per-zero", "One slot per zero"),
        ("thin-strip", "The thin strip"),
        ("circle-per-prime", "One circle per prime"),
        ("trace-formula", "The trace formula"),
        ("reading-off-zeros", "Reading off the zeros"),
        ("quiz-2", "Quiz: Part II"),
    ]),
    ("Part III · Alpöge with Claude", "A Lean 4 formalization: a one-sided bound on a smoothed prime sum.", [
        ("alpoge", "Map of the whole proof"),
        ("a1-smoothed-error", "The smoothed error"),
        (None, "Why a one-sided bound is enough"),
        (None, "The chain of theta lifts"),
        (None, "The squeeze"),
        ("quiz-3", "Quiz: Part III"),
    ]),
]


def _number(parts):
    book, n = [], 0
    for label, blurb, chapters in parts:
        rows = []
        for slug, name in chapters:
            if slug and slug.startswith("quiz"):
                rows.append(("", slug, name))
            else:
                n += 1
                rows.append((str(n), slug, name))
        book.append((label, blurb, rows))
    return book


BOOK = _number(PARTS)

# Pages whose content Alice has reviewed. Every other page carries a "needs review" flag in the contents,
# on the landing page and at its own top. The list is site/reviewed.json.
REVIEWED = set(json.loads((ROOT / "site" / "reviewed.json").read_text()))
FLAG = '<span class="rv" title="Needs review: not yet checked by the site\'s owner">needs review</span>'

NUM = {s: n for _, _, ch in BOOK for n, s, _ in ch if s}


MATH = []  # formulas found so far; each is replaced by a placeholder until the page is finished


def hold_math(text):
    """Set aside $$display$$ and \\(inline\\) formulas so nothing else in the build touches them."""
    def keep(display):
        def f(m):
            MATH.append({"tex": html.unescape(m.group(1).strip()), "display": display})
            return f"@@MATH{len(MATH) - 1}@@"
        return f
    text = re.sub(r"\$\$(.+?)\$\$", keep(True), text, flags=re.S)
    return re.sub(r"\\\((.+?)\\\)", keep(False), text, flags=re.S)


def render_math(pages):
    """Render every held formula with KaTeX (one node process) and put the HTML back."""
    if not MATH:
        return pages
    if not (ROOT / "node_modules" / "katex").exists():
        raise SystemExit("KaTeX is missing: run `npm install` in the repository root first.")
    done = json.loads(subprocess.run(["node", str(ROOT / "tools" / "math.js")], input=json.dumps(MATH),
                                     capture_output=True, text=True, check=True).stdout)
    return {path: re.sub(r"@@MATH(\d+)@@", lambda m: done[int(m.group(1))], page) for path, page in pages.items()}


def tokens(text, num=""):
    """Fill in @@n@@ (this chapter's number) and @@ch:slug@@ (another chapter's number)."""
    text = text.replace("@@n@@", num)
    return re.sub(r"@@ch:([a-z0-9-]+)@@", lambda m: NUM[m.group(1)], text)
ATLASES = ("alpoge", "masullo")

HEAD = """<!doctype html>
<html lang="en" data-up="{up}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<link rel="stylesheet" href="{fonts}">
<link rel="stylesheet" href="{up}assets/katex/katex.min.css">
<link rel="stylesheet" href="{up}assets/site.css">
</head>
<body>
<div class="shell">
{toc}
<main>
"""
TAIL = """</main>
</div>
<script src="{up}assets/glossary.js"></script>
<script src="{up}assets/gloss.js"></script>
<script src="{up}assets/quiz.js"></script>
<script src="{up}assets/comments.js"></script>
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
                flag = "" if slug in REVIEWED else '<span class="rvdot" title="Needs review"></span>'
                items.append(f'<li><a href="{up}{slug}/"{cur}>{label}{flag}</a></li>')
        parts.append(f"<div><h2>{html.escape(title)}</h2><ol>{''.join(items)}</ol></div>")
    cur_g = ' aria-current="page"' if current == "glossary" else ""
    cur_s = ' aria-current="page"' if current == "symbols" else ""
    return (f'<nav class="toc" aria-label="Contents"><a class="brand" href="{up or "./"}">Two Riemann Proofs</a>'
            f'<details open><summary>Contents</summary>{"".join(parts)}'
            f'<p class="rvkey"><span class="rvdot"></span> needs review</p>'
            f'<div class="extra"><a href="{up}glossary/"{cur_g}>Glossary</a>'
            f'<a href="{up}symbols/"{cur_s}>Greek letters and symbols</a></div></details></nav>')


def slugify(term):
    return re.sub(r"[^a-z0-9]+", "-", term.lower()).strip("-")


def load_glossary():
    entries = json.loads((ROOT / "site" / "glossary.json").read_text())
    for e in entries:
        e["key"] = slugify(e["term"])
    return entries


# Text inside these elements is never turned into a glossary link.
SKIP = {"script", "pre", "code", "a", "h1", "h2", "h3", "button", "svg", "label", "output", "select", "small", "summary"}
VOID = {"input", "br", "img", "hr", "meta", "link"}


def link_terms(body, glossary):
    """Wrap the first use of each glossary term in a chapter in a pop-up button.

    Matching is case-sensitive on the aliases in glossary.json, longest alias first, and only
    in running text (not headings, code, links, figure titles or scripts).
    """
    aliases = sorted(((a, e["key"]) for e in glossary for a in e.get("match", [e["term"]])), key=lambda x: -len(x[0]))
    used, out, stack = set(), [], []
    for tok in re.split(r"(<script.*?</script>|<[^>]+>)", body, flags=re.S):
        if tok.startswith("<script"):
            out.append(tok)
        elif tok.startswith("<"):
            m = re.match(r"<(/?)([a-zA-Z0-9]+)", tok)
            if m and m.group(2).lower() not in VOID and not tok.endswith("/>"):
                name = m.group(2).lower()
                if m.group(1):
                    while stack and stack.pop() != name:
                        pass
                else:
                    stack.append(name)
            out.append(tok)
        elif SKIP & set(stack) or not tok.strip():
            out.append(tok)
        else:
            pos, piece = 0, []
            while True:
                live = [(a, k) for a, k in aliases if k not in used]
                if not live:
                    break
                rx = re.compile("(?<![A-Za-z])(" + "|".join(re.escape(a) for a, _ in live) + ")(?![A-Za-z])")
                m = rx.search(tok, pos)
                if not m:
                    break
                key = dict(live)[m.group(1)]
                used.add(key)
                piece.append(tok[pos:m.start()])
                piece.append(f'<button type="button" class="g" data-g="{key}" aria-expanded="false">{m.group(1)}</button>')
                pos = m.end()
            piece.append(tok[pos:])
            out.append("".join(piece))
    return "".join(out)


def glossary_page(glossary):
    def rows(items):
        out = []
        for e in sorted(items, key=lambda e: e["term"].lower()):
            wiki = (f' <a href="https://en.wikipedia.org/wiki/{html.escape(e["wiki"])}" target="_blank" rel="noopener">Wikipedia ↗</a>'
                    if e.get("wiki") else "")
            out.append(f'<div id="{e["key"]}"><dt>{html.escape(e["term"])}</dt><dd>{html.escape(e["def"])}{wiki}</dd></div>')
        return "".join(out)
    terms = [e for e in glossary if not e.get("person")]
    people = [e for e in glossary if e.get("person")]
    return ('<div class="kicker">Reference</div>\n<h1>Glossary</h1>\n'
            '<p class="lede">Plain-language meanings for the terms used on this site. In the chapters, any word with a dotted underline opens its entry in a pop-up.</p>\n'
            f'<h2>Terms</h2>\n<dl class="glist">{rows(terms)}</dl>\n<h2>People</h2>\n<dl class="glist">{rows(people)}</dl>\n')


def pager(slug):
    flat = [(n, s, t) for _, _, ch in BOOK for n, s, t in ch if s]
    i = [s for _, s, _ in flat].index(slug)
    prev = f'<a href="../{flat[i-1][1]}/">← {(flat[i-1][0] + " " + html.escape(flat[i-1][2])).strip()}</a>' if i else "<span></span>"
    nxt = (f'<a href="../{flat[i+1][1]}/">{(flat[i+1][0] + " " + html.escape(flat[i+1][2])).strip()} →</a>'
           if i + 1 < len(flat) else '<a href="../">Contents →</a>')
    return f'<nav class="pager" aria-label="Chapter">{prev}{nxt}</nav>\n'


def landing(glossary):
    books = []
    for title, blurb, chapters in BOOK:
        rows = []
        for num, slug, name in chapters:
            if slug is None:
                rows.append(f'<li class="planned"><span class="num">{num}</span>{html.escape(name)} (planned)</li>')
            else:
                rows.append(f'<li><span class="num">{num}</span><a href="{slug}/">{html.escape(name)}</a>{"" if slug in REVIEWED else FLAG}</li>')
        books.append(f'<section class="book"><h2>{html.escape(title)}</h2><p>{html.escape(blurb)}</p>'
                     f'<ol>{"".join(rows)}</ol></section>')
    body = link_terms(hold_math((ROOT / "site" / "index.html").read_text()), glossary).replace("{books}", "\n".join(books))
    return HEAD.format(title="Two Riemann Proofs", fonts=FONTS, up="", toc=toc("", None)) + body + TAIL.format(up="")


def main():
    docs = ROOT / "docs"
    glossary = load_glossary()
    shutil.copytree(ROOT / "site" / "assets", docs / "assets", dirs_exist_ok=True)
    katex = ROOT / "node_modules" / "katex" / "dist"
    if katex.exists():  # the stylesheet and the woff2 fonts it asks for first
        (docs / "assets" / "katex" / "fonts").mkdir(parents=True, exist_ok=True)
        shutil.copy(katex / "katex.min.css", docs / "assets" / "katex")
        for font in (katex / "fonts").glob("*.woff2"):
            shutil.copy(font, docs / "assets" / "katex" / "fonts")
    for name in ATLASES:
        (docs / name).mkdir(parents=True, exist_ok=True)
        fragment = (ROOT / "atlas" / f"{name}.html").read_text()
        # The atlases carry their own styles, so the chapter pager goes in with inline ones.
        # (A div, not a nav: the atlas styles every "nav a" as a sidebar entry.)
        nav = pager(name).replace("</nav>", "</div>").replace('<nav class="pager"', '<div role="navigation" style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;'
                                  'margin-top:2rem;padding-top:1rem;border-top:1px solid var(--rule);font-size:.95rem"')
        assert fragment.count("</main>") == 1, name
        fragment = fragment.replace("</main>", nav + "</main>")
        (docs / name / "index.html").write_text(ATLAS_WRAP.format(fragment=fragment))
    pages = {}
    for part, _, chapters in BOOK:
        for num, slug, name in chapters:
            if slug is None or slug in ATLASES:
                continue
            quiz = slug.startswith("quiz")
            body = hold_math(tokens((ROOT / "site" / "chapters" / f"{slug}.html").read_text(), num))
            held = []  # quizzes are set aside so no glossary button lands inside an answer button
            body = re.sub(r'<ol class="quiz".*?</ol>', lambda m: held.append(m.group(0)) or f"@@QUIZ{len(held) - 1}@@", body, flags=re.S)
            body = re.sub(r"@@QUIZ(\d+)@@", lambda m: held[int(m.group(1))], link_terms(body, glossary))
            page = (HEAD.format(title=name if quiz else f"{num} {name}", fonts=FONTS, up="../", toc=toc("../", slug))
                    + f'<div class="kicker">{html.escape(part.split(" · ")[0])} · {"Quiz" if quiz else "Chapter " + num}{"" if slug in REVIEWED else " " + FLAG}</div>\n'
                    + '<script src="../assets/lab.js"></script>\n' + body + pager(slug) + TAIL.format(up="../"))
            (docs / slug).mkdir(parents=True, exist_ok=True)
            pages[docs / slug / "index.html"] = page
    table = {e["key"]: {k: e[k] for k in ("term", "def", "wiki") if k in e} for e in glossary}
    (docs / "assets" / "glossary.js").write_text("window.GLOSSARY = " + json.dumps(table, ensure_ascii=False) + ";\n")
    (docs / "glossary").mkdir(exist_ok=True)
    (docs / "glossary" / "index.html").write_text(
        HEAD.format(title="Glossary", fonts=FONTS, up="../", toc=toc("../", "glossary")) + glossary_page(glossary) + TAIL.format(up="../"))
    (docs / "symbols").mkdir(exist_ok=True)
    pages[docs / "symbols" / "index.html"] = (
        HEAD.format(title="Greek letters and symbols", fonts=FONTS, up="../", toc=toc("../", "symbols"))
        + hold_math(tokens((ROOT / "site" / "symbols.html").read_text())) + TAIL.format(up="../"))
    pages[docs / "index.html"] = landing(glossary)
    for path, page in render_math(pages).items():
        path.write_text(page)
    (docs / ".nojekyll").touch()


if __name__ == "__main__":
    main()
