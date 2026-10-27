// deno test tests/
import { assert, assertEquals, assertAlmostEquals, assertThrows } from 'jsr:@std/assert@1';
import { simulate, predict, percentile, scoreRun, plannedAlarm } from '../web/shared/sim.js';
import { PARAMS } from '../web/shared/params.js';
import { ACTIVITIES } from '../web/shared/activities.js';
import { SCENARIO_SET } from '../web/shared/scenarios.generated.js';

const sc = (D, history = [1, 2, 3, 4, 5]) => ({ actualToolS: D, history, nextInferenceS: 1 });
const R = PARAMS.recoveryS.smMem;

Deno.test('every activity situation exists and has history', () => {
  for (const a of Object.values(ACTIVITIES)) for (const s of a.situations) {
    const scen = SCENARIO_SET.scenarios[s.id];
    assert(scen, s.id);
    assert(scen.history.length >= 3, s.id);
  }
});

Deno.test('percentile and estimators', () => {
  assertEquals(percentile([5, 1, 3], 0.5), 3);
  assertAlmostEquals(percentile([1, 2, 3, 4, 5], 0.2), 1.8);
  assertEquals(predict([1, 2, 3], 'mean'), 2);
  assertEquals(predict([4, 2, 3], 'min'), 2);
});

Deno.test('stay ready saves nothing and adds no latency', () => {
  const o = simulate({ state: 'ready', policy: 'completion' }, sc(2));
  assertAlmostEquals(o.savedJ, 0);
  assertEquals(o.addedLatencyS, 0);
});

Deno.test('completion wake adds exactly the recovery time', () => {
  const o = simulate({ state: 'smMem', policy: 'completion' }, sc(2));
  assertAlmostEquals(o.addedLatencyS, R);
  assertEquals(o.wakeCause, 'completion');
});

Deno.test('early alarm: no latency, GPU waits ready', () => {
  // mean = 3; alarm = 3 - R - 0; tool takes 10 s.
  const o = simulate({ state: 'smMem', policy: 'predict', estimator: 'mean', marginMs: 0 }, sc(10));
  assertEquals(o.wakeCause, 'alarm');
  assertAlmostEquals(o.alarmS, 3 - R);
  assertEquals(o.addedLatencyS, 0);
  assertAlmostEquals(o.idleReadyS, 10 - 3);
});

Deno.test('tool completion overrides a later alarm', () => {
  const o = simulate({ state: 'smMem', policy: 'predict', estimator: 'mean', marginMs: 0 }, sc(1));
  assertEquals(o.wakeCause, 'completion');
  assertAlmostEquals(o.addedLatencyS, R);
});

Deno.test('alarm during the last stretch: partial latency', () => {
  const o = simulate({ state: 'smMem', policy: 'predict', estimator: 'mean', marginMs: 0 }, sc(2.9));
  assertAlmostEquals(o.addedLatencyS, 3 - 2.9);
});

Deno.test('margin moves the alarm earlier; alarm never negative', () => {
  const d = { state: 'smMem', policy: 'predict', estimator: 'min', marginMs: 500 };
  assertEquals(plannedAlarm(d, sc(5, [0.1, 0.2, 0.3])).alarmS, 0);
});

Deno.test('scoring rejects bad decisions and enforces fixed choices', () => {
  assertThrows(() => scoreRun('a1', []));
  assertThrows(() => scoreRun('a2', ACTIVITIES.a2.situations.map(() => ({ policy: 'predict', estimator: 'mean', marginMs: 33 }))));
  // a2 fixes smMem for early situations even if the client says 'ready'.
  const run = scoreRun('a2', ACTIVITIES.a2.situations.map(() => ({ state: 'ready', policy: 'completion' })));
  assertEquals(run.results[0].decision.state, 'smMem');
  assertEquals(run.results.at(-1).decision.state, 'ready');
});

Deno.test('scenario export only exposes past observations', async () => {
  // History values must all come from calls that ended before this call started (checked in Python too).
  const csv = await Deno.readTextFile(new URL('../trace-analysis/fixtures/synthetic_trace.csv', import.meta.url));
  const rows = csv.trim().split('\n').slice(1).map((l) => l.split(','));
  for (const s of Object.values(SCENARIO_SET.scenarios)) {
    const [, sess, seq] = s.source.match(/:(\w+)#(\d+)$/);
    const call = rows.find((r) => r[0] === sess && r[2] === seq);
    const start = +call[5];
    const past = rows.filter((r) => r[3] === 'tool' && r[4] === s.tool && +r[6] <= start).map((r) => +(+r[6] - +r[5]).toFixed(3));
    for (const h of s.history) assert(past.some((p) => Math.abs(p - h) < 0.002), `${s.id}: ${h} is not a past observation`);
  }
});

Deno.test('Activity 0 real executions match what the page claims', async () => {
  const { A0_DATA: D } = await import('../web/shared/activity0-data.js');
  for (const e of D.executions) {
    // Telemetry reads 0% for the whole stated window before "now"...
    assert(e.util.filter(([t]) => t > -D.zeroUtilForS && t <= 0).every(([, u]) => u === 0), e.task);
    // ...and the GPU was busy before that, so the observed pasts look alike.
    assert(e.util.some(([t, u]) => t < -D.zeroUtilForS - 0.5 && u > 50), e.task);
    assert(e.nextWorkInS > 0);
  }
  const picked = Object.values(D.guesses).map((g) => g.execution);
  assertEquals(new Set(picked).size, picked.length);
  for (const g of Object.values(D.guesses)) {
    const n = D.executions[g.execution].nextWorkInS;
    assert(n < g.band[0] || n > g.band[1], `${g.label}: counterexample inside the guess`);
  }
});

Deno.test('Activity 1 measured impact: stated percentages match the values', async () => {
  const { MEASURED_IMPACT } = await import('../web/shared/activity1-data.js');
  for (const w of Object.values(MEASURED_IMPACT)) {
    const base = w.results.ready;
    for (const k of ['sm', 'smMem']) {
      const r = w.results[k];
      assert(Math.abs(100 * (r.powerW / base.powerW - 1) - r.powerPct) <= 1, `${w.tab} ${k} power`);
      assert(Math.abs(100 * (r.p95S / base.p95S - 1) - r.p95Pct) <= 1, `${w.tab} ${k} p95`);
      if (r.p50S != null) assert(Math.abs(100 * (r.p50S / base.p50S - 1) - r.p50Pct) <= 1, `${w.tab} ${k} p50`);
    }
  }
});

Deno.test('controller simulation matches the trace exporter, for every job', async () => {
  const { CONTROLLER_TRACES } = await import('../web/shared/controller-trace.generated.js');
  const { simulateController } = await import('../web/shared/controller-sim.js');
  for (const T of CONTROLLER_TRACES) {
    for (const [key, [energy, latency]] of Object.entries(T.expected)) {
      const [setting, policy] = key.split('/');
      const r = simulateController(T, setting, policy);
      assertAlmostEquals(r.energySavedPct, energy, 2e-3, `${T.task} ${key}`);
      assertAlmostEquals(r.addedLatencyPct, latency, 2e-3, `${T.task} ${key}`);
    }
    const none = simulateController(T, 'none', 'toolMax');
    assertEquals([none.energySavedPct, none.addedLatencyPct], [0, 0]);
  }
});

Deno.test('every setting/predictor combination gives a distinguishable result', async () => {
  const { CONTROLLER_TRACES } = await import('../web/shared/controller-trace.generated.js');
  const { simulateController, POLICIES } = await import('../web/shared/controller-sim.js');
  for (const T of CONTROLLER_TRACES) {
    const shown = ['sm', 'smMem'].flatMap((s) => Object.keys(POLICIES).map((p) => {
      const r = simulateController(T, s, p);
      return `${r.energySavedPct.toFixed(1)}/${r.addedLatencyPct.toFixed(1)}`;
    }));
    assertEquals(new Set([...shown, '0.0/0.0']).size, shown.length + 1, `${T.task}: ${shown.join(' ')}`);
  }
});

Deno.test('controller predictions use only finished idle periods', async () => {
  const { predict } = await import('../web/shared/controller-sim.js');
  const idle = [{ tool: 'a', durS: 1 }, { tool: 'b', durS: 5 }, { tool: 'a', durS: 3 }, { tool: 'a', durS: 100 }];
  assertEquals(predict('toolMean', idle, 0), null);
  assertEquals(predict('toolMax', idle, 3), 3);  // never sees its own 100 s
  assertEquals(predict('recent', idle, 2), 3);   // mean of 1 and 5
});
