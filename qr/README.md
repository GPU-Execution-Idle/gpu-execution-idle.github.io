# QR codes

`hotnets26-notebook.svg` / `.png` → https://gpu-execution-idle.github.io/hotnets26-notebook/

Version 4, error correction M, 4-module quiet zone. Use the SVG for print and slides (it scales
without blurring). The paper poster draws its own QR code to the same URL.

Codes made earlier for /hotnets26-poster/ still work: that path redirects to /hotnets26-notebook/
(see "redirects" in ../projects.json).

To regenerate (e.g. if the URL changes):

```bash
uv run --no-project --with segno==1.6.6 python - <<'PY'
import segno
qr = segno.make("https://gpu-execution-idle.github.io/hotnets26-notebook/", error="m", micro=False)
qr.save("qr/hotnets26-notebook.svg", scale=10, border=4)
qr.save("qr/hotnets26-notebook.png", scale=24, border=4)
PY
```
