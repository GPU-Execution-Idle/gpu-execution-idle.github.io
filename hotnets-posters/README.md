# HotNets 2026 posters: *The Network Should Wake the GPU*

Two coordinated posters built from one content file:

| Route | What it is |
|---|---|
| `/` | **Interactive web poster**, ready to present: a title banner and the three claims with their subquestions (1.1–3.3) on one screen. Opening a question extends an answer card below it with one takeaway and one small interactive figure. |
| `/poster/` | **Paper poster**: three headlines, a closing invitation and a QR code to the web poster. It is built in HTML/CSS for the browser, fullscreen and print. |

Deployed at `https://gpu-execution-idle.github.io/hotnets26-presentation/`. The paper poster is at `…/hotnets26-presentation/poster/`, and a question deep link looks like `…/hotnets26-presentation/#c2-q1`.

This project is separate from the demo (`../hotnets-artifact`), the video (`../hotnets-video`) and the paper.

## Setup

The project uses React 18, TypeScript and Vite 5, run through [Deno](https://deno.com) 2. That is what CI uses, and no Node install is needed. `package.json` is standard, so npm should also work, but it is untested.

```bash
deno install           # dependencies into node_modules/
deno task dev          # http://localhost:5173/hotnets26-presentation/
deno task build        # type-check, then build into dist/ (includes dist/poster/index.html)
deno task preview      # serve dist/ at http://localhost:4173/hotnets26-presentation/
```

## Interactive poster

- **At rest:** the title, an animated contrast (traditional device-local control vs. our system-wide control, redrawn from the demo's proposal step) and the three claims, with no questions showing.
- **Hover or keyboard focus on a claim** reveals its subquestions; on touch screens, tap the headline.
- **Opening a question** widens its claim and shows the answer card right below the question. The other claims dim, and the contrast and other questions fold away. × or Esc, or a click on a dimmed claim, returns to the three claims.
- **One screen:** on laptop and desktop screens (900 px and wider), every state fits without scrolling. This was checked at 1920×1080, 1440×900, 1366×768 and 1280×720. On phones, the claims stack, the questions are always shown, and the page scrolls.
- **Answers:** each card holds a takeaway and, where there is one, a figure with at most one row of buttons.
- **Presenting:** the only control is a small full-screen button at the top right (or press F). Click a question, or use ↑/↓ and Enter. Esc closes the card.
- **Deep links:** `#c1-q1` … `#c3-q3` open that question, and the address bar follows the open question.

## Paper poster: browser, fullscreen, print, PDF

- **Sizes:** `/poster/?size=24x36` (default) or `?size=36x48`, in inches, portrait. The toolbar switches between them. All type is sized relative to the sheet, so the browser preview, fullscreen and print match.
- **Fullscreen:** use the toolbar button. It shows the sheet alone on a dark backdrop.
- **Print / PDF from the browser:** use the toolbar's *Print / PDF*. In the print dialog, keep "Background graphics" on.
- **Print-ready PDFs from the command line:**

  ```bash
  deno task build && deno task pdf   # → pdf/poster-24x36.pdf, pdf/poster-36x48.pdf
  ```

  Each is one page at exactly 24×36 in or 36×48 in, with fonts embedded. Set `CHROME_PATH` if Chrome is not at the default macOS path.

**QR code target:** the code is generated from `WEB_POSTER_URL` in `src/content/config.ts`. To change the target, build with `VITE_POSTER_URL=https://… deno task build`.

## Editing content

- **`src/content/claims.ts`** holds the title, claims, subquestions, takeaways and which figure each answer shows. Both posters read it.
- **`src/content/data.ts`** holds the numbers the figures draw, with a comment on each block saying where they come from.
- **`src/components/Figures.tsx`** has one small SVG figure per question.

**Adding a figure that isn't drawn yet:** set the question's `figure` to `{ placeholder: 'what the figure should show' }`. It then renders a dashed "Figure to be added" card.

## Evidence

Every number comes from measured data, and none are estimated. The cards show no source lines; this table records where each figure's data comes from:

| Question | Figure | Data |
|---|---|---|
| 1.1 | True idle vs. execution-idle power, nine GPUs (toggle) | `hotnets-video/assets/power_measurements.csv` |
| 1.2 | Execution-idle time and ideal savings per workload, with job counts for the cluster (toggle: university cluster / agentic / bursty serving) | Updated characterization table |
| 1.3 | More concurrent agents on one H100: execution-idle, p90 slowdown, p90 KV-cache use (toggle) | Agent-concurrency figure |
| 1.4 | One SWE-bench coding task: inference vs. tool calls (toggle: two tasks) | `src/content/traces.ts`, copied by `deno task traces` from the demo's measured L40S traces |
| 2.1 | Reactive downscaling: power saved vs. p50 latency added (toggle) | Paper Table 2 |
| 2.2 | How early to wake to match Default, as in the demo's early-wake-up step (toggle; the takeaway follows it) | Paper §3 (260 / 320 ms on L40S) |
| 3.1 | Takeaway only | — |
| 3.2 | Energy vs. p95 latency, normalized to Default; hover or tap a point | Paper Fig. 5. Point positions are read from the vector PDF; percentages match the paper text where it states them |
| 3.3 | Takeaway only | — |

The numbers live in `src/content/data.ts`, with a comment on each block.

## Deployment

The repository's GitHub Pages workflow (`.github/workflows/pages.yml`) runs `deno install && deno task build` here. `site/build.py` then copies `dist/` to `/hotnets26-presentation/`, as listed in `../projects.json`. The build writes `dist/poster/index.html`, so a direct link to `/poster/` works on any static host. Question deep links use the URL hash.

To host elsewhere, build with `BASE_PATH=/your/path/` and set `VITE_POSTER_URL` to the new public URL.

## Structure

```text
hotnets-posters/
├── index.html, vite.config.ts, tsconfig.json, package.json, deno.lock
├── scripts/export-pdf.ts     print-ready PDFs of the paper poster
├── scripts/extract-traces.ts copy the SWE-bench agent traces from the demo (deno task traces)
└── src/
    ├── content/claims.ts     claims, questions, takeaways (single source of truth)
    ├── content/data.ts       numbers behind the figures, with sources
    ├── content/traces.ts     SWE-bench tool-call timings (generated)
    ├── content/config.ts     QR target URL
    ├── components/           ClaimCard, Figures, QrCode, PowerTrace
    ├── pages/                WebPoster, PaperPoster
    └── styles/               tokens.css (shared), web.css, paper.css
```
