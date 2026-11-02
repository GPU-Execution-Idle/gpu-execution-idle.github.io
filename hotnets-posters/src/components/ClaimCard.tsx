// One part of the argument, as a foldable card: its heading (e.g. "The Hidden Energy Problem")
// shows by default, and unfolding it reveals its numbered questions (1.1, 1.2, …). Opening a
// question expands its answer card in place. A deep link to a question unfolds its part.
import { useEffect, useState, type KeyboardEvent } from 'react';
import { questionAnchor, type Claim, type Question } from '../content/claims';
import { AnswerFigure } from './Figures';

type Props = { claim: Claim; open: string | null; onToggle: (anchor: string) => void; onClose: () => void };

// Arrow keys move between the visible part headings and question rows; Home/End jump to the ends.
function onRowKey(e: KeyboardEvent<HTMLButtonElement>) {
  const rows = [...document.querySelectorAll<HTMLButtonElement>('.part-toggle, .q-row')].filter((r) => !r.closest('[inert]'));
  const i = rows.indexOf(e.currentTarget);
  const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: rows.length - 1 }[e.key];
  if (to === undefined || !rows[to]) return;
  e.preventDefault();
  rows[to].focus();
}

// **text** -> bold.
const inline = (t: string) => t.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part));

// A takeaway paragraph: a bulleted list when every line starts with "- ", otherwise a paragraph.
export function Para({ text }: { text: string }) {
  const lines = text.split('\n');
  if (lines.every((l) => l.startsWith('- '))) {
    return <ul className="takeaway takeaway-list">{lines.map((l, i) => <li key={i}>{inline(l.slice(2))}</li>)}</ul>;
  }
  return <p className="takeaway">{inline(text)}</p>;
}

// The takeaway can follow the figure's buttons (e.g. which setting is selected); a blank line
// in it starts a new paragraph.
function AnswerCard({ q, onClose }: { q: Question; onClose: () => void }) {
  const [choice, setChoice] = useState(q.choice ?? '');
  const text = typeof q.takeaway === 'function' ? q.takeaway(choice) : q.takeaway;
  return (
    <div className="answer-card">
      <button type="button" className="card-close" onClick={onClose} aria-label="Close answer">×</button>
      {text.split('\n\n').map((para, i) => <Para key={i} text={para} />)}
      {q.figure ? <AnswerFigure figure={q.figure} choice={choice} setChoice={setChoice} /> : null}
    </div>
  );
}

export function ClaimCard({ claim, open, onToggle, onClose }: Props) {
  const anchors = claim.questions.map((q) => questionAnchor(claim, q));
  const hasOpen = open !== null && anchors.includes(open);
  const [unfolded, setUnfolded] = useState(hasOpen);
  useEffect(() => { if (hasOpen) setUnfolded(true); }, [hasOpen]);
  const fold = () => {
    if (unfolded && hasOpen) onClose(); // folding a part also closes its open answer
    setUnfolded(!unfolded);
  };
  return (
    <section className={`claim${unfolded ? ' unfolded' : ''}`} id={claim.id} aria-labelledby={`${claim.id}-title`}>
      <h2 className="part-head">
        <button type="button" className="part-toggle" aria-expanded={unfolded} aria-controls={`${claim.id}-questions`}
          onClick={fold} onKeyDown={onRowKey}>
          <span className="part-no">{claim.n}</span>
          <span className="part-title" id={`${claim.id}-title`}>{claim.part}</span>
          <span className="part-icon" aria-hidden="true" />
        </button>
      </h2>
      <div className="part-body" id={`${claim.id}-questions`} {...(unfolded ? {} : { inert: '' })}>
        <ol className="questions">
          {claim.questions.map((q, i) => {
            const a = anchors[i];
            const isOpen = open === a;
            return (
              <li key={q.id} id={a} className={`question${isOpen ? ' open' : ''}`}>
                <h3>
                  <button type="button" className="q-row" aria-expanded={isOpen} aria-controls={`${a}-answer`}
                    onClick={() => onToggle(a)} onKeyDown={onRowKey}>
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
