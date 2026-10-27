# GPU Execution-Idle

Source for **https://gpu-execution-idle.github.io**: talks, demos and data about GPU power
while AI agents wait. One repository holds every project; GitHub Pages serves each one at its
own path.

| URL | Content | Source |
|---|---|---|
| `/` | Landing page (generated) | `site/` + `projects.json` |
| `/hotnets26-presentation/` | Interactive demo for the HotNets 2026 paper | `hotnets-artifact/web/` |
| `/hotnets26-demo-video/` | Two-minute demo video | `hotnets26-demo-video/` |
| `/datasets/` | Measurement data (coming soon) | — |

```
projects.json          ← registry: URL path → source folder (one entry per project)
site/build.py          ← assembles _site/ from projects.json; landing + 404 templates next to it
.github/workflows/     ← tests, builds and deploys on every push to main
hotnets-artifact/      ← interactive demo (see its README)
hotnets26-demo-video/  ← the published video page, MP4 and poster
```

## Preview locally

```bash
python3 site/build.py && python3 -m http.server -d _site 8000
# http://localhost:8000/  ·  /hotnets26-presentation/  ·  /hotnets26-demo-video/
```

## Deploy (once)

1. Create the GitHub organization **GPU-Execution-Idle** (its sites live at `gpu-execution-idle.github.io`).
2. Create the repository **`gpu-execution-idle.github.io`** in it (this exact name serves the site root)
   and push this folder to its `main` branch.
3. **Settings → Pages → Source: GitHub Actions.** Every push to `main` then tests, builds and deploys.

Optional custom domain: add a `CNAME` file with the domain at the repo root (the build copies
it) and point the domain's DNS at GitHub Pages. Paths stay the same.

## Add a project

1. Put it in its own folder with a static `index.html` that uses **relative** links
   (it will be served under `/<path>/`).
2. Add an entry to `projects.json`: `path`, `title`, `description`, `source` (the folder to publish).
   An entry with `"status"` and no `source` is listed on the landing page as upcoming.
3. Push. The landing page and 404 redirects update automatically.

## Updating the video

The video's source project (`hotnets-video/`, Manim) is kept out of this repository. After a new
render, run `hotnets-video/scripts/publish.sh` locally: it copies the final MP4 and a poster frame
into `hotnets26-demo-video/`. Commit those two files and push.

## Releasing the dataset

GitHub Pages limits files to 100 MB and sites to about 1 GB, so keep data files out of git:
attach archives to a **GitHub Release** (up to 2 GB per file) or deposit them on **Zenodo** for a
DOI, then give `/datasets/` a small page (e.g. `datasets/index.html` with a README, schema and
download links), set its `source` in `projects.json`, and remove `"status"`.

## What is not in git

See `.gitignore`: the raw traces (`hotnets-artifact/trace/`, ~10 GB), the video's source project
(`hotnets-video/`) and personal notes. Only the website and the finished video are published.
