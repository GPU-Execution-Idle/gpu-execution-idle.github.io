"""Extract the "Wake the GPU!" game data from the serving experiment logs.

    python3 tools/build_data.py            # writes web/data.js

Inputs (local, not published):
  ~/agent/serving_downscale_log/20260713_163426/{no_scaling,scale_sm_memory}
  ~/agent/interface_log/20260713_220300/smmem_t320_s0

The game replays one segment of the Azure code trace (GPU 0 of 8, 100 requests; Qwen3-14B on vLLM,
L40S). Only fields the game reads are exported, tagged measured or reused in web/data.js. Power is
normalized to the high-clock idle level (= 1), so no absolute watts are published.
"""
import csv
import json
import math
import statistics
from pathlib import Path

AGENT = Path.home() / "agent"
SERVING = AGENT / "serving_downscale_log" / "20260713_163426"
INTERFACE = AGENT / "interface_log" / "20260713_220300"
OUT = Path(__file__).resolve().parent.parent / "web" / "data.js"

# The game predicts each arrival as previous arrival + [30th, 70th percentile] of the latest WINDOW
# observed inter-arrival intervals (web/jump-model.js): the middle 40% of recent gaps. The segment is
# chosen by select_segment(): the shortest five-wait window whose arrivals all fall inside that range
# at varied positions, and where every request finishes well before the next one even after a late wake.
WINDOW = 16
LOW_Q, HIGH_Q = .3, .7
WAITS = 5
MIN_POSITION_SPREAD = 0.25  # std. dev. of where arrivals land inside their ranges (0 = start, 1 = end)
MIN_IDLE_S = 2.0  # idle time left before the next arrival after a request's run time + late-wake slowdown
HISTORY = WINDOW  # earlier arrivals exported so the first range already uses WINDOW intervals

# Already used by the companion (hotnets-artifact/web/shared/params.js, WAKE_LEAD_S.smMem).
WAKE_LEAD_S = 0.32


def jsonl(path):
    with open(path) as f:
        return [json.loads(line) for line in f]


def percentile(values, q):
    o = sorted(values)
    pos = (len(o) - 1) * q
    lo, hi = math.floor(pos), math.ceil(pos)
    return o[lo] + (o[hi] - o[lo]) * (pos - lo)


def prediction_range(arrivals, i):
    """Same rule as predictionRange() in web/jump-model.js; uses arrivals up to i only."""
    window = arrivals[max(0, i - WINDOW):i + 1]
    intervals = [b - a for a, b in zip(window, window[1:])]
    return arrivals[i] + percentile(intervals, LOW_Q), arrivals[i] + percentile(intervals, HIGH_Q)


def select_segment(arrivals, busy):
    """Return (first, coverage). first: start of the shortest window whose arrivals all fall inside
    their ranges and land at varied positions within them (so no fixed press timing always wins).
    busy[i]: request i's run time plus its late-wake slowdown; each wait must keep MIN_IDLE_S idle."""
    covered = {i: lo <= arrivals[i + 1] <= hi
               for i in range(WINDOW, len(arrivals) - 1)
               for lo, hi in [prediction_range(arrivals, i)]}
    candidates = []
    for first in range(WINDOW, len(arrivals) - WAITS):
        waits = range(first, first + WAITS)
        if not all(covered[i] and arrivals[i + 1] - arrivals[i] - busy[i] >= MIN_IDLE_S for i in waits):
            continue
        positions = [(arrivals[i + 1] - lo) / (hi - lo) for i in waits for lo, hi in [prediction_range(arrivals, i)]]
        if statistics.pstdev(positions) >= MIN_POSITION_SPREAD:
            candidates.append((arrivals[first + WAITS] - arrivals[first], first))
    coverage = {"inside": sum(covered.values()), "total": len(covered)}
    return min(candidates)[1], coverage


def power_levels():
    def med(path, keep):
        v = [float(r["power_w"]) for r in csv.DictReader(open(path)) if keep(r)]
        return sorted(v)[len(v) // 2]

    hi = lambda r: int(r["sm_clock_mhz"]) > 1500
    ready = med(SERVING / "no_scaling" / "observer.csv", lambda r: hi(r) and int(r["gpu_util_pct"]) == 0)
    busy = med(SERVING / "no_scaling" / "observer.csv", lambda r: hi(r) and int(r["gpu_util_pct"]) > 0)
    low = med(INTERFACE / "smmem_t320_s0" / "observer.csv",
              lambda r: int(r["gpu_util_pct"]) == 0 and int(r["sm_clock_mhz"]) < 400 and int(r["memory_clock_mhz"]) < 1000)
    return {"ready": 1.0, "low": round(low / ready, 2), "busy": round(busy / ready, 2)}


def main():
    base = {r["dataset_row_idx"]: r for r in jsonl(SERVING / "no_scaling" / "replay.jsonl")}
    reactive = {r["dataset_row_idx"]: r for r in jsonl(SERVING / "scale_sm_memory" / "replay.jsonl")}
    net = {r["segment_id"]: r for r in jsonl(INTERFACE / "smmem_t320_s0" / "replay.jsonl")}
    ids = sorted(net)
    arrivals = [net[sid]["dataset_ts_rebased"] for sid in ids]
    rows = [net[sid]["dataset_row_idx"] for sid in ids]
    busy = [base[r]["latency_s"] + max(0.0, reactive[r]["latency_s"] - base[r]["latency_s"]) for r in rows]
    first, coverage = select_segment(arrivals, busy)
    FIRST, LAST = ids[first], ids[first + WAITS]

    t0 = net[FIRST]["dataset_ts_rebased"]
    requests = []
    for sid in range(FIRST, LAST + 1):
        r = net[sid]
        row = r["dataset_row_idx"]
        requests.append({
            "arrival": round(r["dataset_ts_rebased"] - t0, 3),           # measured (trace timestamp)
            "exec": round(base[row]["latency_s"], 3),                     # measured, full clocks
            "reactiveDelay": round(max(0.0, reactive[row]["latency_s"] - base[row]["latency_s"]), 3),  # measured
        })
    history = [round(net[sid]["dataset_ts_rebased"] - t0, 3) for sid in range(FIRST - HISTORY, FIRST)]


    data = {
        "trace": "Azure LLM Inference Trace 2024 (code)",  # AzureLLMInferenceTrace_code_1week.csv
        "segment": {"first": FIRST, "last": LAST, "rule": f"The shortest {WAITS}-wait window whose arrivals all fall inside the predicted range, at varied positions within it."},
        # Share of all arrivals (with a full {WINDOW}-interval history) that fall inside their range.
        "prediction": {"window": WINDOW, "lowQ": LOW_Q, "highQ": HIGH_Q, "coverage": coverage},
        "history": history,
        "requests": requests,
        "power": power_levels(),
        "wakeLeadS": WAKE_LEAD_S,
    }
    header = ("// GENERATED by tools/build_data.py. Do not edit by hand.\n"
              "// measured: history, arrival, exec, reactiveDelay, power (normalized to high-clock idle = 1)\n"
              "// reused from the companion's params.js: wakeLeadS\n")
    OUT.write_text(header + "export const DATA = " + json.dumps(data, indent=2) + ";\n")
    print(json.dumps(data, indent=2))


if __name__ == "__main__":
    main()
