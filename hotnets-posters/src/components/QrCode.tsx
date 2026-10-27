import qrcode from 'qrcode-generator';

// Crisp, scalable QR code (one SVG path), drawn in the poster's ink color on a white quiet zone.
export function QrCode({ url, className }: { url: string; className?: string }) {
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const n = qr.getModuleCount(), q = 4; // 4-module quiet zone
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + q},${r + q}h1v1h-1z`;
  return (
    <svg className={className} viewBox={`0 0 ${n + 2 * q} ${n + 2 * q}`} shapeRendering="crispEdges" role="img" aria-label={`QR code: ${url}`}>
      <rect width="100%" height="100%" fill="#fff" />
      <path d={d} fill="#15121d" />
    </svg>
  );
}
