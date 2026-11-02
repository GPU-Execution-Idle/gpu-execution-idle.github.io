// Full paper poster, 36×48 in portrait: a title band (authors and a QR code to the game), then the
// argument's three parts as full-width rows, each a heading over its two questions side by side.
// The cards in a row share a height. Figures come from PosterFigures (still, quiet, text at body size).
// A question's `poster` field, where set, replaces its takeaway or figure here; a claim's `posterPart` its heading.
// Everything scales with the sheet's width (--u = 1% of it), so the browser preview, fullscreen and print match.
import { useEffect, type CSSProperties } from 'react';
import { CLAIMS, PAPER, type Question } from '../content/claims';
import { GAME_URL } from '../content/config';
import { PosterFigure } from '../components/PosterFigures';
import { Para } from '../components/ClaimCard';
import { PowerTrace } from '../components/PowerTrace';
import { QrCode } from '../components/QrCode';
import { ROUTES } from '../App';
import '../styles/paper.css';
import '../styles/full.css';

const W = 36, H = 48;

function Card({ n, q }: { n: string; q: Question }) {
  const text = q.poster?.takeaway ?? (typeof q.takeaway === 'function' ? q.takeaway(q.choice ?? '') : q.takeaway);
  const figure = q.poster?.figure ?? q.figure;
  return (
    <section className="fp-card">
      <h3 className="fp-q"><span className="fp-q-no">{n}</span><span>{q.q}</span></h3>
      {text ? <div className="fp-text">{text.split('\n\n').map((para, k) => <Para key={k} text={para} />)}</div> : null}
      {typeof figure === 'string' ? <div className="fp-fig"><PosterFigure id={figure} /></div> : null}
    </section>
  );
}

export function FullPoster() {
  // Print at the full physical size, edge to edge.
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `@page { size: ${W}in ${H}in; margin: 0; } @media print { .sheet { width: ${W}in; height: ${H}in; } }`;
    document.head.append(style);
    document.title = `${PAPER.title} · Full poster ${W}×${H} in`;
    return () => style.remove();
  }, []);

  return (
    <div className="paper-view">
      <nav className="paper-tools" aria-label="Poster controls">
        <a href={ROUTES.web}>← Interactive poster</a>
        <a className="alt" href={ROUTES.paper}>Headline poster</a>
        <button type="button" onClick={() => document.querySelector('.stage')?.requestFullscreen?.()}>Fullscreen</button>
        <button type="button" onClick={() => window.print()}>Print / PDF</button>
      </nav>

      <div className="stage">
        <article className="sheet fp" style={{ aspectRatio: `${W} / ${H}`, '--ar': W / H } as CSSProperties} aria-label={`${PAPER.title}: full poster`}>
          <header className="fp-head">
            <div className="fp-head-text">
              <p className="label fp-venue">{PAPER.venue}</p>
              <h1 className="fp-title">The Network Should <em>Wake</em> the&nbsp;GPU</h1>
              <p className="fp-authors">{PAPER.authors.join(', ')}</p>
              <p className="fp-affil">{PAPER.affiliation}</p>
            </div>
            <figure className="fp-qr">
              <QrCode url={GAME_URL} className="fp-qr-code" />
              <figcaption><span className="label">Game</span></figcaption>
            </figure>
            <PowerTrace className="fp-trace" />
          </header>

          <main className="fp-parts">
            {CLAIMS.map((c) => (
              <section key={c.id} className="fp-part" aria-labelledby={`fp-${c.id}`}>
                <h2 className="fp-part-head" id={`fp-${c.id}`}>
                  <span className="fp-part-no">{c.n}</span>
                  <span className="fp-part-title">{c.posterPart ?? c.part}</span>
                </h2>
                {c.questions.map((q, i) => <Card key={q.id} n={`${c.n}.${i + 1}`} q={q} />)}
              </section>
            ))}
          </main>
        </article>
      </div>
    </div>
  );
}
