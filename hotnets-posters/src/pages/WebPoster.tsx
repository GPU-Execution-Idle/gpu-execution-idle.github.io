// Interactive poster, ready to present. At rest: the title, the control-loop contrast and the three
// claims. Hovering a claim reveals its questions; opening one shows its answer card and dims
// everything else, and closing the card returns to the three claims.
// Keys: ↑/↓ move between questions, Enter opens, Esc closes, F toggles fullscreen.
// Deep links: /#c1-q2 opens that question; the hash follows the open question.
import { useCallback, useEffect, useState } from 'react';
import { CLAIMS, PAPER, questionAnchor } from '../content/claims';
import { ClaimCard } from '../components/ClaimCard';
import { ControlLoops } from '../components/ControlLoops';
import '../styles/web.css';

const ALL = CLAIMS.flatMap((c) => c.questions.map((q) => questionAnchor(c, q)));
const hashId = () => decodeURIComponent(location.hash.slice(1));
const toggleFullscreen = () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.().catch(() => {});
};

export function WebPoster() {
  const [open, setOpen] = useState<string | null>(() => (ALL.includes(hashId()) ? hashId() : null));

  const show = useCallback((id: string | null) => {
    setOpen(id);
    history.replaceState(null, '', id ? `#${id}` : location.pathname + location.search);
    if (!id) window.scrollTo({ top: 0, behavior: 'smooth' }); // back to the three claims
  }, []);
  const toggle = useCallback((id: string) => show(open === id ? null : id), [open, show]);

  // Follow deep links typed or clicked while the page is open.
  useEffect(() => {
    const go = () => { if (ALL.includes(hashId())) setOpen(hashId()); };
    window.addEventListener('hashchange', go);
    return () => window.removeEventListener('hashchange', go);
  }, []);

  // On small screens the open answer may sit below the fold; bring it into view.
  useEffect(() => {
    if (open) document.getElementById(open)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) show(null);
      if ((e.key === 'f' || e.key === 'F') && !e.metaKey && !e.ctrlKey && !e.altKey) toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, show]);

  // Fullscreen presentation mode: the tiny corner button or the F key.
  const [full, setFull] = useState(false);
  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  return (
    <div className={`web${open ? ' focus' : ''}`} data-focus={open ? open.slice(0, 2) : undefined}>
      <header className="banner">
        <h1>The Network Should <em>Wake</em> the&nbsp;GPU</h1>
        <button type="button" className="fs-toggle" onClick={toggleFullscreen} aria-pressed={full}
          aria-label={full ? 'Exit full screen' : 'Present full screen'} title={full ? 'Exit full screen (F)' : 'Present full screen (F)'}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d={full ? 'M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4' : 'M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4'} /></svg>
        </button>
      </header>
      <div className="contrast" aria-hidden={open ? true : undefined}>
        <div className="contrast-inner"><ControlLoops /></div>
      </div>
      <main className="claims" aria-label={PAPER.title}>
        {CLAIMS.map((c) => <ClaimCard key={c.id} claim={c} open={open} onToggle={toggle} onClose={() => show(null)} />)}
      </main>
    </div>
  );
}
