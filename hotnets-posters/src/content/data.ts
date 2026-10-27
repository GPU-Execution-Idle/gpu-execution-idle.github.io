// Numbers behind the answer figures. Each block notes where it comes from; nothing is estimated.

// True idle vs. execution-idle power (W), measured with nvidia-smi.
// Source: hotnets-video/assets/power_measurements.csv (the paper's figure plus three more GPUs).
export const IDLE_POWER = [
  { gpu: 'B200', group: 'Data center', trueIdle: 138, execIdle: 190 },
  { gpu: 'H100', group: 'Data center', trueIdle: 69, execIdle: 111 },
  { gpu: 'L40S', group: 'Data center', trueIdle: 35, execIdle: 83 },
  { gpu: 'A100', group: 'Data center', trueIdle: 58, execIdle: 90 },
  { gpu: 'A6000', group: 'Workstation', trueIdle: 34, execIdle: 103 },
  { gpu: '6000 Ada', group: 'Workstation', trueIdle: 27, execIdle: 88 },
  { gpu: 'GB10', group: 'Workstation', trueIdle: 4, execIdle: 11 },
  { gpu: '5090', group: 'Consumer', trueIdle: 13, execIdle: 38 },
  { gpu: '4070', group: 'Consumer', trueIdle: 9, execIdle: 22 },
];

// Execution-idle by setting: share of time (%), p50/p95 length (s), ideal energy savings (%).
// Source: the updated characterization table (cluster, agent and serving workloads).
export const EXEC_IDLE = {
  cluster: { label: 'University cluster', note: 'Mixed GPUs', rows: [
    { name: 'Online serving', jobs: 1725, frac: 57.8, p50: 3, p95: 52, savings: 31.7 },
    { name: 'Batch inference', jobs: 2448, frac: 12.2, p50: 2, p95: 10, savings: 5.7 },
    { name: 'Training', jobs: 5016, frac: 10.9, p50: 2, p95: 14, savings: 4.5 },
    { name: 'Others', jobs: 2602, frac: 11.2, p50: 2, p95: 5, savings: 4.7 },
  ] },
  agent: { label: 'Agentic workloads', note: 'B200', rows: [
    { name: 'BrowseComp', frac: 47.2, p50: 0.94, p95: 2.4, savings: 22.9 },
    { name: 'WideSearch', frac: 29.5, p50: 1.0, p95: 2.2, savings: 12.1 },
    { name: 'Terminal-Bench', frac: 47.9, p50: 0.32, p95: 21.5, savings: 11.9 },
    { name: 'DeepSWE', frac: 42.5, p50: 0.99, p95: 6.2, savings: 13.6 },
  ] },
  serving: { label: 'Bursty serving', note: 'L40S', rows: [
    { name: 'Azure Chat', frac: 19.6, p50: 2, p95: 7, savings: 9.7 },
    { name: 'Azure Code', frac: 62.9, p50: 3, p95: 14, savings: 42.3 },
    { name: 'BurstGPT Chat', frac: 68.4, p50: 13, p95: 51.5, savings: 35.6 },
    { name: 'Qwen Chat', frac: 9.9, p50: 15, p95: 44.3, savings: 4.0 },
    { name: 'Qwen Reason', frac: 16.8, p50: 2, p95: 7.9, savings: 5.4 },
  ] },
};

// Agent concurrency on one H100: BrowseComp and DeepSWE at 1, 2, 4 and 6 concurrent agents.
// Source: the concurrency figure (execution-idle fraction, p90 slowdown, p90 KV-cache utilization).
export const CONCURRENCY = {
  levels: [1, 2, 4, 6],
  metrics: {
    idle: { label: 'Execution-idle time', unit: '%', browse: [45.5, 20.3, 3.9, 1.0], swe: [24.6, 5.9, 0.2, 0.0] },
    slowdown: { label: 'p90 task slowdown', unit: '×', browse: [1.0, 1.07, 1.17, 1.28], swe: [1.0, 1.11, 1.35, 3.43] },
    kv: { label: 'p90 KV-cache use', unit: '%', browse: [11.6, 17.3, 28.5, 42.3], swe: [20.7, 35.3, 59.6, 89.2] },
  },
};

// Reactive GPU-local control, change vs. Default (%). Source: paper Table 2.
export const REACTIVE = {
  llm: { label: 'LLM serving', latency: 'p50 request latency', sm: { power: -18, latency: 55 }, smMem: { power: -41, latency: 308 } },
  agent: { label: 'Web agent', latency: 'p50 task latency', sm: { power: -13, latency: 5 }, smMem: { power: -23, latency: 22 } },
};

// p95 wake cost on an L40S (ms): how early to wake to match Default. Source: paper §3.
export const WAKE_LEAD_MS = { sm: 260, smMem: 320 };


// Energy vs. p95 latency, normalized to Default (Azure Code trace, Qwen3-14B).
// Source: point positions read from the vector paper figure (energy_p95latency_scatter.pdf);
// changes use the paper text where it states them (−10%/+0.1%, −28%/+3.5%, −18%/+0.1%, +7.6%, +84.2%);
// the others are rounded from the figure.
export const TRADEOFF = [
  { setting: 'sm', kind: 'reactive', p95: 1.076, energy: 0.825, p95Txt: '+7.6%', energyTxt: '−18%' },
  { setting: 'smMem', kind: 'reactive', p95: 1.842, energy: 0.583, p95Txt: '+84.2%', energyTxt: '−42%' },
  { setting: 'sm', kind: 'netwake', p95: 1.001, energy: 0.896, p95Txt: '+0.1%', energyTxt: '−10%' },
  { setting: 'smMem', kind: 'netwake', p95: 1.035, energy: 0.715, p95Txt: '+3.5%', energyTxt: '−28%' },
  { setting: 'sm', kind: 'margin', p95: 1.0, energy: 0.944, p95Txt: '≈0%', energyTxt: '−6%' },
  { setting: 'smMem', kind: 'margin', p95: 1.001, energy: 0.819, p95Txt: '+0.1%', energyTxt: '−18%' },
] as const;
