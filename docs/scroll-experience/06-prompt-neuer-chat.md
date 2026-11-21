# Prompt für einen neuen Chat: Update 3 fortsetzen (Punkte 2, 4, 3)

Stand: 2026-11-21 · Branch `higgsfield` · Basis Commit `c4bb3a2`, darauf **nicht committete** Änderungen aus Update 3 (Punkt 1). Nichts committet, nichts gepusht.

## Zuerst lesen

1. `docs/scroll-experience/04-prompt-neuer-chat.md`: der ursprüngliche Auftrag. Alle harten Regeln, technischen Vorgaben, die Reihenfolge, die Browser-Prüfung (Schritt 4) und die Doku (Schritt 5) gelten unverändert.
2. `docs/scroll-experience/05-plan-update-3.md`: Plan mit Stationstabelle (Journey und unterer Teil), Graph-Welt-Technik und Dopplungsliste 1–13.
3. `docs/scroll-experience/02-uebergabe-neuer-chat.md`, Abschnitt „Update 3 (Zwischenstand …)“.
4. `docs/scroll-experience/01-bestandsaufnahme-und-creative-direction.md` §4: Aussagen, die mindestens einmal erhalten bleiben müssen.

## Was fertig ist (Punkt 1, im Browser geprüft)

- `src/scroll/timeline.ts`: zentrale Liste `TIMELINE` (Station/Übergang, Scroll-Länge Desktop/Mobil). Daraus `P` (p-Bereiche), `at(id, t)`, `local(id, p)`, `span(id)`, `easeSegment(i, t)`. Stationen bekommen ein Viertel des p-Tempos (`STATION_SPEED = 0.25`). Übergänge bremsen per Hermite-Kurve zu Stationen ab (Dämpfung statt Snap).
- `src/components/Journey.astro`: rendert die Scroll-Strecke aus `TIMELINE` (`data-seg`, CSS-Variablen `--seg-d`/`--seg-m`). Szenen hängen per `data-scene="<station>"` an Stationen; `data-line` schaltet Zeile für Zeile frei.
- `src/scroll/journey.ts`: misst die `data-seg`-Blöcke (`measure`/`computeP`), Glättung `1 - exp(-7·dt)`. Alle Zeiten kommen aus `at()`/`local()` (Objekt `T`, Kamera `POSES` je Station plus `VIAS` in Übergängen, `buildKeyframes()`). Ausgeblendete Szenen sind nicht klickbar und haben `tabIndex = -1`.
- `scripts/check-timeline.ts`: Selbsttest, `node scripts/check-timeline.ts`.
- `npm run build` läuft (bekannte Chunk-Size-Warnung war schon vorher da).

## Entscheidungen des Nutzers

- **Dopplungen 1–13 aus 05 sind vollständig freigegeben** (2026-11-21, „Alle freigeben“). Nicht erneut fragen. Texte dürfen jetzt genau wie in der Tabelle entfernt oder zusammengelegt werden.
- Offene Entscheidungen 2–5 in 05 sind noch nicht beantwortet. Mit den Vorschlägen aus dem Plan weiterarbeiten (nur Dämpfung, kein JS-Einrasten; Detail-Stationen nur mit Labels, ohne Fließtext; unterer Teil im normalen Fluss über der Bühne; Journey ca. 1.250vh Desktop) und sie im Abschlussbericht als offen nennen.

## Was jetzt zu tun ist

Reihenfolge laut 04: Punkt 2 → Punkt 4 → Punkt 3, danach Prüfung und Doku.

### Punkt 2: oberste Ansicht

- `src/components/Hero.astro` behält nur: „Vincent & Jesse“ (kleine Zeile über der H1), H1, Subline, Button „Erstgespräch vereinbaren“ (`data-calendly-open`).
- Entfällt im Hero: Logo-SVG, Button „Leistungen entdecken“, Vertrauensleiste (3 Punkte), Pipeline-Karte samt Tab-Script.
- **Vor dem Löschen** die Texte der Tabs „Machine Learning“ und „Daten & BI“ aus `pipelineData` im Script von Hero.astro sichern (Input-Titel und -Beschreibung, Engine-Titel und -Beschreibung, beide Ergebnisse mit Label). Sie kommen als Ketten an die Leistungs-Stationen (Dopplung 9). Die Badges entfallen.
- Szene `sort` in Journey.astro: Zeile „backmail, backcall & Multi-Agenten“ ergänzen. Szene `result`: beide CTAs entfernen, dafür Beschriftung „Produktives System / Kundensystem“ mit „backmail – KI-E-Mail-Client & Auto-Antworten“ und „backcall – KI-Voice-Assistant für Telefonanrufe“.
- Die übrigen Zeilen der Dopplungstabelle (About-Karte, Calendly-Button in der Kontakt-Box, EU-Box-Titel, 2. Satz im Process-Intro, Services-Intro) gehören zu Punkt 3, dürfen aber schon jetzt erledigt werden.
- Hero wird Station in der Bühne. Heute ist `hero` in `TIMELINE` ein `flow`-Segment: Länge = Höhe des Hero-Inhalts, der mit `margin-top: -100vh` über der sticky Stage liegt; mobil sind das ca. 1,9 Bildschirmhöhen. Ziel laut Plan: Station `hero` 40/25 vh, danach Übergang 80/50 vh, mobil in einer Bildschirmhöhe. vinje-Stern als Partikel in der 3D-Szene (Form aus dem Logo-SVG), zerfällt im Übergang in die Umschläge. H1 und Subline reagieren auf den ersten Scroll.
- Achtung: Der Selbsttest verlangt heute mindestens 100vh Halt je Station. Die Hero-Station (40vh laut Plan) braucht dort eine begründete Ausnahme.

### Punkt 4: Graph-Welt und Detail-Zooms

Wie in 05 („Ziel-Stationen“ und „Graph-Welt (Technik)“) und 04 Punkt 4: Stationen `zoom-email` und `zoom-project` mit Unterknoten-Labels (illustrativ), Effekte nur in Übergängen (Rolle, Dolly-Zoom, 90°-Kippen, alle Kanten leuchten auf), äußere Welt mit mehreren tausend Knoten komplett im Vertex-Shader (Uniform `uP`), CPU nur für den inneren Graphen. Neue Stationen nur in `TIMELINE` eintragen, keine festen p-Zahlen in journey.ts.

### Punkt 3: unterer Teil über laufender Bühne

Wie in 05 (Stationen 9–15) und 04 Punkt 3. Heute umschließt `<Journey>` in `src/pages/index.astro` nur den Hero. Services, Process, About und Contact stehen danach außerhalb der Section. Die Stage ist nur innerhalb der Journey sticky, und der IntersectionObserver stoppt die Render-Schleife, sobald die Section aus dem Bild ist. Für Punkt 3 muss die Bühne bis zum Seitenende stehen bleiben, mit einem WebGL-Kontext. Formular, Calendly-Modal, Chat-Widget, Rechtliches und Anker (`#leistungen`, `#ansatz`, `#ueber-uns`, `#kontakt`) bleiben voll bedienbar und per Tab erreichbar.

## Hinweise aus dem bisherigen Chat

- CSS-Scroll-Snap nicht erneut versuchen: Chrome hält Pfeiltasten an den Kanten von Snap-Flächen fest (im Browser gemessen). Die Dämpfung steckt in `easeSegment`.
- Nach jeder Änderung an `TIMELINE`: `node scripts/check-timeline.ts` (Node 24 führt TypeScript direkt aus).
- HMR zeigt bei Zwischenständen Fehler in der Konsole. Nach vollem Reload prüfen.
- Dev-Server per Shell starten (der Start über die Preview scheitert im Documents-Ordner mit EPERM). Danach das Pane über `/Users/vincentgrueneklee/Documents/vinje/.claude/launch.json` an `http://localhost:4321` hängen.
- Reduced Motion testen: `matchMedia` überschreiben, die Section per `cloneNode` neu einhängen und `(await import('/src/scroll/journey.ts')).mountJourney(clone)` aufrufen.
- Die Testumgebung rendert mit etwa 2 Bildern pro Sekunde, und das Test-Werkzeug sendet Bild ab und Leertaste nicht. Das Scroll-Gefühl offen als ungeprüft nennen und den Nutzer bitten, auf echter Hardware zu testen (Trackpad, Mausrad, Touch).

## Regeln (Kurzfassung, vollständig in 04)

- Keine Commits und keine Pushes, ohne dass der Nutzer es ausdrücklich verlangt.
- Die Navigation bleibt, wie sie ist.
- Farben und Schriften aus `global.css`, keine neuen Farbakzente. Keine erfundenen Kunden oder Zahlen, Graph-Labels nur illustrativ.
- Keine Higgsfield-Aufrufe, keine Kostenschätzungen.
- Alles hängt an p und läuft rückwärts identisch. Zeitbasierte Bewegung nur als Ambient.
- Keine neue Abhängigkeit ohne klaren Grund (kein GSAP).

## Abschluss

- Den Zwischenstand-Abschnitt „Update 3“ in `02-uebergabe-neuer-chat.md` durch den vollständigen ersetzen.
- Abschlussbericht wie in 04 Schritt 5: was wo läuft, finale Stationstabelle, zusammengelegte Dopplungen und wo jede Aussage aus Dok 01 §4 jetzt steht, was nicht geprüft werden konnte, offene Entscheidungen.
