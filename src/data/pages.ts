import type { Lang } from './nav';
import type { PersonId } from './people';

/**
 * Per-page metadata, both locales side by side.
 *
 * The point of the shape is the adjacency: a Swedish entry without its English
 * twin, or a stale translation, is visible at a glance instead of hiding in a
 * mirrored file nobody opened. Structural drift between / and /en/ was fixed by
 * sharing the Layout; this is the same fix for the words.
 *
 * Everything here feeds <head>. Page bodies stay in the page files — that prose
 * is genuinely per-locale and reads better as markup than as strings.
 */

export interface PageMeta {
  title: string;
  description: string;
  /** og:title where it differs from <title>. */
  ogTitle?: string;
  /** 'article' on the four project pages; Layout defaults to 'website'. */
  ogType?: string;
  ogImage?: string;
  ogImageAlt?: string;
  /** schema.org name for the product pages, which is the product, not the page title. */
  ldName?: string;
  applicationCategory?: string;
  /** Project pages only: who the call to action is from, and its email subject. */
  contact?: PersonId;
  contactSubject?: string;
}

export const pageMeta: Record<string, Record<Lang, PageMeta>> = {
  'about.html': {
    sv: {
      title: 'Om oss | Total Digital',
      description: 'Om Total Digital: vår historia, ledningen, de tretton orter vi arbetar från, ISO 9001- och 14001-certifiering samt karriär och examensarbete.',
    },
    en: {
      title: 'About us | Total Digital',
      description: 'About Total Digital: our history, the management team, the thirteen locations we work from, ISO 9001 and 14001 certification, plus careers and degree projects.',
    },
  },
  'index.html': {
    sv: {
      title: 'Total Digital – Tillgångsförvaltning, geodata, fjärranalys och AI',
      description: 'Total Digital förenar tillgångsförvaltning, geodata, fjärranalys och AI – specialistkompetens som kopplar samman anläggningens skick, läge och utveckling.',
    },
    en: {
      title: 'Total Digital – Asset management, geodata, remote sensing and AI',
      description: 'Total Digital brings together asset management, geodata, remote sensing and AI – specialist expertise connecting the condition, location and development of your assets.',
    },
  },
  'leak-detection.html': {
    sv: {
      title: 'AI-baserad läckagedetektering i vatteninfrastruktur | Total Digital',
      description: 'AI och satellitdata som upptäcker läckage i vattendistributionsnät, minskar vattenförluster och ger bättre underlag för förvaltning av ledningsnätet.',
      ogTitle: 'AI-baserad läckagedetektering i vatteninfrastruktur',
      ogType: 'article',
      ogImage: 'https://www.totaldigital.se/images/og/leak-detection.jpg',
      ogImageAlt: 'Läckagedetektering i vattendistributionsnät',
      contact: 'hanna',
      contactSubject: 'Läckagedetektering',
    },
    en: {
      title: 'AI-based leak detection in water infrastructure | Total Digital',
      description: 'AI and satellite data that detect leaks in water distribution networks, reduce water losses and give a better basis for managing the pipe network.',
      ogTitle: 'AI-based leak detection in water infrastructure',
      ogType: 'article',
      ogImage: 'https://www.totaldigital.se/images/og/leak-detection.jpg',
      ogImageAlt: 'Leak detection in a water distribution network',
      contact: 'hanna',
      contactSubject: 'Leak detection',
    },
  },
  'raildamage-analyses.html': {
    sv: {
      title: 'AI-baserad analys av rälsskador i bilddata | Total Digital',
      description: 'AI-baserad analys av bilddata från järnvägsinspektioner som identifierar rälsskador och avvikelser – stöd för tillståndsbedömning och underhållsplanering.',
      ogTitle: 'AI-baserad analys av rälsskador i bilddata',
      ogType: 'article',
      ogImage: 'https://www.totaldigital.se/images/og/raildamage-analyses.jpg',
      ogImageAlt: 'Rälsskada identifierad i inspektionsbild',
      contact: 'petter',
      contactSubject: 'Analys av rälsskador',
    },
    en: {
      title: 'AI-based analysis of rail defects from imagery | Total Digital',
      description: 'AI-based analysis of image data from railway inspections that identifies rail defects and anomalies – support for condition assessment and maintenance planning.',
      ogTitle: 'AI-based analysis of rail defects from imagery',
      ogType: 'article',
      ogImage: 'https://www.totaldigital.se/images/og/raildamage-analyses.jpg',
      ogImageAlt: 'Rail defect identified in an inspection image',
      contact: 'petter',
      contactSubject: 'Rail defect analysis',
    },
  },
  'railway-safety.html': {
    sv: {
      title: 'Prediktiv järnvägssäkerhet med satellitdata och AI | Total Digital',
      description: 'AI och satellitdata som prognosticerar rälstemperatur och risk för spårförskjutning upp till 48 timmar i förväg – för proaktivt underhåll och säkrare järnvägsdrift.',
      ogTitle: 'Prediktiv järnvägssäkerhet med satellitdata och AI',
      ogType: 'article',
      ogImage: 'https://www.totaldigital.se/images/og/railway-safety.jpg',
      ogImageAlt: 'Sensor monterad på räl för spårövervakning',
      contact: 'hanna',
      contactSubject: 'Prediktiv järnvägssäkerhet',
    },
    en: {
      title: 'Predictive railway safety with satellite data and AI | Total Digital',
      description: 'AI and satellite data that forecast rail temperature and the risk of track buckling up to 48 hours ahead – for proactive maintenance and safer railway operations.',
      ogTitle: 'Predictive railway safety with satellite data and AI',
      ogType: 'article',
      ogImage: 'https://www.totaldigital.se/images/og/railway-safety.jpg',
      ogImageAlt: 'Sensor mounted on the rail for track monitoring',
      contact: 'hanna',
      contactSubject: 'Predictive railway safety',
    },
  },
  'sar-processing.html': {
    sv: {
      title: 'InSAR – skalbar övervakning av markrörelser | Total Digital',
      description: 'InSAR-baserad bearbetning av hög- och medelupplöst SAR-data för övervakning av markrörelser och deformationer inom infrastruktur och samhällsbyggnad.',
      ogTitle: 'InSAR – skalbar övervakning av markrörelser',
      ogType: 'article',
      ogImage: 'https://www.totaldigital.se/images/og/sar-processing.jpg',
      ogImageAlt: 'Interferogram från SAR-data',
      contact: 'hanna',
      contactSubject: 'SAR-bearbetning',
    },
    en: {
      title: 'InSAR – scalable ground-motion monitoring | Total Digital',
      description: 'InSAR-based processing of high- and medium-resolution SAR data for monitoring ground motion across infrastructure and the built environment.',
      ogTitle: 'InSAR – scalable ground-motion monitoring',
      ogType: 'article',
      ogImage: 'https://www.totaldigital.se/images/og/sar-processing.jpg',
      ogImageAlt: 'Interferogram from SAR data',
      contact: 'hanna',
      contactSubject: 'SAR processing',
    },
  },
  'td_asset_care.html': {
    sv: {
      title: 'TD Asset Care – Heltäckande lösning för EAM och underhåll | Total Digital',
      description: 'TD Asset Care är en heltäckande, beprövad lösning för förvaltning och underhåll av fysiska tillgångar. Branschspecifika funktioner, drift on-prem, hybrid eller i molnet.',
      ogTitle: 'TD Asset Care – Heltäckande lösning för EAM och underhåll',
      ogImage: 'https://www.totaldigital.se/images/og/td_asset_care.jpg',
      ogImageAlt: 'TD Asset Care',
      ldName: 'TD Asset Care',
      applicationCategory: 'BusinessApplication',
    },
    en: {
      title: 'TD Asset Care – Complete EAM and maintenance solution | Total Digital',
      description: 'TD Asset Care is a complete, proven solution for managing and maintaining physical assets. Industry-specific functionality, deployed on-premises, hybrid or in the cloud.',
      ogTitle: 'TD Asset Care – Complete EAM and maintenance solution',
      ogImage: 'https://www.totaldigital.se/images/og/td_asset_care.jpg',
      ogImageAlt: 'TD Asset Care',
      ldName: 'TD Asset Care',
      applicationCategory: 'BusinessApplication',
    },
  },
  'td_linear.html': {
    sv: {
      title: 'TD Linear – Förstå era linjära tillgångar | Total Digital',
      description: 'TD Linear visualiserar och analyserar data längs linjära tillgångar som järnväg, väg, kraftledningar samt vatten- och avloppsnät. EAM-, mät- och kartdata i en gemensam vy.',
      ogTitle: 'TD Linear – Förstå era linjära tillgångar',
      ogImage: 'https://www.totaldigital.se/images/og/td_linear.jpg',
      ogImageAlt: 'Analys av linjära mätdata i TD Linear',
      ldName: 'TD Linear',
      applicationCategory: 'BusinessApplication',
    },
    en: {
      title: 'TD Linear – Understand your linear assets | Total Digital',
      description: 'TD Linear visualises and analyses data along linear assets such as railway, road, power lines as well as water and wastewater networks. EAM, measurement and map data in one shared view.',
      ogTitle: 'TD Linear – understand your linear assets',
      ogImage: 'https://www.totaldigital.se/images/og/td_linear.jpg',
      ogImageAlt: 'Analysis of linear measurement data in TD Linear',
      ldName: 'TD Linear',
      applicationCategory: 'BusinessApplication',
    },
  },
  'td_test.html': {
    sv: {
      title: 'TD Test – Automattester för IBM Maximo | Total Digital',
      description: 'TD Test är verktyget för automatiserade tester av IBM Maximo och Maximo Application Suite (MAS). Testar gränssnitt, affärslogik och integrationer m.m.',
      ogTitle: 'TD Test – Automattester för IBM Maximo',
      ogImage: 'https://www.totaldigital.se/images/og/td_test.jpg',
      ogImageAlt: 'TD Tests startsida med testkörningar och resultat',
      ldName: 'TD Test',
      applicationCategory: 'DeveloperApplication',
    },
    en: {
      title: 'TD Test – automated testing for IBM Maximo | Total Digital',
      description: 'TD Test is the tool for automated testing of IBM Maximo and Maximo Application Suite (MAS). Tests the interface, business logic, integrations and more.',
      ogTitle: 'TD Test – automated testing for IBM Maximo',
      ogImage: 'https://www.totaldigital.se/images/og/td_test.jpg',
      ogImageAlt: 'TD Test home screen with test runs and results',
      ldName: 'TD Test',
      applicationCategory: 'DeveloperApplication',
    },
  },
};

export const SITE = 'https://www.totaldigital.se';

/** BCP-47 tag for schema.org's inLanguage. */
export const localeTag = (lang: Lang) => (lang === 'sv' ? 'sv-SE' : 'en-GB');

/** Canonical URL for a page. The index pages canonicalise to the bare directory. */
export const pageUrl = (lang: Lang, path: string) => {
  const dir = lang === 'sv' ? `${SITE}/` : `${SITE}/en/`;
  return path === 'index.html' ? dir : `${dir}${path}`;
};

/** The organization every structured-data block points at. */
export const ORGANIZATION_ID = `${SITE}/#organization`;
