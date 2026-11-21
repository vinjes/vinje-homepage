import * as THREE from 'three';

/*
 * backcall-Station: Ein Anruf erscheint als Stimmen-Planet neben dem Graphen.
 * Partikelkugel, deren Oberfläche wie eine Tonspur schwingt, zwei Orbitringe mit Mond, Signalwellen nach außen
 * und ein gepunkteter Signalpfad, der Knoten für Knoten in den Graphen läuft (ein Schritt je Abschnitt).
 * Alle Hauptbewegungen hängen an den Werten aus sync() (aus p abgeleitet); uTime/t nur für Ambient.
 */

const SILVER = new THREE.Color('#9C9A92');
const INK = new THREE.Color('#141414');
const SEG_DOTS = 30;
const RINGS = 3;

export interface VoiceState {
  show: number; // Planet erscheint
  amp: number; // Stimme: Ausschlag der Oberfläche
  phase: number; // Wellen und Signalringe laufen mit dem Scroll
  rings: number; // Deckkraft der Signalringe
  sweep: number; // 0..1: großer Signalring läuft einmal durch die Szene (Hook im Übergang)
  beam: number; // 0..1: Fortschritt des Signalpfads über alle Abschnitte
  beamAlpha: number;
  t: number; // Zeit in s (Ambient)
  face: THREE.Quaternion; // Ausrichtung zur Kamera im Koordinatensystem der Welt
}

export function circle(segments = 128) {
  const pts = new Float32Array(segments * 3);
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts[i * 3] = Math.cos(a);
    pts[i * 3 + 1] = Math.sin(a);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  return g;
}

export function buildVoice(center: THREE.Vector3, radius: number, count: number, dot: THREE.Texture, uPx: { value: number }) {
  const group = new THREE.Group();
  group.position.copy(center);

  // Planet: gleichmäßig verteilte Punkte auf der Kugel (Fibonacci)
  const dirs = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * (i + 0.5)) / count;
    const r = Math.sqrt(1 - y * y);
    const th = i * 2.399963;
    dirs[i * 3] = Math.cos(th) * r;
    dirs[i * 3 + 1] = y;
    dirs[i * 3 + 2] = Math.sin(th) * r;
    seed[i] = (Math.sin(i * 12.9898) * 43758.5453) % 1;
  }
  const uniforms = {
    uR: { value: radius },
    uAmp: { value: 0 },
    uShow: { value: 0 },
    uPhase: { value: 0 },
    uTime: { value: 0 },
    uPx,
    uInk: { value: INK },
    uSilver: { value: SILVER },
  };
  const planetGeo = new THREE.BufferGeometry();
  planetGeo.setAttribute('position', new THREE.BufferAttribute(dirs, 3));
  planetGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const planet = new THREE.Points(
    planetGeo,
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        attribute float aSeed;
        uniform float uR;
        uniform float uAmp;
        uniform float uShow;
        uniform float uPhase;
        uniform float uTime;
        uniform float uPx;
        varying float vA;
        varying float vT;
        void main() {
          float lon = atan(position.z, position.x);
          float w = 0.55 * sin(position.y * 10.0 + uPhase * 8.0 + uTime * 2.0)
                  + 0.45 * sin(lon * 6.0 + position.y * 5.0 - uPhase * 5.0 - uTime * 1.4);
          float r = uR * mix(0.15, 1.0, uShow) * (1.0 + uAmp * 0.16 * w);
          vec4 mv = modelViewMatrix * vec4(position * r, 1.0);
          float z = -mv.z;
          float s = (0.05 + 0.04 * abs(aSeed)) * uPx / z;
          gl_PointSize = max(s, 1.5);
          gl_Position = projectionMatrix * mv;
          vT = clamp(0.5 + 0.5 * w * uAmp, 0.0, 1.0);
          vA = uShow * min(1.0, s / 1.5) * (0.4 + 0.6 * vT);
        }`,
      fragmentShader: `
        uniform vec3 uInk;
        uniform vec3 uSilver;
        varying float vA;
        varying float vT;
        void main() {
          float a = (1.0 - smoothstep(0.25, 0.5, length(gl_PointCoord - 0.5))) * vA;
          if (a < 0.01) discard;
          gl_FragColor = vec4(mix(uSilver, uInk, vT), a);
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
    }),
  );
  group.add(planet);

  // Leuchtender Kern
  const coreGeo = new THREE.BufferGeometry();
  coreGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
  const coreMat = new THREE.PointsMaterial({ color: SILVER, size: radius * 1.6, map: dot, transparent: true, opacity: 0, depthWrite: false });
  group.add(new THREE.Points(coreGeo, coreMat));

  // Orbitringe mit Mond
  const ringGeo = circle();
  const orbits = [
    { r: 1.55, rx: 1.25, ry: 0.35, rz: 0 },
    { r: 2.0, rx: -1.05, ry: 0, rz: 0.6 },
  ].map((o) => {
    const line = new THREE.LineLoop(ringGeo, new THREE.LineBasicMaterial({ color: SILVER, transparent: true, opacity: 0, depthWrite: false }));
    line.scale.setScalar(radius * o.r);
    line.rotation.set(o.rx, o.ry, o.rz);
    group.add(line);
    return line;
  });
  const moonPos = new Float32Array(3);
  const moonGeo = new THREE.BufferGeometry();
  moonGeo.setAttribute('position', new THREE.BufferAttribute(moonPos, 3));
  const moonMat = new THREE.PointsMaterial({ color: INK, size: 0.22, map: dot, transparent: true, opacity: 0, depthWrite: false });
  const moon = new THREE.Points(moonGeo, moonMat);
  orbits[0].add(moon); // läuft im Ring-Koordinatensystem (Radius 1)
  moon.scale.setScalar(1 / (radius * 1.55));

  // Signalringe (zur Kamera gedreht) und ein großer Ring, der im Übergang einmal durch die Szene läuft
  const signals = Array.from({ length: RINGS + 1 }, () => {
    const line = new THREE.LineLoop(ringGeo, new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0, depthWrite: false }));
    group.add(line);
    return line;
  });

  // Signalpfad: gepunktete Bögen vom Planeten durch die Knoten, mit Lichtpunkt an der Spitze
  let segs: { a: THREE.Vector3; c: THREE.Vector3; b: THREE.Vector3 }[] = [];
  let beamArr = new Float32Array(0);
  let beamGeo = new THREE.BufferGeometry();
  const beamMat = new THREE.PointsMaterial({ color: INK, size: 0.14, map: dot, transparent: true, opacity: 0, depthWrite: false });
  const beam = new THREE.Points(beamGeo, beamMat);
  const beamLineMat = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0, depthWrite: false });
  const beamLine = new THREE.Line(beamGeo, beamLineMat); // dieselben Punkte als durchgehende Spur
  const headPos = new Float32Array(3);
  const headGeo = new THREE.BufferGeometry();
  headGeo.setAttribute('position', new THREE.BufferAttribute(headPos, 3));
  const headMat = new THREE.PointsMaterial({ color: INK, size: 0.34, map: dot, transparent: true, opacity: 0, depthWrite: false });
  const head = new THREE.Points(headGeo, headMat);

  // Bögen in Weltkoordinaten (Pfad liegt außerhalb der Gruppe, damit er bei den Knoten ankommt)
  const setPath = (points: THREE.Vector3[], parent: THREE.Object3D) => {
    segs = [];
    for (let k = 0; k < points.length - 1; k++) {
      const a = points[k];
      const b = points[k + 1];
      const c = a.clone().add(b).multiplyScalar(0.5);
      c.y += a.distanceTo(b) * 0.28;
      segs.push({ a, b, c });
    }
    beamArr = new Float32Array(segs.length * SEG_DOTS * 3);
    beamGeo = new THREE.BufferGeometry();
    beamGeo.setAttribute('position', new THREE.BufferAttribute(beamArr, 3));
    beam.geometry = beamGeo;
    beamLine.geometry = beamGeo;
    parent.add(beamLine, beam, head);
  };

  const bez = (s: (typeof segs)[number], u: number, out: Float32Array, o: number) => {
    const v = 1 - u;
    out[o] = v * v * s.a.x + 2 * v * u * s.c.x + u * u * s.b.x;
    out[o + 1] = v * v * s.a.y + 2 * v * u * s.c.y + u * u * s.b.y;
    out[o + 2] = v * v * s.a.z + 2 * v * u * s.c.z + u * u * s.b.z;
  };

  const sync = (o: VoiceState) => {
    uniforms.uShow.value = o.show;
    uniforms.uAmp.value = o.amp;
    uniforms.uPhase.value = o.phase;
    uniforms.uTime.value = o.t;
    group.visible = o.show > 0.001 || o.sweep > 0.001;
    coreMat.opacity = 0.35 * o.show * (0.6 + 0.4 * o.amp);
    for (const l of orbits) (l.material as THREE.LineBasicMaterial).opacity = 0.45 * o.show;
    const ma = o.t * 0.5 + o.phase * 3; // Mond: Ambient plus Scroll
    moonPos[0] = Math.cos(ma);
    moonPos[1] = Math.sin(ma);
    moonGeo.attributes.position.needsUpdate = true;
    moonMat.opacity = o.show;

    // Signalringe wandern mit dem Scroll nach außen und verblassen
    for (let k = 0; k < RINGS; k++) {
      const f = (((o.phase * 2 + k / RINGS) % 1) + 1) % 1;
      const s = signals[k];
      s.quaternion.copy(o.face);
      s.scale.setScalar(radius * (1.05 + f * 2.6));
      (s.material as THREE.LineBasicMaterial).opacity = 0.5 * o.rings * o.show * (1 - f) ** 1.5;
    }
    const sw = signals[RINGS];
    sw.quaternion.copy(o.face);
    sw.scale.setScalar(radius * (1 + o.sweep * 16));
    (sw.material as THREE.LineBasicMaterial).opacity = 0.6 * Math.sin(Math.PI * o.sweep);

    // Signalpfad: fertige Abschnitte voll, laufender Abschnitt bis zur Spitze; Puls läuft als Ambient entlang
    const n = segs.length;
    if (!n) return;
    const f = Math.min(n - 1e-6, Math.max(0, o.beam * n));
    const cur = Math.floor(f);
    const frac = f - cur;
    let i = 0;
    for (let k = 0; k < n; k++) {
      const end = k < cur ? 1 : k === cur ? frac : 0;
      for (let d = 0; d < SEG_DOTS; d++) {
        bez(segs[k], (d / (SEG_DOTS - 1)) * end, beamArr, i * 3);
        i++;
      }
    }
    beamGeo.attributes.position.needsUpdate = true;
    beamGeo.setDrawRange(0, (cur + 1) * SEG_DOTS); // laufender Abschnitt: Punkte verteilt bis zur Spitze
    beamMat.opacity = 0.85 * o.beamAlpha;
    beamLineMat.opacity = 0.35 * o.beamAlpha;
    bez(segs[cur], frac, headPos, 0);
    headGeo.attributes.position.needsUpdate = true;
    headMat.opacity = o.beamAlpha * (0.6 + 0.4 * Math.sin(o.t * 5));
  };

  return { group, setPath, sync };
}
