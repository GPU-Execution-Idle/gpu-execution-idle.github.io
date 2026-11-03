// Sound for "Wake the GPU!": soft background music and one cue per outcome, synthesized with Web Audio
// (no files, works offline). Sound is off by default; nothing starts until the player turns it on.
// Browsers allow audio only after a user gesture, so start() runs from a press or the music button.
// The on/off choice is remembered in this browser when storage is available.
const KEY = 'wake-gpu-muted';
let ctx = null, master = null, musicBus = null, timer = null, nextAt = 0, step = 0;
let muted = true;
try { muted = localStorage.getItem(KEY) !== '0'; } catch { /* storage blocked: stay off */ }

export const isMuted = () => muted;

export function start() {
  if (muted) return;
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
  // Music runs through a low-pass filter at a low level, so it stays in the background.
  const soft = ctx.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 1600;
  musicBus = ctx.createGain(); musicBus.gain.value = .55;
  musicBus.connect(soft).connect(master);
  nextAt = ctx.currentTime + .1;
  timer = setInterval(schedule, 100);
}

export function setMuted(m) {
  muted = m;
  try { localStorage.setItem(KEY, m ? '1' : '0'); } catch { /* not remembered */ }
  if (master) master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, .05);
}

// Pause everything while the tab is hidden.
export function pause(hidden) { if (ctx) hidden ? ctx.suspend() : ctx.resume(); }

function tone(freq, at, dur, { type = 'sine', gain = .2, to = null, out = master } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, at);
  if (to) o.frequency.exponentialRampToValueAtTime(to, at + dur);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + Math.min(.02, dur / 4));
  g.gain.exponentialRampToValueAtTime(.0001, at + dur);
  o.connect(g).connect(out);
  o.start(at); o.stop(at + dur + .05);
}

// A quick rising "boing" for the wake press, then one cue per outcome: a bright rising chime (perfect),
// a softer two-note chime (good), a short falling "uh-oh" (too early), a low sliding "womp" (too late).
export function cue(kind) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + .01;
  if (kind === 'jump') {
    tone(330, t, .16, { type: 'square', gain: .05, to: 880 });
    tone(330, t, .16, { gain: .12, to: 880 });
  } else if (kind === 'perfect') {
    [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * .07, .35, { type: 'triangle', gain: .16 }));
    tone(2093, t + .3, .5, { gain: .07 });
  } else if (kind === 'good') {
    tone(659, t, .3, { type: 'triangle', gain: .13 });
    tone(988, t + .09, .4, { type: 'triangle', gain: .13 });
  } else if (kind === 'early') {
    tone(523, t, .16, { type: 'triangle', gain: .14 });
    tone(392, t + .14, .26, { type: 'triangle', gain: .14 });
  } else if (kind === 'late') {
    tone(220, t, .45, { type: 'sawtooth', gain: .07, to: 98 });
    tone(110, t, .45, { gain: .16, to: 55 });
  }
}

// Background: a slow I–vi–IV–V loop (C, Am, F, G) as a sine pad, with a quiet triangle arpeggio in eighths.
const BEAT = 60 / 84, CHORDS = [[261.63, 329.63, 392], [220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66]];
function schedule() {
  while (nextAt < ctx.currentTime + .4) {
    const chord = CHORDS[Math.floor(step / 8) % CHORDS.length];
    if (step % 8 === 0) for (const f of chord) tone(f / 2, nextAt, BEAT * 4, { gain: .045, out: musicBus });
    const arp = [0, 1, 2, 1, 2, 0, 1, 2][step % 8];
    tone(chord[arp] * 2, nextAt, BEAT * .9, { type: 'triangle', gain: .02, out: musicBus });
    nextAt += BEAT / 2; step++;
  }
}
