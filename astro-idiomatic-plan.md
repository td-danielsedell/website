# Making the Astro site idiomatic (follow-up to astro-migration-plan.md)

*Written 2026-09-13 after the migration landed. Rewritten 2026-09-16 after the
one-page-per-URL work; the earlier version described a state the repo has since
moved well past. The conversion plan is `astro-migration-plan.md`, fully
executed, kept as the record of how the site got here.*

## Where things stand

All 18 URLs build from 5 route files, one page-body component, and 18 Markdown
content files. Every page exists **once**, in both locales.

```
src/pages/
  _HomePage.astro       the start page body; "_" keeps it off the router
  index.astro           2 lines, renders it with lang="sv"
  en/index.astro        2 lines, renders it with lang="en"
  [...about].astro      about.html + en/about.html
  [...product].astro    td_asset_care, td_test, td_linear x 2 locales
  [...project].astro    4 project pages x 2 locales
src/content/
  home/      home-{sv,en}.md
  about/     about-{sv,en}.md
  products/  td_{asset_care,test,linear}-{sv,en}.md
  projects/  {railway-safety,sar-processing,leak-detection,raildamage-analyses}-{sv,en}.md
```

Page source went **4,327 lines -> 2,196**. Both locales of a page now sit
adjacent as data, so drift is visible instead of hidden in a parallel tree.

| Gate | State | Command |
|---|---|---|
| Normalized DOM diff | 18/18 pass, allowlist empty | `npm run verify` |
| Standing invariants | 11 x 18, all hold | `npm run verify:invariants` |
| Both locales present | 9 pages, 9 pairs, 4 collections | `npm run verify:translations` |
| Per-target base | passes at `/` and `/website/` | `npm run verify:base` |
| Harness self-tests | 31/31 normalizer, 17/17 invariant, 8/8 base, 3/3 translation | `npm run verify:self-test` |
| Formatting | clean | `npm run format:check` |

**The baseline is no longer main's HTML.** It is this project's own build, and it
has been re-based deliberately several times — provenance and history in
`verify/baseline-ref.json`. It proves *"the build has not changed unintentionally
since this snapshot"*, not byte-parity with main. That job finished at `62b89d4`.

Preview: **https://td-danielsedell.github.io/website/**, published from
`fork/main` by `.github/workflows/preview.yml` on every push. Production is
`.github/workflows/deploy.yml`: manual, FTPS, domain root. **Never run.**

## Push target

**Push to `fork` only. Do not touch `origin`.**

```
git push fork astro:main
```

`origin` is `totaldigital-se/website`, the company repo, and `HEAD` is ~51
commits ahead of its `main` — the entire Astro migration, including a commit that
deletes the plain-HTML pages the live site is served from. Getting this wrong is
expensive and hard to walk back.

## What is done

- **Conversion scaffolding retired** (`fe50af6`, `c690665`) — `src/components`
  60 files -> 16. The 46 head components existed only because Astro drops a
  comment at the top level of slot content; the `{/* ... */}` conversion removed
  the constraint.
- **Per-target base split** (`b3d2eda`) — `build:preview` uses `--base=/website/`,
  production keeps the domain root. `assert-base.mjs` gates both.
- **`astro:assets`** — every convertible `<img>` is an `<Image>`. `index.html`
  payload 2,079 kB -> ~315 kB; `public/images` 88 files/17 MB -> 13 files/1.5 MB.
  Masters restored from history and grouped under `src/assets/images/`.
- **One page per URL** (`e8f2a41`..`97ce738`) — content collections for *all* page
  content, not just metadata. This supersedes the old "metadata only" scoping:
  prose is Markdown, and the repeated structures (cards, timelines, comparison
  rows, logo lists) are typed frontmatter the routes render.
- **Prettier** — `npm run format`, gated by `format:check`. No manual formatting.

## Next phase

Four items. Only the first is a gap in the safety net; the rest are elective and
labelled as such.

### 1. Locale parity gate — the hole this refactor left open

`assert-translations.mjs` checks only that **the file exists** in both locales.
Add a fifth person to `about-sv.md` and forget `about-en.md` and nothing fails:
both files exist, both build, and the DOM diff passes because each page is
compared to *its own* baseline, not to its sibling.

This is exactly the failure mode that shipped a broken English portrait at
`901e152` — the Swedish page was updated, the English one was not, and no gate
caught it.

Now checkable, because both locales are the same YAML shape:

- same section `id`s, in the same order
- same array lengths (`trio`, `band`, `shots`, `people`, `cities`, `partners`,
  `compare.rows`, `areas`, `cards`, `groups`, `products`, `testimonials`)
- same optional keys present or absent on corresponding items
- image and icon references identical across locales — these must never differ

Explicitly **not** checked: any human-language string. Those must differ.

Gate: planted-violation self-tests in both directions — an sv-only extra item and
an en-only extra item — following the existing `--self-test` pattern. Wire into
both workflows beside the current translation check.

Roughly 60 lines. Cheapest item here and the only one closing a real hole.

### 2. Scoped CSS — elective, wanted as a learning exercise

**Daniel asked for this on 2026-09-16 knowing it is not strictly necessary.**
Treat it as a deliberate experiment, not a requirement, and keep it revertible.

Where the argument actually stands now:

| Original objection | Status |
|---|---|
| Emits root-absolute `/_astro/...`, breaking the two-target build | **Dissolved.** `astro:assets` already emits those and the base split handles it, verified at `/` and `/website/`. |
| Page sheets are already isolated by conditional `<link>` tags | **Stands.** Scoping prevents leakage the loading strategy already prevents. |
| Rewrites markup — an attribute on every element | **Stands**, but `scopedStyleStrategy: 'where'` keeps specificity at zero, so the existing cascade order still decides. That setting is already in `astro.config.mjs` for exactly this. |
| Needs a computed-style harness first | **Stands.** Not built. |

So one of four objections has genuinely dissolved. It is still solving a
non-problem, which is why it is a learning exercise rather than a task.

**The pilot is `footer-large.css` -> `Footer.astro`.** 89 selectors, a real
component boundary, and `Footer.astro` already exists. Nothing else on the site
is as well shaped.

**The gate is Daniel's computed-style recipe, not screenshots** — an iframe
computed-style diff against a frozen-worktree baseline. The canary *is* the
point: prove the refactor is a no-op by measuring, not by looking. Build that
harness first; it is also what `astro:assets` was supposed to get and never did.

Trap: `getComputedStyle` lies about transitioned properties in a background tab.
Set `transition: none` before measuring.

### 3. Islands — the path off jQuery 1.8.3 — elective, largest win

Nine files depend on jQuery: stickyNavbar, waypoints, enllax, easing, lightbox,
images-loaded, plus `site.js` and `about.js`. **91 kB before a line of our own
code.**

Two real motivations beyond tidiness. jQuery 1.8.3 is inside the range fixed by
CVE-2020-11022/11023 — practical exposure here is low, nothing passes untrusted
HTML to jQuery, but it is a standing flag on any dependency audit. And most of
the plugins now duplicate platform features: waypoints and wow.js are
`IntersectionObserver`, easing is CSS, enllax is `background-attachment`.

Islands allow retiring it **one component at a time** — convert, ship, verify,
move on — with `client:visible` below the fold.

Order: easiest first (image carousel, lightbox), **`stickyNavbar` last**. The nav
is the most trap-laden part of the site: it `preventDefault`s nav links, and the
`<li onclick>` attributes are load-bearing. Do not "clean those up".

### 4. Housekeeping

- **Update `astro-migration-plan.md`** the way this file was updated, or mark it
  historical. It describes a structure that no longer exists.
- **`deploy.yml` has never run.** Needs `FTP_SERVER`, `FTP_USERNAME`,
  `FTP_PASSWORD` as repository secrets. First run must stay `dry-run: true`
  against a staging directory. `dangerous-clean-slate` is intentionally absent —
  do not add it.
- **Pages source must be "GitHub Actions"**, or the classic branch builder races
  ours on every push.
- **English copy on the shared components is unreviewed** by colleagues.
- **Daniel is doing a visual comparison against the live totaldigital.se** and
  will write up findings. Live is the pre-migration HTML and roughly 40 commits
  behind, so any difference is one of three things: a real regression, an
  intentional change from the image pass, or live simply being stale.

## Still not recommended

- **Astro's i18n routing module.** The URL structure *is* the file structure.
- **Tailwind / Sass.** Would mean rewriting 303 kB of CSS carrying the palette
  decisions, the footer order lock and the theme tokens. Pure loss.
- **View transitions.** Adds a client-side router to a site where `stickyNavbar`
  intercepts nav clicks and `<li onclick>` attributes are load-bearing.

## Execution notes — read before fanning out

**What went wrong last time.** Phase 4 of the conversion fanned out seven
subagents, one per page pair. Five independently rediscovered the same finding —
that `about.html` was the minority variant — then all blocked on shared
components they were correctly forbidden to edit. ~700k subagent tokens to
surface one insight five times.

**The rule that follows:** do shared-surface work centrally and *first*, then fan
out only genuinely independent work. Give agents the findings rather than making
each rediscover them.

**Most of this is scriptable, not fan-out work.** The comment conversion (346
comments, 65 files), the content port (18 pages) and the content extraction for
the collections were each one Python script gated by the diff.

**Method for any change that should be a no-op:** classify *every* diff hunk as
whitespace / content / structural — do not eyeball it. Then confirm rendered text
is byte-identical with tags stripped. That is how five page conversions landed
without a regression, and it caught a dropped `<br />`, a flattened `<strong>`, a
lost `showcase-more` button and four wrongly-prefixed English links.

## Mechanisms worth not rediscovering

Each verified by build probe.

**Routing and output**

- `build.format: 'preserve'`, not `'file'`. `'file'` emits
  `src/pages/en/index.astro` as `dist/en.html`, a URL this site does not have.
- **A rest route cannot emit `index.html` at two depths.** Registering `en/index`
  alone fails — Astro resolves it to the URL `/en/`, then looks up the param
  `en`, which is not registered. Registering both builds, but also emits a stray
  `en.html` duplicating the page. This is why the start page keeps two two-line
  files.
- `[locale]/index.astro` **does** work and is the documented i18n idiom. Rejected
  here because it makes the two locales structurally asymmetric and only pays off
  past three locales.
- A leading `_` keeps a file out of the router. Astro documents it for exactly
  this: putting components in the same folder as their related pages.
- Content collection ids **strip dots**: `leak-detection.en.md` ->
  `leak-detectionen`. Name files `<page>-<lang>.md`.
- `compressHTML: false` is permanent — trivial saving, and collapsing whitespace
  shifts inline-block layout.

**Markup and whitespace**

- `<!-- ... -->` **is** emitted; `{/* ... */}` is **not**.
- Astro **drops** a comment at the top level of slot content. It survives inside
  a real element or a slotted component. This is why `<main>` lives in the page.
- **Prettier wrapping changes the DOM.** `<p class="x">{value}</p>` broken across
  lines introduces leading and trailing whitespace text nodes. Use
  `<p class="x" set:text={value} />` where it matters.
- `<noscript>` holds **raw text** — whitespace prettier puts between expressions
  ships verbatim. Build the string in one expression.
- `<script>` and JSON-LD contents are compared **raw**, not whitespace-collapsed.
  A JSON-LD component's template indentation must match what it replaces.
- `data-scroll-to={cond ? '' : undefined}` gives the bare attribute; `{true}`
  renders `="true"`, a different thing that fails the diff.
- Whitespace text nodes render **nothing** inside `display: flex` and
  `display: grid` containers, between list items, in table cells, and at
  block-element edges. That is how the remaining diff hunks were cleared — each
  context checked against the CSS, never assumed.

**Assets and scripts**

- Every `<script>` needs `is:inline`, no exceptions, or Astro hoists, modulizes,
  defers, bundles and dedupes it, destroying the jQuery load order.
- Never `import` CSS or a `public/` asset in frontmatter — it creates a second
  hashed copy under `_astro/`.
- `astro:assets` needs **static imports**; a path from frontmatter will not work.
  Hence the `IMAGES` and `SHOTS` lookup maps in the routes.
- Default `quality` 80 produced files *larger* than the hand-optimised WebP. Use
  `quality={75}` for photographic sources.
- `sizes` is the hard part, not the conversion. Measure the real box; do not
  assume `100vw`.
- **Sibling pages sit in the same directory** as the page linking to them. Only
  assets take the `../` prefix under `en/`. Prefixing page links sent every
  English card to `../railway-safety.html`.

**Harness**

- Fixtures in `diff-pages.mjs --self-test` are anchored **by pattern, not literal
  text**, so re-baselining does not break them. One still broke this round — it
  matched a bare `<li>` and about's items now carry `data-city` — so run
  `verify:self-test` after any structural change, not just `verify`.
- `verify/baseline-ref.json` carries a sha256 per file. Update it whenever a
  baseline is re-taken, and record *why* in `capturedFromSubject`.
- Re-take baselines **per page, deliberately**. Never allowlist churn.
