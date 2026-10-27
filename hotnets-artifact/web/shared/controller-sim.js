// "Build your controller" simulation on a real coding-agent trace. Pure functions, no UI.
// Mirrors simulate() in trace-analysis/extract_controller_trace.py (a test checks they agree).
//
// For each execution-idle period (end of one inference → start of the next):
//   • the controller downscales at idle start and schedules a wake at predicted − lead time;
//   • if the prediction minus the lead time is ≤ 0 (or there is no history), it stays at default;
//   • energy saved = measured power above the downscaled power, integrated while downscaled;
//   • added latency = any part of the wake-up still running when work resumes.
// Predictions use only idle periods that already finished (except the "perfect" reference).
import { PARAMS, WAKE_LEAD_S } from './params.js';

export const SETTINGS = {
  none: { label: 'Default', note: `${PARAMS.power.ready} W while idle · no wake-up delay` },
  sm: { label: 'SM at minimum', powerW: PARAMS.power.sm, leadS: WAKE_LEAD_S.sm },
  smMem: { label: 'SM + memory at minimum', powerW: PARAMS.power.smMem, leadS: WAKE_LEAD_S.smMem },
};

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

export const RECENT_N = 8; // like Linux's menu cpuidle governor, which tracks the last 8 idle intervals
export const POLICIES = {
  reactive: { label: 'Wake when work arrives', note: 'What a utilization-only controller can do.' },
  recent: { label: `Average of the last ${RECENT_N} idle periods`, note: 'Linux menu CPU-idle governor. Ignores tool type.' },
  toolMean: { label: 'Average idle time of this tool' },
  toolMax: { label: 'Longest idle time of this tool' },
  oracle: { label: 'Perfect prediction', note: 'Reference only: knows the future.' },
};

// Predicted idle length for period i, or null when there is no usable history.
export function predict(policy, idle, i) {
  if (policy === 'reactive') return Infinity;
  if (policy === 'oracle') return idle[i].durS;
  const past = policy === 'recent'
    ? idle.slice(Math.max(0, i - RECENT_N), i)
    : idle.slice(0, i).filter((p) => p.tool === idle[i].tool);
  if (!past.length) return null;
  const xs = past.map((p) => p.durS);
  return { recent: mean, toolMean: mean, toolMax: (v) => Math.max(...v) }[policy](xs);
}

export function simulateController(trace, setting, policy) {
  const base = { savedJ: 0, addedLatencyS: 0, downscaled: 0, late: 0 };
  if (setting !== 'none') {
    const { powerW, leadS } = SETTINGS[setting];
    trace.idle.forEach((p, i) => {
      const pred = predict(policy, trace.idle, i);
      if (pred == null || pred - leadS <= 0) return;
      const wake = Math.min(pred - leadS, p.durS);
      const n = Math.floor(wake / trace.sampleS);
      for (let k = 0; k < n && k < p.powerW.length; k++) base.savedJ += Math.max(0, p.powerW[k] - powerW) * trace.sampleS;
      const late = Math.max(0, wake + leadS - p.durS);
      base.addedLatencyS += late;
      base.downscaled += 1;
      if (late > 0) base.late += 1;
    });
  }
  return {
    ...base,
    energySavedPct: (100 * base.savedJ) / trace.totalEnergyJ,
    addedLatencyPct: (100 * base.addedLatencyS) / trace.totalS,
  };
}
