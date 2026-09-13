# Making the Astro site idiomatic (follow-up to astro-migration-plan.md)

*Written 2026-09-13, after the migration landed. The conversion plan is
`astro-migration-plan.md`; it is fully executed and stays in the repo as the
record of how the site got here. This plan covers what is left to turn a
faithful conversion into idiomatic Astro.*

## Where things stand

All 18 pages build from Astro and reproduce `main` exactly.

| Gate | State |
|---|---|
| 18 pages vs `main` (62b89d4) | 18/18 pass, **allowlist empty** |
| Standing invariants | 11 × 18, all hold |
| Harness self-tests | 31/31 normalizer, 17/17 planted violations |
| `public/` assets vs main | every file identical |
| Shipped HTML comments | 0 |

Live preview: **https://td-danielsedell.github.io/website/** — published from
`fork/main` by `.github/workflows/preview.yml` on every push. Production is
`.github/workflows/deploy.yml`: manual, FTPS, to the real host at the domain
root. Nothing has been deployed to production from this branch.

## What "idiomatic" is worth here, and what it is not

The site works and matches main byte for byte. Nothing below is required. Each
item is justified by what it buys, and two are explicitly **not** recommended.

### 1. Retire the conversion scaffolding — do this first

`src/components/head/` holds **46 files for 840 lines**, averaging 18 lines
each; `src/components/scripts/` holds 8 more. **24 of them are used by exactly
one page.**

They exist for one reason, now obsolete: Astro silently drops an HTML comment
written at the top level of slot content, so every head fragment was wrapped in
a component to keep its documentation. Since the comment conversion
(`<!-- … -->` → `{/* … */}`, which Astro does not emit) that constraint is gone.
Verified by build probe — inline slot content now carries links, expression
comments and JSON-LD with braces intact:

```astro
<Fragment slot="head-css">
  {/* Service Card CSS */}
  <link href="css/service-card.css" rel="stylesheet" type="text/css">
</Fragment>
```

Separately, **34 component files are 17 Sv/En pairs** (`LeakDetectionJsonLdSv` /
`…En`, 25 lines each) that differ only in content. A single component taking
`lang`, reading from `src/data/`, replaces each pair.

Target: **~54 files → ~10**, no change in output, fully gated by the existing
byte-diff. Highest value, lowest risk.

### 2. Trim the harness

`verify/baseline/` (569 kB) and `diff-pages.mjs` exist to prove the conversion.
Once the conversion is trusted they are dead weight.

**Keep `assert-invariants.mjs`.** Its 11 invariants are baseline-independent —
they assert what is true of a correct page regardless of what main looks like —
and both workflows already gate on it. It is the part worth having forever.

Do this only after item 1, which the byte-diff is still needed to gate.

### 3. `astro:assets` — the only large user-facing win

Images are 17 MB, 93% of the repo. A phone on 4G currently downloads
desktop-sized files. The pipeline gives responsive `srcset` per breakpoint,
hashed filenames for permanent caching, and computed `width`/`height` — the
attribute that was missing from the about-page logos on 2 of 18 pages.

Costs, honestly: it takes over image output, so the hand-tuned crops need the
pre-WebP masters (recoverable at `40c5ff1^` / `da1289a^`), and generated
filenames cannot match a baseline, so it **dissolves the byte-diff**. It needs
its own verification story — computed-style and layout sentinels, not byte
comparison. Do it after items 1 and 2, never alongside them.

### 4. Content collections — for metadata only

Structural drift between `/` and `/en/` is fixed: header, footer and `<head>`
now propagate. **Copy drift is not.** The English pages had their own stale
wording for the theme comments, the FA kit note and the nav-lang text, all found
during conversion.

A schema over page frontmatter (`title`, `description`, `ogImage`, `ogImageAlt`,
`ogType`) turns a missing or mismatched English field into a **build failure**
instead of something a visitor finds. Sv/en parity can be enforced structurally.

Scope it to frontmatter and metadata. The prose bodies are bespoke and
hand-tuned; forcing them into one template would flatten decisions made per page.

### 5. Islands — the path off jQuery 1.8.3

Nine files depend on jQuery, so today it is all-or-nothing: stickyNavbar,
waypoints, enllax, easing, lightbox, images-loaded, plus `site.js` and
`about.js`. That is 91 kB before a line of our own code.

Islands allow retiring it **one component at a time** — convert the carousel,
ship, verify, move on — rather than a big-bang rewrite, with `client:visible`
for anything below the fold. Two real motivations beyond tidiness: jQuery 1.8.3
is affected by the XSS advisories fixed in 3.5.0 (CVE-2020-11022/11023;
practical exposure here is low, since no untrusted HTML is passed to jQuery, but
it is a standing flag on any dependency audit), and most of these plugins now
duplicate platform features — waypoints and wow.js are `IntersectionObserver`,
easing is CSS, enllax is `background-attachment`.

### NOT recommended

**Scoped CSS.** The page sheets are already isolated: `about.css` loads only on
the about pages, via conditional `<link>` tags. Scoping would prevent leakage
that the loading strategy already prevents. It rewrites markup (a class on every
element), emits root-absolute `/_astro/…` URLs, and needs the computed-style
harness built first. The only well-shaped candidate is `footer-large.css` into
`Footer.astro` — 89 selectors, a real boundary. If it is ever done, that is the
pilot, and the gate is Daniel's computed-style recipe, not screenshots.

**Astro's i18n routing module.** Already rejected in the conversion plan and
still correct: the URL structure *is* the file structure.

**Tailwind / Sass.** Would mean rewriting 303 kB of CSS carrying the palette
decisions, the footer order lock and the theme tokens. Pure loss.

**View transitions.** Adds a client-side router to a site where `stickyNavbar`
intercepts nav clicks and `<li onclick>` attributes are load-bearing.

## The two-target build constraint

Production (FTPS) serves from the **domain root**. The Pages preview serves from
the **`/website/` subpath**. Today this is a non-issue because every asset and
page link is relative, so one build serves both — verified by serving `dist/`
under `/website/` locally and on the live Pages URL: zero failed requests.

Anything that makes Astro emit its own URLs — scoped CSS, `astro:assets` —
breaks that, because those URLs are root-absolute. The fix is a per-target base,
confirmed working at the CLI:

```
astro build                      # production, domain root
astro build --base=/website/     # Pages preview
```

**Do not put `base` in `astro.config.mjs`.** It would fix Pages and break the
FTP deploy. It belongs in the Pages workflow only, and item 3 cannot start until
that split is in place.

## Phases and gates

1. **Collapse single-use head/script components into inline slot content.**
   24 components, mechanical, scriptable. Gate: 18/18 byte-diff, empty allowlist.
2. **Merge the 17 Sv/En pairs into `lang`-prop components.** Shared surface —
   central work, not fanned out. Gate: same.
3. **Trim the harness.** Delete `verify/baseline/` and `diff-pages.mjs`; keep
   `assert-invariants.mjs` and both workflow gates. Gate: invariants hold, both
   workflows green.
4. **Per-target base split** in the Pages workflow. Gate: preview still loads
   with zero failed requests at the subpath.
5. **`astro:assets`.** Own verification story. Gate: layout sentinels unchanged
   at the agreed widths; visual review of every regenerated crop.
6. **Content collections for metadata.** Gate: a deliberately mismatched
   English field fails the build.
7. **Islands, one plugin at a time.** Easiest first (carousel, lightbox);
   `stickyNavbar` last, since the nav is the most trap-laden part of the site.

## Execution notes — read before fanning out

**What went wrong last time.** Phase 4 of the conversion fanned out seven
subagents, one per page pair. Five of them independently rediscovered the same
finding — that `about.html` was the minority variant for logo dimensions, the
nav-lang comment, the banner placeholder and `data-scroll-to` — and then all
blocked on shared components they were correctly forbidden to edit. That cost
roughly 700k subagent tokens to surface one insight five times.

**The rule that follows:** do the shared-surface work centrally and *first*, then
fan out only work that is genuinely independent per unit. Give agents the
findings rather than making each rediscover them.

**Most of this plan is scriptable, not fan-out work.** The comment conversion
(346 comments, 65 files) and the content port (18 pages) were both done with a
single Python script and gated by the diff. Items 1 and 2 are the same shape.
Fan-out would cost more in coordination than it saves.

**Where fan-out does pay:** item 5 (`astro:assets`) — 85 images, each needing a
judgment call about crop and breakpoints, with no shared surface between them.
One agent per image group, after the base split is proven.

## Mechanisms worth not rediscovering

Each verified by build probe during the conversion.

- `<!-- … -->` **is** emitted; `{/* … */}` is **not**. That is the whole reason
  the source can keep its documentation while shipping none.
- Astro **drops** a comment at the top level of slot content — inside
  `<Fragment>`, inside `<Fragment slot="…">`, and among a page's default-slot
  children. It survives inside a real element or a slotted component. This is
  why `<main>` lives in the page rather than the Layout.
- Whitespace inside `<Fragment>` **is** preserved; only comments are dropped.
  A `.map()` emitting siblings needs each item wrapped in a `<Fragment>` with
  the surrounding newlines inside it, or the elements come out glued together.
- Every `<script>` needs `is:inline`, no exceptions, or Astro hoists, modulizes,
  defers, bundles and dedupes it, destroying the jQuery load order.
- Never `import` CSS or a `public/` asset in frontmatter. An import creates a
  second hashed copy under `_astro/`.
- `build.format: 'preserve'`, not `'file'`. `'file'` emits
  `src/pages/en/index.astro` as `dist/en.html`, a URL this site does not have.
- `data-scroll-to={cond ? '' : undefined}` gives the bare attribute;
  `{true}` renders `="true"`, which is a different thing and fails the diff.
- `compressHTML: false` is permanent — trivial byte saving, and collapsing
  whitespace shifts inline-block layout.

## Open threads not covered here

- **`fork/main` has diverged from `origin/main`** — it now carries the Astro
  conversion. Syncing the fork from upstream is no longer a fast-forward.
- **Origin catch-up.** Before the Astro change reaches `origin`, the plain-HTML
  history should land there first so the Astro commit reads as a shape-only
  diff. Part of the hosting-owner conversation.
- **`deploy.yml` has never been run.** It needs `FTP_SERVER`, `FTP_USERNAME`,
  `FTP_PASSWORD` as repository secrets, and its first run should stay
  `dry-run: true` against a staging directory.
- **Pages source** must be "GitHub Actions", or the classic branch builder races
  ours on every push.
- **`ledningsgrupp-candidates.html`** — untracked scratch file on main, never
  entered this branch.
- **English copy on the shared components is unreviewed** by colleagues.
