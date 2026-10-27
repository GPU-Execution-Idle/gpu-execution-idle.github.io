// Explore pages about lowering frequency: execution-idle power, measured savings and latency
// cost in workloads, and how early to wake. Data: shared/activity1-data.js.
// Pages get a context from explore.js: { st, persist, render, nav, animId, animateKey }.
import { h, esc, questionCard, answerStrip, hlSetting, hlWorkload, hlValue } from '../ui/dom.js';
import { A1_DATA as D, MEASURED_IMPACT } from '../../shared/activity1-data.js';

const SETTINGS = ['ready', 'sm', 'smMem'];
const LOWERED = ['sm', 'smMem'];
const COLOR = { ready: 'var(--c-ready)', sm: 'var(--c-sm)', smMem: 'var(--c-smMem)' };
const byKey = Object.fromEntries(D.settings.map((s) => [s.key, s]));
const ms = (s) => `${Math.round(s * 1000)} ms`;
// Answers name settings by their button labels, highlighted the same way on every page.
const setting = (k) => hlSetting(k, byKey[k].label);
// The setting an answer describes: the one last clicked, else the last one revealed.
const answerKey = (current, revealed) => (LOWERED.includes(current) ? current : LOWERED.findLast((k) => revealed.includes(k)));
// Lead-in placed under the answer, right above the setting buttons.
const settingNote = () => h('p', { class: 'setting-note' }, 'Under the following setting');
// Setting buttons; settings in `tried` get an "Explored" tag.
const settingButtons = (current, onPick, tried, cls = 'three') => h('div', { class: cls, role: 'group', 'aria-label': 'Frequency setting' },
  SETTINGS.map((k) => h('button', {
    class: 'choice plain center', type: 'button', 'data-setting': k, 'aria-pressed': String(current === k), onclick: () => onPick(k),
  }, h('span', { class: 'title' }, byKey[k].label, tried.includes(k) ? h('span', { class: 'explored' }, 'Explored') : null))));


// Two buttons, one per downscaled setting; only `selected` (the one the answer describes) is pressed.
const raiseChoice = (selected, onPick, labels = { sm: 'Wake from minimum SM', smMem: 'Wake from minimum SM + memory' }) =>
  h('div', { class: 'seg', role: 'group', 'aria-label': 'Downscaled setting' }, LOWERED.map((k) => h('button', {
    class: 'choice plain center', type: 'button', 'data-setting': k, 'aria-pressed': String(selected === k), onclick: () => onPick(k),
  }, h('span', { class: 'title' }, labels[k]))));

export function frequencyPages(ctx) {
  const { st } = ctx;

  // ---------------- Lower frequency ----------------
  function lowerFrequency() {
    // Vertical gauges, built once and updated in place so they animate between settings.
    const gauge = (icon, label) => {
      const val = h('div', { class: 'vg-val' });
      const fill = h('div', { class: 'vg-fill' });
      const ref = h('div', { class: 'vg-default', title: 'Default' });
      const track = h('div', { class: 'vg-track' }, fill, ref);
      const iconBox = h('div', { class: 'vg-icon', html: icon });
      return { val, fill, ref, track, iconBox, el: h('div', { class: 'vg' }, iconBox, val, track, h('div', { class: 'vg-label' }, label)) };
    };
    const sm = gauge(SM_SVG, 'SM frequency');
    const mem = gauge(MEM_SVG, 'Memory frequency');
    const pw = gauge(POWER_SVG, 'Power');
    const maxW = byKey.ready.powerW * 1.1;
    pw.track.append(h('div', { class: 'vg-ref', style: `bottom:${(100 * D.trueIdleW) / maxW}%` }, h('span', {}, 'true idle')));
    sm.ref.style.bottom = '100%';
    mem.ref.style.bottom = '100%';
    pw.ref.style.bottom = `${(100 * byKey.ready.powerW) / maxW}%`;

    const buttons = h('div');
    const answer = h('div');
    const nav = h('div');
    const update = () => {
      // Before any choice the GPU sits at default frequencies and power is hidden.
      const s = byKey[st.freqCurrent ?? 'ready'];
      const fSm = s.clocks.sm / D.maxClocks.sm;
      const fMem = s.clocks.mem / D.maxClocks.mem;
      sm.val.textContent = `${s.clocks.sm} MHz`;
      mem.val.textContent = `${s.clocks.mem} MHz`;
      sm.fill.style.height = `${100 * fSm}%`;
      mem.fill.style.height = `${100 * fMem}%`;
      pw.val.textContent = st.freqCurrent ? `${s.powerW} W` : '? W';
      pw.fill.style.height = st.freqCurrent ? `${(100 * s.powerW) / maxW}%` : '0%';
      for (const g of [sm, mem, pw]) { g.fill.style.background = COLOR[s.key]; g.val.style.color = COLOR[s.key]; }
      sm.iconBox.style.setProperty('--lit', 0.3 + 0.7 * fSm);
      mem.iconBox.style.setProperty('--lit', 0.3 + 0.7 * fMem);
      pw.iconBox.style.setProperty('--lit', st.freqCurrent ? 0.3 + 0.7 * (s.powerW / byKey.ready.powerW) : 0.3);

      buttons.replaceChildren(settingButtons(st.freqCurrent, (k) => {
        st.freqCurrent = k;
        if (LOWERED.includes(k)) st.freqLowered = k;
        if (!st.freqTried.includes(k)) st.freqTried.push(k);
        ctx.persist();
        update();
      }, st.freqTried));
      const unlocked = LOWERED.some((k) => st.freqTried.includes(k));
      // The answer appears once a lowered setting is picked and quotes that setting's saving.
      const low = answerKey(st.freqLowered, st.freqTried);
      answer.replaceChildren(...(low ? [answerStrip('Yes. ', setting(low), ' cuts idle power by ', hlValue(`${byKey.ready.powerW - byKey[low].powerW} W`, 'good'), ', with the model still loaded.')] : []));
      nav.replaceChildren(ctx.nav({ enabled: unlocked, hint: 'Try a lower-frequency setting to continue.' }));
    };
    update();
    return [
      questionCard(
        h('h1', {}, 'Can lower frequencies cut execution-idle power?'),
        h('div', { class: 'tags' }, h('span', { class: 'tag' }, 'Model loaded'), h('span', { class: 'tag' }, '0% utilization')),
        answer,
        settingNote(),
        buttons),
      h('div', { class: 'gauges' }, sm.el, mem.el, pw.el),
      h('p', { class: 'gauge-key small muted' }, h('i', { class: 'key-default' }), 'default', h('i', { class: 'key-trueidle' }), 'true idle'),
      h('p', { class: 'sm-def small muted' }, h('b', {}, 'SM'), ' (streaming multiprocessor): the GPU’s compute cores.'),
      nav,
    ];
  }

  // ---------------- Savings and latency cost: measured workload results ----------------
  // One measured metric per page. Revealed settings accumulate per page; clicking one again
  // only highlights it. The workload choice is shared by both pages.
  function metricPage({ title, context = null, metric, pctKey, chartTitle, fmt, revealedKey, hint, answer, raiseButtons = false }) {
    const w = MEASURED_IMPACT[st.workload];
    const revealed = st[revealedKey];
    const highlightKey = `${revealedKey}Highlight`;
    const unlocked = LOWERED.some((k) => revealed.includes(k));
    const pick = (k) => {
      if (!revealed.includes(k)) revealed.push(k);
      st[highlightKey] = k;
      ctx.persist();
      ctx.render();
    };
    const pct = (v) => (v > 0 ? `+${v}%` : `−${Math.abs(v)}%`);
    if (typeof metric === 'function') [metric, pctKey] = metric(w);
    const max = Math.max(...SETTINGS.map((k) => w.results[k][metric])) * 1.3;
    const chart = barPanel({
      title: chartTitle(w), max, highlight: st[highlightKey],
      bars: SETTINGS.map((k) => ({ key: k, shown: revealed.includes(k),
        value: fmt(w.results[k][metric]), raw: w.results[k][metric],
        pct: w.results[k][pctKey] != null ? pct(w.results[k][pctKey]) : null, up: w.results[k][pctKey] > 0 })),
    });
    return [
      questionCard(
        h('h1', {}, title),
        context ? h('p', {}, context) : null,
        unlocked ? answerStrip(...answer(w, answerKey(st[highlightKey], revealed), pctKey)) : null,
        settingNote(),
        raiseButtons ? raiseChoice(answerKey(st[highlightKey], revealed), pick, raiseButtons === true ? undefined : raiseButtons) : settingButtons(st[highlightKey], pick, revealed.filter((k) => k !== 'ready'), 'three compact')),
      h('div', { class: 'bar-chart', html: chart }),
      h('div', { class: 'picker' }, h('span', {}, 'Workload:'),
        h('div', { class: 'seg', role: 'tablist', 'aria-label': 'Workload' }, Object.entries(MEASURED_IMPACT).map(([k, x]) => h('button', {
          class: 'choice plain center', type: 'button', role: 'tab', 'aria-selected': String(st.workload === k), 'aria-pressed': String(st.workload === k),
          onclick: () => { st.workload = k; ctx.persist(); ctx.render(); },
        }, h('span', { class: 'title' }, x.tab))))),
      ctx.nav({ enabled: unlocked, hint }),
    ].filter(Boolean);
  }

  const savings = () => metricPage({
    title: 'How much does lowering frequencies during execution-idle reduce average GPU power across full workload runs?',
    answer: (w, k, pctKey) => [setting(k), ' cuts average power by ', hlValue(`${Math.abs(w.results[k][pctKey])}%`, 'good'), ' on ', hlWorkload(w.traceName), '.'],
    metric: 'powerW', pctKey: 'powerPct', fmt: (v) => `${v} W`,
    chartTitle: () => 'Average GPU power (W)',
    raiseButtons: { sm: 'SM at minimum', smMem: 'SM + memory at minimum' },
    revealedKey: 'revealedPower',
    hint: 'Add a lower-frequency setting to see its savings.',
  });

  const cost = () => metricPage({
    title: 'What latency overhead comes from raising frequencies after work resumes?',
    answer: (w, k, pctKey) => ['Waking from ', setting(k), ' adds ', hlValue(`${w.results[k][pctKey]}%`, 'bad'), ` median ${w.latency.label.replace(/^p50 /, '')} on `, hlWorkload(w.traceName), '.'],
    metric: (w) => [w.latency.key, w.latency.pctKey], fmt: (v) => `${v.toFixed(2)} s`,
    chartTitle: (w) => `${w.latency.label} (s)`,
    revealedKey: 'revealedLatency',
    raiseButtons: true,
    hint: 'Add a lower-frequency setting to see its cost.',
  });

  // ---------------- Early wake-up ----------------
  // Rows build up: the baseline is always shown; each button adds its setting's row, whose
  // wake arrow grows to the measured lead time.
  function earlyWake() {
    const chart = h('div');
    const raise = (k) => {
      if (!st.raised.includes(k)) { st.raised.push(k); ctx.animateKey = k; }
      st.raisedCurrent = k;
      ctx.persist();
      ctx.render();
    };
    const wakeKey = answerKey(st.raisedCurrent, st.raised);
    const buttons = raiseChoice(wakeKey, raise);
    const animating = ctx.animateKey;
    ctx.animateKey = null;
    if (animating) {
      const t0 = performance.now();
      const tick = (now) => {
        const f = Math.min(1, (now - t0) / 900);
        chart.innerHTML = leadSvg(st.raised, animating, 1 - (1 - f) ** 3);
        if (f < 1) ctx.animId = requestAnimationFrame(tick);
      };
      tick(t0);
    } else {
      chart.innerHTML = leadSvg(st.raised, null, 1);
    }
    return [
      questionCard(
        h('h1', {}, 'Can raising frequency early avoid putting transition overhead to workload?'),
        wakeKey ? answerStrip('Yes. Waking from ', setting(wakeKey), ' ', hlValue(ms(D.wakeLeadS[wakeKey])), ' early matches ', setting('ready'), ' performance.') : null,
        settingNote(),
        buttons),
      h('div', { class: 'bar-chart' }, chart),
      ctx.nav({ enabled: st.raised.length > 0, hint: 'Try a wake-up option to continue.' }),
    ];
  }

  return { lowerFrequency, savings, cost, earlyWake };
}

// ---------------- Figures ----------------
const SHORT = { ready: ['Default'], sm: ['SM at', 'minimum'], smMem: ['SM + memory', 'at minimum'] };

// One small vertical-bar panel with fixed slots and a fixed axis. Unrevealed settings are
// dashed placeholders, so revealing more never moves anything.
function barPanel({ title, bars, max, highlight }) {
  const W = 320, TOP = 30, BASE = 150;
  const slot = (W - 20) / bars.length;
  const y = (v) => BASE - (v / max) * (BASE - TOP);
  const o = [`<text x="10" y="16" style="font-weight:800">${esc(title)}</text>`,
    `<line class="axis" x1="10" x2="${W - 10}" y1="${BASE}" y2="${BASE}"/>`];
  bars.forEach((b, i) => {
    const cx = 10 + slot * (i + 0.5), bw = 54;
    if (b.shown) {
      const hl = b.key === highlight;
      o.push(`<rect x="${cx - bw / 2}" y="${y(b.raw)}" width="${bw}" height="${BASE - y(b.raw)}" rx="4" style="fill:${COLOR[b.key]}${hl ? ';stroke:var(--text);stroke-width:2.5' : ';opacity:.8'}"/>`,
        `<text x="${cx}" y="${y(b.raw) - (b.pct ? 18 : 5)}" text-anchor="middle" style="font-weight:${hl ? 800 : 600}">${esc(b.value)}</text>`);
      if (b.pct) o.push(`<text class="lab" x="${cx}" y="${y(b.raw) - 5}" text-anchor="middle" style="font-weight:700;fill:var(--${b.up ? 'bad' : 'good'})">${b.pct}</text>`);
    } else {
      o.push(`<rect class="placeholder" x="${cx - bw / 2}" y="${BASE - 46}" width="${bw}" height="46" rx="4"/>`,
        `<text class="lab" x="${cx}" y="${BASE - 18}" text-anchor="middle">?</text>`);
    }
    SHORT[b.key].forEach((line, j) => o.push(`<text class="lab" x="${cx}" y="${BASE + 15 + j * 13}" text-anchor="middle">${line}</text>`));
  });
  const shown = bars.filter((b) => b.shown).map((b) => `${byKey[b.key].label} ${b.value}${b.pct ? ` (${b.pct})` : ''}`).join(', ');
  return `<svg class="tl" viewBox="0 0 ${W} ${BASE + 34}" role="img" aria-label="${esc(`${title}: ${shown}`)}">${o.join('')}</svg>`;
}

// Three rows on one axis: the baseline (no frequency scaling) and one row per downscaled setting.
// Left of "work starts" is drawn to scale (the measured lead times); the inference bar to the
// right is schematic and identical in every row. `animKey` grows that row's arrow by f ∈ [0, 1].
function leadSvg(raised, animKey, f) {
  const W = 340, L = 8, T0 = -0.36;
  const xWork = 196, xEnd = W - 8;                  // inference spans [xWork, xEnd] (schematic)
  const x = (t) => L + ((t - T0) / -T0) * (xWork - L); // to scale for t ≤ 0
  const ROW = 58, TOP = 16;
  const rows = [{ key: 'ready', title: 'Default (no scaling)' },
    { key: 'sm', title: 'SM at minimum' }, { key: 'smMem', title: 'SM + memory at minimum' }];
  const o = [];
  rows.forEach((r, i) => {
    const y = TOP + i * ROW, by = y + 20, bh = 22;
    const shown = r.key === 'ready' || raised.includes(r.key);
    o.push(`<text class="lab" x="${L}" y="${y}" style="font-weight:700;fill:${COLOR[r.key]}">${esc(r.title)}</text>`,
      `<line class="axis" x1="${L}" x2="${xEnd}" y1="${by + bh / 2}" y2="${by + bh / 2}"/>`);
    if (!shown) {
      o.push(`<rect class="placeholder" x="${xWork}" y="${by}" width="${xEnd - xWork}" height="${bh}" rx="4"/>`,
        `<text class="lab" x="${(xWork + xEnd) / 2}" y="${by + 15}" text-anchor="middle">?</text>`);
      return;
    }
    if (r.key !== 'ready') {
      const lead = D.wakeLeadS[r.key];
      const at = -lead * (r.key === animKey ? f : 1);
      const ay = by + bh / 2;
      // Arrow from the early raise to "work starts", labeled with the measured lead time.
      o.push(`<line x1="${x(at)}" x2="${xWork - 6}" y1="${ay}" y2="${ay}" style="stroke:${COLOR[r.key]};stroke-width:3"/>`,
        `<path d="M${xWork - 8},${ay - 6} L${xWork},${ay} L${xWork - 8},${ay + 6} Z" style="fill:${COLOR[r.key]}"/>`,
        `<circle cx="${x(at)}" cy="${ay}" r="5" style="fill:${COLOR[r.key]}"/>`);
      if (r.key !== animKey || f > 0.99) {
        o.push(`<text class="lab" x="${(x(-lead) + xWork) / 2}" y="${ay - 7}" text-anchor="middle" style="font-weight:700;fill:${COLOR[r.key]}">wake ${ms(lead)} earlier</text>`);
      }
    }
    const done = r.key === 'ready' || r.key !== animKey || f > 0.99;
    if (done) {
      o.push(`<rect class="infer" x="${xWork}" y="${by}" width="${xEnd - xWork}" height="${bh}" rx="4"/>`,
        `<text x="${(xWork + xEnd) / 2}" y="${by + 15}" text-anchor="middle" style="fill:#fff;font-weight:700;font-size:11px">${r.key === 'ready' ? 'inference' : 'same as default'}</text>`);
    }
  });
  const base = TOP + 3 * ROW;
  o.push(`<line x1="${xWork}" x2="${xWork}" y1="${TOP + 6}" y2="${base - 8}" style="stroke:var(--text);stroke-width:2"/>`,
    `<path d="M${xWork - 5},${base} L${xWork + 5},${base} L${xWork},${base - 7} Z" style="fill:var(--text)"/>`,
    `<text x="${xWork}" y="${base + 24}" text-anchor="middle" style="font-weight:800">work starts on an L40S GPU</text>`);
  for (const t of [-0.3, -0.2, -0.1]) o.push(`<text class="lab" x="${x(t)}" y="${base + 4}" text-anchor="middle">−${Math.round(-t * 1000)}${t === -0.1 ? ' ms' : ''}</text>`);
  const label = ['Default: inference starts when work starts.',
    ...LOWERED.filter((k) => raised.includes(k)).map((k) => `${byKey[k].label}: wake ${ms(D.wakeLeadS[k])} before work starts; inference matches the default.`)].join(' ');
  return `<svg class="tl lead-chart" viewBox="0 0 ${W} ${base + 30}" role="img" aria-label="${esc(label)}">${o.join('')}</svg>`;
}

// ---------------- Icons ----------------
const SM_SVG = `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="2" y="2" width="60" height="60" rx="8" class="ic-frame"/>
  ${Array.from({ length: 16 }, (_, i) => `<rect x="${9 + (i % 4) * 12.5}" y="${9 + Math.floor(i / 4) * 12.5}" width="9" height="9" rx="2" class="ic-unit"/>`).join('')}</svg>`;

const MEM_SVG = `<svg viewBox="0 0 64 64" aria-hidden="true">
  ${[0, 1, 2, 3].map((i) => `<rect x="${5 + i * 14.5}" y="10" width="11" height="44" rx="2" class="ic-unit"/>
    ${[0, 1, 2, 3, 4].map((k) => `<rect x="${3 + i * 14.5}" y="${15 + k * 8}" width="2" height="3" class="ic-pin"/><rect x="${16 + i * 14.5}" y="${15 + k * 8}" width="2" height="3" class="ic-pin"/>`).join('')}`).join('')}</svg>`;

const POWER_SVG = `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M36 4 L14 36 H30 L26 60 L50 26 H34 Z" class="ic-unit"/></svg>`;
