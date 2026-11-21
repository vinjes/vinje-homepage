# CLAUDE.md: Vorgehen für Agenten in vinje-homepage

## Projekt in Kürze

- Astro 7, Tailwind 4 (Tokens in `src/styles/global.css` unter `@theme`), Preact-Inseln (`@astrojs/preact`), GSAP + ScrollTrigger.
- Produktion: statisch auf GitHub Pages (`.github/workflows/deploy.yml`, `GITHUB_PAGES=true`). Lokal und ohne die Variable: Node-Adapter im Server-Modus.
- Startseite: `src/pages/index.astro`. Die Scroll-Story liegt in `src/components/story/`, gemeinsame Animations-Helfer in `src/scripts/motion.ts`.
- **Maßstab für jede Änderung ist `Soll.md`.** Jedes Kriterium dort hat eine ID und einen Status.

## Feste Regeln

1. Vor jeder Arbeit `Soll.md` lesen. Bei Design-, Layout- oder Animationsarbeit außerdem den Skill `vinje-apple-design` laden, falls verfügbar. Seine Kernregeln stehen auch in Soll.md, Abschnitt 0.
2. Farben, Schriften und Hintergrund nur aus `global.css`. Keine neuen Markenfarben.
3. Animationen nur über `transform` und `opacity`. Scroll-Animationen mit `scrub` oder einmalig. Desktop-Pins nur ab 1024 px, über `mm.add(DESKTOP, …)`. Mobile über `mm.add(MOBILE, …)`. Reduced Motion: keine Query greift, also gilt der statische Zustand. Der statische Zustand muss deshalb ohne JavaScript fertig und überlappungsfrei aussehen.
4. Nicht anfassen: `src/pages/api/*`. Kein neues Paket, wenn ein paar Zeilen reichen.
5. Platzhalter (Kundennamen, Zahlen, Referenzen) mit `<span class="placeholder" title="Platzhalter">` markieren. Nichts erfinden, was als echte Referenz gelesen werden kann.
6. Git: nur auf ausdrückliche Anweisung committen. Commits und PRs **ohne** Claude-Attribution (kein `Co-Authored-By: Claude`, kein Session-Link, kein „Generated with Claude Code“).

## Iterationsschleife (bis Soll.md erfüllt ist)

Jede Runde läuft gleich ab. Eine Runde bearbeitet **ein** offenes Kriterium oder eine eng zusammengehörige Gruppe (z. B. G12 + G13).

1. **Auswählen:** In der Statustabelle (Soll.md, Abschnitt 9) das wichtigste offene Kriterium wählen: ❌ vor ⚠️, Priorität-1-Abschnitt (Second Brain) zuerst. Danach Phasen in Story-Reihenfolge.
2. **Verstehen:** Die betroffenen Dateien lesen. Bei `[Annahme]`-Kriterien, die eine Grundsatzentscheidung verlangen, vorher beim User nachfragen, statt zu raten.
3. **Umsetzen:** Die kleinste vollständige Änderung. Bestehende Helfer aus `motion.ts` und vorhandene Klassen wiederverwenden.
4. **Prüfen im Browser** (siehe „Prüfprotokoll“). Ohne Browser-Nachweis bleibt ein Kriterium offen.
5. **Bauen:** `npm run build` und `GITHUB_PAGES=true npx astro build`. Beide müssen fehlerfrei durchlaufen.
6. **Dokumentieren:** Den Status in Soll.md aktualisieren: ✅ nur mit Nachweis (Viewport, Scroll-Position, gemessener Wert oder Screenshot-Beobachtung), sonst ⚠️ oder ❌ mit kurzem Grund.
7. **Weiter** mit Schritt 1, bis alle Pflicht-Kriterien ✅ sind. Optionale Kriterien (z. B. G18) nur, wenn alles andere erfüllt ist.

**Abbruch und Rückfrage:** Scheitert dasselbe Kriterium in drei Runden hintereinander, oder widersprechen sich zwei Kriterien (z. B. G4 „unscharf wachsen“ gegen L8 „nur transform/opacity“), dann anhalten. Den Konflikt in Soll.md unter dem Kriterium notieren und den User fragen.

**Fertig** ist die Arbeit, wenn alle Pflicht-Kriterien ✅ sind, beide Builds laufen und die Seite einmal komplett auf allen drei Viewports durchgescrollt wurde, ohne Konsolenfehler. Zum Schluss dem User berichten: was geändert wurde, was geprüft wurde und was nicht geprüft werden konnte.

## Prüfprotokoll

**Dev-Server:** `preview_start` mit npm scheitert in diesem Ordner an macOS-Rechten (EPERM). Stattdessen:
```bash
npx astro dev --port 4322
```
Astro 7 startet den Server dabei im Hintergrund. Beenden mit `npx astro dev stop`. In `.claude/launch.json` steht eine Konfiguration mit `url`, an die sich die Vorschau hängt. Ein Server, den der User selbst gestartet hat (meist Port 4321), lädt Config-Änderungen erst nach einem Neustart.

**Viewports:** 1440 × 900, 1024 × 768 und 375 × 812 (`resize_window`). Danach wieder auf `desktop` zurücksetzen.

**Scroll-Positionen anfahren:** Vor programmgesteuertem Scrollen das Smooth-Scrolling ausschalten. Gepinnte Abschnitte über ihre `.pin-spacer` ansteuern (Reihenfolge: 0 Chaos, 1 Ordnung, 2 Use Cases, 3 Second Brain):
```js
document.documentElement.style.scrollBehavior = 'auto';
const sp = document.querySelectorAll('.pin-spacer')[3];
const top = sp.getBoundingClientRect().top + scrollY;
const length = innerHeight * 1.2;           // Pin-Länge aus `end: '+=120%'`
scrollTo(0, top + length * 0.5);            // 50 % Fortschritt
```
Nach dem Scrollen ca. 1,5 s warten (`scrub: 1` glättet nach). Dann Screenshot plus gemessene Werte (`getComputedStyle`, `getBoundingClientRect`).

**Pflichtchecks pro Runde:**
- Screenshots am Anfang, in der Mitte und am Ende jedes betroffenen Pins.
- `read_console_messages` mit `onlyErrors`: muss leer sein.
- `document.documentElement.scrollWidth === innerWidth` (kein horizontales Scrollen).
- Tastatur: einen Knoten bzw. Button fokussieren, Tab, Enter, Escape. Prüfen, dass `:focus-visible` und ein Fokusrahmen sichtbar sind.
- Reduced Motion: Die Vorschau kann das nicht emulieren. Ersatz: `const { mm, ScrollTrigger } = await import('/src/scripts/motion.ts'); mm.revert(); ScrollTrigger.refresh();`. Danach muss jeder Abschnitt fertig und überlappungsfrei dastehen. Im Bericht vermerken, dass keine echte Emulation stattfand.
- Bei einer Insel (`client:visible`): prüfen, dass `astro-island` kein `ssr`-Attribut mehr hat (also hydriert ist).

**Für Second Brain zusätzlich (G8–G17):**
- Den Graph-Container messen: `border-width`, `background-color`, `border-radius`, `overflow` (G8).
- Während einer Fokus-Animation die Knoten-Bounding-Boxes und die Linien-Endpunkte vergleichen: Die Abweichung muss unter 2 px liegen (G15).
- Prüfen, dass kein Element mit Text eine `transform`-Matrix mit Skalierung > 1 hat (G12).
- Blindtest G17: Screenshots des Abschnitts neben Use Cases und Abschluss legen und auf eine sichtbare Kante, einen fremden Stil oder eine abweichende Typo prüfen.
