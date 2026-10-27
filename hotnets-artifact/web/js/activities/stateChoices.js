// Power-state option buttons, shared by Activities 1 and 2.
import { h } from '../ui/dom.js';
import { STATES } from '../../shared/activities.js';
import { PARAMS } from '../../shared/params.js';

export function stateChoices(current, onPick) {
  return h('div', { class: 'choices', role: 'group', 'aria-label': 'Power state while the tool runs' },
    Object.entries(STATES).map(([key, s]) => h('button', {
      class: 'choice', type: 'button', 'aria-pressed': String(current === key), onclick: () => onPick(key),
    },
    h('span', { class: 'swatch', style: `background:var(--c-${key})` }),
    h('span', { class: 'title' }, s.label),
    h('span', { class: 'sub' }, `≈${PARAMS.power[key]} W while idle · ${PARAMS.recoveryS[key] ? `${Math.round(PARAMS.recoveryS[key] * 1000)} ms to wake` : 'no wake-up delay'}`))));
}
