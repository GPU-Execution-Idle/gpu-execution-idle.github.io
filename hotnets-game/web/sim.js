// Energy / latency model for "Wake the GPU!". Pure functions, no DOM.
// Times are trace seconds (request 0 arrives at t = 0). Power is normalized: high-clock idle = 1.
//
// Per gap (previous request ends -> next request arrives):
//   - The GPU drops to low power as soon as the previous request finishes (transition cost ignored;
//     it is the same for every strategy that downclocks).
//   - From the wake time w it draws ready (high-clock idle) power until the request arrives.
//   - Lead = arrival - w. Lead >= wakeLeadS: no slowdown. No wake before arrival: the request pays
//     its MEASURED reactive slowdown. 0 < lead < wakeLeadS: that slowdown scaled down linearly (modeled).
//   - Slowdown time (work running while clocks are still low) is charged at low power (modeled), so
//     waking on arrival stays the most energy-saving strategy, as in the measured runs; execution at
//     busy power (same for everyone).

export const STRATEGIES = ['baseline', 'reactive', 'player', 'ideal'];

export function gaps(data) {
  const out = [];
  let end = data.requests[0].arrival + data.requests[0].exec;
  for (let i = 1; i < data.requests.length; i++) {
    const prev = data.requests[i - 1], req = data.requests[i];
    out.push({
      index: i - 1,
      start: end,                                   // GPU becomes idle, assuming no slowdown so far
      arrival: req.arrival,                         // next request reaches the GPU
      hint: prev.hintAfter == null ? null : prev.arrival + prev.hintAfter,
      reactiveDelay: req.reactiveDelay,
      exec: req.exec,
    });
    end = req.arrival + req.exec;
  }
  return out;
}

// Slowdown for a wake at time w (null = no wake before arrival).
export function delayFor(gap, w, wakeLeadS) {
  if (w == null || w >= gap.arrival) return gap.reactiveDelay;
  const lead = gap.arrival - w;
  if (lead >= wakeLeadS) return 0;
  return gap.reactiveDelay * (1 - lead / wakeLeadS);
}

// wakes: array (one per gap) of wake times or null. 'baseline' ignores it (never downclocks).
export function evaluate(data, strategy, wakes = []) {
  const P = data.power, L = data.wakeLeadS;
  const reqs = data.requests;
  let energy = reqs[0].exec * P.busy, baseEnergy = reqs[0].exec * P.busy;
  let addedS = 0, readyOnTime = 0, earlyWasteS = 0;
  let end = reqs[0].arrival + reqs[0].exec;
  const perGap = [];
  gaps(data).forEach((g, i) => {
    const start = end;
    const idle = Math.max(0, g.arrival - start);
    // Always-high baseline on the undelayed schedule (g.start), the same for every strategy.
    baseEnergy += Math.max(0, g.arrival - g.start) * P.ready + g.exec * P.busy;
    let w = null;
    if (strategy === 'reactive') w = null;
    else if (strategy === 'ideal') w = Math.max(start, g.arrival - L);
    else if (strategy === 'player') w = wakes[i] == null ? null : Math.min(Math.max(wakes[i], start), g.arrival);
    let delay = 0, lowS = idle, readyS = 0;
    if (strategy === 'baseline') { lowS = 0; readyS = idle; }
    else {
      delay = delayFor(g, w, L);
      const wakeAt = w == null ? g.arrival : Math.min(w, g.arrival);
      lowS = wakeAt - start;
      readyS = g.arrival - wakeAt;
    }
    const waste = Math.max(0, readyS - L);
    energy += lowS * P.low + readyS * P.ready + delay * P.low + g.exec * P.busy;
    addedS += delay;
    if (delay === 0) readyOnTime += 1;
    earlyWasteS += strategy === 'baseline' ? 0 : waste;
    perGap.push({ start, arrival: g.arrival, hint: g.hint, wake: strategy === 'baseline' ? start : w, delay, lowS, readyS, waste });
    end = g.arrival + delay + g.exec;
  });
  // Compare every strategy over the same window, ending when the slowest possible run ends (last
  // request after its full measured slowdown). A run that finishes earlier idles for the rest:
  // at low power, or at high clocks for the always-high baseline.
  const last = reqs[reqs.length - 1], windowEnd = last.arrival + last.exec + last.reactiveDelay;
  baseEnergy += last.reactiveDelay * P.ready;
  energy += (windowEnd - end) * (strategy === 'baseline' ? P.ready : P.low);
  return {
    strategy, perGap, energy, baseEnergy,
    savedPct: 100 * (1 - energy / baseEnergy),
    addedS, readyOnTime, earlyWasteS, total: perGap.length,
  };
}

export function evaluateAll(data, playerWakes) {
  return Object.fromEntries(STRATEGIES.map(s => [s, evaluate(data, s, playerWakes)]));
}

// One-line assessment of the player's timing (shown on the results screen).
export function assess(all) {
  const p = all.player, n = p.total;
  const late = p.perGap.filter(g => g.delay > 0).length;
  const early = p.perGap.filter(g => g.delay === 0 && g.waste > 1).length;
  const keptOfIdeal = all.ideal.savedPct > 0 ? 100 * p.savedPct / all.ideal.savedPct : 0;
  if (late === n) return 'You never got ahead of a request, so every request paid the full wake-up slowdown: that is what reacting looks like.';
  if (late === 0 && early === 0) return `Near perfect: ready for all ${n} requests while keeping ${keptOfIdeal.toFixed(0)}% of the ideal savings.`;
  if (late === 0) return `Ready for every request, but you woke well ahead ${early} time${early > 1 ? 's' : ''}. The hint told you roughly when; waiting a bit longer after it would have saved more.`;
  return `${late === 1 ? 'One request' : `${late} requests`} came before you woke. The hint is a guide, not a promise, but every request you got ahead of skipped the wake-up slowdown.`;
}
