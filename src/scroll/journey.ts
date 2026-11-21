import * as THREE from 'three';

/*
 * Scroll-Experience: Ein sticky Canvas, dessen Zustand allein vom Scroll-Fortschritt p (0..1) abhängt.
 * Vorwärts und rückwärts laufen dadurch identisch. Szenen: Chaos → Ordnung → Graph → Workflow → Struktur.
 */

type Vec3 = [number, number, number];

const FOV = 42;
const CLUSTER_NAMES = ['Customer', 'Email', 'Project', 'Invoice', 'Knowledge', 'Task', 'Call', 'Document', 'Employee'];
const K = CLUSTER_NAMES.length;

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
  reveal: Float32Array; // Scroll-Wert, ab dem der Knoten erscheint
  edges: Uint16Array; // Knotenpaare
  edgeReveal: Float32Array; // aufsteigend sortiert
  centers: THREE.Vector3[];
  path: number[]; // Workflow-Kette aus 6 Knoten
}

function buildGraph(count: number, seed = 42): Graph {
  const rand = mulberry32(seed);
  const bell = () => rand() + rand() + rand() - 1.5;
  const R = 5.2;

  const centers: THREE.Vector3[] = [];
  for (let k = 0; k < K; k++) {
    const y = 1 - (k / (K - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = k * 2.399963;
    centers.push(new THREE.Vector3(Math.cos(th) * r * R, y * R * 0.8, Math.sin(th) * r * R * 0.6));
  }

  const final = new Float32Array(count * 3);
  const scatter = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const reveal = new Float32Array(count);
  const cluster = new Uint8Array(count);
  const hub = new Uint8Array(count);

  for (let i = 0; i < count; i++) {
    const c = Math.floor(rand() * K);
    cluster[i] = c;
    const ctr = centers[c];
    final[i * 3] = ctr.x + bell() * 1.1;
    final[i * 3 + 1] = ctr.y + bell() * 1.1;
    final[i * 3 + 2] = ctr.z + bell() * 0.9;

    const u = rand() * 2 - 1;
    const th = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const rad = 7 + rand() * 4;
    scatter[i * 3] = Math.cos(th) * s * rad;
    scatter[i * 3 + 1] = u * rad;
    scatter[i * 3 + 2] = Math.sin(th) * s * rad;

    hub[i] = rand() < 0.07 ? 1 : 0;
    size[i] = hub[i] ? 0.12 : 0.04 + rand() * 0.035;
    reveal[i] = 0.4 + rand() * 0.2;
  }

  // Kanten: je 2 nächste Nachbarn im Cluster, manchmal ein Querverweis, Hubs bekommen mehr
  const seen = new Set<number>();
  const pairs: [number, number][] = [];
  const add = (a: number, b: number) => {
    if (a === b) return;
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
  for (let i = 0; i < count; i++) {
    const near: number[] = [];
    for (let j = 0; j < count; j++) if (j !== i) near.push(j);
    near.sort((a, b) => d2(i, a) - d2(i, b));
    let same = 0;
    for (const j of near) {
      if (cluster[j] === cluster[i] && same < 2) {
        add(i, j);
        same++;
      }
    }
    if (rand() < 0.3) {
      const other = near.find((j) => cluster[j] !== cluster[i]);
      if (other !== undefined) add(i, other);
    }
    if (hub[i]) {
      for (let n = 0; n < 2; n++) add(i, near[2 + Math.floor(rand() * 10)]);
    }
  }

  const edgeList = pairs
    .map(([a, b]) => ({ a, b, r: Math.max(reveal[a], reveal[b]) + 0.03 }))
    .sort((x, y) => x.r - y.r);
  const edges = new Uint16Array(edgeList.length * 2);
  const edgeReveal = new Float32Array(edgeList.length);
  edgeList.forEach((e, i) => {
    edges[i * 2] = e.a;
    edges[i * 2 + 1] = e.b;
    edgeReveal[i] = e.r;
  });

  // Workflow-Pfad: zufällige Kette über Kanten, 6 Knoten
  const adj: number[][] = Array.from({ length: count }, () => []);
  edgeList.forEach((e) => {
    adj[e.a].push(e.b);
    adj[e.b].push(e.a);
  });
  let path: number[] = [];
  const hubs = Array.from({ length: count }, (_, i) => i).filter((i) => hub[i]);
  for (let attempt = 0; attempt < 300 && path.length < 6; attempt++) {
    const start = hubs.length ? hubs[Math.floor(rand() * hubs.length)] : Math.floor(rand() * count);
    const p = [start];
    while (p.length < 6) {
      const last = p[p.length - 1];
      const opts = adj[last].filter((n) => !p.includes(n));
      if (!opts.length) break;
      p.push(opts[Math.floor(rand() * opts.length)]);
    }
    if (p.length === 6) path = p;
  }
  if (!path.length) path = [0, 1, 2, 3, 4, 5];

  return { count, final, scatter, size, reveal, edges, edgeReveal, centers, path };
}

// Kamera-Stationen entlang des Scrolls
const KF: { p: number; pos: Vec3; look: Vec3 }[] = [
  { p: 0, pos: [0, 0.4, 15], look: [0, 0, 0] },
  { p: 0.2, pos: [0, 0, 11.5], look: [0, 0, 0] },
  { p: 0.4, pos: [-1.8, 1, 8.5], look: [-0.5, 0, 0] },
  { p: 0.56, pos: [2.6, -0.8, 6], look: [1.2, -0.4, 0] },
  { p: 0.74, pos: [0, 0, 9.5], look: [0, 0, 0] },
  { p: 0.9, pos: [-1.6, 0.6, 16], look: [-1.8, 0, 0] },
  { p: 1, pos: [-2.2, 1, 19], look: [-2.2, 0, 0] },
];

function keyframe(p: number, key: 'pos' | 'look'): Vec3 {
  for (let i = 0; i < KF.length - 1; i++) {
    const a = KF[i];
    const b = KF[i + 1];
    if (p <= b.p) {
      const t = smooth(a.p, b.p, p);
      return [0, 1, 2].map((k) => lerp(a[key][k], b[key][k], t)) as Vec3;
    }
  }
  return [...KF[KF.length - 1][key]] as Vec3;
}

// Runder Punkt statt Quadrat für Partikel
function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.45, 'rgba(255,255,255,0.7)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(c);
}

export function mountJourney(section: HTMLElement | null) {
  if (!section) return;
  const stage = section.querySelector<HTMLElement>('[data-stage]');
  const canvas = section.querySelector<HTMLCanvasElement>('[data-canvas]');
  if (!stage || !canvas) return;

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

  const graph = buildGraph(mobile ? 140 : 280);
  const N = graph.count;
  const nodePos = new Float32Array(N * 3);
  const nodeSize = new Float32Array(N);
  const nodeAlpha = new Float32Array(N);
  const pathSet = new Set(graph.path);

  // Knoten (Punkte mit weichem Rand, Alpha und Größe pro Knoten)
  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePos, 3));
  nodeGeo.setAttribute('aSize', new THREE.BufferAttribute(nodeSize, 1));
  nodeGeo.setAttribute('aAlpha', new THREE.BufferAttribute(nodeAlpha, 1));
  const nodeMat = new THREE.ShaderMaterial({
    uniforms: { uPx: { value: 1 }, uColor: { value: new THREE.Color('#141414') } },
    vertexShader: `
      attribute float aSize;
      attribute float aAlpha;
      uniform float uPx;
      varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPx / -mv.z;
        gl_Position = projectionMatrix * mv;
        vA = aAlpha;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.15, d);
        gl_FragColor = vec4(uColor, a * vA);
      }`,
    transparent: true,
    depthWrite: false,
  });
  const nodes = new THREE.Points(nodeGeo, nodeMat);
  world.add(nodes);

  // Verbindungen (Reihenfolge nach Erscheinen, drawRange steuert Sichtbarkeit)
  const E = graph.edgeReveal.length;
  const edgePos = new Float32Array(E * 6);
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePos, 3));
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x8f8d85, transparent: true, opacity: 0.45, depthWrite: false });
  const edges = new THREE.LineSegments(edgeGeo, edgeMat);
  world.add(edges);

  // Datenströme auf den Kanten
  const FLOW = mobile ? 30 : 110;
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
  const flow = new THREE.Points(flowGeo, flowMat);
  world.add(flow);

  // Workflow-Pfad (leuchtende Kette durch 6 Knoten)
  const pathPos = new Float32Array(5 * 2 * 3);
  const pathGeo = new THREE.BufferGeometry();
  pathGeo.setAttribute('position', new THREE.BufferAttribute(pathPos, 3));
  const pathMat = new THREE.LineBasicMaterial({ color: 0x141414, transparent: true, opacity: 0.9, depthWrite: false });
  const pathLine = new THREE.LineSegments(pathGeo, pathMat);
  world.add(pathLine);

  // Chaos-Partikel: fließen zu Spuren und verschmelzen mit den Knoten
  const DUST = mobile ? 160 : 380;
  const drand = mulberry32(7);
  const dustPos = new Float32Array(DUST * 3);
  const dustChaos = new Float32Array(DUST * 3);
  const dustLane = new Float32Array(DUST * 3);
  const dustPh = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) {
    dustChaos[i * 3] = (drand() * 2 - 1) * 8;
    dustChaos[i * 3 + 1] = (drand() * 2 - 1) * 4.5;
    dustChaos[i * 3 + 2] = (drand() * 2 - 1) * 3;
    const laneX = [-5.2, 0, 5.2][i % 3];
    dustLane[i * 3] = laneX + (drand() * 2 - 1) * 0.7;
    dustLane[i * 3 + 1] = (drand() * 2 - 1) * 3.2;
    dustLane[i * 3 + 2] = (drand() * 2 - 1) * 1.2;
    dustPh[i] = drand() * Math.PI * 2;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ color: 0x555555, size: 0.14, map: dotTexture(), transparent: true, opacity: 0.75, depthWrite: false });
  const dust = new THREE.Points(dustGeo, dustMat);
  world.add(dust);

  // Overlay-Elemente
  const scenes = Array.from(section.querySelectorAll<HTMLElement>('[data-scene]')).map((el) => ({
    el,
    from: Number(el.dataset.from),
    to: Number(el.dataset.to),
  }));
  const steps = Array.from(section.querySelectorAll<HTMLElement>('[data-step]'));
  const labels = Array.from(section.querySelectorAll<HTMLElement>('[data-label]'));
  const progressFill = section.querySelector<HTMLElement>('[data-progress-fill]');

  let uPxFactor = 1;
  const resize = () => {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uPxFactor = renderer.domElement.height / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    nodeMat.uniforms.uPx.value = uPxFactor;
  };

  // Knotenpositionen: ordnen sich von verstreut zu Clustern
  const syncNodes = (p: number, t: number) => {
    const org = smooth(0.34, 0.6, p);
    for (let i = 0; i < N; i++) {
      const j = i * 3;
      const drift = Math.sin(t * 0.6 + i) * 0.08;
      nodePos[j] = lerp(graph.scatter[j], graph.final[j], org) + drift;
      nodePos[j + 1] = lerp(graph.scatter[j + 1], graph.final[j + 1], org) + drift * 0.7;
      nodePos[j + 2] = lerp(graph.scatter[j + 2], graph.final[j + 2], org) + drift * 0.5;

      const inPath = pathSet.has(i);
      const hi = smooth(0.72, 0.84, p);
      const dim = smooth(0.7, 0.8, p);
      const reveal = smooth(graph.reveal[i], graph.reveal[i] + 0.06, p);
      nodeSize[i] = graph.size[i] * (inPath ? 1 + 0.7 * hi : 1);
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
      const o = e * 6;
      edgePos[o] = nodePos[a];
      edgePos[o + 1] = nodePos[a + 1];
      edgePos[o + 2] = nodePos[a + 2];
      edgePos[o + 3] = nodePos[b];
      edgePos[o + 4] = nodePos[b + 1];
      edgePos[o + 5] = nodePos[b + 2];
    }
    edgeGeo.setDrawRange(0, revealed * 2);
    edgeGeo.attributes.position.needsUpdate = true;
    edgeMat.opacity = lerp(0.45, 0.14, smooth(0.7, 0.8, p));
    return revealed;
  };

  const syncPath = (p: number) => {
    const f = smooth(0.72, 0.84, p) * 5;
    const s = Math.floor(f);
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
    pathMat.opacity = 0.9 * smooth(0.7, 0.72, p) * (1 - smooth(0.92, 1, p) * 0.5);
  };

  const syncDust = (p: number, t: number) => {
    const s1 = smooth(0.1, 0.32, p);
    const s2 = smooth(0.5, 0.66, p);
    for (let i = 0; i < DUST; i++) {
      const j = i * 3;
      const ph = dustPh[i];
      const cx = dustChaos[j] + Math.sin(t * 0.5 + ph) * 0.7;
      const cy = dustChaos[j + 1] + Math.cos(t * 0.45 + ph * 1.3) * 0.7;
      const cz = dustChaos[j + 2] + Math.sin(t * 0.35 + ph * 0.7) * 0.8;
      let x = lerp(cx, dustLane[j] + Math.sin(t + ph) * 0.15, s1);
      let y = lerp(cy, dustLane[j + 1] + Math.sin(t * 0.8 + ph) * 0.3, s1);
      let z = lerp(cz, dustLane[j + 2], s1);
      const target = (i % N) * 3;
      x = lerp(x, nodePos[target], s2);
      y = lerp(y, nodePos[target + 1], s2);
      z = lerp(z, nodePos[target + 2], s2);
      dustPos[j] = x;
      dustPos[j + 1] = y;
      dustPos[j + 2] = z;
    }
    dustGeo.attributes.position.needsUpdate = true;
    dustMat.opacity = 0.75 * (1 - smooth(0.52, 0.68, p));
  };

  const syncFlow = (p: number, t: number, revealed: number) => {
    flowMat.opacity = 0.8 * smooth(0.5, 0.62, p);
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

  const syncCamera = (p: number) => {
    const aspect = camera.aspect || 1;
    const zMul = Math.max(1, 0.9 / aspect);
    const look = keyframe(p, 'look');
    const pos = keyframe(p, 'pos');
    camera.position.set(
      look[0] + (pos[0] - look[0]) * zMul + pointer.x * 0.3,
      look[1] + (pos[1] - look[1]) * zMul - pointer.y * 0.2,
      look[2] + (pos[2] - look[2]) * zMul,
    );
    camera.lookAt(look[0], look[1], look[2]);
  };

  const syncOverlay = (p: number, t: number) => {
    for (const s of scenes) {
      const a = smooth(s.from, s.from + 0.05, p) * (1 - smooth(s.to - 0.05, s.to, p));
      s.el.style.opacity = String(a);
      s.el.style.transform = `translateY(${(1 - a) * 16}px)`;
      s.el.style.pointerEvents = a > 0.5 ? 'auto' : 'none';
    }
    const active = Math.floor(clamp((p - 0.72) / 0.025, 0, 5));
    steps.forEach((el, i) => el.classList.toggle('is-on', i <= active));
    if (progressFill) progressFill.style.transform = `scaleX(${p})`;

    world.updateMatrixWorld(true);
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    const v = new THREE.Vector3();
    labels.forEach((el) => {
      const idx = Number(el.dataset.label);
      const show = smooth(0.46, 0.54, p) * (1 - smooth(0.66, 0.74, p));
      el.style.opacity = String(show);
      v.copy(graph.centers[idx]).applyMatrix4(world.matrixWorld).project(camera);
      el.style.transform = `translate(${(v.x + 1) * 0.5 * w}px, ${(1 - v.y) * 0.5 * h}px)`;
    });
  };

  const update = (p: number, t: number) => {
    syncCamera(p);
    world.rotation.y = pointer.x * 0.12 + smooth(0.85, 1, p) * Math.sin(t * 0.3) * 0.15;
    world.rotation.x = pointer.y * 0.06;
    syncNodes(p, t);
    const revealed = syncEdges(p);
    syncPath(p);
    syncDust(p, t);
    syncFlow(p, t, revealed);
    syncOverlay(p, t);
    renderer.render(scene, camera);
  };

  // Zustand: Scroll-Ziel, geglätteter Wert, Mauszeiger
  let pTarget = 0;
  let pCur = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let raf = 0;
  let visible = false;
  let running = false;
  const startT = performance.now();

  const computeP = () => {
    const rect = section.getBoundingClientRect();
    const total = section.offsetHeight - window.innerHeight;
    return clamp(-rect.top / Math.max(1, total));
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
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    },
    { rootMargin: '100px 0px' },
  );
  io.observe(section);

  pTarget = pCur = computeP();
  update(pCur, 0);
  visible = true;
  start();
}
