import * as THREE from 'three';
import { starPoints } from './star';
import { P, TIMELINE, at, bump, easeSegment, local, span } from './timeline';
import { buildVoice, circle } from './voice';
import { SERVICE_GROUPS, buildWorld } from './world';

/*
 * Scroll-Experience: Ein sticky Canvas, dessen Zustand allein vom Scroll-Fortschritt p (0..1) abhängt.
 * Vorwärts und rückwärts laufen dadurch identisch. Zeitachse und Stationen: timeline.ts.
 * Ablauf: vinje-Stern → E-Mails → Fächer → Knowledge Graph → Detail Email → Workflow → backcall → Detail Project
 * → Welt aus Clustern → unterer Teil (Leistungen, Ablauf, Über uns, Kontakt) über derselben Bühne.
 * Eigene Ebenen je Station: Stern (hier), Welt (world.ts), backcall (voice.ts), Detail-Szenen (makeDetail).
 */

type Vec3 = [number, number, number];
interface Pose {
  pos: Vec3;
  look: Vec3;
}

const FOV = 42;
const CLUSTER_NAMES = ['Customer', 'Email', 'Project', 'Invoice', 'Knowledge', 'Task', 'Call', 'Document', 'Employee'];
const K = CLUSTER_NAMES.length;
// Glättung des Scroll-Fortschritts pro Sekunde (bildratenunabhängig)
const P_DAMP = 7;
// Dauer (in p) einzelner Bewegungen als Anteil ihres Übergangs: Umschlag fliegt ein, wird einsortiert, läuft in den Graphen
const ENV_FLY = span('to-flood') * 0.35;
const ENV_SORT = span('to-sort') * 0.45;
const ENV_MERGE = span('to-graph') * 0.4;
// Einblenden eines Graph-Knotens bzw. Wachsen einer Kante
const RV = span('to-graph') * 0.3;
// Anteil einer Station, über den Zeilen bzw. Workflow-Schritte freischalten (danach steht alles)
const REVEAL_END = 0.5;
const STEPS_END = 0.7;
// E-Mail-Fächer (Anfrage, Angebot, Rechnung, Support) → Ziel-Cluster (Customer, Project, Invoice, Knowledge)
const BIN_CLUSTER = [0, 2, 3, 4];
// Signalpfad der backcall-Station: Planet → Call → Knowledge → Task → Employee
const CALL_CLUSTERS = [6, 4, 5, 8];
const ENV_SIZE = 0.42;
// Feste Orte in der Welt: backcall-Planet, Ablauf-Pfad, Vincent & Jesse
const VOICE_DESK = new THREE.Vector3(9.5, 1.6, 4); // rechts neben dem Graphen, Signal läuft nach links hinein
const VOICE_MOBILE = new THREE.Vector3(1.5, 8.5, 2); // mobil über dem Graphen
const VOICE_R = 1.5;
const PROCESS_C = new THREE.Vector3(-8, -27, 10);
const ABOUT_C = new THREE.Vector3(14, -30, 6);
const INK = new THREE.Color('#141414');
const EDGE = new THREE.Color('#8F8D85');

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const fract = (x: number) => x - Math.floor(x);
// 0 außerhalb von [a, b], 1 in der Mitte
const win = (a: number, b: number, x: number) => Math.sin(Math.PI * clamp((x - a) / (b - a)));

// Deterministischer Zufall, damit Graph und Partikel bei jedem Laden gleich aussehen
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Graph {
  count: number;
  final: Float32Array; // Zielposition je Knoten (nach dem Ordnen)
  scatter: Float32Array; // Startposition (verstreut)
  size: Float32Array;
  tone: Float32Array; // 0 = Ink, 1 = Silber
  ring: Float32Array; // 1 = Hub mit Ring
  reveal: Float32Array; // Scroll-Wert, ab dem der Knoten erscheint
  cluster: Uint8Array;
  pairs: [number, number][];
  edges: Uint16Array; // Knotenpaare, nach Erscheinen sortiert (orderEdges)
  edgeReveal: Float32Array; // aufsteigend sortiert
  centers: THREE.Vector3[];
  path: number[]; // Workflow-Kette aus 6 Knoten
}

function buildGraph(count: number, seed = 42): Graph {
  const rand = mulberry32(seed);
  const bell = () => rand() + rand() + rand() - 1.5;
  const R = 5.4;

  const centers: THREE.Vector3[] = [];
  for (let k = 0; k < K; k++) {
    const y = 1 - (k / (K - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = k * 2.399963;
    centers.push(new THREE.Vector3(Math.cos(th) * r * R, y * R * 0.8, Math.sin(th) * r * R * 0.6));
  }
  // Zwei Unterzentren je Cluster mit eigenem Hub: Cluster zeigen Struktur statt einer Wolke
  const subs = centers.flatMap((c) => [0, 1].map(() => c.clone().add(new THREE.Vector3(bell() * 1.7, bell() * 1.7, bell() * 1.2))));
  const subHub = new Array<number>(K * 2).fill(-1);

  const final = new Float32Array(count * 3);
  const scatter = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const tone = new Float32Array(count);
  const ring = new Float32Array(count);
  const reveal = new Float32Array(count);
  const cluster = new Uint8Array(count);
  const hubOf = new Uint16Array(count);

  for (let i = 0; i < count; i++) {
    const c = i % K;
    const si = c * 2 + (Math.floor(i / K) % 2);
    const isHub = subHub[si] < 0; // die ersten 2K Knoten sind die Hubs
    if (isHub) subHub[si] = i;
    hubOf[i] = subHub[si];
    cluster[i] = c;
    const sc = subs[si];
    const spread = isHub ? 0 : 0.9;
    final[i * 3] = sc.x + bell() * spread;
    final[i * 3 + 1] = sc.y + bell() * spread;
    final[i * 3 + 2] = sc.z + bell() * spread * 0.8;

    const u = rand() * 2 - 1;
    const th = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const rad = 7 + rand() * 4;
    scatter[i * 3] = Math.cos(th) * s * rad;
    scatter[i * 3 + 1] = u * rad;
    scatter[i * 3 + 2] = Math.sin(th) * s * rad;

    ring[i] = isHub ? 1 : 0;
    size[i] = isHub ? 0.3 : 0.032 + rand() ** 3 * 0.07;
    tone[i] = isHub ? 0 : 0.15 + rand() * 0.65;
    // Der Graph wächst im Übergang zur Graph-Station; dort steht er
    reveal[i] = isHub ? at('to-graph', 0.05 + rand() * 0.3) : lerp(at('to-graph', 0.15), at('graph', 0) - RV, rand());
  }

  const seen = new Set<number>();
  const pairs: [number, number][] = [];
  const add = (a: number, b: number | undefined) => {
    if (b === undefined || a === b) return;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const key = lo * count + hi;
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push([lo, hi]);
  };
  const d2 = (a: number, b: number) => {
    const dx = final[a * 3] - final[b * 3];
    const dy = final[a * 3 + 1] - final[b * 3 + 1];
    const dz = final[a * 3 + 2] - final[b * 3 + 2];
    return dx * dx + dy * dy + dz * dz;
  };

  // Kanten: Speichen zum Hub, 2 nächste Nachbarn im Cluster, selten ein Querverweis
  const members: number[][] = Array.from({ length: K }, () => []);
  for (let i = 0; i < count; i++) members[cluster[i]].push(i);
  for (let i = 0; i < count; i++) {
    if (!ring[i] && rand() < 0.6) add(i, hubOf[i]);
    const near = members[cluster[i]].filter((j) => j !== i).sort((a, b) => d2(i, a) - d2(i, b));
    add(i, near[0]);
    add(i, near[1]);
    if (!ring[i] && rand() < 0.06) {
      let best = -1;
      for (let j = 0; j < count; j++) if (cluster[j] !== cluster[i] && (best < 0 || d2(i, j) < d2(i, best))) best = j;
      add(i, best);
    }
  }
  // Rückgrat: beide Hubs eines Clusters verbunden, jeder Cluster mit seinen zwei nächsten Nachbar-Clustern
  for (let c = 0; c < K; c++) {
    add(subHub[c * 2], subHub[c * 2 + 1]);
    const order = [...Array(K).keys()]
      .filter((o) => o !== c)
      .sort((a, b) => centers[c].distanceToSquared(centers[a]) - centers[c].distanceToSquared(centers[b]));
    for (const o of order.slice(0, 2)) add(subHub[c * 2 + (o % 2)], subHub[o * 2 + (c % 2)]);
  }

  // Workflow-Pfad: zufällige Kette über Kanten, 6 Knoten, Start an einem Hub
  const adj: number[][] = Array.from({ length: count }, () => []);
  pairs.forEach(([a, b]) => {
    adj[a].push(b);
    adj[b].push(a);
  });
  let path: number[] = [];
  for (let attempt = 0; attempt < 300 && path.length < 6; attempt++) {
    const p = [subHub[Math.floor(rand() * subHub.length)]];
    while (p.length < 6) {
      const opts = adj[p[p.length - 1]].filter((n) => !p.includes(n));
      if (!opts.length) break;
      p.push(opts[Math.floor(rand() * opts.length)]);
    }
    if (p.length === 6) path = p;
  }
  if (!path.length) path = [0, 1, 2, 3, 4, 5];

  return {
    count, final, scatter, size, tone, ring, reveal, cluster, pairs,
    edges: new Uint16Array(0), edgeReveal: new Float32Array(0), centers, path,
  };
}

// Kanten nach Erscheinen sortieren; erst nach allen Änderungen an reveal aufrufen
function orderEdges(g: Graph) {
  const list = g.pairs
    .map(([a, b]) => ({ a, b, r: Math.max(g.reveal[a], g.reveal[b]) + RV * 0.4 }))
    .sort((x, y) => x.r - y.r);
  g.edges = new Uint16Array(list.length * 2);
  g.edgeReveal = new Float32Array(list.length);
  list.forEach((e, i) => {
    g.edges[i * 2] = e.a;
    g.edges[i * 2 + 1] = e.b;
    g.edgeReveal[i] = e.r;
  });
}

// Kamera: feste Pose je Station (ruhiges Bild), Übergänge interpolieren zwischen den Stationen.
// Fehlende Stationen (Detail-Zooms, Workflow, backcall, unterer Teil) werden beim Start aus Graph und Welt berechnet.
const POSES: Record<string, Pose> = {
  hero: { pos: [0, 0.4, 15.5], look: [0, 0, 0] },
  flood: { pos: [0.3, 0.3, 13], look: [0.4, 0, 0] }, // E-Mails kommen an
  sort: { pos: [0, 0.2, 11.5], look: [0, 0, 0] }, // Fächer im Bild
  graph: { pos: [2.6, -0.8, 6], look: [1.2, -0.4, 0] }, // im Graphen
  result: { pos: [-24, 5, 118], look: [-24, 0, 0] }, // die ganze Welt
  'stack-eu': { pos: [-16, 4, 100], look: [-16, 0, 0] },
  contact: { pos: [-3.5, 0.6, 24], look: [-3.5, 0, 0] }, // zurück zum Kern
};
// Zwischenpunkte in Übergängen (Segment, Anteil 0..1, Pose)
const VIAS: { at: string; t: number; pose: Pose }[] = [
  { at: 'to-graph', t: 0.35, pose: { pos: [3.3, 14, 2.2], look: [3.3, 0, 0] } }, // Szene kippt um 90°: Blick von oben auf die Fächer
  { at: 'to-graph', t: 0.72, pose: { pos: [-1.8, 3.2, 7.5], look: [-0.5, 0, 0] } }, // Eintauchen in den Graphen
  { at: 'to-email', t: 0.4, pose: { pos: [3.5, 0.6, 14], look: [0.5, 0, 0] } }, // zurückziehen, alle Kanten leuchten auf
  { at: 'to-flow', t: 0.5, pose: { pos: [-4, 2.5, 15], look: [0, 0, 0] } }, // Herauszoom mit Rolle
  { at: 'to-result', t: 0.45, pose: { pos: [-8, 2, 42], look: [-7, 0, 0] } }, // großer Herauszoom
  { at: 'to-services', t: 0.5, pose: { pos: [-22, 14, 72], look: [-28, 6, -8] } },
];

let KF: { p: number; pos: Vec3; look: Vec3 }[] = [];
function buildKeyframes() {
  const list: typeof KF = [];
  for (const s of TIMELINE) {
    const pose = POSES[s.id];
    if (s.kind !== 'station' || !pose) continue;
    // unterer Teil: Inhalt scrollt durch; das Bild steht, solange der Block die Bildschirmmitte füllt
    const [t0, t1] = s.flow ? [0.3, 0.7] : [0, 1];
    list.push({ p: at(s.id, t0), ...pose }, { p: at(s.id, t1), ...pose });
  }
  for (const v of VIAS) list.push({ p: at(v.at, v.t), ...v.pose });
  KF = list.sort((a, b) => a.p - b.p);
}

function keyframe(p: number, key: 'pos' | 'look', out: Vec3): Vec3 {
  let i = 0;
  while (i < KF.length - 2 && p > KF[i + 1].p) i++;
  const a = KF[i];
  const b = KF[i + 1];
  const t = b.p > a.p ? smooth(a.p, b.p, p) : 1;
  for (let k = 0; k < 3; k++) out[k] = lerp(a[key][k], b[key][k], t);
  return out;
}

function canvasTexture(draw: (g: CanvasRenderingContext2D) => void, px = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const g = c.getContext('2d');
  if (g) draw(g);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Runder Punkt statt Quadrat für Partikel
const dotTexture = () =>
  canvasTexture((g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.45, 'rgba(255,255,255,0.7)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
  });

// Briefumschlag: weiße Fläche, Ink-Kontur, Lasche
const envelopeTexture = () =>
  canvasTexture((g) => {
    g.lineJoin = 'round';
    g.lineWidth = 5;
    g.strokeStyle = '#141414';
    g.fillStyle = '#FFFFFF';
    g.beginPath();
    g.roundRect(14, 32, 100, 66, 9);
    g.fill();
    g.stroke();
    g.beginPath();
    g.moveTo(20, 38);
    g.lineTo(64, 70);
    g.lineTo(108, 38);
    g.stroke();
  }, 128);

// Punkt-Sprites mit Größe und Alpha pro Punkt
const SPRITE_VERTEX = `
  attribute float aSize;
  attribute float aAlpha;
  uniform float uPx;
  varying float vA;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPx / -mv.z;
    gl_Position = projectionMatrix * mv;
    vA = aAlpha;
  }`;

export function mountJourney(section: HTMLElement | null) {
  if (!section) return;
  const stage = section.querySelector<HTMLElement>('[data-stage]');
  const canvas = section.querySelector<HTMLCanvasElement>('[data-canvas]');
  if (!stage || !canvas) return;
  const waves = section.querySelector<HTMLElement>('[data-waves]');
  const lowerVeil = section.querySelector<HTMLElement>('[data-veil-lower]');
  const veil = section.querySelector<HTMLElement>('[data-veil]');
  const heroBits = (['by', 'h1', 'sub'] as const).map((k) => section.querySelector<HTMLElement>(`[data-hero-${k}]`));

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width: 767px)').matches;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: true });
  } catch {
    // Kein WebGL: statische Darstellung über die CSS-Klasse
    section.classList.add('journey-static');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 600);
  const world = new THREE.Group();
  scene.add(world);
  const dot = dotTexture();

  const graph = buildGraph(mobile ? 200 : 520);
  const N = graph.count;
  const nodePos = new Float32Array(N * 3);
  const nodeSize = new Float32Array(N);
  const nodeAlpha = new Float32Array(N);
  const pathSet = new Set(graph.path);
  const hubOfCluster = (c: number) => {
    for (let i = 0; i < N; i++) if (graph.ring[i] && graph.cluster[i] === c) return i;
    return 0;
  };
  const nodeVec = (i: number) => new THREE.Vector3().fromArray(graph.final, i * 3);
  const callHubs = CALL_CLUSTERS.map(hubOfCluster);
  const VOICE_C = mobile ? VOICE_MOBILE : VOICE_DESK;

  // vinje-Stern aus Partikeln: steht im ersten Bild und zerfällt im ersten Übergang (Positionen im Vertex-Shader)
  const S = mobile ? 700 : 1600;
  const srand = mulberry32(5);
  const star2d = starPoints(S, srand);
  const starC = mobile ? new THREE.Vector3(0, 7.4, 0) : new THREE.Vector3(4.4, 0.4, 0);
  const starH = mobile ? 5 : 5.4;
  const starFrom = new Float32Array(S * 3);
  const starTo = new Float32Array(S * 3);
  const starDelay = new Float32Array(S);
  const starSize = new Float32Array(S);
  for (let i = 0; i < S; i++) {
    const x = star2d[i * 2] * starH;
    const y = star2d[i * 2 + 1] * starH;
    const z = (srand() * 2 - 1) * 0.25;
    starFrom.set([x, y, z], i * 3);
    const d = new THREE.Vector3(x, y, z + (srand() - 0.5) * 2).normalize().multiplyScalar(2 + srand() * 7);
    starTo.set([x + d.x + (srand() - 0.5) * 3, y + d.y + (srand() - 0.5) * 3, z + d.z + (srand() - 0.5) * 4], i * 3);
    starDelay[i] = srand();
    starSize[i] = 0.05 + srand() ** 2 * 0.06;
  }
  const uPx = { value: 1 };
  const uFar = { value: 30 };
  const starU = { uT: { value: 0 }, uTime: { value: 0 }, uPx, uInk: { value: INK } };
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starFrom, 3));
  starGeo.setAttribute('aTo', new THREE.BufferAttribute(starTo, 3));
  starGeo.setAttribute('aDelay', new THREE.BufferAttribute(starDelay, 1));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSize, 1));
  const starGroup = new THREE.Group();
  starGroup.position.copy(starC);
  starGroup.add(
    new THREE.Points(
      starGeo,
      new THREE.ShaderMaterial({
        uniforms: starU,
        vertexShader: `
          attribute vec3 aTo;
          attribute float aDelay;
          attribute float aSize;
          uniform float uT;
          uniform float uTime;
          uniform float uPx;
          varying float vA;
          void main() {
            float k = clamp((uT - aDelay * 0.45) / 0.55, 0.0, 1.0);
            k = k * k * (3.0 - 2.0 * k);
            vec3 p = mix(position, aTo, k);
            p.xy += 0.025 * vec2(sin(uTime * 0.8 + aDelay * 40.0), cos(uTime * 0.7 + aDelay * 31.0));
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = aSize * uPx / -mv.z;
            gl_Position = projectionMatrix * mv;
            vA = 1.0 - smoothstep(0.5, 1.0, k);
          }`,
        fragmentShader: `
          uniform vec3 uInk;
          varying float vA;
          void main() {
            float a = (1.0 - smoothstep(0.3, 0.5, length(gl_PointCoord - 0.5))) * vA;
            if (a < 0.01) discard;
            gl_FragColor = vec4(uInk, a);
            #include <colorspace_fragment>
          }`,
        transparent: true,
        depthWrite: false,
      }),
    ),
  );
  world.add(starGroup);

  // E-Mails: entstehen aus dem Stern, werden in vier Fächer sortiert und laufen dann in den Graphen
  const M = mobile ? 32 : 64;
  const perCat = M / 4;
  const bins = mobile
    ? { x: [-2.4, -0.8, 0.8, 2.4], y: 1.9, cols: 2, sp: 0.52 }
    : { x: [0.6, 2.4, 4.2, 6.0], y: 0.3, cols: 4, sp: 0.38 };
  const envBase = mobile ? 0.5 : ENV_SIZE;
  const rows = Math.ceil(perCat / bins.cols);
  const binTop = bins.y + (rows / 2) * bins.sp * 0.8 + 0.35;
  const clusterNodes = BIN_CLUSTER.map((c) => [...Array(N).keys()].filter((i) => graph.cluster[i] === c && !graph.ring[i]));
  const erand = mulberry32(11);
  const envStart = new Float32Array(M * 3);
  const envChaos = new Float32Array(M * 3);
  const envBin = new Float32Array(M * 3);
  const envPh = new Float32Array(M);
  const envIn = new Float32Array(M);
  const envSort = new Float32Array(M);
  const envMerge = new Float32Array(M);
  const envTarget = new Uint16Array(M);
  const stride = Math.floor(S / M);
  for (let i = 0; i < M; i++) {
    const cat = i % 4;
    const k = Math.floor(i / 4);
    const j = i * 3;
    for (let c = 0; c < 3; c++) envStart[j + c] = starFrom[i * stride * 3 + c] + starC.getComponent(c);
    envChaos[j] = mobile ? (erand() * 2 - 1) * 3.6 : -3 + erand() * 10.5;
    envChaos[j + 1] = mobile ? -1.5 + erand() * 6 : (erand() * 2 - 1) * 4.2;
    envChaos[j + 2] = (erand() * 2 - 1) * 2.5;
    const col = k % bins.cols;
    const row = Math.floor(k / bins.cols);
    envBin[j] = bins.x[cat] + (col - (bins.cols - 1) / 2) * bins.sp;
    envBin[j + 1] = bins.y + ((rows - 1) / 2 - row) * bins.sp * 0.8;
    envPh[i] = erand() * Math.PI * 2;
    // Umschläge lösen sich im ersten Übergang aus dem Stern; an der ersten Station sind alle angekommen
    envIn[i] = lerp(at('to-flood', 0.05), at('to-flood', 0.6), erand());
    // Sortieren im Übergang, gestaffelt nach Reihe; an der Fächer-Station liegen alle still
    envSort[i] = lerp(at('to-sort', 0), at('sort', 0) - ENV_SORT, (k / perCat) * 0.7 + erand() * 0.3);
    envMerge[i] = lerp(at('to-graph', 0), at('graph', 0) - ENV_MERGE - RV * 0.2, erand());
    // Die erste Anfrage wird später zum Startknoten des Workflows
    const pool = clusterNodes[cat];
    envTarget[i] = i === 0 ? graph.path[0] : pool[k % pool.length];
    graph.reveal[envTarget[i]] = Math.min(graph.reveal[envTarget[i]], envMerge[i] + ENV_MERGE * 0.75);
  }
  orderEdges(graph);

  // Kamera-Stationen, die von Graph und Welt abhängen
  const shift = mobile ? 0 : 2.4; // Desktop: Motiv rechts neben dem Text
  const lift = mobile ? -1.6 : 0; // Mobil: Motiv über dem Text
  const frame = (pts: THREE.Vector3[], minDist: number, k: number): Pose => {
    const c = new THREE.Vector3();
    for (const v of pts) c.add(v);
    c.divideScalar(pts.length);
    let ext = 0;
    for (const v of pts) ext = Math.max(ext, c.distanceTo(v));
    return { look: [c.x - shift, c.y + lift, c.z], pos: [c.x - shift, c.y + lift + 0.4, c.z + Math.max(minDist, ext * k)] };
  };
  POSES.workflow = frame(graph.path.map(nodeVec), 7, 3);
  POSES.call = frame([VOICE_C, ...callHubs.map(nodeVec)], 10, 2.7);
  const zoomPose = (c: THREE.Vector3): Pose => ({ look: [c.x, c.y, c.z], pos: [c.x + 0.8, c.y + 0.7, c.z + 5.8] });
  const emailHub = nodeVec(hubOfCluster(1));
  const projectHub = nodeVec(hubOfCluster(2));
  POSES['zoom-email'] = zoomPose(emailHub);
  POSES['zoom-project'] = zoomPose(projectHub);
  const sh = mobile ? 0 : -4.5;
  const near = (c: THREE.Vector3, d: number): Pose => ({ look: [c.x + sh, c.y, c.z], pos: [c.x + sh, c.y + d * 0.08, c.z + d] });
  POSES['services-ki'] = near(SERVICE_GROUPS[0], 26);
  POSES['services-ml'] = near(SERVICE_GROUPS[1], 26);
  POSES['services-bi'] = near(SERVICE_GROUPS[2], 26);
  POSES.process = near(PROCESS_C, 20);
  POSES.about = near(ABOUT_C, 14);
  // backcall: auf dem Weg vom Workflow zum Planeten schwenkt die Kamera nach außen
  const wp = POSES.workflow;
  const cp = POSES.call;
  const old = VIAS.findIndex((x) => x.at === 'to-call'); // erneutes Einhängen (Reduced-Motion-Test) nicht doppeln
  if (old >= 0) VIAS.splice(old, 1);
  VIAS.push({
    at: 'to-call',
    t: 0.45,
    pose: {
      pos: [lerp(wp.pos[0], cp.pos[0], 0.5), lerp(wp.pos[1], cp.pos[1], 0.5) + 3, lerp(wp.pos[2], cp.pos[2], 0.5) + 6],
      look: [lerp(wp.look[0], cp.look[0], 0.5), lerp(wp.look[1], cp.look[1], 0.5), lerp(wp.look[2], cp.look[2], 0.5)],
    },
  });
  if (mobile) {
    // Mobil: Motive mittig und oberhalb des Textblocks
    POSES.result = { pos: [0, -16, 118], look: [0, -20, 0] };
    POSES['stack-eu'] = { pos: [0, -12, 100], look: [0, -16, 0] };
    POSES.contact = { pos: [0, -1, 24], look: [0, -2, 0] };
    for (const v of VIAS) if (v.at === 'to-graph' && v.t < 0.5) v.pose = { pos: [0, 14, 4], look: [0, bins.y, 0] };
  }
  buildKeyframes();

  // Knoten (weicher Punkt, Hubs mit Ring; Farbe zwischen Ink und Silber)
  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePos, 3));
  nodeGeo.setAttribute('aSize', new THREE.BufferAttribute(nodeSize, 1));
  nodeGeo.setAttribute('aAlpha', new THREE.BufferAttribute(nodeAlpha, 1));
  nodeGeo.setAttribute('aTone', new THREE.BufferAttribute(graph.tone, 1));
  nodeGeo.setAttribute('aRing', new THREE.BufferAttribute(graph.ring, 1));
  const nodeMat = new THREE.ShaderMaterial({
    uniforms: { uPx, uFar, uInk: { value: INK }, uSilver: { value: new THREE.Color('#9C9A92') } },
    vertexShader: `
      attribute float aSize;
      attribute float aAlpha;
      attribute float aTone;
      attribute float aRing;
      uniform float uPx;
      uniform float uFar;
      varying float vA;
      varying float vTone;
      varying float vRing;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float z = -mv.z;
        float s = aSize * uPx / z;
        gl_PointSize = max(s, 1.5);
        gl_Position = projectionMatrix * mv;
        // fern: blasser; sehr nah vor der Kamera: ausblenden statt großer Flecken
        vA = aAlpha * min(1.0, s / 1.5) * mix(1.0, 0.25, smoothstep(uFar * 0.45, uFar, z)) * smoothstep(1.2, 4.5, z);
        vTone = aTone;
        vRing = aRing;
      }`,
    fragmentShader: `
      uniform vec3 uInk;
      uniform vec3 uSilver;
      varying float vA;
      varying float vTone;
      varying float vRing;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float core = 1.0 - smoothstep(mix(0.3, 0.16, vRing), mix(0.5, 0.2, vRing), d);
        float ring = vRing * (1.0 - smoothstep(0.012, 0.035, abs(d - 0.42))) * 0.45;
        float a = max(core, ring) * vA;
        if (a < 0.01) discard;
        gl_FragColor = vec4(mix(uInk, uSilver, vTone), a);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
  });
  world.add(new THREE.Points(nodeGeo, nodeMat));

  // Verbindungen (Reihenfolge nach Erscheinen, drawRange steuert Sichtbarkeit, jede Kante wächst von a nach b)
  const E = graph.edgeReveal.length;
  const edgePos = new Float32Array(E * 6);
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePos, 3));
  const edgeMat = new THREE.ShaderMaterial({
    uniforms: { uFar, uColor: { value: EDGE.clone() }, uOpacity: { value: 0.5 } },
    vertexShader: `
      uniform float uFar;
      varying float vF;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float z = -mv.z;
        vF = mix(1.0, 0.2, smoothstep(uFar * 0.45, uFar, z)) * smoothstep(1.2, 4.5, z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vF;
      void main() {
        gl_FragColor = vec4(uColor, uOpacity * vF);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
  });
  world.add(new THREE.LineSegments(edgeGeo, edgeMat));

  // Datenströme auf den Kanten
  const FLOW = mobile ? 50 : 180;
  const flowPos = new Float32Array(FLOW * 3);
  const flowOff = new Float32Array(FLOW);
  const flowSpd = new Float32Array(FLOW);
  const flowSel = new Float32Array(FLOW);
  const frand = mulberry32(99);
  for (let i = 0; i < FLOW; i++) {
    flowOff[i] = frand();
    flowSpd[i] = 0.04 + frand() * 0.08;
    flowSel[i] = frand();
  }
  const flowGeo = new THREE.BufferGeometry();
  flowGeo.setAttribute('position', new THREE.BufferAttribute(flowPos, 3));
  const flowMat = new THREE.PointsMaterial({ color: 0x141414, size: 0.07, map: dot, transparent: true, opacity: 0, depthWrite: false });
  world.add(new THREE.Points(flowGeo, flowMat));

  // Workflow-Pfad (Kette durch 6 Knoten) mit Lichtpunkt an der Spitze
  const pathPos = new Float32Array(5 * 2 * 3);
  const pathGeo = new THREE.BufferGeometry();
  pathGeo.setAttribute('position', new THREE.BufferAttribute(pathPos, 3));
  const pathMat = new THREE.LineBasicMaterial({ color: 0x141414, transparent: true, opacity: 0.9, depthWrite: false });
  world.add(new THREE.LineSegments(pathGeo, pathMat));
  const headPos = new Float32Array(3);
  const headGeo = new THREE.BufferGeometry();
  headGeo.setAttribute('position', new THREE.BufferAttribute(headPos, 3));
  const headMat = new THREE.PointsMaterial({ color: 0x141414, size: 0.32, map: dot, transparent: true, opacity: 0, depthWrite: false });
  world.add(new THREE.Points(headGeo, headMat));

  // Hintergrund-Partikel (Anrufe, Dokumente): treiben ungeordnet und verschmelzen später mit den Knoten
  const DUST = mobile ? 140 : 300;
  const drand = mulberry32(7);
  const dustPos = new Float32Array(DUST * 3);
  const dustChaos = new Float32Array(DUST * 3);
  const dustPh = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) {
    dustChaos[i * 3] = (drand() * 2 - 1) * 8;
    dustChaos[i * 3 + 1] = (drand() * 2 - 1) * 4.5;
    dustChaos[i * 3 + 2] = (drand() * 2 - 1) * 3;
    dustPh[i] = drand() * Math.PI * 2;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ color: 0x555555, size: 0.12, map: dot, transparent: true, opacity: 0, depthWrite: false });
  world.add(new THREE.Points(dustGeo, dustMat));

  // Umschläge
  const envPos = new Float32Array(M * 3);
  const envSize = new Float32Array(M);
  const envAlpha = new Float32Array(M);
  const envGeo = new THREE.BufferGeometry();
  envGeo.setAttribute('position', new THREE.BufferAttribute(envPos, 3));
  envGeo.setAttribute('aSize', new THREE.BufferAttribute(envSize, 1));
  envGeo.setAttribute('aAlpha', new THREE.BufferAttribute(envAlpha, 1));
  const envMat = new THREE.ShaderMaterial({
    uniforms: { uPx, uMap: { value: envelopeTexture() } },
    vertexShader: SPRITE_VERTEX,
    fragmentShader: `
      uniform sampler2D uMap;
      varying float vA;
      void main() {
        vec4 c = texture2D(uMap, gl_PointCoord);
        if (c.a * vA < 0.01) discard;
        gl_FragColor = vec4(c.rgb, c.a * vA);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
  });
  world.add(new THREE.Points(envGeo, envMat));

  // Äußere Welt (world.ts): mehrere tausend Knoten, komplett im Vertex-Shader
  const outer = buildWorld(mobile ? 1200 : 4000, mulberry32(23), { uPx, uFar });
  world.add(...outer.objects);

  // backcall: Stimmen-Planet neben dem Graphen, Signalpfad durch Call → Knowledge → Task → Employee
  const voice = buildVoice(VOICE_C, VOICE_R, mobile ? 700 : 1800, dot, uPx);
  world.add(voice.group);
  const callPts = callHubs.map(nodeVec);
  voice.setPath([VOICE_C.clone().add(callPts[0].clone().sub(VOICE_C).setLength(VOICE_R)), ...callPts], world);
  const callReach = new Float32Array(N); // 0..1: Signal hat den Hub erreicht
  let focus = 0; // Detail-Zoom aktiv: Umgebung tritt zurück

  // Detail-Szenen: Unterknoten auf einem geneigten Ring um einen Knoten, Labels kreisen mit
  const makeDetail = (center: THREE.Vector3, n: number) => {
    const g = new THREE.Group();
    g.position.copy(center);
    g.rotation.x = 1.05;
    const R = 1.5;
    const pts = new Float32Array(n * 3);
    const spokes = new Float32Array(n * 6);
    const base = Array.from({ length: n }, (_, k) => {
      const a = (k / n) * Math.PI * 2 + 0.4;
      pts[k * 3] = spokes[k * 6 + 3] = Math.cos(a) * R;
      pts[k * 3 + 1] = spokes[k * 6 + 4] = Math.sin(a) * R;
      return new THREE.Vector3(Math.cos(a) * R * 1.16, Math.sin(a) * R * 1.16, 0);
    });
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(spokes, 3));
    const dotMat = new THREE.PointsMaterial({ color: 0x141414, size: 0.28, map: dot, transparent: true, opacity: 0, depthWrite: false });
    const lineMat = new THREE.LineBasicMaterial({ color: 0x141414, transparent: true, opacity: 0, depthWrite: false });
    const ring = new THREE.LineLoop(circle(), lineMat);
    ring.scale.setScalar(R);
    g.add(new THREE.LineSegments(sg, lineMat), ring, new THREE.Points(pg, dotMat));
    world.add(g);
    const anchors = Array.from({ length: n + 1 }, () => new THREE.Vector3());
    anchors[n].copy(center);
    return {
      anchors,
      sync(show: number, t: number) {
        g.visible = show > 0.001;
        g.scale.setScalar(Math.max(0.001, 1 - (1 - show) ** 3));
        g.rotation.z = t * 0.06; // langsames Kreisen (Ambient)
        dotMat.opacity = show;
        lineMat.opacity = 0.45 * show;
        g.updateMatrix();
        for (let k = 0; k < n; k++) anchors[k].copy(base[k]).applyMatrix4(g.matrix);
      },
    };
  };
  const detailEls = (key: string) => Array.from(section.querySelectorAll<HTMLElement>(`[data-detail="${key}"]`));
  const details = (['email', 'project'] as const).map((key) => {
    const els = detailEls(key);
    const id = key === 'email' ? 'zoom-email' : 'zoom-project';
    const prev = key === 'email' ? 'to-email' : 'to-project';
    const next = key === 'email' ? 'to-flow' : 'to-result';
    const subs = els.filter((el) => el.dataset.i !== 'title');
    return {
      id,
      show: [at(prev, 0.55), at(id, 0), at(next, 0), at(next, 0.4)] as const,
      scene: makeDetail(key === 'email' ? emailHub : projectHub, subs.length),
      els: [...els.filter((el) => el.dataset.i === 'title'), ...subs], // Titel zuerst, dann die Unterknoten
    };
  });

  // Unterer Teil: Ablauf-Pfad (4 Knoten) und Vincent & Jesse (2 verbundene Knoten)
  const stepNodes = [0, 1, 2, 3].map((k) => PROCESS_C.clone().add(new THREE.Vector3(k * 4.4 - 6.6, Math.sin(k * 1.4) * 1.8, -k * 1.6)));
  const people = [ABOUT_C.clone().add(new THREE.Vector3(-2, -0.3, 0)), ABOUT_C.clone().add(new THREE.Vector3(2, 0.5, 0))];
  const spNodes = [...stepNodes, ...people];
  const spPos = new Float32Array(spNodes.length * 3);
  spNodes.forEach((v, i) => v.toArray(spPos, i * 3));
  const spSize = new Float32Array(spNodes.length);
  const spAlpha = new Float32Array(spNodes.length);
  const spGeo = new THREE.BufferGeometry();
  spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  spGeo.setAttribute('aSize', new THREE.BufferAttribute(spSize, 1));
  spGeo.setAttribute('aAlpha', new THREE.BufferAttribute(spAlpha, 1));
  spGeo.setAttribute('aTone', new THREE.BufferAttribute(new Float32Array(spNodes.length), 1));
  spGeo.setAttribute('aRing', new THREE.BufferAttribute(new Float32Array(spNodes.length).fill(1), 1));
  world.add(new THREE.Points(spGeo, nodeMat));
  const lowerLinePos = new Float32Array(4 * 6); // 3 Abschnitte Ablauf + 1 Verbindung Vincent–Jesse
  const lowerLineGeo = new THREE.BufferGeometry();
  lowerLineGeo.setAttribute('position', new THREE.BufferAttribute(lowerLinePos, 3));
  const lowerLineMat = new THREE.LineBasicMaterial({ color: 0x141414, transparent: true, opacity: 0.8, depthWrite: false });
  world.add(new THREE.LineSegments(lowerLineGeo, lowerLineMat));
  const pairFlow = 8;
  const pairPos = new Float32Array(pairFlow * 3);
  const pairGeo = new THREE.BufferGeometry();
  pairGeo.setAttribute('position', new THREE.BufferAttribute(pairPos, 3));
  const pairMat = new THREE.PointsMaterial({ color: 0x141414, size: 0.14, map: dot, transparent: true, opacity: 0, depthWrite: false });
  world.add(new THREE.Points(pairGeo, pairMat));

  // Overlay-Texte je Station: Einblenden am Ende des Übergangs davor, Ausblenden am Anfang des Übergangs danach
  const scenes = Array.from(section.querySelectorAll<HTMLElement>('[data-scene]')).map((el) => {
    const id = el.dataset.scene ?? '';
    const i = TIMELINE.findIndex((s) => s.id === id);
    const prev = TIMELINE[i - 1];
    const next = TIMELINE[i + 1];
    const [p0, p1] = P[id];
    return {
      el,
      id,
      a: prev ? p0 - span(prev.id) * 0.3 : p0 - 1,
      b: p0,
      c: next ? p1 : 2,
      d: next ? p1 + span(next.id) * (id === 'hero' ? 0.5 : 0.3) : 3,
      lines: Array.from(el.querySelectorAll<HTMLElement>('[data-line]')),
      steps: Array.from(el.querySelectorAll<HTMLElement>('[data-step]')),
      focusables: Array.from(el.querySelectorAll<HTMLElement>('a, button')),
      on: null as boolean | null, // erster Frame schreibt immer
    };
  });
  // Fortschritt der Schritt-Listen (Workflow, backcall): Pfad und Text laufen gemeinsam
  const stepProgress = (id: string, p: number) => clamp(local(id, p) / STEPS_END);

  // Beschriftungen in der Szene (alle illustrativ): Anker in Weltkoordinaten, Sichtbarkeit je Frame
  const labels = Array.from(section.querySelectorAll<HTMLElement>('[data-label]')).map((el) => ({
    el,
    anchor: graph.centers[Number(el.dataset.label)],
  }));
  const binLabels = Array.from(section.querySelectorAll<HTMLElement>('[data-bin]')).map((el) => ({
    el,
    anchor: new THREE.Vector3(bins.x[Number(el.dataset.bin)], binTop, 0),
  }));
  const callAnchors = [VOICE_C.clone().add(new THREE.Vector3(0, VOICE_R * 1.45, 0)), ...callPts];
  const callLabels = Array.from(section.querySelectorAll<HTMLElement>('[data-call]')).map((el) => ({
    el,
    k: Number(el.dataset.call),
    anchor: callAnchors[Number(el.dataset.call)],
  }));
  const stepLabels = Array.from(section.querySelectorAll<HTMLElement>('[data-step-node]')).map((el) => ({
    el,
    k: Number(el.dataset.stepNode),
    anchor: stepNodes[Number(el.dataset.stepNode)].clone().add(new THREE.Vector3(0, 1.1, 0)),
  }));
  const personEls = Array.from(section.querySelectorAll<HTMLElement>('[data-person]')).map((el) => ({
    el,
    anchor: people[Number(el.dataset.person)],
  }));
  const progressFill = section.querySelector<HTMLElement>('[data-progress-fill]');

  let fov = FOV;
  const resize = () => {
    // Canvas statt Stage messen: im statischen Modus enthält die Stage auch die Texte
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uPx.value = renderer.domElement.height / 2 / Math.tan(THREE.MathUtils.degToRad(fov / 2));
  };

  // Zeitpunkte (p) der einzelnen Abläufe, aus der Zeitachse abgeleitet
  const T = {
    wavesOut: [at('hero', 0.2), at('to-flood', 0.6)],
    star: [at('hero', 0.35), at('to-flood', 0.9)],
    hero: [at('hero', 0.15), at('to-flood', 0.5)],
    dustIn: [at('to-flood', 0.2), at('flood', 0)],
    binsIn: [at('to-sort', 0.3), at('sort', 0)],
    binsOut: [at('to-graph', 0), at('to-graph', 0.35)],
    org: [at('to-graph', 0), at('graph', 0)],
    dustMerge: [at('to-graph', 0.05), at('graph', 0) - RV * 0.3],
    dustOut: [at('to-graph', 0.3), at('graph', 0)],
    flowIn: [at('to-graph', 0.6), at('graph', 0)],
    labelsIn: [at('to-graph', 0.7), at('graph', 0)],
    labelsOut: [at('to-email', 0), at('to-email', 0.5)],
    flash: [at('to-email', 0), at('to-email', 0.6)],
    dim: [at('to-flow', 0.2), at('workflow', 0)],
    undim: [at('to-result', 0), at('to-result', 0.5)],
    pathIn: [at('to-flow', 0.7), at('workflow', 0)],
    pathFade: [at('to-call', 0), at('call', 0)],
    pathOut: [at('to-result', 0), at('to-result', 0.5)],
    headIn: [at('to-flow', 0.8), at('workflow', 0)],
    headOut: [at('to-call', 0), at('to-call', 0.4)],
    voiceIn: [at('to-call', 0.3), at('call', 0)],
    voiceAmp: [at('to-call', 0.7), at('call', 0.1)],
    voiceQuiet: [at('to-project', 0), at('to-project', 0.6)],
    sweep: [at('to-call', 0.15), at('to-call', 0.8)],
    beamIn: [at('to-call', 0.85), at('call', 0)],
    callOut: [at('to-project', 0), at('to-project', 0.4)],
    beamOut: [at('to-result', 0), at('to-result', 0.5)],
    sway: [at('to-result', 0), at('result', 0)],
    calm: [at('to-services', 0), at('to-services', 0.6)],
    lowerVeil: [at('to-services', 0.5), at('services-ki', 0.15)],
    contactCalm: [at('contact', 0.2), at('contact', 0.6)],
    worldIn: [at('to-project', 0.4), at('result', 0)],
  } satisfies Record<string, [number, number]>;
  const tw = (k: keyof typeof T, p: number) => smooth(T[k][0], T[k][1], p);
  const wf = (p: number) => stepProgress('workflow', p); // Fortschritt des Workflow-Pfads
  const cf = (p: number) => stepProgress('call', p); // Fortschritt des backcall-Signalpfads

  // Knotenpositionen: ordnen sich von verstreut zu Clustern
  const syncNodes = (p: number, t: number) => {
    const org = tw('org', p);
    const hi = smooth(0, 1, wf(p));
    const dim = tw('dim', p) * (1 - tw('undim', p));
    const reach = cf(p) * CALL_CLUSTERS.length;
    for (let k = 0; k < callHubs.length; k++) callReach[callHubs[k]] = smooth(k, k + 0.3, reach) * (1 - tw('beamOut', p));
    for (let i = 0; i < N; i++) {
      const j = i * 3;
      const drift = Math.sin(t * 0.6 + i) * 0.06;
      nodePos[j] = lerp(graph.scatter[j], graph.final[j], org) + drift;
      nodePos[j + 1] = lerp(graph.scatter[j + 1], graph.final[j + 1], org) + drift * 0.7;
      nodePos[j + 2] = lerp(graph.scatter[j + 2], graph.final[j + 2], org) + drift * 0.5;

      const inPath = pathSet.has(i);
      const lit = callReach[i];
      const reveal = smooth(graph.reveal[i], graph.reveal[i] + RV, p);
      nodeSize[i] = graph.size[i] * (inPath ? 1 + (graph.ring[i] ? 0.5 : 2.2) * hi * (1 - tw('pathOut', p)) : 1) * (1 + lit);
      nodeAlpha[i] = reveal * (inPath || lit > 0 ? 1 : 1 - 0.55 * dim) * (graph.ring[i] ? 1 : 1 - 0.75 * focus);
    }
    nodeGeo.attributes.position.needsUpdate = true;
    nodeGeo.attributes.aSize.needsUpdate = true;
    nodeGeo.attributes.aAlpha.needsUpdate = true;
  };

  const syncEdges = (p: number) => {
    let revealed = 0;
    while (revealed < E && graph.edgeReveal[revealed] <= p) revealed++;
    for (let e = 0; e < revealed; e++) {
      const a = graph.edges[e * 2] * 3;
      const b = graph.edges[e * 2 + 1] * 3;
      const grow = smooth(graph.edgeReveal[e], graph.edgeReveal[e] + RV * 0.8, p);
      const o = e * 6;
      for (let c = 0; c < 3; c++) {
        edgePos[o + c] = nodePos[a + c];
        edgePos[o + 3 + c] = lerp(nodePos[a + c], nodePos[b + c], grow);
      }
    }
    edgeGeo.setDrawRange(0, revealed * 2);
    edgeGeo.attributes.position.needsUpdate = true;
    // Hook nach der Graph-Station: alle Kanten leuchten einmal auf
    const flash = win(T.flash[0], T.flash[1], p);
    edgeMat.uniforms.uOpacity.value = (lerp(0.5, 0.16, tw('dim', p) * (1 - tw('undim', p))) + 0.5 * flash) * (1 - 0.7 * focus);
    edgeMat.uniforms.uColor.value.lerpColors(EDGE, INK, flash);
    return revealed;
  };

  // Pfad zeichnet sich Schritt für Schritt; jeder Abschnitt endet, wenn der zugehörige Schritt im Text aufleuchtet
  const syncPath = (p: number) => {
    const f = wf(p) * 5;
    const s = Math.min(4, Math.floor(f));
    const frac = smooth(0, 1, f - s);
    for (let k = 0; k < 5; k++) {
      const a = graph.path[k] * 3;
      const b = graph.path[k + 1] * 3;
      const endT = k < s ? 1 : k === s ? frac : 0;
      for (let c = 0; c < 3; c++) {
        pathPos[k * 6 + c] = nodePos[a + c];
        pathPos[k * 6 + 3 + c] = lerp(nodePos[a + c], nodePos[b + c], endT);
      }
    }
    pathGeo.attributes.position.needsUpdate = true;
    pathMat.opacity = 0.9 * tw('pathIn', p) * (1 - tw('pathFade', p) * 0.5) * (1 - tw('pathOut', p));
    for (let c = 0; c < 3; c++) headPos[c] = pathPos[s * 6 + 3 + c];
    headGeo.attributes.position.needsUpdate = true;
    headMat.opacity = tw('headIn', p) * (1 - tw('headOut', p));
  };

  const syncDust = (p: number, t: number) => {
    const m = tw('dustMerge', p);
    for (let i = 0; i < DUST; i++) {
      const j = i * 3;
      const ph = dustPh[i];
      const target = (i % N) * 3;
      dustPos[j] = lerp(dustChaos[j] + Math.sin(t * 0.5 + ph) * 0.7, nodePos[target], m);
      dustPos[j + 1] = lerp(dustChaos[j + 1] + Math.cos(t * 0.45 + ph * 1.3) * 0.7, nodePos[target + 1], m);
      dustPos[j + 2] = lerp(dustChaos[j + 2] + Math.sin(t * 0.35 + ph * 0.7) * 0.8, nodePos[target + 2], m);
    }
    dustGeo.attributes.position.needsUpdate = true;
    dustMat.opacity = 0.6 * tw('dustIn', p) * (1 - tw('dustOut', p));
  };

  const syncEnvelopes = (p: number, t: number) => {
    for (let i = 0; i < M; i++) {
      const j = i * 3;
      const e = smooth(envIn[i], envIn[i] + ENV_FLY, p);
      const s = smooth(envSort[i], envSort[i] + ENV_SORT, p);
      const g = smooth(envMerge[i], envMerge[i] + ENV_MERGE, p);
      const ph = envPh[i];
      const wob = 1 - s; // im Fach kommt der Umschlag zur Ruhe
      const n = envTarget[i] * 3;
      for (let c = 0; c < 3; c++) {
        const drift = Math.sin(t * (0.5 - c * 0.08) + ph * (1 + c * 0.3)) * 0.45 * wob;
        const free = lerp(envStart[j + c], envChaos[j + c] + drift, e);
        envPos[j + c] = lerp(lerp(free, envBin[j + c], s), nodePos[n + c], g);
      }
      envPos[j + 1] += Math.sin(g * Math.PI) * 0.6; // leichter Bogen auf dem Weg in den Graphen
      envSize[i] = lerp(envBase * lerp(0.3, 1, e), graph.size[envTarget[i]], g);
      envAlpha[i] = e * (1 - smooth(0.7, 1, g));
    }
    envGeo.attributes.position.needsUpdate = true;
    envGeo.attributes.aSize.needsUpdate = true;
    envGeo.attributes.aAlpha.needsUpdate = true;
  };

  const syncFlow = (p: number, t: number, revealed: number) => {
    flowMat.opacity = 0.8 * tw('flowIn', p) * (1 - tw('contactCalm', p) * 0.8);
    const n = Math.max(1, revealed);
    for (let k = 0; k < FLOW; k++) {
      const e = Math.floor(flowSel[k] * n) % n;
      const a = graph.edges[e * 2] * 3;
      const b = graph.edges[e * 2 + 1] * 3;
      const u = fract(flowOff[k] + t * flowSpd[k]);
      for (let c = 0; c < 3; c++) flowPos[k * 3 + c] = lerp(nodePos[a + c], nodePos[b + c], u);
    }
    flowGeo.attributes.position.needsUpdate = true;
  };

  // Unterer Teil: Ablauf-Pfad zeichnet sich, Vincent & Jesse verbinden sich
  const syncLower = (p: number, t: number) => {
    const base = tw('worldIn', p);
    const lp = local('process', p);
    const la = local('about', p);
    const steps = smooth(0.15, 0.7, lp);
    const pair = smooth(0.1, 0.35, la);
    for (let i = 0; i < spNodes.length; i++) {
      const on = i < 4 ? smooth(i / 3 - 0.05, i / 3 + 0.05, steps) : pair;
      spSize[i] = (i < 4 ? 0.7 : 0.8) * (1 + 0.6 * on);
      spAlpha[i] = base * (0.5 + 0.5 * on);
    }
    spGeo.attributes.aSize.needsUpdate = true;
    spGeo.attributes.aAlpha.needsUpdate = true;
    for (let k = 0; k < 4; k++) {
      const a = k < 3 ? stepNodes[k] : people[0];
      const b = k < 3 ? stepNodes[k + 1] : people[1];
      const end = k < 3 ? clamp(steps * 3 - k) : pair;
      a.toArray(lowerLinePos, k * 6);
      lowerLinePos[k * 6 + 3] = lerp(a.x, b.x, end);
      lowerLinePos[k * 6 + 4] = lerp(a.y, b.y, end);
      lowerLinePos[k * 6 + 5] = lerp(a.z, b.z, end);
    }
    lowerLineGeo.attributes.position.needsUpdate = true;
    lowerLineMat.opacity = 0.8 * base;
    for (let k = 0; k < pairFlow; k++) {
      const u = fract(k / pairFlow + t * 0.12);
      const v = k % 2 ? u : 1 - u; // Austausch in beide Richtungen
      pairPos[k * 3] = lerp(people[0].x, people[1].x, v);
      pairPos[k * 3 + 1] = lerp(people[0].y, people[1].y, v) + Math.sin(v * Math.PI) * 0.5;
      pairPos[k * 3 + 2] = lerp(people[0].z, people[1].z, v);
    }
    pairGeo.attributes.position.needsUpdate = true;
    pairMat.opacity = pair * (1 - smooth(0.85, 1, la));
  };

  const look: Vec3 = [0, 0, 0];
  const pos: Vec3 = [0, 0, 0];
  const faceQ = new THREE.Quaternion();
  const syncCamera = (p: number) => {
    const aspect = camera.aspect || 1;
    const zMul = Math.max(1, 0.9 / aspect);
    keyframe(p, 'look', look);
    keyframe(p, 'pos', pos);
    // Dolly-Zoom im ersten Übergang (Brennweite gegen Kamerafahrt), umgekehrt beim großen Herauszoom
    const f = FOV + 16 * bump('to-flood', p) - 16 * bump('to-result', p);
    if (f !== fov) {
      fov = f;
      camera.fov = f;
      camera.updateProjectionMatrix();
      uPx.value = renderer.domElement.height / 2 / Math.tan(THREE.MathUtils.degToRad(f / 2));
    }
    const k = zMul * (Math.tan(THREE.MathUtils.degToRad(FOV / 2)) / Math.tan(THREE.MathUtils.degToRad(f / 2)));
    camera.position.set(
      look[0] + (pos[0] - look[0]) * k + pointer.x * 0.3,
      look[1] + (pos[1] - look[1]) * k - pointer.y * 0.2,
      look[2] + (pos[2] - look[2]) * k,
    );
    camera.lookAt(look[0], look[1], look[2]);
    // Rollen um die Blickachse, nur in Übergängen
    const roll =
      0.3 * bump('to-sort', p) -
      0.45 * bump('to-flow', p) +
      0.2 * bump('to-project', p) +
      0.22 * win(at('services-ki', 0.7), at('services-ml', 0.3), p) -
      0.22 * win(at('services-ml', 0.7), at('services-bi', 0.3), p);
    if (roll) camera.rotateZ(roll);
    uFar.value = camera.position.distanceTo(world.position) + 10;
  };

  const v = new THREE.Vector3();
  const place = (el: HTMLElement, anchor: THREE.Vector3, show: number, w: number, h: number) => {
    el.style.opacity = String(show);
    if (show <= 0) return;
    v.copy(anchor).applyMatrix4(world.matrixWorld).project(camera);
    el.style.transform = `translate(${(v.x + 1) * 0.5 * w}px, ${(1 - v.y) * 0.5 * h}px)`;
  };

  const syncOverlay = (p: number) => {
    for (const s of scenes) {
      const a = smooth(s.a, s.b, p) * (1 - smooth(s.c, s.d, p));
      s.el.style.opacity = String(a);
      if (s.id !== 'hero') s.el.style.transform = `translateY(${(1 - a) * 16}px)`;
      const on = a > 0.5;
      if (on !== s.on) {
        // Ausgeblendete Szenen: nicht klickbar und nicht per Tab erreichbar
        s.on = on;
        s.el.style.pointerEvents = on ? 'auto' : 'none';
        for (const f of s.focusables) f.tabIndex = on ? 0 : -1;
      }
      // Zeile für Zeile über die erste Hälfte der Station, danach steht der Text
      const l = local(s.id, p);
      const n = s.lines.length;
      for (let i = 0; i < n; i++) {
        const start = 0.04 + (i / n) * (REVEAL_END - 0.12);
        s.lines[i].style.opacity = String(smooth(start, start + 0.12, l));
      }
      // Schritte leuchten auf, wenn der Pfad den zugehörigen Knoten erreicht
      const m = s.steps.length;
      if (m) {
        const active = Math.floor(stepProgress(s.id, p) * (m - 1) + 1e-6);
        for (let i = 0; i < m; i++) s.steps[i].classList.toggle('is-on', i <= active);
      }
    }
    // Hero reagiert auf den ersten Scroll: Überschrift zoomt in die Tiefe, Subline gleitet seitlich weg
    const hu = tw('hero', p);
    const [by, h1, sub] = heroBits;
    if (by) by.style.transform = `translateY(${-hu * 24}px)`;
    if (h1) h1.style.transform = `scale(${1 + hu * 0.35})`;
    if (sub) sub.style.transform = `translateX(${-hu * 90}px)`;
    if (progressFill) progressFill.style.transform = `scaleX(${p})`;
    if (waves) {
      const o = 1 - tw('wavesOut', p);
      waves.style.opacity = String(o);
      waves.style.visibility = o < 0.01 ? 'hidden' : 'visible';
    }
    if (lowerVeil) lowerVeil.style.opacity = String(tw('lowerVeil', p));
    if (veil) veil.style.opacity = String(1 - focus); // Detail-Zooms haben keinen Text, Labels liegen auch links

    world.updateMatrixWorld(true);
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    const showLabels = tw('labelsIn', p) * (1 - tw('labelsOut', p));
    for (const l of labels) place(l.el, l.anchor, showLabels, w, h);
    const showBins = tw('binsIn', p) * (1 - tw('binsOut', p));
    for (const l of binLabels) place(l.el, l.anchor, showBins, w, h);
    for (const d of details) {
      const out = 1 - smooth(d.show[2], d.show[3], p);
      const ld = local(d.id, p);
      const n = d.els.length;
      for (let k = 0; k < n; k++) {
        const st = 0.04 + (k / n) * 0.4;
        // Anker: letzter = Mittelpunkt (Titel), davor die Unterknoten
        place(d.els[k], d.scene.anchors[k === 0 ? n - 1 : k - 1], smooth(st, st + 0.1, ld) * out, w, h);
      }
    }
    const callShow = tw('voiceIn', p) * (1 - tw('callOut', p));
    const reach = cf(p) * CALL_CLUSTERS.length;
    for (const l of callLabels) place(l.el, l.anchor, callShow * (l.k === 0 ? 1 : smooth(l.k - 0.2, l.k, reach)), w, h);
    const lp = local('process', p);
    const processOut = 1 - smooth(at('about', 0), at('about', 0.25), p);
    for (const l of stepLabels) place(l.el, l.anchor, smooth(0.15 + l.k * 0.18, 0.22 + l.k * 0.18, lp) * processOut, w, h);
    const personShow = smooth(at('about', 0.15), at('about', 0.4), p) * (1 - smooth(at('about', 0.85), at('contact', 0.2), p));
    for (const l of personEls) place(l.el, l.anchor, personShow, w, h);
  };

  const detailShow = details.map(() => 0);
  const update = (p: number, t: number) => {
    focus = 0;
    for (let k = 0; k < details.length; k++) {
      const d = details[k];
      detailShow[k] = smooth(d.show[0], d.show[1], p) * (1 - smooth(d.show[2], d.show[3], p));
      focus = Math.max(focus, detailShow[k]);
    }
    syncCamera(p);
    // unterer Teil: Welt steht still, die Kamera trägt die Bewegung (Drehung um den Ursprung würde ferne Motive verschieben)
    const still = 1 - tw('calm', p);
    world.rotation.y = (pointer.x * 0.12 + tw('sway', p) * Math.sin(t * 0.3) * 0.15) * still + (Math.PI / 3) * bump('to-flow', p);
    world.rotation.x = pointer.y * 0.06 * still;
    starU.uT.value = tw('star', p);
    starU.uTime.value = t;
    starGroup.rotation.y = 0.8 * tw('star', p) + Math.sin(t * 0.3) * 0.08;
    starGroup.visible = starU.uT.value < 0.999;
    syncNodes(p, t);
    const revealed = syncEdges(p);
    syncPath(p);
    syncDust(p, t);
    syncEnvelopes(p, t);
    syncFlow(p, t, revealed);
    outer.uniforms.uP.value = p;
    outer.uniforms.uTime.value = t;
    outer.uniforms.uFlow.value = 1 - tw('contactCalm', p) * 0.85;
    for (let k = 0; k < details.length; k++) details[k].scene.sync(detailShow[k], t);
    outer.uniforms.uFade.value = 1 - 0.7 * focus;
    faceQ.copy(world.quaternion).invert().multiply(camera.quaternion);
    voice.sync({
      show: tw('voiceIn', p),
      amp: tw('voiceAmp', p) * (1 - 0.75 * tw('voiceQuiet', p)),
      phase: (p - at('to-call', 0)) / span('call'),
      rings: tw('voiceAmp', p) * (1 - tw('callOut', p)),
      sweep: clamp((p - T.sweep[0]) / (T.sweep[1] - T.sweep[0])),
      beam: cf(p),
      beamAlpha: tw('beamIn', p) * (1 - tw('beamOut', p)),
      t,
      face: faceQ,
    });
    syncLower(p, t);
    syncOverlay(p);
    renderer.render(scene, camera);
  };

  // Zustand: Scroll-Ziel, geglätteter Wert, Mauszeiger
  let pTarget = 0;
  let pCur = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let raf = 0;
  let running = false;
  const startT = performance.now();
  let lastT = startT;

  // Segmente der Zeitachse im DOM (Strecke data-track, danach der untere Teil), Position relativ zur Section
  const segs = Array.from(section.querySelectorAll<HTMLElement>('[data-seg]')).map((el) => {
    const id = el.dataset.seg ?? '';
    const i = TIMELINE.findIndex((s) => s.id === id);
    return { el, i, flow: !!TIMELINE[i]?.flow, top: 0, h: 1, p0: P[id][0], p1: P[id][1] };
  });
  const measure = () => {
    const base = section.getBoundingClientRect().top;
    for (const s of segs) {
      const r = s.el.getBoundingClientRect();
      s.top = r.top - base;
      s.h = Math.max(1, r.height);
    }
  };

  // Scroll → p je Segment: Stationen haben wenig p auf langer Strecke (Plateau), Übergänge bremsen zu ihnen hin ab.
  // Unterer Teil (flow): Fortschritt an der Bildschirmmitte; die 50vh-Lücke (journey-tail) schließt an die Strecke an.
  const computeP = () => {
    const y = -section.getBoundingClientRect().top;
    const yc = y + window.innerHeight / 2;
    for (const s of segs) {
      const yy = s.flow ? yc : y;
      if (yy < s.top + s.h) return s.p0 + (s.p1 - s.p0) * easeSegment(s.i, clamp((yy - s.top) / s.h));
    }
    return 1;
  };

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.1, (now - lastT) / 1000);
    lastT = now;
    pCur += (pTarget - pCur) * (1 - Math.exp(-P_DAMP * dt));
    if (Math.abs(pTarget - pCur) < 0.0001) pCur = pTarget;
    const k = 1 - Math.exp(-3.7 * dt);
    pointer.x += (pointer.tx - pointer.x) * k;
    pointer.y += (pointer.ty - pointer.y) * k;
    update(pCur, (now - startT) / 1000);
  };

  const start = () => {
    if (running) return;
    running = true;
    lastT = performance.now();
    raf = requestAnimationFrame(tick);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  const onScroll = () => {
    pTarget = computeP();
  };
  const onResize = () => {
    resize();
    measure();
    pTarget = computeP();
    if (reduced) update(pCur, 0);
  };

  resize();

  if (reduced) {
    // Keine Bewegung: ein Standbild der Welt, Texte statisch darunter
    section.classList.add('journey-static');
    resize();
    pTarget = pCur = at('result', 0.5);
    update(pCur, 0);
    window.addEventListener('resize', onResize, { passive: true });
    return;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  // Inhalte im unteren Teil ändern ihre Höhe (Kalender, Formular-Bestätigung, Webfonts, Bilder)
  new ResizeObserver(() => {
    measure();
    pTarget = computeP();
  }).observe(section);

  if (window.matchMedia('(pointer: fine)').matches) {
    section.addEventListener('pointermove', (e) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    });
  }

  const io = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) start();
      else stop();
    },
    { rootMargin: '100px 0px' },
  );
  io.observe(section);

  measure();
  pTarget = pCur = computeP();
  update(pCur, 0);
  start();
}
