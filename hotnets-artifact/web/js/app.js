// App shell: hash router (refresh-safe on GitHub Pages at any subpath), header, home page.
import { h } from './ui/dom.js';
import { removePrefix } from './store.js';
import { PROGRESS_EVENT } from './progress.js';
import * as home from './home.js';
import * as explore from './activities/explore.js';
import * as build from './activities/build.js';

const app = document.getElementById('app');
let cleanup = null;
let current = '';

const ACTS = { explore, build };
const ACT_NAMES = { explore: 'Explore', build: 'Build a controller' };
// Old activity links now open the merged Explore session.
const REDIRECTS = { a0: '#/explore', a1: '#/explore', a2: '#/build' };

// Restart: resets only the current activity. First tap arms it, a second tap within 3 s confirms.
let restartTimer = 0;
function setupRestart() {
  const btn = document.getElementById('actrestart');
  const disarm = () => { clearTimeout(restartTimer); btn.classList.remove('armed'); btn.textContent = '↺'; };
  btn.addEventListener('click', () => {
    if (!btn.classList.contains('armed')) {
      btn.classList.add('armed');
      btn.textContent = 'Tap again';
      restartTimer = setTimeout(disarm, 3000);
      return;
    }
    disarm();
    ACTS[current]?.reset();
    route();
  });
  window.addEventListener('hashchange', disarm);
}

// Step bar for the current section.
function refreshNav() {
  const box = document.getElementById('actprogress');
  box.hidden = !ACTS[current];
  if (box.hidden) return;
  const p = ACTS[current].progress();
  document.getElementById('actprogress-label').textContent = p.steps && !p.compact ? '' : p.label;
  // Activities with named steps get a segmented bar (e.g. Waiting power → Returning work → Takeaways).
  const steps = document.getElementById('actprogress-steps');
  const bar = document.getElementById('actprogress-bar');
  bar.hidden = !!p.steps;
  steps.hidden = !p.steps;
  if (p.steps) {
    // Shared step component: current (accent), completed (✓), upcoming (muted). Compact mode
    // (many steps) shows unlabeled segments and puts "Step n of N · name" in the label.
    steps.classList.toggle('compact', !!p.compact);
    steps.replaceChildren(...p.steps.map((name, i) => h('li', {
      class: i === p.current ? 'current' : p.completed?.[i] ? 'done' : 'upcoming', 'aria-current': i === p.current ? 'step' : null,
      'aria-label': `${name}${i === p.current ? ' (current step)' : p.completed?.[i] ? ' (completed)' : ''}`,
    }, name)));
    return;
  }
  bar.setAttribute('aria-valuemax', p.total);
  bar.setAttribute('aria-valuenow', p.done);
  bar.firstElementChild.style.width = `${(100 * p.done) / p.total}%`;
}

const routes = {
  '': () => home.mount(app),
  explore: () => explore.mount(app),
  build: () => build.mount(app),
};

function route() {
  if (typeof cleanup === 'function') cleanup();
  const [name = '', arg] = location.hash.replace(/^#\/?/, '').split('/');
  if (REDIRECTS[name]) { location.replace(REDIRECTS[name]); return; }
  // Unknown routes (including old #/scoreboard links) go to the home page.
  if (name && !(name in routes)) { location.replace('#/'); return; }
  current = name in ACTS ? name : '';
  cleanup = routes[name](arg);
  refreshNav();
  document.title = current ? `Wake the GPU · ${ACT_NAMES[current]}` : 'Wake the GPU';
  window.scrollTo(0, 0);
  app.focus({ preventScroll: true });
}

function init() {
  // iOS Safari ignores user-scalable=no; block its pinch-zoom gesture directly.
  for (const ev of ['gesturestart', 'gesturechange']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
  // Clear data left by removed features (scoreboard, nickname/identity, badges, pre-merge activities).
  for (const prefix of ['demo-board:', 'identity', 'badges', 'a0v', 'a1v']) removePrefix(prefix);
  window.addEventListener('hashchange', route);
  window.addEventListener(PROGRESS_EVENT, refreshNav);
  setupRestart();
  route();
}

init();
