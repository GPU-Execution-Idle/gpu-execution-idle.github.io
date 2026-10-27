"""Export one REAL coding-agent job for the "Build a controller" session.

    python3 extract_controller_trace.py <job-dir> --survey      # score candidate tasks
    python3 extract_controller_trace.py <job-dir> <task-id>...  # export these tasks (page order)

Input: the mini-SWE-bench L40S run (see extract_a0_examples.py for the file layout).
An idle period runs from the end of one inference (`gpu` phase) to the start of the next;
its tool is the first bash command in between, reduced to a short name ("grep", "make", ...).
Each idle period carries the measured GPU power samples (W, 100 ms) during it, so the page
can integrate the power saved by a downscaled setting. Only recorded timestamps are used.

The survey re-implements web/shared/controller-sim.js to compare predictor/setting results.
"""
import bisect
import csv
import datetime as dt
import json
import re
import statistics
import sys
from pathlib import Path

TELEMETRY_TZ = dt.timezone(dt.timedelta(hours=-4))
OUT = Path(__file__).parent.parent / "web" / "shared" / "controller-trace.generated.js"
SAMPLE_S = 0.1
RECENT_N = 8  # like Linux's menu cpuidle governor, which tracks the last 8 idle intervals
# Must match web/shared/params.js (power while downscaled, measured wake-up lead times).
STATE_W = {"sm": 60, "smMem": 35}
LEAD_S = {"sm": 0.26, "smMem": 0.32}


SETUP = re.compile(r"^(cd|export|mkdir|set|source|\.)\b")


def tool_of(cmd: str) -> str:
    """Short name of a bash command's main program, e.g. "grep", "go test", "write file"."""
    # Drop heredoc bodies; remember whether a heredoc wrote a file.
    lines, out, end, wrote = cmd.strip().split("\n"), [], None, False
    for line in lines:
        if end is not None:
            if line.strip() == end:
                end = None
            continue
        m = re.search(r"<<-?\s*['\"]?(\w+)['\"]?", line)
        if m:
            end, wrote = m.group(1), wrote or ">" in line.split("<<")[0]
            line = line[:m.start()]
        out.append(line)
    segs = [x.strip() for x in re.split(r"&&|;|\n|\|", "\n".join(out)) if x.strip()]
    main = [x for x in segs if not SETUP.match(x) and not re.match(r"^cat\s+>", x)]
    if not main:
        return "write file" if wrote else (segs[0].split()[0] if segs else "other")
    c = re.sub(r"^(\w+=\S+\s+)+", "", main[0])
    c = re.sub(r"^timeout \d+\s+", "", c)
    toks = c.split()
    if not toks:
        return "other"
    t0 = toks[0].split("/")[-1]
    if t0 in ("python", "python3"):
        return "python"
    if t0 == "cat":
        return "write file" if ">" in c.split("<<")[0] else "cat"
    if t0 in ("go", "npm", "bundle", "git", "cargo", "mvn", "npx", "php"):
        return " ".join(toks[:2]) if len(toks) > 1 else t0
    return t0


def load_telemetry(job: Path):
    ts, pw = [], []
    with (job / "gpu_telemetry.csv").open() as f:
        r = csv.reader(f, skipinitialspace=True)
        next(r)
        for row in r:
            t = dt.datetime.strptime(row[0], "%Y/%m/%d %H:%M:%S.%f").replace(tzinfo=TELEMETRY_TZ)
            ts.append(t.timestamp())
            pw.append(float(row[5].split()[0]))
    return ts, pw


def samples(ts, pw, a, b):
    i, j = bisect.bisect_left(ts, a), bisect.bisect_left(ts, b)
    return pw[i:j]


def idle_periods(task_dir: Path):
    d = json.loads((task_dir / "instrumentation" / "event.jsonl").read_text())
    ph = [p for st in d["workflow"] for p in st["phases"]]
    gpus = [p for p in ph if p["name"] == "gpu"]
    out = []
    for a, b in zip(gpus, gpus[1:]):
        tools = [p for p in ph if p["name"] == "external.tool.bash" and a["end_ns"] <= p["start_ns"] < b["start_ns"]]
        out.append({
            "tool": tool_of(tools[0].get("command", "")) if tools else "other",
            "cmd": tools[0].get("command", "").strip().split("\n")[0][:80] if tools else "",
            "start": a["end_ns"] / 1e9, "end": b["start_ns"] / 1e9,
        })
    return d, out


# ---- mirror of web/shared/controller-sim.js (used by --survey only) ----
def predict(policy, idles, i):
    past = idles[:i]
    if policy == "reactive":
        return float("inf")
    if policy == "oracle":
        return idles[i]["dur"]
    if policy == "recent":
        xs = [p["dur"] for p in past[-RECENT_N:]]
    else:
        xs = [p["dur"] for p in past if p["tool"] == idles[i]["tool"]]
    if not xs:
        return None
    return {"recent": statistics.mean, "toolMean": statistics.mean, "toolMax": max}[policy](xs)


def simulate(idles, total_j, total_s, setting, policy):
    saved = added = 0.0
    for i, p in enumerate(idles):
        pred = predict(policy, idles, i)
        lead = LEAD_S[setting]
        if pred is None or pred - lead <= 0:
            continue
        wake = min(pred - lead, p["dur"])
        n = int(wake / SAMPLE_S)
        saved += sum(max(0.0, w - STATE_W[setting]) for w in p["power"][:n]) * SAMPLE_S
        added += max(0.0, wake + lead - p["dur"])
    return 100 * saved / total_j, 100 * added / total_s


def task_summary(job, task, ts, pw):
    d, idles = idle_periods(job / task)
    t0, t1 = d["task_start_ns"] / 1e9, d["task_end_ns"] / 1e9
    for p in idles:
        p["dur"] = p["end"] - p["start"]
        p["power"] = samples(ts, pw, p["start"], p["end"])
    total_j = sum(samples(ts, pw, t0, t1)) * SAMPLE_S
    return d, idles, t0, t1, total_j


POLICIES = ("reactive", "recent", "toolMean", "toolMax", "oracle")


def survey(job: Path, only=None):
    ts, pw = load_telemetry(job)
    for ev in sorted(job.glob("*/instrumentation/event.jsonl")):
        task = ev.parent.parent.name
        if only and task not in only:
            continue
        d, idles, t0, t1, total_j = task_summary(job, task, ts, pw)
        total_s = t1 - t0
        idle_frac = sum(p["dur"] for p in idles) / total_s
        if not only and (idle_frac < 0.4 or not 30 <= len(idles) <= 130 or total_s > 20 * 60):
            continue
        res = {(s, pol): simulate(idles, total_j, total_s, s, pol)
               for s in STATE_W for pol in POLICIES}
        shown = [(round(e, 1), round(l, 1)) for e, l in res.values()]
        tools = {}
        for p in idles:
            tools.setdefault(p["tool"], []).append(p["dur"])
        mix = ", ".join(f"{t} {len(v)}x/{statistics.mean(v):.1f}s" for t, v in sorted(tools.items(), key=lambda kv: -sum(kv[1]))[:6])
        print(f"\n{task}: {total_s / 60:.1f} min, idle {100 * idle_frac:.0f}%, {len(idles)} idle periods, "
              f"all distinct: {len(set(shown)) == len(shown) and (0.0, 0.0) not in shown}\n   tools: {mix}")
        for (s, pol), (e, l) in res.items():
            print(f"   {s:6} {pol:9} energy -{e:5.1f}%  latency +{l:5.2f}%")


def export_one(job: Path, task: str, ts, pw):
    d, idles, t0, t1, total_j = task_summary(job, task, ts, pw)
    payload = {
        "task": task, "agent": "mini-SWE-agent", "totalS": round(t1 - t0, 2), "totalEnergyJ": round(total_j, 1),
        "sampleS": SAMPLE_S,
        "idle": [{"tool": p["tool"], "cmd": p["cmd"], "startS": round(p["start"] - t0, 2), "durS": round(p["dur"], 3),
                  "powerW": [round(w) for w in p["power"]]} for p in idles],
    }
    # Reference results from this script's simulator, on the exported (rounded) data, so
    # tests can check that web/shared/controller-sim.js agrees.
    rounded = [{"tool": x["tool"], "dur": x["durS"], "power": x["powerW"]} for x in payload["idle"]]
    payload["expected"] = {f"{st}/{pol}": [round(v, 3) for v in simulate(rounded, payload["totalEnergyJ"], payload["totalS"], st, pol)]
                           for st in STATE_W for pol in POLICIES}
    return payload


def export(job: Path, tasks):
    ts, pw = load_telemetry(job)
    traces = [export_one(job, t, ts, pw) for t in tasks]
    OUT.write_text("// GENERATED by trace-analysis/extract_controller_trace.py from REAL traces. Do not edit.\n"
                   f"// Source: {job.name} (mini-SWE-bench, L40S).\n"
                   f"export const CONTROLLER_TRACES = {json.dumps(traces, separators=(',', ':'))};\n")
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB): " + ", ".join(f"{t['task']} ({len(t['idle'])} idle periods)" for t in traces))


if __name__ == "__main__":
    job = Path(sys.argv[1])
    if "--survey" in sys.argv:
        survey(job, [a for a in sys.argv[2:] if a != "--survey"] or None)
    else:
        export(job, sys.argv[2:])
