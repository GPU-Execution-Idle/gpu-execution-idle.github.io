"""Assemble the GitHub Pages site from projects.json.

    python3 site/build.py            # writes _site/
    python3 -m http.server -d _site  # preview at http://localhost:8000/

Each project in projects.json is published at /<path>/ by copying its `source` folder.
A project with "status" and no source is listed on the landing page but not built yet.
The landing page (/) and the 404 page are generated from the templates next to this file.
"""
import html
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HERE = Path(__file__).resolve().parent
OUT = ROOT / "_site"


def main():
    cfg = json.loads((ROOT / "projects.json").read_text())
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    built, cards = [], []
    for p in cfg["projects"]:
        path = p["path"].strip("/")
        assert path and "/" not in path, f"project path must be one segment: {path!r}"
        ready = bool(p.get("source"))
        if ready:
            src = ROOT / p["source"]
            assert (src / "index.html").exists(), f"{p['source']} has no index.html"
            shutil.copytree(src, OUT / path, ignore=shutil.ignore_patterns(".DS_Store", "404.html"))
            built.append(path)
        tag = "a" if ready else "div"
        href = f' href="{path}/"' if ready else ""
        status = f'<span class="status">{html.escape(p["status"])}</span>' if p.get("status") else ""
        cards.append(f'<{tag} class="card"{href}><h2>{html.escape(p["title"])}{status}</h2>'
                     f'<p>{html.escape(p.get("description", ""))}</p></{tag}>')
    fill = {"{{title}}": html.escape(cfg["site"]["title"]), "{{tagline}}": html.escape(cfg["site"]["tagline"]),
            "{{projects}}": "\n      ".join(cards), "{{project_paths}}": json.dumps(built)}
    for name in ("index.html", "404.html"):
        text = (HERE / name).read_text()
        for k, v in fill.items():
            text = text.replace(k, v)
        (OUT / name).write_text(text)
    (OUT / ".nojekyll").write_text("")  # serve files as-is (no Jekyll processing)
    if (ROOT / "CNAME").exists():
        shutil.copy(ROOT / "CNAME", OUT / "CNAME")  # optional custom domain
    print(f"built {OUT.relative_to(ROOT)}/ with: /, " + ", ".join(f"/{b}/" for b in built))


if __name__ == "__main__":
    main()
