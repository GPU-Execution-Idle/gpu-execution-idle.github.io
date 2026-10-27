# Trace analysis → scenario data

Everything the activities show about tool calls comes from `web/shared/scenarios.generated.js`,
which this directory produces. **Today it is built from a synthetic fixture**, and the site
shows a "synthetic placeholders" banner while `selection.json` has `"synthetic": true`.

```bash
python3 make_synthetic_fixture.py     # (re)create fixtures/synthetic_trace.csv (seeded, made-up)
python3 build_scenarios.py --suggest  # table of candidate tool calls: actual vs. mean / p20 / min
python3 build_scenarios.py            # export the calls listed in selection.json
deno run ../tests/explore.js          # every option's outcome per situation (balance check)
deno test --allow-read=.. ../tests/   # includes a past-only check on the exported history
```

## Trace format

One CSV row per inference or tool call, all on **one shared clock** (seconds):

| column | meaning |
|---|---|
| `session_id` | agent session / trajectory |
| `agent` | e.g. `web_agent`, `coding_agent` |
| `seq` | order within the session (inference and tool calls alternate) |
| `kind` | `inference` or `tool` |
| `name` | tool name (`browser.fetch`, …) or `llm.decode` |
| `start_s`, `end_s` | start / end timestamps |

## Causality rule

A scenario's `history` contains only durations of **same-name tool calls that ended at or
before the current call started**: what a controller could have observed. The call's own
duration (`actualToolS`) and the following inference stay hidden in the UI until the visitor
locks in. Predictors in `web/shared/sim.js` see only `history`.

## TODOs

- [ ] **TODO 1: Import real timestamps.** Write `import_<source>.py` that converts raw logs
  (vLLM request logs, agent-framework tool spans, packet captures, …) into the CSV above.
  Put raw data in `raw/` (git-ignored). Decisions to make:
  - Which clock to use, and how to align GPU/vLLM and agent/tool clocks.
  - Whether `start_s` of an inference means request arrival or first scheduled token.
  - Whether "history" is per tool name, per (agent, tool), or per tool + argument class.
- [ ] **TODO 2: Select representative scenarios.** Use `--suggest` and pick 4–5 calls per
  activity covering short tools (stay ready wins), long tools (deep sleep wins), typical
  calls (prediction wins) and tails/early returns (prediction fails or completion overrides).
  Record *why* each was chosen in `selection.json` (`story`). Then check balance with
  `tests/explore.js`: the latency budget in `web/shared/activities.js` should force a trade-off.
- [ ] **TODO 3: Export.** Set `"version"` (e.g. `real-v1`) and `"synthetic": false` in
  `selection.json`, run `build_scenarios.py --trace raw/<file>.csv`. Changing the version
  resets saved Activity 2 runs and attempt history, which are only compared on identical scenarios.
- [x] **Activity 0, Part 2 uses real executions.** `extract_a0_examples.py <job-dir>` reads the
  mini-SWE-bench L40S run in `../trace/extracted/` (git-ignored, 8.7 GB): per-step `gpu` and
  `external.tool.bash` phases from `*/instrumentation/event.jsonl`, plus `gpu_telemetry.csv`
  (100 ms, local time UTC−4, verified against the phases). It writes
  `web/shared/activity0-traces.generated.js`. Use `--list` to find other candidates; picks need a
  busy past window and next-work times that give one counterexample per guess (a test checks this).
  The same trace could replace the synthetic Activity 1/2 scenarios (TODO 1).
- [ ] **TODO 4: Replace model parameters.** `web/shared/params.js` marks each value as
  MEASURED or PLACEHOLDER: per-state idle power, wake-up (recovery) times, and power during
  recovery. Bump `RULES_VERSION` in `activities.js` after changing them.
