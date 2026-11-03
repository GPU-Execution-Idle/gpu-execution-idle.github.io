import { evaluate, evaluateAll } from './sim.js';

export const RAMP_SECONDS = 1.1;  // a whole Low-to-High ramp takes this long (real time); a ramp cut short by arrival keeps this rate
export const WORK_SECONDS = 2.4;
// Waits play faster than the trace (the ramp and work have their own display times): a little for the first
// request, which teaches the game, more for the other four, so a run takes about 12 s + 30 s.
export const waitSpeed = i => (i === 0 ? 1.4 : 3);
// On-screen allowances, the same for every request; in trace seconds they scale with that request's wait speed.
export const REACTION_SCREEN_S = .5;  // how late after the bracket starts a press may come and still be in time
// In time, the wait at high frequency before the work arrives grades the wake: at most PERFECT_SCREEN_S is
// "perfect", at most GOOD_SCREEN_S is "good", longer is "too early".
export const PERFECT_SCREEN_S = .5;
export const GOOD_SCREEN_S = 1.5;
export const reactionS = i => REACTION_SCREEN_S * waitSpeed(i);
export const perfectS = i => PERFECT_SCREEN_S * waitSpeed(i);
export const goodS = i => GOOD_SCREEN_S * waitSpeed(i);

// Linear-interpolation percentile (same as tools/build_data.py).
export function quantile(values, q) {
  const o = [...values].sort((a, b) => a - b), x = (o.length - 1) * q, l = Math.floor(x), h = Math.ceil(x);
  return o[l] + (o[h] - o[l]) * (x - l);
}

// At request i, only this request and older arrivals are observable. The range is the previous
// arrival + [lowQ, highQ] percentiles of the latest `window` intervals (default: the middle 40%,
// 30th-70th, of the latest 16). Short history is explicit in `count`.
export function predictionRange(data, i) {
  const { window = 16, lowQ = .3, highQ = .7 } = data.prediction ?? {};
  const arrivals = [...data.history, ...data.requests.slice(0, i + 1).map(r => r.arrival)].slice(-(window + 1));
  const intervals = arrivals.slice(1).map((t, j) => t - arrivals[j]);
  if (!intervals.length) return null;
  const low = quantile(intervals, lowQ), high = quantile(intervals, highQ);
  const lo = data.requests[i].arrival + low;
  // The bracket shown to the player starts one wake latency plus a human reaction allowance before the
  // earliest predicted arrival, so a press up to reactionS(i) after its start still finishes waking before
  // any arrival inside [lo, hi].
  return { low, high, count: intervals.length, lo, hi: data.requests[i].arrival + high, wakeFrom: lo - data.wakeLeadS - reactionS(i) };
}

export class JumpGame {
  constructor(data) { this.data = data; this.reset(); }
  reset() {
    this.index = 0; this.wakes = Array(this.data.requests.length - 1).fill(null);
    this.visual = 0; this.height = 0; this.trail = [{t:-30,h:0,index:0,state:'idle'},{t:0,h:0,index:0,state:'idle'}];
    this.events = []; this.arrivals = []; this.predictions = []; this.prepare();
  }
  prepare() {
    this.gap = evaluate(this.data, 'player', this.wakes).perGap[this.index];
    this.range = predictionRange(this.data, this.index);
    this.now = this.gap.start; this.height = 0; this.age = 0; this.phase = 'waiting';
    this.roundStart = this.visual;
    if (this.range) this.predictions.push({index:this.index, start:this.visual + (this.range.wakeFrom - this.now) / waitSpeed(this.index), end:this.visual + (this.range.hi - this.now) / waitSpeed(this.index)});
  }
  action() {
    if (this.phase === 'between') {
      this.index++; this.prepare();
      return;
    }
    if (this.phase === 'results') { this.reset(); return; }
    if (this.phase !== 'waiting' || this.wakes[this.index] != null) return;
    this.wakes[this.index] = this.now;
    this.gap = evaluate(this.data, 'player', this.wakes).perGap[this.index];
  }
  arrive() {
    this.gap = evaluate(this.data, 'player', this.wakes).perGap[this.index];
    const match = this.gap.delay === 0;
    const perfect = match && this.gap.waste <= perfectS(this.index), good = match && !perfect && this.gap.waste <= goodS(this.index);
    this.arrivals.push({t:this.visual, index:this.index, arrival:this.gap.arrival, match, perfect, good});
    this.age = 0; this.arrivedAt = this.visual;
    if (this.gap.delay > 0) {
      // A late wake does not postpone the work: it starts at arrival and runs at reduced frequency
      // ('queue' phase), so the work takes longer. The rest of the ramp plays exactly like an in-time
      // one (same rate, same slow motion), so every wake draws the same slope. The reduced-frequency
      // part covers the request's added latency at the scene's scale (trace delay / wait speed); its
      // label stays up through the work, so it is readable however short the part is.
      const slow = this.slowS = this.gap.delay / waitSpeed(this.index);
      this.phase = 'queue';
      this.events.push({start:this.visual, slowEnd:this.visual + slow, end:this.visual + slow + WORK_SECONDS, match:false, index:this.index});
    } else this.work();
  }
  work() {
    this.phase = 'work'; this.age = 0; this.height = 1;
    if (!this.events.some(e => e.index === this.index))
      this.events.push({start:this.visual, end:this.visual + WORK_SECONDS, match:true, index:this.index});
  }
  step(dt) {
    if (['between','results'].includes(this.phase) || dt <= 0) return;
    const L = this.data.wakeLeadS, w = this.wakes[this.index];
    // The wake transition is stretched causally, only after a player press: it takes RAMP_SECONDS of real
    // time. The whole scene plays in slow motion meanwhile (the screen clock slows by the same factor as
    // the trace clock), so the past and the coming bracket keep moving together instead of the future stalling.
    const ramping = (this.phase === 'waiting' && w != null && this.now < w + L - 1e-9) || (this.phase === 'queue' && this.height < 1);
    this.visual += ramping ? dt * (L / RAMP_SECONDS) / waitSpeed(this.index) : dt;
    if (this.phase === 'waiting') {
      this.now = Math.min(this.gap.arrival, this.now + dt * (ramping ? L / RAMP_SECONDS : waitSpeed(this.index)));
      this.height = w == null ? 0 : this.now >= w + L - 1e-9 ? 1 : Math.max(0, (this.now - w) / L);  // same threshold as `ramping`
      const prediction = this.predictions.find(p => p.index === this.index);
      if (prediction) {
        // Trace time ahead, drawn at the wait speed.
        prediction.start = this.visual + (this.range.wakeFrom - this.now) / waitSpeed(this.index);
        prediction.end = this.visual + (this.range.hi - this.now) / waitSpeed(this.index);
      }
      if (this.now >= this.gap.arrival) this.arrive();
    } else if (this.phase === 'queue') {
      this.height = Math.min(1, this.height + dt / RAMP_SECONDS);  // the in-time ramp rate (real time)
      const f = Math.min(1, (this.visual - this.arrivedAt) / this.slowS);
      this.now = this.gap.arrival + this.gap.delay * f;
      if (f === 1 && this.height === 1) this.work();
    } else if (this.phase === 'work') {
      this.age += dt;
      const f = Math.min(1, this.age / WORK_SECONDS);
      this.now = this.gap.arrival + this.gap.delay + this.data.requests[this.index + 1].exec * f;
      if (f === 1) { this.phase = 'fall'; this.age = 0; }
    } else if (this.phase === 'fall') {
      // The ramp down spans the same screen time as a ramp up (wake latency / wait speed), so it draws the same steep step.
      this.age += dt; this.height = Math.max(0, 1 - this.age / this.fallS());
      if (this.height === 0) {
        if (this.index === 0) this.phase = 'between';
        else if (this.index === this.wakes.length - 1) this.phase = 'results';
        else { this.index++; this.prepare(); }
      }
    }
    this.trail.push({t:this.visual,h:this.height,index:this.index,state:this.state});
    // Drop points older than 35 s, but keep the last one before the cutoff so the line still enters
    // from the left edge (dropping it left a gap once the initial point aged out).
    const cut = this.visual - 35;
    let k = 0; while (k + 1 < this.trail.length && this.trail[k + 1].t < cut) k++;
    if (k) this.trail = this.trail.slice(k);
  }
  // What the GPU is doing now, from observable facts only: high while still waiting burns energy
  // (premature wake); ramping after work arrived hurts latency (late wake).
  get state() {
    if (this.phase === 'queue') return 'late';
    if (this.phase === 'work') return 'work';
    if (this.phase === 'fall') return 'fall';
    if (this.phase === 'waiting') return this.height >= 1 ? 'burn' : this.height > 0 ? 'ramp' : 'idle';
    return 'idle';
  }
  get totals() { return evaluateAll(this.data, this.wakes); }
  // Waiting at high frequency longer than a good wake allows (shown as "Too early!").
  get tooEarly() { const w = this.wakes[this.index]; return this.phase === 'waiting' && w != null && this.now - (w + this.data.wakeLeadS) > goodS(this.index); }
  fallS() { return this.data.wakeLeadS / waitSpeed(this.index); }
  get canJump() { return this.phase === 'waiting' && this.wakes[this.index] == null; }
  get matched() { return this.arrivals.filter(a => a.match).length; }
}
