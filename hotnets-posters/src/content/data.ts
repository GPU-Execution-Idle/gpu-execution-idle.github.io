// Numbers behind the answer figures. Each block notes where it comes from; nothing is estimated.

// True idle vs. execution-idle power (W), measured with nvidia-smi.
// Source: hotnets-video/assets/power_measurements.csv (data-center and workstation GPUs only).
export const IDLE_POWER = [
  { gpu: 'B200', trueIdle: 138, execIdle: 190 },
  { gpu: 'H100', trueIdle: 69, execIdle: 111 },
  { gpu: 'L40S', trueIdle: 35, execIdle: 83 },
  { gpu: 'A100', trueIdle: 58, execIdle: 90 },
  { gpu: 'A6000', trueIdle: 34, execIdle: 103 },
  { gpu: '6000 Ada', trueIdle: 27, execIdle: 88 },
];

// Execution-idle by setting: share of time (%) and ideal energy savings (%), with the GPU measured on.
// Source: the updated characterization table (serving and agent workloads). The WebArena row (L40S)
// was supplied by the authors in Nov 2026 for the poster; BrowseComp and WideSearch are the table's B200 rows.
export const EXEC_IDLE = {
  serving: { label: 'Bursty serving', rows: [
    { name: 'Azure Chat', gpu: 'L40S', frac: 19.6, savings: 9.7 },
    { name: 'Azure Code', gpu: 'L40S', frac: 62.9, savings: 42.3 },
    { name: 'BurstGPT Chat', gpu: 'L40S', frac: 68.4, savings: 35.6 },
    { name: 'Qwen Chat', gpu: 'L40S', frac: 9.9, savings: 4.0 },
    { name: 'Qwen Reason', gpu: 'L40S', frac: 16.8, savings: 5.4 },
  ] },
  agent: { label: 'Agentic workloads', rows: [
    { name: 'WebArena', gpu: 'L40S', frac: 64.3, savings: 34.4 },
    { name: 'BrowseComp', gpu: 'B200', frac: 47.2, savings: 22.9 },
    { name: 'WideSearch', gpu: 'B200', frac: 29.5, savings: 12.1 },
  ] },
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
