"""Generate the SYNTHETIC agent trace used until real traces are imported.

Output: fixtures/synthetic_trace.csv with one row per inference or tool call:
    session_id, agent, seq, kind (inference|tool), name, start_s, end_s
Times are absolute seconds on one shared clock, so "past observations" can be
defined fleet-wide (a call's history = same-tool calls that ENDED before it started).

Everything here is made up. Replace with real traces (see README.md, TODO 1).
"""
import csv
import random
from pathlib import Path

SEED = 26
OUT = Path(__file__).parent / "fixtures" / "synthetic_trace.csv"

# tool name -> sampler of duration (s). Shapes are guesses, not measurements.
TOOLS = {
    "browser.fetch": lambda r: min(12.0, r.lognormvariate(1.1, 0.45)),   # ~3 s, long tail
    "web.search": lambda r: r.uniform(0.6, 2.4),
    "python.exec": lambda r: r.uniform(0.08, 0.6) if r.random() < 0.85 else r.uniform(2.5, 5.0),
    "file.read": lambda r: r.uniform(0.02, 0.12),
    "test.run": lambda r: r.uniform(4.0, 14.0),
}
AGENTS = {
    "web_agent": ["browser.fetch", "browser.fetch", "web.search"],
    "coding_agent": ["python.exec", "python.exec", "file.read", "test.run"],
}


def main() -> None:
    r = random.Random(SEED)
    rows = []
    for i in range(24):
        agent = "web_agent" if i % 2 == 0 else "coding_agent"
        t = i * 7.0 + r.uniform(0, 3)
        for seq in range(16):
            if seq % 2 == 0:
                dur, kind, name = r.uniform(0.4, 2.5), "inference", "llm.decode"
            else:
                name = r.choice(AGENTS[agent])
                dur, kind = TOOLS[name](r), "tool"
            rows.append([f"s{i:02d}", agent, seq, kind, name, round(t, 3), round(t + dur, 3)])
            t += dur
    OUT.parent.mkdir(exist_ok=True)
    with OUT.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["session_id", "agent", "seq", "kind", "name", "start_s", "end_s"])
        w.writerows(rows)
    print(f"wrote {len(rows)} SYNTHETIC events -> {OUT}")


if __name__ == "__main__":
    main()
