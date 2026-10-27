// Responsive SVG timelines. Rows stack vertically with their label above the track,
// so the full width of a phone screen is used for time.
import { esc, fmtS } from './dom.js';

const W = 340, PAD = 8, TRACK_H = 20, ROW_H = 44;

const DEFS = `<defs>
  <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="6" height="6" fill="var(--c-rec)" opacity=".25"/><line x1="0" y1="0" x2="0" y2="6" class="hatchline"/></pattern>
  <pattern id="unknown" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
    <line x1="0" y1="0" x2="0" y2="8" class="unknownline"/></pattern>
</defs>`;

function niceStep(max) {
  const raw = max / 5;
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw);
}

/**
 * rows: [{ label, segments: [{ t0, t1, cls, text? }], dots?: [t], marks?: [{ t, cls, label }] }]
 * markers: full-height lines [{ t, cls, label }]; latency: { t0, t1 } shaded red span.
 */
export function timelineSvg({ maxS, rows, markers = [], latency = null, ariaLabel = 'Timeline' }) {
  const x = (t) => PAD + (Math.max(0, Math.min(t, maxS)) / maxS) * (W - 2 * PAD);
  const H = rows.length * ROW_H + 30;
  const parts = [DEFS];
  rows.forEach((row, i) => {
    const y = i * ROW_H + 14;
    parts.push(`<text class="lab" x="${PAD}" y="${y - 3}">${esc(row.label)}</text>`);
    parts.push(`<line class="axis" x1="${PAD}" x2="${W - PAD}" y1="${y + TRACK_H / 2}" y2="${y + TRACK_H / 2}"/>`);
    for (const s of row.segments ?? []) {
      if (s.t1 <= s.t0) continue;
      const w = Math.max(1.5, x(s.t1) - x(s.t0));
      parts.push(`<rect class="${s.cls}" x="${x(s.t0)}" y="${y}" width="${w}" height="${TRACK_H}" rx="3"/>`);
      if (s.text && w > s.text.length * 7 + 8) {
        parts.push(`<text x="${x(s.t0) + 4}" y="${y + 14}" style="fill:#fff;font-weight:600">${esc(s.text)}</text>`);
      }
    }
    for (const t of row.dots ?? []) parts.push(`<circle class="dot" cx="${x(t)}" cy="${y + TRACK_H / 2}" r="4" opacity=".75"/>`);
    for (const m of row.marks ?? []) {
      parts.push(`<line class="mk ${m.cls}" x1="${x(m.t)}" x2="${x(m.t)}" y1="${y - 2}" y2="${y + TRACK_H + 2}"/>`);
    }
  });
  const bottom = rows.length * ROW_H + 4;
  if (latency && latency.t1 - latency.t0 > 1e-6) {
    parts.push(`<rect class="lat" x="${x(latency.t0)}" y="4" width="${x(latency.t1) - x(latency.t0)}" height="${bottom - 4}"/>`);
  }
  for (const m of markers) {
    parts.push(`<line class="mk ${m.cls}" x1="${x(m.t)}" x2="${x(m.t)}" y1="4" y2="${bottom}"/>`);
  }
  // Axis.
  const step = niceStep(maxS);
  parts.push(`<line class="axis" x1="${PAD}" x2="${W - PAD}" y1="${bottom + 2}" y2="${bottom + 2}"/>`);
  for (let t = 0; t <= maxS + 1e-9; t += step) {
    parts.push(`<text class="lab" x="${x(t)}" y="${bottom + 16}" text-anchor="middle">${+t.toFixed(2)}s</text>`);
  }
  return `<svg class="tl" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(ariaLabel)}">${parts.join('')}</svg>`;
}

// Legend chips for the classes used in a timeline.
const LEGEND = {
  ready: ['var(--c-ready)', 'Ready (exec-idle)'], sm: ['var(--c-sm)', 'SM downscaled'],
  smMem: ['var(--c-smMem)', 'SM + memory downscaled'], rec: ['var(--c-rec)', 'Waking up'],
  infer: ['var(--c-infer)', 'Inference'], tool: ['var(--c-tool)', 'Tool call'], net: ['var(--c-net)', 'Network traffic'],
  lat: ['var(--bad)', 'Added latency'], pred: ['var(--muted)', 'Predicted end (dashed)'],
  alarm: ['var(--c-rec)', 'Wake alarm'], end: ['var(--text)', 'Tool finished'],
};
export function legendHtml(keys) {
  return `<div class="legend">${keys.map((k) => `<span><i style="background:${LEGEND[k][0]}"></i>${LEGEND[k][1]}</span>`).join('')}</div>`;
}

// Timeline of one tool-call situation, before (plan) or after (outcome) the reveal.
export function situationSvg({ scenario, state, plan, outcome, history = true }) {
  const hMax = Math.max(...scenario.history);
  let maxS;
  if (outcome) maxS = Math.max(outcome.inferenceStartS + Math.min(scenario.nextInferenceS, 0.6 * outcome.inferenceStartS + 0.3), hMax * 1.05);
  else maxS = Math.max(hMax * 1.1, (plan?.predictedS ?? 0) * 1.2, 0.5);
  const rows = [];
  if (history) {
    rows.push({ label: `Past ${scenario.tool} calls (${scenario.history.length})`, dots: scenario.history,
      marks: plan?.predictedS != null ? [{ t: plan.predictedS, cls: 'pred' }] : [] });
  }
  const markers = [];
  if (!outcome) {
    rows.push({ label: 'Tool call (end unknown)', segments: [{ t0: 0, t1: maxS, cls: 'unknown' }] });
    const gpu = [];
    if (state === 'ready') gpu.push({ t0: 0, t1: maxS, cls: 'ready' });
    else if (plan?.alarmS != null) {
      gpu.push({ t0: 0, t1: plan.alarmS, cls: state }, { t0: plan.alarmS, t1: plan.alarmS + plan.recoveryS, cls: 'rec' },
        { t0: plan.alarmS + plan.recoveryS, t1: maxS, cls: 'ready' });
      markers.push({ t: plan.alarmS, cls: 'alarm' });
    } else gpu.push({ t0: 0, t1: maxS, cls: state });
    rows.push({ label: 'GPU plan (wakes at tool end unless an alarm fires first)', segments: gpu });
    if (plan?.predictedS != null) markers.push({ t: plan.predictedS, cls: 'pred' });
    return timelineSvg({ maxS, rows, markers, ariaLabel: 'Planned GPU schedule; tool end not yet known' });
  }
  const o = outcome;
  rows.push({ label: `Tool call: ${fmtS(o.toolEndS)}`, segments: [{ t0: 0, t1: o.toolEndS, cls: 'tool', text: scenario.tool }] });
  rows.push({ label: 'GPU', segments: [
    { t0: 0, t1: o.wakeS, cls: state }, { t0: o.wakeS, t1: o.readyS, cls: 'rec' },
    { t0: o.readyS, t1: o.inferenceStartS, cls: 'ready' },
    { t0: o.inferenceStartS, t1: o.inferenceStartS + scenario.nextInferenceS, cls: 'infer', text: 'inference' },
  ] });
  markers.push({ t: o.toolEndS, cls: 'end' });
  if (o.alarmS != null) markers.push({ t: o.alarmS, cls: 'alarm' });
  if (o.predictedS != null) markers.push({ t: o.predictedS, cls: 'pred' });
  return timelineSvg({ maxS, rows, markers, latency: { t0: o.toolEndS, t1: o.inferenceStartS },
    ariaLabel: `Tool finished at ${fmtS(o.toolEndS)}; inference started ${fmtS(o.addedLatencyS)} later` });
}
