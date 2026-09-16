import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Project-page prose, one file per page per locale: `<page>-<lang>.md`.
 *
 * The separator is a hyphen, not a dot: the glob loader strips dots from the
 * entry id, so `leak-detection.en.md` arrives as "leak-detectionen".
 *
 * The body is Markdown rather than markup in a data file, because it carries
 * inline emphasis and reads badly as an escaped string. Everything that is not
 * prose — title, description, og:* — stays in src/data/pages.ts.
 *
 * verify/assert-translations.mjs fails the build if a page has one locale and
 * not the other. That is the drift this is meant to prevent: the /en/ mirror
 * has gone stale before, with stale titles and a broken portrait.
 */
const projects = defineCollection({
  loader: glob({ pattern: "*-{sv,en}.md", base: "./src/content/projects" }),
  schema: z.object({
    /** alt text for the page's hero image. */
    imageAlt: z.string(),
    /** The partners line under the prose. Absent on pages that have none. */
    partners: z.string().optional(),
    /** figcaption under the hero. Three of the four pages have one. */
    caption: z.string().optional(),
  }),
});

export const collections = { projects };
