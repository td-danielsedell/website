# Total Digital website

Static site, built with [Astro](https://astro.build). 18 pages: 9 Swedish at the
root and 9 English mirrors under `en/`.

## Working on it

```sh
npm install
npm run dev        # local dev server
npm run build      # writes dist/
npm run preview    # serves dist/ exactly as it will be deployed
```

**Verify against `astro build && astro preview`, never the dev server.** URL
matching under `build.format` is inconsistent in dev, so the dev server can show
a page the build does not produce.

## Deploying

`npm run build` writes a complete static site to `dist/`. Deploying is copying
that folder — there is no server-side part. Confirm the destination with
whoever owns the hosting before the first real deploy.

## Layout of the repo

| Path | What it is |
|---|---|
| `src/pages/` | One `.astro` file per page; `src/pages/en/` mirrors it. Page bodies are per-language. |
| `src/layouts/Layout.astro` | The shared `<head>`, header, footer and site-wide scripts. |
| `src/components/` | Header, Footer, icons, and the small per-page `head/` and `scripts/` fragments. |
| `src/data/nav.ts` | Per-locale strings for the header and footer. Strings only — the markup stays in the components. |
| `public/` | `css/ js/ images/ fonts/`, copied verbatim to the output at their original URLs. Never processed by Astro. |
| `verify/` | The migration verification harness — see below. |

## Rules that are not style preferences

These will silently break the site if ignored.

- **Every `<script>` needs `is:inline`.** Astro's default is to hoist, modulize,
  defer, bundle and dedupe scripts, which destroys the jQuery plugin load order
  this site depends on.
- **Never `import` CSS or a `public/` asset in frontmatter.** Stylesheets stay
  `<link>` tags. An import produces a second, hashed copy under `_astro/`.
- **Asset URLs stay relative** — `css/...` at the root, `../css/...` under
  `en/`. `Layout` derives the prefix from `lang`. Root-absolute URLs break when
  the site is served from a subpath.
- **Astro drops HTML comments written at the top level of slot content** — in a
  `<Fragment>`, in `<Fragment slot="...">`, and among a page's default-slot
  children. Comments survive inside a real element or inside a component you
  slot in. That is why the per-page `head/` and `scripts/` fragments are
  components rather than inline markup, and why `<main>` lives in the page
  rather than in the Layout.
- **`compressHTML: false` is permanent.** The byte saving is trivial and
  collapsing whitespace shifts inline-block layout.
- Several HTML comments are load-bearing documentation (the footer child-order
  lock, the `theme.js` blocking rationale, the `td_linear` og:image
  PLACEHOLDER). The verification harness compares them.

## Verification harness

`verify/baseline/` is a snapshot of the 18 hand-written HTML pages at the commit
the Astro branch forked from, recorded in `verify/baseline-ref.json` with a
sha256 per file. It is the ground truth every converted page is compared against.

```sh
npm run verify            # normalized DOM diff, dist/ vs the baseline
npm run verify:invariants # standing invariants from the traps checklist
npm run verify:self-test  # proves the harness itself still catches real changes
npm run verify:baseline   # sanity: the baseline against itself
npm run verify:serve      # baseline on :4001, build on :4002, side by side
```

A page passes when it has **zero divergences except those listed in
`verify/allowlist.json`**, and every allowlist entry carries a reason. The diff
normalizes only what is provably invisible — attribute order, quote style,
void-tag form, boolean-attribute form, entity vs character, indentation, and
whitespace that cannot render (inside `<head>`, or between two non-rendering
elements). Whitespace next to rendered content stays strict, because a gap
between inline elements is layout.

`verify:self-test` is the one that matters if you change the normalizer: it
plants cosmetic rewrites that must be ignored and real defects that must be
caught, in both directions.
