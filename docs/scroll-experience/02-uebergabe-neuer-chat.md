# Übergabe: VINJE Scroll Experience (für neuen Chat)

Dieses Dokument reicht, um in einem neuen Chat (anderes Modell) ohne Vorwissen weiterzumachen.

## Wo wir stehen
- **Phase 1 (Bestandsaufnahme + Creative Direction): erledigt.** Ergebnis steht in `docs/scroll-experience/01-bestandsaufnahme-und-creative-direction.md`. Lies diese Datei zuerst.
- **Phase 2 (Umsetzung): nicht begonnen.** Es wurde noch kein Code geschrieben, keine Abhängigkeit installiert.
- Repo: `/Users/vincentgrueneklee/Documents/vinje/vinje-homepage`, Branch `higgsfield` (ohne eigene Commits gegenüber `main`).

## Auftrag (Kurzfassung)
VINJE (Vincent & Jesse) ist eine Astro-Homepage für KI-Automatisierung im Mittelstand. Die bestehende Seite soll zu einer **immersiven Scroll-Experience** umgebaut werden, mit einem **3D-Knowledge-Graph** als Herzstück. Design, Farben, Schriften und Texte bleiben. Nur Inszenierung, Kamera und Animation ändern sich.

Die vollständige Originalvorgabe liegt nicht als Datei vor. Sie stand im Prompt „VINJE – Immersive Scroll Experience“. Die wichtigsten Punkte sind in Datei 01 übernommen.

## Harte Regeln
1. **Design erhalten:** `paper #F7F6F2`, `ink #141414`, `inkMuted #555555`, `silverBorder #E2E0D8`, Silber-Verläufe, Inter und Plus Jakarta Sans. Keine neue Markenidentität.
2. **Texte erhalten:** Keine neuen Versprechen, keine erfundenen Kunden oder Zahlen. Labels im Graphen sind nur illustrative Beispiele.
3. **Scroll steuert alles:** Animationen hängen am Scroll-Fortschritt, damit sie rückwärts sauber laufen. Keine einmaligen Fade-ins.
4. **Graph ist echtes 3D:** kein vorgerendertes Bild. Vorberechnetes Layout, `InstancedMesh`, Linien mit Datenstrom-Shader.
5. **Responsive und `prefers-reduced-motion`:** Desktop ist Hauptziel. Mobil reduziert. Reduced Motion mit statischer Alternative.
6. **Higgsfield:** nur für ergänzende Assets. Die Interaktion wird im Code umgesetzt.

## Higgsfield-Stand (wichtig)
- Konto: **10 Credits**, Plan `free`.
- `seedance_2_5`, 5 s, 16:9 kostet **35 Credits** (per `estimate_video_cost`, nicht gestartet).
- Folge: kein Video-Generieren ohne Freigabe und ausreichend Credits. Standbilder sind günstiger.
- **Vor jedem Generieren:** Kosten schätzen, dem Nutzer nennen, Freigabe abwarten. Das Generieren kostet Credits.
- Das Referenzvideo aus dem Prompt liegt nicht vor. Ersatz-Storyboard steht in Datei 01, Abschnitt 5.

## Tech-Stack (verifiziert)
- Astro 7 (`output: server`, `@astrojs/node` standalone; `GITHUB_PAGES=true` baut static)
- Tailwind CSS 4 (`@tailwindcss/vite`), Theme in `src/styles/global.css`
- Keine 3D-/Animationsbibliothek installiert
- Der Hero hat bereits einen 2D-Canvas (`#hero-wave-canvas`) und CSS-Wellen-Animationen. Die bleiben oder werden bewusst ersetzt.

## Seitenstruktur
`src/pages/index.astro` → Header, Hero, Services, Process, About, Contact, Footer, LegalModal, CalendlyModal, ChatWidget. Komponenten liegen in `src/components/`.

## Vorgeschlagene Umsetzung (noch nicht gebaut)
- Eine Scroll-Timeline mit Fortschritt `p` (0–1). Ein sticky Three.js-Canvas. Die bestehenden Sections werden darüber gelegt.
- Dateien (Vorschlag): `src/scroll/scene.ts`, `src/scroll/graph.ts`, `src/scroll/timeline.ts`, `src/data/graph.json`.
- Abhängigkeiten (Vorschlag): `three`. GSAP nur, falls ScrollTrigger wirklich nötig ist.
- Fünf Szenen: Chaos → Verarbeitung → Knowledge Graph → Workflow → Struktur (Details in Datei 01, Abschnitt 3).

## Offene Entscheidungen (vom Nutzer noch zu beantworten)
1. Video-Assets via Higgsfield oder nur Standbilder? (Credits-Frage)
2. Storyboard aus Datei 01 als Referenz akzeptieren, oder echte Referenz hochladen?
3. Graph-Labels rein illustrativ (empfohlen)?
4. Scroll-Bibliothek: GSAP-ScrollTrigger oder eigene Logik?
5. Soll die Doku committet werden?

## Nächster Schritt für den neuen Chat
1. Datei 01 lesen.
2. Die offenen Entscheidungen oben beim Nutzer klären, bevor Code geschrieben wird.
3. Nach Freigabe: Gerüst bauen (Timeline + leerer sticky Canvas in `index.astro`), dann Graph, dann Szenen. Jeden Schritt im Browser prüfen.

## Nicht geprüft
- Credit-Preise anderer Modelle
- Produktionsbetrieb von `api/chat.ts` und `api/contact.ts` unter dem Node-Adapter
- Visuelle Prüfung der bestehenden Seite im Browser (nur Quelltext gelesen)

---

## Update: Umsetzung Stand

- Gebaut: `src/scroll/journey.ts` (Three.js-Szene, Graph, Partikel, Kamera-Stationen, Scroll-Fortschritt) und `src/components/Journey.astro` (Overlay-Texte, Layout, Reduced-Motion-Fallback). Eingebunden in `src/pages/index.astro` zwischen Hero und Leistungen.
- Abhängigkeit: `three` (0.180.0). Keine Higgsfield-Generierung, keine Credits verbraucht.
- Geprüft: Build läuft, Szenen 1 bis 5 im Browser, Mobil ohne horizontalen Überlauf, keine Konsolenfehler.
- Nicht geprüft: `prefers-reduced-motion` (nur Code), echte Bildrate auf Desktop-GPU (Testbrowser rendert per Software und läuft nur mit ca. 2 fps).
- Offen: Higgsfield-Assets, Feinschliff der Bewegung und Farben, Commit.
