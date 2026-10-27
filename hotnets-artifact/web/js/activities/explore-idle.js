// Explore pages about idle power and the missing information: "Does 0% utilization mean low
// power?" and "When will work return?" (real L40S traces). Data: shared/activity0-data.js.
// Pages get a context from explore.js: { st, persist, render, nav, justRevealed, animId }.
import { h, esc, questionCard } from '../ui/dom.js';
import { A0_DATA as D } from '../../shared/activity0-data.js';
import { IDLE_POWER } from '../../shared/params.js';

const GUESS_KEYS = ['less', 'about', 'more'];
const WORK = 'var(--c-infer)'; // returning GPU work, same color as inference elsewhere

export function idlePages(ctx) {
  const { st } = ctx;

  // ---------------- Idle power ----------------
  function idlePower() {
    const P = D.power;
    const revealed = st.idleChoice != null;
    const max = P.execIdleW * 1.1;
    // One column per GPU: the card, and after the answer its power as a vertical bar.
    const column = (cls, letter, desc, name, watts) => h('div', { class: `gpu-col ${cls} ${revealed && ctx.justRevealed ? 'animate' : ''}` },
      h('div', { class: 'gpu-card' },
        h('div', { class: 'gpu-head' }, h('span', { class: 'gpu-letter' }, letter),
          revealed ? h('span', { class: 'gpu-state' }, name) : h('span', { class: 'gpu-name' }, P.gpu)),
        h('div', { class: 'small muted' }, desc),
        h('div', { class: 'gpu-util' }, h('span', { class: 'small muted' }, 'Utilization'), h('b', {}, '0%')),
        revealed ? null : h('div', { class: 'gpu-util' }, h('span', { class: 'small muted' }, 'Power'), h('b', {}, '? W'))),
      revealed ? h('div', { class: 'vbar-wrap' },
        h('div', { class: 'vbar', style: `--h:${(100 * watts) / max}%` },
          h('span', { class: 'vbar-val' }, `${watts} W`),
          h('span', { class: 'vbar-name' }, name))) : null);
    const choice = (key, label) => h('button', {
      class: 'choice plain center', type: 'button', 'aria-pressed': String(st.idleChoice === key), disabled: revealed,
      onclick: () => { st.idleChoice = key; ctx.justRevealed = true; ctx.persist(); ctx.render(); },
    }, h('span', { class: 'title' }, label));

    const out = [
      questionCard(
        h('h1', {}, 'Does 0% utilization mean low power?'),
        h('p', {}, `Two identical ${P.gpu} GPUs, neither running any work. Which uses more power?`),
        h('div', { class: 'three' }, choice('A', 'A'), choice('same', 'About the same'), choice('B', 'B'))),
      h('div', { class: 'gpu-pair' },
        column('is-true', 'A', 'No program loaded', 'True idle', P.trueIdleW),
        column('is-exec', 'B', 'Inference engine loaded', 'Execution-idle', P.execIdleW)),
    ];
    if (revealed) {
      const gap = P.execIdleW - P.trueIdleW;
      const verdict = st.idleChoice === 'B' ? 'Right: ' : 'Not quite: ';
      const others = h('div', { class: 'bars', hidden: true }, IDLE_POWER.map((g) => h('div', { class: 'bar-row' },
        h('div', { class: 'name' }, h('span', {}, g.gpu),
          h('span', {}, `${g.trueIdle} → ${g.execIdle} W `, h('b', { class: 'diff' }, `+${g.execIdle - g.trueIdle} W`))),
        h('div', { class: 'bar true thin', style: `width:${(100 * g.trueIdle) / 200}%` }),
        h('div', { class: 'bar exec thin', style: `width:${(100 * g.execIdle) / 200}%` }))));
      const othersBtn = h('button', { class: 'btn', type: 'button', 'aria-expanded': 'false', onclick: () => {
        others.hidden = !others.hidden;
        othersBtn.setAttribute('aria-expanded', String(!others.hidden));
        othersBtn.textContent = others.hidden ? 'Other GPUs' : 'Hide other GPUs';
      } }, 'Other GPUs');
      out.push(
        h('p', { class: 'feedback result-box', 'aria-live': 'polite' }, h('b', {}, verdict), 'B draws ', h('b', { class: 'diff' }, `+${gap} W`),
          ` (${(P.execIdleW / P.trueIdleW).toFixed(1)}×) more at 0% utilization.`),
        othersBtn, others);
    }
    out.push(ctx.nav({ enabled: revealed, hint: 'Choose an answer to continue.' }));
    return out;
  }

  // ---------------- When will work return? ----------------
  function whenReturn() {
    const chart = h('div');
    const all = D.executions.map((_, i) => i);
    const guess = !st.cantTell && st.guessCurrent ? D.guesses[st.guessCurrent] : null;
    const shown = st.cantTell ? all : guess ? [guess.execution] : [];
    const legend = (items, lab) => h('div', { class: 'exec-legend' }, items.map((i) =>
      h('div', {}, h('i', { style: `background:${WORK}` }), lab(D.executions[i]))));
    const left = GUESS_KEYS.filter((k) => !st.guessTried.includes(k)).length;

    const card = questionCard(
      h('h1', {}, 'How can a GPU know when work returns, so it can wake early?'),
      h('p', { class: 'prompt' }, `Imagine you’re the GPU: your agent is making a tool call, and you’ve had no work for ${D.zeroUtilForS} seconds. From utilization alone, can you tell how much longer you’ll wait?`));
    const out = [card];
    const cant = h('button', { class: 'choice plain cant', type: 'button', 'aria-pressed': String(st.cantTell), disabled: st.cantTell,
      onclick: () => { st.cantTell = true; ctx.persist(); ctx.render(); } },
    h('span', { class: 'title' }, 'I can’t tell from GPU utilization alone.'));
    if (!st.cantTell) {
      card.append(h('div', { class: 'choices', role: 'group', 'aria-label': 'Your guess' }, GUESS_KEYS.map((k) => h('button', {
        class: 'choice plain', type: 'button', 'aria-pressed': String(st.guessCurrent === k),
        onclick: () => { st.guessCurrent = k; if (!st.guessTried.includes(k)) st.guessTried.push(k); ctx.persist(); ctx.render(); },
      }, h('span', { class: 'title' }, D.guesses[k].label, st.guessTried.includes(k) ? h('span', { class: 'explored' }, 'Explored') : null)))));
      if (!left) card.append(cant);
    } else {
      card.append(cant);
    }
    // Once the visitor concludes they can't tell, the page is done: no more figure.
    if (!st.cantTell) out.push(chart);
    if (guess) {
      const e = D.executions[guess.execution];
      out.push(legend(shown, (x) => `SWE-bench · ${x.task} · step ${x.step}`),
        h('p', { class: 'feedback result-box', 'aria-live': 'polite' }, h('b', {}, 'Here’s a counterexample: '),
          `after the same ${D.zeroUtilForS} seconds without GPU work, this GPU waited another ${e.nextWorkInS.toFixed(1)} seconds.`,
          left ? ' Try another answer.' : ''));
    }
    out.push(ctx.nav({
      enabled: st.cantTell,
      hint: left ? `Explore all three answers to continue (${left} left).` : 'Choose “I can’t tell from GPU utilization alone.” to continue.',
    }));

    // A guess animates its execution's continuation; the arrows appear once it reaches the next work.
    const draw = (f) => { chart.innerHTML = lineSvg(shown, guess ? st.guessCurrent : null, f); };
    if (!guess) draw(1);
    else {
      const t0 = performance.now();
      const tick = (now) => {
        const f = Math.min(1, (now - t0) / 1600);
        draw(f);
        if (f < 1) ctx.animId = requestAnimationFrame(tick);
      };
      ctx.animId = requestAnimationFrame(tick);
    }
    return out;
  }

  return { idlePower, whenReturn };
}

// Line chart of GPU utilization: the shared past, then the shown executions' futures.
// With a guess, one arrow marks the guess and another the actual start of the next work.
function lineSvg(shown, guessKey, f) {
  const W = 340, L = 34, R = 10, TOP = 40, CH = 128;
  const X = D.zeroUtilForS;
  const g = guessKey ? D.guesses[guessKey] : null;
  const guessAt = g && { less: X / 2, about: X, more: 2 * X }[guessKey];
  // Fixed axis for every view, so the shared history and "now" never move. The past gets a
  // fixed share of the width; the future spans the longest wait.
  const tMin = -D.pastS;
  const tMax = Math.max(...D.executions.map((e) => e.nextWorkInS)) * 1.04 + 0.5;
  const xNow = L + 0.3 * (W - L - R);
  const x = (t) => (t <= 0 ? L + ((t - tMin) / -tMin) * (xNow - L) : xNow + (t / tMax) * (W - R - xNow));
  const y = (u) => TOP + CH - (u / 100) * CH;
  const path = (pts) => pts.filter(([t]) => t <= tMax).map(([t, u], k) => `${k ? 'L' : 'M'}${x(t).toFixed(1)},${y(u).toFixed(1)}`).join('');
  const o = [`<defs><pattern id="a0-unknown" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
    <line x1="0" y1="0" x2="0" y2="8" class="unknownline"/></pattern></defs>`];
  for (const u of [0, 50, 100]) {
    o.push(`<line class="grid" x1="${L}" x2="${W - R}" y1="${y(u)}" y2="${y(u)}"/><text class="lab" x="${L - 4}" y="${y(u) + 4}" text-anchor="end">${u}%</text>`);
  }
  if (!shown.length) {
    o.push(`<rect fill="url(#a0-unknown)" x="${x(0)}" y="${TOP}" width="${x(tMax) - x(0)}" height="${CH}"/>`,
      `<text class="lab" x="${(x(0) + x(tMax)) / 2}" y="${TOP + CH / 2}" text-anchor="middle">future: unknown</text>`);
  }
  if (g) {
    const [lo, hi] = g.band;
    o.push(`<rect class="band" x="${x(lo)}" y="${TOP}" width="${x(Math.min(hi, tMax)) - x(lo)}" height="${CH}"/>`);
  }
  // Bracket over the shared observation: the same X seconds without GPU work.
  o.push(`<path class="bracket" d="M${x(-X)},${y(14)} V${y(20)} H${x(0)} V${y(14)}"/>`,
    `<text class="lab" x="${(x(-X) + x(0)) / 2}" y="${y(20) - 4}" text-anchor="middle">${X} s</text>`);
  // Past: every execution, drawn on top of each other (they nearly coincide).
  for (const e of D.executions) o.push(`<path class="uline past" d="${path(e.util.filter(([t]) => t <= 0))}"/>`);
  for (const i of shown) {
    const e = D.executions[i];
    const until = g ? f * (e.nextWorkInS + 1) : Infinity;
    o.push(`<path class="uline" style="stroke:${WORK}" d="${path(e.util.filter(([t]) => t >= -0.1 && t <= until))}"/>`);
  }
  // Arrows above the chart: each label is centered over its own arrow and the shaft starts
  // below the label. Labels sit in two rows; the upper arrow's shaft must not cross the
  // lower label, so the rows swap when it would.
  const HALF = 36; // half a label's width
  const labelX = (t) => Math.min(Math.max(x(t), L + HALF), W - R - HALF);
  const arrow = (t, row, label, color) => {
    const ax = x(t), ly = 11 + row * 14;
    return `<text class="lab arrow-lab" x="${labelX(t)}" y="${ly}" text-anchor="middle" style="fill:${color}">${label}</text>`
      + `<line x1="${ax}" x2="${ax}" y1="${ly + 4}" y2="${TOP - 6}" style="stroke:${color};stroke-width:1.5"/>`
      + `<path d="M${ax - 4},${TOP - 7} L${ax + 4},${TOP - 7} L${ax},${TOP - 1} Z" style="fill:${color}"/>`;
  };
  if (g) {
    const e = D.executions[g.execution];
    const crosses = Math.abs(x(guessAt) - labelX(e.nextWorkInS)) < HALF + 4;
    o.push(arrow(guessAt, crosses ? 1 : 0, 'your guess', 'var(--accent)'));
    if (f * (e.nextWorkInS + 1) >= e.nextWorkInS) o.push(arrow(e.nextWorkInS, crosses ? 0 : 1, 'actual start', WORK));
  }
  // Time axis with a triangle marking "now".
  const base = TOP + CH;
  o.push(`<path d="M${x(0) - 5},${base + 8} L${x(0) + 5},${base + 8} L${x(0)},${base + 1} Z" style="fill:var(--text)"/>`);
  const ticks = [];
  for (let t = -2; t > tMin; t -= 2) ticks.push(t);
  for (let t = 5; t <= tMax; t += 5) ticks.push(t);
  for (const t of ticks) {
    o.push(`<text class="lab" x="${x(t)}" y="${base + 21}" text-anchor="middle">${t > 0 ? '+' : '−'}${Math.abs(t)}s</text>`);
  }
  o.push(`<text x="${x(0)}" y="${base + 21}" text-anchor="middle" style="font-weight:800">now</text>`);
  const label = shown.length
    ? `${shown.length > 1 ? `${shown.length} real executions` : 'A real execution'} with the same past; next work ${shown.map((i) => `${D.executions[i].nextWorkInS.toFixed(1)} s`).join(', ')} later.`
    : 'Future unknown.';
  return `<svg class="tl" viewBox="0 0 ${W} ${base + 26}" role="img" aria-label="${esc(
    `GPU utilization line: busy, then 0% for the past ${X} s. ${label}`)}">${o.join('')}</svg>`;
}
