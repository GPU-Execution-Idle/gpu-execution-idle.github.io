// One small figure per question, drawn from content/data.ts and content/traces.ts.
// Each has at most one row of buttons, like the answers in the interactive demo.
import { useState } from 'react';
import type { FigureId } from '../content/claims';
import { CONCURRENCY, EXEC_IDLE, IDLE_POWER, REACTIVE, TRADEOFF, WAKE_LEAD_MS } from '../content/data';
import { AGENT_TRACES } from '../content/traces';

type Opt<K extends string> = readonly (readonly [K, string])[];
export type FigureProps = { choice?: string; setChoice?: (c: string) => void };

function Seg<K extends string>({ options, value, onChange, label }: { options: Opt<K>; value: K; onChange: (k: K) => void; label: string }) {
  return (
    <div className="fig-seg" role="group" aria-label={label}>
      {options.map(([k, t]) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)}>{t}</button>
      ))}
    </div>
  );
}

function Legend({ x, y, items }: { x: number; y: number; items: [string, string][] }) {
  let dx = 0;
  return (
    <g>
      {items.map(([cls, t]) => {
        const at = dx;
        dx += 26 + t.length * 6.6;
        return <g key={t}><rect className={`bar ${cls}`} x={x + at} y={y - 9} width="11" height="11" rx="2" /><text className="tick" x={x + at + 15} y={y}>{t}</text></g>;
      })}
    </g>
  );
}

const W = 400;
const SETTINGS = [['sm', 'SM at minimum'], ['smMem', 'SM + memory at minimum']] as const;
const SETTING_NAME = Object.fromEntries(SETTINGS) as Record<'sm' | 'smMem', string>;

// 1.1: true idle vs. execution-idle power on nine GPUs; the execution-idle bars appear on demand.
function IdlePower() {
  const [shown, setShown] = useState<'idle' | 'exec'>('exec');
  const H = 232, base = 150, top = 30, max = 200, y = (v: number) => base - (v / max) * (base - top);
  const slot = (W - 8) / IDLE_POWER.length, x0 = 4;
  const groups = [...new Set(IDLE_POWER.map((g) => g.group))];
  return (
    <>
      <Seg label="Program state" value={shown} onChange={setShown}
        options={[['idle', 'True idle: no program'], ['exec', 'Execution-idle: program loaded, no work']] as const} />
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={IDLE_POWER.map((g) => `${g.gpu}: ${g.trueIdle} W true idle, ${g.execIdle} W execution-idle`).join('; ')}>
        <Legend x={x0} y={12} items={[['true-idle', 'true idle (W)'], ['exec', 'execution-idle (+W above true idle)']]} />
        <line className="axis" x1={x0} x2={W - 4} y1={base} y2={base} />
        {IDLE_POWER.map((g, i) => {
          const cx = x0 + slot * (i + .5);
          return (
            <g key={g.gpu}>
              <rect className="bar true-idle" x={cx - 17} y={y(g.trueIdle)} width="16" height={base - y(g.trueIdle)} rx="2" />
              <text className="val tiny" x={cx - 9} y={y(g.trueIdle) - 4} textAnchor="middle">{g.trueIdle}</text>
              <g className={`grow${shown === 'exec' ? ' on' : ''}`}>
                <rect className="bar exec" x={cx + 1} y={y(g.execIdle)} width="16" height={base - y(g.execIdle)} rx="2" />
                <text className="val tiny strong" x={cx + 9} y={y(g.execIdle) - 4} textAnchor="middle">+{g.execIdle - g.trueIdle}</text>
              </g>
              <text className="tick" x={cx + 4} y={base + 12} textAnchor="end" transform={`rotate(-35 ${cx + 4} ${base + 12})`}>{g.gpu}</text>
            </g>
          );
        })}
        {groups.map((name) => {
          const idx = IDLE_POWER.map((g, i) => (g.group === name ? i : -1)).filter((i) => i >= 0);
          const a = x0 + slot * idx[0] + 4, b = x0 + slot * (idx.at(-1)! + 1) - 4;
          return (
            <g key={name}>
              <line className="bracket" x1={a} x2={b} y1={base + 60} y2={base + 60} />
              <text className="tick small" x={(a + b) / 2} y={base + 74} textAnchor="middle">{name}</text>
            </g>
          );
        })}
      </svg>
    </>
  );
}

// 1.2: execution-idle time and ideal energy savings, per workload, in one of three settings.
function ExecIdle() {
  const [key, setKey] = useState<keyof typeof EXEC_IDLE>('cluster');
  const t = EXEC_IDLE[key];
  const L = 112, track = 226, row = 36, top = 30, x = (v: number) => (v / 100) * track;
  const H = top + 5 * row;
  return (
    <>
      <Seg label="Setting" value={key} onChange={setKey}
        options={(Object.keys(EXEC_IDLE) as (keyof typeof EXEC_IDLE)[]).map((k) => [k, EXEC_IDLE[k].label] as const)} />
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${t.label}: ${t.rows.map((r) => `${r.name} ${r.frac}% execution-idle, ${r.savings}% energy savings`).join('; ')}`}>
        <Legend x={L} y={12} items={[['exec-soft', 'time execution-idle'], ['exec', 'energy savings (ideal)']]} />
        {t.rows.map((r, i) => {
          const yy = top + i * row;
          return (
            <g key={r.name}>
              <text className="tick strong" x={L - 8} y={yy + 12} textAnchor="end">{r.name}</text>
              {'jobs' in r ? <text className="tick small" x={L - 8} y={yy + 25} textAnchor="end">{r.jobs.toLocaleString('en-US')} jobs</text> : null}
              <rect className="track" x={L} y={yy} width={track} height="16" rx="3" />
              <rect className="bar exec-soft sized" x={L} y={yy} width={x(r.frac)} height="16" rx="3" />
              <rect className="bar exec sized" x={L} y={yy + 4} width={x(r.savings)} height="8" rx="2" />
              <text className="val strong" x={L + track + 6} y={yy + 12}>{r.frac}%</text>
              <text className="val small exec-t" x={L + track + 6} y={yy + 25}>saves {r.savings}%</text>
            </g>
          );
        })}
      </svg>
    </>
  );
}

// 1.3: what more concurrent agents on one H100 do to idle time, task time and memory.
function Concurrency() {
  const [m, setM] = useState<keyof typeof CONCURRENCY.metrics>('idle');
  const d = CONCURRENCY.metrics[m];
  const L = 34, R = 18, top = 42, bot = 150, H = 176;
  const [lo, hi] = m === 'slowdown' ? [1, 3.6] : m === 'idle' ? [0, 50] : [0, 100];
  const x = (i: number) => L + (i / (CONCURRENCY.levels.length - 1)) * (W - L - R);
  const y = (v: number) => bot - ((v - lo) / (hi - lo)) * (bot - top);
  const fmt = (v: number) => (d.unit === '×' ? `${v.toFixed(2)}×` : v.toFixed(1));
  const ticks = m === 'slowdown' ? [1, 2, 3] : m === 'idle' ? [0, 15, 30, 45] : [0, 30, 60, 90];
  const series = [{ k: 'browse', name: 'BrowseComp', v: d.browse }, { k: 'swe', name: 'DeepSWE', v: d.swe }] as const;
  return (
    <>
      <Seg label="Metric" value={m} onChange={setM}
        options={[['idle', 'Execution-idle'], ['slowdown', 'Task slowdown'], ['kv', 'Memory']] as const} />
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${d.label} at 1, 2, 4, 6 concurrent agents on an H100. BrowseComp: ${d.browse.map(fmt).join(', ')}. DeepSWE: ${d.swe.map(fmt).join(', ')}.`}>
        <text className="tick small" x={L} y="13">{d.unit === '%' ? `${d.label} (%)` : d.label} · one H100</text>
        <g className="legend-lines">
          <line className="ln browse" x1={L} x2={L + 16} y1="26" y2="26" /><circle className="pt browse" cx={L + 8} cy="26" r="3" /><text className="tick small" x={L + 21} y="30">BrowseComp</text>
          <line className="ln swe" x1={L + 100} x2={L + 116} y1="26" y2="26" /><rect className="pt swe" x={L + 105} y="23" width="6" height="6" /><text className="tick small" x={L + 121} y="30">DeepSWE</text>
        </g>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
            <text className="tick small" x={L - 6} y={y(t) + 4} textAnchor="end">{d.unit === '×' ? `${t}×` : t}</text>
          </g>
        ))}
        {series.map((s) => (
          <g key={s.k}>
            <polyline className={`ln ${s.k}`} points={s.v.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
            {s.v.map((v, i) => {
              const other = (s.k === 'browse' ? d.swe : d.browse)[i];
              const above = v >= other;
              // The higher series is labeled above its point, the lower one below it (below-right near
              // the axis). When both show the same value, only one label is drawn.
              const same = fmt(v) === fmt(other);
              const beside = !above && y(v) > bot - 18;
              const lx = beside ? x(i) + 7 : x(i) + (i === 0 ? 4 : 0), ly = beside ? y(v) + 12 : y(v) + (above ? -8 : 15);
              return (
                <g key={i}>
                  {s.k === 'browse' ? <circle className="pt browse" cx={x(i)} cy={y(v)} r="4" /> : <rect className="pt swe" x={x(i) - 3.5} y={y(v) - 3.5} width="7" height="7" />}
                  {same && s.k === 'swe' ? null : <text className={`val tiny ${same ? 'both' : `${s.k}-t`}`} x={lx} y={ly} textAnchor={beside || i === 0 ? 'start' : 'middle'}>{fmt(v)}</text>}
                </g>
              );
            })}
          </g>
        ))}
        {CONCURRENCY.levels.map((c, i) => <text key={c} className="tick" x={x(i)} y={bot + 15} textAnchor="middle">{c}</text>)}
        <text className="tick small" x={(L + W - R) / 2} y={H - 2} textAnchor="middle">concurrent agents</text>
      </svg>
    </>
  );
}

// 1.4: one real coding-agent task: GPU inference interleaved with tool calls.
function AgentTrace() {
  const [j, setJ] = useState<'0' | '1'>('0');
  const t = AGENT_TRACES[Number(j)];
  const x = (s: number) => (s / t.totalS) * W;
  const idle = t.calls.reduce((a, [, d]) => a + d, 0);
  const longest = Math.max(...t.calls.map(([, d]) => d));
  const minutes = Math.floor(t.totalS / 60);
  return (
    <>
      <Seg label="Task" value={j} onChange={setJ} options={AGENT_TRACES.map((_, i) => [String(i) as '0' | '1', `Task ${i + 1}`] as const)} />
      <svg viewBox={`0 0 ${W} 122`} role="img" aria-label={`${t.task}: ${t.calls.length} tool calls over ${(t.totalS / 60).toFixed(1)} minutes; the GPU is idle ${Math.round((100 * idle) / t.totalS)}% of the time; the longest tool call lasts ${longest.toFixed(0)} s.`}>
        <text className="tick strong" x="0" y="12">SWE-bench · {t.task.replace('__', '/')}</text>

        <rect className="bar infer" x="0" y="22" width={W} height="34" rx="4" />
        {t.calls.map(([s, d], i) => <rect key={i} className="bar tool" x={x(s)} y="18" width={Math.max(0.9, x(d))} height="42" />)}
        {Array.from({ length: minutes + 1 }, (_, m) => (
          <text key={m} className="tick small" x={x(m * 60)} y="74" textAnchor={m === 0 ? 'start' : 'middle'}>{m} min</text>
        ))}
        <text className="val strong" x="0" y="94">{t.calls.length} tool calls · GPU idle {Math.round((100 * idle) / t.totalS)}% of the time · longest call {longest.toFixed(0)} s</text>
        <Legend x={0} y={116} items={[['infer', 'GPU inference'], ['tool', 'tool call (GPU idle)']]} />
      </svg>
    </>
  );
}

// 2.1: reactive downscaling, power saved vs. latency added.
function Reactive() {
  const [wl, setWl] = useState<'llm' | 'agent'>('llm');
  const d = REACTIVE[wl];
  const maxLat = Math.max(d.sm.latency, d.smMem.latency);
  const pw = (v: number) => (Math.abs(v) / 50) * 92, lt = (v: number) => (v / maxLat) * 88;
  return (
    <>
      <Seg label="Workload" value={wl} onChange={setWl} options={[['llm', 'LLM serving'], ['agent', 'Web agent']] as const} />
      <svg viewBox={`0 0 ${W} 132`} role="img" aria-label={`${d.label}: SM down ${d.sm.power}% power, +${d.sm.latency}% latency; SM and memory down ${d.smMem.power}% power, +${d.smMem.latency}% latency`}>
        <text className="tick head" x="100" y="14">Average power</text>
        <text className="tick head" x="250" y="14">{d.latency}</text>
        {SETTINGS.map(([k, name], i) => {
          const yy = 32 + i * 50, v = d[k];
          return (
            <g key={k}>
              <text className="tick strong" x="0" y={yy + 9}>
                {name.replace(' at minimum', '')}<tspan x="0" dy="13">at minimum</tspan>
              </text>
              <rect className="bar good sized" x="100" y={yy} width={pw(v.power)} height="22" rx="3" />
              <text className="val strong good-t" x={100 + pw(v.power) + 6} y={yy + 16}>−{Math.abs(v.power)}%</text>
              <rect className="bar bad sized" x="250" y={yy} width={lt(v.latency)} height="22" rx="3" />
              <text className="val strong bad-t" x={250 + lt(v.latency) + 6} y={yy + 16}>+{v.latency}%</text>
            </g>
          );
        })}
      </svg>
    </>
  );
}

// 2.2: how early each downscaled setting must wake to match Default (the demo's early wake-up view).
function WakeLead({ choice = 'sm', setChoice }: FigureProps) {
  const k = choice as 'sm' | 'smMem';
  const L = 4, xWork = 236, xEnd = W - 4, T0 = -0.36;
  const x = (s: number) => L + ((s - T0) / -T0) * (xWork - L);
  const rows = [
    { key: 'ready', title: 'Default (no scaling)' },
    { key: 'sm', title: 'SM at minimum' },
    { key: 'smMem', title: 'SM + memory at minimum' },
  ] as const;
  return (
    <>
      <Seg label="Wake-up" value={k} onChange={(v) => setChoice?.(v)}
        options={[['sm', 'Wake from minimum SM'], ['smMem', 'Wake from minimum SM + memory']] as const} />
      <svg viewBox={`0 0 ${W} 198`} role="img" aria-label={`Waking ${WAKE_LEAD_MS[k]} ms before work starts gives the same performance as Default.`}>
        {rows.map((r, i) => {
          const y = 14 + i * 56, by = y + 10, bh = 20, ay = by + bh / 2;
          const dim = r.key !== 'ready' && r.key !== k;
          return (
            <g key={r.key} className={`lead-row ${r.key}${dim ? ' dim' : ''}`}>
              <text className="tick strong row-title" x={L} y={y}>{r.title}</text>
              <line className="axis faint" x1={L} x2={xEnd} y1={ay} y2={ay} />
              {r.key !== 'ready' ? (
                <g key={`${r.key}-${k}`} className={r.key === k ? 'lead-grow' : ''}>
                  <line className="lead" x1={x(-WAKE_LEAD_MS[r.key] / 1000)} x2={xWork - 6} y1={ay} y2={ay} />
                  <path className="lead-head" d={`M${xWork - 8},${ay - 6} L${xWork},${ay} L${xWork - 8},${ay + 6} Z`} />
                  <circle className="lead-dot" cx={x(-WAKE_LEAD_MS[r.key] / 1000)} cy={ay} r="5" />
                  <text className="val strong lead-t" x={(x(-WAKE_LEAD_MS[r.key] / 1000) + xWork) / 2} y={ay + 16} textAnchor="middle">wake {WAKE_LEAD_MS[r.key]} ms earlier</text>
                </g>
              ) : null}
              <rect className="bar infer" x={xWork} y={by} width={xEnd - xWork} height={bh} rx="4" />
              <text className="in light" x={(xWork + xEnd) / 2} y={by + 14} textAnchor="middle">{r.key === 'ready' ? 'inference' : 'same as Default'}</text>
            </g>
          );
        })}
        <line className="work-line" x1={xWork} x2={xWork} y1="18" y2="172" />
        {[-0.3, -0.2, -0.1].map((s) => <text key={s} className="tick small" x={x(s)} y="178" textAnchor="middle">{s * 1000} ms</text>)}
        <text className="tick strong" x={xWork} y="194" textAnchor="middle">work starts on an L40S GPU</text>
      </svg>
    </>
  );
}

// 3.2: energy vs. p95 latency, normalized to Default. Hover, focus or tap a point for its numbers.
function Tradeoff() {
  const [hover, setHover] = useState<number | null>(null);
  const L = 40, R = 10, top = 48, bot = 180, H = 214;
  const x = (v: number) => L + ((v - 0.97) / (1.9 - 0.97)) * (W - L - R);
  const y = (v: number) => bot - ((v - 0.55) / (1.03 - 0.55)) * (bot - top);
  const NAMES = { reactive: 'Reactive baseline', netwake: 'Net-wake', margin: 'Net-wake, 3.5 s margin' } as const;
  const shape = (p: (typeof TRADEOFF)[number], i: number) => {
    const cx = x(p.p95), cy = y(p.energy), props = {
      className: `pt ${p.setting}${hover === i ? ' hot' : ''}`, tabIndex: 0, role: 'button',
      'aria-label': `${NAMES[p.kind]}, ${p.setting === 'sm' ? 'SM' : 'SM and memory'} down: ${p.energyTxt} energy, ${p.p95Txt} p95 latency vs. Default`,
      onMouseEnter: () => setHover(i), onFocus: () => setHover(i), onClick: () => setHover(i), onMouseLeave: () => setHover(null), onBlur: () => setHover(null),
    };
    if (p.kind === 'reactive') return <rect key={i} {...props} x={cx - 6} y={cy - 6} width="12" height="12" />;
    if (p.kind === 'netwake') return <circle key={i} {...props} cx={cx} cy={cy} r="7" />;
    return <path key={i} {...props} d={`M${cx},${cy - 8} L${cx + 8},${cy} L${cx},${cy + 8} L${cx - 8},${cy} Z`} />;
  };
  const tip = hover === null ? null : TRADEOFF[hover];
  const tx = tip ? Math.min(x(tip.p95) + 12, W - 178) : 0, ty = tip ? Math.min(Math.max(top, y(tip.energy) - 40), bot - 62) : 0;
  const trails = (['sm', 'smMem'] as const).map((s) => TRADEOFF.filter((p) => p.setting === s));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Energy versus p95 latency, normalized to Default. Lower left is better.">
      <g className="legend-shapes">
        <rect className="pt neutral" x="40" y="5" width="9" height="9" /><text className="tick" x="54" y="13">Reactive baseline</text>
        <circle className="pt neutral" cx="170" cy="9.5" r="5" /><text className="tick" x="180" y="13">Net-wake</text>
        <path className="pt neutral" d="M253,4 L258.5,9.5 L253,15 L247.5,9.5 Z" /><text className="tick" x="263" y="13">Net-wake, 3.5 s margin</text>
        <rect className="bar sm-f" x="40" y="22" width="10" height="10" rx="2" /><text className="tick" x="54" y="31">{SETTING_NAME.sm}</text>
        <rect className="bar smMem-f" x="170" y="22" width="10" height="10" rx="2" /><text className="tick" x="184" y="31">{SETTING_NAME.smMem}</text>
      </g>
      {[0.6, 0.7, 0.8, 0.9, 1.0].map((v) => <g key={v}><line className="grid" x1={L} x2={W - R} y1={y(v)} y2={y(v)} /><text className="tick small" x={L - 6} y={y(v) + 4} textAnchor="end">{v.toFixed(1)}</text></g>)}
      {[1.0, 1.2, 1.4, 1.6, 1.8].map((v) => <text key={v} className="tick small" x={x(v)} y={bot + 14} textAnchor="middle">{v.toFixed(1)}</text>)}
      <line className="ref" x1={x(1)} x2={x(1)} y1={top} y2={bot} />
      <line className="ref" x1={L} x2={W - R} y1={y(1)} y2={y(1)} />
      <text className="tick small" x={(L + W - R) / 2} y={H - 1} textAnchor="middle">p95 latency (vs. Default)</text>
      <text className="tick small" x="10" y={(top + bot) / 2} transform={`rotate(-90 10 ${(top + bot) / 2})`} textAnchor="middle">energy</text>
      {trails.map(([r, n, m]) => (
        <polyline key={r.setting} className={`trail ${r.setting}`} points={`${x(r.p95)},${y(r.energy)} ${x(n.p95)},${y(n.energy)} ${x(m.p95)},${y(m.energy)}`} />
      ))}
      <path className="star" d={starPath(x(1), y(1), 7)} />
      <text className="tick strong" x={x(1) + 10} y={y(1) - 6}>Default</text>
      {TRADEOFF.map(shape)}
      {tip ? (
        <g className="tip" pointerEvents="none">
          <rect x={tx} y={ty} width="176" height="62" rx="6" />
          <text className="tick strong" x={tx + 9} y={ty + 15}>{NAMES[tip.kind]}</text>
          <text className="tick small" x={tx + 9} y={ty + 28}>{SETTING_NAME[tip.setting]}</text>
          <text className="tick" x={tx + 9} y={ty + 43}><tspan className="good-t">{tip.energyTxt} energy</tspan>, <tspan className="bad-t">{tip.p95Txt} p95</tspan></text>
          <text className="tick small" x={tx + 9} y={ty + 56}>compared with Default</text>
        </g>
      ) : null}
    </svg>
  );
}

function starPath(cx: number, cy: number, r: number) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
  });
  return `M${pts.join(' L')} Z`;
}

const FIGURES: Record<FigureId, (p: FigureProps) => JSX.Element> = {
  'idle-power': IdlePower, 'exec-idle': ExecIdle, concurrency: Concurrency, 'agent-trace': AgentTrace,
  reactive: Reactive, 'wake-lead': WakeLead, tradeoff: Tradeoff,
};

export function AnswerFigure({ figure, ...props }: { figure: FigureId | { placeholder: string } } & FigureProps) {
  if (typeof figure !== 'string') {
    return <div className="fig-placeholder" role="note"><span className="label">Figure to be added</span><p>{figure.placeholder}</p></div>;
  }
  const F = FIGURES[figure];
  return <div className="fig"><F {...props} /></div>;
}
