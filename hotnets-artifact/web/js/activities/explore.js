// Explore: one session that builds the argument page by page, then hands off to Activity 2.
//   Idle power → Lower frequency → Savings → Latency cost → Early wake-up → When work returns → Proposal
// Pages live in explore-idle.js and explore-frequency.js; this module owns their order, the
// saved state, navigation and the closing proposal page.
import { h, scrollTop } from '../ui/dom.js';
import { pageNav } from '../ui/pager.js';
import { load, save, remove } from '../store.js';
import { notifyProgress } from '../progress.js';
import { idlePages } from './explore-idle.js';
import { frequencyPages } from './explore-frequency.js';

const KEY = 'explore1';
const LOWERED = ['sm', 'smMem'];
const lowered = (list) => LOWERED.some((k) => list.includes(k));

// Page order. `done` says whether a page's interaction has been completed.
const PAGES = [
  { step: 'Idle power', page: 'idlePower', done: (s) => !!s.idleChoice },
  { step: 'Lower frequency', page: 'lowerFrequency', done: (s) => lowered(s.freqTried) },
  { step: 'Savings', page: 'savings', done: (s) => lowered(s.revealedPower) },
  { step: 'Latency cost', page: 'cost', done: (s) => lowered(s.revealedLatency) },
  { step: 'Early wake-up', page: 'earlyWake', done: (s) => s.raised.length > 0 },
  { step: 'When work returns', page: 'whenReturn', done: (s) => s.cantTell },
  { step: 'Proposal', page: 'proposal', done: (s) => s.sawProposal },
];

const fresh = () => ({
  page: 0,
  idleChoice: null, guessTried: [], guessCurrent: null, cantTell: false,
  freqTried: [], freqCurrent: null, workload: 'llm',
  revealedPower: ['ready'], revealedPowerHighlight: 'ready', revealedLatency: ['ready'], revealedLatencyHighlight: 'ready',
  raised: [], sawProposal: false,
});
const readState = () => ({ ...fresh(), ...load(KEY, {}) });

// Clear this session's saved state (the Restart button).
export const reset = () => remove(KEY);

export function progress() {
  const s = readState();
  const completed = PAGES.map((p) => p.done(s));
  return {
    done: completed.filter(Boolean).length, total: PAGES.length, steps: PAGES.map((p) => p.step), completed,
    current: s.page, compact: true, label: `Step ${s.page + 1} of ${PAGES.length} · ${PAGES[s.page].step}`,
  };
}

export function mount(root) {
  const st = readState();
  const go = (i) => {
    st.page = i;
    if (PAGES[i].page === 'proposal') st.sawProposal = true;
    ctx.persist();
    ctx.render();
    scrollTop();
  };
  const ctx = {
    st,
    justRevealed: false, // set by the idle-power answer so its bars animate once
    animId: 0,           // current requestAnimationFrame id, cancelled on every render
    animateKey: null,    // early wake-up row to animate on the next render
    persist: () => { save(KEY, st); notifyProgress(); },
    render: () => {
      cancelAnimationFrame(ctx.animId);
      document.body.classList.toggle('recap', PAGES[st.page].page === 'proposal');
      root.replaceChildren(...pages[PAGES[st.page].page]());
      ctx.justRevealed = false;
    },
    // Shared Back / Next for the current position in PAGES.
    nav: ({ enabled = true, hint, label = 'Next →' }) => pageNav({
      back: st.page > 0 ? () => go(st.page - 1) : null,
      next: { label, enabled, hint, onClick: () => go(st.page + 1) },
    }),
  };
  const pages = { ...idlePages(ctx), ...frequencyPages(ctx), proposal };

  // ---------------- Proposal ----------------
  // The control-loop comparison from the talk (pitch video scene 5), drawn as SVG.
  function proposal() {
    return [
      h('h1', { class: 'proposal' }, 'GPU Power Management Needs to Look Beyond the GPU'),
      h('div', { class: 'loops' },
        h('figure', { class: 'loop-panel', html: LOCAL_LOOP_SVG }),
        h('figure', { class: 'loop-panel', html: SYSTEM_LOOP_SVG })),
      pageNav({ back: () => go(st.page - 1), next: { label: 'Build a controller →', href: '#/build' } }),
    ];
  }

  if (!PAGES[st.page]) st.page = 0;
  ctx.render();
  return () => { cancelAnimationFrame(ctx.animId); document.body.classList.remove('recap'); };
}

// ---------------- Control-loop comparison ----------------
const chip = (cx, cy, size, cls) => {
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
const loop = (cx, cy, r, cls) => {
  const a0 = -Math.PI / 2 + 0.28, a1 = -Math.PI / 2 - 0.28 + 2 * Math.PI;
  const p = (a) => `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  const [ex, ey] = p(a1).split(',').map(Number);
  return `<g class="${cls}" style="transform-origin:${cx}px ${cy}px"><path class="loop-arc" d="M${p(a0)} A${r},${r} 0 1 1 ${p(a1)}"/>`
    + `<path class="loop-head" d="M${ex - 9},${ey - 7} L${ex + 3},${ey} L${ex - 9},${ey + 7} Z"/></g>`;
};

const LOCAL_LOOP_SVG = `<svg viewBox="0 0 340 200" role="img" aria-label="Traditional device-local control: the GPU's power controller sees only the GPU itself.">
  ${loop(170, 92, 68, 'loop local')}
  ${chip(170, 92, 56, 'chip')}
  <text class="loop-caption" x="170" y="190" text-anchor="middle">Traditional: device-local control</text>
</svg>`;

const ICONS = {
  network: (x, y) => `<circle cx="${x}" cy="${y}" r="11"/><ellipse cx="${x}" cy="${y}" rx="5" ry="11"/><path d="M${x - 11},${y} h22"/>`,
  app: (x, y) => `<rect x="${x - 9}" y="${y - 12}" width="18" height="24" rx="2"/><path d="M${x - 5},${y - 5} h10 M${x - 5},${y} h10 M${x - 5},${y + 5} h7"/>`,
  host: (x, y) => `<rect x="${x - 12}" y="${y - 9}" width="24" height="15" rx="2"/><rect x="${x - 6}" y="${y - 5}" width="9" height="6"/><path d="M${x - 10},${y + 9} h20"/>`,
};
const SOURCES = [['network', 'Network', 58], ['app', 'Application', 116], ['host', 'Host / PCIe', 174]];

const SYSTEM_LOOP_SVG = `<svg viewBox="0 0 340 250" role="img" aria-label="System-wide control: network, application and host signals tell the GPU to wake up, so it is ready before work arrives.">
  ${loop(196, 118, 92, 'loop system')}
  ${SOURCES.map(([k, label, y]) => `<text class="src-label" x="78" y="${y + 4}" text-anchor="end">${label}</text>
    <rect class="src-box" x="86" y="${y - 17}" width="34" height="34" rx="7"/><g class="src-icon">${ICONS[k](103, y)}</g>
    <path class="signal" d="M124,${y} L${200},${116 + (y - 116) * 0.25}"/>`).join('')}
  ${chip(232, 116, 56, 'chip ready')}
  <rect class="wake-badge" x="172" y="30" width="104" height="24" rx="6"/>
  <text class="wake-text" x="224" y="47" text-anchor="middle">wake up now!</text>
  <text class="ready-text" x="232" y="168" text-anchor="middle">ready before</text>
  <text class="ready-text" x="232" y="183" text-anchor="middle">work arrives</text>
  <text class="loop-caption cyan" x="330" y="244" text-anchor="end">System-wide control</text>
</svg>`;
