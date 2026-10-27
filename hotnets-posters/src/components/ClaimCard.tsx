// One claim. At rest it shows only its headline; hovering or focusing it reveals the numbered
// subquestions (1.1, 1.2, …). Opening a question shows its answer card right below it, while the
// poster dims the other claims and hides this claim's other questions.
import { useState, type KeyboardEvent } from 'react';
import { questionAnchor, type Claim, type Question } from '../content/claims';
import { AnswerFigure } from './Figures';

type Props = { claim: Claim; open: string | null; onToggle: (anchor: string) => void; onClose: () => void };

// Arrow keys move between the visible question rows; Home/End jump to the ends.
function onRowKey(e: KeyboardEvent<HTMLButtonElement>) {
  const rows = [...document.querySelectorAll<HTMLButtonElement>('.q-row')].filter((r) => r.offsetParent);
  const i = rows.indexOf(e.currentTarget);
  const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: rows.length - 1 }[e.key];
  if (to === undefined || !rows[to]) return;
  e.preventDefault();
  rows[to].focus();
}

// The takeaway can follow the figure's buttons (e.g. which setting is selected).
function AnswerCard({ q, onClose }: { q: Question; onClose: () => void }) {
  const [choice, setChoice] = useState(q.choice ?? '');
  return (
    <div className="answer-card">
      <button type="button" className="card-close" onClick={onClose} aria-label="Close answer">×</button>
      <p className="takeaway">{typeof q.takeaway === 'function' ? q.takeaway(choice) : q.takeaway}</p>
      {q.figure ? <AnswerFigure figure={q.figure} choice={choice} setChoice={setChoice} /> : null}
    </div>
  );
}

export function ClaimCard({ claim, open, onToggle, onClose }: Props) {
  const anchors = claim.questions.map((q) => questionAnchor(claim, q));
  const focused = open !== null && anchors.includes(open);
  const dimmed = open !== null && !focused;
  // Touch screens have no hover: a tap on the headline reveals the questions.
  const [peek, setPeek] = useState(false);
  return (
    <section className={`claim${focused ? ' focused' : ''}${dimmed ? ' dimmed' : ''}${peek ? ' peek' : ''}`}
      id={claim.id} aria-labelledby={`${claim.id}-title`} onClick={dimmed ? onClose : undefined}>
      <header className="claim-head" onClick={() => !open && setPeek((p) => !p)}>
        <span className="label claim-no">Claim #{claim.n}</span>
        <h2 id={`${claim.id}-title`}>{claim.text}</h2>
        <span className="q-hint" aria-hidden="true">{claim.questions.length} questions</span>
      </header>
      <div className="q-wrap">
        <ol className="questions">
          {claim.questions.map((q, i) => {
            const a = anchors[i];
            const isOpen = open === a;
            return (
              <li key={q.id} id={a} className={`question${isOpen ? ' open' : ''}${focused && !isOpen ? ' hidden' : ''}`}>
                <h3>
                  <button type="button" className="q-row" aria-expanded={isOpen} aria-controls={`${a}-answer`}
                    tabIndex={dimmed ? -1 : 0} onClick={(e) => { e.stopPropagation(); onToggle(a); }} onKeyDown={onRowKey}>
                    <span className="q-no">{claim.n}.{i + 1}</span>
                    <span className="q-text">{q.q}</span>
                    <span className="q-icon" aria-hidden="true" />
                  </button>
                </h3>
                <div className="answer" id={`${a}-answer`} role="region" aria-label={q.q} {...(isOpen ? {} : { inert: '' })}>
                  <div className="answer-inner">{isOpen ? <AnswerCard q={q} onClose={onClose} /> : null}</div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
