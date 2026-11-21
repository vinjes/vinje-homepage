Du übernimmst das Projekt VINJE-Homepage (Astro 7, Tailwind 4, Three.js) im Repo `/Users/vincentgrueneklee/Documents/vinje/vinje-homepage`, Branch `higgsfield`. Arbeite auf Deutsch.

## Ausgangslage
Ein früherer Chat hat eine erste Scroll-Experience gebaut. Sie funktioniert und der Nutzer findet sie gut, aber sie ist noch nicht fertig. Lies zuerst, ohne etwas zu ändern:
- `docs/scroll-experience/01-bestandsaufnahme-und-creative-direction.md` (Design, Texte, Szenenplan, Storyboard)
- `docs/scroll-experience/02-uebergabe-neuer-chat.md` (Stand, Regeln)
- `src/scroll/journey.ts` (Three.js-Szene: Partikel, Graph, Kamera, Scroll-Fortschritt p)
- `src/components/Journey.astro` (Overlay-Texte, Layout, Fallback)
- `src/pages/index.astro` und `src/components/Hero.astro`

Der aktuelle Stand (uncommitted, `git status` zeigt es): `Journey.astro` steht als eigener Abschnitt zwischen Hero und Leistungen. Das Problem: Die Seite startet mit dem unveränderten Hero, und die Animationen beginnen erst darunter. Das ist falsch.

## Was der Nutzer will
1. **Animation ab dem allerersten Bild.** Der Scroll-Effekt muss direkt oben auf der Seite beginnen, also schon im Hero-Bereich. Die Hero-Typografie (H1, Subline, CTAs, Vertrauenspunkte) bleibt als Inhalt erhalten, wird aber in die Scroll-Inszenierung eingebettet. Es darf kein statischer Hero über einer Animation liegen, die erst darunter startet. Die Navigation bleibt wie sie ist.
2. **E-Mails, die reinkommen und sortiert werden, als Scroll-Element.** Das fehlt bisher komplett. Umsetzungsidee: Umschläge (oder einfache Briefsymbole als Punkte/Sprites) fliegen vom Rand ins Bild, werden nach Kategorie sortiert (z. B. Anfrage, Angebot, Rechnung, Support) und laufen danach in den Knowledge Graph ein. Die Sortierung und Ankunft hängen am Scroll-Fortschritt p. Rückwärts-Scrollen muss sie sauber rückwärts abspielen.
3. **Den Knowledge Graph neu aufbauen**, auf Basis des bisherigen Builds. Das Scrollen ist gut, daran nichts Grundlegendes ändern. Der Graph soll dichter und hochwertiger werden. Die Bewegung der Kamera bleibt, Feinschliff ist erlaubt.
4. **Higgsfield testweise nutzen**, für wenige, gezielte Assets (z. B. ein Hintergrund-Standbild oder eine kurze Textur). Der Nutzer hat nur **10 Credits**. Es darf kein Video mit teuren Einstellungen laufen.

## Harte Regeln
- **Higgsfield-Kosten zuerst schätzen.** Vor jedem `generate_*`-Aufruf `estimate_video_cost` bzw. die passende Kostenschätzung (Bild/Audio) aufrufen, das Ergebnis dem Nutzer nennen und seine Freigabe abwarten. Ohne Freigabe nichts generieren.
- Bekannter Stand: `seedance_2_5`, 5 s, 16:9 = **35 Credits**, also nicht nutzbar. Prüfe günstigere Optionen (Bilder, kurze Clips, günstigere Modelle), bevor du etwas vorschlägst. Kosten für Modelle, die du nicht gemessen hast, nicht schätzen.
- Das Referenzvideo aus dem ursprünglichen Prompt liegt nicht vor. Die Vorlage ist das Storyboard in Dokument 01, Abschnitt 5.
- Design und Markenidentität bleiben: `paper #F7F6F2`, `ink #141414`, `inkMuted #555555`, `silverBorder #E2E0D8`, Inter und Plus Jakarta Sans. Keine neuen Farbakzente außer sehr gezielt.
- Texte bleiben erhalten (Quelle: Dokument 01, Abschnitt 4). Keine erfundenen Kunden oder Zahlen. Graph-Labels sind nur illustrativ.
- Keine Commits und keine Pushes, ohne dass der Nutzer es ausdrücklich verlangt.
- Keine Credit-Käufe oder Kontoänderungen.

## Technische Vorgaben
- Gleicher Ansatz wie bisher: Ein sticky Three.js-Canvas, dessen Zustand allein vom Scroll-Fortschritt abhängt. Keine einmaligen Fade-ins als Hauptanimation.
- Ergänze die Scroll-Timeline um den Email-Abschnitt und den Start beim Hero. Die Szenen in `journey.ts` müssen dafür nicht komplett neu, aber die Start-Phase muss in den Hero rutschen.
- Responsive: Desktop ist Hauptziel. Mobil reduzierte Partikel- und Knotenzahl, kein horizontaler Überlauf (bereits geprüft, nicht verschlechtern).
- `prefers-reduced-motion`: statisches Endbild, alle Texte lesbar. Diese Variante ist bisher nur im Code, nicht im Browser getestet. Prüfe sie.
- Performance: Die Testumgebung rendert per Software und läuft nur mit ca. 2 fps. Das ist kein echter Maßstab. Vermeide trotzdem unnötige Allokationen pro Frame.

## Vorgehen
1. Bestandsaufnahme: Repo, Build (`npm run build`) und den aktuellen Stand im Browser ansehen (`npm run dev`, Port 4321).
2. Kurzer Plan mit den Schritten und einer Liste der Higgsfield-Assets, die du brauchst, mit geschätzten Kosten. Auf Freigabe des Nutzers warten, bevor du Credits ausgibst.
3. Umsetzung: Hero in die Scroll-Inszenierung integrieren, Email-Szene, Graph-Feinschliff, Assets einbinden.
4. Prüfung im Browser: Scroll von oben nach unten und zurück, Desktop und Mobil, Reduced Motion, Konsole ohne Fehler, `npm run build` läuft.
5. Doku in `docs/scroll-experience/` aktualisieren, Abschlussbericht mit verbleibenden Punkten und Credit-Stand.

## Was du am Ende zurückgibst
- Was jetzt läuft und wo (Dateien mit Pfaden)
- Welche Higgsfield-Assets erzeugt wurden und was sie gekostet haben (Credits vorher/nachher)
- Was nicht geprüft werden konnte (z. B. echte Bildrate auf GPU)
- Offene Entscheidungen für den Nutzer
