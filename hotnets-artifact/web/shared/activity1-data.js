// Data for Activity 1. Power and clock values come from params.js, which marks each as
// measured, author-provided or placeholder.
import { PARAMS, WAKE_LEAD_S } from './params.js';

export const A1_DATA = {
  gpu: PARAMS.gpu,
  trueIdleW: PARAMS.power.trueIdle,
  maxClocks: PARAMS.clocksMHz.ready,
  settings: ['ready', 'sm', 'smMem'].map((key) => ({
    key,
    label: { ready: 'Default', sm: 'SM at minimum', smMem: 'SM + memory at minimum' }[key],
    clocks: PARAMS.clocksMHz[key],
    powerW: PARAMS.power[key],
  })),
  // Advance warning before work resumes that preserved performance in the authors' measurements.
  wakeLeadS: WAKE_LEAD_S,
};

// MEASURED workload results with reactive downscaling: lower frequencies during execution-idle,
// restore them when GPU activity returns. Percentages are as reported by the authors (computed
// from unrounded data); a test checks they agree with the rounded values here.
// Average power is over the full run; it is not execution-idle power and not energy saved.
export const MEASURED_IMPACT = {
  llm: {
    tab: 'LLM serving',
    trace: 'Azure Code trace',
    // Latency shown on the cost page for this workload (key into results).
    latency: { label: 'p50 response latency', key: 'p50S', pctKey: 'p50Pct' },
    results: {
      ready: { powerW: 99.6, p95S: 3.39, p50S: 0.33 },
      sm: { powerW: 82.1, powerPct: -18, p95S: 3.65, p95Pct: 8, p50S: 0.51, p50Pct: 55 },
      smMem: { powerW: 57.9, powerPct: -41, p95S: 6.25, p95Pct: 84, p50S: 1.34, p50Pct: 306 },
    },
  },
  agent: {
    tab: 'Web agent',
    trace: 'WebArena',
    latency: { label: 'p50 task-completion latency', key: 'p50S', pctKey: 'p50Pct' },
    results: {
      ready: { powerW: 151.6, p95S: 124.89, p50S: 14.92 },
      sm: { powerW: 132.1, powerPct: -13, p95S: 130.31, p95Pct: 4, p50S: 15.69, p50Pct: 5 },
      smMem: { powerW: 116.6, powerPct: -23, p95S: 139.86, p95Pct: 12, p50S: 18.18, p50Pct: 22 },
    },
  },
};
