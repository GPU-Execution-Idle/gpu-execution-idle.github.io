# HotNets 2026 posters: *The Network Should Wake the GPU*

Two coordinated posters built from one content file:

| Route | What it is |
|---|---|
| `/` | **Interactive web poster**, ready to present: a title banner and the argument's three parts in one column (The Hidden Energy Problem, The Challenge of GPU Power Management, The Case for Network-Aware Control), each a heading over its questions (1.1–3.2). Opening a question extends an answer card below it with a takeaway and, for most, one small interactive figure. |
| `/poster/` | **Paper poster**: three headlines, a closing invitation and a QR code to the web poster. It is built in HTML/CSS for the browser, fullscreen and print. |
| `/poster/full/` | **Full paper poster, 36×48 in**: title band with authors and a QR code to the game, then the three parts as rows, each with its two questions side by side (takeaway and figure). Local only, like `/poster/`. |

Deployed at `https://gpu-execution-idle.github.io/hotnets26-notebook/`; a question deep link looks like `…/hotnets26-notebook/#c2-q1`. The paper poster (`/poster/`) is local only: it is built into `dist/poster/` for previews and `deno task pdf`, but left out of the published site (`"exclude": ["poster"]` in `../projects.json`), and its old address forwards to the notebook.

This project is separate from the demo (`../hotnets-artifact`), the video (`../hotnets-video`) and the paper.

## Setup

The project uses React 18, TypeScript and Vite 5, run through [Deno](https://deno.com) 2. That is what CI uses, and no Node install is needed. `package.json` is standard, so npm should also work, but it is untested.

```bash
deno install           # dependencies into node_modules/
deno task dev          # http://localhost:5173/hotnets26-notebook/
deno task build        # type-check, then build into dist/ (includes dist/poster/index.html)
deno task preview      # serve dist/ at http://localhost:4173/hotnets26-notebook/
```

## Interactive poster

- **At rest:** the title and the three part headings, each on its own foldable card; nothing else. The part headings come from `part` in `claims.ts`; the paper poster still shows the claim headlines (`text`).
- **Unfolding a part** reveals its questions; parts fold and unfold independently. **Opening a question** expands its answer card in place, one at a time. × or Esc closes it; folding a part also closes its open answer. A deep link unfolds the question's part.
- **Type:** answer text and all figures share one size (`--ans` in `web.css`). Every figure's viewBox is 400 wide, so they all draw at one scale (`--fig` = `--ans` / 12.5 px). On phones the figures shrink to the screen width, so their text is smaller there.
- **One screen:** at rest, the page fits laptop and projector screens without scrolling (checked at 1440×900 and 1280×720); an open answer may scroll.
- **Phones:** the same single column; rows and buttons are at least 40 px tall, and the full-screen button is hidden. Checked at 390×844 with no horizontal overflow.
- **Answers:** each card holds a takeaway and, where there is one, a figure with at most one row of buttons.
- **Presenting:** the only control is a small full-screen button at the top right (or press F). Click a question, or use ↑/↓ and Enter. Esc closes the card.
- **Deep links:** `#c1-q1` … `#c3-q2` open that question, and the address bar follows the open question.

## Paper poster: browser, fullscreen, print, PDF

- **Sizes:** `/poster/?size=24x36` (default) or `?size=36x48`, in inches, portrait. The toolbar switches between them. All type is sized relative to the sheet, so the browser preview, fullscreen and print match.
- **Fullscreen:** use the toolbar button. It shows the sheet alone on a dark backdrop.
- **Print / PDF from the browser:** use the toolbar's *Print / PDF*. In the print dialog, keep "Background graphics" on.
- **Print-ready PDFs from the command line:**

  ```bash
  deno task build && deno task pdf   # → pdf/poster-24x36.pdf, pdf/poster-36x48.pdf, pdf/poster-full-36x48.pdf
  ```

  Each is one page at exactly 24×36 in or 36×48 in, with fonts embedded. Set `CHROME_PATH` if Chrome is not at the default macOS path.

**Full poster:** cards in a row share a height, and each question fits on one line. Below the title and section headings there are two type sizes: one for questions, one for everything else, figure labels included (`--q` and `--c` in `full.css`). Its figures are in `src/components/PosterFigures.tsx`: drawn from the same `data.ts`, still (every choice at once, subfigures captioned separately), in greys plus the accent, at one scale so figure text prints at body size. A question's `poster` field in `claims.ts` replaces its takeaway (empty leaves only the figure) or figure on this poster only, and a claim's `posterPart` its heading. 3.1 uses a schematic (`net-signals`, not data) of when GPU-local control, a network observation and a network prediction start waking the GPU. The QR code points to `GAME_URL` in `src/content/config.ts` (`VITE_GAME_URL` overrides it).

**QR code target:** the code is generated from `WEB_POSTER_URL` in `src/content/config.ts`. To change the target, build with `VITE_POSTER_URL=https://… deno task build`.

## Editing content

- **`src/content/claims.ts`** holds the title, claims, subquestions, takeaways and which figure each answer shows. Both posters read it. A blank line (`\n\n`) in a takeaway starts a new paragraph.
- **`src/content/data.ts`** holds the numbers the figures draw, with a comment on each block saying where they come from.
- **`src/components/Figures.tsx`** has one small SVG figure per question.

**Adding a figure that isn't drawn yet:** set the question's `figure` to `{ placeholder: 'what the figure should show' }`. It then renders a dashed "Figure to be added" card.

## Evidence

Every number comes from measured data, and none are estimated. The cards show no source lines; this table records where each figure's data comes from:

| Question | Figure | Data |
|---|---|---|
| 1.1 | True idle vs. execution-idle power, six GPUs (toggle) | `hotnets-video/assets/power_measurements.csv` |
| 1.2 | Execution-idle time and ideal savings per workload, with each workload's GPU (toggle: bursty serving / agentic) | Updated characterization table; the WebArena row (L40S) was supplied by the authors in Nov 2026 |
| 2.1 | Reactive downscaling: power saved vs. p50 latency added (toggle) | Paper Table 2 |
| 2.2 | How early to wake to match Default, as in the demo's early-wake-up step (toggle; the takeaway follows it) | Paper §3 (260 / 320 ms on L40S) |
| 3.1 | Takeaway only | — |
| 3.2 | Energy vs. p95 latency, normalized to Default; hover or tap a point | Paper Fig. 5. Point positions are read from the vector PDF; percentages match the paper text where it states them |

The numbers live in `src/content/data.ts`, with a comment on each block.

## Deployment

The repository's GitHub Pages workflow (`.github/workflows/pages.yml`) runs `deno install && deno task build` here. `site/build.py` then copies `dist/` to `/hotnets26-notebook/`, as listed in `../projects.json`. The build writes `dist/poster/index.html` for local use; the site build drops it (`"exclude"` in `../projects.json`). Question deep links use the URL hash.

To host elsewhere, build with `BASE_PATH=/your/path/` and set `VITE_POSTER_URL` to the new public URL.

## Structure

```text
hotnets-posters/
├── index.html, vite.config.ts, tsconfig.json, package.json, deno.lock
├── scripts/export-pdf.ts     print-ready PDFs of the paper poster
└── src/
    ├── content/claims.ts     claims, questions, takeaways (single source of truth)
    ├── content/data.ts       numbers behind the figures, with sources
    ├── content/config.ts     QR target URL
    ├── components/           ClaimCard (one part), Figures, QrCode, PowerTrace
    ├── pages/                WebPoster, PaperPoster
    └── styles/               tokens.css (shared), web.css, paper.css
```
