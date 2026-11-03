import { DATA } from './data.js';
import { JumpGame } from './jump-model.js';

const $ = id => document.getElementById(id);
const game = new JumpGame(DATA);

// One palette and one type scale for the whole figure (mirrors the CSS variables in game.css).
const C = {
  ink: '#2b2e2a', muted: '#6b7068', grid: '#e3e4dc', axis: '#a3a99c', past: '#f1f0ea', future: '#fbfbf8',
  predict: '#6a4fc4', predictFill: 'rgba(106,79,196,.14)', burn: '#c43d32', late: '#b7791f', fall: '#868c96',
  you: '#2f62d0', youFill: 'rgba(47,98,208,.07)',
};
const LONG_BURN_S = 2.5;  // a premature wake is labeled only once it has burned energy this long (display seconds)
const STATE_COLOR = { idle: C.ink, ramp: C.ink, work: C.ink, burn: C.burn, late: C.late, fall: C.fall };
const STATE_NOTE = { burn: 'Premature wake · burning energy', late: 'Woke too late · hurting latency', fall: 'Work done · back to low power' };
const STATUS = {
  idle: 'GPU at low frequency.', ramp: 'GPU frequency is ramping up.', burn: 'Premature wake: GPU waiting at high frequency, burning energy.',
  late: 'Woke too late: work runs at reduced frequency, hurting latency.', work: 'GPU doing work.', fall: 'Work done: GPU returning to low power.',
};
// Latency penalty is normalized by the played requests' latency at full clocks.
const BASE_LATENCY = DATA.requests.slice(1).reduce((s, r) => s + r.exec, 0);

let last = null, renderedPhase = '', lastDraw = -Infinity;
const text = (id, value) => { if ($(id).textContent !== value) $(id).textContent = value; };

function update() {
  if (game.phase === 'results') { if (renderedPhase !== 'results') finish(); renderedPhase = 'results'; return; }
  $('play').hidden = false; $('results').hidden = true;
  text('round', `${game.index + 1} / ${game.wakes.length} requests from the ${DATA.trace}`);
  $('action').disabled = !(game.canJump || game.phase === 'between');
  text('action-label', game.phase === 'between' ? 'Press space to continue' : 'Press space to ramp up GPU frequency');
  const status = game.phase === 'between' ? 'First request done. Paused. Press Space to continue.' : STATUS[game.state];
  text('accessible-status', status);
  $('scene').setAttribute('aria-label', `Network prediction, GPU work and GPU frequency over time. ${status}`);
  renderedPhase = game.phase;
}

function draw() {
  const W = Math.max(320, $('scene').clientWidth), small = W < 540;
  // Axis labels match the button text size; in-figure annotations are a step smaller.
  const axisFs = small ? 12 : 13, noteFs = small ? 10 : 11, left = small ? 96 : 136;
  // Three rows of about the same height: prediction, work, and frequency (the row the player controls).
  const rowP = [12, 96], rowW = [96, 180], rowF = [180, 300], top = rowP[0], bottom = rowF[1], H = bottom + 26;
  const nowX = left + (W - left) * .32, pps = (W - nowX - 16) / 17;
  const high = rowF[0] + 32, low = bottom - 18, Y = h => low - (low - high) * h, X = t => nowX + (t - game.visual) * pps;
  const bracketY = (rowP[0] + rowP[1]) / 2, workH = 26, workY = (rowW[0] + rowW[1] - workH) / 2;
  const n = v => Number(v).toFixed(1);
  const txt = (x, y, s, attrs = '') => `<text x="${n(x)}" y="${n(y)}" ${attrs}>${s}</text>`;
  const rowLabel = `fill="${C.muted}" font-size="${axisFs}" font-weight="650"`;
  const note = color => `fill="${color}" font-size="${noteFs}" font-weight="700"`;

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" aria-hidden="true"><defs>`;
  s += `<clipPath id="plot"><rect x="${left}" y="${top}" width="${W - left}" height="${bottom - top}" rx="10"/></clipPath>`;
  s += `<pattern id="slow" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#f4e6cb"/><line y2="6" stroke="${C.late}" stroke-width="2.5"/></pattern>`;
  s += '</defs>';
  // Row labels (left gutter). The frequency row is the player's: bolder label and a "you control" tag.
  s += txt(8, bracketY - 3, 'Network', rowLabel) + txt(8, bracketY + 13, 'prediction', rowLabel);
  s += txt(8, workY + 17, 'GPU work', rowLabel);
  const fy = (high + low) / 2;
  s += txt(8, fy - 14, 'GPU', `fill="${C.ink}" font-size="${axisFs}" font-weight="750"`) + txt(8, fy + 3, 'frequency', `fill="${C.ink}" font-size="${axisFs}" font-weight="750"`);
  s += txt(8, fy + 21, '▲ you control', `fill="${C.you}" font-size="${noteFs}" font-weight="700"`);
  s += txt(left - 8, high + 4, 'High', `text-anchor="end" fill="${C.muted}" font-size="${axisFs}"`);
  s += txt(left - 8, low + 4, 'Low', `text-anchor="end" fill="${C.muted}" font-size="${axisFs}"`);

  s += `<g clip-path="url(#plot)">`;
  // Past and future get slightly different backgrounds; the player's row gets a blue tint and edge.
  s += `<rect x="${left}" y="${top}" width="${n(nowX - left)}" height="${bottom - top}" fill="${C.past}"/>`;
  s += `<rect x="${n(nowX)}" y="${top}" width="${n(W - nowX)}" height="${bottom - top}" fill="${C.future}"/>`;
  s += `<rect x="${left}" y="${rowF[0]}" width="${W - left}" height="${rowF[1] - rowF[0]}" fill="${C.youFill}"/>`;
  s += `<rect x="${left}" y="${rowF[0]}" width="4" height="${rowF[1] - rowF[0]}" fill="${C.you}"/>`;
  for (const y of [rowW[0], rowF[0]]) s += `<line x1="${left}" x2="${W}" y1="${y}" y2="${y}" stroke="${C.grid}"/>`;
  s += `<line x1="${left}" x2="${W}" y1="${high}" y2="${high}" stroke="${C.grid}" stroke-dasharray="3 5"/>`;
  s += `<line x1="${left}" x2="${W}" y1="${low}" y2="${low}" stroke="${C.grid}"/>`;

  // Prediction: a range bracket (thin line with end caps over a light band). Work: solid blocks.
  for (const p of game.predictions) {
    const a = X(p.start), b = X(p.end); if (b < left || a > W) continue;
    const current = p.index === game.index && game.phase === 'waiting';
    s += `<g opacity="${current ? 1 : .55}">`;
    s += `<rect x="${n(a)}" y="${bracketY - 9}" width="${n(Math.max(2, b - a))}" height="18" rx="3" fill="${C.predictFill}"/>`;
    s += `<path d="M${n(a)} ${bracketY - 10}V${bracketY + 10}M${n(b)} ${bracketY - 10}V${bracketY + 10}M${n(a)} ${bracketY}H${n(b)}" stroke="${C.predict}" stroke-width="2" fill="none"/>`;
    s += '</g>';
    if (current) s += txt(Math.max(left + 6, a), bracketY - 16, 'predicted arrival', note(C.predict));
  }
  // Work starts at arrival and grows up to NOW until it finishes. After a late wake its first part runs
  // at reduced frequency (hatched), so it takes longer.
  for (const e of game.events) {
    const upTo = t => Math.min(t, game.visual);
    const a = X(e.start), b = X(upTo(e.end)), mid = e.slowEnd ? X(upTo(e.slowEnd)) : a; if (b < left) continue;
    if (e.slowEnd && mid > a) s += `<rect x="${n(a)}" y="${workY}" width="${n(mid - a + (b > mid ? 4 : 0))}" height="${workH}" rx="4" fill="url(#slow)" stroke="${C.late}" stroke-width="1.5"/>`;
    if (b > mid) s += `<rect x="${n(mid)}" y="${workY}" width="${n(b - mid)}" height="${workH}" rx="4" fill="${C.ink}"/>`;
    // Labeled only for the current request, until the GPU starts to ramp down.
    if (e.index === game.index && ['queue', 'work'].includes(game.phase))
      s += txt(Math.max(left + 6, a), workY - 8, e.match ? '✓ Ready in time' : 'Reduced frequency · slower', note(e.match ? C.you : C.late));
  }
  // Each arrival appears only once it happens: a line from the start of work up into the prediction row.
  for (const a of game.arrivals) {
    const x = X(a.t); if (x < left - 8) continue;
    s += `<line x1="${n(x)}" x2="${n(x)}" y1="${workY + workH}" y2="${low}" stroke="${C.axis}" stroke-dasharray="2 4"/>`;
    s += `<line x1="${n(x)}" x2="${n(x)}" y1="${workY + workH}" y2="${bracketY - 12}" stroke="${C.ink}" stroke-width="2" stroke-linecap="round"/>`;
    s += `<circle cx="${n(x)}" cy="${bracketY}" r="4" fill="${C.ink}" stroke="#fff" stroke-width="1.5"/>`;
  }

  // Frequency trail: black by default, colored and annotated where it burns energy, hurts latency or drops back.
  // One polyline per run of the same color, each starting at the previous run's last point. Not one path per
  // frame: on phones a frame's step is a fraction of a pixel, and WebKit (iPhone Safari and Chrome) drew those
  // thousands of tiny, often zero-length paths with gaps.
  const trail = game.trail;
  let d = '', color = null, prev = '';
  const flush = () => { if (d) s += `<path d="${d}" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`; };
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1], b = trail[i]; if (X(b.t) < left) continue;
    const c = STATE_COLOR[b.state ?? 'idle'], pt = `${n(X(b.t))} ${n(Y(b.h))}`;
    if (c !== color) { flush(); color = c; d = `M${n(X(a.t))} ${n(Y(a.h))}`; prev = ''; }
    if (pt !== prev) { d += `L${pt}`; prev = pt; }
  }
  flush();
  for (let i = 1; i < trail.length; i++) {
    const st = trail[i].state;
    if (!STATE_NOTE[st] || trail[i - 1].state === st) continue;
    let j = i; while (j + 1 < trail.length && trail[j + 1].state === st) j++;
    if (X(trail[j].t) < left) continue;
    if (st === 'burn' && trail[j].t - trail[i].t < LONG_BURN_S) continue;  // short premature wakes: red line only
    if (st === 'fall' && (game.state !== 'fall' || j !== trail.length - 1)) continue;  // only during the ramp down
    // Premature-wake and late-wake notes belong to the current request and disappear once the ramp down starts.
    if (st !== 'fall' && (trail[i].index !== game.index || !['waiting', 'queue', 'work'].includes(game.phase))) continue;
    // Above the high line (clear of the GPU marker); the drop-back note sits past the marker, between
    // the high and low lines, so the marker parked at Low never covers it.
    const x = st === 'fall' ? X(trail[i].t) + 44 : Math.max(left + 8, X(trail[i].t));
    const label = small && st === 'fall' ? 'Back to low power' : STATE_NOTE[st];  // fits a phone's narrow future area
    s += txt(x, st === 'fall' ? (high + low) / 2 + 2 : high - 24, label, note(STATE_COLOR[st]));
  }

  s += `<line x1="${n(nowX)}" x2="${n(nowX)}" y1="${top}" y2="${bottom}" stroke="${C.axis}" stroke-dasharray="3 5"/>`;
  const gy = Y(game.height);
  s += `<rect x="${n(nowX - 18)}" y="${n(gy - 18)}" width="36" height="36" rx="8" fill="${STATE_COLOR[game.state]}" stroke="#fff" stroke-width="2"/>`;
  s += txt(nowX, gy + 4, 'GPU', `text-anchor="middle" fill="#fff" font-size="10" font-weight="800"`);
  s += '</g>';
  s += txt(nowX, bottom + 18, 'NOW', `text-anchor="middle" fill="${C.muted}" font-size="${noteFs}" font-weight="650" letter-spacing="1.5"`);
  s += '</svg>';
  $('scene').innerHTML = s;
}

function finish() {
  $('play').hidden = true; $('results').hidden = false;
  const all = game.totals, p = all.player;
  text('headline', `${p.readyOnTime} / ${p.total} requests with unaffected latency`);
  const pct = v => Math.round(100 * v);
  const signed = v => `${v < 0 ? '−' : '+'}${Math.abs(v)}%`;
  $('comparison').innerHTML = [[all.reactive, 'Wait for arrival'], [p, 'Your timing']].map(([v, label]) =>
    `<tr><td>${label}</td><td class="energy">${signed(-pct(1 - v.energy / all.baseline.energy))}</td><td class="latency">${signed(pct(v.addedS / BASE_LATENCY))}</td></tr>`).join('');
  $('headline').focus({ preventScroll: true });
}

function activate() { const before = game.phase; game.action(); if (before !== game.phase) last = null; update(); draw(); }
$('action').addEventListener('click', activate);
$('replay').addEventListener('click', activate);
document.addEventListener('keydown', e => {
  if (e.code !== 'Space' || e.altKey || e.ctrlKey || e.metaKey || e.target.closest?.('details')) return;
  e.preventDefault(); if (!e.repeat) activate();
});
document.addEventListener('visibilitychange', () => { last = null; });
function frame(ts) {
  const dt = last == null || document.hidden ? 0 : Math.min(.05, (ts - last) / 1000); last = ts;
  game.step(dt);
  if (ts - lastDraw > 30) { update(); draw(); lastDraw = ts; }
  requestAnimationFrame(frame);
}
const { inside, total } = DATA.prediction.coverage;
text('history-note', `These five requests (${DATA.segment.first}–${DATA.segment.last} of a real Azure serving trace) were picked so every arrival falls inside its predicted range; across the whole trace, ${inside} of ${total} arrivals (${Math.round(100 * inside / total)}%) do.`);
window.addEventListener('resize', draw); update(); draw(); requestAnimationFrame(frame);
