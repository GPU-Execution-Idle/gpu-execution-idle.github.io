# QR codes

`hotnets26-poster.svg` / `.png` → https://gpu-execution-idle.github.io/hotnets26-poster/

Version 4, error correction M, 4-module quiet zone. Use the SVG for print and slides (it scales
without blurring). The paper poster draws its own QR code to the same URL.

The demo video's last frame still shows the older code for /hotnets26-presentation/; that path now
falls through to the site's start page, which links to the poster.

To regenerate (e.g. if the URL changes):

```bash
uv run --no-project --with segno==1.6.6 python - <<'PY'
import segno
qr = segno.make("https://gpu-execution-idle.github.io/hotnets26-poster/", error="m", micro=False)
qr.save("qr/hotnets26-poster.svg", scale=10, border=4)
qr.save("qr/hotnets26-poster.png", scale=24, border=4)
PY
```
