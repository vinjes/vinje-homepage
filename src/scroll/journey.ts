import * as THREE from 'three';

/*
 * Scroll-Experience: Ein sticky Canvas, dessen Zustand allein vom Scroll-Fortschritt p (0..1) abhängt.
 * Vorwärts und rückwärts laufen dadurch identisch.
 * Ablauf: Hero → E-Mails kommen an → Sortierung in Fächer → Knowledge Graph → Workflow → Struktur.
 */

type Vec3 = [number, number, number];

const FOV = 42;
const CLUSTER_NAMES = ['Customer', 'Email', 'Project', 'Invoice', 'Knowledge', 'Task', 'Call', 'Document', 'Employee'];
const K = CLUSTER_NAMES.length;
// Anteil von p, den der Hero beim Wegscrollen belegt (unabhängig von seiner Pixelhöhe)
const P_HERO = 0.14;
// E-Mail-Fächer (Anfrage, Angebot, Rechnung, Support) → Ziel-Cluster (Customer, Project, Invoice, Knowledge)
const BIN_CLUSTER = [0, 2, 3, 4];
const ENV_SIZE = 0.42;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const fract = (x: number) => x - Math.floor(x);

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
    reveal[i] = isHub ? 0.38 + rand() * 0.05 : 0.41 + rand() * 0.19;
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
    .map(([a, b]) => ({ a, b, r: Math.max(g.reveal[a], g.reveal[b]) + 0.02 }))
    .sort((x, y) => x.r - y.r);
  g.edges = new Uint16Array(list.length * 2);
  g.edgeReveal = new Float32Array(list.length);
  list.forEach((e, i) => {
    g.edges[i * 2] = e.a;
    g.edges[i * 2 + 1] = e.b;
    g.edgeReveal[i] = e.r;
  });
}

// Kamera-Stationen entlang des Scrolls
const KF: { p: number; pos: Vec3; look: Vec3 }[] = [
  { p: 0, pos: [0, 0.4, 15.5], look: [0, 0, 0] }, // Hero
  { p: 0.16, pos: [0.3, 0.3, 13], look: [0.4, 0, 0] }, // E-Mails kommen an
  { p: 0.3, pos: [0, 0.2, 11.5], look: [0, 0, 0] }, // Fächer im Bild
  { p: 0.38, pos: [0, 0.2, 11.5], look: [0, 0, 0] },
  { p: 0.5, pos: [-1.8, 1, 8.5], look: [-0.5, 0, 0] }, // in den Graphen
  { p: 0.62, pos: [2.6, -0.8, 6], look: [1.2, -0.4, 0] },
  { p: 0.75, pos: [0, 0, 9.5], look: [0, 0, 0] }, // Workflow
  { p: 0.9, pos: [-1.6, 0.6, 16], look: [-1.8, 0, 0] },
  { p: 1, pos: [-2.2, 1, 19], look: [-2.2, 0, 0] },
];

function keyframe(p: number, key: 'pos' | 'look', out: Vec3): Vec3 {
  let i = 0;
  while (i < KF.length - 2 && p > KF[i + 1].p) i++;
  const a = KF[i];
  const b = KF[i + 1];
  const t = smooth(a.p, b.p, p);
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
  const hero = section.querySelector<HTMLElement>('[data-hero]');
  const waves = section.querySelector<HTMLElement>('[data-waves]');

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
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
  const world = new THREE.Group();
  scene.add(world);

  const graph = buildGraph(mobile ? 200 : 520);
  const N = graph.count;
  const nodePos = new Float32Array(N * 3);
  const nodeSize = new Float32Array(N);
  const nodeAlpha = new Float32Array(N);
  const pathSet = new Set(graph.path);

  // E-Mails: fliegen vom Rand ein, werden in vier Fächer sortiert und laufen dann in den Graphen
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
  for (let i = 0; i < M; i++) {
    const cat = i % 4;
    const k = Math.floor(i / 4);
    const j = i * 3;
    const ang = erand() * Math.PI * 2;
    envStart[j] = Math.cos(ang) * 17;
    envStart[j + 1] = Math.sin(ang) * 10;
    envStart[j + 2] = (erand() * 2 - 1) * 3;
    envChaos[j] = mobile ? (erand() * 2 - 1) * 3.6 : -3 + erand() * 10.5;
    envChaos[j + 1] = mobile ? -1.5 + erand() * 6 : (erand() * 2 - 1) * 4.2;
    envChaos[j + 2] = (erand() * 2 - 1) * 2.5;
    const col = k % bins.cols;
    const row = Math.floor(k / bins.cols);
    envBin[j] = bins.x[cat] + (col - (bins.cols - 1) / 2) * bins.sp;
    envBin[j + 1] = bins.y + ((rows - 1) / 2 - row) * bins.sp * 0.8;
    envPh[i] = erand() * Math.PI * 2;
    envIn[i] = -0.07 + erand() * 0.21; // ein Teil ist schon im ersten Bild unterwegs
    envSort[i] = 0.19 + (k / perCat) * 0.06 + erand() * 0.04;
    envMerge[i] = 0.37 + erand() * 0.08;
    // Die erste Anfrage wird später zum Startknoten des Workflows
    const pool = clusterNodes[cat];
    envTarget[i] = i === 0 ? graph.path[0] : pool[k % pool.length];
    graph.reveal[envTarget[i]] = Math.min(graph.reveal[envTarget[i]], envMerge[i] + 0.06);
  }
  orderEdges(graph);

  // Workflow-Station: Kamera schaut so auf den Pfad, dass er rechts neben dem Text liegt
  const pc = new THREE.Vector3();
  for (const n of graph.path) pc.add(new THREE.Vector3().fromArray(graph.final, n * 3));
  pc.divideScalar(graph.path.length);
  let ext = 0;
  for (const n of graph.path) ext = Math.max(ext, pc.distanceTo(new THREE.Vector3().fromArray(graph.final, n * 3)));
  const wf = KF.find((k) => k.p === 0.75);
  if (wf) {
    // mobil steht der Text unten, der Pfad soll darüber liegen
    const shift = mobile ? 0 : 2.4;
    const lift = mobile ? -1.6 : 0;
    wf.look = [pc.x - shift, pc.y + lift, pc.z];
    wf.pos = [pc.x - shift, pc.y + lift + 0.4, pc.z + Math.max(7, ext * 3)];
  }
  // mobil: Endbild mittig und oberhalb des Textblocks statt rechts daneben
  if (mobile) for (const k of KF) if (k.p >= 0.9) {
    k.look = [0, -3, 0];
    k.pos = [0, -2.6, k.pos[2]];
  }

  // Tiefe: gemeinsamer Wert für Knoten und Kanten, ferne Elemente verblassen
  const uFar = { value: 30 };
  const uPx = { value: 1 };

  // Knoten (weicher Punkt, Hubs mit Ring; Farbe zwischen Ink und Silber)
  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePos, 3));
  nodeGeo.setAttribute('aSize', new THREE.BufferAttribute(nodeSize, 1));
  nodeGeo.setAttribute('aAlpha', new THREE.BufferAttribute(nodeAlpha, 1));
  nodeGeo.setAttribute('aTone', new THREE.BufferAttribute(graph.tone, 1));
  nodeGeo.setAttribute('aRing', new THREE.BufferAttribute(graph.ring, 1));
  const nodeMat = new THREE.ShaderMaterial({
    uniforms: { uPx, uFar, uInk: { value: new THREE.Color('#141414') }, uSilver: { value: new THREE.Color('#9C9A92') } },
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
        gl_PointSize = aSize * uPx / z;
        gl_Position = projectionMatrix * mv;
        // fern: blasser; sehr nah vor der Kamera: ausblenden statt großer Flecken
        vA = aAlpha * mix(1.0, 0.25, smoothstep(uFar * 0.45, uFar, z)) * smoothstep(1.2, 4.5, z);
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
    uniforms: { uFar, uColor: { value: new THREE.Color('#8F8D85') }, uOpacity: { value: 0.5 } },
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
  const flowMat = new THREE.PointsMaterial({ color: 0x141414, size: 0.07, map: dotTexture(), transparent: true, opacity: 0, depthWrite: false });
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
  const headMat = new THREE.PointsMaterial({ color: 0x141414, size: 0.32, map: dotTexture(), transparent: true, opacity: 0, depthWrite: false });
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
  const dustMat = new THREE.PointsMaterial({ color: 0x555555, size: 0.12, map: dotTexture(), transparent: true, opacity: 0.6, depthWrite: false });
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

  // Overlay-Elemente
  const scenes = Array.from(section.querySelectorAll<HTMLElement>('[data-scene]')).map((el) => ({
    el,
    from: Number(el.dataset.from),
    to: Number(el.dataset.to),
  }));
  const steps = Array.from(section.querySelectorAll<HTMLElement>('[data-step]'));
  const labels = Array.from(section.querySelectorAll<HTMLElement>('[data-label]')).map((el) => ({
    el,
    anchor: graph.centers[Number(el.dataset.label)],
  }));
  const binLabels = Array.from(section.querySelectorAll<HTMLElement>('[data-bin]')).map((el) => ({
    el,
    anchor: new THREE.Vector3(bins.x[Number(el.dataset.bin)], binTop, 0),
  }));
  const progressFill = section.querySelector<HTMLElement>('[data-progress-fill]');

  const resize = () => {
    // Canvas statt Stage messen: im statischen Modus enthält die Stage auch die Texte
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uPx.value = renderer.domElement.height / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  };

  // Knotenpositionen: ordnen sich von verstreut zu Clustern
  const syncNodes = (p: number, t: number) => {
    const org = smooth(0.36, 0.58, p);
    const hi = smooth(0.69, 0.81, p);
    const dim = smooth(0.67, 0.77, p);
    for (let i = 0; i < N; i++) {
      const j = i * 3;
      const drift = Math.sin(t * 0.6 + i) * 0.06;
      nodePos[j] = lerp(graph.scatter[j], graph.final[j], org) + drift;
      nodePos[j + 1] = lerp(graph.scatter[j + 1], graph.final[j + 1], org) + drift * 0.7;
      nodePos[j + 2] = lerp(graph.scatter[j + 2], graph.final[j + 2], org) + drift * 0.5;

      const inPath = pathSet.has(i);
      const reveal = smooth(graph.reveal[i], graph.reveal[i] + 0.05, p);
      nodeSize[i] = graph.size[i] * (inPath ? 1 + (graph.ring[i] ? 0.5 : 2.2) * hi : 1);
      nodeAlpha[i] = reveal * (inPath ? 1 : 1 - 0.55 * dim);
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
      const grow = smooth(graph.edgeReveal[e], graph.edgeReveal[e] + 0.04, p);
      const o = e * 6;
      for (let c = 0; c < 3; c++) {
        edgePos[o + c] = nodePos[a + c];
        edgePos[o + 3 + c] = lerp(nodePos[a + c], nodePos[b + c], grow);
      }
    }
    edgeGeo.setDrawRange(0, revealed * 2);
    edgeGeo.attributes.position.needsUpdate = true;
    edgeMat.uniforms.uOpacity.value = lerp(0.5, 0.16, smooth(0.67, 0.77, p));
    return revealed;
  };

  const syncPath = (p: number) => {
    const f = smooth(0.69, 0.81, p) * 5;
    const s = Math.min(4, Math.floor(f));
    const frac = f - s;
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
    pathMat.opacity = 0.9 * smooth(0.67, 0.69, p) * (1 - smooth(0.92, 1, p) * 0.5);
    for (let c = 0; c < 3; c++) headPos[c] = pathPos[s * 6 + 3 + c];
    headGeo.attributes.position.needsUpdate = true;
    headMat.opacity = smooth(0.68, 0.7, p) * (1 - smooth(0.81, 0.85, p));
  };

  const syncDust = (p: number, t: number) => {
    const m = smooth(0.4, 0.56, p);
    for (let i = 0; i < DUST; i++) {
      const j = i * 3;
      const ph = dustPh[i];
      const target = (i % N) * 3;
      dustPos[j] = lerp(dustChaos[j] + Math.sin(t * 0.5 + ph) * 0.7, nodePos[target], m);
      dustPos[j + 1] = lerp(dustChaos[j + 1] + Math.cos(t * 0.45 + ph * 1.3) * 0.7, nodePos[target + 1], m);
      dustPos[j + 2] = lerp(dustChaos[j + 2] + Math.sin(t * 0.35 + ph * 0.7) * 0.8, nodePos[target + 2], m);
    }
    dustGeo.attributes.position.needsUpdate = true;
    dustMat.opacity = 0.6 * (1 - smooth(0.44, 0.58, p));
  };

  const syncEnvelopes = (p: number, t: number) => {
    for (let i = 0; i < M; i++) {
      const j = i * 3;
      const e = smooth(envIn[i], envIn[i] + 0.1, p);
      const s = smooth(envSort[i], envSort[i] + 0.08, p);
      const g = smooth(envMerge[i], envMerge[i] + 0.08, p);
      const ph = envPh[i];
      const wob = 1 - s; // im Fach kommt der Umschlag zur Ruhe
      const n = envTarget[i] * 3;
      for (let c = 0; c < 3; c++) {
        const drift = Math.sin(t * (0.5 - c * 0.08) + ph * (1 + c * 0.3)) * 0.45 * wob;
        const free = lerp(envStart[j + c], envChaos[j + c] + drift, e);
        envPos[j + c] = lerp(lerp(free, envBin[j + c], s), nodePos[n + c], g);
      }
      envPos[j + 1] += Math.sin(g * Math.PI) * 0.6; // leichter Bogen auf dem Weg in den Graphen
      envSize[i] = lerp(envBase, graph.size[envTarget[i]], g);
      envAlpha[i] = e * (1 - smooth(0.7, 1, g));
    }
    envGeo.attributes.position.needsUpdate = true;
    envGeo.attributes.aSize.needsUpdate = true;
    envGeo.attributes.aAlpha.needsUpdate = true;
  };

  const syncFlow = (p: number, t: number, revealed: number) => {
    flowMat.opacity = 0.8 * smooth(0.5, 0.6, p);
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
    camera.position.set(
      look[0] + (pos[0] - look[0]) * zMul + pointer.x * 0.3,
      look[1] + (pos[1] - look[1]) * zMul - pointer.y * 0.2,
      look[2] + (pos[2] - look[2]) * zMul,
    );
    camera.lookAt(look[0], look[1], look[2]);
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
      const a = smooth(s.from, s.from + 0.04, p) * (1 - smooth(s.to - 0.04, s.to, p));
      s.el.style.opacity = String(a);
      s.el.style.transform = `translateY(${(1 - a) * 16}px)`;
      s.el.style.pointerEvents = a > 0.5 ? 'auto' : 'none';
    }
    const active = Math.floor(clamp((p - 0.69) / 0.024, 0, 5));
    steps.forEach((el, i) => el.classList.toggle('is-on', i <= active));
    if (progressFill) progressFill.style.transform = `scaleX(${p})`;
    if (hero && !reduced) hero.style.opacity = String(1 - smooth(0.4, 0.95, p / P_HERO));
    if (waves) {
      const o = 1 - smooth(0.02, 0.16, p);
      waves.style.opacity = String(o);
      waves.style.visibility = o < 0.01 ? 'hidden' : 'visible';
    }

    world.updateMatrixWorld(true);
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    const showLabels = smooth(0.48, 0.54, p) * (1 - smooth(0.64, 0.7, p));
    for (const l of labels) place(l.el, l.anchor, showLabels, w, h);
    const showBins = smooth(0.21, 0.27, p) * (1 - smooth(0.37, 0.42, p));
    for (const l of binLabels) place(l.el, l.anchor, showBins, w, h);
  };

  const update = (p: number, t: number) => {
    syncCamera(p);
    world.rotation.y = pointer.x * 0.12 + smooth(0.85, 1, p) * Math.sin(t * 0.3) * 0.15;
    world.rotation.x = pointer.y * 0.06;
    syncNodes(p, t);
    const revealed = syncEdges(p);
    syncPath(p);
    syncDust(p, t);
    syncEnvelopes(p, t);
    syncFlow(p, t, revealed);
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

  // Erst scrollt der Hero weg (0..P_HERO), danach läuft der Rest der Timeline über die gepinnte Strecke
  const computeP = () => {
    const y = -section.getBoundingClientRect().top;
    const heroH = Math.max(1, hero?.offsetHeight ?? 0);
    if (y < heroH) return clamp(y / heroH) * P_HERO;
    const rest = Math.max(1, section.offsetHeight - window.innerHeight - heroH);
    return P_HERO + (1 - P_HERO) * clamp((y - heroH) / rest);
  };

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    pCur += (pTarget - pCur) * 0.12;
    if (Math.abs(pTarget - pCur) < 0.0001) pCur = pTarget;
    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;
    update(pCur, (now - startT) / 1000);
  };

  const start = () => {
    if (running) return;
    running = true;
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
    pTarget = computeP();
    if (reduced) update(pCur, 0);
  };

  resize();

  if (reduced) {
    // Keine Bewegung: ein Standbild im Endzustand, Texte statisch darunter
    section.classList.add('journey-static');
    resize();
    pTarget = pCur = 0.98;
    update(pCur, 0);
    window.addEventListener('resize', onResize, { passive: true });
    return;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });

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

  pTarget = pCur = computeP();
  update(pCur, 0);
  start();
}
