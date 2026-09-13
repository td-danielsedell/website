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
| `src/components/` | Header, Footer, icons, and the shared `head/` and `scripts/` fragments. Page-specific head content is written inline in the page, as `<Fragment slot="…">`. |
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
- **Write source comments as `{/* … */}`, never `<!-- … -->`.** Astro emits an
  HTML comment to the page; it does not emit an expression comment. The shipped
  pages carry none, so the source can document itself freely.
- **Astro drops an HTML comment written at the top level of slot content** — in a
  `<Fragment>`, in `<Fragment slot="...">`, and among a page's default-slot
  children. It survives inside a real element. This is why `<main>` lives in the
  page rather than in the Layout. It no longer constrains head fragments, since
  those carry `{/* … */}`, which is dropped everywhere by design.
- **Formatting is prettier's job, not yours.** `npm run format`, configured in
  `.prettierrc`. `.prettierignore` protects `verify/baseline/`, which is a
  byte-exact snapshot and must never be reformatted — it is the thing under test.
- **`compressHTML: false` is permanent.** The byte saving is trivial and
  collapsing whitespace shifts inline-block layout.
- Several source comments are load-bearing documentation (the footer
  child-order lock, the `theme.js` blocking rationale, the `td_linear` og:image
  PLACEHOLDER, the index banner preload). They are not shipped — the harness
  asserts the built pages contain **no** comments at all.

## Verification harness

`verify/baseline/` is a snapshot of the 18 built pages, recorded in
`verify/baseline-ref.json` with a sha256 per file and a note on where it came
from. Read that file before trusting the diff — the snapshot's provenance has
changed once already and the guarantee changed with it.

It began as main's shipped HTML, and every step of the conversion passed against
it with an empty allowlist, which is what proves the Astro build reproduces the
hand-written site. It is now this project's own build, taken after `src/` was
formatted with prettier: the two legitimately differ in whitespace, so the diff
is a **regression gate** — nothing changed unintentionally since the snapshot —
rather than a proof of parity with main.

```sh
npm run verify            # normalized DOM diff, dist/ vs the baseline
npm run verify:invariants # standing invariants from the traps checklist
npm run verify:self-test  # proves the harness itself still catches real changes
npm run verify:baseline   # sanity: the baseline against itself
npm run verify:serve      # baseline on :4001, build on :4002, side by side
```

A page passes when it has **zero divergences except those listed in
`verify/allowlist.json`**, and every allowlist entry carries a reason. This is a
normalized DOM comparison, not a byte comparison: two builds that differ only in
indentation both pass, by design. The diff normalizes only what is provably
invisible — attribute order, quote style,
void-tag form, boolean-attribute form, entity vs character, indentation, and
whitespace that cannot render (inside `<head>`, or between two non-rendering
elements). Whitespace next to rendered content stays strict, because a gap
between inline elements is layout.

`verify:self-test` is the one that matters if you change the normalizer: it
plants cosmetic rewrites that must be ignored and real defects that must be
caught, in both directions.
