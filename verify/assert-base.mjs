#!/usr/bin/env node
/**
 * Asserts that every root-absolute URL in a build sits under the base the build
 * was made for.
 *
 * Why this exists: the site is deployed to two places with different roots —
 * production over FTPS at the domain root, and the GitHub Pages preview under
 * /website/. One build serves both today ONLY because every URL in the source
 * is relative, so it resolves against whatever directory serves the page.
 *
 * The moment Astro emits a URL of its own (scoped `<style>`, `astro:assets`,
 * anything bundled) that stops being true: those URLs are root-absolute.
 * `astro build --base=/website/` fixes them, verified by probe —
 *   no base      -> /_astro/probe.Vl2CufoL.css        (404s under /website/)
 *   --base=/website/ -> /website/_astro/probe.Vl2CufoL.css
 * — but the flag is INERT while no such asset exists, which is the trap: it can
 * sit misconfigured in the workflow for months and nothing will show it.
 *
 * So this check runs on every build of both targets. Right now it inspects zero
 * URLs and says so out loud, rather than passing quietly. The day an asset
 * appears, it starts doing real work with no further action.
 *
 *   node verify/assert-base.mjs                       # dist/, base /
 *   node verify/assert-base.mjs dist --base=/website/
 *   node verify/assert-base.mjs --self-test
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** Attribute values that are URLs we care about. */
const URL_ATTR = /\b(?:href|src|srcset|content)="([^"]+)"/g;

/** Root-absolute, same-origin: starts with a single slash. */
const isRootAbsolute = (u) => u.startsWith('/') && !u.startsWith('//');

function scan(html) {
  const out = [];
  for (const m of html.matchAll(URL_ATTR)) {
    // srcset holds a comma-separated candidate list.
    for (const part of m[1].split(',')) {
      const url = part.trim().split(/\s+/)[0];
      if (url && isRootAbsolute(url)) out.push(url);
    }
  }
  return out;
}

function check(dir, base) {
  const walk = (d) => readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  const pages = walk(dir).filter((p) => p.endsWith('.html'));
  let checked = 0;
  const bad = [];
  for (const p of pages) {
    for (const url of scan(readFileSync(p, 'utf8'))) {
      checked++;
      if (!url.startsWith(base)) {
        bad.push(`${relative(dir, p)}: ${url}  (expected to start with ${base})`);
      }
    }
  }
  return { pages: pages.length, checked, bad };
}

const args = process.argv.slice(2);
if (args.includes('--self-test')) {
  // The check is worthless if it cannot fail. Prove both directions.
  const cases = [
    ['root-absolute matching the base', '<a href="/website/x.css">',  '/website/', true],
    ['root-absolute missing the base',  '<a href="/_astro/x.css">',   '/website/', false],
    ['root-absolute under base /',      '<a href="/_astro/x.css">',   '/',         true],
    ['relative url, always fine',       '<a href="css/x.css">',       '/website/', true],
    ['parent-relative url',             '<a href="../css/x.css">',    '/website/', true],
    ['protocol-relative is external',   '<a href="//cdn/x.js">',      '/website/', true],
    ['absolute external url',           '<a href="https://x/y.css">', '/website/', true],
    ['srcset candidate off-base',       '<img srcset="/_astro/a.webp 1x, /_astro/b.webp 2x">', '/website/', false],
  ];
  let pass = 0, fail = 0;
  for (const [label, html, base, shouldPass] of cases) {
    const bad = scan(html).filter((u) => !u.startsWith(base));
    const ok = (bad.length === 0) === shouldPass;
    ok ? pass++ : fail++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${shouldPass ? 'accepts' : 'rejects'}  ${label}`);
  }
  console.log(`\n${pass}/${pass + fail} base self-test(s) pass`);
  process.exit(fail ? 1 : 0);
}

const baseArg = args.find((a) => a.startsWith('--base='));
const base = baseArg ? baseArg.split('=')[1] : '/';
const dir = join(ROOT, args.find((a) => !a.startsWith('--')) ?? 'dist');

if (!existsSync(dir)) {
  console.error(`  no such directory: ${relative(ROOT, dir)}`);
  process.exit(2);
}

const { pages, checked, bad } = check(dir, base);
if (bad.length) {
  console.log(`\x1b[31m✗\x1b[0m root-absolute URLs outside base ${base}:`);
  for (const b of bad) console.log(`    ${b}`);
  console.log(`\n${bad.length} of ${checked} root-absolute URL(s) would 404 when served from ${base}`);
  process.exit(1);
}
console.log(
  checked === 0
    ? `  ${pages} page(s): no root-absolute URLs at all — every URL is relative, so this build serves any mount point. Base ${base} is not yet load-bearing.`
    : `  ${pages} page(s): ${checked} root-absolute URL(s), all under base ${base}.`
);
