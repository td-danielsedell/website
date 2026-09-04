# Convert the site to Astro (idiomatic, verified against current site as truth)

*Plan settled 2026-09-04. Execution happens on the `astro` branch in a separate git worktree; main stays untouched and Daniel keeps working there.*

## Context

The site is ~finished: 18 pages (9 Swedish at root + 9 English mirrors in `en/`), plain HTML/CSS/jQuery, no build step. Edits now cost too much: header (~186 lines) and footer (~57 lines) are copied in every page — the ISO badge change touched 18 files — and the `en/` mirror rots because structural fixes don't propagate. The build-step ban is lifted. The conversion is done entirely by AI, with subagents verifying output against the current site as ground truth. The result must be idiomatic Astro, not HTML-in-.astro-clothing.

## Decisions (confirmed)

- **Deploy**: unknown — assume "deploy = copy `dist/` folder"; verify with hosting owner before first real deploy. Doesn't block migration.
- **Scope**: shared Layout + shared components (header/nav, footer, icons); page bodies stay per-language.
- **Isolation (hard requirement)**: all work on `astro` branch in a **git worktree** (`git worktree add ../website-astro astro`). Main checkout is never touched by migration work.
- **URLs**: keep `about.html` style — `build.format: 'file'`, `trailingSlash: 'never'`.
- **CSS**: re-home, don't rewrite. Globals (colors, style, animations, light) stay global; page sheets may move into scoped component styles in a late phase, rules unchanged; `scopedStyleStrategy: 'where'`. No Tailwind/Sass.
- **i18n**: plain file placement (`src/pages/about.astro` + `src/pages/en/about.astro`), NOT Astro's i18n routing module — the URL structure already is the file structure, translated strings live in markup, and 2 locales × 9 pages needs no middleware/fallback machinery. `lang` is an ordinary Layout prop.
- **Images**: `astro:assets` deferred — hand-done WebP work stays as-is.

## Architecture

```
(astro branch, worktree ../website-astro)
├─ astro.config.mjs      # static, build.format 'file', trailingSlash 'never',
│                        # compressHTML: false, scopedStyleStrategy: 'where'
├─ package.json
├─ verify/
│  ├─ baseline/          # fork-point snapshot of the 18 HTML files (ground truth)
│  ├─ diff-pages.mjs     # parse5 normalized DOM diff
│  └─ allowlist.json     # every accepted divergence, each with a reason
├─ public/               # css/ js/ images/ fonts/ moved verbatim — served at original URLs,
│                        # never processed by Astro (exactly what the jQuery stack needs)
└─ src/
   ├─ layouts/Layout.astro
   ├─ components/Header.astro, Footer.astro, icons/{Globe,GitHub,LinkedIn}.astro
   ├─ data/nav.ts        # per-locale nav labels + data-label-* strings + item list
   │  └─ assets.ts       # named CSS/JS URL bundles (late phase only)
   └─ pages/*.astro + pages/en/*.astro
```

**Layout.astro props**: `lang`, `path` (e.g. `'about.html'` — derives canonical, 3× hreflang, og:url, lang-switcher hrefs), `title`, `description`, `ogTitle?` (subpages differ from title), `ogType?` ('article' on the 4 project pages), `css?: string[]` (rendered after the 4 globals, order preserved), `scripts?: string[]` (end-of-body, order preserved), `mainClass?`, `isHome?`. `isHome` collapses the five index-only variances (header id="home", bare-hash nav hrefs, 1-vs-4 nav onclicks, FA kit non-defer, banner preload) — they co-occur on exactly the two index pages.

**Header.astro** (`lang`, `isHome`, `path`): `aria-current` derived from `path`; nav hrefs `` `${isHome ? '' : 'index.html'}#…` `` (relative `index.html` resolves correctly under /en/); load-bearing `<li onclick>` attrs rendered as plain string attributes from `src/data/nav.ts`; native `<details>/<summary>` dropdowns and the EMPTY `<nav id="nav-mobile">` pass through untouched (site.js clones #nav-main into it); `data-label-*` strings emitted per-locale (theme.js reads them from markup); lang-switcher child order flips per locale.

**Footer.astro** (`lang`, `onAboutPage`): component root IS the `<footer>` (no wrapper — CSS reorders its exactly-4 children by index at ≤1023px); about pages get `href="#certificates" data-scroll-to`.

**JSON-LD**: slotted verbatim `<script type="application/ld+json" is:inline slot="head">` per page — never a prop through JSON.stringify (re-serialization breaks the diff).

**Script discipline (the most dangerous Astro default)**: every `<script>` in every .astro file gets `is:inline`, no exceptions — otherwise Astro hoists, modulizes, defers, bundles and dedupes, destroying jQuery plugin load order. Never `import` CSS or public/ assets in frontmatter; stylesheets stay `<link>` tags. No `<style>` blocks until the late CSS re-homing phase.

## Phases and gates

Baseline first: fork `astro` from a committed main state (working tree has uncommitted edits — commit them first, or fork excludes them knowingly).

1. **Scaffold** (worktree): package.json, astro.config, move css/js/images/fonts to `public/`. Gate: `astro build` succeeds; every static asset in dist/ byte-identical (hash compare) at its original path.
2. **Verification harness**: snapshot fork-point HTML to `verify/baseline/`; write `diff-pages.mjs` (parse5: sort attributes, normalize whitespace except in script/style/pre, normalize quote/boolean-attr/void forms, compare comment nodes too — several comments are load-bearing docs). Gate: baseline-vs-baseline clean AND a deliberately planted mutation is caught.
3. **Layout + Header + Footer + icons, pilot = about pair** (exercises id="banner", footer variant, the en/about leaflet workaround — preserved verbatim this phase). Gate: both about pages pass diff with an empty allowlist.
4. **Fan-out remaining 16 pages**: one subagent per page pair — convert, run diff for its pages, iterate to zero. Index pair last (most variance) with a review pass. Gate: all 18 pass normalized diff, empty allowlist, plus browser spot-checks.
5. **Deliberate improvements** — one commit + one allowlist entry each: root-absolute asset URLs; fix `js/about.js` leaflet relative-path bug and drop en/about's duplicate loads (behavior change — verify map on both about pages); collapse per-page CSS/JS literals into named bundles in `src/data/assets.ts`; optionally start moving page CSS into scoped styles (per-sheet, verified). Gate: diff passes with only allowlisted divergences.
6. **Re-sync with main**: `git diff <fork-point>..main -- '*.html' 'en/*.html' css/ js/ images/` and re-apply ongoing main edits into the .astro sources / public/. Re-run full verification against a REGENERATED baseline (current main). Repeat if main moved again.
7. **Cleanup + handover**: delete old root .html on the branch; decide `ledningsgrupp-candidates.html` (scratch file — drop into public/ or leave on main); README section on `npm run dev` / `npm run build`; keep `compressHTML: false` permanently (byte savings trivial, whitespace can shift inline-block layout). Merge to main is Daniel's call, after the deploy question is answered with the hosting owner.

## Verification harness detail

- Two local servers: `verify/baseline/` (truth) and `dist/` (candidate) — plus static asset hash compare.
- DOM layer: parse5 normalized structural diff per page; **pass = zero divergences except allowlisted, every allowlist entry carries a reason**.
- Browser layer: computed-style sentinels (footer child order ≤1023px, sticky nav offset, theme state after theme.js) + behavior smoke: mobile nav clone, `<details>` dropdowns, lang/theme switchers, carousel, lightbox, leaflet map, `data-scroll-to`. **No Chrome installed** — use claude-in-chrome, or Puppeteer with `executablePath` pointed at Brave. Known measurement traps: computed styles lie about transitioned properties in background tabs (set `transition: none` first), and wow.js leaves sections blank after instant scroll jumps (reload between trials).
- Harness also asserts: theme.js `<script>` sits in `<head>` after CSS with no defer/module; `#nav-mobile` empty; footer has exactly 4 children.

## Known traps checklist (each must survive)

1. `<li onclick>` nav attrs (stickyNavbar swallows nav clicks) — 1 on index, 4 on subpages.
2. `#nav-mobile` stays empty; dropdowns stay `<details>` (mobile clone carries no handlers).
3. theme.js: blocking `is:inline` in head after CSS; reads per-locale `data-label-*` from markup.
4. Footer: 4 children, locked order, no wrappers. Testimonial `<footer>`s inside index blockquotes — extraction targets `footer.footer-large` only.
5. Translated section ids on product pages (sv `#mojligheter/#funktioner/#kontakt`, en `#capabilities/#features/#contact`) — anchors/scroll-cues stay per-language in page bodies.
6. area-band.css must load after style.css (css array order).
7. FA kit non-defer on index only (deliberate — above-fold expertise reel).
8. Load-bearing HTML comments (footer order lock, theme.js rationale, td_linear og:image PLACEHOLDER) — keep as template HTML, never inside `{}` expressions.
9. `data-carousel-label/-noun` = translated content read by image-carousel.js, lives in page markup.
10. about.html (sv) logo imgs lack width/height — fix while templating (allowlisted).
11. Prettier/formatters must not reflow src/ during migration (`.prettierignore`).
12. Verify against `astro build && astro preview`, never the dev server (format 'file' URL matching is inconsistent in dev).
13. public/ assets referenced by URL string only — importing one creates a duplicate hashed copy under `_astro/`.

## Model assignment (execution runs in Claude Code, Opus main session)

Use Sonnet wherever the diff harness makes pass/fail objective; keep Opus where judgment or silent failure risk lives.

| Phase | Model | Why |
|---|---|---|
| 1 Scaffold | Sonnet subagent OK | Mechanical; gate is a hash compare. |
| 2 Harness | **Opus (main loop)** | A normalizer bug produces false passes and everything downstream trusts it — the one component that fails silently. |
| 3 Pilot (about pair) | **Opus (main loop)** | Layout/Header design meets reality; first real use of the gate. |
| 4 Fan-out, 14 subpages | **Sonnet subagents**, one per page pair | Paste body into Layout, run `verify/diff-pages.mjs`, iterate to zero. Objective gate, no judgment. |
| 4 Index pair | **Opus** | Most variance (`isHome` cluster), done last with a review pass. |
| 5 Deliberate improvements | **Opus** | Allowlist judgment calls — "is this divergence acceptable" is where a weaker model rationalizes. |
| 6 Re-sync with main | **Opus** | Needs context on what changed on main and why. |
| 7 Cleanup | Sonnet subagent OK | Mechanical; Opus reviews the final state. |

Mechanics: the Agent/Task tool takes a `model` parameter per spawn, so the Opus session passes `model: sonnet` for phase-4 subagents. Optionally define `.claude/agents/page-converter.md` with `model: sonnet` in frontmatter — prompt: "convert one page pair per astro-migration-plan.md, run verify/diff-pages.mjs, iterate to zero divergences, report the final diff output; the traps checklist is non-negotiable."

## Critical files

- Created: `astro.config.mjs`, `src/layouts/Layout.astro`, `src/components/Header.astro`, `src/components/Footer.astro`, `src/data/nav.ts`, `verify/diff-pages.mjs`, 18 `src/pages/**/*.astro`.
- Existing contracts to satisfy (read, don't change until phase 5): `js/theme.js` (data-label reads, must stay blocking), `js/site.js` (#nav-mobile innerHTML clone, stopImmediatePropagation handlers, data-scroll-to), `js/about.js` (leaflet relative-path bug, fixed in phase 5).

## Out of scope

Tailwind/Sass, astro:assets image pipeline, content collections, pretty URLs, any visual change. Deploy-pipeline work beyond documenting "upload dist/" — the hosting-owner conversation is Daniel's.
