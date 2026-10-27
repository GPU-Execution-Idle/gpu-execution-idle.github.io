// The contrast from the interactive demo's proposal step, redrawn for the poster's light theme:
// today's device-local control loop vs. our system-wide loop, where network, application and host
// signals wake the GPU before work arrives. Illustration only.
const chip = (cx: number, cy: number, size: number, cls: string) => {
  const half = size / 2, pins = [];
  for (let k = 0; k < 5; k++) {
    const o = -half + (size / 6) * (k + 1);
    pins.push(`M${cx + o},${cy - half} v-6 M${cx + o},${cy + half} v6 M${cx - half},${cy + o} h-6 M${cx + half},${cy + o} h6`);
  }
  return `<path class="chip-pins" d="${pins.join(' ')}"/>`
    + `<rect class="${cls}" x="${cx - half}" y="${cy - half}" width="${size}" height="${size}" rx="6"/>`
    + `<text class="chip-label" x="${cx}" y="${cy + 5}" text-anchor="middle">GPU</text>`;
};
// A loop: a circle with a small gap at the top and an arrowhead closing it.
const loop = (cx: number, cy: number, r: number, cls: string) => {
  const a0 = -Math.PI / 2 + 0.28, a1 = -Math.PI / 2 - 0.28 + 2 * Math.PI;
  const p = (a: number) => `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  const [ex, ey] = p(a1).split(',').map(Number);
  return `<g class="${cls}" style="transform-origin:${cx}px ${cy}px"><path class="loop-arc" d="M${p(a0)} A${r},${r} 0 1 1 ${p(a1)}"/>`
    + `<path class="loop-head" d="M${ex - 9},${ey - 7} L${ex + 3},${ey} L${ex - 9},${ey + 7} Z"/></g>`;
};
const ICONS: Record<string, (x: number, y: number) => string> = {
  network: (x, y) => `<circle cx="${x}" cy="${y}" r="11"/><ellipse cx="${x}" cy="${y}" rx="5" ry="11"/><path d="M${x - 11},${y} h22"/>`,
  app: (x, y) => `<rect x="${x - 9}" y="${y - 12}" width="18" height="24" rx="2"/><path d="M${x - 5},${y - 5} h10 M${x - 5},${y} h10 M${x - 5},${y + 5} h7"/>`,
  host: (x, y) => `<rect x="${x - 12}" y="${y - 9}" width="24" height="15" rx="2"/><rect x="${x - 6}" y="${y - 5}" width="9" height="6"/><path d="M${x - 10},${y + 9} h20"/>`,
};
const SOURCES: [string, string, number][] = [['network', 'Network', 58], ['app', 'Application', 116], ['host', 'Host / PCIe', 174]];

// Same geometry as the system-wide panel, so the two read as a pair.
const LOCAL = `<svg viewBox="92 0 308 240" role="img" aria-label="Traditional device-local control: the GPU's power controller sees only the GPU itself, so it wakes after work arrives.">
  ${loop(196, 116, 92, 'loop local')}
  ${chip(196, 116, 56, 'chip')}
  <g class="late">
    <path class="late-mark" d="M311,92 l10,10 M321,92 l-10,10"/>
    <text class="late-text" x="306" y="122">wakes after</text>
    <text class="late-text" x="306" y="138">work arrives</text>
  </g>
  <text class="loop-caption" x="196" y="236" text-anchor="middle">Traditional: device-local control</text>
</svg>`;

// Each cycle: the GPU waits dim; packets travel from the network, application and host; the GPU
// wakes (bright) and is ready before work arrives; then it all resets. Timing lives in web.css.
const SIGNAL_END = (y: number) => [200, 116 + (y - 116) * 0.25] as const;
const SYSTEM = `<svg viewBox="0 0 400 240" role="img" aria-label="Our proposal, system-wide control: network, application and host signals wake the GPU, so it is ready before work arrives.">
  ${loop(196, 116, 92, 'loop system')}
  ${SOURCES.map(([k, label, y], i) => {
    const [ex, ey] = SIGNAL_END(y);
    return `<text class="src-label" x="78" y="${y + 4}" text-anchor="end">${label}</text>
    <rect class="src-box" x="86" y="${y - 17}" width="34" height="34" rx="7"/><g class="src-icon">${ICONS[k](103, y)}</g>
    <path class="signal" d="M124,${y} L${ex},${ey}"/>
    <circle class="packet p${i}" r="4.5" style="offset-path: path('M124,${y} L${ex},${ey}')"/>`;
  }).join('')}
  <rect class="gpu-glow" x="194" y="78" width="76" height="76" rx="16"/>
  ${chip(232, 116, 56, 'chip sys-chip')}
  <rect class="wake-badge" x="172" y="10" width="104" height="24" rx="6"/>
  <text class="wake-text" x="224" y="27" text-anchor="middle">wake up now!</text>
  <g class="ready">
    <path class="ready-tick" d="M310,96 l5,5 l9,-10"/>
    <text class="ready-text" x="310" y="122">ready before</text>
    <text class="ready-text" x="310" y="138">work arrives</text>
  </g>
  <text class="loop-caption strong" x="196" y="236" text-anchor="middle">Our proposal: system-wide control</text>
</svg>`;

export function ControlLoops() {
  return (
    <div className="loops">
      <figure className="loop-panel local-panel" dangerouslySetInnerHTML={{ __html: LOCAL }} />
      <span className="loops-vs" aria-hidden="true">→</span>
      <figure className="loop-panel" dangerouslySetInnerHTML={{ __html: SYSTEM }} />
    </div>
  );
}
