// Power / recovery model parameters. Replace PLACEHOLDER values with measurements.
// Units: watts (W) and seconds (s).

// MEASURED wake-up lead time: how far ahead of resuming work the GPU had to be woken from
// minimum frequencies for application performance to be preserved in the authors'
// measurements. NOT a clock-transition duration and NOT the latency added when waking late.
export const WAKE_LEAD_S = { sm: 0.26, smMem: 0.32 };

export const PARAMS = {
  gpu: 'L40S',
  power: {
    trueIdle: 35,  // MEASURED (paper Fig.: true idle, no app loaded)
    ready: 83,     // MEASURED (paper Fig.: execution-idle, vLLM loaded)
    sm: 60,        // AUTHOR-PROVIDED: SM clocks downscaled, memory clock unchanged
    smMem: 35,     // AUTHOR-PROVIDED: SM and memory clocks downscaled (= true idle)
  },
  // Activity 2's wake-up delay per state. Its simplified model charges this as latency when the
  // GPU wakes late; values reuse the measured lead times above.
  recoveryS: {
    ready: 0,
    sm: WAKE_LEAD_S.sm,
    smMem: WAKE_LEAD_S.smMem,
  },
  recoveryPowerW: 83, // PLACEHOLDER: power drawn while clocks ramp back up
  // Clock settings per state (MHz). PLACEHOLDER: L40S spec maxima and nominal minimum
  // clocks; replace with the clocks actually set and read back (nvidia-smi -q -d CLOCK).
  clocksMHz: {
    ready: { sm: 2520, mem: 9001 },
    sm: { sm: 210, mem: 9001 },
    smMem: { sm: 210, mem: 405 },
  },
  measured: ['power.trueIdle', 'power.ready'],
  authorProvided: ['power.sm', 'power.smMem', 'WAKE_LEAD_S'],
};

// Measured idle power across GPUs (paper figure; same data as the pitch video).
export const IDLE_POWER = [
  { gpu: 'B200', category: 'Datacenter', trueIdle: 138, execIdle: 190 },
  { gpu: 'H100', category: 'Datacenter', trueIdle: 69, execIdle: 111 },
  { gpu: 'L40S', category: 'Datacenter', trueIdle: 35, execIdle: 83 },
  { gpu: 'A100', category: 'Datacenter', trueIdle: 58, execIdle: 90 },
  { gpu: 'A6000', category: 'Workstation', trueIdle: 34, execIdle: 103 },
  { gpu: 'RTX 6000 Ada', category: 'Workstation', trueIdle: 27, execIdle: 88 },
  { gpu: 'GB10', category: 'Workstation', trueIdle: 4, execIdle: 11 },
  { gpu: 'RTX 5090', category: 'Consumer', trueIdle: 13, execIdle: 38 },
  { gpu: 'RTX 4070', category: 'Consumer', trueIdle: 9, execIdle: 22 },
];
