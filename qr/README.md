# QR codes

`hotnets26-presentation.svg` / `.png` → https://gpu-execution-idle.github.io/hotnets26-presentation/

Version 4, error correction M, 4-module quiet zone. Use the SVG for print and slides (it scales
without blurring); the PNG is 984 px wide. The same code appears on the last frame of the demo video.

To regenerate (e.g. if the URL changes):

```bash
uv run --no-project --with segno==1.6.6 python - <<'PY'
import segno
qr = segno.make("https://gpu-execution-idle.github.io/hotnets26-presentation/", error="m", micro=False)
qr.save("qr/hotnets26-presentation.svg", scale=10, border=4)
qr.save("qr/hotnets26-presentation.png", scale=24, border=4)
PY
```
