#!/usr/bin/env node
/**
 * Two static servers for side-by-side verification:
 *
 *   baseline  -> verify/baseline/   (ground truth, fork point 80e3937)
 *   candidate -> dist/              (the Astro build)
 *
 * The baseline snapshot holds HTML only, so it falls back to public/ for
 * css/js/images/fonts. Both servers therefore read the SAME asset tree, which
 * makes asset drift impossible as an explanation for a visual difference —
 * anything you see is markup or CSS cascade, never a stale copy.
 *
 * URL rules mirror astro.config.mjs (`build.format: 'file'`,
 * `trailingSlash: 'never'`): `/about.html` is the page, `/` maps to
 * index.html. Never verify against the dev server — `format: 'file'` URL
 * matching is inconsistent there (traps checklist #12).
 *
 *   node verify/serve.mjs                       # 4001 baseline, 4002 candidate
 *   node verify/serve.mjs --baseline-port 5001 --candidate-port 5002
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.webmanifest': 'application/manifest+json',
};

function serve(label, roots, port) {
  const server = createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end('bad request');
      return;
    }
    // Reject traversal before it touches the filesystem.
    const rel = normalize(pathname).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
    const candidates = rel === '' || rel.endsWith('/') ? [join(rel, 'index.html')] : [rel];

    for (const c of candidates) {
      for (const root of roots) {
        const file = join(root, c);
        if (!file.startsWith(root)) continue;
        if (existsSync(file) && statSync(file).isFile()) {
          res.writeHead(200, {
            'Content-Type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
            // Never cache: a stale stylesheet has burned this project before.
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          });
          createReadStream(file).pipe(res);
          return;
        }
      }
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`404 ${pathname}\nsearched: ${roots.join(', ')}`);
  });
  server.listen(port, () => console.log(`  ${label.padEnd(9)} http://localhost:${port}  <- ${roots.join(' then ')}`));
  return server;
}

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};

const basePort = Number(flag('--baseline-port', 4001));
const candPort = Number(flag('--candidate-port', 4002));

console.log('verification servers (Ctrl-C to stop):');
serve('baseline', [join(ROOT, 'verify/baseline'), join(ROOT, 'public')], basePort);
serve('candidate', [join(ROOT, 'dist'), join(ROOT, 'public')], candPort);
