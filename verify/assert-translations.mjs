#!/usr/bin/env node
/**
 * Every translatable page must exist in both locales.
 *
 * This is the drift the content collection was introduced to stop. The /en/
 * mirror has gone stale repeatedly on this project: stale titles, Swedish
 * comments on English pages, og:image:alt missing on twelve pages, and a
 * broken portrait that shipped because a file was moved on one side only.
 * Every one of those was a missing or forgotten counterpart, and nothing
 * failed - the build was happy to ship half a translation.
 *
 * Two things are checked:
 *   1. src/content/**\/<page>-sv.md has a <page>-en.md twin, and vice versa
 *   2. every page in src/data/pages.ts carries both an sv and an en entry
 *
 *   node verify/assert-translations.mjs
 *   node verify/assert-translations.mjs --self-test
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const LOCALES = ['sv', 'en'];

/** Collection entries, grouped by page name. */
function contentPairs(dir) {
  if (!existsSync(dir)) return {};
  const byPage = {};
  for (const f of readdirSync(dir)) {
    const m = f.match(/^(.+)-(sv|en)\.md$/);
    if (!m) continue;
    (byPage[m[1]] ??= new Set()).add(m[2]);
  }
  return byPage;
}

/** Locales declared per page in src/data/pages.ts. */
function metaPairs(file) {
  const src = readFileSync(file, 'utf8');
  const out = {};
  // each page is `"<name>.html": { sv: {...}, en: {...} },`
  for (const m of src.matchAll(/"([\w-]+\.html)":\s*\{/g)) {
    const start = m.index + m[0].length;
    let depth = 1, i = start;
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
      i++;
    }
    const block = src.slice(start, i);
    out[m[1]] = new Set(LOCALES.filter((l) => new RegExp(`\\b${l}:\\s*\\{`).test(block)));
  }
  return out;
}

function check() {
  const problems = [];

  const content = contentPairs(join(ROOT, 'src/content/projects'));
  for (const [page, have] of Object.entries(content)) {
    for (const l of LOCALES) {
      if (!have.has(l)) {
        problems.push(`src/content/projects/${page}-${l}.md is missing (${[...have].join(', ')} exists)`);
      }
    }
  }

  const meta = metaPairs(join(ROOT, 'src/data/pages.ts'));
  for (const [page, have] of Object.entries(meta)) {
    for (const l of LOCALES) {
      if (!have.has(l)) problems.push(`src/data/pages.ts: ${page} has no "${l}" entry`);
    }
  }

  return { problems, pages: Object.keys(meta).length, entries: Object.keys(content).length };
}

if (process.argv.includes('--self-test')) {
  // A check that cannot fail is decoration. Prove both directions.
  const cases = [
    ['both locales present', { a: new Set(['sv', 'en']) }, true],
    ['English missing', { a: new Set(['sv']) }, false],
    ['Swedish missing', { a: new Set(['en']) }, false],
  ];
  let pass = 0, fail = 0;
  for (const [label, input, shouldPass] of cases) {
    const bad = Object.entries(input).flatMap(([p, have]) =>
      LOCALES.filter((l) => !have.has(l)).map((l) => `${p}-${l}`));
    const ok = (bad.length === 0) === shouldPass;
    ok ? pass++ : fail++;
    console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${shouldPass ? 'accepts' : 'rejects'}  ${label}`);
  }
  console.log(`\n${pass}/${pass + fail} translation self-test(s) pass`);
  process.exit(fail ? 1 : 0);
}

const { problems, pages, entries } = check();
if (problems.length) {
  console.log('\x1b[31m✗\x1b[0m incomplete translations:');
  for (const p of problems) console.log(`    ${p}`);
  console.log(`\n${problems.length} missing counterpart(s)`);
  process.exit(1);
}
console.log(`  ${pages} page(s) in pages.ts and ${entries} content entr(ies): both locales present for each.`);
