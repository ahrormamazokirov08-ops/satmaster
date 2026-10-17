# SATMaster Question Bank Invariants & Quality Standards

When inspecting, generating, modifying, or testing Digital SAT questions (Math and Reading & Writing) in this workspace, strictly uphold the following 10 invariants:

## 1. Visual Elements Invariant (SVGs & Tables Over Text Descriptions)
- Never allow screen-reader accessibility descriptions ("The figure presents a bar graph...", "The figure presents a scatterplot...", "The figure presents right triangle...", "The figure presents 2 parallel lines...") to stand in for visual figures.
- When a figure description is detected:
  1. Generate an authentic, pixel-perfect, responsive vector SVG matching College Board Bluebook styling (clean axes, ticks, labels, title, `#475569` bars, `#0f172a` axes).
  2. Wrap the SVG inside `<div class="qb-figure-wrapper my-4 flex justify-center overflow-x-auto w-full"><svg class="max-w-full h-auto mx-auto block" ... viewBox="...">`.
  3. Strip the descriptive alt-text from the prompt, leaving only the authentic question statement.
- Wrap all HTML data tables in `<div class="qb-table-wrapper my-4 overflow-x-auto">`.

## 2. Shell & Bash Expansion Protection
- Never pass LaTeX equations or JSON text through double-quoted shell commands (`bash -c "..."` or inline string interpolation). Bash will expand `$0` to `/bin/zsh` and evaluate `$p`, `$150`, `$300` as empty variables, corrupting questions to "terms of 0" or stripping math variables.
- Always perform dataset reading, manipulation, and writing using dedicated Python scripts with `json.load()` and `json.dump(..., ensure_ascii=False, indent=2)`.

## 3. Currency KaTeX Protection
- Never leave bare currency symbols (`$150.00`, `$2.50`, `$3`, `$950`) unescaped in prompts, options, or rationales, as they collide with KaTeX inline math delimiters and cause runaway math parsing.
- Always format currency as `\$150.00` or `$\\$150.00$` or wrap it in `<span class="no-math">$150.00</span>`.

## 4. Baseline Ordinal Notation
- Never format ordinals using superscript exponents (e.g., $n^{\text{th}}$, $1^{\text{st}}$, $2^{\text{nd}}$, $3^{\text{rd}}$).
- Always use baseline LaTeX math: `$n\text{th}$`, `$1\text{st}$`, `$2\text{nd}$`, `$3\text{rd}$`.

## 5. Coordinate Pair Formatting
- Coordinate points in prompts and rationales must always contain a comma between coordinates: `(x, y)` and `\left(x, y\right)`. Never leave coordinates without commas (e.g., `(0 y)` or `\left(0 y\right)`).

## 6. Zero Screen-Reader Spoken Math Tokens
- Never leave TTS speech tokens in equations: `end fraction`, `with numerator`, `StartFraction`, `end root`, `StartRoot`, `EndRoot`, `RootIndex`, `Superscript`, `Baseline`.
- Convert all fractions to standard `\frac{a}{b}`, radicals to `\sqrt{x}`, and exponents to `x^n`.

## 7. Strict Schema Compliance
- **Student-Produced Response (SPR)**:
  - `"options": null`
  - `"is_spr": true`
  - `"type": "spr"`
  - `"correct"` must match `"correct_answer"`
- **Multiple Choice (MCQ)**:
  - `"options": {"A": "...", "B": "...", "C": "...", "D": "..."}` (dictionary, never a list)
  - All 4 options non-empty, unique strings
  - `"is_spr": false`
  - `"type": "mcq"`
  - `"correct"` in `["A", "B", "C", "D"]` matching `"correct_answer"`
- In Math questions, `"passage": ""` must always be an empty string (equations and context belong in `"prompt"`).

## 8. Dynamic Dataset Counts & Cache Invalidation
- Never hardcode question counts (e.g. `1,925 questions` or `3,770 questions`) in frontend JavaScript or HTML templates. Always compute counts dynamically from loaded arrays.
- Always bump `dataVersion` (in `index.html`, `public/index.html`, `public/qb_engine.js`, and `test_math_assets_integrity.py`) whenever questions are added or repaired, to immediately invalidate browser and CDN caches.

## 9. 100% Byte-for-Byte Mirror Parity
- Every modification to `data/questions/math.json` or `data/questions/reading_writing.json` must be mirrored synchronously to `public/data/questions/math.json` and `public/data/questions/reading_writing.json`.
- Both files must share identical SHA-256 hashes.

## 10. First-Principles Mathematical Verification
- Solve every question from first principles.
- Verify that the prompt contains sufficient conditions for a unique solution.
- Verify that the intermediate steps in `rationale` are algebraically sound and conclude with the exact correct choice.
