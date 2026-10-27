// deno run tests/explore.js: print every option's outcome per situation (design aid).
import { ACTIVITIES, STATES, ESTIMATORS } from '../web/shared/activities.js';
import { SCENARIO_SET } from '../web/shared/scenarios.generated.js';
import { simulate } from '../web/shared/sim.js';

for (const act of Object.values(ACTIVITIES)) {
  console.log(`\n== ${act.id} budget ${act.latencyBudgetS}s`);
  for (const sit of act.situations) {
    const sc = SCENARIO_SET.scenarios[sit.id];
    console.log(`-- ${sit.id} D=${sc.actualToolS}`);
    const states = sit.fixedState ? [sit.fixedState] : Object.keys(STATES);
    const policies = sit.fixedPolicy ? [[sit.fixedPolicy]] : [['completion'], ...Object.keys(ESTIMATORS).flatMap((e) => [0, 100, 200].map((m) => ['predict', e, m]))];
    for (const state of states) for (const [policy, estimator, marginMs] of policies) {
      const o = simulate({ state, policy, estimator, marginMs: marginMs ?? 0 }, sc);
      console.log(`  ${state.padEnd(6)} ${policy}${estimator ? `/${estimator}/${marginMs}` : ''}`.padEnd(32),
        `saved ${o.savedJ.toFixed(1).padStart(7)} J  lat ${(o.addedLatencyS * 1000).toFixed(0).padStart(4)} ms  wake ${o.wakeCause}`);
    }
  }
}
