Du übernimmst das Projekt VINJE-Homepage (Astro 7, Tailwind 4, Three.js 0.180) im Repo `/Users/vincentgrueneklee/Documents/vinje/vinje-homepage`, Branch `higgsfield`. Arbeite auf Deutsch.

## Ausgangslage
Zwei frühere Chats haben eine Scroll-Experience gebaut. Der Nutzer hat die letzte Runde angesehen und gibt das Feedback unten. Lies zuerst, ohne etwas zu ändern:
- `docs/scroll-experience/01-bestandsaufnahme-und-creative-direction.md` (Design, Texte in Abschnitt 4, Storyboard in Abschnitt 5)
- `docs/scroll-experience/02-uebergabe-neuer-chat.md`, besonders der Abschnitt „Update 2“ (aktueller Stand)
- `docs/scroll-experience/03-prompt-neuer-chat.md` (Auftrag der letzten Runde; der Higgsfield-Teil gilt nicht mehr, siehe Punkt 5)
- `src/scroll/journey.ts`, `src/components/Journey.astro`, `src/components/Hero.astro`, `src/pages/index.astro`
- `src/components/Services.astro`, `Process.astro`, `About.astro`, `Contact.astro`, `src/styles/global.css`

### Stand in Kürze
- Ein sticky Three.js-Canvas (`[data-stage]` in `Journey.astro`). Sein Zustand hängt nur vom Scroll-Fortschritt `p` (0..1) ab.
- `Hero.astro` wird per Slot in `Journey` gerendert und scrollt wie eine normale Section über die Stage weg. Diese Strecke ist auf p 0–0.14 abgebildet (`P_HERO`).
- Danach folgt `.journey-track` (480vh mobil, 540vh Desktop) mit linearem p.
- Timeline: Hero 0–0.14 · Informationsflut 0.11–0.27 · E-Mails werden in 4 Fächer sortiert 0.19–0.38 · E-Mails laufen in den Graphen 0.37–0.52 · Knowledge Graph 0.41–0.68 · Workflow 0.66–0.87 · Ergebnis 0.85–1.
- Overlay-Texte nutzen `data-from`/`data-to` und blenden über nur 0.04 p ein und aus.
- Glättung: `pCur += (pTarget - pCur) * 0.12` pro Frame. Das hängt von der Bildrate ab; auf 120-Hz-Displays reagiert es doppelt so schnell.
- Kamera: Stationen im Array `KF`, zwischen zwei Stationen jeweils `smooth()`.
- Graph: 520 Knoten (mobil 200), 9 Cluster mit Hubs. Alle Positionen werden pro Frame in JS gerechnet.
- Nach `Journey` folgen Services, Process, About und Contact als normale, statische Sections.

## Was der Nutzer will

### 1. Scroll-Tempo: Stationen statt Durchrauschen
Feedback: Bei den interaktiven Elementen geht das Scrollen teilweise zu schnell. Textstellen werden übersprungen, und hin und her zu navigieren ist schwer, weil kleinste Scrollbewegungen hektische Reaktionen auslösen.

Gewünscht:
- **Zwei Arten von Abschnitten.** Übergänge dürfen im jetzigen Tempo laufen. An Textstellen und wichtigen Bildern („Stationen“) stoppt die Bewegung automatisch.
- **Stationen schalten langsam frei.** Eine Station bekommt viel Scroll-Strecke für wenig p (Plateau in der Abbildung Scroll → p). Text erscheint dort schrittweise, z. B. Zeile für Zeile oder Workflow-Schritt für Workflow-Schritt, und bleibt eine Weile stehen, bevor der nächste Übergang beginnt.
- **Sanftes Einrasten** an Stationen, z. B. `scroll-snap-type: y proximity` mit unsichtbaren Ankern in der Strecke oder eine Dämpfung nahe der Station. Kein `preventDefault` auf Wheel oder Touch und kein Scroll-Hijacking. Tastatur (Pfeile, Leertaste, Bild ab), Scrollbar und Anker-Links aus der Navigation müssen weiter funktionieren. Prüfe, dass das Einrasten nicht mitten in Übergängen festhält.
- **Ruhige Reaktion:** Glättung bildratenunabhängig machen (`1 - Math.exp(-k * dt)`). Kleine Scrollbewegungen sollen kleine, ruhige Änderungen erzeugen.
- **Mehr Strecke insgesamt.** Richtwert: Die Journey wird etwa doppelt so lang wie jetzt, und jede Station hat auf dem Desktop mindestens rund 100vh Verweildauer. Mobil proportional kürzer, aber ebenfalls mit Plateaus.
- **Eine zentrale Liste der Stationen** (Name, Scroll-Länge Desktop und mobil, p-Bereich). Daraus werden Gesamthöhe, Overlay-Zeiten und Kamera-Stationen abgeleitet, statt verstreuter Zahlen. Später sollen scroll-gesteuerte Videos dieselbe Zeitachse nutzen (Punkt 5).

### 2. Oberste Ansicht: sofort bewegt, keine Dopplungen
Feedback: Die Ansicht beim Öffnen ist immer noch zu statisch, und manche Informationen doppeln sich. Übergänge und Visualisierungen sollen direkt ganz oben beginnen.

Bekannte Dopplungen (prüfe, ob es weitere gibt):
- Das vinje-Logo steht im Header und noch einmal groß im Hero.
- Die CTAs „Erstgespräch vereinbaren“ und „Leistungen entdecken“ stehen im Hero und in Szene 5, dazu kommt „Projekt anfragen“ im Header.
- Die Pipeline-Karte im Hero (Kunden-E-Mails, Anrufe & Support-Anfragen → backmail, backcall & Multi-Agenten → Mistral & lokale LLMs) erzählt dasselbe wie die Szenen 1 und 2.
- „100 % DSGVO-konform (EU-Hoster & Mistral LLMs)“ im Hero und „100 % EU-Hosting“ in Services.

Richtung:
- Die 3D-Szene ist vom ersten Frame an der Blickfang. Hero-Text und Karte dürfen sie nicht mehr großflächig verdecken.
- Der Hero wird eine gepinnte Station in der Stage. Er verwandelt sich beim Scrollen, statt nativ nach oben wegzulaufen. Beispiel: Das vinje-Sternzeichen besteht aus Partikeln, zerfällt beim ersten Scrollen und wird zu den ankommenden E-Mails. H1 und Subline bleiben, reagieren aber auf das erste Scrollen (Zoom, Versatz, Ebenenwechsel).
- Die Pipeline-Karte als Karte entfällt. Ihr Inhalt (Input → Engine → Produktives System, alle drei Tabs KI-Automation, Machine Learning, Daten & BI) wird Teil der Erzählung, z. B. als Station oder als Beschriftung in der Szene. Keine Aussage geht verloren.
- Mobil muss die Hero-Station in eine Bildschirmhöhe passen (heute ca. 1,9 Höhen).

### 3. Unterer Teil: nicht als statische Website enden
Feedback: Wenn die Übergänge fertig sind, kommt nur eine statische Standard-Website.

Richtung:
- Die Bühne bleibt bis zum Seitenende. Es gibt einen WebGL-Kontext für alle Abschnitte, keinen neuen pro Section.
- Services, Process, About und Contact werden Stationen derselben Timeline und liegen über dem weiterlaufenden Graphen. Ideen, angelehnt an Storyboard Shot 5 („Am Ende steht ein klarer Mittelpunkt (Kontakt)“):
  - Leistungen: die drei Bereiche als drei Cluster bzw. Bausteine; die Kamera wechselt zwischen ihnen.
  - Ablauf 01–04: Die Schritte sind Knoten auf einem Pfad, der sich beim Scrollen zeichnet.
  - Über uns: Vincent und Jesse als zwei verbundene Knoten; die Fotos tauchen aus dem Netz auf.
  - Kontakt: Die Kamera fährt auf einen zentralen Knoten zu, dort steht das Formular.
- Formular, Calendly-Modal, Chat-Widget, Rechtliches und alle Links bleiben voll bedienbar, per Tastatur erreichbar und gut lesbar, mit einem ruhigen Hintergrund hinter Formularen.

### 4. Zoom, Drehung, unerwartete Momente; der Graph als Welt
Feedback: Mehr Zoom-Effekte, Drehungen und Hooks beim Scrollen, die man nicht erwartet. Der Graph soll noch detaillierter werden. Man soll vom Inneren des Graphen nach außen scrollen und am Ende den gesamten Graphen als Welt aus sehr vielen Knoten sehen. Zwischendurch soll die Kamera hinein- und wieder herauszoomen und einzelne Bausteine wie Project oder Email genauer zeigen.

Richtung:
- **Kamera in den Übergängen:** Zoom (auch Dolly-Zoom, also FOV gegen die Kamerafahrt), Rollen um die Blickachse, Drehungen der Welt, Richtungswechsel. Kurze Hooks, z. B. alle Kanten leuchten auf einmal auf oder die Szene kippt um 90° und zeigt eine neue Ebene. An Textstationen bleibt das Bild ruhig; die Effekte gehören in die Übergänge.
- **Von innen nach außen:** Nachdem die E-Mails eingelaufen sind, steht die Kamera im Graphen. Von dort scrollt man hinaus. Am Ende ist der innere Graph nur noch ein Cluster in einer Welt aus sehr vielen Knoten (Richtwert Desktop: mehrere tausend Knoten in der äußeren Welt, mobil deutlich weniger).
- **Detail-Zooms:** Während des Herauszoomens gibt es 2–3 Stationen, an denen die Kamera in einen Knotentyp hineinzoomt (z. B. Email, Project, Customer oder Invoice) und seinen Aufbau zeigt. Unterknoten tragen Labels wie Absender, Betreff, Kategorie, verknüpfter Kunde, Projekt, Termin. Danach geht es wieder hinaus. Labels sind nur illustrativ, ohne Namen und ohne Zahlen.
- **Mehr Detail:** hierarchische Struktur (Knoten → Cluster → Cluster-Gruppen → Welt). Knotentypen unterscheiden sich durch Form, Ring oder Größe, nicht durch neue Farben. Dazu feine Datenströme.
- **Technik:** Bei tausenden Knoten nicht mehr jede Position pro Frame in JS rechnen. Die Animation gehört in den Vertex-Shader (Attribute für Start, Ziel und Reveal, Uniform p); die CPU rechnet nur den inneren Detail-Graphen. Labels und Datenströme nur in der Nähe der Kamera (Level of Detail).

### 5. Higgsfield vorerst nicht
- Keine Higgsfield-Aufrufe, keine Kostenschätzungen.
- Später sollen einzelne Elemente durch KI-Videos ersetzt werden, die per Scroll gesteuert werden. Halte deshalb die visuellen Ebenen pro Station getrennt und die Zeitachse zentral (Punkt 1), damit eine Station ihr Canvas-Bild später gegen ein scroll-gesteuertes Video tauschen kann. Davon jetzt nichts bauen.

## Harte Regeln
- Design und Marke bleiben: `paper #F7F6F2`, `ink #141414`, `inkMuted #555555`, `silverBorder #E2E0D8`, Silbertöne aus `global.css`, Inter und Plus Jakarta Sans. Keine neuen Farbakzente außer sehr gezielt.
- Jede Aussage aus Dokument 01, Abschnitt 4 steht mindestens einmal auf der Seite. Dopplungen dürfen zusammengelegt werden. Welche Stelle bleibt, schlägst du im Plan vor; der Nutzer gibt frei.
- Keine erfundenen Kunden oder Zahlen. Graph-Labels sind nur illustrativ.
- Alles hängt an p und läuft rückwärts identisch. Zeitbasierte Bewegung gibt es nur als Ambient (Treiben, Datenströme), nie als Haupt-Animation.
- Die Navigation bleibt, wie sie ist.
- Keine Commits und keine Pushes, ohne dass der Nutzer es ausdrücklich verlangt.

## Technische Vorgaben
- Keine neue Abhängigkeit ohne klaren Grund. Für die Stationen reicht eigene Logik, GSAP ist nicht nötig.
- Responsive: Desktop ist Hauptziel. Mobil weniger Knoten, kürzere Strecke, kein horizontaler Überlauf.
- `prefers-reduced-motion`: statische Darstellung, alle Texte lesbar, keine Pin-Strecke, kein Einrasten. Im Browser testen, wie in Dokument 02 („Update 2“) beschrieben: `window.matchMedia` überschreiben, `#journey` per `cloneNode(true)` ersetzen und `(await import('/src/scroll/journey.ts')).mountJourney(clone)` aufrufen.
- Performance: keine Allokationen pro Frame, die Render-Schleife stoppt außerhalb des Sichtbereichs, ein WebGL-Kontext.
- Die Testumgebung rendert per Software mit ca. 2 fps. Das Scroll-Gefühl aus Punkt 1 lässt sich dort nicht beurteilen. Sag das offen und bitte den Nutzer, es auf einem echten Gerät zu prüfen (Trackpad, Mausrad, Touch).
- Dev-Server: Das Browser-Pane kann `npm run dev` im Documents-Ordner nicht starten (EPERM). Starte den Server per Shell und hänge das Pane über `/Users/vincentgrueneklee/Documents/vinje/.claude/launch.json` an die URL `http://localhost:4321` an.

## Vorgehen
1. **Bestandsaufnahme:** Code lesen, `npm run build`, aktuellen Stand im Browser ansehen.
2. **Plan:** eine Stationen-Tabelle (Name, Inhalt, Scroll-Länge Desktop und mobil, Effekt im Übergang danach) und eine Liste der Dopplungen mit Vorschlag, welche Stelle bleibt. Auf Freigabe warten, bevor Texte entfernt oder zusammengelegt werden. Alles andere darfst du vorbereiten.
3. **Umsetzung** in dieser Reihenfolge: Stationen-Logik und Tempo (1) → oberste Ansicht (2) → Graph-Welt und Detail-Zooms (4) → unterer Teil (3).
4. **Prüfung im Browser:** von oben nach unten und zurück, Desktop und Mobil, Reduced Motion, Tastatur-Navigation (Tab durch alle Buttons und Formularfelder, Anker-Links), Konsole ohne Fehler, `npm run build` läuft.
5. **Doku:** neuer Abschnitt „Update 3“ in `docs/scroll-experience/02-uebergabe-neuer-chat.md`, dann Abschlussbericht.

## Was du am Ende zurückgibst
- Was jetzt läuft und wo (Dateien mit Pfaden)
- Die finale Stationen-Tabelle
- Welche Dopplungen zusammengelegt wurden und wo jede Aussage jetzt steht
- Was nicht geprüft werden konnte (Scroll-Gefühl auf echter Hardware, echte Bildrate auf GPU)
- Offene Entscheidungen für den Nutzer
