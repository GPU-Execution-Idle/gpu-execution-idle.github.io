// Data for Activity 0.
// Part 1: measured idle power. Part 2: three REAL executions from a mini-SWE-bench run on an
// L40S, extracted by trace-analysis/extract_a0_examples.py (only recorded timestamps used).
import { IDLE_POWER } from './params.js';
import { A0_TRACES } from './activity0-traces.generated.js';

const gpu = 'L40S';
const measured = IDLE_POWER.find((g) => g.gpu === gpu);

// "cd /testbed && npm run build 2>&1 | tail -30" → "npm run build"; paths shortened to file names.
const shortCommand = (cmd) => cmd.replace(/^cd \S+ && /, '').split(/ 2>&1| \|/)[0]
  .replace(/ -[-\w]*=?"[^"]*"/g, '').replace(/ -q\b/g, '').replace(/\S*\/(\S+)/g, '$1').trim();

const X = A0_TRACES.zeroUtilForS;
// Plain-language name of each operation (what the agent's tool call was doing).
const OPERATIONS = {
  'fmtlib__fmt-3248': 'Build project',           // make -j4
  'jekyll__jekyll-9141': 'Run site tests',       // ruby test/test_site.rb
  'fastlane__fastlane-19207': 'Run ZIP tests',   // rspec zip_spec.rb
};
const executions = A0_TRACES.executions.map((e) => ({
  ...e, label: shortCommand(e.command), operation: OPERATIONS[e.task] ?? shortCommand(e.command),
}));

// Guess bands in seconds from now. For each guess, show a real execution whose next work
// falls outside the band, using each execution once.
const bands = {
  less: { label: `Less than ${X} seconds`, band: [0, X] },
  about: { label: `About ${X} seconds`, band: [X * 0.67, X * 1.33] },
  more: { label: `More than ${X} seconds`, band: [X, Infinity] },
};
const keys = Object.keys(bands);
const outside = (key, e) => e.nextWorkInS < bands[key].band[0] || e.nextWorkInS > bands[key].band[1];
const perms = (xs) => (xs.length ? xs.flatMap((x) => perms(xs.filter((y) => y !== x)).map((p) => [x, ...p])) : [[]]);
const match = perms(executions.map((_, i) => i)).find((p) => keys.every((k, j) => outside(k, executions[p[j]])));
if (!match) throw new Error('no one-to-one counterexample per guess; pick other traces');
keys.forEach((k, j) => { bands[k].execution = match[j]; });

export const A0_DATA = {
  power: {
    gpu,
    trueIdleW: measured.trueIdle,  // no application loaded
    execIdleW: measured.execIdle,  // vLLM loaded, waiting for requests
    status: 'measured',            // 'measured' or 'placeholder'; the UI labels it
  },
  source: A0_TRACES.source,
  zeroUtilForS: X,
  pastS: A0_TRACES.pastS,
  executions,
  guesses: bands,
};
