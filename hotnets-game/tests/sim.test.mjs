import assert from 'node:assert/strict';
import { DATA } from '../web/data.js';
import { evaluate, delayFor, gaps } from '../web/sim.js';

const N = DATA.requests.length - 1, L = DATA.wakeLeadS;
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, `${m}: ${a} != ${b}`);

// Always-high baseline never slows down and saves nothing.
const b = evaluate(DATA, 'baseline');
assert.equal(b.addedS, 0); near(b.savedPct, 0, 'baseline saving');

// Reactive pays every measured slowdown and is never ready on arrival.
const r = evaluate(DATA, 'reactive');
near(r.addedS, DATA.requests.slice(1).reduce((s, q) => s + q.reactiveDelay, 0), 'reactive delay');
assert.equal(r.readyOnTime, 0);

// Not pressing at all is the same as reactive.
const none = evaluate(DATA, 'player', Array(N).fill(null));
near(none.energy, r.energy, 'no press energy'); near(none.addedS, r.addedS, 'no press delay');

// Ideal has zero slowdown and beats every other zero-slowdown wake on energy.
const ideal = evaluate(DATA, 'ideal');
assert.equal(ideal.addedS, 0);
for (const extra of [0, .1, 1, 5]) {
  const p = evaluate(DATA, 'player', gaps(DATA).map(g => g.arrival - L - extra));
  assert.equal(p.addedS, 0); assert.ok(p.energy >= ideal.energy - 1e-9);
}

// A partial lead scales the measured slowdown linearly.
const g = { arrival: 10, reactiveDelay: 1 };
assert.equal(delayFor(g, null, L), 1); assert.equal(delayFor(g, 10, L), 1);
near(delayFor(g, 10 - L / 2, L), .5, 'half lead'); assert.equal(delayFor(g, 10 - L, L), 0);

console.log('PASS: baseline; reactive pays measured slowdowns; no press = reactive; ideal is the zero-slowdown minimum; partial lead.');
