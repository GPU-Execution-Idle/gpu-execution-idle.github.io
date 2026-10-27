// Two routes under the deployment base: "/" is the interactive poster, "/poster/" the paper poster.
// Question deep links use the hash (e.g. /#c2-q1), which works on any static host.
import { PaperPoster } from './pages/PaperPoster';
import { WebPoster } from './pages/WebPoster';

const BASE = import.meta.env.BASE_URL;
export const ROUTES = { web: BASE, paper: `${BASE}poster/` };

export function App() {
  const rest = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) : location.pathname.replace(/^\//, '');
  return rest.replace(/\/$/, '') === 'poster' ? <PaperPoster /> : <WebPoster />;
}
