// Paper poster, built in HTML/CSS so it reads well in a browser and prints at full size.
// Sizes: ?size=24x36 (default) or ?size=36x48 inches, portrait. Everything inside scales with the
// poster's width (container query units), so the browser preview, fullscreen and print match.
import { useEffect, useState, type CSSProperties } from 'react';
import { CLAIMS, PAPER } from '../content/claims';
import { WEB_POSTER_URL } from '../content/config';
import { PowerTrace } from '../components/PowerTrace';
import { QrCode } from '../components/QrCode';
import { ROUTES } from '../App';
import '../styles/paper.css';

export const SIZES = { '24x36': { w: 24, h: 36 }, '36x48': { w: 36, h: 48 } } as const;
type Size = keyof typeof SIZES;
const readSize = (): Size => {
  const s = new URLSearchParams(location.search).get('size');
  return s && s in SIZES ? (s as Size) : '24x36';
};

export function PaperPoster() {
  const [size, setSize] = useState<Size>(readSize);
  const { w, h } = SIZES[size];

  // Print at the chosen physical size, edge to edge.
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `@page { size: ${w}in ${h}in; margin: 0; } @media print { .sheet { width: ${w}in; height: ${h}in; } }`;
    document.head.append(style);
    document.title = `${PAPER.title} · Poster ${w}×${h} in`;
    return () => style.remove();
  }, [w, h]);

  const pick = (s: Size) => {
    setSize(s);
    const u = new URL(location.href);
    u.searchParams.set('size', s);
    history.replaceState(null, '', u);
  };

  return (
    <div className="paper-view">
      <nav className="paper-tools" aria-label="Poster controls">
        <a href={ROUTES.web}>← Interactive poster</a>
        <div className="seg" role="group" aria-label="Poster size">
          {(Object.keys(SIZES) as Size[]).map((s) => (
            <button key={s} type="button" aria-pressed={s === size} onClick={() => pick(s)}>{SIZES[s].w} × {SIZES[s].h} in</button>
          ))}
        </div>
        <button type="button" onClick={() => document.querySelector('.stage')?.requestFullscreen?.()}>Fullscreen</button>
        <button type="button" onClick={() => window.print()}>Print / PDF</button>
      </nav>

      <div className="stage">
        <article className="sheet" style={{ aspectRatio: `${w} / ${h}`, '--ar': w / h } as CSSProperties} aria-label={`${PAPER.title}: poster`}>
          <header className="p-head">
            <p className="label p-venue">{PAPER.venue}</p>
            <h1 className="p-title">The Network<br />Should <em>Wake</em><br />the GPU</h1>
          </header>

          <PowerTrace className="p-trace" />

          <ol className="p-claims">
            {CLAIMS.map((c) => (
              <li key={c.id}>
                <span className="label p-claim-no">Claim #{c.n}</span>
                <p className="p-claim">{c.text}</p>
              </li>
            ))}
          </ol>

          <footer className="p-foot">
            <p className="p-closing">Think we’re wrong?<br /><span>Come challenge us.</span></p>
            <div className="p-qr">
              <QrCode url={WEB_POSTER_URL} className="p-qr-code" />
              <span className="label">{PAPER.qrLabel}</span>
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}
