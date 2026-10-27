"""Extract the REAL executions shown in Activity 0, Part 2 ("What can the GPU know?").

    python3 extract_a0_examples.py ../trace/extracted/20261025-043628-job49799299

Inputs (mini-SWE-bench run on one L40S, tasks ran one at a time):
  <job>/<task>/instrumentation/event.jsonl  per-step phases with epoch-ns start/end:
                                             `gpu` (blocking model generation) and
                                             `external.tool.bash` (tool execution, with command)
  <job>/gpu_telemetry.csv                   nvidia-smi samples every 100 ms, local time (UTC-4)

For each pick, "now" is OBSERVED_IDLE_S after the inference before the tool call ended.
The output holds the utilization line around "now", the time of the next inference
(the future), the tool command (known when the call starts) and the durations of earlier
tool calls in the same task (past only). Only recorded start/end timestamps are used.
"""
import bisect
import csv
import datetime as dt
import json
import math
import sys
from pathlib import Path

OBSERVED_IDLE_S = 3.0
PAST_S = 5.0         # every pick must be busy for all of [-PAST_S, -OBSERVED_IDLE_S]
AFTER_NEXT_S = 1.0   # how much of the next inference to include
TELEMETRY_TZ = dt.timezone(dt.timedelta(hours=-4))  # verified: util ≈90% in gpu phases, ≈2% in tools
OUT = Path(__file__).parent.parent / "web" / "shared" / "activity0-traces.generated.js"

PICKS = [  # (task, step); chosen with --list for similar pasts and very different futures
    ("fmtlib__fmt-3248", 121),        # make -j4: next work ~25 s later
    ("jekyll__jekyll-9141", 48),      # ruby test suite: ~12 s
    ("fastlane__fastlane-19207", 22), # rspec spec file: ~0.1 s
]


def load_telemetry(job: Path):
    ts, util = [], []
    with (job / "gpu_telemetry.csv").open() as f:
        r = csv.reader(f, skipinitialspace=True)
        next(r)
        for row in r:
            t = dt.datetime.strptime(row[0], "%Y/%m/%d %H:%M:%S.%f").replace(tzinfo=TELEMETRY_TZ)
            ts.append(t.timestamp())
            util.append(int(row[2].split()[0]))
    return ts, util


def phases(task_dir: Path):
    d = json.loads((task_dir / "instrumentation" / "event.jsonl").read_text())
    out = []
    for st in d["workflow"]:
        for p in st["phases"]:
            out.append({**p, "step": st["step"]})
    return out


def extract(job: Path, task: str, step: int, ts, util):
    ph = phases(job / task)
    i = next(k for k, p in enumerate(ph) if p["step"] == step and p["name"] == "external.tool.bash")
    tool = ph[i]
    prev_gpu = next(p for p in reversed(ph[:i]) if p["name"] == "gpu")
    next_gpu = next(p for p in ph[i + 1:] if p["name"] == "gpu")
    idle0 = prev_gpu["end_ns"] / 1e9
    now = idle0 + OBSERVED_IDLE_S
    arrive = next_gpu["start_ns"] / 1e9 - now
    assert prev_gpu["start_ns"] / 1e9 <= now - PAST_S, f"{task}: past window not fully busy"
    assert arrive > 0, f"{task}: work arrived before 'now'"
    lo = bisect.bisect_left(ts, now - PAST_S)
    hi = bisect.bisect_right(ts, now + arrive + AFTER_NEXT_S)
    series = [[round(ts[k] - now, 2), util[k]] for k in range(lo, hi)]
    past_tools = [round(p["duration_ns"] / 1e9, 2) for p in ph[:i]
                  if p["name"] == "external.tool.bash" and p["end_ns"] <= tool["start_ns"]]
    # How long the telemetry line itself has read 0% at "now" (nvidia-smi lags phase ends ~0.4 s).
    last_busy = max(t for t, u in series if t < 0 and u > 0)
    return {
        "task": task, "step": step,
        "zeroUtilForS": round(-last_busy, 2),
        "command": tool.get("command", "").strip(),
        "toolDurationS": round(tool["duration_ns"] / 1e9, 2),
        "nextWorkInS": round(arrive, 2),  # FUTURE: revealed only after a guess
        "idleSoFarS": OBSERVED_IDLE_S,
        "util": series,
        "earlierToolDurationsS": past_tools,
    }


def list_candidates(job: Path):
    for ev in sorted(job.glob("*/instrumentation/event.jsonl")):
        ph = phases(ev.parent.parent)
        for i, p in enumerate(ph):
            if p["name"] != "external.tool.bash" or p["duration_ns"] / 1e9 < OBSERVED_IDLE_S + 0.3:
                continue
            g = [q for q in ph[:i] if q["name"] == "gpu"]
            if g and g[-1]["duration_ns"] / 1e9 >= PAST_S - OBSERVED_IDLE_S + 0.2:
                print(f"{p['duration_ns'] / 1e9:7.2f}s  {ev.parent.parent.name:36} step {p['step']:3}  {p.get('command', '')[:60]!r}")


def main():
    job = Path(sys.argv[1])
    if "--list" in sys.argv:
        return list_candidates(job)
    ts, util = load_telemetry(job)
    examples = [extract(job, t, s, ts, util) for t, s in PICKS]
    # The prompt states the shortest 0% stretch, rounded down to 0.5 s, so it is true for every pick.
    zero_for = math.floor(2 * min(e["zeroUtilForS"] for e in examples)) / 2
    payload = {"source": f"{job.name} (mini-SWE-bench, L40S)", "observedIdleS": OBSERVED_IDLE_S,
               "zeroUtilForS": zero_for, "pastS": PAST_S, "executions": examples}
    OUT.write_text("// GENERATED by trace-analysis/extract_a0_examples.py from a REAL trace. Do not edit.\n"
                   f"export const A0_TRACES = {json.dumps(payload, separators=(',', ':'))};\n")
    for e in examples:
        print(f"{e['task']}: next work in {e['nextWorkInS']} s, telemetry at 0% for {e['zeroUtilForS']} s, "
              f"{len(e['util'])} samples")
    print(f"prompt: utilization 0% for the past {zero_for} s")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
