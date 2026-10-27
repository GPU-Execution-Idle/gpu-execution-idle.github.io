// Shared flow for situation-based activities: situation → choose → reveal → … → summary.
// Each finished run is kept in this browser so visitors can compare their own attempts.
// Activity modules supply the choice UI and the alternatives shown after each reveal.
import { h, fmtJ, fmtMs, signJ, stat, estimateTag, budgetMeter, scrollTop } from '../ui/dom.js';
import { situationSvg, legendHtml } from '../ui/timeline.js';
import { load, save, remove } from '../store.js';
import { SCENARIO_SET } from '../../shared/scenarios.generated.js';
import { ACTIVITIES, SCENARIO_KEY } from '../../shared/activities.js';
import { simulate, normalizeDecision, scoreRun } from '../../shared/sim.js';
import { notifyProgress } from '../progress.js';

const runKey = (activityId) => `run:${activityId}:${SCENARIO_KEY}`;
const historyKey = (activityId) => `history:${activityId}:${SCENARIO_KEY}`;

// Clear the in-progress run; the local attempt history is kept for comparison.
export const resetRun = (activityId) => remove(runKey(activityId));

// Situations completed so far, for the shell's progress bar.
export function runProgress(activityId) {
  const total = ACTIVITIES[activityId].situations.length;
  const st = load(runKey(activityId));
  const done = st?.phase === 'summary' ? total : (st?.decisions?.length ?? 0);
  return { done, total, label: `${done} of ${total} situations` };
}

/**
 * spec: {
 *   activityId, intro: Node,
 *   initialDraft(situation) → draft, isComplete(draft) → bool,
 *   renderChoice({ situation, scenario, draft, update }) → Node,
 *   alternatives(situation, decision) → [{ label, decision }],
 *   describe(decision) → string,
 * }
 */
export function mountRunner(root, spec) {
  const activity = ACTIVITIES[spec.activityId];
  const KEY = runKey(spec.activityId);
  let st = load(KEY) ?? { phase: 'intro', index: 0, decisions: [] };
  let draft = null;

  const persist = () => { save(KEY, st); notifyProgress(); };
  const usedLatency = () => st.decisions.reduce((a, d, i) =>
    a + simulate(d, SCENARIO_SET.scenarios[activity.situations[i].id]).addedLatencyS, 0);

  function render() {
    root.replaceChildren();
    if (st.phase === 'intro') return renderIntro();
    if (st.phase === 'summary') return renderSummary();
    const situation = activity.situations[st.index];
    const scenario = SCENARIO_SET.scenarios[situation.id];
    root.append(
      h('h1', {}, scenario.title),
      h('p', { class: 'small muted' }, scenario.story),
    );
    if (st.phase === 'choose') renderChoose(situation, scenario);
    else renderReveal(situation, scenario);
  }

  function renderIntro() {
    root.append(spec.intro, h('div', { class: 'card' },
      h('h3', {}, 'Your goal'),
      h('p', {}, `Save as much energy as you can across ${activity.situations.length} situations while keeping the total added latency within ${fmtMs(activity.latencyBudgetS)}. Play as many times as you like and compare your attempts.`),
      h('p', { class: 'small muted' }, 'Energy and latency are model estimates, not measurements. You only see the past durations of each tool, never the current call’s end, until you lock in.')),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', onclick: () => { st.phase = 'choose'; persist(); render(); } }, 'Start')));
  }

  function renderChoose(situation, scenario) {
    draft ??= spec.initialDraft(situation);
    const update = (patch) => { draft = { ...draft, ...patch }; render(); };
    root.append(
      budgetMeter(usedLatency(), activity.latencyBudgetS),
      spec.renderChoice({ situation, scenario, draft, update }),
      h('div', { class: 'btn-row' }, h('button', {
        class: 'btn primary', disabled: !spec.isComplete(draft),
        onclick: () => {
          st.decisions[st.index] = normalizeDecision(situation, draft);
          st.phase = 'reveal'; draft = null; persist(); render(); scrollTop();
        },
      }, 'Lock in and reveal')),
    );
  }

  function renderReveal(situation, scenario) {
    const decision = st.decisions[st.index];
    const o = simulate(decision, scenario);
    const card = h('div', {},
      h('p', { class: 'row-between' }, h('b', {}, spec.describe(decision)), estimateTag()),
      h('div', { html: situationSvg({ scenario, state: decision.state, outcome: o, history: false }) }),
      h('div', { html: legendHtml(['tool', decision.state === 'ready' ? null : decision.state, 'rec', 'ready', 'infer', 'lat']
        .filter(Boolean).concat(o.alarmS != null ? ['alarm', 'pred'] : [])) }),
      h('div', { class: 'stats' },
        stat(signJ(o.savedJ), 'energy saved vs. staying ready', o.savedJ > 0.05 ? 'good' : o.savedJ < -0.05 ? 'bad' : ''),
        stat(`+${fmtMs(o.addedLatencyS)}`, 'added latency', o.addedLatencyS > 0 ? 'bad' : 'good')),
    );
    const alts = spec.alternatives(situation, decision).map((a) => ({ ...a, o: simulate(a.decision, scenario) }));
    const same = (a) => JSON.stringify(a.decision) === JSON.stringify(decision);
    const table = h('table', { class: 'compare' },
      h('tr', {}, h('th', {}, 'Option'), h('th', {}, 'Saved'), h('th', {}, 'Latency')),
      alts.map((a) => h('tr', { class: same(a) ? 'picked' : '' },
        h('td', {}, a.label, same(a) ? ' (yours)' : ''), h('td', {}, fmtJ(a.o.savedJ)), h('td', {}, fmtMs(a.o.addedLatencyS)))));
    const last = st.index === activity.situations.length - 1;
    root.append(card, budgetMeter(usedLatency(), activity.latencyBudgetS),
      h('details', {}, h('summary', {}, 'Compare with the other options'), table),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn primary', onclick: () => {
        if (last) st.phase = 'summary'; else { st.index += 1; st.phase = 'choose'; }
        persist(); render(); scrollTop();
      } }, last ? 'See my result' : 'Next situation')));
  }

  function renderSummary() {
    const run = scoreRun(spec.activityId, st.decisions);
    // Record this run once in the local attempt history.
    const history = load(historyKey(spec.activityId), []);
    if (!st.recorded) {
      history.push({ savedJ: run.savedJ, addedLatencyS: run.addedLatencyS, withinBudget: run.withinBudget, at: Date.now() });
      save(historyKey(spec.activityId), history);
      st.recorded = true;
      persist();
    }
    root.append(
      h('h1', {}, 'Your result'), estimateTag(),
      h('div', { class: 'stats' },
        stat(fmtJ(run.savedJ), `energy saved (${Math.round((100 * run.savedJ) / run.baselineJ)}% of idle energy)`, 'good'),
        stat(`+${fmtMs(run.addedLatencyS)}`, `added latency (budget ${fmtMs(run.latencyBudgetS)})`, run.withinBudget ? 'good' : 'bad')),
      h('p', {}, run.withinBudget
        ? 'Within the latency budget.'
        : 'Over the latency budget. Try trading a little energy for latency.'),
      h('table', { class: 'compare' },
        h('tr', {}, h('th', {}, 'Situation'), h('th', {}, 'Saved'), h('th', {}, 'Latency')),
        run.results.map((r) => h('tr', {}, h('td', {}, SCENARIO_SET.scenarios[r.id].title, h('br'),
          h('span', { class: 'small muted' }, spec.describe(r.decision))),
        h('td', {}, fmtJ(r.outcome.savedJ)), h('td', {}, fmtMs(r.outcome.addedLatencyS))))),
      history.length > 1 ? h('details', { open: true }, h('summary', {}, 'Your attempts on this device'),
        h('table', { class: 'compare' },
          h('tr', {}, h('th', {}, 'Attempt'), h('th', {}, 'Saved'), h('th', {}, 'Latency')),
          history.map((a, i) => h('tr', { class: i === history.length - 1 ? 'picked' : '' },
            h('td', {}, `#${i + 1}${i === history.length - 1 ? ' (this one)' : ''}`),
            h('td', {}, fmtJ(a.savedJ)),
            h('td', {}, fmtMs(a.addedLatencyS), a.withinBudget ? '' : h('div', { class: 'small bad' }, 'over budget')))))) : null,
      h('div', { class: 'btn-row two' },
        h('button', { class: 'btn primary', onclick: () => { remove(KEY); st = { phase: 'choose', index: 0, decisions: [] }; notifyProgress(); render(); scrollTop(); } }, 'Play again'),
        h('a', { class: 'btn', href: '#/' }, 'Home')),
    );
  }

  render();
}
