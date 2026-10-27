// Shared Back / Next row. Next is never hidden: when it is locked, a hint says what to do.
import { h } from './dom.js';

/**
 * back: () => void, or null on a first page.
 * next: { label, enabled = true, hint, onClick } or { label, href } for links to other activities.
 */
export function pageNav({ back = null, next }) {
  const enabled = next.enabled ?? true;
  const nextEl = next.href && enabled
    ? h('a', { class: 'btn primary', href: next.href }, next.label)
    : h('button', { class: 'btn primary', type: 'button', disabled: !enabled, onclick: next.onClick }, next.label);
  return h('nav', { class: 'page-nav', 'aria-label': 'Page navigation' },
    !enabled && next.hint ? h('p', { class: 'nav-hint', role: 'status' }, next.hint) : null,
    h('div', { class: 'page-nav-row' },
      back ? h('button', { class: 'btn back', type: 'button', onclick: back }, '← Back') : h('span'),
      nextEl));
}
