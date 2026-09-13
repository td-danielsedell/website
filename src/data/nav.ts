/**
 * Per-locale strings for the shared header and footer.
 *
 * Only STRINGS live here. The markup itself stays literal in Header.astro and
 * Footer.astro, for two reasons: the load-bearing HTML comments have to be real
 * template comments (a comment built from data would have to go through
 * `set:html`, and Astro silently swallows comments inside a `<Fragment>`), and
 * the `<li onclick>` attributes read far more obviously as markup than as data.
 */

export type Lang = "sv" | "en";

/** `''` at the site root, `'../'` under /en/ — assets stay relative (Pages subpath). */
export const assetPrefix = (lang: Lang) => (lang === "en" ? "../" : "");

export interface Strings {
  /** Top-level nav labels. */
  nav: {
    businessareas: string;
    showcases: string;
    showcasesAll: string;
    services: string;
    products: string;
    productsAll: string;
    trust: string;
    about: string;
  };
  /** Project subpages, in menu order. Hrefs are page-relative and identical per locale. */
  projects: { href: string; label: string }[];
  /** Product subpages, in menu order. */
  products: { href: string; label: string }[];
  /** theme.js reads these two off the button; they must be rendered per locale. */
  theme: { toLight: string; toDark: string };
  lang: { choose: string; sv: string; en: string };
  footer: {
    aboutHeading: string;
    aboutLinks: { href: string; label: string }[];
    certsHeading: string;
    certAlt: { iso9001: string; iso14001: string };
    contactHeading: string;
    city: string;
  };
}

export const strings: Record<Lang, Strings> = {
  sv: {
    nav: {
      businessareas: "Teknikområden",
      showcases: "Projekt",
      showcasesAll: "Alla projekt",
      services: "Tjänster",
      products: "Produkter",
      productsAll: "Alla produkter",
      trust: "Kunder",
      about: "Om oss",
    },
    projects: [
      { href: "leak-detection.html", label: "Läckagedetektering" },
      { href: "raildamage-analyses.html", label: "Rälsskadeanalys" },
      { href: "railway-safety.html", label: "Järnvägssäkerhet" },
      { href: "sar-processing.html", label: "SAR-bearbetning" },
    ],
    products: [
      { href: "td_asset_care.html", label: "TD Asset Care" },
      { href: "td_test.html", label: "TD Test" },
      { href: "td_linear.html", label: "TD Linear" },
    ],
    theme: { toLight: "Byt till ljust läge", toDark: "Byt till mörkt läge" },
    lang: { choose: "Välj språk", sv: "Svenska", en: "English" },
    footer: {
      aboutHeading: "Om oss",
      aboutLinks: [
        { href: "about.html#history", label: "Historia" },
        { href: "about.html#management", label: "Ledningsgrupp" },
        { href: "about.html#locations", label: "Var vi finns" },
        { href: "about.html#career", label: "Karriär & Examensarbeten" },
      ],
      certsHeading: "Certifieringar",
      certAlt: { iso9001: "Certifierad enligt ISO 9001", iso14001: "Certifierad enligt ISO 14001" },
      contactHeading: "Kontakt",
      city: "531 60 Lidköping",
    },
  },
  en: {
    nav: {
      businessareas: "Technology",
      showcases: "Projects",
      showcasesAll: "All Projects",
      services: "Services",
      products: "Products",
      productsAll: "All Products",
      trust: "Customers",
      about: "About",
    },
    projects: [
      { href: "leak-detection.html", label: "Leak Detection" },
      { href: "raildamage-analyses.html", label: "Rail Damage Analysis" },
      { href: "railway-safety.html", label: "Railway Safety" },
      { href: "sar-processing.html", label: "SAR Processing" },
    ],
    products: [
      { href: "td_asset_care.html", label: "TD Asset Care" },
      { href: "td_test.html", label: "TD Test" },
      { href: "td_linear.html", label: "TD Linear" },
    ],
    theme: { toLight: "Switch to light mode", toDark: "Switch to dark mode" },
    lang: { choose: "Choose language", sv: "Svenska", en: "English" },
    footer: {
      aboutHeading: "About us",
      aboutLinks: [
        { href: "about.html#history", label: "History" },
        { href: "about.html#management", label: "Management team" },
        { href: "about.html#locations", label: "Where we are" },
        { href: "about.html#career", label: "Careers & Degree Projects" },
      ],
      certsHeading: "Certifications",
      certAlt: { iso9001: "Certified to ISO 9001", iso14001: "Certified to ISO 14001" },
      contactHeading: "Contact",
      city: "531 60 Lidköping, Sweden",
    },
  },
};
