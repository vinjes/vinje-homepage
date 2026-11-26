# Higgsfield: KI-Videos für die Scroll-Experience

Stand: 2026-11-22 · Keyframes liegen in `docs/scroll-experience/keyframes/` (1920×1080, ohne Text). Generiert wird im **Claude-Chat (claude.ai) mit dem Higgsfield-MCP**: Dort sind Test-Generierungen unbegrenzt. In Claude Code bietet der Connector kein Generier-Tool.

---

## 1. Das Konzept in einem Satz

Die Three.js-Bühne bleibt. KI-Videos ersetzen nur die **Übergänge** zwischen den Stationen und geben ihnen echte Kinomotion: Tiefenschärfe, weiches Licht, Bewegungsunschärfe. Das kann der Canvas nicht gut. Start- und Endbild jedes Clips sind **Screenshots der echten Seite**. So beginnt und endet jedes Video genau im Bild der Station, und der Wechsel zwischen Canvas und Video fällt nicht auf.

Warum nicht die ganze Seite als Video?
- Die Stationen sind interaktiv und responsiv (Labels, Pfade, Personen). Ein Video kann das nicht.
- `timeline.ts` ist schon darauf vorbereitet: Jede Station und jeder Übergang hat einen eigenen p-Bereich (`at()`, `local()`). Ein Video wird an genau diesen Bereich gekoppelt und läuft beim Zurückscrollen rückwärts.

Der Hero bekommt zusätzlich einen **nahtlosen Loop**, damit der Stern schon vor dem ersten Scroll lebt.

---

## 2. Welche Clips (nach Priorität)

| # | Clip | Ersetzt in `timeline.ts` | Dauer | Start-Bild | End-Bild |
|---|---|---|---|---|---|
| 0 | Hero-Loop: Stern atmet | Station `hero` | 6 s | `hero` | `hero` (gleiches Bild) |
| 1 | Stern zerfällt in die Flut | `to-flood` | 5 s | `hero` | `flood` |
| 2 | Chaos ordnet sich in vier Raster | `to-sort` | 5 s | `flood` | `sort` |
| 3 | Raster lösen sich zum Graphen | `to-graph` | 5 s | `sort` | `graph` |
| 4 | Großer Herauszoom in die Welt | `to-result` | 6 s | `zoom-project` | `result` |

Fang mit **0 und 1** an. Wenn die passen, lohnt sich der Rest. `to-email`, `to-flow`, `to-call` sind kurze Kamerafahrten im Graphen; die macht der Canvas schon gut.

---

## 3. Schritt für Schritt

### 3.1 Keyframes (erledigt)
In `docs/scroll-experience/keyframes/`, aufgenommen in der Mitte jedes Plateaus, Text, Header, Labels und Fortschrittsbalken ausgeblendet:

| Datei | Zeigt |
|---|---|
| `kf-hero.png` | Partikel-Stern rechts, Silberwellen oben und unten |
| `kf-flood.png` | Viele Briefumschlag-Outlines und Punkte, verstreut, rechts dichter |
| `kf-sort.png` | Umschläge sauber in vier 4×4-Rastern rechts der Mitte, Staub ringsum |
| `kf-graph.png` | Netzwerk aus Knoten mit Ringen und Haarlinien, rechts eine dichte Säule |
| `kf-zoom-project.png` | Ellipse mit sechs Knoten um einen Mittelknoten, unten eine gepunktete Bahn |
| `kf-result.png` | Weite Welt aus vielen kleinen Clustern, in der Mitte ein kleiner Planet mit Ring |

Neu aufnehmen (z. B. nach Design-Änderungen): Dev-Server starten, dann das Skript `scripts/keyframes.mjs` laufen lassen (siehe Kopf der Datei). Mobil (1080×1920) ist noch nicht aufgenommen.

### 3.2 Im Claude-Chat generieren
1. Neuen Chat auf claude.ai öffnen, Higgsfield-Connector aktivieren.
2. Die zwei Keyframes des Clips hochladen (Start- und Endbild).
3. Diese Nachricht schicken (Prompt aus Abschnitt 4 plus Stil-Block und Verbote einsetzen):
   ```
   Generiere mit Higgsfield ein Video: Modell Seedance 2.5, Modus omni_reference, Bild 1 als start_image, Bild 2 als end_image, 16:9, 5 Sekunden, generate_audio false, erst als draft. Prompt:
   <Shot-Prompt + Stil-Block + Verbote>
   ```
4. Passt der Entwurf, im selben Chat finalisieren lassen: „Finalisiere den Draft in 1080p, bitrate_mode high.“
5. MP4 herunterladen und als `<segment-id>.mp4` in `vinje-homepage/higgsfield/raw/` ablegen (z. B. `to-flood.mp4`, `hero-loop.mp4`).

Weil die Tests unbegrenzt sind: pro Clip ruhig 3–4 Varianten erzeugen und die ruhigste nehmen. Falls Seedance 2.5 Start- und Endbild schlecht trifft, dasselbe mit **MiniMax H3** oder **FLUX 3 Video** probieren (beide nehmen start_image und end_image).

### 3.3 Prompt zusammensetzen
Jeder Prompt besteht aus drei Teilen, in dieser Reihenfolge:
1. **Shot-Prompt** (Abschnitt 4, je Clip)
2. **Stil-Block** (immer gleich)
3. **Verbote** (immer gleich)

Englisch funktioniert bei diesen Modellen zuverlässiger als Deutsch.

**Stil-Block** (an jeden Prompt anhängen):
```
Style: minimal, calm, high-end product film, like an Apple keynote interlude. Warm off-white paper background (#F7F6F2), flat and evenly lit, no vignette, background color never changes. All elements are deep ink black (#141414) or soft silver grey, nothing else. Tiny round particles and hairline-thin lines, crisp in focus, with gentle shallow depth of field and soft round bokeh on out-of-focus particles. Weightless, slow, smooth easing, one continuous shot, no cuts.
```

**Verbote** (an jeden Prompt anhängen):
```
Avoid: text, letters, numbers, logos, UI, icons, people, faces, hands, color accents, neon, heavy glow or bloom, lens flares, dark background, gradients or blobs, film grain, camera shake, sudden speed changes, cuts, morphing into objects.
```

---

## 4. Shot-Prompts

### Clip 0 – Hero-Loop (Start = Ende = `kf-hero.png`, 6 s)
```
Locked-off camera, completely static. The star-shaped cloud of small ink-black particles breathes slowly: each particle drifts a few pixels around its resting position and returns, like a calm exhale. Once, a soft silver light sweeps diagonally across the star from top left to bottom right, catching a few particles that briefly turn silver. The silver silk waves in the background flow very slowly. The last frame is identical to the first frame, creating a seamless loop.
```
Prüfen: Behält der Stern seine Form? Wenn er verformt, die Bewegung im Prompt verkleinern („a few pixels“ → „barely moving“).

### Clip 1 – Stern zerfällt in die Flut (`kf-hero` → `kf-flood`, 5 s)
```
Slow dolly-in towards the star-shaped particle cloud. As the camera approaches, the star gently loosens: particles detach from its edges first, then from the center, and drift outward in all directions like dandelion seeds in still air. Out of the drifting particles, small flat envelope shapes and dots fade in and tumble slowly through the frame at different depths, the nearest ones softly out of focus. The motion settles into the composition of the final frame.
```

### Clip 2 – Chaos ordnet sich in vier Raster (`kf-flood` → `kf-sort`, 5 s)
```
Slow lateral dolly to the right. The scattered envelope outlines drifting at different depths feel an invisible pull: they slow down, rotate to face the camera, and glide into place one after another, assembling into four neat square grids of four by four envelopes, side by side. Envelopes that land briefly catch a soft silver highlight. The remaining loose dots settle into a faint, slowly drifting dust around the grids. The motion ends calmly in the exact layout of the final frame.
```

### Clip 3 – Raster lösen sich zum Graphen (`kf-sort` → `kf-graph`, 5 s)
```
Slow push-in with a gentle arc to the left. The four envelope grids dissolve: each envelope shrinks into a round ink-black node, and the nodes drift apart into small clusters, each gathering around a larger hub node with a thin ring. Hairline-thin connection lines grow between related nodes one after another, like ink drawn by a fine pen, and long faint lines link distant clusters. Focus shifts softly from foreground nodes to the background clusters. The network comes to rest exactly as in the final frame.
```

### Clip 4 – Herauszoom in die Welt (`kf-zoom-project` → `kf-result`, 6 s)
```
Smooth continuous pull-back, accelerating gently, then easing out. The ellipse of six nodes around a central hub shrinks into a single tiny cluster as the camera rises away from it. Around it, many more small star-shaped clusters of nodes appear, revealed from the inside outward and connected by faint hairline edges, until a wide sparse world of clusters fills the right half of the frame. A small ringed sphere floats near the center. Near particles pass by softly out of focus. Everything settles into the final frame.
```

---

## 5. Prüfen und nachbearbeiten

### Abnahme je Clip (vor dem Fertigstellen des Entwurfs)
- Erstes und letztes Bild stimmen mit den Screenshots überein (Position, Größe, Dichte).
- Hintergrund bleibt papierhell, keine Farbwanderung, kein Vignettieren.
- Keine Schrift, keine Symbole, keine Farbe außer Schwarz und Silber.
- Bewegung gleichmäßig, kein Ruck in der Mitte (beim Scrubben fällt jeder Ruck auf).

### Hintergrund angleichen
KI-Modelle verschieben das Off-White fast immer leicht. Statt nachzufärben: Das Video im Browser mit `mix-blend-mode: multiply` über den papierfarbenen Hintergrund legen. Helle Flächen verschwinden dann, nur Partikel und Linien bleiben. Das passt auch, wenn der Ton um ein paar Stufen abweicht.

### Für Scroll-Steuerung kodieren
Ein Video, das per Scroll vor- und zurückspringt, braucht viele Keyframes, sonst ruckelt es. Mit ffmpeg:
```bash
ffmpeg -i higgsfield/raw/to-flood.mp4 -an -vf "scale=1600:-2,fps=30" -c:v libx264 -preset slow -crf 23 -g 1 -pix_fmt yuv420p -movflags +faststart public/video/to-flood.mp4
```
`-g 1` macht jedes Bild zum Keyframe. Bei 5 s bleibt die Datei trotzdem bei wenigen MB. Ist sie zu groß, `-crf 26` oder `-g 4`.

Den Hero-Loop normal kodieren (`-g 30` statt `-g 1`), der läuft einfach ab und wird nicht gescrubbt.

### Mobil und Reduced Motion
- Mobil: entweder eigene 9:16-Clips oder dort beim Canvas bleiben. Empfehlung für den Anfang: beim Canvas bleiben, das spart die Hälfte der Credits.
- `prefers-reduced-motion`: keine Videos laden, die bestehende statische Darstellung bleibt.

---

## 6. Einbau (wenn die Clips da sind)

Nicht gebaut, nur als Plan:
- Pro Clip ein `<video muted playsinline preload="auto">` in der Stage von `Journey.astro`, über dem Canvas, mit `mix-blend-mode: multiply`.
- In `update(p)` in `journey.ts`: `video.currentTime = local('to-flood', p) * video.duration`, Deckkraft an den Rändern des p-Bereichs kurz über- und ausblenden.
- Hero-Loop: `autoplay loop`, blendet mit dem bestehenden `star`-Tween aus.
- Dateien unter `public/video/`.

Rohdateien liegen in `higgsfield/raw/`, die kodierten Fassungen kommen nach `public/video/`. Dann kann der Einbau in einer neuen Runde passieren.
