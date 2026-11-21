# Soll: vinje-Startseite als Scroll-Story

Stand: 21.11.2026. Quelle: Anforderungen von Vincent aus dem Chat und die Regeln des Skills `vinje-apple-design`.
Kennzeichnung: **[Chat]** = wörtlich oder sinngemäß vom User gefordert. **[Skill]** = Regel aus `vinje-apple-design`. **[Annahme]** = abgeleitet; bei Zweifel beim User nachfragen.

Jedes Kriterium hat eine ID. Der Status steht in Abschnitt 9 und wird nach jeder Iteration aktualisiert.

---

## 0. Leitplanken (gelten für alles)

- **L1 [Chat]** Die Gestaltung bleibt: Hintergrund, Farben und Typografie kommen aus `src/styles/global.css`. Nichts davon wird neu erfunden.
  Tokens: `paper #F7F6F2`, `paperDark #EFECE4`, `ink #141414`, `inkMuted #555555`, `silverBorder #E2E0D8`, `silverAccent #C8C6BE`. Schriften: Inter (Text), Plus Jakarta Sans (`font-display`). Body mit `.paper-texture`.
- **L2 [Skill]** Klarheit vor Dekoration, Zurückhaltung, ein Blickfang pro Abschnitt, großzügiger Weißraum (`py-24` bis `py-40` auf Desktop).
- **L3 [Skill]** Überschriften groß, `tracking-tight`. Fließtext ca. 65 Zeichen pro Zeile. Hierarchie über Größe und Gewicht. Kleine Labels dürfen uppercase sein.
- **L4 [Skill]** Ein Radius für Karten (`rounded-2xl`), Buttons `rounded-full`. Genau eine primäre Button-Variante (`bg-ink text-paper`) und eine sekundäre (Umriss).
- **L5 [Skill]** `backdrop-blur` nur für Navigation und Overlays.
- **L6 [Skill]** Bewegung erklärt etwas (Zustand, Richtung, Ursache). Zustandswechsel 200–400 ms, Einblendungen bis 800 ms. Easing `power3.out` bzw. `cubic-bezier(0.22, 1, 0.36, 1)`, nichts Lineares.
- **L7 [Skill]** Scroll-Animationen nur mit `scrub` oder als einmaliges Einblenden. Keine Endlosschleifen im Vordergrund (Ausnahme laut Chat: langsam pulsierende Verbindungen im Graphen, siehe G9).
- **L8 [Chat][Skill]** Animiert wird nur über `transform` und `opacity`, nie über Layout-Eigenschaften.
- **L9 [Skill]** Grafikbibliotheken nur laden, wenn ein Abschnitt sie braucht.

## 1. Seitenaufbau

- **S1 [Chat]** Die Startseite ist eine Scroll-Story. Beim Scrollen sieht der Besucher, welche Probleme vinje löst, und wird über Bewegung und Zoom auf die Lösung gelenkt.
- **S2 [Chat]** Fünf Phasen in dieser Reihenfolge, jeweils ein gepinnter Scroll-Abschnitt (Desktop): Chaos → Ordnung → Use Cases → Second Brain → Abschluss.
- **S3 [Chat]** Bestehende Komponenten wurden geprüft. Es bleiben Header, Hero, Process, About, Contact, Footer, ChatWidget, CalendlyModal und LegalModal. Ersetzt (und gelöscht) wurde `Services.astro`.
- **S4 [Chat]** Die API-Routen `src/pages/api/contact.ts` und `src/pages/api/chat.ts` bleiben unverändert.
- **S5 [Annahme]** Nav-Anker funktionieren: `#leistungen` zeigt auf die Use Cases, `#ansatz` auf Process, `#ueber-uns` auf About, `#kontakt` auf Contact. Ein Sprung dorthin landet nie auf einem leeren Zustand.

## 2. Phase 1: Chaos

- **C1 [Chat]** Mails, Anrufe und Nachrichten erscheinen als Karten und fliegen beim Scrollen herein.
- **C2 [Chat]** Effekt: gestaffeltes Einblenden und leichter Parallax (Ebenen mit unterschiedlicher Geschwindigkeit).
- **C3 [Chat]** Inhalte: Öffnungszeiten, Bestellstatus, offene Fragen, Beschwerden, Terminanfragen, typische Eingangsmails von Hotels, Eventlocations und Shops. Allgemein gehalten, keine Namen.
- **C4 [Annahme]** Die Überschrift ist beim Hereinscrollen schon sichtbar (keine leere Fläche vor dem Pin).
- **C5 [Annahme]** Karten verdecken die Überschrift nicht, und keine Karte wird vom Sticky-Header oder vom Viewport-Rand abgeschnitten (1024, 1280, 1440 px).

## 3. Phase 2: Ordnung

- **O1 [Chat]** Alle Karten laufen in eine Zusammenfassung zusammen, z. B. „14 Mails · 3 Anrufe · 2 Termine → 1 Überblick“.
- **O2 [Chat]** Effekt: Text-Enthüllung, die Zahlen zählen hoch.
- **O3 [Chat]** Die Zahlen sind als Beispiel gekennzeichnet, nicht als echte Kennzahl.

## 4. Phase 3: Use Cases

- **U1 [Chat]** 3 bis 4 Panels, jeweils Problem links und Lösung rechts.
- **U2 [Chat]** Inhalte:
  1. Fehlanrufe: Anrufer, die nicht zu dir gehören (z. B. Pizza-Bestellungen), werden erkannt und freundlich weitergeleitet oder abgewiesen.
  2. Routine-Mails: Wiederkehrende Kundenanfragen werden vorsortiert und beantwortet, bevor jemand sie liest.
  3. Lange Telefonate: Standardanfragen laufen über den Voice-Assistenten, das Team bekommt nur die Fälle, die es braucht.
  4. Vorhersagen statt Bauchgefühl: Absatz und Bestand werden mit Forecasting-Modellen geplant.
- **U3 [Chat]** Pro Panel nur ein Aufmerksamkeitseffekt (Einblenden beim Erreichen).
- **U4 [Chat]** Mobile: Use Cases untereinander.

## 5. Phase 4: Second Brain (Netzwerk-Graph). Priorität 1, aktuell nicht erfüllt

**Feedback des Users (21.11.2026):** „Mir gefällt dieses Obsidian-Netzwerk nicht. Es soll kein Bild sein, sondern wirklich eingebaut wirken.“
Der aktuelle Stand (Knoten in einer umrandeten weißen Box, schwebende Mini-Labels, Zoom durch Vergrößern der ganzen Fläche) wirkt wie ein eingefügter Screenshot eines Graph-Tools. Er muss ersetzt werden.

### Grundanforderungen aus dem ursprünglichen Auftrag
- **G1 [Chat]** Ein verknüpftes Netzwerk aus Knoten, die mit Text gefüllt sind (Mails, Unternehmen, Personen, Projekte) und durch Linien verbunden sind.
- **G2 [Chat]** Knoten-Begriffe: „Mail“, „Unternehmen“, „Person“, „Projekt“, „Termin“, „Angebot“, „Mitarbeiter“, „Steuern“.
- **G3 [Chat]** Look: futuristisch, KI-artig, aber ruhig. Feine Linien, leichtes Leuchten an Knoten, langsam pulsierende Verbindungen.
- **G4 [Chat]** Zoom beim Scrollen: Der Graph startet klein und unscharf und wächst auf Vollbild.
- **G5 [Chat]** Zoom auf Knoten: Klick oder Scroll-Position zoomt auf einen Knoten, daneben erscheint sein Detailtext.
- **G6 [Chat]** Hover: Der Knoten leuchtet auf, seine Verbindungen werden hervorgehoben.
- **G7 [Chat][Skill]** Umsetzung als Astro-Insel mit `client:visible`, Positionen vorab berechnet (oder d3-force).

### „Eingebaut statt Bild“: Präzisierung [Annahme, aus dem Feedback abgeleitet]
- **G8 Kein Kasten.** Um den Graphen gibt es keinen Rahmen, keine eigene Hintergrundfläche und keinen abgerundeten Container. Die Knoten liegen direkt auf dem Seitenhintergrund (`paper` + `.paper-texture`).
  *Test:* Der äußerste Graph-Container hat `border-width: 0`, einen transparenten Hintergrund und kein `overflow: hidden` mit Radius.
- **G9 Teil des Layouts.** Überschrift, Netz und Detailtext teilen dasselbe Raster (`max-w-6xl`, gleiche Gutter wie die Nachbarabschnitte). Das Netz darf bis an den Viewport-Rand laufen. Es gibt kein „Bild links, Text rechts“ mit harter Kante.
- **G10 Knoten sprechen die Sprache der Seite.** Knoten sind kleine Karten oder Chips im Stil der Chaos-Karten (`rounded-2xl` bzw. `rounded-full`, `border-silverBorder`, `bg-white/90`, Mono-Label uppercase plus Inhaltszeile). Keine Punkte mit danebenstehenden Labels, keine Graph-Tool-Optik.
- **G11 Keine Deko-Knoten.** Jeder sichtbare Knoten trägt Inhalt und ist bedienbar. Keine schwebenden Mini-Labels ohne Funktion (die heutigen „Satelliten“ entfallen oder werden echte Knoten).
- **G12 Text bleibt scharf.** Weder der ganze Graph noch Text werden über `scale(1)` hinaus vergrößert. Der Fokus auf einen Knoten entsteht durch Neuanordnung (`translate`), nicht durch Hineinzoomen in eine Fläche.
- **G13 Fokus als Layout-Wechsel.** Klick oder Enter auf einen Knoten: Der Knoten wandert an eine Fokusposition und klappt zur Detailkarte auf. Der Detailtext steht direkt daneben bzw. im Knoten, nicht in einer fernen Seitenspalte. Die Nachbarn rücken heran, die übrigen Knoten treten zurück (Opacity). Animiert per FLIP (nur `transform`/`opacity`), 300–600 ms, `power3.out`. „Zur Übersicht“ und Escape kehren um.
- **G14 Aufbau statt Skalierung (erfüllt G4 eingebaut).** Beim Scrollen startet das Netz kompakt um den Knoten „Unternehmen“: Knoten dicht beieinander, transparent, eine unscharfe Kopie wird überblendet (Blur ist statisch, ausgeblendet wird per Opacity). Mit dem Scrollen wandern die Knoten einzeln (`translate`, gestaffelt) auf ihre Positionen über die volle Breite. Es wird kein fertiges Bild hochskaliert.
- **G15 Linien hängen an den Knoten.** Bei jeder Bewegung (Aufbau, Fokus, Rückkehr) bleiben die Linien mit den Knoten verbunden. Umsetzungshinweis: Linien als 1-px-Elemente, deren Lage nur über `transform` (translate + rotate + scaleX) aus den Knotenpositionen berechnet wird. Das hält L8 ein.
- **G16 Ruhiges Leuchten.** Hover und Fokus zeigen einen weichen Schein (Opacity eines Radial-Verlaufs in `silverAccent`), und die verbundenen Linien wechseln auf `ink`. Nicht betroffene Knoten gehen auf ca. 35 % Opacity. Das Pulsieren der Linien läuft nur über Opacity, langsam (≥ 6 s), dezent.
- **G17 Blindtest.** Auf einem Screenshot des Abschnitts (1440 × 900 und 1024 × 768) ist keine Grenze zwischen „Seite“ und „Grafik“ erkennbar. Typo, Abstände und Farben entsprechen den Nachbarabschnitten Use Cases und Abschluss.
- **G18 Optional [Chat: „oder Scroll-Position“].** Nach dem Aufbau kann das Weiterscrollen nacheinander 2–3 Knoten fokussieren. Pflicht ist nur der Klick-Fokus.

### Barrierefreiheit und Mobile des Graphen
- **G19 [Chat]** Mobile: vereinfacht (≤ 6 Knoten, kleinere Labels), kein Pin, Zoom-Effekte nur dezent. Der Detailtext erscheint unter dem Knoten.
- **G20 [Chat]** Reduced Motion: statische Grafik plus sichtbare Textliste daneben.
- **G21 [Chat]** Alle Knoten per Tab erreichbar, Enter/Space wählen aus, Escape schließt, der Fokusrahmen ist sichtbar.
- **G22 [Chat]** Der gleiche Inhalt steht zusätzlich als normaler HTML-Text für Screenreader bereit.

## 6. Phase 5: Abschluss

- **A1 [Chat]** Call-to-Action mit der bestehenden Calendly-Komponente (`CalendlyModal.astro`, Auslöser `data-calendly-open`).
- **A2 [Chat]** Effekt: dezenter Puls am Button, sonst nichts. Nach Skill-Regel L7 begrenzt (3×, startet bei Sichtbarkeit).

## 7. Technik, Barrierefreiheit, Mobile (seitenweit)

- **T1 [Chat]** GSAP + ScrollTrigger. Pinning und Phasen über ScrollTrigger (`src/scripts/motion.ts`: `mm`, `DESKTOP`, `MOBILE`, `revealOnce`, `countUp`).
- **T2 [Chat]** Alle Story-Inhalte sind zusätzlich als normaler HTML-Text für Screenreader lesbar.
- **T3 [Chat]** `prefers-reduced-motion: reduce`: keine Animation, direkt der fertige Zustand, nirgends überlappende Inhalte.
- **T4 [Chat][Skill]** Mobile (< 1024 px): keine gepinnten Abschnitte, nur einmaliges Einblenden, kein horizontales Scrollen.
- **T5 [Chat]** Tastatur: alle klickbaren Elemente erreichbar, sichtbarer Fokusrahmen.
- **T6 [Chat]** `npm run build` läuft ohne Fehler, auch mit `GITHUB_PAGES=true` (Deploy über GitHub Pages).
- **T7 [Annahme]** Keine Konsolenfehler beim Durchscrollen der ganzen Seite.

## 8. Inhalte und Git

- **I1 [Chat]** Platzhalter für Kundennamen, Zahlen und Referenzen sind klar markiert („Ihr Unternehmen“, Klasse `.placeholder`).
- **I2 [Chat]** Keine erfundenen Kundennamen oder Kennzahlen als echte Referenzen.
- **I3 [Annahme]** Ansprache wie auf der restlichen Seite: „ihr/euch“.
- **V1 [Chat]** Commits und PRs ohne Claude-Attribution: kein „Co-Authored-By: Claude“, kein Session-Link, kein „Generated with Claude Code“.

## 9. Status

| ID | Status | Nachweis / Notiz |
|---|---|---|
| L1–L9 | ✅ | Story nutzt nur Tokens aus global.css; Animationen transform/opacity |
| S1–S4 | ✅ | index.astro; API-Routen unverändert |
| S5 | ✅ | `#leistungen` zeigt Panel 1 (Review-Fix) |
| C1–C5 | ✅ bei 1024 px | 1280/1440 px noch nicht geprüft |
| O1–O3 | ✅ | |
| U1–U4 | ✅ | |
| G1–G3, G6, G7 | ✅ | Neubau (Runde 1). Hover 1440 px: Glow-Opacity 1, 4 Linien `rgb(20,20,20)`, Nicht-Nachbarn 0.35; Insel ohne `ssr`-Attribut |
| G4 | ⚠️ | vorübergehend nur Opacity-Einblendung im Pin (Pin-Anfang leer), wird mit G14 ersetzt |
| G5 | ✅ | Klick/Enter → Fokus-Layout mit Detailkarte (siehe G13) |
| G8 | ✅ | `.brain-graph` und `.brain-stage`: border 0px, bg transparent, radius 0px, overflow visible (1440 px) |
| G9 | ✅ | Kopf und Netz im selben `max-w-6xl`-Container; Bühne 1088 px (1440) / 960 px (1024) breit |
| G10, G11 | ✅ | Knoten = Karten im Chaos-Stil (Mono-Label + Inhaltszeile), Satelliten gelöscht |
| G12 | ✅ | kein Element mit Text hat eine Skalierung > 1 (gemessen im Fokus-Zustand); Karte blendet von `scale 0.97` auf 1 |
| G13 | ✅ | Fokus: Knoten wandert in die Mitte, Karte klappt dort auf, Nachbarn legen sich dicht um die Karte, Rest 0.35. 500 ms, `power3.out`, nur transform/opacity. Escape/„Zur Übersicht“ kehren um, Fokus zurück auf den Knoten. Alle 8 Fokus-Zustände ohne Überlappung bei 1440, 1024 und 375 px |
| G14 | ❌ | nächste Runde: Aufbau aus kompaktem Netz um „Unternehmen“ (Positions-Engine in `SecondBrainGraph.tsx` ist dafür vorbereitet) |
| G15 | ✅ | Linien = 1-px-Divs, transform aus denselben Positionen wie die Knoten. Max. Abweichung Endpunkt↔Knotenmitte während der Fokus-Animation: 0,001 px (19 Frames). Ohne JS: CSS `hypot()/atan2()`, ≤ 1 px |
| G16 | ✅ | siehe G1–G3; Pulsieren 7 s nur Opacity |
| G17 | ❌ | Blindtest noch nicht gemacht (nach G14) |
| G18 | – | optional |
| G19–G22 | ⚠️ | Neubau: Mobile 6 Knoten, kein Pin, Karte oben mit Detailtext; Tab/Enter/Escape mit sichtbarem Fokusrahmen geprüft; `mm.revert()`: Netz steht fertig. Vollständige Prüfung in eigener Runde |
| A1–A2 | ✅ | Modal öffnet, Puls 3× |
| T1–T7 | ✅ | T3 nur über `mm.revert()` geprüft, echte Emulation fehlt |
| I1–I3, V1 | ✅ | |

## 10. Außerhalb der Soll (Hinweise aus dem Audit, nicht Teil dieser Iteration)

Google Fonts extern geladen (DSGVO), Impressum ohne Anschrift, Themen-Erkennung im Chat fehlerhaft, Nicht-EU-LLM-Fallbacks, doppelte Chat-Ersatzantworten, kein Timeout/Rate-Limit in den API-Routen, Hero-Canvas läuft auch außerhalb des Sichtbereichs weiter. Nur auf ausdrücklichen Wunsch bearbeiten.
