// Figures for the full paper poster, drawn from content/data.ts like the web figures but still
// (every choice at once) and quieter: greys plus the accent, which marks what matters.
// One scale for all of them: 1 viewBox unit is 0.1u and every label is 11 units, so figure text
// prints at exactly the takeaway's size. Keep viewBoxes at most FW wide (the card's inner width).
// Two text styles only: subfigure titles (bold) and everything else (regular), legends included.
// A legend sits under its figure, centered.
import type { CSSProperties, ReactNode } from 'react';
import type { FigureId } from '../content/claims';
import { EXEC_IDLE, IDLE_POWER, REACTIVE, TRADEOFF, WAKE_LEAD_MS } from '../content/data';

export type PosterFigureId = FigureId | 'net-signals';

const FW = 400, SUB = 195; // a full-width figure; one of two side-by-side subfigures

function Svg({ w, h, label, children }: { w: number; h: number; label: string; children: ReactNode }) {
  return <svg className="pfig" viewBox={`0 0 ${w} ${h}`} style={{ '--vbw': w } as CSSProperties} role="img" aria-label={label}>{children}</svg>;
}

function Legend({ items }: { items: [string, string][] }) {
  return <p className="plegend">{items.map(([cls, t]) => <span key={t}><i className={cls} />{t}</span>)}</p>;
}

function Sub({ title, children }: { title: string; children: ReactNode }) {
  return <figure className="psub"><figcaption>{title}</figcaption>{children}</figure>;
}

// Two bars per row (a saving in grey, a latency cost in the accent), shared by 2.1 and 3.2.
// Bar height and row step are per figure, so each fills its card.
type PairRow = { name: string; strong?: boolean; save: number; saveTxt: string; cost: number; costTxt: string };
function PairBars({ rows, saveMax, costMax, label, bh, step }: { rows: PairRow[]; saveMax: number; costMax: number; label: string; bh: number; step: number }) {
  const L = 80, span = 66;
  const sx = (v: number) => (v / saveMax) * span, cx = (v: number) => Math.max((v / costMax) * span, 2);
  return (
    <Svg w={SUB} h={step * (rows.length - 1) + 2 * bh + 4} label={label}>
      {rows.map((r, i) => {
        const y = i * step;
        return (
          <g key={r.name}>
            <text className={r.strong ? 'ink' : ''} x={L - 8} y={y + bh + 6} textAnchor="end">{r.name}</text>
            <rect className="f-grey" x={L} y={y} width={sx(r.save)} height={bh} rx="2" />
            <text x={L + sx(r.save) + 5} y={y + bh / 2 + 4}>{r.saveTxt}</text>
            <rect className="f-acc" x={L} y={y + bh + 4} width={cx(r.cost)} height={bh} rx="2" />
            <text className="acc" x={L + cx(r.cost) + 5} y={y + bh * 1.5 + 8}>{r.costTxt}</text>
          </g>
        );
      })}
    </Svg>
  );
}

// 1.1: true idle vs. execution-idle power; the label is how much more execution-idle draws.
function IdlePower() {
  const W = FW, base = 122, top = 18, max = 200, y = (v: number) => base - (v / max) * (base - top), slot = W / IDLE_POWER.length;
  return (
    <>
      <Svg w={W} h={142} label={IDLE_POWER.map((g) => `${g.gpu}: ${g.trueIdle} W true idle, ${g.execIdle} W execution-idle`).join('; ')}>
        <line className="axis" x1="0" x2={W} y1={base} y2={base} />
        {IDLE_POWER.map((g, i) => {
          const cx = slot * (i + .5);
          return (
            <g key={g.gpu}>
              <rect className="f-grey" x={cx - 22} y={y(g.trueIdle)} width="20" height={base - y(g.trueIdle)} rx="2" />
              <rect className="f-acc" x={cx + 2} y={y(g.execIdle)} width="20" height={base - y(g.execIdle)} rx="2" />
              <text className="acc" x={cx + 12} y={y(g.execIdle) - 5} textAnchor="middle">+{g.execIdle - g.trueIdle} W</text>
              <text x={cx} y={base + 16} textAnchor="middle">{g.gpu}</text>
            </g>
          );
        })}
      </Svg>
      <Legend items={[['f-grey', 'true idle'], ['f-acc', 'execution-idle']]} />
    </>
  );
}

// 1.2: share of time execution-idle (light) and the ideal energy savings within it (solid), per workload.
function ExecIdle() {
  const W = FW, L = 104, track = 196, row = 21, x = (v: number) => (v / 100) * track;
  const group = (g: (typeof EXEC_IDLE)[keyof typeof EXEC_IDLE], gpuInName: boolean) => (
    <Svg w={W} h={row * g.rows.length - 6} label={`${g.label}: ${g.rows.map((r) => `${r.name} ${r.frac}% execution-idle, ${r.savings}% energy savings`).join('; ')}`}>
      {g.rows.map((r, i) => {
        const yy = i * row;
        return (
          <g key={r.name}>
            <text x={L - 8} y={yy + 11} textAnchor="end">{r.name}{gpuInName ? <tspan className="mute"> {r.gpu}</tspan> : null}</text>
            <rect className="f-track" x={L} y={yy} width={track} height="14" rx="2" />
            <rect className="f-soft" x={L} y={yy} width={x(r.frac)} height="14" rx="2" />
            <rect className="f-acc" x={L} y={yy} width={x(r.savings)} height="14" rx="2" />
            <text x={L + track + 10} y={yy + 11}>{r.frac.toFixed(1)}%</text>
            <text className="acc" x={W} y={yy + 11} textAnchor="end">{r.savings.toFixed(1)}%</text>
          </g>
        );
      })}
    </Svg>
  );
  return (
    <>
      <div className="psubs stack">
        <Sub title="Bursty serving · L40S">{group(EXEC_IDLE.serving, false)}</Sub>
        <Sub title="Agentic workloads">{group(EXEC_IDLE.agent, true)}</Sub>
      </div>
      <Legend items={[['f-soft', 'time execution-idle'], ['f-acc', 'energy savings (ideal)']]} />
    </>
  );
}

// 2.1: reactive downscaling, power saved vs. p50 latency added; one latency scale for both workloads.
function Reactive() {
  const sets = [REACTIVE.llm, REACTIVE.agent];
  const costMax = Math.max(...sets.flatMap((d) => [d.sm.latency, d.smMem.latency]));
  return (
    <>
      <div className="psubs">
        {sets.map((d) => (
          <Sub key={d.label} title={d.label}>
            <PairBars saveMax={45} costMax={costMax} bh={24} step={92}
              label={`${d.label}: SM down ${d.sm.power}% power, +${d.sm.latency}% latency; SM and memory down ${d.smMem.power}% power, +${d.smMem.latency}% latency`}
              rows={[['SM', d.sm], ['SM + memory', d.smMem]].map(([name, v]) => {
                const s = v as typeof d.sm;
                return { name: name as string, save: -s.power, saveTxt: `−${-s.power}%`, cost: s.latency, costTxt: `+${s.latency}%` };
              })} />
          </Sub>
        ))}
      </div>
      <Legend items={[['f-grey', 'power saved'], ['f-acc', 'p50 latency added']]} />
    </>
  );
}

// Rows of "title, then a bar that starts at a line": shared by 2.2 and 3.1, so the two read alike.
// Row step and bar height are per figure, so each fills its card. Guides are labeled on top.
type LaneRow = { title: string; from?: number; fromSoft?: boolean; wake?: number; note?: string; noteAcc?: boolean; noteAt?: number };
type Guide = { x: number; label: string; dash?: boolean };
function Lanes({ rows, xWork, guides, label, bar, step, bh }: { rows: LaneRow[]; xWork: number; guides: Guide[]; label: string; bar: number; step: number; bh: number }) {
  const W = FW, top = 34, gap = 8, bottom = top + step * (rows.length - 1) + gap + bh;
  return (
    <Svg w={W} h={bottom + 2} label={label}>
      {guides.map((g) => (
        <g key={g.label}>
          <line className={`guide${g.dash ? ' dash' : ''}`} x1={g.x} x2={g.x} y1="16" y2={bottom} />
          <text className="mute" x={g.x} y="10" textAnchor="middle">{g.label}</text>
        </g>
      ))}
      {rows.map((r, i) => {
        const y = top + i * step, by = y + gap, ay = by + bh / 2, ty = ay + 4, x0 = xWork + (r.wake ?? 0);
        return (
          <g key={r.title}>
            <text className="ink" x="0" y={y}>{r.title}</text>
            {r.note ? <text className={r.noteAcc ? 'acc' : 'mute'} x={r.noteAt ?? W} y={y} textAnchor="end">{r.note}</text> : null}
            <line className="lane" x1="0" x2={W} y1={ay} y2={ay} />
            {r.from !== undefined ? (
              <g className={r.fromSoft ? 'soft' : ''}>
                <line className="lead" x1={r.from} x2={xWork - 7} y1={ay} y2={ay} />
                <path className="lead-mark" d={`M${xWork - 8},${ay - 5} L${xWork},${ay} L${xWork - 8},${ay + 5} Z`} />
                <circle className="lead-mark" cx={r.from} cy={ay} r="4.5" />
              </g>
            ) : null}
            {r.wake ? <><rect className="f-grey" x={xWork} y={by} width={r.wake} height={bh} rx="3" /><text className="ink" x={xWork + r.wake / 2} y={ty} textAnchor="middle">wake</text></> : null}
            <rect className="f-track" x={x0} y={by} width={bar} height={bh} rx="3" />
            <text x={x0 + bar / 2} y={ty} textAnchor="middle">inference</text>
          </g>
        );
      })}
    </Svg>
  );
}

// 2.2: how early each downscaled setting must wake to match Default, on an L40S.
function WakeLead() {
  const xWork = 250, T0 = 0.36, x = (ms: number) => ((T0 - ms / 1000) / T0) * xWork;
  return (
    <Lanes xWork={xWork} bar={FW - xWork} step={70} bh={24}
      label={`Waking ${WAKE_LEAD_MS.sm} ms (SM) or ${WAKE_LEAD_MS.smMem} ms (SM + memory) before work starts gives the same performance as Default.`}
      guides={[{ x: xWork, label: 'work starts' }]}
      rows={[
        { title: 'Default' },
        { title: 'SM at minimum', from: x(WAKE_LEAD_MS.sm), note: `${WAKE_LEAD_MS.sm} ms earlier`, noteAcc: true, noteAt: xWork - 8 },
        { title: 'SM + memory at minimum', from: x(WAKE_LEAD_MS.smMem), note: `${WAKE_LEAD_MS.smMem} ms earlier`, noteAcc: true, noteAt: xWork - 8 },
      ]} />
  );
}

// 3.1: when each trigger starts waking the GPU. Schematic, not data: GPU-local control wakes only once
// work reaches the GPU and runs late; a network observation wakes on the request's arrival, a prediction before it.
function NetSignals() {
  const xSeen = 160, xWork = 270, wake = 48;
  return (
    <Lanes xWork={xWork} bar={FW - xWork - wake} step={44} bh={18}
      label="Schematic: GPU-local control starts waking the GPU only when work arrives, so the work runs late; waking on the network's observation of the request, or on a prediction of it, starts earlier."
      guides={[{ x: xSeen, label: 'request arrives', dash: true }, { x: xWork, label: 'GPU gets work' }]}
      rows={[
        { title: 'GPU-local', wake, note: 'late' },
        { title: 'Network observation', from: xSeen, fromSoft: true, note: 'on time', noteAcc: true },
        { title: 'Network prediction', from: 40, note: 'on time', noteAcc: true },
      ]} />
  );
}

// 3.2: energy saved vs. p95 latency added, normalized to Default, for each approach and setting.
// Lengths use the points read from the paper figure; labels use the paper's stated changes.
function Tradeoff() {
  const NAMES = { reactive: 'Reactive', netwake: 'Net-wake', margin: '+3.5 s margin' } as const;
  const settings = [['sm', 'SM at minimum'], ['smMem', 'SM + memory at minimum']] as const;
  const costMax = Math.max(...TRADEOFF.map((p) => (p.p95 - 1) * 100));
  return (
    <>
      <div className="psubs">
        {settings.map(([s, title]) => {
          const pts = TRADEOFF.filter((p) => p.setting === s);
          return (
            <Sub key={s} title={title}>
              <PairBars saveMax={45} costMax={costMax} bh={17} step={66}
                label={`${title}: ${pts.map((p) => `${NAMES[p.kind]} ${p.energyTxt} energy, ${p.p95Txt} p95 latency`).join('; ')}`}
                rows={pts.map((p) => ({
                  name: NAMES[p.kind], strong: p.kind === 'netwake',
                  save: (1 - p.energy) * 100, saveTxt: p.energyTxt, cost: (p.p95 - 1) * 100, costTxt: p.p95Txt,
                }))} />
            </Sub>
          );
        })}
      </div>
      <Legend items={[['f-grey', 'energy saved'], ['f-acc', 'p95 latency added']]} />
    </>
  );
}

const FIGURES: Record<PosterFigureId, () => JSX.Element> = {
  'idle-power': IdlePower, 'exec-idle': ExecIdle, reactive: Reactive, 'wake-lead': WakeLead, tradeoff: Tradeoff, 'net-signals': NetSignals,
};

export function PosterFigure({ id }: { id: PosterFigureId }) {
  const F = FIGURES[id];
  return <div className="pfig-wrap"><F /></div>;
}
