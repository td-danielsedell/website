import type { Lang } from "./nav";

/**
 * The people who appear as contacts on the project pages.
 *
 * Name, portrait and address do not change with locale; the role does. Keeping
 * them here means a person who changes role — or leaves — is edited once rather
 * than in eight page files.
 */
export interface Person {
  name: string;
  /** Address split in two so the markup can obfuscate it against scrapers. */
  emailUser: string;
  emailDomain: string;
  role: Record<Lang, string>;
}

export const people = {
  hanna: {
    name: "Hanna Hassberg",
    emailUser: "hanna",
    emailDomain: "totaldigital.se",
    role: { sv: "Projektledare", en: "Project Lead" },
  },
  petter: {
    name: "Petter Tyrenius",
    emailUser: "petter",
    emailDomain: "totaldigital.se",
    role: { sv: "Projektledare", en: "Project Lead" },
  },
} satisfies Record<string, Person>;

export type PersonId = keyof typeof people;

/** Wording shared by every project-page call to action. */
export const ctaStrings: Record<Lang, { question: string; showEmail: string }> = {
  sv: {
    question: "Vill du veta mer om hur detta kan tillämpas i er verksamhet?",
    showEmail: "Visa e-postadress",
  },
  en: {
    question: "Want to know more about how this could work in your organisation?",
    showEmail: "Show email address",
  },
};
