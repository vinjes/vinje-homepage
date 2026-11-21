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

---

## Update 2 (2026-11-21): Hero integriert, E-Mail-Szene, Graph neu

Auftrag: `docs/scroll-experience/03-prompt-neuer-chat.md`.

### Was jetzt läuft
- **Animation ab dem ersten Bild:** `Hero.astro` wird in `Journey.astro` per Slot gerendert (`src/pages/index.astro`: `<Journey><Hero /></Journey>`). Die sticky Stage (Canvas, Silberwellen, Overlays) beginnt ganz oben, der Hero-Inhalt liegt darüber (`margin-top: -100vh`) und scrollt normal weg. Seine Deckkraft hängt an p.
- **Timeline (p):** 0–0.14 Hero (auf die Pixelhöhe des Heros abgebildet, auch mobil, wo der Hero ca. 1,9 Bildschirmhöhen hat) · 0.11–0.27 Informationsflut · 0.19–0.38 Sortierung · 0.37–0.52 E-Mails laufen in den Graphen · 0.41–0.68 Knowledge Graph · 0.66–0.87 Workflow · 0.85–1 Struktur. Die Scroll-Strecke nach dem Hero ist `.journey-track` (480vh mobil, 540vh Desktop).
- **E-Mail-Szene** (`syncEnvelopes` in `src/scroll/journey.ts`): 64 Umschläge (mobil 32) als Sprites. Sie fliegen vom Rand ein (ein Teil ist schon im ersten Bild unterwegs), werden in vier Fächer sortiert (Anfrage, Angebot, Rechnung, Support, HTML-Labels `data-bin`) und laufen dann jeweils in einen Knoten des Graphen. Der Knoten erscheint, wenn sein Umschlag ankommt. Die erste Anfrage wird zum Startknoten des Workflow-Pfads. Alles hängt an p, rückwärts geprüft.
- **Graph neu** (`buildGraph`): 520 Knoten (mobil 200), 9 Cluster mit je zwei Unterzentren und Hub (Ring), Speichen zu den Hubs, nächste Nachbarn, Hub-Rückgrat zwischen benachbarten Clustern. Kanten wachsen von a nach b, statt aufzuploppen. Tiefen-Abblendung für Knoten und Kanten (fern blasser, sehr nah ausgeblendet). Knotenfarbe zwischen Ink und Silber. Der Workflow-Pfad hat einen Lichtpunkt an der Spitze, die Kamera rahmt den Pfad (Desktop rechts neben dem Text, mobil darüber).
- **Silberwellen** aus dem alten Hero liegen jetzt als Layer in der Stage (`data-waves`) und blenden bis p ≈ 0.16 aus. Das 2D-Canvas-Wellen-Script des Heros ist entfernt (zweite rAF-Schleife weniger).
- **Reduced Motion / kein WebGL:** Klasse `journey-static`: Hero oben, darunter Standbild des Endzustands, dann alle Texte. `resize()` misst jetzt das Canvas statt der Stage, vorher war das Standbild verzerrt.
- Pro Frame keine neuen Arrays oder Vektoren mehr (Kamera-Keyframes und Label-Projektion nutzen vorab angelegte Objekte).

### Geprüft
- `npm run build` ohne Fehler.
- Browser Desktop (1440×900) und Mobil (375×812): Scroll von oben bis unten und zurück, alle Szenen, keine Konsolenfehler, mobil kein horizontaler Überlauf (scrollWidth = 375).
- Reduced Motion: im Browser simuliert (`matchMedia` überschrieben, Sektion neu gemountet). Hero, Standbild und alle Texte sind lesbar, die Wellen ausgeblendet.

### Nicht geprüft
- Echte Bildrate auf einer GPU (Testbrowser rendert per Software, ca. 2 fps).
- Echtes `prefers-reduced-motion` über die Systemeinstellung (nur simuliert).
- Kein TypeScript-Check: `typescript` und `@astrojs/check` sind nicht installiert, der Astro-Build prüft keine Typen.

### Higgsfield
- Keine Assets erzeugt, keine Credits verbraucht. Der Higgsfield-Connector verlangte in dieser Sitzung eine Anmeldung. Weder Kontostand noch Kostenschätzungen waren abrufbar.
- Vorgesehenes Asset: ein Hintergrund-Standbild für den Hero-Bereich der Stage (Silberseide auf Papierhell, 16:9). Es würde den SVG-Wellen-Layer `data-waves` ersetzen oder ergänzen. Kosten erst nach Anmeldung per `estimate_image_cost` messen, dann Freigabe einholen.

### Offen
- Higgsfield-Connector anmelden, dann Kosten schätzen und freigeben lassen.
- Unsichtbare Szenen-Buttons (Szene 5) sind per Tab-Taste fokussierbar, auch wenn sie ausgeblendet sind (bestand schon vorher).
- Commit (nur auf ausdrücklichen Wunsch).
