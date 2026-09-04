#!/usr/bin/env node
/**
 * Normalized DOM diff: verify/baseline/ (ground truth, the fork-point HTML
 * recorded in verify/baseline-ref.json) vs a candidate build (dist/).
 *
 * The gate for every migration phase is: zero divergences except the ones
 * listed in verify/allowlist.json, and every allowlist entry carries a reason.
 *
 * This file is the one component of the migration that can fail SILENTLY — a
 * normalizer that is too lax passes broken output. So the bias throughout is
 * strict: normalize only forms that are provably semantics-preserving, and
 * keep everything else byte-exact. `--self-test` proves both directions.
 *
 *   node verify/diff-pages.mjs                    # all 18 pages
 *   node verify/diff-pages.mjs about.html en/about.html
 *   node verify/diff-pages.mjs --candidate dist --baseline verify/baseline
 *   node verify/diff-pages.mjs --self-test        # normalizer's own gate
 *   node verify/diff-pages.mjs --context 6        # diff context lines
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/* ------------------------------------------------------------------ *
 * Normalization policy
 * ------------------------------------------------------------------ */

/**
 * Attributes whose mere presence is the whole meaning: `defer`, `defer=""` and
 * `defer="defer"` are the same state, so the value is discarded.
 *
 * Deliberately EXCLUDES `crossorigin`: the baseline carries both bare
 * `crossorigin` and `crossorigin="anonymous"` on different tags. The two are
 * the same CORS state per spec, but they are not the same markup, and losing
 * the distinction would hide an edit. Same reasoning for `loading`/`decoding`
 * (enumerated, not boolean).
 */
const BOOLEAN_ATTRS = new Set([
  'allowfullscreen', 'async', 'autofocus', 'autoplay', 'checked', 'controls',
  'default', 'defer', 'disabled', 'formnovalidate', 'hidden', 'inert', 'ismap',
  'itemscope', 'loop', 'multiple', 'muted', 'nomodule', 'novalidate', 'open',
  'playsinline', 'readonly', 'required', 'reversed', 'selected',
]);

/**
 * Elements whose text content is raw: never whitespace-collapsed, because a
 * newline inside a <script> or a <pre> is content, not formatting.
 *
 * They do get common-leading-indent stripped. Templating moves a block's
 * indentation without touching a character of it (a JSON-LD block pasted into
 * a .astro file lands at a different depth); stripping the SHARED indent
 * absorbs exactly that move while leaving relative structure — and every real
 * edit inside the block — fully visible.
 */
const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'pre', 'textarea']);

const collapse = (s) => s.replace(/\s+/g, ' ');

/**
 * Elements that render nothing at all. Whitespace sitting between two of them
 * cannot produce a box, so it cannot move the page.
 */
const NON_RENDERING = new Set(['script', 'link', 'meta', 'style', 'base', 'title']);

/**
 * True for a whitespace-only text node that provably cannot affect layout.
 *
 * Astro trims the newline after a `</script>`, in <head> and in <body> alike.
 * Rather than litter the templates with `{"\n"}` to win a byte comparison, the
 * diff ignores whitespace in the two places where it demonstrably does nothing:
 *
 *   - anywhere inside <head>, since nothing in <head> renders; or
 *   - between two non-rendering elements (script/link/meta/style/base/title),
 *     optionally with the document boundary standing in for one side when the
 *     parent is <html>/<body>/<head>.
 *
 * Everything else stays strict: a gap next to a rendered element is layout —
 * `<a>x</a> <a>y</a>` must never compare equal to `<a>x</a><a>y</a>`. The
 * self-test pins both directions.
 */
function ignorableWhitespace(node) {
  const parent = node.parentNode;
  if (!parent || node.value.trim()) return false;
  if (parent.tagName === 'head') return true;

  const sibs = parent.childNodes ?? [];
  const idx = sibs.indexOf(node);
  const scan = (step) => {
    for (let i = idx + step; i >= 0 && i < sibs.length; i += step) {
      const n = sibs[i];
      if (n.nodeName === '#comment') continue;
      if (n.nodeName === '#text') {
        if (!n.value.trim()) continue;
        return '#text';
      }
      return n.tagName;
    }
    return null; // document boundary
  };

  const atBoundaryOk = ['html', 'body', 'head'].includes(parent.tagName);
  const isNonRendering = (x) => x !== null && NON_RENDERING.has(x);
  const sideOk = (x) => isNonRendering(x) || (x === null && atBoundaryOk);
  const prev = scan(-1), next = scan(1);
  // At least one side must be an actual non-rendering element, so that a lone
  // whitespace node inside an empty container is still compared.
  return sideOk(prev) && sideOk(next) && (isNonRendering(prev) || isNonRendering(next));
}

/**
 * Remove the indentation shared by every non-blank line. Leading/trailing
 * blank lines go too — they are pure placement artifacts.
 */
function dedent(text) {
  const lines = text.split('\n');
  while (lines.length && lines[0].trim() === '') lines.shift();
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  const indents = lines.filter((l) => l.trim() !== '').map((l) => l.match(/^[ \t]*/)[0].length);
  const strip = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => (l.trim() === '' ? '' : l.slice(strip))).join('\n');
}

const quote = (v) => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/**
 * One canonical line per node, indented by depth. Closing tags are emitted too
 * so that a moved subtree shows up as a clean insert/delete pair in the diff
 * instead of a smear of unrelated-looking lines.
 */
function canonicalLines(node, depth = 0, out = []) {
  const pad = '  '.repeat(depth);

  switch (node.nodeName) {
    case '#document':
    case '#document-fragment':
      for (const child of node.childNodes ?? []) canonicalLines(child, depth, out);
      return out;

    case '#documentType':
      // Only the name is meaningful; the site is uniformly `<!DOCTYPE html>`.
      out.push(`${pad}<!doctype ${node.name}>`);
      return out;

    case '#comment':
      // Compared, never skipped: several comments are load-bearing docs (the
      // footer child-order lock, the theme.js blocking rationale, the
      // td_linear og:image PLACEHOLDER marker). Whitespace inside is collapsed
      // so a re-wrapped comment passes but a re-worded one does not.
      out.push(`${pad}<!--${collapse(node.data)}-->`);
      return out;

    case '#text': {
      if (ignorableWhitespace(node)) return out;

      const raw = node.parentNode && RAW_TEXT_ELEMENTS.has(node.parentNode.tagName);
      if (raw) {
        for (const line of dedent(node.value).split('\n')) out.push(`${pad}| ${line}`);
      } else {
        // Collapse runs of whitespace but do NOT trim. A boundary space
        // between two inline elements is layout, so `<a>x</a> <a>y</a>` must
        // not compare equal to `<a>x</a><a>y</a>`; indentation differences
        // collapse to the same single space and pass.
        out.push(`${pad}#text ${quote(collapse(node.value))}`);
      }
      return out;
    }

    default: {
      const tag = node.tagName;
      // parse5 reports SVG/MathML in their own namespace; keep it in the key so
      // an HTML <a> can never silently match an SVG <a>.
      const ns = node.namespaceURI && !node.namespaceURI.endsWith('/xhtml')
        ? ` @${node.namespaceURI.split('/').pop()}`
        : '';
      const attrs = (node.attrs ?? [])
        .map((a) => {
          const name = a.prefix ? `${a.prefix}:${a.name}` : a.name;
          return BOOLEAN_ATTRS.has(name) ? [name, null] : [name, a.value];
        })
        // Sorted: source attribute order is not semantics, and templating
        // reorders freely.
        .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
        .map(([name, value]) => (value === null ? ` ${name}` : ` ${name}=${quote(value)}`))
        .join('');

      const kids = node.childNodes ?? [];
      if (!kids.length) {
        out.push(`${pad}<${tag}${ns}${attrs}/>`);
        return out;
      }
      out.push(`${pad}<${tag}${ns}${attrs}>`);
      for (const child of kids) canonicalLines(child, depth + 1, out);
      out.push(`${pad}</${tag}>`);
      return out;
    }
  }
}

export const canonicalize = (html) => canonicalLines(parse(html));

/* ------------------------------------------------------------------ *
 * Diff (Myers O(ND) — fast precisely when divergences are few)
 * ------------------------------------------------------------------ */

const MAX_D = 4000;

function diffLines(a, b) {
  let lo = 0;
  const max = Math.min(a.length, b.length);
  while (lo < max && a[lo] === b[lo]) lo++;
  let hiA = a.length, hiB = b.length;
  while (hiA > lo && hiB > lo && a[hiA - 1] === b[hiB - 1]) { hiA--; hiB--; }

  const A = a.slice(lo, hiA), B = b.slice(lo, hiB);
  if (!A.length && !B.length) return [];
  if (!A.length) return B.map((line, i) => ({ type: 'add', line, aIndex: lo, bIndex: lo + i }));
  if (!B.length) return A.map((line, i) => ({ type: 'del', line, aIndex: lo + i, bIndex: lo }));

  const N = A.length, M = B.length, offset = N + M;
  const v = new Int32Array(2 * offset + 1);
  const trace = [];
  let found = -1;

  outer:
  for (let d = 0; d <= Math.min(MAX_D, offset); d++) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x = (k === -d || (k !== d && v[k - 1 + offset] < v[k + 1 + offset]))
        ? v[k + 1 + offset]
        : v[k - 1 + offset] + 1;
      let y = x - k;
      while (x < N && y < M && A[x] === B[y]) { x++; y++; }
      v[k + offset] = x;
      if (x >= N && y >= M) { found = d; break outer; }
    }
  }
  if (found < 0) {
    return [{ type: 'bail', line: `(over ${MAX_D} edits — files are structurally unrelated)`, aIndex: lo, bIndex: lo }];
  }

  // Walk the trace back to a concrete edit script.
  const edits = [];
  let x = N, y = M;
  for (let d = found; d > 0; d--) {
    const vPrev = trace[d];
    const k = x - y;
    const down = k === -d || (k !== d && vPrev[k - 1 + offset] < vPrev[k + 1 + offset]);
    const kPrev = down ? k + 1 : k - 1;
    const xStart = vPrev[kPrev + offset];
    const yStart = xStart - kPrev;
    const xMid = down ? xStart : xStart + 1;
    while (x > xMid) { x--; y--; }
    if (down) edits.push({ type: 'add', line: B[yStart], aIndex: lo + xStart, bIndex: lo + yStart });
    else edits.push({ type: 'del', line: A[xStart], aIndex: lo + xStart, bIndex: lo + yStart });
    x = xStart; y = yStart;
  }
  return edits.reverse();
}

/** Group adjacent edits into hunks so a reason can be attached to each. */
function hunks(edits) {
  const out = [];
  for (const e of edits) {
    const last = out[out.length - 1];
    if (last && e.aIndex - last.aEnd <= 1 && e.bIndex - last.bEnd <= 1) {
      last.aEnd = Math.max(last.aEnd, e.aIndex);
      last.bEnd = Math.max(last.bEnd, e.bIndex);
      last.edits.push(e);
    } else {
      out.push({ aStart: e.aIndex, aEnd: e.aIndex, bStart: e.bIndex, bEnd: e.bIndex, edits: [e] });
    }
  }
  return out;
}

const hunkKey = (h) => h.edits.map((e) => `${e.type === 'del' ? '-' : '+'}${e.line.trim()}`).join('\n');

/* ------------------------------------------------------------------ *
 * Allowlist
 * ------------------------------------------------------------------ */

function loadAllowlist() {
  const path = join(ROOT, 'verify/allowlist.json');
  if (!existsSync(path)) return { entries: [] };
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  for (const [i, e] of (raw.entries ?? []).entries()) {
    if (!e.reason || !e.reason.trim()) {
      throw new Error(`allowlist.json entry ${i} has no reason — every accepted divergence must carry one.`);
    }
  }
  return raw;
}

/** An entry applies to a hunk when the page matches and the canonical hunk text matches. */
function matchAllowlist(allowlist, page, hunk) {
  const key = hunkKey(hunk);
  return (allowlist.entries ?? []).find((e) => {
    const pages = Array.isArray(e.pages) ? e.pages : [e.pages];
    if (!pages.includes(page) && !pages.includes('*')) return false;
    return e.hunk.trim() === key.trim();
  });
}

/* ------------------------------------------------------------------ *
 * Runner
 * ------------------------------------------------------------------ */

function listPages(dir) {
  const walk = (d) => readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  return walk(dir).filter((p) => p.endsWith('.html')).map((p) => relative(dir, p)).sort();
}

function comparePage(page, baselineDir, candidateDir, allowlist, context) {
  const basePath = join(baselineDir, page);
  const candPath = join(candidateDir, page);
  if (!existsSync(candPath)) return { page, status: 'missing', hunks: [], allowed: [] };

  const a = canonicalize(readFileSync(basePath, 'utf8'));
  const b = canonicalize(readFileSync(candPath, 'utf8'));
  const all = hunks(diffLines(a, b));

  const unexplained = [], allowed = [];
  for (const h of all) {
    const entry = matchAllowlist(allowlist, page, h);
    if (entry) allowed.push({ hunk: h, entry });
    else unexplained.push({ hunk: h, a, b, context });
  }
  return { page, status: unexplained.length ? 'fail' : 'pass', hunks: unexplained, allowed };
}

function renderHunk({ hunk, a, b, context }) {
  const lines = [];
  const from = Math.max(0, hunk.aStart - context);
  for (let i = from; i < hunk.aStart; i++) lines.push(`    ${a[i]}`);
  for (const e of hunk.edits) lines.push(`  ${e.type === 'del' ? '-' : '+'} ${e.line}`);
  const to = Math.min(a.length, hunk.aEnd + 1 + context);
  for (let i = hunk.aEnd + 1; i < to; i++) lines.push(`    ${a[i]}`);
  return lines.join('\n');
}

function main(argv) {
  const args = [...argv];
  const take = (flag, fallback) => {
    const i = args.indexOf(flag);
    if (i === -1) return fallback;
    return args.splice(i, 2)[1];
  };
  const selfTest = args.includes('--self-test');
  if (selfTest) args.splice(args.indexOf('--self-test'), 1);
  // Prints every unexplained hunk as a ready-to-paste allowlist entry, with an
  // empty `reason` that the author must fill in — diff-pages.mjs refuses to load
  // an entry whose reason is blank, so nothing can be waved through by accident.
  const emit = args.includes('--emit-allowlist');
  if (emit) args.splice(args.indexOf('--emit-allowlist'), 1);
  const baselineDir = join(ROOT, take('--baseline', 'verify/baseline'));
  const candidateDir = join(ROOT, take('--candidate', 'dist'));
  const context = Number(take('--context', '4'));

  if (selfTest) return runSelfTest(baselineDir, context);

  const allowlist = loadAllowlist();
  const pages = args.length ? args : listPages(baselineDir);
  const results = pages.map((p) => comparePage(p, baselineDir, candidateDir, allowlist, context));

  if (emit) {
    const entries = results.flatMap((r) =>
      r.hunks.map(({ hunk }) => ({ pages: [r.page], hunk: hunkKey(hunk), reason: '' })));
    console.log(JSON.stringify({ entries }, null, 2));
    process.exit(0);
  }

  let failed = 0, missing = 0, allowedTotal = 0;
  for (const r of results) {
    allowedTotal += r.allowed.length;
    if (r.status === 'missing') {
      missing++;
      console.log(`\x1b[33m?\x1b[0m ${r.page} — not built yet (no ${relative(ROOT, join(candidateDir, r.page))})`);
      continue;
    }
    if (r.status === 'pass') {
      const note = r.allowed.length ? ` (${r.allowed.length} allowlisted)` : '';
      console.log(`\x1b[32m✓\x1b[0m ${r.page}${note}`);
      continue;
    }
    failed++;
    console.log(`\x1b[31m✗\x1b[0m ${r.page} — ${r.hunks.length} unexplained divergence(s)`);
    for (const h of r.hunks) console.log(renderHunk(h) + '\n');
  }

  const built = results.length - missing;
  console.log(`\n${built - failed}/${built} built page(s) pass` +
    (missing ? `, ${missing} not built` : '') +
    (allowedTotal ? `, ${allowedTotal} allowlisted divergence(s)` : ', empty allowlist'));
  process.exit(failed ? 1 : 0);
}

/* ------------------------------------------------------------------ *
 * Self-test — the harness's own gate.
 *
 * Baseline-vs-baseline must be clean, cosmetic rewrites must stay clean, and
 * every planted substantive mutation (each one a traps-checklist item where
 * possible) must be caught. Run this whenever the normalizer changes.
 * ------------------------------------------------------------------ */

function runSelfTest(baselineDir, context) {
  const read = (p) => readFileSync(join(baselineDir, p), 'utf8');
  const once = (html, find, replace) => {
    const i = html.indexOf(find);
    if (i === -1) throw new Error(`self-test fixture missing: ${JSON.stringify(find.slice(0, 70))}`);
    return html.slice(0, i) + replace + html.slice(i + find.length);
  };

  const COSMETIC = [
    ['identity (baseline vs itself)', 'about.html', (h) => h],
    ['attribute order swapped', 'about.html',
      (h) => once(h,
        '<script src="https://kit.fontawesome.com/863e7191f5.js" crossorigin="anonymous" defer>',
        '<script defer crossorigin="anonymous" src="https://kit.fontawesome.com/863e7191f5.js">')],
    ['attribute re-quoted with single quotes', 'about.html',
      (h) => once(h, 'href="about.html"', "href='about.html'")],
    ['void tag self-closing form dropped', 'about.html', (h) => h.replace(/<br \/>/g, '<br>')],
    ['boolean attr given an explicit value', 'about.html',
      (h) => once(h, '<script src="js/about.js" defer>', '<script src="js/about.js" defer="defer">')],
    ['tag name upper-cased', 'about.html', (h) => once(h, '<footer', '<FOOTER')],
    ['named entity written as its character', 'about.html', (h) => h.replace(/&ndash;/g, '–')],
    ['indentation of a block changed', 'about.html',
      (h) => h.replace(/\n    <script src="js\//g, '\n\t\t\t<script src="js/')],
    ['comment re-wrapped across lines', 'about.html',
      (h) => h.replace(/<!-- ([^\n-]{20,40}) -->/, '<!--\n         $1\n    -->')],
    ['newline after a </script> in <head> removed', 'about.html',
      (h) => once(h, '<script src="js/theme.js"></script>\n', '<script src="js/theme.js"></script>')],
    ['all whitespace between <head> children removed', 'about.html', (h) => {
      const i = h.indexOf('<head>'), j = h.indexOf('</head>');
      return h.slice(0, i) + h.slice(i, j).replace(/>\s+</g, '><') + h.slice(j);
    }],
    ['whitespace between two end-of-body <script> tags removed', 'about.html',
      (h) => once(h, '</script>\n    <script src="js/jquery.stickyNavbar.min.js">',
                     '</script><script src="js/jquery.stickyNavbar.min.js">')],
    ['whitespace between the last <script> and </body> removed', 'about.html',
      (h) => once(h, '<script src="js/about.js" defer></script>\n\n</body>',
                     '<script src="js/about.js" defer></script></body>')],
  ];

  const SUBSTANTIVE = [
    ['nav <li onclick> dropped (trap 1)', 'about.html',
      (h) => once(h, ' onclick="', ' data-was-onclick="')],
    ['nav onclick target changed (trap 1)', 'about.html',
      (h) => once(h, 'onclick="', 'onclick="void 0;')],
    ['content injected into #nav-mobile (trap 2)', 'about.html',
      (h) => once(h, 'id="nav-mobile"', 'id="nav-mobile" data-prefilled="yes"')],
    ['theme.js made deferred (trap 3)', 'about.html',
      (h) => once(h, '<script src="js/theme.js">', '<script src="js/theme.js" defer>')],
    ['theme.js moved after another script (trap 3)', 'about.html',
      (h) => once(h, '<script src="js/theme.js"></script>', '')
              .replace('</head>', '  <script src="js/theme.js"></script>\n</head>')],
    ['a load-bearing comment deleted (trap 8)', 'about.html',
      (h) => h.replace(/<!--[^]*?-->/, '')],
    ['a comment re-worded (trap 8)', 'about.html',
      (h) => h.replace(/<!-- ([A-Za-z][^\n-]{15,})-->/, '<!-- $1 and also something else -->')],
    ['a stylesheet dropped', 'about.html', (h) => once(h, '<link rel="stylesheet"', '<link data-dropped')],
    ['stylesheet order swapped (trap 6)', 'td_test.html', (h) => {
      const m = [...h.matchAll(/^[ \t]*<link rel="stylesheet" href="[^"]*">\n/gm)];
      if (m.length < 2) throw new Error('self-test fixture: need two stylesheet links');
      const [x, y] = [m[m.length - 2], m[m.length - 1]];
      return h.slice(0, x.index) + y[0] + h.slice(x.index + x[0].length, y.index) + x[0] + h.slice(y.index + y[0].length);
    }],
    ['a class added', 'about.html', (h) => once(h, 'class="', 'class="injected ')],
    ['visible text changed', 'about.html', (h) => once(h, '</h1>', ' Extra</h1>')],
    ['a whitespace gap around an inline element removed', 'about.html',
      (h) => once(h, 'och AI</strong> och', 'och AI</strong>och')],
    ['whitespace between two body elements removed (the rule must not leak)', 'about.html', (h) => {
      const i = h.indexOf('<body>');
      return h.slice(0, i) + h.slice(i).replace(/<\/li>\s+<li>/, '</li><li>');
    }],
    ['whitespace between a rendered element and a <script> removed', 'about.html',
      (h) => once(h, '</div>\n\n    <!-- Include JavaScript resources -->',
                     '</div><!-- Include JavaScript resources -->')],
    ['an element unwrapped (structure flattened)', 'about.html',
      (h) => once(h, '<footer', '<div><footer').replace('</footer>', '</footer></div>')],
    ['JSON-LD content changed', 'index.html',
      (h) => once(h, '"@type"', '"@typo"')],
    ['an aria-hidden flipped', 'about.html', (h) => once(h, 'aria-hidden="true"', 'aria-hidden="false"')],
    ['a lang attribute changed', 'en/about.html', (h) => once(h, '<html lang="en"', '<html lang="sv"')],
  ];

  let pass = 0, fail = 0;
  const run = (label, page, mutate, expectCaught) => {
    let caught, detail = '';
    try {
      const a = canonicalize(read(page));
      const b = canonicalize(mutate(read(page)));
      const hs = hunks(diffLines(a, b));
      caught = hs.length > 0;
      if (caught && !expectCaught) detail = '\n' + renderHunk({ hunk: hs[0], a, b, context: 2 });
    } catch (err) {
      caught = null;
      detail = `  (fixture error: ${err.message})`;
    }
    const ok = caught === expectCaught;
    ok ? pass++ : fail++;
    const mark = ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    console.log(`${mark} ${expectCaught ? 'caught  ' : 'ignored '} ${label} [${page}]${ok ? '' : detail}`);
  };

  console.log('\x1b[1mCosmetic rewrites — must NOT be reported:\x1b[0m');
  for (const [label, page, mutate] of COSMETIC) run(label, page, mutate, false);
  console.log('\n\x1b[1mSubstantive mutations — must BE reported:\x1b[0m');
  for (const [label, page, mutate] of SUBSTANTIVE) run(label, page, mutate, true);

  console.log(`\n${pass}/${pass + fail} normalizer self-test(s) pass`);
  process.exit(fail ? 1 : 0);
}

main(process.argv.slice(2));
