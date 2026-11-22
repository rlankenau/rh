# rh

Reader's notes on the two claimed proofs of the generalized Riemann Hypothesis released on
2026-11-20. Neither has been verified; nothing here says either is correct.

- **Alpöge with Claude**: a Lean 4 formalization, mirrored at
  [Deicyde/riemann-hypothesis](https://github.com/Deicyde/riemann-hypothesis).
- **Masullo, "The Music of the Primes"**: a 940-page paper, announced on
  [Ravi Vakil's blog](https://math216.wordpress.com/2026/11/20/hurried-announcement-alessandro-masullo-grh/).

## Read them

- Alpöge atlas: https://claude.ai/artifact/EXZ48NEk5WTGjSKZecH5kE
- Masullo atlas: https://claude.ai/artifact/3pviwieZgDKQsfZ3gVGHxg
- GitHub Pages build of both: https://rlankenau.github.io/rh/

## Layout

| Path | What |
|---|---|
| `atlas/alpoge.html`, `atlas/masullo.html` | The two atlases, as HTML fragments (the form the Claude artifact publisher takes). |
| `site/index.html` | Landing page. |
| `build.py` | Wraps the fragments into standalone pages under `docs/`, which GitHub Pages serves. |
| `notes/masullo-gaps.md` | Unfinished parts of Masullo's paper found by text scan. |
| `tools/pdftext.swift` | Extracts text from a PDF with macOS PDFKit. |
| `tools/gapscan.py` | Produces the gap notes from the extracted text. |
| `lean/` | Small Lean 4 statements and proofs of pieces of the arguments (Lean 4.29.0, Mathlib v4.29.0). |

The papers themselves are not stored here.

## Updating

```sh
python3 build.py && git add -A && git commit -m "..." && git push   # Pages serves docs/ on main
cd lean && lake exe cache get && lake build                          # Lean
```

## Companion site

https://rlankenau.github.io/rh/ is laid out like a textbook companion: shared background chapters,
then one chapter per step of each proof, each with interactive labs computed in the browser.

- `site/chapters/<slug>.html` — chapter bodies; add a chapter by writing one and listing it in `PARTS` in `build.py` (Part I fundamentals, Part II Masullo, Part III Alpöge). Chapter numbers are assigned by the build: write `@@n@@` for the chapter's own number and `@@ch:slug@@` for another chapter's. Each chapter ends with a `<div class="ex">` of exercises with solutions in `<details>`; each chapter also has a three-question `<ol class="quiz">` ("Check your understanding": why/what-if questions, not recall), and each part ends with a `quiz-N.html` (`<ol class="quiz">`, see `site/assets/quiz.js`)
- `site/assets/lab.js` — shared numerics (primes, ψ, li, ζ, zeros) and the plot/slider helpers
- `site/assets/site.css` — shared styles
- `python3 build.py` writes everything to `docs/`, which GitHub Pages serves
- Formulas: write `$$…$$` (display) or `\(…\)` (inline) LaTeX in a chapter; `build.py` renders them to static HTML with KaTeX at build time (run `npm install` once; no JavaScript is shipped for math). Short inline symbols stay as plain HTML italics
- Review mode: `python3 tools/review-server.py` serves the site at http://127.0.0.1:8770/. There, a comment typed on a page is filed straight to GitHub with `gh` (label `site-comment`, title `[slug] …`), and each page has a "Mark as reviewed" button that edits `site/reviewed.json` and rebuilds (commit and push afterwards). On the public site the same comment box opens GitHub's new-issue page instead
- `site/glossary.json` — plain-language glossary (terms and people, with Wikipedia links); `build.py` links the first use of each term per chapter as a pop-up and writes the Glossary page
