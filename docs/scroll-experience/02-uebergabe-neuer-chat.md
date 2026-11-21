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

---

## Update 3 (abgeschlossen 2026-11-21)

Auftrag: `04-prompt-neuer-chat.md`, Fortsetzung `06-prompt-neuer-chat.md`. Plan und Dopplungen: `05-plan-update-3.md`. Zusätzlich auf Wunsch des Nutzers: eigene backcall-Station. Nichts committet.

### Was wo läuft

- `src/scroll/timeline.ts`: zentrale Zeitachse `TIMELINE` (25 Segmente), `P`, `at`, `local`, `span`, `easeSegment`, `bump` (Effekt nur im Übergang), `segStyle` (Mindesthöhe der Blöcke im unteren Teil). Segmente mit `flow: true` sind Inhalt im normalen Fluss.
- `src/scroll/journey.ts`: Bühne, Kamera, innerer Graph, Umschläge, Stern, Detail-Zooms, unterer Teil, Overlays, Scroll → p.
- `src/scroll/world.ts`: äußere Welt (Desktop 4.000, mobil 1.200 Knoten in 12 bzw. 7 Cluster-Gruppen à 5 Clustern), Kanten und Datenströme komplett im Vertex-Shader (Uniform `uP`, Attribute Start/Ziel/Reveal/Form).
- `src/scroll/voice.ts`: backcall-Planet (Partikelkugel mit Tonspur-Schwingung, zwei Orbitringe mit Mond, Signalringe, ein großer Signalring im Übergang, gepunkteter Signalpfad).
- `src/scroll/star.ts`: vinje-Stern (Pfad aus dem Header-Logo) als Punktwolke.
- `src/components/Journey.astro`: Stage mit Hero-Station, Szenen, Labels, Schleiern; Strecke (`data-track`); Slot `lower` für den unteren Teil.
- `src/components/Hero.astro`: nur noch „Vincent & Jesse“, H1, Subline, „Erstgespräch vereinbaren“.
- `src/pages/index.astro`: Services, Process, About, Contact liegen im Slot `lower` der Journey.
- `src/components/Services.astro` (vier Stationen), `ServiceChain.astro` (neu, Ketten aus der Pipeline-Karte), `Process.astro`, `About.astro`, `Contact.astro`: Blöcke tragen `data-seg` und `class="journey-block"`.
- `scripts/check-timeline.ts`: Selbsttest (Ausnahme Hero unter 100vh begründet, flow-Segmente am Ende).

### Technik in Kürze

- Die Stage ist über die ganze Section sticky (ein WebGL-Kontext bis zum Seitenende). Die Strecke beginnt mit `margin-top: -100vh` beim ersten Pixel.
- Unterer Teil: Inhalt scrollt nativ über der Bühne (`.journey-lower`, z-index 10). Sein Fortschritt zählt an der Bildschirmmitte; die Lücke `.journey-tail` (50vh) schließt an die Strecke an. Kamera-Keyframes der flow-Stationen liegen bei 30 % und 70 % des Blocks. Ein `ResizeObserver` misst neu, wenn sich Höhen ändern (Kalender, Formular, Bilder).
- Segment-Positionen werden per `getBoundingClientRect` relativ zur Section gemessen (Blöcke sind verschachtelt).
- Effekte nur in Übergängen: Dolly-Zoom (`to-flood`), Rolle (`to-sort`, `to-flow`, `to-project`, Wechsel zwischen den Leistungen), Kippen um 90° über den Fächern (`to-graph`), alle Kanten leuchten auf (`to-email`), Welt dreht 60° hin und zurück (`to-flow`), Signalring durch die ganze Szene (`to-call`), umgekehrter Dolly-Zoom beim großen Herauszoom (`to-result`).
- Detail-Zooms: Umgebung (innerer Graph, Welt, linker Schleier) tritt zurück, solange eine Detail-Station sichtbar ist.
- Im unteren Teil steht die Welt still (Drehung um den Ursprung würde ferne Motive verschieben); die Kamera trägt die Bewegung.

### Stationen (final)

Halt = Scroll-Strecke der Station, Übergang = Strecke danach. vh Desktop / mobil. Unterer Teil: Mindesthöhe, der Inhalt bestimmt die Länge.

| # | Station | Inhalt | Halt | Übergang danach | Effekt im Übergang |
|---|---|---|---|---|---|
| 1 | `hero` | Stern aus Partikeln, „Vincent & Jesse“, H1, Subline, CTA | 40 / 25 | `to-flood` 80 / 50 | Stern zerfällt, Umschläge lösen sich daraus; H1 zoomt, Subline gleitet weg; Dolly-Zoom |
| 2 | `flood` | 01 Informationsflut | 100 / 70 | `to-sort` 60 / 40 | Umschläge in vier Fächer, Rolle |
| 3 | `sort` | 02 vinje Engine, Fächer, Zeile „backmail, backcall & Multi-Agenten“ | 100 / 70 | `to-graph` 80 / 50 | Kamera kippt über die Fächer (Blick von oben), E-Mails stürzen in den Graphen, Eintauchen |
| 4 | `graph` | 03 Knowledge Graph, Cluster-Labels | 100 / 70 | `to-email` 50 / 35 | alle Kanten leuchten auf, Zurückziehen, Zoom auf Email |
| 5 | `zoom-email` | Email: Absender, Betreff, Kategorie, verknüpfter Kunde, Projekt | 100 / 60 | `to-flow` 50 / 35 | Herauszoom mit Rolle, Welt dreht 60° |
| 6 | `workflow` | 04 Eine Anfrage, sechs Schritte | 140 / 100 | `to-call` 70 / 45 | Kamera schwenkt nach außen, backcall-Planet erscheint, Signalring läuft durch die Szene |
| 7 | `call` | 05 backcall: Ein Anruf, fünf Schritte; Signalpfad Planet → Call → Knowledge → Task → Employee | 140 / 100 | `to-project` 50 / 35 | Stimme wird leiser, Kamera rollt zum Project-Knoten |
| 8 | `zoom-project` | Project: Kunde, Angebot, Termin, Aufgabe, Dokument, Rechnung | 100 / 60 | `to-result` 100 / 60 | großer Herauszoom (umgekehrter Dolly-Zoom), Welt entfaltet sich von innen nach außen |
| 9 | `result` | 06 Ergebnis, Welt im Ganzen, „Produktives System · Kundensystem“: backmail, backcall | 100 / 70 | `to-services` 80 / 50 | Flug zur ersten Cluster-Gruppe |
| 10 | `services-ki` (`#leistungen`) | Leistungen-Kopf, 01 KI-Automatisierung | min. 110 / 80 | – | Gruppe 1 rechts im Bild |
| 11 | `services-ml` | 02 Machine Learning + Kette (Input → Engine → Ergebnis) | min. 110 / 80 | – | Rolle, Gruppe 2 |
| 12 | `services-bi` | 03 Datenanalyse & BI + Kette | min. 110 / 80 | – | Rolle, Gruppe 3 |
| 13 | `stack-eu` | Kern-Stack, „100 % DSGVO-konform: Europäische Hoster & Mistral LLMs“ | min. 90 / 70 | – | Blick auf die ganze Welt |
| 14 | `process` (`#ansatz`) | Von der Idee zum System, 01–04, Preismodell | min. 160 / 110 | – | Pfad zeichnet sich durch vier Knoten (Labels 01–04) |
| 15 | `about` (`#ueber-uns`) | Zitat, Text, Werte, Vincent & Jesse | min. 120 / 90 | – | zwei verbundene Knoten, Fotos tauchen auf (Desktop) |
| 16 | `contact` (`#kontakt`) | Formular / Calendly, direkter Kontakt | min. 120 / 100 | – | Kamera fährt zum Kern, Datenströme beruhigen sich |

Strecke bis einschließlich `to-services`: Desktop 1.540vh, mobil 1.025vh. Dazu der untere Teil mit Inhaltshöhe.

### backcall-Station (neu)

- Platz in der Erzählung: nach dem E-Mail-Workflow (backmail-Kanal), vor dem Project-Detail. Zweiter Kanal, der im selben Graphen landet; danach nennt das Ergebnis beide Produkte.
- Texte nach `backcall/README.md` (nimmt Anrufe an, erkennt das Anliegen, Auskunft nach dem Ausweisen, vorläufige Einträge/Formulare/Nachrichten, ein Mensch prüft jeden Fall). Keine Zahlen, keine Kunden.
- Schritt k leuchtet, wenn der Signalpfad Knoten k erreicht (wie beim Workflow, `data-step` + `stepProgress`).
- Planet steht desktop rechts neben dem Graphen, mobil darüber. Nach der Station bleibt er als kleiner „Mond“ in der Welt.

### Zusammengelegte Dopplungen (Freigabe 1–13 aus 05)

Umgesetzt wie in der Tabelle in `05-plan-update-3.md`: Logo-SVG im Hero und Logo, „Vincent & Jesse“ und Claim in der About-Karte entfernt; „Leistungen entdecken“ (Hero, Szene 5) und „Erstgespräch vereinbaren“ in Szene 5 entfernt; Calendly-Button in der Kontakt-Box entfernt; Hero-Vertrauensleiste und Pipeline-Karte samt Tab-Script entfernt; EU-Box-Titel geändert; 2. Satz im Process-Intro und Services-Intro entfernt.

### Wo jede Aussage aus Dok 01 §4 jetzt steht

- „Daten. Insights. Automatisierung.“: H1 (Station `hero`), Footer. Subline: `hero`.
- „Erstgespräch vereinbaren“: `hero` (öffnet Calendly-Modal). „Leistungen entdecken“: entfällt (freigegeben), Nav-Link „Leistungen“ bleibt.
- „100 % DSGVO-konform (EU-Hoster & Mistral LLMs)“: Box-Titel in `stack-eu`, Chip „100 % EU-Hosting“. „Expertise statt Hype“: Services-H2, About-Wert „Echte Expertise“. „Festpreis ohne Stundensatz“: Preismodell in `process`.
- Pipeline: Input → Szene `flood`; „backmail, backcall & Multi-Agenten“ → Szene `sort`; „Kundensystem“ → Szene `result`; „Python-Pipelines & Forecasting-Modelle“ → Kette `services-ml`; „SQL-Modellierung, Supabase & Python-ETL“ → Kette `services-bi`. Alle Ergebnisse beider Tabs stehen in den Ketten.
- Services, Process, About, Contact: alle Texte in ihren Stationen (Calendly über den Tab „Termin direkt buchen“).

### Geprüft (Browser-Pane, Software-Rendering)

- Alle Stationen einzeln angesteuert, Desktop 1440×900 und 800×600, mobil 375×812. Kein horizontaler Überlauf. Mobil passt der Hero in eine Bildschirmhöhe.
- Reduced Motion (matchMedia überschrieben, Section geklont, neu gemountet): statisch, Hero zuerst, alle Szenen sichtbar, Blöcke ohne Mindesthöhe.
- Tastatur: vom Hero-Button springt Tab direkt in den unteren Teil (ausgeblendete Szenen sind nicht erreichbar). Anker-Links landen auf ihren Sections.
- Konsole ohne Fehler, `npm run build` läuft, `node scripts/check-timeline.ts` grün.

### Nicht geprüft

- Scroll-Gefühl auf echter Hardware (Trackpad, Mausrad, Touch) und echte Bildrate auf einer GPU; die Testumgebung rendert mit ca. 2 Bildern pro Sekunde.
- Formular-Versand und Calendly-Embed im neuen Layout nur sichtbar geprüft, nicht abgeschickt.
- Safari/iOS (URL-Leiste ändert `innerHeight`; die 50vh-Lücke kann dort minimal springen).

### Offene Entscheidungen

1. Einrasten: nur Dämpfung oder zusätzlich JS-Einrasten für Mausrad/Trackpad (erst auf echter Hardware entscheiden).
2. Detail-Stationen nur mit Labels (so umgesetzt).
3. Unterer Teil im normalen Fluss über der Bühne (so umgesetzt).
4. Länge: Detail-Stationen 100vh oder auf 80vh kürzen.
5. backcall-Texte: aus dem backcall-README abgeleitet, bitte fachlich gegenlesen (besonders „einfache Fragen direkt beantwortet“ und „Nach dem Ausweisen: Auskunft aus euren Daten“).
6. Die Fotos an den Über-uns-Knoten sind dekorative Duplikate der Bilder in den Karten (nur Desktop). Behalten oder weglassen?
