---
subtitle: "Kvalitetssäkra ert IBM Maximo"
titleIcon: "fa-duotone fa-solid fa-clipboard-list-check"
lead: "TD Test automatiserar test av IBM Maximo och ersätter tidskrävande manuella kontroller. Ett arbetsflöde definieras en gång och kan sedan testas om och om igen – efter uppgraderingar, anpassningar eller inför driftsättning."
sections:
  - id: "mojligheter"
    className: "primary-color"
    kicker: "MÖJLIGHETER"
    title: "Vad kan TD Test?"
    subtitle: "\"Testar Maximo med hjälp av Maximo.\" <br /> TD Test arbetar inifrån Maximo och når därför både gränssnittet och affärslogiken m.m."
    trio:
      - title: "Testa det som är viktigt"
        lead: "TD Test kan automatisera tester av:"
        items:
          - "Maximos användargränssnitt och affärslogik"
          - "Integrationer med andra system"
          - "Egna anpassningar och funktioner"
          - "Kompletta verksamhetsprocesser"
          - "Flöden med flera användare, exempelvis attestering och överlämning"
      - title: "Se direkt vad som gick fel"
        lead: "TD Test ger er efter varje körning:"
        items:
          - "Resultat för varje teststeg"
          - "Felmeddelanden och relevanta loggutdrag"
          - "Skärmbilder från varje steg"
          - "Historik över tidigare testkörningar"
          - "Automatisk rapportering till exempelvis Teams"
      - title: "Kör på era villkor"
        lead: "TD Test ger flexibilitet att:"
        items:
          - "Köra enskilda tester eller hela testgrupper"
          - "Schemalägga återkommande körningar"
          - "Starta tester direkt från webbläsaren"
          - "Integrera med exempelvis Jenkins"
          - "Styra loggnivån per test utan att påverka Maximos ordinarie inställningar"
    wide: false
    shots:
      - image: "landingPage"
        alt: "Startsidan i TD Test med testsviter och senaste körningar"
        caption: "<strong>Startsidan</strong> – en överblick av läget just nu."
      - image: "testRunsHistory"
        alt: "Historik över tidigare testkörningar i TD Test"
        caption: "<strong>Körningshistorik</strong> – tidigare körningar, så ni kan följa kvaliteten över tid."
      - image: "testRunReport"
        alt: "Detaljer för en testkörning i TD Test"
        caption: "<strong>Körningsdetaljer</strong> – resultatet för varje test som ingick i körningen."
      - image: "testCaseReport"
        alt: "Detaljer för ett enskilt testfall i TD Test, med källkod"
        caption: "<strong>Testfallsdetaljer</strong> – steg för steg, med testets källkod bredvid för att se vad som testades."
      - image: "maximoGui"
        alt: "Sparad skärmbild av Maximo från ett teststeg"
        caption: "<strong>Sparad Maximo-vy</strong> – exakt vad Maximos gränssnitt var i det teststeget."
  - id: "funktioner"
    kicker: "FÖRDELAR"
    title: "Varför TD Test?"
    band:
      - icon: "fa-duotone fa-solid fa-gauge-high"
        title: "Snabbt"
        body: "TD Test arbetar direkt mot Maximo, utan omvägen via en webbläsare. Det ger tester som kan köras upp till 100 gånger snabbare."
      - icon: "fa-duotone fa-solid fa-shield-check"
        title: "Stabilt"
        body: "TD Test påverkas inte av ändringar i Maximos gränssnitt eller webbläsarens beteende. Testerna blir stabilare och kräver mindre underhåll när Maximo förändras."
      - icon: "fa-duotone fa-solid fa-piggy-bank"
        title: "Kostnadseffektivt"
        body: "TD Test kräver ingen dedikerad hårdvara och kan köras som container i befintlig miljö. Snabb implementation och mindre testunderhåll ger snabbt nytta."
      - icon: "fa-duotone fa-solid fa-list-check"
        title: "Användarvänligt"
        body: "TD Test följer samma logik och benämningar som i Maximo, vilket gör testerna enkla att skapa och följa. Tydlig återrapportering visar exakt var felet uppstår."
  - className: "primary-color"
    kicker: "JÄMFÖRELSE"
    titleId: "comparison-heading"
    title: "TD Test vs. webbläsarbaserade tester"
    compare:
      columns:
        - "Funktioner"
        - "Webbläsar-baserade"
        - "TD Test"
      rows:
        - label: "Anpassar sig till ändringar i Maximos gränssnitt"
          values: [false, true]
        - label: "Samma test för olika Maximo-versioner"
          values: [false, true]
        - label: "Test av integrationer"
          values: [false, true]
        - label: "Test av Maximos affärslogik"
          values: [false, true]
        - label: "Inbyggd schemaläggning"
          values: [false, true]
        - label: "Felsökningsdata i rapporten"
          values: [false, true]
        - label: "Test utan påverkan på system eller data"
          values: [false, true]
        - label: "Test av olika webbläsare"
          values: [true, false]
ctaText: "Vill ni veta mer om TD Test eller få en demonstration?"
ctaHref: "mailto:info@totaldigital.se?subject=Jag vill veta mer om TD Test"
ctaLabel: "KONTAKTA OSS"
scrollCue:
  href: "#mojligheter"
  label: "Läs mer om Möjligheter"
  text: "Läs mer"
---

Ni får snabbt svar på den viktigaste frågan: **fungerar Maximo fortfarande som verksamheten förväntar sig?** Om något går fel visar TD Test var i flödet felet uppstod, vad som hände och hur skärmen såg ut. Testerna lämnar databasen oförändrad, vilket gör att de kan upprepas utan att påverka er data.

TD Test stödjer både IBM Maximo 7.x och IBM Maximo Application Suite (MAS), och samma tester kan köras mot båda versionerna. Det gör det enkelt att verifiera att processer och anpassningar fungerar även efter en uppgradering.

Till skillnad från traditionella testverktyg arbetar TD Test direkt mot Maximo, utan att gå via webbläsaren. Det ger snabbare och stabilare tester som inte behöver skrivas om när gränssnittet förändras.
