// Welcome page: title, the two section names (informational), and Start → Explore.
import { h } from './ui/dom.js';

const SUMMARIES = [
  ['1', 'Explore GPU execution-idle'],
  ['2', 'Build your power controller'],
];

export function mount(root) {
  document.body.classList.add('welcome');
  root.replaceChildren(h('section', { class: 'welcome-page' },
    h('p', { class: 'welcome-label' }, 'HotNets 2026 · Interactive demo'),
    h('h1', { class: 'welcome-title' }, h('span', { class: 'lead' }, 'The network should'), h('span', { class: 'big' }, 'wake the GPU.')),
    h('ol', { class: 'welcome-list', 'aria-label': 'Activities' }, SUMMARIES.map(([n, title]) => h('li', {},
      h('span', { class: 'n', 'aria-hidden': 'true' }, n),
      h('b', {}, title)))),
    h('a', { class: 'welcome-start', href: '#/explore' }, 'Start', h('span', { 'aria-hidden': 'true' }, '→'))));
  return () => document.body.classList.remove('welcome');
}
