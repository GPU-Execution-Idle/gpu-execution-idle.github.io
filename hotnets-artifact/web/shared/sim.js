// Simulation and scoring of energy saved and added latency. Pure functions, no UI.
// All outcomes are MODEL ESTIMATES from PARAMS, not measurements.
import { PARAMS } from './params.js';
import { SCENARIO_SET } from './scenarios.generated.js';
import { ACTIVITIES, STATES, ESTIMATORS, MARGIN_MS } from './activities.js';

// Linear-interpolation percentile; must match trace-analysis/build_scenarios.py.
export function percentile(xs, p) {
  const s = [...xs].sort((a, b) => a - b);
  const k = (s.length - 1) * p;
  const lo = Math.floor(k);
  const hi = Math.min(lo + 1, s.length - 1);
  return s[lo] + (s[hi] - s[lo]) * (k - lo);
}

// Predict tool duration from past observations only.
export function predict(history, estimator) {
  if (estimator === 'mean') return history.reduce((a, b) => a + b, 0) / history.length;
  if (estimator === 'p20') return percentile(history, 0.2);
  if (estimator === 'min') return Math.min(...history);
  throw new Error(`unknown estimator ${estimator}`);
}

// The predictive alarm, computed before the outcome is known.
export function plannedAlarm(decision, scenario, params = PARAMS) {
  if (decision.state === 'ready' || decision.policy !== 'predict') return null;
  const predictedS = predict(scenario.history, decision.estimator);
  const alarmS = Math.max(0, predictedS - params.recoveryS[decision.state] - decision.marginMs / 1000);
  return { predictedS, alarmS };
}

/**
 * Timeline (t=0: tool call starts, GPU goes idle; D: tool completes):
 *   low power [0, wake) → recovery [wake, wake+R) → ready until inference starts.
 * wake = scheduled alarm if it fires before D, else D (tool completion overrides a later alarm).
 * Inference starts at max(D, wake+R); anything after D is added latency.
 * Baseline: stay ready for [0, D].
 */
export function simulate(decision, scenario, params = PARAMS) {
  const D = scenario.actualToolS;
  const { state } = decision;
  const R = params.recoveryS[state];
  const plan = plannedAlarm(decision, scenario, params);
  let wakeS, wakeCause;
  if (state === 'ready') [wakeS, wakeCause] = [0, 'none'];
  else if (plan && plan.alarmS < D) [wakeS, wakeCause] = [plan.alarmS, 'alarm'];
  else [wakeS, wakeCause] = [D, 'completion'];
  const readyS = wakeS + R;
  const inferenceStartS = Math.max(D, readyS);
  const idleReadyS = Math.max(0, D - readyS);
  const energyJ = params.power[state] * wakeS + params.recoveryPowerW * R + params.power.ready * idleReadyS;
  const baselineJ = params.power.ready * D;
  return {
    toolEndS: D,
    predictedS: plan?.predictedS ?? null,
    alarmS: plan?.alarmS ?? null,
    wakeS, wakeCause, readyS, inferenceStartS, idleReadyS,
    energyJ, baselineJ,
    savedJ: baselineJ - energyJ,
    addedLatencyS: inferenceStartS - D,
  };
}

// Fill in the fixed parts of a situation and validate the visitor's choices.
export function normalizeDecision(situation, raw) {
  const state = situation.fixedState ?? raw.state;
  // A GPU that stays ready never sleeps, so it has no wake policy.
  const policy = state === 'ready' ? 'completion' : situation.fixedPolicy ?? raw.policy;
  if (!(state in STATES)) throw new Error(`bad state for ${situation.id}`);
  if (policy !== 'completion' && policy !== 'predict') throw new Error(`bad policy for ${situation.id}`);
  const d = { state, policy, estimator: null, marginMs: 0 };
  if (policy === 'predict' && state !== 'ready') {
    const m = Number(raw.marginMs ?? 0);
    if (!(raw.estimator in ESTIMATORS)) throw new Error(`bad estimator for ${situation.id}`);
    if (!Number.isInteger(m) || m < MARGIN_MS.min || m > MARGIN_MS.max || m % MARGIN_MS.step) {
      throw new Error(`bad margin for ${situation.id}`);
    }
    Object.assign(d, { estimator: raw.estimator, marginMs: m });
  }
  return d;
}

// Score a complete run. `decisions` is an array aligned with the activity's situations.
export function scoreRun(activityId, decisions, set = SCENARIO_SET, params = PARAMS) {
  const activity = ACTIVITIES[activityId];
  if (!activity) throw new Error('unknown activity');
  if (!Array.isArray(decisions) || decisions.length !== activity.situations.length) {
    throw new Error('decisions must cover every situation');
  }
  const results = activity.situations.map((sit, i) => {
    const decision = normalizeDecision(sit, decisions[i] ?? {});
    return { id: sit.id, decision, outcome: simulate(decision, set.scenarios[sit.id], params) };
  });
  const savedJ = results.reduce((a, r) => a + r.outcome.savedJ, 0);
  const baselineJ = results.reduce((a, r) => a + r.outcome.baselineJ, 0);
  const addedLatencyS = results.reduce((a, r) => a + r.outcome.addedLatencyS, 0);
  return {
    activity: activityId, results, savedJ, baselineJ, addedLatencyS,
    latencyBudgetS: activity.latencyBudgetS,
    withinBudget: addedLatencyS <= activity.latencyBudgetS + 1e-9,
  };
}
