# VINJE Scroll Experience – Phase 1: Bestandsaufnahme & Creative Direction

Stand: 2026-11-21 · Branch: `higgsfield` (zeigt aktuell keine eigenen Commits gegenüber `main`)

---

## 1. Bestandsaufnahme

### Tech-Stack
- **Astro 7** (`output: server`, Node-Adapter im standalone-Modus; GitHub-Pages-Build über `GITHUB_PAGES=true` als static)
- **Tailwind CSS 4** über `@tailwindcss/vite`, Theme in `src/styles/global.css`
- Keine 3D-Bibliothek installiert (kein Three.js, kein R3F, kein GSAP)
- Server-Routen: `src/pages/api/contact.ts` (Kontaktformular, Resend), `src/pages/api/chat.ts` (ChatWidget)
- Dependencies: `astro`, `@astrojs/node`, `@tailwindcss/vite`, `tailwindcss`, `resend`

### Seitenaufbau (`src/pages/index.astro`, eine Seite)
| Reihenfolge | Komponente | Inhalt (Kurzfassung) |
|---|---|---|
| Header | `Header.astro` | Navigation |
| 1 | `Hero.astro` | H1 „Daten. Insights. Automatisierung.“, Subline zu backmail/backcall, zwei CTAs, Canvas-Wellen-Hintergrund, Pipeline-Diagramm „01 Input → 02 Engine → 03 Produktives System“ |
| 2 | `Services.astro` | Leistungen: KI-Automatisierung, Machine Learning, Datenanalyse & BI, Kern-Stack, 100 % EU-Hosting |
| 3 | `Process.astro` | Ablauf in 4 Schritten (Audit → Prototyp → Integration → Betrieb), Festpreis-Modell |
| 4 | `About.astro` | Vincent & Jesse, Foto + LinkedIn, Zitat „Kein KI-Hype ohne echten Nutzen…“ |
| 5 | `Contact.astro` | Formular oder Calendly-Inline, E-Mail info@vinje.de, Kontakt-CTAs |
| – | `Footer`, `LegalModal`, `CalendlyModal`, `ChatWidget` | Footer, rechtliche Modals, Terminbuchung, Chat |

Weitere Komponenten: `Header.astro`, `Footer.astro`, `CalendlyModal.astro`, `LegalModal.astro`, `ChatWidget.astro`.

### Design-Grundlage (aus `global.css` und Komponenten, unverändert übernehmen)
- **Farben (Theme-Tokens):**
  - `paper` `#F7F6F2` (Hintergrund)
  - `paperDark` `#EFECE4`
  - `ink` `#141414` (Text, primäre Buttons)
  - `inkMuted` `#555555` (Sekundärtext)
  - `silverBorder` `#E2E0D8` (Linien)
  - `silverAccent` `#C8C6BE`
  - Silber-Verläufe im Hero: `#FFFFFF`, `#DFDDD5`, `#AEACA3`, `#9C9A92`, `#8F8D85`
- **Schriften:** Inter (Fließtext), Plus Jakarta Sans (Display/Überschriften)
- **Bestehende Motion:** Hero-Canvas mit silbrigen Seidenwellen (`#hero-wave-canvas`), SVG-Wellen mit Shimmer, schwebende Silber-Orbs (`silverOrbFloat`), Papier-Textur (`.paper-texture`), `.silver-card`
- **Logo:** vinje-Vektorlogo im Hero (`viewBox 304×323`, `currentColor`)
- **Markentext:** „vinje“ klein geschrieben, „Vincent & Jesse“ darunter. Produktnamen **backmail** und **backcall** stehen so im Text.

### Inhalte, die erhalten bleiben müssen
- Alle Aussagen aus Hero, Services, Process, About, Contact (siehe Abschnitt 4 unten).
- Keine erfundenen Kunden, keine erfundenen Zahlen. Die Pipeline-Kennzahlen (`metric1/2`) sind Produktaussagen, keine Referenzen.
- Datenschutz-Versprechen: „100 % DSGVO-konform (EU-Hoster & Mistral LLMs)“, „Festpreis-Projekte ohne Stundensatz“.

### Was fehlt für den Prompt
- **Die Video-Referenz** ist nicht vorhanden. Der Prompt nennt sie als „bereitgestellte Video-Referenz“. Siehe Abschnitt 5 für ein Ersatz-Storyboard in Textform.

---

## 2. Higgsfield: was geprüft wurde

| Prüfung | Ergebnis |
|---|---|
| Konto | **10 Credits**, Plan `free` |
| Kosten `seedance_2_5`, 5 s, 16:9 | **35 Credits** (per `estimate_video_cost`, nicht gestartet) |
| Folge | Mit 10 Credits reicht **kein** 5-Sekunden-Video dieses Modells. Die Kosten anderer Modelle sind noch nicht geprüft. |
| Verfügbare Typen | Video (`generate_video`), Bilder (`generate_image`), Audio, Voice, 3D (`generate_3d`), Upscaling, Hintergrund entfernen, Reframe |

**Empfehlung:** Vor jedem Generieren `estimate_video_cost` für das konkrete Modell laufen lassen. Für die Hintergrund-Assets (Partikel, Lichtnebel, organische Formen) sind **Standbilder** günstiger als Video. Bilder dann in Three.js als Texturen nutzen. Die Interaktion bleibt im Code, wie der Prompt verlangt.

**Nicht geprüft:** Modellliste mit exakten Credit-Preisen (`models_explore`), Qualität der Modelle für abstrakte Graph-Visuals.

---

## 3. Creative Direction

### Leitidee
Der Nutzer fliegt durch das „digitale Gehirn“ eines Mittelstandsunternehmens. Chaos (Informationsströme) → Ordnung (KI-Verarbeitung) → Struktur (Netzwerk und Automatisierung). Die Stimmung bleibt ruhig, papierhell und Apple-artig (Brand-Konsistenz mit `paper`/`ink`/Silber). Der Graph ist das einzige laute Element.

### Gestaltungsregeln
- Hintergrund bleibt `#F7F6F2`. Keine dunklen Vollflächen, kein Gradient-Blob-Look.
- Graph in Ink (`#141414`) und Silber. Akzentfarbe nur punktuell, z. B. ein einzelner Glow-Knoten für die Anfrage in Szene 4.
- Labels im Graphen (Customer, Email, Project, Invoice, Knowledge) als illustrative Beispieldaten, klein und in `inkMuted`.
- Keine Standard-Icons als zentrale Visualisierung, keine SaaS-Karten.

### Szenenplan (scroll-gesteuert, eine Timeline)

Die Seite ist ein einziger Scroll-Container mit einem Three.js-Canvas `position: sticky`. Der Fortschritt `p` (0 bis 1) steuert Kamera, Knoten und Text. Jede Szene hat einen Bereich von `p`-Werten, aber die Übergänge überlappen. Die bestehenden Sections (Services, Process, About, Contact) werden über das Canvas gelegt, mit scroll-gesteuertem Einblenden, nicht als harte Schnitte.

| Szene | Scroll-Anteil | Visuell | Kamera | Text (bestehender Inhalt) |
|---|---|---|---|---|
| 1 Chaos | 0–15 % | Hero bleibt. Viele kleine Partikel als E-Mails, Anrufe, Dokumente, Benachrichtigungen, ungeordnet, driftend | Langsamer Dolly hinein | Hero-Text bleibt stehen |
| 2 Verarbeitung | 15–30 % | Partikel werden in Bahnen gezogen, Datenpunkte leuchten auf, Ströme ordnen sich in drei Zonen (Mail, Anruf, Dokument) | Seitlicher Dolly, leichte Rotation | Services-Inhalte: Kanäle, Analyse, Kategorisierung |
| 3 Knowledge Graph | 30–60 % | Knoten entstehen Schritt für Schritt, Verbindungen wachsen, Cluster bilden sich, Datenströme fließen auf den Kanten | Flug auf Knoten zu, durch Cluster, Tiefenwechsel, Herauszoom am Ende | Process-Inhalte (Schritte 01–04) als Labels an Clustern |
| 4 Workflow | 60–80 % | Ein Pfad leuchtet durch den Graphen: Anfrage → Kunde erkannt → Infos abgerufen → kategorisiert → Antwort vorbereitet → Termin/Aufgabe angelegt | Kamera folgt dem Pfad entlang der Verbindungslinie | Ablauf als 6 Schritte, keine Boxen, sondern Knoten auf dem Pfad |
| 5 Struktur | 80–100 % | Herauszoom: gesamtes Netzwerk sichtbar, isolierte Knoten sind verbunden. CTA-Elemente erscheinen am Rand | Weitwinkel, Netz ruhig rotierend | About, Contact, CTAs (Erstgespräch, Projekt anfragen) |

### Rückwärts-Scrollen
Alle Animationen sind direkt an `p` gekoppelt (keine Trigger-Einmal-Animationen). Dadurch laufen sie beim Zurückscrollen exakt rückwärts. Keine `onEnter`-Events für Kernanimationen.

### Knowledge Graph (technisches Konzept)
- **Datenstruktur:** Statisch vorbereitetes JSON mit Knoten (Typ, Label, Cluster, Gewicht) und Kanten. Ca. 200–300 Knoten, damit Desktop flüssig bleibt.
- **Layout:** Force-directed einmal vorberechnen (keine Live-Simulation beim Scrollen). Cluster nach Typ (Kunde, E-Mail, Dokument, Telefonat, Aufgabe, Termin, Projekt, Mitarbeiter, Wissen).
- **Rendering:** `InstancedMesh` für Knoten, Linien als `LineSegments` mit Shader für Datenströme (Dash-Offset über Zeit und `p`).
- **Glow:** Additive Sprites oder selektives Bloom, nur für hervorgehobene Knoten.
- **Labels:** HTML-Overlay, nur für den nächsten Knoten zur Kamera.

### Kamera-Timeline
- Eine Catmull-Rom-Kurve mit Keyframes an den Szenengrenzen, `p` steuert die Position auf der Kurve.
- Der Nutzer-Scroll wird geglättet (Lenis oder eigenes Damping), damit die Kamera nicht ruckelt.

### Responsive und Reduced Motion
- **Desktop** (Hauptziel): volle Szenen, ca. 300 Knoten, Bloom.
- **Tablet/Mobil:** ca. 120 Knoten, kein Bloom, Szenen 1 und 4 als Standbild-Fallback.
- **`prefers-reduced-motion`:** statische Grafik (ein gerendertes Frame oder SVG), Text ohne Scroll-Animation, Inhalt vollständig lesbar.

### Umsetzungsrahmen (vorgeschlagen, noch nicht gebaut)
- Neue Abhängigkeiten: `three`, `gsap` (ScrollTrigger falls benötigt). Keine React-Pflicht. Vanilla Three.js in einem Astro-`<script>` ist kompatibel mit dem bestehenden Setup und passt zu den vorhandenen Canvas-Scripts im Hero.
- Neue Dateien (Vorschlag): `src/scroll/scene.ts`, `src/scroll/graph.ts`, `src/scroll/timeline.ts`, `src/data/graph.json`, Einbindung über `index.astro`.
- Vorhandene Komponenten werden nicht ersetzt, sondern in den Scroll-Container eingebettet.

---

## 4. Vorhandene Inhalte (Quelle der Wahrheit)

Diese Texte stammen aus den Komponenten und müssen unverändert bleiben (nur umplatziert):

- **Hero:** „Daten. Insights. Automatisierung.“ · „Für den Mittelstand und E-Commerce: Mit unserem KI-E-Mail-Client backmail und unserem Voice Assistant backcall automatisieren wir eure Kundenkommunikation – ergänzt durch individuelle KI-Systeme, Forecasting-Modelle und Datenpipelines.“ · CTAs „Erstgespräch vereinbaren“, „Leistungen entdecken“ · Vertrauenspunkte: „100 % DSGVO-konform (EU-Hoster & Mistral LLMs)“, „Fundierte Data-Science-Expertise statt Hype“, „Festpreis-Projekte ohne Stundensatz“
- **Pipeline (Hero):** Input „Kunden-E-Mails, Anrufe & Support-Anfragen“ → Engine „backmail, backcall & Multi-Agenten“ → „Kundensystem“. Weitere Varianten: „Python-Pipelines & Forecasting-Modelle“, „SQL-Modellierung, Supabase & Python-ETL“.
- **Services:** „Echte Data-Science- & KI-Expertise statt Standard-Baukasten.“ · Bereiche: KI-Automatisierung, Machine Learning (Forecasting, Pipelines, Klassifikation), Datenanalyse & BI (Dashboards, interne Tools, SQL) · Stack: Mistral AI & lokale LLMs, Python, SQL, Supabase, Docker · „100 % EU-Hosting“
- **Process:** „Von der Idee zum System.“ · Schritt 01 Audit & Potenzialanalyse, 02 Architektur & Prototyp, 03 Entwicklung & Integration, 04 Betrieb & Weiterentwicklung · „Projekt-Festpreis + monatliche Betreuung statt Stundensatz“
- **About:** „Kein KI-Hype ohne echten Nutzen – wir verbinden tiefes Data-Science-Verständnis mit pragmatischer Umsetzung.“ · Vincent Grüneklee und Jesse Bakenhus, je „Data Science, KI-Systeme & Automatisierung“ · Werte: Eingespieltes Duo, Echte Expertise, Direkter Draht
- **Contact:** „Bereit für den nächsten Schritt?“ · Formular (Name/Unternehmen, E-Mail, Projektbeschreibung, Website) · Calendly 20-Min-Erstgespräch · info@vinje.de

---

## 5. Referenzvideo als Storyboard (Ersatz für fehlende Vorlage)

Ein fertiges Referenzvideo liegt nicht vor. Dieses Storyboard beschreibt die gewünschte Bewegung in Worten. Es dient als Vorlage für die Three.js-Kamera und, falls gewünscht, als Prompt für Higgsfield.

**Shot 1 – Chaos (0–3 s)**
Dunkler Raum mit papierhellem Hintergrund. Viele kleine, leuchtende Partikel (Briefumschläge, Telefonsymbole als abstrakte Punkte, Dokumentblätter) treiben in alle Richtungen. Kamera fährt langsam auf den Schwarm zu.

**Shot 2 – Verarbeitung (3–6 s)**
Die Partikel werden in drei Bahnen gezogen. Einzelne Punkte leuchten kurz auf, Linien entstehen zwischen zusammengehörenden Punkten. Seitlicher Dolly, leichte Rotation.

**Shot 3 – Graph entsteht (6–12 s)**
Knoten erscheinen einzeln, dann Verbindungen. Die Kamera taucht zwischen zwei Clustern hindurch. Datenströme laufen als feine Lichtpunkte entlang der Kanten. Tiefenschärfe wechselt zwischen Vorder- und Hintergrund.

**Shot 4 – Workflow (12–16 s)**
Ein einzelner Lichtpfad verbindet sechs Knoten nacheinander. Die Kamera folgt ihm entlang der Linien.

**Shot 5 – Struktur (16–20 s)**
Herauszoom. Das gesamte Netzwerk ist sichtbar und ruhig rotierend. Am Ende steht ein klarer Mittelpunkt (Kontakt).

**Stil:** Papierhell, Ink und Silber, feine Linien, weiche Glows, kein Farbfeuerwerk.

**Hinweis zu Higgsfield:** Ein 5-Sekunden-Clip dieses Typs kostet mit `seedance_2_5` 35 Credits. Das Konto hat 10. Für Video-Assets brauchst du mehr Credits, oder du nutzt Standbilder (günstiger).

---

## 6. Offene Entscheidungen (für dich)

1. **Video-Assets:** Sollen wir Higgsfield-Video überhaupt nutzen, oder reichen Standbilder als Hintergrundtexturen? Video kostet mehr Credits, als das Konto hat.
2. **Referenzvideo:** Storyboard in Abschnitt 5 als Grundlage akzeptieren, oder hast du eine echte Referenz zum Hochladen?
3. **Graph-Daten:** Sollen die Labels rein illustrativ bleiben (empfohlen, wie im Prompt verlangt)?
4. **Scroll-Bibliothek:** GSAP-ScrollTrigger oder eigene Scroll-Logik mit `p` (ohne Zusatzabhängigkeit)?
5. **Commit:** Die Doku liegt als Datei im Projekt. Soll sie committet werden?

---

## 7. Nicht geprüft

- Exakte Credit-Preise der übrigen Modelle (nur `seedance_2_5` gemessen)
- Ob der Chat-Endpunkt (`api/chat.ts`) und das Kontaktformular unter dem Node-Adapter in Produktion laufen
- Browser-Test und Performance auf echten Geräten (noch nichts gebaut)
- Inhalt der bestehenden Seite im Browser (nur Quelltext gelesen)
