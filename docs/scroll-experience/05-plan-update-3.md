# Plan Update 3: Stationen, oberste Ansicht, Graph-Welt, unterer Teil

Stand: 2026-11-21 · Branch `higgsfield` · Auftrag: `04-prompt-neuer-chat.md`

## Schon umgesetzt (Punkt 1, ohne Textänderungen)

- **Zentrale Zeitachse** `src/scroll/timeline.ts`: Liste `TIMELINE` mit Stationen und Übergängen (Name, Scroll-Länge Desktop/Mobil). Daraus folgen p-Bereiche (`P`), Hilfen `at(id, t)` / `local(id, p)`, die Scroll-Strecke in `Journey.astro`, die Overlay-Zeiten und die Kamera-Stationen. Spätere scroll-gesteuerte Videos lesen dieselben Werte.
- **Plateaus:** Stationen bekommen ein Viertel des p-Tempos (`STATION_SPEED = 0.25`). Kamera steht an Stationen still, Effekte liegen in den Übergängen.
- **Dämpfung statt Snap:** Übergänge bremsen zu jeder Station weich ab (Hermite-Kurve, Tempo an der Kante = Stationstempo). CSS-Scroll-Snap wurde getestet und verworfen: Chrome hält Pfeil-hoch am Stationsanfang und Pfeil-runter an Stationsenden fest (gemessen im Browser). Wheel, Touch, Tastatur, Scrollbar und Anker bleiben unberührt.
- **Text schaltet frei:** `data-line` in einer Szene erscheint Zeile für Zeile über die erste Hälfte der Station; Workflow-Schritte leuchten auf, wenn der Pfad den Knoten erreicht.
- **Glättung bildratenunabhängig:** `1 - exp(-7·dt)`.
- **Länge:** Journey Desktop ca. 965vh statt 535vh, mobil ca. 790vh statt 670vh (mobil zählt der Hero noch mit 1,9 Höhen; das löst Punkt 2).
- Ausgeblendete Szenen sind nicht mehr per Tab erreichbar.
- Selbsttest: `node scripts/check-timeline.ts`.

## Ziel-Stationen (alle Punkte)

Haltestrecke = Scroll-Strecke, in der das Bild steht. Übergang = Strecke bis zur nächsten Station. Werte in vh, Desktop / Mobil.

### Journey (Text als Overlay in der Bühne)

| # | Station | Inhalt | Halt D / M | Übergang danach D / M | Effekt im Übergang |
|---|---|---|---|---|---|
| 1 | `hero` | vinje-Stern aus Partikeln, H1, Subline, ein CTA. Gepinnt, passt mobil in eine Höhe | 40 / 25 | 80 / 50 | Stern zerfällt in Partikel, die zu E-Mails werden. H1 zoomt in die Tiefe, Subline gleitet seitlich weg (Ebenenwechsel). Dolly-Zoom |
| 2 | `flood` | 01 Informationsflut (Pipeline-Stufe Input) | 100 / 70 | 60 / 40 | E-Mails werden in vier Fächer gezogen, Kamera rollt kurz um die Blickachse |
| 3 | `sort` | 02 vinje Engine, vier Fächer, Zeile „backmail, backcall & Multi-Agenten“ | 100 / 70 | 80 / 50 | Hook: Szene kippt um 90°, die Fächer klappen in die Tiefe, E-Mails stürzen in den Graphen. Kamera taucht ein |
| 4 | `graph` | 03 Knowledge Graph, Kamera steht im Inneren, Cluster-Labels | 100 / 70 | 50 / 35 | Hook: alle Kanten leuchten einmal auf, Kamera zieht zurück und zoomt auf einen Email-Knoten |
| 5 | `zoom-email` | Detail Email: Unterknoten Absender, Betreff, Kategorie, verknüpfter Kunde, Projekt | 100 / 60 | 50 / 35 | Herauszoom mit Rolle, Welt dreht sich 60° |
| 6 | `workflow` | 04 Eine Anfrage, sechs Schritte (Schritt für Schritt) | 140 / 100 | 50 / 35 | Pfad bleibt als Lichtspur, Kamera schwenkt zu einem Project-Knoten |
| 7 | `zoom-project` | Detail Project: Kunde, Angebot, Termin, Aufgabe, Dokument, Rechnung | 100 / 60 | 100 / 60 | Großer Herauszoom (umgekehrter Dolly-Zoom). Der innere Graph schrumpft zu einem Cluster in einer Welt aus mehreren tausend Knoten |
| 8 | `result` | 05 Ergebnis, Welt im Ganzen, Labels „Produktives System“: backmail, backcall | 100 / 70 | 80 / 50 | Kamera fliegt auf drei Bausteine zu (Leistungen) |

Summe Journey: Desktop ca. 1.250vh (2,3-mal so lang wie vorher, 535vh), mobil ca. 830vh (vorher 670vh). Mehr als doppelt, weil zwei Detail-Stationen dazukommen und jede Station mindestens 100vh hält. Kürzer ginge mit 80vh für die beiden Detail-Stationen (dann ca. 1.210vh).

### Unterer Teil (Inhalt im normalen Fluss über der weiterlaufenden Bühne)

Formulare, Calendly (640px hoch) und die langen Texte von Über uns passen mobil nicht in eine gepinnte Bildschirmhöhe. Deshalb scrollen diese Inhalte nativ über der sticky Bühne. Jeder Block ist ein Segment der Zeitachse (Länge = Inhaltshöhe, Desktop mit Mindesthöhe), die Kamera hängt an seinem Fortschritt. Ein WebGL-Kontext, Tab-Reihenfolge, Anker und Formulare funktionieren wie gewohnt. Hinter Text liegt ein ruhiger Papier-Schleier.

| # | Station | Inhalt | Länge D | Bild |
|---|---|---|---|---|
| 9 | `services-ki` (`#leistungen`) | Leistungen-Kopf, 01 KI-Automatisierung | mind. 110 | Cluster 1 im Fokus |
| 10 | `services-ml` | 02 Machine Learning + Kette aus dem Pipeline-Tab ML | mind. 110 | Kamera wechselt mit Rolle zu Cluster 2, Kette als Beschriftung (Input → Engine → Ergebnis) |
| 11 | `services-bi` | 03 Datenanalyse & BI + Kette aus dem Tab Daten & BI | mind. 110 | Cluster 3, danach Herauszoom auf alle drei |
| 12 | `stack-eu` | Kern-Stack und DSGVO/EU (zusammengelegt) | mind. 90 | Cluster-Gruppen ruhig |
| 13 | `process` (`#ansatz`) | Von der Idee zum System, Schritte 01–04, Preismodell | mind. 160 | Pfad zeichnet sich, jeder Schritt ein Knoten |
| 14 | `about` (`#ueber-uns`) | Zitat, Text, Werte, Vincent & Jesse | mind. 120 | Zwei verbundene Knoten, die Fotos tauchen aus dem Netz auf |
| 15 | `contact` (`#kontakt`) | Formular / Calendly, direkter Kontakt | Inhalt | Kamera fährt auf einen zentralen Knoten, Netz beruhigt sich |

### Graph-Welt (Technik)

- Hierarchie Knoten → Cluster → Cluster-Gruppen → Welt. Äußere Welt Desktop ca. 4.000 Knoten, mobil ca. 1.200.
- Äußere Welt komplett im Vertex-Shader: Attribute Start, Ziel, Reveal, Typ; Uniform `uP`. Keine Positionsrechnung pro Frame in JS.
- Die CPU rechnet nur den inneren Detail-Graphen (heutige 520 / 200 Knoten).
- Knotentypen über Form, Ring und Größe (Ink und Silber, keine neuen Farben). Feine Datenströme und Labels nur in Kameranähe.
- Detail-Zooms: eigene kleine Szene je Knotentyp (Unterknoten + HTML-Labels), wird in der Station eingeblendet.

## Dopplungen: freigegeben

Der Nutzer hat am 2026-11-21 alle 13 Zeilen wie vorgeschlagen freigegeben („Alle freigeben“).

| # | Aussage | Steht heute | Bleibt in | Entfällt in |
|---|---|---|---|---|
| 1 | vinje-Logo | Header, Hero (groß), About-Karte, Footer | Header, Footer. Im Hero wird der Stern zur Partikel-Figur in der 3D-Szene | Logo-SVG im Hero, Logo in der About-Karte |
| 2 | „Vincent & Jesse“ | Hero, About-Karte, Footer | Hero (kleine Zeile über der H1), Footer, Namen in Über uns | About-Karte |
| 3 | „Daten. Insights. Automatisierung.“ | H1, About-Karte, Footer | H1, Footer | About-Karte |
| 4 | CTA „Erstgespräch vereinbaren“ | Hero, Szene 5 | Hero (einziger CTA dort) | Szene 5 |
| 5 | CTA „Leistungen entdecken“ | Hero, Szene 5 | – (Leistungen folgen direkt, Nav-Link bleibt) | Hero, Szene 5 |
| 6 | „Projekt anfragen“ | Header, Kontakt-Tab | beide (Header bleibt laut Vorgabe, Tab benennt den Formularmodus) | – |
| 7 | Calendly | Kontakt-Box „20-Min-Erstgespräch via Calendly“, Kontakt-Tab „Termin direkt buchen“ | Tab | Button in der Kontakt-Box (gleiche Funktion an gleicher Stelle) |
| 8 | Pipeline-Karte, Tab KI-Automation | Hero-Karte; Input = Szene 1, Engine ≈ Szene 2 | Szene 1 als Stufe „Input“, Szene 2 als „vinje Engine“ mit Zeile „backmail, backcall & Multi-Agenten“, Szene 5 mit Beschriftung „Produktives System / Kundensystem: backmail – KI-E-Mail-Client & Auto-Antworten, backcall – KI-Voice-Assistant für Telefonanrufe“ | Karte. „Wiederkehrende Kommunikation im Mittelstand & E-Commerce“ steckt in der Hero-Subline |
| 9 | Pipeline-Karte, Tabs Machine Learning und Daten & BI | Hero-Karte | vollständig als Ketten an den Leistungs-Stationen 10 und 11 (Input + Beschreibung, Engine + Beschreibung, beide Ergebnisse) | Karte. Badges wie „PYTHON & AI“, „EU-CORE“ sind Bedienelemente, keine Aussagen |
| 10 | DSGVO / EU | Hero „100 % DSGVO-konform (EU-Hoster & Mistral LLMs)“, Stack-Chip „100 % EU-Hosting“, Box „Konsequent DSGVO-konform: Europäische Hoster & Mistral LLMs“ | Station `stack-eu`: Box-Titel wird „100 % DSGVO-konform: Europäische Hoster & Mistral LLMs“, Chip bleibt. Szene 2 bleibt als Erzählung | Hero-Vertrauenspunkt |
| 11 | Expertise statt Hype | Hero „Fundierte Data-Science-Expertise statt Hype“, About-Wert „Echte Expertise“, Services-H2 | About, Services-H2 | Hero-Vertrauenspunkt |
| 12 | Festpreis | Hero „Festpreis-Projekte ohne Stundensatz“, Process-Intro (2. Satz), Preismodell | Preismodell „Projekt-Festpreis + monatliche Betreuung statt Stundensatz“ | Hero-Vertrauenspunkt, 2. Satz im Process-Intro |
| 13 | Zielgruppe und Angebot | Hero-Subline, Services-Intro („Wir unterstützen den Mittelstand und E-Commerce …“) | Hero-Subline | Services-Intro |

Damit bleibt im Hero: „Vincent & Jesse“, H1, Subline, „Erstgespräch vereinbaren“. Die 3D-Szene hat rechts und in der Mitte freie Fläche.

## Offene Entscheidungen

1. ~~Dopplungen 1–13 freigeben oder einzeln ändern.~~ Erledigt: alle freigegeben (2026-11-21).
2. Einrasten: Reicht die Dämpfung, oder zusätzlich ein JS-Einrasten nur für Mausrad/Trackpad (nur in Scrollrichtung, nie bei Tastatur)? Erst auf echter Hardware entscheiden.
3. Detail-Stationen (Email, Project) ohne Fließtext, nur mit Labels in der Szene? Neue Aussagen sind dort nicht vorgesehen.
4. Unterer Teil im normalen Fluss über der Bühne (statt eingeblendeter Overlays). Grund: Formulare, Calendly, mobile Höhen, Tab-Reihenfolge.
5. Länge der Journey: Desktop ca. 1.250vh, oder Detail-Stationen auf 80vh kürzen.
