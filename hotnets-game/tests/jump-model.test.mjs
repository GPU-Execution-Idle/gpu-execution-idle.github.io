import assert from 'node:assert/strict';
import { DATA } from '../web/data.js';
import { JumpGame, predictionRange, WORK_SECONDS, REACTION_S } from '../web/jump-model.js';
import { evaluate, gaps } from '../web/sim.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const until=(g,p)=>{for(let n=0;n<10000;n++){if(p())return;g.step(.02);}throw new Error('State deadline');};
const first=predictionRange(DATA,0);assert.equal(first.count,16);near(first.low,10.096500);near(first.high,15.017000);
for(let i=0;i<DATA.requests.length-1;i++){const r=predictionRange(DATA,i),t=DATA.requests[i+1].arrival;assert.ok(r.lo<=t&&t<=r.hi,`arrival ${i+1} outside its predicted range`);}
const changed=structuredClone(DATA);for(let i=1;i<changed.requests.length;i++)changed.requests[i].arrival+=1000;
assert.deepEqual(predictionRange(changed,0),first,'forecast must not depend on future work');
const capped=predictionRange({history:[-10000,...Array.from({length:20},(_,i)=>(i-20)*2)],requests:[{arrival:0}]},0);
assert.equal(capped.count,16);near(capped.low,2);near(capped.high,2);
const g=new JumpGame(DATA);assert.equal(g.phase,'waiting');assert.equal(g.predictions.length,1);
g.action();const w=g.wakes[0];g.step(.1);assert.ok(g.height>0&&g.height<1);g.action();near(g.wakes[0],w);
until(g,()=>g.phase==='work');assert.equal(g.matched,1);assert.equal(g.arrivals.length,1);near(g.height,1);
const frozen={...g.predictions[0]},workStart=g.visual;g.step(.5);assert.equal(g.phase,'work');assert.deepEqual(g.predictions[0],frozen,'prediction must persist without changing after observation');
until(g,()=>g.phase==='fall');assert.ok(g.visual-workStart>=WORK_SECONDS-.001);until(g,()=>g.phase==='between');near(g.height,0);
const paused=g.now;g.step(100);near(g.now,paused);assert.equal(g.index,0,'only first inference pauses');
g.action();assert.equal(g.index,1);assert.equal(g.phase,'waiting');assert.equal(g.wakes[1],null,'continue must not also jump');
const indices=new Set(),phases=new Set();
for(let n=0;n<10000&&g.phase!=='results';n++){indices.add(g.index);phases.add(g.phase);g.step(.02);assert.notEqual(g.phase,'between','later intervals cannot pause');}
assert.equal(g.phase,'results');assert.equal(g.index,4);assert.deepEqual([...indices],[1,2,3,4]);assert(phases.has('queue'));assert(phases.has('work'));assert.equal(g.predictions.length,5);assert.equal(g.events.length,5);assert.equal(g.arrivals.length,5);assert.equal(g.totals.player.readyOnTime,1);assert.deepEqual(g.predictions[0],frozen);
g.action();assert.equal(g.phase,'waiting');assert.equal(g.matched,0);assert.equal(g.events.length,0);assert.equal(g.predictions.length,1);assert(g.wakes.every(x=>x===null));
const partial=new JumpGame(DATA);until(partial,()=>partial.now>=partial.gap.arrival-.16);partial.action();until(partial,()=>partial.phase==='queue');assert.ok(partial.gap.delay>0&&partial.gap.delay<DATA.requests[1].reactiveDelay);
const late=new JumpGame(DATA);until(late,()=>late.phase==='queue');const ev=late.events[0];near(ev.start,late.arrivals[0].t);assert.ok(ev.slowEnd>ev.start&&ev.end-ev.slowEnd>=WORK_SECONDS-1e-9,'late work starts at arrival and is longer');
until(late,()=>late.phase==='work');assert.equal(late.events.length,1,'late work is not pushed twice');
// Waking on arrival must stay the most energy-saving strategy (it only costs latency), as in the measured runs.
{const R=evaluate(DATA,'reactive'),G=gaps(DATA);for(let i=0;i<G.length;i++)for(let lead=.01;lead<=4;lead+=.01){const w=Array(G.length).fill(null);w[i]=G[i].arrival-lead;assert.ok(evaluate(DATA,'player',w).energy>=R.energy-1e-9,`wake ${lead.toFixed(2)} s early in wait ${i} beats reactive`);}}
// Pressing at, or up to REACTION_S after, the start of every bracket is always in time.
for(const late of [0,.25,REACTION_S-.02]){const s=new JumpGame(DATA);for(let n=0;n<20000&&s.phase!=='results';n++){if(s.phase==='between')s.action();if(s.canJump&&s.now>=s.range.wakeFrom+late-1e-9)s.action();s.step(.01);}
assert.equal(s.phase,'results');assert.equal(s.totals.player.readyOnTime,5,`press ${late} s after bracket start must be in time for every request`);assert.equal(s.totals.player.addedS,0);}
// The frequency line must always reach back past the visible window (it used to break once its first point aged out).
{const s=new JumpGame(DATA);for(let n=0;n<4000&&s.phase!=='results';n++){if(s.phase==='between')s.action();s.step(.02);assert.ok(s.trail[0].t<=s.visual-20,`trail starts at ${s.trail[0].t} at visual ${s.visual}`);}}
console.log('PASS: trail always reaches the left edge; bracket-start press always in time; reactive is the energy minimum; late work starts at arrival with a reduced-frequency part; causal rolling range; every segment arrival inside its range; 16-interval cap; ramp and single press; persistent prediction history; work duration; exactly one pause; continuous remaining four requests; late/partial wake; automatic results; replay.');
