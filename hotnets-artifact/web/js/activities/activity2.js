// Activity 2: choose the wake policy (tool completion vs. predicted completion).
// Power state is fixed, except in the final combined situation.
import { h } from '../ui/dom.js';
import { situationSvg } from '../ui/timeline.js';
import { STATES, ESTIMATORS, MARGIN_MS } from '../../shared/activities.js';
import { PARAMS } from '../../shared/params.js';
import { plannedAlarm } from '../../shared/sim.js';
import { mountRunner, runProgress, resetRun } from './runner.js';
import { stateChoices } from './stateChoices.js';

const seg = (options, current, onPick, label) => h('div', { class: 'seg', role: 'group', 'aria-label': label },
  options.map(([key, text]) => h('button', { class: 'choice', type: 'button', 'aria-pressed': String(current === key), onclick: () => onPick(key) },
    h('span', { class: 'title' }, text))));

function describe(d) {
  const state = STATES[d.state].short;
  if (d.state === 'ready') return 'Stay ready';
  if (d.policy === 'completion') return `${state} · wake on tool completion`;
  return `${state} · predict (${ESTIMATORS[d.estimator].replace('Historical ', '')}, margin ${d.marginMs} ms)`;
}

export const progress = () => runProgress('a2');
export const reset = () => resetRun('a2');

export function mount(root) {
  mountRunner(root, {
    activityId: 'a2',
    intro: h('div', {},
      h('h1', {}, 'Choose the wake policy'),
      h('p', {}, `The GPU now sleeps deeply (SM + memory downscaled), and waking takes ${Math.round(PARAMS.recoveryS.smMem * 1000)} ms. You decide when to start waking it.`),
      h('ul', {},
        h('li', {}, h('b', {}, 'Wake on tool completion: '), 'safe for energy, but the agent always waits for the full wake-up.'),
        h('li', {}, h('b', {}, 'Predict: '), 'set an alarm at predicted end − wake-up time − safety margin. The prediction uses only past calls. If the tool finishes before the alarm, completion wakes the GPU anyway.')),
      h('p', {}, 'The last situation also lets you pick the power state.')),
    initialDraft: (sit) => ({ state: sit.fixedState ?? null, policy: null, estimator: 'mean', marginMs: 0 }),
    isComplete: (d) => d.state != null && (d.state === 'ready' || d.policy != null),
    renderChoice: ({ situation, scenario, draft, update }) => {
      const parts = [];
      if (!situation.fixedState) {
        parts.push(h('h2', {}, 'Power state while the tool runs'), stateChoices(draft.state, (state) => update({ state })));
      } else {
        parts.push(h('p', { class: 'small muted' }, `Power state fixed: ${STATES[draft.state].label} (${Math.round(PARAMS.recoveryS[draft.state] * 1000)} ms to wake).`));
      }
      const plan = draft.state && draft.state !== 'ready' && draft.policy
        ? plannedAlarm(draft, scenario) : null;
      parts.unshift(
        h('div', { html: situationSvg({ scenario, state: draft.state ?? 'smMem',
          plan: plan && { ...plan, recoveryS: PARAMS.recoveryS[draft.state] } }) }),
        plan ? h('p', { class: 'small' }, `Predicted end ${plan.predictedS.toFixed(2)} s → wake alarm at ${plan.alarmS.toFixed(2)} s.`) : null);
      if (draft.state && draft.state !== 'ready') {
        parts.push(h('h2', {}, 'Wake the GPU…'),
          seg([['completion', 'When the tool completes'], ['predict', 'At a predicted time']], draft.policy,
            (policy) => update({ policy }), 'Wake policy'));
        if (draft.policy === 'predict') {
          parts.push(h('h3', {}, 'Predict the tool duration from its history'),
            h('div', { class: 'three' }, Object.keys(ESTIMATORS).map((key) => h('button', {
              class: 'choice plain center', type: 'button', 'aria-pressed': String(draft.estimator === key), onclick: () => update({ estimator: key }),
              'aria-label': ESTIMATORS[key],
            }, h('span', { class: 'title' }, { mean: 'Mean', p20: 'p20', min: 'Min' }[key])))),
            h('h3', {}, 'Safety margin (wake this much earlier)'),
            h('div', { class: 'stepper' },
              h('button', { type: 'button', 'aria-label': 'Less margin', disabled: draft.marginMs <= MARGIN_MS.min,
                onclick: () => update({ marginMs: draft.marginMs - MARGIN_MS.step }) }, '−'),
              h('output', { 'aria-live': 'polite' }, `${draft.marginMs} ms`),
              h('button', { type: 'button', 'aria-label': 'More margin', disabled: draft.marginMs >= MARGIN_MS.max,
                onclick: () => update({ marginMs: draft.marginMs + MARGIN_MS.step }) }, '+')));
        }
      }
      return h('div', {}, parts);
    },
    alternatives: (situation, d) => {
      const state = d.state === 'ready' ? situation.fixedState ?? 'smMem' : d.state;
      const margin = d.policy === 'predict' ? d.marginMs : 0;
      const alts = [{ label: 'Wake on completion', decision: { state, policy: 'completion', estimator: null, marginMs: 0 } },
        ...Object.keys(ESTIMATORS).map((e) => ({ label: `Predict ${e}, ${margin} ms margin`, decision: { state, policy: 'predict', estimator: e, marginMs: margin } }))];
      if (!situation.fixedState) alts.unshift({ label: 'Stay ready', decision: { state: 'ready', policy: 'completion', estimator: null, marginMs: 0 } });
      return alts;
    },
    describe,
  });
}
