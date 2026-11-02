// Routes under the deployment base: "/" is the interactive poster, "/poster/" the headline paper poster,
// "/poster/full/" the 36×48 in paper poster with every question.
// Question deep links use the hash (e.g. /#c2-q1), which works on any static host.
import { FullPoster } from './pages/FullPoster';
import { PaperPoster } from './pages/PaperPoster';
import { WebPoster } from './pages/WebPoster';

const BASE = import.meta.env.BASE_URL;
export const ROUTES = { web: BASE, paper: `${BASE}poster/`, full: `${BASE}poster/full/` };

export function App() {
  const rest = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) : location.pathname.replace(/^\//, '');
  const route = rest.replace(/\/$/, '');
  return route === 'poster' ? <PaperPoster /> : route === 'poster/full' ? <FullPoster /> : <WebPoster />;
}
