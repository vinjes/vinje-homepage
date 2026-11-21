/*
 * Zentrale Zeitachse der Scroll-Experience.
 * Stationen (Text, wichtige Bilder) bekommen viel Scroll-Strecke für wenig p: das Bild steht, Text schaltet langsam frei.
 * Übergänge (move) laufen im normalen Tempo; dort liegen Kamerafahrten und Effekte.
 * Aus dieser Liste folgen Scroll-Längen (Journey.astro), p-Bereiche, Overlay-Zeiten und Kamera-Stationen (journey.ts).
 * Spätere scroll-gesteuerte Videos lesen dieselben p-Bereiche über at() und local().
 */

export interface Segment {
  id: string;
  kind: 'station' | 'move';
  vh: [number, number]; // Scroll-Länge [Desktop, Mobil] in vh; bei flow nur Gewicht für p bzw. Mindesthöhe
  flow?: boolean; // Inhalt im normalen Fluss über der Bühne (unterer Teil); Länge = Höhe des Inhalts
}

export const TIMELINE: Segment[] = [
  { id: 'hero', kind: 'station', vh: [40, 25] }, // erstes Bild, bewusst kurz (Plan 05)
  { id: 'to-flood', kind: 'move', vh: [80, 50] },
  { id: 'flood', kind: 'station', vh: [100, 70] },
  { id: 'to-sort', kind: 'move', vh: [60, 40] },
  { id: 'sort', kind: 'station', vh: [100, 70] },
  { id: 'to-graph', kind: 'move', vh: [80, 50] },
  { id: 'graph', kind: 'station', vh: [100, 70] },
  { id: 'to-email', kind: 'move', vh: [50, 35] },
  { id: 'zoom-email', kind: 'station', vh: [100, 60] },
  { id: 'to-flow', kind: 'move', vh: [50, 35] },
  { id: 'workflow', kind: 'station', vh: [140, 100] },
  { id: 'to-call', kind: 'move', vh: [70, 45] },
  { id: 'call', kind: 'station', vh: [140, 100] }, // backcall: zweiter Kanal nach dem E-Mail-Workflow
  { id: 'to-project', kind: 'move', vh: [50, 35] },
  { id: 'zoom-project', kind: 'station', vh: [100, 60] },
  { id: 'to-result', kind: 'move', vh: [100, 60] },
  { id: 'result', kind: 'station', vh: [100, 70] },
  { id: 'to-services', kind: 'move', vh: [80, 50] },
  // Unterer Teil: Inhalt scrollt nativ über der weiterlaufenden Bühne
  { id: 'services-ki', kind: 'station', vh: [110, 80], flow: true },
  { id: 'services-ml', kind: 'station', vh: [110, 80], flow: true },
  { id: 'services-bi', kind: 'station', vh: [110, 80], flow: true },
  { id: 'stack-eu', kind: 'station', vh: [90, 70], flow: true },
  { id: 'process', kind: 'station', vh: [160, 110], flow: true },
  { id: 'about', kind: 'station', vh: [120, 90], flow: true },
  { id: 'contact', kind: 'station', vh: [120, 100], flow: true },
];

// Mindesthöhe eines Blocks im unteren Teil (Desktop/Mobil) als CSS-Variablen für .journey-block
export const segStyle = (id: string) => {
  const s = TIMELINE.find((x) => x.id === id);
  if (!s) throw new Error(`Unbekanntes Segment: ${id}`);
  return `--seg-d: ${s.vh[0]}vh; --seg-m: ${s.vh[1]}vh;`;
};

// p pro vh an Stationen im Verhältnis zu Übergängen (Plateau)
export const STATION_SPEED = 0.25;

const weight = (s: Segment) => s.vh[0] * (s.kind === 'station' ? STATION_SPEED : 1);
const total = TIMELINE.reduce((sum, s) => sum + weight(s), 0);

// p-Bereich je Segment
export const P: Record<string, [number, number]> = {};
let acc = 0;
for (const s of TIMELINE) {
  const p0 = acc / total;
  acc += weight(s);
  P[s.id] = [p0, acc / total];
}

const range = (id: string) => {
  const r = P[id];
  if (!r) throw new Error(`Unbekanntes Segment: ${id}`);
  return r;
};

// p an Stelle t (0..1, auch darüber hinaus) innerhalb eines Segments
export const at = (id: string, t: number) => {
  const [a, b] = range(id);
  return a + (b - a) * t;
};

/*
 * Scroll-Anteil t (0..1) des Segments i → Anteil an seinem p-Bereich.
 * Übergänge bremsen zu Stationen hin weich ab (Hermite-Kurve; Tempo an der Kante = Stationstempo, in der Mitte schneller).
 * Das ist die Dämpfung, mit der das Bild an Stationen einrastet, ohne den Scroll selbst anzufassen.
 * CSS-Scroll-Snap wurde verworfen: Chrome hält Pfeiltasten an den Kanten von Snap-Flächen fest.
 */
export function easeSegment(i: number, t: number) {
  if (TIMELINE[i].kind === 'station') return t;
  const m0 = TIMELINE[i - 1]?.kind === 'station' ? STATION_SPEED : 1;
  const m1 = TIMELINE[i + 1]?.kind === 'station' ? STATION_SPEED : 1;
  const t2 = t * t;
  const t3 = t2 * t;
  return (t3 - 2 * t2 + t) * m0 + (3 * t2 - 2 * t3) + (t3 - t2) * m1;
}

// Fortschritt 0..1 innerhalb eines Segments
export const local = (id: string, p: number) => {
  const [a, b] = range(id);
  return Math.min(1, Math.max(0, (p - a) / (b - a)));
};

export const span = (id: string) => {
  const [a, b] = range(id);
  return b - a;
};

// 0 an beiden Enden eines Segments, 1 in der Mitte: Effekte, die nur im Übergang leben (Rolle, Dolly-Zoom, Aufleuchten)
export const bump = (id: string, p: number) => Math.sin(Math.PI * local(id, p));
