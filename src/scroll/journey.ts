import * as THREE from 'three';
import { starPoints } from './star';
import { P, TIMELINE, at, bump, easeSegment, local, span } from './timeline';
import { SERVICE_GROUPS, buildWorld } from './world';

/*
 * Scroll-Experience: Ein sticky Canvas, dessen Zustand allein vom Scroll-Fortschritt p (0..1) abhängt.
 * Vorwärts und rückwärts laufen dadurch identisch. Zeitachse und Stationen: timeline.ts.
 * Ablauf: vinje-Stern → Knowledge Graph → Welt aus Clustern → unterer Teil (Leistungen, Ablauf, Über uns, Kontakt)
 * über derselben Bühne. Ebenen: Stern und innerer Graph (hier), äußere Welt (world.ts).
 */

type Vec3 = [number, number, number];
interface Pose {
  pos: Vec3;
  look: Vec3;
}

const FOV = 42;
const K = 9; // Cluster im inneren Graphen
// Glättung des Scroll-Fortschritts pro Sekunde (bildratenunabhängig)
const P_DAMP = 7;
// Einblenden eines Graph-Knotens bzw. Wachsen einer Kante
const RV = span('to-graph') * 0.3;
// Feste Orte in der Welt: Ablauf-Pfad, Vincent & Jesse
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

  return {
    count, final, scatter, size, tone, ring, reveal, cluster, pairs,
    edges: new Uint16Array(0), edgeReveal: new Float32Array(0),
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
// Stationen des unteren Teils werden beim Start aus der Welt berechnet.
const POSES: Record<string, Pose> = {
  hero: { pos: [0, 0.4, 15.5], look: [0, 0, 0] },
  graph: { pos: [3.5, 0.6, 14], look: [0.5, 0, 0] }, // der ganze Graph neben dem Hero-Text
  contact: { pos: [-3.5, 0.6, 24], look: [-3.5, 0, 0] }, // zurück zum Kern
};
// Zwischenpunkte in Übergängen (Segment, Anteil 0..1, Pose)
const VIAS: { at: string; t: number; pose: Pose }[] = [
  { at: 'to-graph', t: 0.6, pose: { pos: [-1.8, 3.2, 7.5], look: [-0.5, 0, 0] } }, // Eintauchen in den Graphen
  { at: 'to-services', t: 0.5, pose: { pos: [-22, 14, 72], look: [-28, 6, -8] } }, // großer Herauszoom in die Welt
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

export function mountJourney(section: HTMLElement | null) {
  if (!section) return;
  const stage = section.querySelector<HTMLElement>('[data-stage]');
  const canvas = section.querySelector<HTMLCanvasElement>('[data-canvas]');
  if (!stage || !canvas) return;
  const lowerVeil = section.querySelector<HTMLElement>('[data-veil-lower]');
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
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

  // vinje-Stern aus Partikeln: steht im ersten Bild und zerfällt im ersten Übergang (Positionen im Vertex-Shader)
  const S = mobile ? 1000 : 1600;
  const srand = mulberry32(5);
  const star2d = starPoints(S, srand);
  const starC = mobile ? new THREE.Vector3(0, 8.2, 0) : new THREE.Vector3(4.4, 0.4, 0);
  const starH = mobile ? 4.6 : 5.4;
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

  orderEdges(graph);

  // Kamera-Stationen des unteren Teils, abhängig von der Welt
  const sh = mobile ? 0 : -4.5;
  const near = (c: THREE.Vector3, d: number): Pose => ({ look: [c.x + sh, c.y, c.z], pos: [c.x + sh, c.y + d * 0.08, c.z + d] });
  POSES['services-ki'] = near(SERVICE_GROUPS[0], 26);
  POSES['services-ml'] = near(SERVICE_GROUPS[1], 26);
  POSES['services-bi'] = near(SERVICE_GROUPS[2], 26);
  POSES.process = near(PROCESS_C, 20);
  POSES.about = near(ABOUT_C, 14);
  // Mobil: Motive mittig und oberhalb des Textblocks
  if (mobile) POSES.contact = { pos: [0, -1, 24], look: [0, -2, 0] };
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
  const dustPts = new THREE.Points(dustGeo, dustMat);
  world.add(dustPts);

  // Äußere Welt (world.ts): mehrere tausend Knoten, komplett im Vertex-Shader
  const outer = buildWorld(mobile ? 1200 : 4000, mulberry32(23), { uPx, uFar });
  world.add(...outer.objects);

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
      focusables: Array.from(el.querySelectorAll<HTMLElement>('a, button')),
      on: null as boolean | null, // erster Frame schreibt immer
    };
  });

  const svcRail = section.querySelector<HTMLElement>('[data-svc-rail]');
  const svcFill = section.querySelector<HTMLElement>('[data-svc-fill]');
  const svcSteps = Array.from(section.querySelectorAll<HTMLElement>('[data-svc-step]'));

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
    star: [at('hero', 0.35), at('to-graph', 0.45)],
    hero: [at('hero', 0.15), at('to-graph', 0.25)],
    dustIn: [at('to-graph', 0), at('to-graph', 0.2)],
    org: [at('to-graph', 0), at('graph', 0)],
    dustMerge: [at('to-graph', 0.05), at('graph', 0) - RV * 0.3],
    dustOut: [at('to-graph', 0.3), at('graph', 0)],
    flowIn: [at('to-graph', 0.6), at('graph', 0)],
    calm: [at('to-services', 0), at('to-services', 0.6)],
    lowerVeil: [at('to-services', 0.5), at('services-ki', 0.15)],
    // ab Arbeitsweise: Graph tritt hinter Karten und Texte zurück
    quiet: [at('services-bi', 0.8), at('process', 0.2)],
  } satisfies Record<string, [number, number]>;
  const tw = (k: keyof typeof T, p: number) => smooth(T[k][0], T[k][1], p);

  // Knotenpositionen: ordnen sich von verstreut zu Clustern
  nodeSize.set(graph.size);
  const syncNodes = (p: number, t: number) => {
    const org = tw('org', p);
    for (let i = 0; i < N; i++) {
      const j = i * 3;
      const drift = Math.sin(t * 0.6 + i) * 0.06;
      nodePos[j] = lerp(graph.scatter[j], graph.final[j], org) + drift;
      nodePos[j + 1] = lerp(graph.scatter[j + 1], graph.final[j + 1], org) + drift * 0.7;
      nodePos[j + 2] = lerp(graph.scatter[j + 2], graph.final[j + 2], org) + drift * 0.5;
      nodeAlpha[i] = smooth(graph.reveal[i], graph.reveal[i] + RV, p);
    }
    nodeGeo.attributes.position.needsUpdate = true;
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
    return revealed;
  };

  const syncDust = (p: number, t: number) => {
    dustMat.opacity = 0.6 * tw('dustIn', p) * (1 - tw('dustOut', p));
    dustPts.visible = dustMat.opacity > 0.001;
    if (!dustPts.visible) return; // Staub lebt nur im ersten Übergang
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
  };

  const syncFlow = (p: number, t: number, revealed: number) => {
    flowMat.opacity = 0.8 * tw('flowIn', p) * (1 - tw('quiet', p) * 0.8);
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

  const look: Vec3 = [0, 0, 0];
  const pos: Vec3 = [0, 0, 0];
  const syncCamera = (p: number) => {
    const aspect = camera.aspect || 1;
    const zMul = Math.max(1, 0.9 / aspect);
    keyframe(p, 'look', look);
    keyframe(p, 'pos', pos);
    // Dolly-Zoom im ersten Übergang (Brennweite gegen Kamerafahrt), umgekehrt beim großen Herauszoom
    const f = FOV + 16 * bump('to-graph', p) - 16 * bump('to-services', p);
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
    // Rollen um die Blickachse zwischen den Leistungen
    const roll =
      0.22 * win(at('services-ki', 0.7), at('services-ml', 0.3), p) -
      0.22 * win(at('services-ml', 0.7), at('services-bi', 0.3), p);
    if (roll) camera.rotateZ(roll);
    uFar.value = camera.position.distanceTo(world.position) + 10;
  };

  // Styles nur bei Änderung schreiben: spart Style-Neuberechnung in jedem Frame
  const lastCss = new WeakMap<HTMLElement, Record<string, string>>();
  const css = (el: HTMLElement, k: 'opacity' | 'transform', v: string) => {
    let c = lastCss.get(el);
    if (!c) lastCss.set(el, (c = {}));
    if (c[k] !== v) el.style[k] = c[k] = v;
  };

  const syncOverlay = (p: number) => {
    for (const s of scenes) {
      const a = smooth(s.a, s.b, p) * (1 - smooth(s.c, s.d, p));
      css(s.el, 'opacity', String(a));
      if (s.id !== 'hero') css(s.el, 'transform', `translateY(${(1 - a) * 16}px)`);
      const on = a > 0.5;
      if (on !== s.on) {
        // Ausgeblendete Szenen: nicht klickbar und nicht per Tab erreichbar
        s.on = on;
        s.el.style.pointerEvents = on ? 'auto' : 'none';
        for (const f of s.focusables) f.tabIndex = on ? 0 : -1;
      }
    }
    // Hero reagiert auf den ersten Scroll: Überschrift zoomt in die Tiefe, Subline gleitet seitlich weg
    const hu = tw('hero', p);
    const [by, h1, sub] = heroBits;
    if (by) css(by, 'transform', `translateY(${-hu * 24}px)`);
    if (h1) css(h1, 'transform', `scale(${1 + hu * 0.35})`);
    if (sub) css(sub, 'transform', `translateX(${-hu * 90}px)`);
    // Stufen-Balken: füllt sich von Leistung 01 bis 03 (Mitte der Stationen = Text in Bildmitte)
    if (svcRail && svcFill) {
      const f = clamp((p - at('services-ki', 0.5)) / (at('services-bi', 0.5) - at('services-ki', 0.5)));
      css(svcRail, 'opacity', String(smooth(at('to-services', 0.8), at('services-ki', 0.2), p) * (1 - smooth(at('services-bi', 0.8), at('process', 0.2), p))));
      css(svcFill, 'transform', `scaleY(${f})`);
      svcSteps.forEach((el, k) => el.classList.toggle('is-on', f >= k / 2 - 0.001));
    }
    if (lowerVeil) css(lowerVeil, 'opacity', String(tw('lowerVeil', p)));
    css(renderer.domElement, 'opacity', String(1 - 0.55 * tw('quiet', p)));

  };

  const update = (p: number, t: number) => {
    syncCamera(p);
    // unterer Teil: Welt steht still, die Kamera trägt die Bewegung (Drehung um den Ursprung würde ferne Motive verschieben)
    const still = 1 - tw('calm', p);
    world.rotation.y = pointer.x * 0.12 * still;
    world.rotation.x = pointer.y * 0.06 * still;
    starU.uT.value = tw('star', p);
    starU.uTime.value = t;
    starGroup.rotation.y = 0.8 * tw('star', p) + Math.sin(t * 0.3) * 0.08;
    starGroup.visible = starU.uT.value < 0.999;
    syncNodes(p, t);
    const revealed = syncEdges(p);
    syncDust(p, t);
    syncFlow(p, t, revealed);
    outer.uniforms.uP.value = p;
    outer.uniforms.uTime.value = t;
    outer.uniforms.uFlow.value = 1 - tw('quiet', p) * 0.85;
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
    if (scrollDirty) {
      scrollDirty = false;
      pTarget = computeP();
    }
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

  let scrollDirty = false;
  const onScroll = () => {
    scrollDirty = true;
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
    pTarget = pCur = at('services-ki', 0.5);
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
