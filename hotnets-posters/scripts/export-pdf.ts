// Export the paper poster as print-ready PDFs (one per size) from the built site.
//
//   deno task build && deno task pdf   # writes pdf/poster-24x36.pdf, pdf/poster-36x48.pdf, pdf/poster-full-36x48.pdf
//
// Serves dist/ under its base path, opens /poster/?size=… and /poster/full/ in headless Chrome and prints with the
// page's own @page size (24×36 in or 36×48 in, no margins, backgrounds on). Set CHROME_PATH if
// Chrome is not in the default macOS location.
import { launch } from 'jsr:@astral/astral@0.5.6';
import { serveDir } from 'jsr:@std/http@1.0.21/file-server';

const HERE = new URL('.', import.meta.url).pathname;
const DIST = `${HERE}../dist`;
const OUT = `${HERE}../pdf`;
const BASE = '/hotnets26-notebook/';
const CHROME = Deno.env.get('CHROME_PATH') ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const server = Deno.serve({ port: 0, onListen: () => {} }, (req) => {
  const url = new URL(req.url);
  if (!url.pathname.startsWith(BASE)) return new Response('not found', { status: 404 });
  return serveDir(req, { fsRoot: DIST, urlRoot: BASE.slice(1, -1), quiet: true });
});
const origin = `http://localhost:${server.addr.port}`;

await Deno.mkdir(OUT, { recursive: true });
const browser = await launch({ path: CHROME, headless: true });
try {
  const jobs = [
    ...['24x36', '36x48'].map((size) => [`poster/?size=${size}`, `poster-${size}.pdf`]),
    ['poster/full/', 'poster-full-36x48.pdf'],
  ];
  for (const [route, file] of jobs) {
    const page = await browser.newPage(`${origin}${BASE}${route}`);
    await page.waitForNetworkIdle();
    await page.evaluate('document.fonts.ready.then(() => true)');
    const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });
    await Deno.writeFile(`${OUT}/${file}`, pdf);
    console.log(`wrote pdf/${file}`);
    await page.close();
  }
} finally {
  await browser.close();
  await server.shutdown();
}
