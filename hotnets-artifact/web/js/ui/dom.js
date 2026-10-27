// Tiny DOM helpers and number formatting.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const clean = (x) => (Math.abs(x) < 0.05 ? 0 : x);
export const fmtJ = (j) => `${Math.abs(clean(j)) >= 10 ? clean(j).toFixed(0) : clean(j).toFixed(1)} J`;
export const fmtMs = (s) => `${Math.round(s * 1000)} ms`;
export const fmtS = (s) => (s >= 10 ? `${s.toFixed(1)} s` : s >= 1 ? `${s.toFixed(2)} s` : `${Math.round(s * 1000)} ms`);
export const signJ = (j) => (clean(j) > 0 ? `+${fmtJ(j)}` : fmtJ(j));

export function stat(value, label, cls = '') {
  return h('div', { class: 'stat' }, h('div', { class: `v ${cls}` }, value), h('div', { class: 'l' }, label));
}

export function estimateTag(text = 'Model estimate') {
  return h('span', { class: 'estimate', title: 'Computed from a simple power model, not measured' }, text);
}

export function budgetMeter(usedS, budgetS) {
  const pct = Math.min(100, (usedS / budgetS) * 100);
  return h('div', { class: `meter ${usedS > budgetS + 1e-9 ? 'over' : ''}` },
    h('div', { class: 'lbl' }, h('span', {}, 'Latency budget used'), h('span', {}, `${fmtMs(usedS)} / ${fmtMs(budgetS)}`)),
    h('div', { class: 'track' }, h('div', { class: 'fill', style: `width:${pct}%` })));
}

export function scrollTop() { window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' }); }

// A question with its answer buttons, shown as one card (same look on every question page).
export const questionCard = (...children) => h('section', { class: 'q-card' }, ...children);

// The answer to a page's question, shown under the question's description once the visitor has interacted.
// Parts can mix text with the highlights below.
export const answerStrip = (...parts) => h('div', { class: 'answer-strip', role: 'status' },
  h('span', { class: 'answer-label' }, 'Answer'), h('b', {}, ...parts));
// Answer highlights: a setting (outlined in its color, like its chart bar), a workload (like the
// selected workload button) and a measured value (colored when it is a saving or a cost).
export const hlSetting = (key, label) => h('span', { class: `hl-set ${key}` }, label);
export const hlWorkload = (name) => h('span', { class: 'hl-work' }, name);
export const hlValue = (text, tone = '') => h('span', { class: `hl-val ${tone}` }, text);
