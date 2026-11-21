import * as THREE from 'three';
import { at } from './timeline';

/*
 * Äußere Graph-Welt: mehrere tausend Knoten in Cluster-Gruppen → Clustern → Knoten.
 * Positionen, Erscheinen und Treiben laufen komplett im Vertex-Shader (Uniform uP); die CPU baut nur einmal die Attribute.
 * Der innere Graph (journey.ts) liegt im Ursprung und ist in dieser Welt ein Cluster unter vielen.
 */

// Cluster-Gruppen, an denen der untere Teil hält (Leistungen 01–03), dicht nebeneinander: kurze Kamerafahrt dazwischen
export const SERVICE_GROUPS = [new THREE.Vector3(-30, 9, -12), new THREE.Vector3(-8, 4, -14), new THREE.Vector3(14, 9, -12)];

type U = { value: number };

const DRIFT = `
  vec3 drift(float ph, float t) {
    return 0.08 * vec3(sin(t * 0.4 + ph), cos(t * 0.35 + ph * 1.3), sin(t * 0.3 + ph * 0.7));
  }`;
const FAR = `float farFade(float z, float far) { return mix(1.0, 0.18, smoothstep(far * 0.45, far, z)); }`;

export function buildWorld(count: number, rand: () => number, shared: { uPx: U; uFar: U }) {
  const bell = () => rand() + rand() + rand() - 1.5;
  const dir = () => {
    const u = rand() * 2 - 1;
    const th = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    return new THREE.Vector3(Math.cos(th) * s, u * 0.7, Math.sin(th) * s);
  };

  // Gruppen auf einer Schale um den inneren Graphen, mit Abstand zueinander
  const groups = SERVICE_GROUPS.map((v) => v.clone());
  const GN = count > 2000 ? 12 : 7;
  for (let tries = 0; groups.length < GN && tries < 500; tries++) {
    const c = dir().multiplyScalar(30 + rand() * 28);
    if (groups.every((g) => g.distanceTo(c) > 20)) groups.push(c);
  }
  const CPG = 5; // Cluster je Gruppe
  const clusters = groups.flatMap((g) =>
    Array.from({ length: CPG }, () => g.clone().add(new THREE.Vector3(bell() * 9, bell() * 7, bell() * 9))),
  );

  // Erscheinen: von innen nach außen, während die Kamera aus dem inneren Graphen herausfährt
  const r0 = at('to-services', 0.1);
  const r1 = at('to-services', 0.8);
  const revealAt = (v: THREE.Vector3) => r0 + (r1 - r0) * Math.min(1, Math.max(0, (v.length() - 10) / 50));

  const pos = new Float32Array(count * 3);
  const start = new Float32Array(count * 3);
  const reveal = new Float32Array(count);
  const size = new Float32Array(count);
  const shape = new Float32Array(count); // 0 Punkt, 1 Hub mit Ring, 2 Kreis
  const tone = new Float32Array(count);
  const phase = new Float32Array(count);
  const hubOf = new Int32Array(count);
  const hubIndex: number[] = [];

  for (let i = 0; i < count; i++) {
    const ci = i % clusters.length;
    const c = clusters[ci];
    const g = groups[Math.floor(ci / CPG)];
    const isHub = i < clusters.length;
    if (isHub) hubIndex.push(i);
    hubOf[i] = isHub ? i : ci;
    const spread = isHub ? 0 : 2.2;
    const p = c.clone().add(new THREE.Vector3(bell() * spread, bell() * spread, bell() * spread));
    p.toArray(pos, i * 3);
    // Start: dicht an der Gruppenmitte, auf halbem Weg zum Ursprung; die Welt entfaltet sich nach außen
    g.clone().multiplyScalar(0.55).add(p.clone().sub(g).multiplyScalar(0.12)).toArray(start, i * 3);
    reveal[i] = revealAt(p) + (isHub ? 0 : 0.004 + rand() * 0.01);
    shape[i] = isHub ? 1 : rand() < 0.12 ? 2 : 0;
    size[i] = isHub ? 1.1 : shape[i] === 2 ? 0.38 : 0.13 + rand() ** 3 * 0.32;
    tone[i] = isHub ? 0 : 0.2 + rand() * 0.7;
    phase[i] = rand() * 100;
  }

  // Kanten: Knoten → Hub, Hubs einer Gruppe untereinander, jede Gruppe zu ihren zwei Nachbargruppen und zum Ursprung
  const edges: [number, number][] = [];
  for (let i = clusters.length; i < count; i++) if (rand() < 0.7) edges.push([hubOf[i], i]);
  for (let gi = 0; gi < groups.length; gi++) {
    const hubs = hubIndex.slice(gi * CPG, gi * CPG + CPG);
    hubs.forEach((h, k) => edges.push([hubs[0], h], [h, hubs[(k + 1) % hubs.length]]));
    const order = groups.map((_, o) => o).filter((o) => o !== gi).sort((a, b) => groups[gi].distanceTo(groups[a]) - groups[gi].distanceTo(groups[b]));
    for (const o of order.slice(0, 2)) edges.push([hubs[0], hubIndex[o * CPG]]);
  }
  const E = edges.length;
  const ePos = new Float32Array(E * 6);
  const eFrom = new Float32Array(E * 6);
  const eReveal = new Float32Array(E * 2);
  const ePhase = new Float32Array(E * 2);
  edges.forEach(([a, b], e) => {
    const rv = Math.max(reveal[a], reveal[b]);
    for (let c = 0; c < 3; c++) {
      ePos[e * 6 + c] = pos[a * 3 + c];
      ePos[e * 6 + 3 + c] = pos[b * 3 + c];
      eFrom[e * 6 + c] = pos[a * 3 + c];
      eFrom[e * 6 + 3 + c] = pos[a * 3 + c];
    }
    eReveal[e * 2] = eReveal[e * 2 + 1] = rv;
    ePhase[e * 2] = phase[a];
    ePhase[e * 2 + 1] = phase[b];
  });

  const uniforms = {
    uP: { value: 0 },
    uTime: { value: 0 },
    uFade: { value: 1 }, // gemeinsame Deckkraft
    uFlow: { value: 1 }, // Datenströme; im Kontakt beruhigt sich das Netz
    uPx: shared.uPx,
    uFar: shared.uFar,
    uInk: { value: new THREE.Color('#141414') },
    uSilver: { value: new THREE.Color('#9C9A92') },
  };

  // Knoten
  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  nodeGeo.setAttribute('aStart', new THREE.BufferAttribute(start, 3));
  nodeGeo.setAttribute('aReveal', new THREE.BufferAttribute(reveal, 1));
  nodeGeo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  nodeGeo.setAttribute('aShape', new THREE.BufferAttribute(shape, 1));
  nodeGeo.setAttribute('aTone', new THREE.BufferAttribute(tone, 1));
  nodeGeo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  const nodes = new THREE.Points(
    nodeGeo,
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        attribute vec3 aStart;
        attribute float aReveal;
        attribute float aSize;
        attribute float aShape;
        attribute float aTone;
        attribute float aPhase;
        uniform float uP;
        uniform float uTime;
        uniform float uPx;
        uniform float uFar;
        uniform float uFade;
        varying float vA;
        varying float vTone;
        varying float vShape;
        ${DRIFT}
        ${FAR}
        void main() {
          float r = smoothstep(aReveal, aReveal + 0.03, uP);
          vec3 p = mix(aStart, position, r) + drift(aPhase, uTime);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float z = -mv.z;
          float s = aSize * uPx / z;
          gl_PointSize = max(s, 2.0);
          gl_Position = projectionMatrix * mv;
          vA = r * uFade * min(1.0, s / 2.0) * farFade(z, uFar) * smoothstep(1.2, 4.5, z);
          vTone = aTone;
          vShape = aShape;
        }`,
      fragmentShader: `
        uniform vec3 uInk;
        uniform vec3 uSilver;
        varying float vA;
        varying float vTone;
        varying float vShape;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a;
          if (vShape < 0.5) a = 1.0 - smoothstep(0.3, 0.5, d);
          else if (vShape < 1.5) a = max(1.0 - smoothstep(0.13, 0.19, d), (1.0 - smoothstep(0.015, 0.04, abs(d - 0.42))) * 0.5);
          else a = (1.0 - smoothstep(0.03, 0.08, abs(d - 0.34))) * 0.8;
          a *= vA;
          if (a < 0.01) discard;
          gl_FragColor = vec4(mix(uInk, uSilver, vTone), a);
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
    }),
  );

  // Kanten: wachsen vom Hub zum Knoten, sobald beide stehen
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
  edgeGeo.setAttribute('aFrom', new THREE.BufferAttribute(eFrom, 3));
  edgeGeo.setAttribute('aReveal', new THREE.BufferAttribute(eReveal, 1));
  edgeGeo.setAttribute('aPhase', new THREE.BufferAttribute(ePhase, 1));
  const lines = new THREE.LineSegments(
    edgeGeo,
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        attribute vec3 aFrom;
        attribute float aReveal;
        attribute float aPhase;
        uniform float uP;
        uniform float uTime;
        uniform float uFar;
        uniform float uFade;
        varying float vA;
        ${DRIFT}
        ${FAR}
        void main() {
          float g = smoothstep(aReveal + 0.015, aReveal + 0.045, uP);
          vec4 mv = modelViewMatrix * vec4(mix(aFrom, position, g) + drift(aPhase, uTime), 1.0);
          vA = 0.38 * uFade * step(0.001, g) * farFade(-mv.z, uFar);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 uSilver;
        varying float vA;
        void main() {
          gl_FragColor = vec4(uSilver, vA);
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
    }),
  );

  // Feine Datenströme auf zufälligen Kanten (Zeit nur als Ambient)
  const F = Math.round(count / 5);
  const fFrom = new Float32Array(F * 3);
  const fTo = new Float32Array(F * 3);
  const fOff = new Float32Array(F);
  const fSpd = new Float32Array(F);
  const fRev = new Float32Array(F);
  for (let k = 0; k < F; k++) {
    const [a, b] = edges[Math.floor(rand() * E)];
    for (let c = 0; c < 3; c++) {
      fFrom[k * 3 + c] = pos[a * 3 + c];
      fTo[k * 3 + c] = pos[b * 3 + c];
    }
    fOff[k] = rand();
    fSpd[k] = 0.05 + rand() * 0.12;
    fRev[k] = Math.max(reveal[a], reveal[b]) + 0.05;
  }
  const flowGeo = new THREE.BufferGeometry();
  flowGeo.setAttribute('position', new THREE.BufferAttribute(fFrom, 3));
  flowGeo.setAttribute('aTo', new THREE.BufferAttribute(fTo, 3));
  flowGeo.setAttribute('aOff', new THREE.BufferAttribute(fOff, 1));
  flowGeo.setAttribute('aSpd', new THREE.BufferAttribute(fSpd, 1));
  flowGeo.setAttribute('aReveal', new THREE.BufferAttribute(fRev, 1));
  const flows = new THREE.Points(
    flowGeo,
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        attribute vec3 aTo;
        attribute float aOff;
        attribute float aSpd;
        attribute float aReveal;
        uniform float uP;
        uniform float uTime;
        uniform float uPx;
        uniform float uFar;
        uniform float uFade;
        uniform float uFlow;
        varying float vA;
        ${FAR}
        void main() {
          float u = fract(aOff + uTime * aSpd);
          vec4 mv = modelViewMatrix * vec4(mix(position, aTo, u), 1.0);
          float z = -mv.z;
          float s = 0.16 * uPx / z;
          gl_PointSize = max(s, 1.5);
          gl_Position = projectionMatrix * mv;
          vA = 0.8 * uFade * uFlow * smoothstep(aReveal, aReveal + 0.03, uP) * sin(3.14159 * u) * min(1.0, s / 1.5) * farFade(z, uFar);
        }`,
      fragmentShader: `
        uniform vec3 uInk;
        varying float vA;
        void main() {
          float a = (1.0 - smoothstep(0.2, 0.5, length(gl_PointCoord - 0.5))) * vA;
          if (a < 0.01) discard;
          gl_FragColor = vec4(uInk, a);
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
    }),
  );

  return { objects: [lines, nodes, flows], uniforms, groups };
}
