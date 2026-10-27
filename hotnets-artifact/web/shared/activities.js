// Rules for the situation-based activity. Every visitor gets exactly these situations, in this order.
import { SCENARIO_SET } from './scenarios.generated.js';

export const RULES_VERSION = 'r2';
// Saved runs and attempt history are keyed to the scenario set and rules, so results are only
// compared on identical situations. Bump RULES_VERSION when rules change (this resets them).
export const SCENARIO_KEY = `${SCENARIO_SET.version}/${RULES_VERSION}`;

export const STATES = {
  ready: { label: 'Stay ready', short: 'Ready' },
  sm: { label: 'Downscale SM only', short: 'SM↓' },
  smMem: { label: 'Downscale SM + memory', short: 'SM+Mem↓' },
};

export const ESTIMATORS = {
  mean: 'Historical mean',
  p20: 'Historical p20',
  min: 'Historical minimum',
};

export const MARGIN_MS = { min: 0, max: 500, step: 50 };

export const ACTIVITIES = {
  a2: {
    id: 'a2',
    title: 'Choose the wake policy',
    latencyBudgetS: 0.4,
    situations: [
      { id: 'a2-browse-typical', fixedState: 'smMem' },
      { id: 'a2-browse-tail', fixedState: 'smMem' },
      { id: 'a2-browse-fast', fixedState: 'smMem' },
      { id: 'a2-tests', fixedState: 'smMem' },
      { id: 'a2-exec-combined' }, // final: power state is also the visitor's choice
    ],
  },
};
