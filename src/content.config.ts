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

/**
 * Product-page prose. Same shape as `projects`, but a product page leads with
 * a subtitle and closes with its own call to action rather than a partners
 * line, so the frontmatter differs.
 */
/** A card in a `.tdt-trio` grid: heading, a lead line, a checklist. */
const trioCard = z.object({
  title: z.string(),
  lead: z.string().optional(),
  items: z.array(z.string()).default([]),
});

/** A card in an `.area-band`: duotone icon, heading, one paragraph. */
const bandCard = z.object({
  icon: z.string(),
  title: z.string(),
  body: z.string(),
});

/**
 * A section below the intro. The section ids are translated on purpose
 * (#mojligheter vs #capabilities) because the in-page anchors are, so `id`
 * lives in the content rather than being derived.
 */
/**
 * A yes/no comparison against a rival approach. The two glyphs are the same on
 * every row, so they live in the route and the content only says which one.
 */
const compare = z.object({
  columns: z.array(z.string()),
  rows: z.array(
    z.object({
      label: z.string(),
      values: z.array(z.boolean()),
    }),
  ),
});

const section = z.object({
  /** Omitted on a section with no anchor of its own. */
  id: z.string().optional(),
  /** Extra classes on <section>, e.g. "primary-color". */
  className: z.string().optional(),
  kicker: z.string(),
  title: z.string(),
  /** May carry inline markup, so it is rendered as HTML rather than escaped. */
  subtitle: z.string().optional(),
  /** Referenced by the comparison table's aria-labelledby. */
  titleId: z.string().optional(),
  trio: z.array(trioCard).optional(),
  band: z.array(bandCard).optional(),
  /**
   * Screenshots below the cards. `image` names an entry in the route's import
   * map, because astro:assets needs a real import and a string is just a string.
   */
  /** Wide tours run to 1205px rather than 860px, and take the --wide modifier. */
  wide: z.boolean().default(false),
  compare: compare.optional(),
  shots: z
    .array(
      z.object({
        image: z.string(),
        alt: z.string(),
        caption: z.string().optional(),
      }),
    )
    .optional(),
});

const products = defineCollection({
  loader: glob({ pattern: "*-{sv,en}.md", base: "./src/content/products" }),
  schema: z.object({
    /** The line under the product name. */
    subtitle: z.string(),
    /** Font Awesome classes for the heading icon. */
    titleIcon: z.string(),
    /**
     * The opening paragraph, which sits beside the heading in .tdt-hero-body
     * rather than with the rest of the prose. Pages without that split omit it.
     */
    lead: z.string().optional(),
    /**
     * Feature sections. Their cards are structured data rather than Markdown:
     * the grids need .card-title and .tdt-list, which Markdown does not emit,
     * and .card-title is a site-wide class so it cannot be traded for a
     * structural selector without changing how every other card is styled.
     * The Markdown body is the page's prose intro.
     */
    sections: z.array(section).default([]),
    /** The "read more" cue under the intro, pointing at the first section. */
    scrollCue: z.object({ href: z.string(), label: z.string(), text: z.string() }).optional(),
    ctaText: z.string(),
    ctaHref: z.string(),
    ctaLabel: z.string(),
  }),
});

/**
 * The about page. Every section is a different shape, but each is repeated data
 * the page used to spell out twice - once per locale - so it lives here and the
 * route draws it.
 */
const aboutSection = z.object({
  id: z.string(),
  kicker: z.string(),
  title: z.string(),
  /** The opening section leads with an h1 in .about-hero rather than an h2. */
  hero: z.boolean().default(false),
  lead: z.string().optional(),
  subtitle: z.string().optional(),
  /** Paragraphs of prose. May carry inline links and emphasis, so rendered as HTML. */
  body: z.array(z.string()).default([]),
  timeline: z.array(z.object({ year: z.string(), title: z.string(), body: z.string() })).optional(),
  carouselLabel: z.string().optional(),
  carouselNoun: z.string().optional(),
  people: z
    .array(
      z.object({
        image: z.string(),
        name: z.string(),
        role: z.string(),
        /** Local part of the address; the domain is the same for everyone. */
        user: z.string(),
      }),
    )
    .optional(),
  locationsLead: z.string().optional(),
  cities: z.array(z.object({ slug: z.string(), name: z.string() })).optional(),
  mapCaption: z.string().optional(),
  mapHint: z.string().optional(),
  certificates: z
    .array(z.object({ image: z.string(), alt: z.string(), name: z.string(), kind: z.string() }))
    .optional(),
  tracks: z
    .array(
      z.object({
        trackId: z.string().optional(),
        title: z.string(),
        body: z.array(z.string()).default([]),
        ctaHref: z.string(),
        ctaLabel: z.string(),
      }),
    )
    .optional(),
});

const about = defineCollection({
  loader: glob({ pattern: "*-{sv,en}.md", base: "./src/content/about" }),
  schema: z.object({
    sections: z.array(aboutSection).default([]),
  }),
});

/** An icon plus a word: the hero's rotator, and the industry strip below it. */
const iconWord = z.object({ icon: z.string(), text: z.string() });

/**
 * The start page. Five bands, each a different shape, all of them lists the
 * page used to spell out twice.
 */
const homeSection = z.object({
  id: z.string(),
  kicker: z.string(),
  title: z.string(),
  /** Referenced by the products carousel's aria-labelledby. */
  titleId: z.string().optional(),
  carouselLabel: z.string().optional(),
  carouselNoun: z.string().optional(),
  /** The "show more" button below the showcase carousel, hidden until JS needs it. */
  moreLabel: z.string().optional(),
  areas: z.array(z.object({ icon: z.string(), title: z.string(), body: z.string() })).optional(),
  industryLabel: z.string().optional(),
  industries: z.array(z.object({ icon: z.string(), name: z.string() })).optional(),
  cards: z
    .array(z.object({ image: z.string(), href: z.string(), title: z.string(), body: z.string() }))
    .optional(),
  groups: z
    .array(
      z.object({
        image: z.string(),
        title: z.string(),
        items: z.array(z.object({ title: z.string(), body: z.string() })).default([]),
      }),
    )
    .optional(),
  products: z
    .array(
      z.object({
        href: z.string(),
        name: z.string(),
        sub: z.string(),
        icon: z.string(),
        body: z.string(),
      }),
    )
    .optional(),
  testimonials: z
    .array(z.object({ image: z.string(), alt: z.string(), quote: z.string(), source: z.string() }))
    .optional(),
  partnerLead: z.string().optional(),
  partners: z
    .array(
      z.object({
        href: z.string(),
        image: z.string(),
        alt: z.string(),
        /** Rendered width in CSS pixels; Rymdstyrelsen's wordmark is wider than the rest. */
        width: z.number(),
        /** A reversed, white-ink variant for the light theme, where there is one. */
        light: z.string().optional(),
      }),
    )
    .optional(),
});

const home = defineCollection({
  loader: glob({ pattern: "*-{sv,en}.md", base: "./src/content/home" }),
  schema: z.object({
    hero: z.object({
      headingLines: z.array(z.string()),
      expertiseLabel: z.string(),
      expertise: z.array(iconWord),
      /** What a screen reader hears in place of the silent rotator. */
      srOnly: z.string(),
      intro: z.string(),
      introNext: z.string(),
    }),
    scrollCue: z.object({ href: z.string(), label: z.string(), text: z.string() }),
    sections: z.array(homeSection).default([]),
  }),
});

export const collections = { projects, products, about, home };
