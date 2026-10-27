// Build a controller: pick a job, a power setting and an idle-period predictor, then see the
// energy saved and latency added on a real coding-agent trace. Simulation: shared/controller-sim.js.
import { h, esc } from '../ui/dom.js';
import { load, save, remove } from '../store.js';
import { notifyProgress } from '../progress.js';
import { CONTROLLER_TRACES } from '../../shared/controller-trace.generated.js';
import { SETTINGS, POLICIES, simulateController } from '../../shared/controller-sim.js';

const KEY = 'build2';
const STEPS = ['Power setting', 'Prediction', 'Results'];
const fresh = () => ({ job: 0, setting: null, policy: null, ran: false, history: [] });
const readState = () => ({ ...fresh(), ...load(KEY, {}) });
// Signed percentage; zero shows as plain "0%".
const pct = (sign, v) => (v < 0.05 ? '0%' : `${sign}${v.toFixed(1)}%`);
const jobName = (T) => T.task.replace('__', '/');

// Clear this session's saved state (the Restart button).
export const reset = () => remove(KEY);

export function progress() {
  const s = readState();
  const completed = [!!s.setting, s.setting === 'none' || !!s.policy, s.ran];
  const current = s.ran ? 2 : s.setting ? 1 : 0;
  return { done: completed.filter(Boolean).length, total: 3, steps: STEPS, completed, current, label: STEPS[current] };
}

export function mount(root) {
  const st = readState();
  if (!CONTROLLER_TRACES[st.job]) st.job = 0;
  const persist = () => { save(KEY, st); notifyProgress(); };
  const render = () => root.replaceChildren(...page());
  const choose = (patch) => { Object.assign(st, patch, { ran: false }); persist(); render(); };
  const trace = () => CONTROLLER_TRACES[st.job];
  const policyOf = () => (st.setting === 'none' ? null : st.policy);

  function page() {
    const needsPolicy = st.setting && st.setting !== 'none';
    const ready = st.setting === 'none' || (needsPolicy && st.policy);
    const options = (entries, current, onPick, disabled = false) => h('div', { class: 'choices' }, entries.map(([k, o]) => h('button', {
      class: 'choice plain', type: 'button', 'aria-pressed': String(current === k), disabled, onclick: () => onPick(k),
    }, h('span', { class: 'title' }, o.label), o.note ? h('span', { class: 'sub' }, o.note) : null)));
    const out = [
      h('p', { class: 'intro' }, 'You are the GPU power controller. Try the strategies below to see the energy–latency tradeoff.'),
      traceCard(),
      h('h2', {}, '1 · While execution-idle, the GPU should…'),
      options(Object.entries(SETTINGS).map(([k, s]) => [k, { label: s.label,
        note: s.powerW ? `${s.powerW} W while idle · ${Math.round(s.leadS * 1000)} ms to wake` : s.note }]),
      st.setting, (k) => choose({ setting: k })),
      h('h2', {}, '2 · Predict each idle period with…'),
      h('p', { class: 'small muted' }, 'The controller starts waking at the predicted end minus the wake-up time.'),
      options(Object.entries(POLICIES), st.policy, (k) => choose({ policy: k }), !needsPolicy),
      h('button', { class: 'btn primary', type: 'button', disabled: !ready, onclick: run }, 'Continue'),
      ready ? null : h('p', { class: 'nav-hint' }, st.setting ? 'Choose a prediction to continue.' : 'Choose a power setting to continue.'),
    ];
    if (st.ran) out.push(results());
    const mine = st.history.filter((d) => d.job === trace().task);
    if (mine.length) out.push(historyTable(mine));
    // Back to the end of Explore (the proposal page).
    out.push(h('nav', { class: 'page-nav' }, h('div', { class: 'page-nav-row' },
      h('a', { class: 'btn back', href: '#/explore' }, '← Back'), h('span'))));
    return out.filter(Boolean);
  }

  function run() {
    const r = simulateController(trace(), st.setting, policyOf());
    st.ran = true;
    st.history.push({ job: trace().task, setting: st.setting, policy: policyOf(),
      energySavedPct: r.energySavedPct, addedLatencyPct: r.addedLatencyPct, addedLatencyS: r.addedLatencyS });
    persist();
    render();
    root.querySelector('.results-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function results() {
    const T = trace();
    const r = simulateController(T, st.setting, policyOf());
    return h('section', { class: 'results-card', 'aria-live': 'polite' },
      h('h2', {}, 'Result vs. default'),
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('div', { class: 'v good' }, pct('−', r.energySavedPct)), h('div', { class: 'l' }, 'GPU energy')),
        h('div', { class: 'stat' }, h('div', { class: `v ${r.addedLatencyS > 0 ? 'bad' : 'good'}` }, pct('+', r.addedLatencyPct)),
          h('div', { class: 'l' }, `task time (+${r.addedLatencyS.toFixed(1)} s)`))),
      );
  }

  function historyTable(rows) {
    rows = rows.slice(-8);
    return h('details', { class: 'designs', open: true }, h('summary', {}, `Your designs for ${jobName(trace())}`),
      h('table', { class: 'compare' },
        h('tr', {}, h('th', {}, 'Design'), h('th', {}, 'Energy'), h('th', {}, 'Latency')),
        rows.map((d, i) => h('tr', { class: i === rows.length - 1 && st.ran ? 'picked' : '' },
          h('td', {}, SETTINGS[d.setting].label, d.policy ? h('div', { class: 'small muted' }, POLICIES[d.policy].label) : null),
          h('td', { class: 'good' }, pct('−', d.energySavedPct)),
          h('td', { class: d.addedLatencyS > 0 ? 'bad' : '' }, pct('+', d.addedLatencyPct))))));
  }

  // Job picker and the whole job at a glance: GPU inference vs. tool calls.
  function traceCard() {
    const T = trace();
    const W = 340, H = 30, x = (t) => (t / T.totalS) * W;
    const rects = [`<rect x="0" y="6" width="${W}" height="${H - 12}" rx="3" class="strip-busy"/>`];
    for (const p of T.idle) {
      rects.push(`<rect x="${x(p.startS).toFixed(2)}" y="2" width="${Math.max(0.6, x(p.durS)).toFixed(2)}" height="${H - 4}" class="strip-idle"/>`);
    }
    const minutes = (T.totalS / 60).toFixed(1);
    const idleShare = T.idle.reduce((a, p) => a + p.durS, 0) / T.totalS;
    return h('div', { class: 'trace-card' },
      CONTROLLER_TRACES.length > 1 ? h('div', { class: 'seg', role: 'tablist', 'aria-label': 'Job' }, CONTROLLER_TRACES.map((t, i) => h('button', {
        class: 'choice plain center job-tab', type: 'button', role: 'tab', 'aria-selected': String(st.job === i), 'aria-pressed': String(st.job === i),
        onclick: () => choose({ job: i }),
      }, h('span', { class: 'title' }, `Job ${i + 1}`)))) : null,
      h('div', { class: 'job-name' }, h('b', {}, `SWE-bench · ${T.task}`)),
      h('div', { html: `<svg class="tl" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`${T.idle.length} tool calls over ${minutes} minutes`)}">${rects.join('')}</svg>` }),
      h('div', { class: 'legend' },
        h('span', {}, h('i', { style: 'background:var(--c-infer)' }), 'GPU inference'),
        h('span', {}, h('i', { style: 'background:var(--c-tool)' }), 'tool call')),
      h('p', { class: 'small muted' }, `${minutes} min · ${T.idle.length} tool calls · ${Math.round(100 * idleShare)}% execution-idle`));
  }

  render();
}
