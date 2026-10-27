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
const ACT_NAMES = { explore: 'Explore', build: 'Build your controller' };
// Old activity links now open the merged Explore session.
const REDIRECTS = { a0: '#/explore', a1: '#/explore', a2: '#/build' };

// Restart: resets every page and returns to step 0. First tap arms it, a second tap within 3 s confirms.
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
    for (const act of Object.values(ACTS)) act.reset();
    if (location.hash === '#/explore') route();
    else location.hash = '#/explore';
  });
  window.addEventListener('hashchange', disarm);
}

// Step bar shared by Explore and Build: the Explore steps, then Build your controller as the last
// step. One button per step, so visitors can jump to any step.
function refreshNav() {
  const box = document.getElementById('actprogress');
  box.hidden = !ACTS[current];
  if (box.hidden) return;
  const e = explore.progress();
  const BUILD = e.steps.length;
  const names = [...e.steps, 'Build your controller'];
  const completed = [...e.completed, build.progress().completed[2]];
  const at = current === 'build' ? BUILD : e.current;
  const go = (i) => {
    if (i === BUILD) { location.hash = '#/build'; return; }
    if (current === 'explore') { explore.goToStep(i); return; }
    explore.setStep(i);
    location.hash = '#/explore';
  };
  const steps = document.getElementById('actprogress-steps');
  // Current step: accent; completed: check mark; upcoming: muted.
  steps.replaceChildren(...names.map((name, i) => {
    const label = `${i} · ${name}`;
    const state = i === at ? 'current' : completed[i] ? 'done' : 'upcoming';
    return h('li', {}, h('button', {
      type: 'button', class: `step ${state}`, 'aria-current': i === at ? 'step' : null,
      'aria-label': `${label}${state === 'current' ? ' (current step)' : state === 'done' ? ' (completed)' : ''}`,
      onclick: () => go(i),
    }, label));
  }));
  // Keep the current step visible in the strip (it scrolls sideways on narrow phones).
  const cur = steps.querySelector('.step.current');
  if (cur) steps.scrollLeft = Math.max(0, cur.offsetLeft - (steps.clientWidth - cur.offsetWidth) / 2);
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
