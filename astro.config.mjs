// @ts-check
import { defineConfig } from 'astro/config';

// Migration constraints (see astro-migration-plan.md):
// - `build.format: 'preserve'` + `trailingSlash: 'never'` keep the existing
//   `about.html` style URLs, so no link in the site body has to change.
//   'preserve' rather than 'file': 'file' emits src/pages/en/index.astro as
//   dist/en.html, which is not a URL this site has. 'preserve' maps every page
//   to its source path, so en/index.astro lands at en/index.html as it must.
// - `compressHTML: false` is permanent: the byte saving is trivial and
//   collapsing whitespace shifts inline-block layout.
// - `scopedStyleStrategy: 'where'` keeps specificity at zero when page CSS
//   is re-homed into component styles in a late phase, so the existing
//   cascade order still decides.
// - No `image` / `assets` config: css/js/images/fonts live in public/ and are
//   served verbatim at their original URLs, never processed by Astro.
export default defineConfig({
  output: 'static',
  compressHTML: false,
  scopedStyleStrategy: 'where',
  trailingSlash: 'never',
  build: {
    format: 'preserve',
  },
});
