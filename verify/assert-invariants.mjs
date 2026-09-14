#!/usr/bin/env node
/**
 * Standing invariants from the traps checklist in astro-migration-plan.md.
 *
 * The DOM diff already catches every one of these while the baseline is the
 * fork point — these assertions matter because the baseline gets REGENERATED
 * in phase 6 from a moved main. At that moment the diff can only prove
 * "candidate matches baseline"; if a trap were broken on main, or broken in
 * the regenerated snapshot, the diff would happily agree. These invariants
 * hold regardless of any baseline, so they are the independent check.
 *
 *   node verify/assert-invariants.mjs                 # against dist/
 *   node verify/assert-invariants.mjs verify/baseline # calibration: must pass
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const dir = join(ROOT, process.argv[2] ?? 'dist');

/* --- tiny DOM helpers ------------------------------------------------ */
const kids = (n) => n.childNodes ?? [];
const isEl = (n) => Boolean(n.tagName);
const attr = (n, name) => (n.attrs ?? []).find((a) => a.name === name)?.value;
const hasAttr = (n, name) => (n.attrs ?? []).some((a) => a.name === name);
const classes = (n) => (attr(n, 'class') ?? '').split(/\s+/).filter(Boolean);

function* walk(node) {
  for (const c of kids(node)) {
    if (isEl(c)) { yield c; yield* walk(c); }
  }
}
const all = (root, pred) => [...walk(root)].filter(pred);
const first = (root, pred) => [...walk(root)].find(pred);
const byTag = (root, tag) => all(root, (n) => n.tagName === tag);
const textOf = (n) => kids(n).map((c) => (c.nodeName === '#text' ? c.value : isEl(c) ? textOf(c) : '')).join('');

/* --- the invariants -------------------------------------------------- */

/** Each returns [] when satisfied, or an array of failure strings. */
const INVARIANTS = [
  ['trap 1: nav <li onclick> count', (doc, page) => {
    // stickyNavbar swallows nav link clicks, so these onclick attrs are
    // load-bearing navigation, not decoration. Index has 1 (the one item that
    // leaves the page); subpages have 4.
    const nav = first(doc, (n) => attr(n, 'id') === 'nav-main');
    if (!nav) return ['no #nav-main found'];
    const got = all(nav, (n) => n.tagName === 'li' && hasAttr(n, 'onclick')).length;
    const want = isIndex(page) ? 1 : 4;
    return got === want ? [] : [`expected ${want} <li onclick> in #nav-main, found ${got}`];
  }],

  ['trap 2: #nav-mobile is empty', (doc) => {
    const el = first(doc, (n) => attr(n, 'id') === 'nav-mobile');
    if (!el) return ['no #nav-mobile found'];
    // site.js clones #nav-main into it at runtime; anything pre-rendered here
    // would be duplicated, and any handler-bearing markup would be dead.
    return kids(el).length === 0 ? [] : [`#nav-mobile has ${kids(el).length} child node(s); site.js must fill it`];
  }],

  ['trap 2: nav dropdowns are <details>', (doc) => {
    const nav = first(doc, (n) => attr(n, 'id') === 'nav-main');
    if (!nav) return ['no #nav-main found'];
    const n = byTag(nav, 'details').length;
    return n >= 1 ? [] : ['#nav-main has no <details> dropdown; the mobile clone carries no handlers'];
  }],

  ['trap 3: theme.js blocking, in <head>, after light.css', (doc) => {
    // NOTE: the plan says "after CSS", but the baseline deliberately loads
    // footer-large.css AFTER theme.js on all 14 subpages. The real contract is
    // narrower: theme.js must be blocking and in <head> (so html.theme-light is
    // set before the first frame, or the dark theme flashes), and it must come
    // after light.css, the sheet whose rules that class switches on. Asserting
    // "after every stylesheet" would fail 14 correct pages.
    const head = first(doc, (n) => n.tagName === 'head');
    if (!head) return ['no <head>'];
    const order = [...walk(head)];
    const theme = order.find((n) => n.tagName === 'script' && (attr(n, 'src') ?? '').endsWith('js/theme.js'));
    if (!theme) return ['js/theme.js not in <head>'];
    const fail = [];
    for (const bad of ['defer', 'async']) {
      if (hasAttr(theme, bad)) fail.push(`theme.js has ${bad}; it must run before first paint`);
    }
    if (attr(theme, 'type') === 'module') fail.push('theme.js is type="module" (implicitly deferred)');
    const light = order.find((n) => n.tagName === 'link' && (attr(n, 'href') ?? '').endsWith('css/light.css'));
    if (!light) fail.push('css/light.css not linked in <head>');
    else if (order.indexOf(light) > order.indexOf(theme)) fail.push('css/light.css loads after theme.js');
    return fail;
  }],

  ['trap 3: per-locale data-label-* survive in markup', (doc, page) => {
    // theme.js reads its button labels out of the DOM, so they must be
    // rendered per-locale, not hard-coded in JS.
    const labelled = all(doc, (n) => (n.attrs ?? []).some((a) => a.name.startsWith('data-label-')));
    if (!labelled.length) return ['no data-label-* attributes found; theme.js reads them from markup'];
    const empty = labelled.flatMap((n) => (n.attrs ?? [])
      .filter((a) => a.name.startsWith('data-label-') && !a.value.trim())
      .map((a) => `${a.name} is empty`));
    return empty;
  }],

  ['trap 4: .footer-columns has exactly 4 element children', (doc) => {
    // NOTE: the plan says the <footer> itself holds the four index-locked
    // children. It does not. The real chain is
    //   footer.footer-large > div.row.clearfix > div.footer-columns > (4 columns)
    // and css/footer-large.css line ~253 reorders `.footer-columns > :nth-child(1..4)`
    // at <=1023px. So the count belongs on .footer-columns; Footer.astro must
    // keep both wrappers. Testimonial <footer>s inside index blockquotes are
    // deliberately not matched.
    const outer = first(doc, (n) => n.tagName === 'footer' && classes(n).includes('footer-large'));
    if (!outer) return ['no footer.footer-large found'];
    const cols = first(outer, (n) => classes(n).includes('footer-columns'));
    if (!cols) return ['no .footer-columns inside footer.footer-large'];
    const n = kids(cols).filter(isEl).length;
    return n === 4 ? [] : [`.footer-columns has ${n} element children, expected exactly 4 (order is index-locked in CSS)`];
  }],

  ['trap 6: area-band.css loads after style.css', (doc) => {
    const sheets = all(doc, (n) => n.tagName === 'link' && (attr(n, 'rel') ?? '').includes('stylesheet'))
      .map((n) => attr(n, 'href') ?? '');
    const style = sheets.findIndex((h) => h.endsWith('css/style.css'));
    const band = sheets.findIndex((h) => h.endsWith('css/area-band.css'));
    if (band === -1) return []; // not every page uses it
    if (style === -1) return ['area-band.css present but style.css is not'];
    return band > style ? [] : ['area-band.css loads before style.css'];
  }],

  ['trap 7: Font Awesome kit is non-defer on index only', (doc, page) => {
    const fa = first(doc, (n) => n.tagName === 'script' && (attr(n, 'src') ?? '').includes('kit.fontawesome.com'));
    if (!fa) return ['Font Awesome kit script not found'];
    const deferred = hasAttr(fa, 'defer');
    if (isIndex(page) && deferred) return ['FA kit is deferred on index; the expertise reel is above the fold'];
    if (!isIndex(page) && !deferred) return ['FA kit is non-defer on a subpage; only index earns that'];
    return [];
  }],

  ['trap 13: no asset shipped from both public/ and _astro/', (doc) => {
    // Originally this rejected any _astro/ reference at all, because every asset
    // lived in public/ and a bundled copy could only mean one had been imported
    // by mistake - shipping the same bytes twice under two URLs.
    //
    // astro:assets makes _astro/ legitimate for images imported from src/assets/.
    // The hazard it was guarding against is unchanged though, so the check now
    // names it directly: the same file must not exist in public/ AND be bundled.
    const bundled = all(doc, (n) => (n.attrs ?? []).some((a) => /(^|\/)_astro\//.test(a.value)))
      .flatMap((n) => (n.attrs ?? []).filter((a) => /(^|\/)_astro\//.test(a.value)).map((a) => a.value));
    const dupes = [];
    for (const url of bundled) {
      // _astro names are `<stem>.<contenthash>_<variant>.<ext>`. Rebuild the
      // ORIGINAL filename — stem plus extension — and look for exactly that.
      // Matching on the stem alone is too loose: an unreferenced master such as
      // LG_LK.png is not a duplicate of the bundled LG_LK.webp, it is a
      // different file that simply shares a name.
      const file = url.split('/').pop() ?? '';
      const stem = file.split('.')[0];
      const ext = file.slice(file.lastIndexOf('.'));
      if (!stem || !ext) continue;
      const original = stem + ext;
      if (PUBLIC_FILES.includes(original)) {
        dupes.push(`${original} is bundled into _astro/ AND still present in public/ — it would ship twice`);
      }
    }
    return dupes;
  }],

  ['lang attribute matches directory', (doc, page) => {
    const html = first(doc, (n) => n.tagName === 'html');
    const want = page.startsWith('en/') ? 'en' : 'sv';
    const got = attr(html, 'lang');
    return got === want ? [] : [`<html lang="${got}">, expected "${want}"`];
  }],

  ['JSON-LD parses', (doc, page) => {
    const blocks = all(doc, (n) => n.tagName === 'script' && attr(n, 'type') === 'application/ld+json');
    return blocks.flatMap((b, i) => {
      try { JSON.parse(textOf(b)); return []; }
      catch (e) { return [`JSON-LD block ${i + 1} is not valid JSON: ${e.message}`]; }
    });
  }],
];

/** Every file under public/images, by basename — for the duplicate check above. */
const PUBLIC_FILES = (() => {
  const dir = join(ROOT, 'public/images');
  if (!existsSync(dir)) return [];
  const walk = (d) => readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : [n];
  });
  return walk(dir);
})();

const isIndex = (page) => page === 'index.html' || page === 'en/index.html';

/* --- self-test -------------------------------------------------------
 * An invariant that never fires is decoration. Each entry plants the exact
 * violation its invariant exists to catch and asserts it is reported.
 *   node verify/assert-invariants.mjs --self-test
 * -------------------------------------------------------------------- */

const VIOLATIONS = [
  ['trap 1', 'about.html', (h) => h.replace(/<li onclick=/g, '<li data-onclick=')],
  ['trap 1 (index count)', 'index.html', (h) => h.replace('<li onclick=', '<li data-onclick=')],
  ['trap 2 (nav-mobile filled)', 'about.html', (h) => h.replace('id="nav-mobile"></nav>', 'id="nav-mobile"><ul></ul></nav>')],
  ['trap 2 (details unwrapped)', 'about.html', (h) => h.replace(/<details/g, '<div').replace(/<\/details>/g, '</div>')],
  ['trap 3 (theme.js deferred)', 'about.html', (h) => h.replace('<script src="js/theme.js">', '<script src="js/theme.js" defer>')],
  ['trap 3 (theme.js as module)', 'about.html', (h) => h.replace('<script src="js/theme.js">', '<script src="js/theme.js" type="module">')],
  ['trap 3 (theme.js moved to body)', 'about.html', (h) => h.replace('<script src="js/theme.js"></script>', '') .replace('</body>', '<script src="js/theme.js"></script></body>')],
  ['trap 3 (light.css after theme.js)', 'about.html', (h) => {
    const link = h.match(/[ \t]*<link rel="stylesheet" href="css\/light.css">\n/)[0];
    return h.replace(link, '').replace('<script src="js/theme.js"></script>', '<script src="js/theme.js"></script>\n' + link);
  }],
  ['trap 3 (data-label emptied)', 'about.html', (h) => h.replace(/(data-label-[a-z-]+)="[^"]*"/, '$1=""')],
  ['trap 4 (5th footer column)', 'about.html', (h) => h.replace('<div class="footer-brand">', '<div class="footer-extra"></div><div class="footer-brand">')],
  ['trap 4 (columns wrapped)', 'about.html', (h) => h.replace('<div class="footer-columns">', '<div class="footer-columns"><div class="wrapper">')
      .replace('</footer>', '</div></footer>')],
  ['trap 6 (area-band before style)', 'td_test.html', (h) => {
    const band = h.match(/[ \t]*<link href="css\/area-band.css"[^>]*>\n/)[0];
    return h.replace(band, '').replace(/([ \t]*<link rel="stylesheet" href="css\/style.css">\n)/, band + '$1');
  }],
  ['trap 7 (FA deferred on index)', 'index.html', (h) => h.replace(/(kit.fontawesome.com[^>]*?)>/, '$1 defer>')],
  ['trap 7 (FA non-defer on subpage)', 'about.html', (h) => h.replace(/(<script src="https:\/\/kit.fontawesome.com[^>]*?) defer>/, '$1>')],
  // The hazard is the same file shipping twice, so the fixture has to name a
  // file that really is in public/ — any image bundled under _astro/ whose
  // original is still sitting there.
  ['trap 13 (asset shipped from both public/ and _astro/)', 'about.html',
    (h) => h.replace('<body>', '<body><img src="/_astro/favicon.abc123_x.png" alt="">')],
  ['lang mismatch', 'en/about.html', (h) => h.replace('<html lang="en"', '<html lang="sv"')],
  ['JSON-LD broken', 'index.html', (h) => h.replace('"@type"', '"@type" :: ')],
];

function runSelfTest() {
  const baseDir = join(ROOT, 'verify/baseline');
  let pass = 0, fail = 0;
  for (const [label, page, mutate] of VIOLATIONS) {
    let caught, note = '';
    try {
      const html = mutate(readFileSync(join(baseDir, page), 'utf8'));
      const doc = parse(html);
      const bad = INVARIANTS.flatMap(([name, check]) => check(doc, page).map((m) => `${name}: ${m}`));
      caught = bad.length > 0;
      note = caught ? `  -> ${bad[0]}` : '  -> NOT REPORTED';
    } catch (err) {
      caught = null;
      note = `  (fixture error: ${err.message})`;
    }
    caught === true ? pass++ : fail++;
    console.log(`${caught === true ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${label} [${page}]${caught === true ? '' : note}`);
  }
  console.log(`\n${pass}/${pass + fail} planted violation(s) caught`);
  process.exit(fail ? 1 : 0);
}

if (process.argv.includes('--self-test')) runSelfTest();

/* --- runner ---------------------------------------------------------- */

if (!existsSync(dir)) {
  console.error(`no such directory: ${relative(ROOT, dir)}`);
  process.exit(2);
}
const walkFiles = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walkFiles(p) : [p];
});
const pages = walkFiles(dir).filter((p) => p.endsWith('.html')).map((p) => relative(dir, p)).sort();

if (!pages.length) {
  console.log(`no HTML pages in ${relative(ROOT, dir)} yet — nothing to assert`);
  process.exit(0);
}

let failures = 0;
for (const page of pages) {
  const doc = parse(readFileSync(join(dir, page), 'utf8'));
  const bad = INVARIANTS.flatMap(([name, check]) => check(doc, page).map((m) => `${name}: ${m}`));
  if (bad.length) {
    failures += bad.length;
    console.log(`\x1b[31m✗\x1b[0m ${page}`);
    for (const b of bad) console.log(`    ${b}`);
  } else {
    console.log(`\x1b[32m✓\x1b[0m ${page}`);
  }
}
console.log(`\n${pages.length} page(s), ${INVARIANTS.length} invariants each — ${failures ? `\x1b[31m${failures} failure(s)\x1b[0m` : 'all hold'}`);
process.exit(failures ? 1 : 0);
