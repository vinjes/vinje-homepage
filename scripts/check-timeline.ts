// Selbstprüfung der Zeitachse: node scripts/check-timeline.ts
import assert from 'node:assert/strict';
import { P, STATION_SPEED, TIMELINE, at, bump, easeSegment, local, segStyle } from '../src/scroll/timeline.ts';

let prev = 0;
for (const s of TIMELINE) {
  const [a, b] = P[s.id];
  assert.ok(Math.abs(a - prev) < 1e-12, `${s.id} schließt nicht an`);
  assert.ok(b > a, `${s.id} hat keine Länge`);
  prev = b;
}
assert.ok(Math.abs(prev - 1) < 1e-12, 'Zeitachse endet nicht bei p = 1');

// Plateau: Stationen bekommen weniger p pro Scroll-Strecke als jeder Übergang
const rate = (s: (typeof TIMELINE)[number]) => (P[s.id][1] - P[s.id][0]) / s.vh[0];
const stations = TIMELINE.filter((s) => s.kind === 'station');
const moves = TIMELINE.filter((s) => s.kind === 'move');
for (const s of stations) for (const m of moves) assert.ok(rate(s) < rate(m), `${s.id} ist kein Plateau gegenüber ${m.id}`);

// Verweildauer: Desktop mindestens 30vh, mobil kürzer, aber vorhanden; die ganze gepinnte Strecke höchstens 200vh (kurzer Auftakt).
// Ausnahme hero: erstes Bild, gepinnt und bewusst kurz, damit die Bewegung sofort beginnt (Plan 05).
// Unterer Teil (flow): vh ist Mindesthöhe, der Inhalt bestimmt die echte Länge.
for (const s of stations) {
  assert.ok(s.vh[1] > 0 && s.vh[1] <= s.vh[0], `${s.id}: mobil länger als Desktop`);
  if (s.id !== 'hero' && !s.flow) assert.ok(s.vh[0] >= 30, `${s.id}: Haltestrecke unter 30vh`);
}
const pinned = TIMELINE.filter((s) => !s.flow).reduce((sum, s) => sum + s.vh[0], 0);
assert.ok(pinned <= 200, `gepinnte Strecke ${pinned}vh zu lang`);
assert.equal(TIMELINE[0].id, 'hero');
// flow-Segmente stehen geschlossen am Ende (sie liegen im DOM nach der Strecke), davor ein Übergang
const firstFlow = TIMELINE.findIndex((s) => s.flow);
assert.ok(TIMELINE.slice(firstFlow).every((s) => s.flow && s.kind === 'station'), 'flow-Segmente nicht am Ende');
assert.equal(TIMELINE[firstFlow - 1].kind, 'move');
assert.equal(segStyle('process'), '--seg-d: 80vh; --seg-m: 60vh;');
assert.ok(Math.abs(bump('to-graph', at('to-graph', 0.5)) - 1) < 1e-9 && Math.abs(bump('to-graph', at('to-graph', 0))) < 1e-9);

// Dämpfung: Übergänge laufen monoton von 0 bis 1 und kommen mit Stationstempo an der Station an
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;
TIMELINE.forEach((s, i) => {
  assert.equal(easeSegment(i, 0), 0);
  assert.ok(near(easeSegment(i, 1), 1), `${s.id}: Ende`);
  for (let t = 0; t < 1; t += 0.01) assert.ok(easeSegment(i, t + 0.01) >= easeSegment(i, t), `${s.id}: nicht monoton`);
  if (s.kind !== 'move') return;
  const h = 1e-5;
  if (TIMELINE[i + 1]?.kind === 'station') assert.ok(near((1 - easeSegment(i, 1 - h)) / h, STATION_SPEED, 1e-3), `${s.id}: Ende nicht gedämpft`);
  if (TIMELINE[i - 1]?.kind === 'station') assert.ok(near(easeSegment(i, h) / h, STATION_SPEED, 1e-3), `${s.id}: Anfang nicht gedämpft`);
});

assert.ok(Math.abs(local('graph', at('graph', 0.25)) - 0.25) < 1e-12);
assert.equal(local('graph', -1), 0);
assert.equal(local('graph', 2), 1);
assert.throws(() => at('gibt-es-nicht', 0));

console.log('timeline ok:', TIMELINE.map((s) => `${s.id} ${P[s.id].map((v) => v.toFixed(3)).join('–')}`).join(' · '));
