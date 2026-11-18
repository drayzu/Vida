import * as THREE from 'three';
import { Timeline, EASE, type Ease } from './timeline';
import { pantalla } from '../src/engine/pantalla';
import { enfocar, materia, type MateriaData } from '../src/engine/materia';
import { clamp, lerp, rng, smoothstep } from '../src/engine/math';
import { FONT, ink, type Cuenta, type Rotulo } from './placa';
import { SEGURO, TIBIO, V, ease } from './comun';
import type { Escena, Frame, Instancia } from './tipos';

/**
 * Study · «Los flotadores» (BRIEF v2, golden shot 5). Phase 0.
 *
 * Balloon beings kilometres wide in the clouds of a giant planet (Sagan and Salpeter, 1976), with
 * the planet's storm below and its ring above. The rule this study tries out: the black of the
 * series stays, and colour is light. What is alive glows in colour; the clouds are dim and the sky
 * is dark. One unit is one kilometre.
 *
 * The same world, three ways in:
 *  1 · La manada: from far, into a herd that goes on to the horizon.
 *  2 · Debajo de uno: from the dark under a single giant, up between its tendrils and out by its dome.
 *  3 · La caída: from the ring, down through the cloud layers, to rest beside one.
 */

type RGB = [number, number, number];
const lin = (hex: string): RGB => {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
};
const mz = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** The low, small sun (the planet is far from its star): ahead and to the left. */
const SOL = V(-0.74, 0.16, -0.65).normalize();
/** Latitude of the place: how high the ring arches. */
const LAT = 0.42;

const ORO = lin('#ffc46b');
const VIOLETA = lin('#8f6bff');
const BRASA = lin('#ff5a2a');
const TONOS: [RGB, RGB][] = [
  [lin('#ffb469'), lin('#ff7fa6')],
  [lin('#b990ff'), lin('#7fa2ff')],
  [lin('#ff8f7a'), lin('#ffc86b')],
  [lin('#ff86c0'), lin('#b48cff')],
  [lin('#ffd08a'), lin('#ff9a6e')],
];
const NUCLEO: RGB = [TIBIO.r, TIBIO.g, TIBIO.b];

// ---------------------------------------------------------------- noise (CPU)

const h2 = (x: number, y: number) => {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
function ruido(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  return lerp(lerp(h2(xi, yi), h2(xi + 1, yi), u), lerp(h2(xi, yi + 1), h2(xi + 1, yi + 1), u), v);
}
function fbm(x: number, y: number) {
  let a = 0.5;
  let s = 0;
  for (let i = 0; i < 4; i++) {
    s += a * ruido(x, y);
    x = x * 2.03 + 17.1;
    y = y * 2.03 + 17.1;
    a *= 0.5;
  }
  return s;
}

// ---------------------------------------------------------------- the beings

interface Ser {
  c: THREE.Vector3;
  R: number;
  fase: number;
  bpm: number;
  tono: [RGB, RGB];
  /** Level of detail: 1 is the hero. */
  q: number;
}

/** The one the study is about: 6.4 km wide, one heartbeat every ten seconds. */
const HEROE: Ser = { c: V(0, 2, 0), R: 3.2, fase: 0, bpm: 6, tono: TONOS[0], q: 1 };

function acopio(seed: number) {
  const r = rng(seed);
  const pos: number[] = [];
  const col: number[] = [];
  const inks: number[] = [];
  const size: number[] = [];
  const seeds: number[] = [];
  const kind: number[] = [];
  const delay: number[] = [];
  const aC: number[] = [];
  const aN: number[] = [];
  const aQ: number[] = [];
  return {
    r,
    get count() {
      return size.length;
    },
    put(x: number, y: number, z: number, c: RGB, luz: number, s: number, k: number, tinta = 0, C: number[] = [0, 0, 0], N: number[] = [0, 0, 0], Q: number[] = [0, 0, -1, 1], d = 0) {
      const v = luz * (0.8 + 0.4 * r());
      pos.push(x, y, z);
      col.push(c[0] * v, c[1] * v, c[2] * v);
      inks.push(tinta);
      size.push(s * (0.7 + 0.6 * r()));
      seeds.push(r());
      kind.push(k);
      delay.push(d);
      aC.push(C[0], C[1], C[2]);
      aN.push(N[0], N[1], N[2]);
      aQ.push(Q[0], Q[1], Q[2], Q[3]);
    },
    datos() {
      const f = (a: number[]) => new Float32Array(a);
      const position = f(pos);
      const data: MateriaData = { position, aFrom: position, color: f(col), aInk: f(inks), size: f(size), seed: f(seeds), aDelay: f(delay), aKind: f(kind) };
      return { data, aC: f(aC), aN: f(aN), aQ: f(aQ) };
    },
  };
}
type Acopio = ReturnType<typeof acopio>;

/**
 * One being, as points around its centre (the shader puts them there and moves them): a bell with
 * eight lobes and an inward lip, ribs, gas cells and a heart inside, frills under it and long
 * tendrils. Kinds: 0 skin, 1 ribs and lip, 2 heart, 3 gas cells, 4 tendrils and frills, 5 beads.
 */
function ser(b: Acopio, s: Ser) {
  const r = b.r;
  const { R, q } = s;
  const C = [s.c.x, s.c.y, s.c.z];
  const cuerpo = [s.fase, s.bpm, -1, R];
  const n = (base: number, min = 0) => Math.max(min, Math.round(base * q));
  const [t1, t2] = s.tono;

  /** The bell's profile at polar angle th (0 at the top, 2.0 at the lip): radius and height. */
  const perfil = (th: number, ph: number): [number, number] => {
    const bajo = Math.max(0, th - Math.PI / 2);
    const rad = (th <= Math.PI / 2 ? Math.sin(th) : 1 - 0.9 * bajo) * (1 + 0.04 * Math.cos(8 * ph) * smoothstep(0.3, 1.4, th));
    const y = th <= Math.PI / 2 ? 0.78 * Math.cos(th) : -0.45 * bajo;
    return [rad, y];
  };
  const piel = (th: number, ph: number, c: RGB, luz: number, size: number, k: number, tinta: number) => {
    const [rad, y] = perfil(th, ph);
    const nx = Math.cos(ph) * Math.sin(th);
    const ny = Math.cos(th) * 1.25;
    const nz = Math.sin(ph) * Math.sin(th);
    const nl = Math.hypot(nx, ny, nz) || 1;
    b.put(rad * Math.cos(ph) * R, y * R, rad * Math.sin(ph) * R, c, luz, size * R, k, tinta, C, [nx / nl, ny / nl, nz / nl], cuerpo);
  };

  for (let i = 0; i < n(15000, 110); i++) {
    const th = Math.acos(1 - r() * 1.416);
    piel(th, r() * Math.PI * 2, mz(t1, t2, smoothstep(0.9, 2.0, th)), 0.2, 0.012, 0, 0.22);
  }
  // Ribs: sixteen meridians, in the valleys and on the crests of the lobes.
  for (let i = 0; i < n(6500, 60); i++) {
    const k = Math.floor(r() * 16);
    piel(0.08 + r() * 1.92, (k / 16) * Math.PI * 2 + (r() - 0.5) * 0.012, mz(t1, NUCLEO, 0.35), 0.38, 0.011, 1, 0.1);
  }
  // The lip, and a fainter line where the bell is widest.
  for (let i = 0; i < n(3200, 50); i++) piel(2.0 - r() * r() * 0.07, r() * Math.PI * 2, mz(t2, NUCLEO, 0.3), 0.6, 0.013, 1, 0.1);
  for (let i = 0; i < n(1200, 0); i++) piel(Math.PI / 2 + (r() - 0.5) * 0.02, r() * Math.PI * 2, t1, 0.4, 0.01, 1, 0);

  // Gas cells: five bubbles inside the bell.
  for (let g = 0; g < 5; g++) {
    const a = (g / 5) * Math.PI * 2 + s.fase * 6;
    const cx = Math.cos(a) * 0.4;
    const cz = Math.sin(a) * 0.4;
    for (let i = 0; i < n(1100, 8); i++) {
      const u = r() * 2 - 1;
      const p = r() * Math.PI * 2;
      const w = Math.sqrt(1 - u * u);
      const N = [Math.cos(p) * w, u, Math.sin(p) * w];
      b.put((cx + N[0] * 0.27) * R, (0.2 + N[1] * 0.24) * R, (cz + N[2] * 0.27) * R, t2, 0.42, 0.011 * R, 3, 0, C, N, cuerpo);
    }
  }
  // The heart.
  const nCor = n(1500, 7);
  const luzCor = Math.min(1, 0.15 * Math.sqrt(1500 / nCor));
  for (let i = 0; i < nCor; i++) {
    const d = 0.1 * Math.pow(r(), 0.7);
    const u = r() * 2 - 1;
    const p = r() * Math.PI * 2;
    const w = Math.sqrt(1 - u * u);
    b.put(Math.cos(p) * w * d * R, (0.12 + u * d) * R, Math.sin(p) * w * d * R, mz(NUCLEO, t1, 0.25), luzCor, 0.02 * R, 2, 0, C, [0, 0, 0], cuerpo);
  }
  // Threads from the heart to the lip.
  for (let i = 0; i < n(2400, 0); i++) {
    const k = Math.floor(r() * 16);
    const ph = ((k + 0.5) / 16) * Math.PI * 2;
    const t = r();
    const [rad, y] = perfil(1.95, ph);
    b.put(lerp(0, rad * Math.cos(ph), t) * R, (lerp(0.1, y, t) - 0.12 * Math.sin(t * Math.PI)) * R, lerp(0, rad * Math.sin(ph), t) * R, mz(NUCLEO, t2, t), 0.3, 0.008 * R, 1, 0, C, [0, 0, 0], cuerpo);
  }

  // Tendrils: from the lip, several times longer than the bell.
  const hilos = Math.max(5, Math.round(38 * Math.sqrt(q)));
  const porHilo = Math.max(10, Math.round(270 * Math.sqrt(q)));
  for (let h = 0; h < hilos; h++) {
    const a = r() * Math.PI * 2;
    const rad = 0.6 * (0.45 + 0.55 * Math.sqrt(r()));
    const largo = 2.2 + 3.6 * r();
    const sem = r();
    for (let i = 0; i < porHilo; i++) {
      const j = largo * r();
      const cuenta = r() < 0.045;
      const e = (r() - 0.5) * 0.012;
      b.put((Math.cos(a) * rad + e) * R, (-0.19 - j) * R, (Math.sin(a) * rad + e) * R, mz(t2, t1, j / largo), cuenta ? 1.3 : 0.5 * (1 - 0.6 * (j / largo)), (cuenta ? 0.024 : 0.009) * R, cuenta ? 5 : 4, 0, C, [sem, 0, 0], [s.fase, s.bpm, j, R]);
    }
  }
  // Frills: ruffled ribbons under the middle of the bell.
  for (let h = 0; h < Math.max(3, Math.round(7 * Math.sqrt(q))); h++) {
    const a = r() * Math.PI * 2;
    const sem = r();
    const largo = 1.1 + 0.9 * r();
    for (let i = 0; i < n(650, 6); i++) {
      const j = largo * Math.pow(r(), 0.8);
      const ancho = 0.05 + 0.16 * Math.sin((j / largo) * Math.PI);
      const o = (r() - 0.5) * 2 * ancho;
      const riza = 0.05 * Math.sin(j * 16 + o * 22 + sem * 9);
      const rad = 0.16 + riza;
      b.put((Math.cos(a) * rad - Math.sin(a) * o) * R, (-0.05 - j) * R, (Math.sin(a) * rad + Math.cos(a) * o) * R, mz(t1, t2, 0.5 + 0.5 * Math.sin(o * 9)), 0.3, 0.009 * R, 4, 0, C, [sem, 0, 0], [s.fase, s.bpm, j * 0.7, R]);
    }
  }
}

/** The herd: a river of beings that bends away to the horizon. Far ones first. */
function manada(): Ser[] {
  const r = rng(77);
  const out: Ser[] = [HEROE];
  // The ones near the hero are placed by hand, so the camera can go between them.
  const cerca: [number, number, number, number, number][] = [
    [-13, 5.5, -16, 1.9, 1],
    [11, -1, -24, 2.4, 2],
    [17, 7, 6, 1.3, 3],
    [-21, 0.5, 11, 1.5, 4],
    [5, 9, -44, 2.8, 1],
    [-8, -3, -52, 1.1, 0],
    [24, 3, -58, 2.0, 3],
    [-27, 8, -40, 2.6, 2],
    [-4.5, 6.8, 9.5, 0.42, 3],
    [-6.2, 6.1, 8.4, 0.3, 4],
    [7.4, 5.2, -6, 0.5, 1],
  ];
  for (const [x, y, z, R, t] of cerca) out.push({ c: V(x, y, z), R, fase: r(), bpm: clamp(6 * Math.sqrt(3.2 / R), 6, 22), tono: TONOS[t], q: clamp(0.22 * (R / 2), 0.05, 0.3) });
  let puestos = 0;
  while (puestos < 330) {
    const s = Math.pow(r(), 1.5);
    const z = 70 - 760 * s;
    const eje = 55 * Math.sin(s * 4.2 + 0.4) + 160 * s * s;
    const ancho = 26 + 90 * s;
    const x = eje + (r() + r() + r() - 1.5) * ancho;
    const y = 3 + (r() + r() - 1) * (9 + 22 * s) + 30 * s * s;
    const d = Math.hypot(x, y - 2, z);
    if (d < 34 && Math.hypot(x, z) < 30) continue;
    const R = 0.35 + 2.6 * Math.pow(r(), 2.2);
    const q = d < 60 ? 0.06 : d < 160 ? 0.035 : 0.016;
    out.push({ c: V(x, y, z), R, fase: r(), bpm: clamp(6 * Math.sqrt(3.2 / R), 6, 22), tono: TONOS[Math.floor(r() * TONOS.length)], q });
    puestos++;
  }
  return out.sort((a, b) => a.c.z - b.c.z);
}

// ---------------------------------------------------------------- the clouds

/** How much cloud there is at (x, z), 0..1: a gap is left where the hero's tendrils hang. */
const cubierta = (x: number, z: number) => smoothstep(0.4, 0.62, fbm(x * 0.01 + 3, z * 0.01 + 7)) * smoothstep(9, 24, Math.hypot(x, z));
/** The top of the deck: a sea at −16 km with towers that reach the beings. */
const cima = (x: number, z: number) => -16 + cubierta(x, z) * (3 + 17 * Math.pow(fbm(x * 0.035 + 1, z * 0.035 + 5), 2));

/** Distance from (x, z) to the line the cameras stay near (x = 0, z from −60 to 60). */
const alCamino = (x: number, z: number) => Math.hypot(x, z - clamp(z, -60, 60));

function nubes() {
  const b = acopio(909);
  const r = b.r;
  const tmp: [number, number, number, RGB, number, number, number, number][] = [];

  // The deck.
  for (let i = 0; i < 760_000; i++) {
    const d = 2 * Math.pow(210, r());
    const a = r() * Math.PI * 2;
    const x = Math.cos(a) * d;
    const z = (r() * 2 - 1) * 60 + Math.sin(a) * d;
    const dm = alCamino(x, z);
    if (r() > Math.min(1, (dm + 3) / (d + 3))) continue;
    const cov = cubierta(x, z);
    if (cov < 0.04 || r() > cov * 1.4) continue;
    const top = cima(x, z);
    const e = 1.2;
    let nx = cima(x - e, z) - cima(x + e, z);
    let nz = cima(x, z - e) - cima(x, z + e);
    let ny = 2 * e;
    const nl = Math.hypot(nx, ny, nz);
    nx /= nl;
    ny /= nl;
    nz /= nl;
    const hondo = Math.pow(r(), 3.2);
    const sol = Math.pow(Math.max(0, nx * SOL.x + ny * 0.35 + nz * SOL.z), 1.5) * (1 - 0.7 * hondo);
    const fino = (1 - cov) * 0.5;
    const c: RGB = [
      VIOLETA[0] * (0.1 + 0.22 * ny) + ORO[0] * (2.1 * sol + fino),
      VIOLETA[1] * (0.1 + 0.22 * ny) + ORO[1] * (2.1 * sol + fino),
      VIOLETA[2] * (0.1 + 0.22 * ny) + ORO[2] * (2.1 * sol + fino),
    ];
    tmp.push([x, top - hondo * 5 + (r() - 0.5) * 0.5, z, c, 0.26 * (1 - 0.6 * hondo), 0.0042 * Math.max(dm, 6), 0, 0.3]);
  }
  // Heaps: storm clouds that stand kilometres over the deck, each a pile of spheres, gold on the
  // side of the sun and dark on the other.
  const LUZ = V(SOL.x, 0.38, SOL.z).normalize();
  for (let gx = -7; gx <= 7; gx++) {
    for (let gz = -9; gz <= 3; gz++) {
      const h = h2(gx + 50, gz + 90);
      if (h > 0.42) continue;
      const cx = (gx + 0.2 + 0.6 * h2(gx, gz + 7)) * 46;
      const cz = (gz + 0.2 + 0.6 * h2(gx + 9, gz)) * 46;
      const dm = alCamino(cx, cz);
      if (dm < 36) continue;
      const Rt = 9 + 26 * h;
      const top = -3 + 17 * h2(gx + 3, gz + 11);
      const nb = 9 + Math.floor(8 * r());
      const esf: [number, number, number, number][] = [];
      for (let k = 0; k < nb; k++) {
        const t = k / nb;
        const a = r() * Math.PI * 2;
        const dist = Rt * (1 - 0.8 * t) * Math.sqrt(r());
        const rr = Rt * (0.5 - 0.26 * t) * (0.7 + 0.6 * r());
        esf.push([cx + Math.cos(a) * dist, -18 + (top + 18) * t + rr * 0.25, cz + Math.sin(a) * dist, rr]);
      }
      const m = Math.round(clamp(34000 / (1 + dm / 50), 3000, 16000));
      let puestos = 0;
      for (let i = 0; i < m * 3 && puestos < m; i++) {
        const e = esf[Math.floor(r() * nb)];
        if (r() > (e[3] / (Rt * 0.65)) ** 2) continue;
        const u = r() * 1.3 - 0.3;
        const a = r() * Math.PI * 2;
        const w = Math.sqrt(1 - u * u);
        const dx = Math.cos(a) * w;
        const dz = Math.sin(a) * w;
        const rr = e[3] * (0.94 + 0.16 * fbm(dx * 3 + e[0], u * 3 + dz * 3 + e[2]));
        const x = e[0] + dx * rr;
        const y = e[1] + u * rr;
        const z = e[2] + dz * rr;
        let dentro = false;
        for (const o of esf) if (o !== e && Math.hypot(x - o[0], y - o[1], z - o[2]) < o[3] * 0.97) dentro = true;
        if (dentro) continue;
        puestos++;
        const sol = Math.pow(Math.max(0, dx * LUZ.x + u * LUZ.y + dz * LUZ.z), 1.6);
        const sombra = 0.04 + 0.08 * Math.max(u, 0);
        const c: RGB = [VIOLETA[0] * sombra + ORO[0] * 1.5 * sol, VIOLETA[1] * sombra + ORO[1] * 1.5 * sol, VIOLETA[2] * sombra + ORO[2] * 1.5 * sol];
        tmp.push([x, y, z, c, 0.3, 0.0042 * Math.max(dm, 6), 0, 0.5]);
      }
    }
  }
  // High wisps the fall goes through: thin, violet, combed by the wind.
  for (let i = 0; i < 160_000; i++) {
    const x = (r() * 2 - 1) * 170;
    const z = (r() * 2 - 1) * 170 - 20;
    const f = fbm(x * 0.006 + 40, z * 0.045 + 12);
    if (f < 0.5 || r() > (f - 0.5) * 7) continue;
    const c = mz(VIOLETA, ORO, 0.25 * r());
    tmp.push([x, 46 + 6 * fbm(x * 0.02, z * 0.02) + (r() - 0.5) * 1.5, z, c, 0.07, 0.12 + 0.003 * Math.hypot(x, z), 2, 0]);
  }
  // The storm, far below: a spiral as wide as a continent, with lightning.
  const TX = 30;
  const TZ = -95;
  for (let i = 0; i < 70_000; i++) {
    const a = r() * Math.PI * 2;
    const rad = 190 * Math.pow(r(), 0.62);
    const brazo = 0.5 + 0.5 * Math.sin(3 * a + Math.log(rad + 4) * 5.2);
    if (r() > 0.12 + 0.88 * brazo * brazo) continue;
    const x = TX + Math.cos(a) * rad;
    const z = TZ + Math.sin(a) * rad * 0.8;
    const y = -78 - 22 * Math.exp(-rad / 26) + (r() - 0.5) * 5 + 6 * fbm(x * 0.03, z * 0.03);
    const c = mz(BRASA, VIOLETA, smoothstep(0.25, 0.9, brazo * (0.6 + 0.4 * r())));
    const celda = h2(Math.floor((a / (Math.PI * 2)) * 9), Math.floor(rad / 24));
    tmp.push([x, y, z, c, 0.2 + 0.3 * Math.exp(-rad / 40), 0.4, 1, celda]);
  }

  // Far to near, for a camera that looks towards −z.
  tmp.sort((p, q) => p[2] - q[2]);
  for (const [x, y, z, c, luz, size, k, extra] of tmp) b.put(x, y, z, c, luz, size, k, k === 0 ? extra : 0, undefined, undefined, undefined, k === 1 ? extra : 0);
  return b.datos().data;
}

// ---------------------------------------------------------------- the sky

const FONDO = /* glsl */ `
  uniform vec3 uSol;
  uniform float uLat, uAnillo, uDisco;
  float h21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float n1(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h21(vec2(i, 3.7)), h21(vec2(i + 1.0, 3.7)), f); }
  void main() {
    vec3 d = normalize(vDir);
    // Night above, the deep below, a little warmth where the sun is.
    float alto = smoothstep(-0.1, 0.8, d.y);
    vec3 col = mix(vec3(0.013, 0.006, 0.016), vec3(0.004, 0.003, 0.012), alto);
    col = mix(col, vec3(0.0), smoothstep(0.0, -0.7, d.y) * 0.8);
    float cs = max(dot(d, uSol), 0.0);
    float franja = exp(-abs(d.y - 0.02) * 7.0);
    col += vec3(0.05, 0.02, 0.014) * franja * (0.2 + 0.8 * pow(cs, 3.0));
    col += vec3(0.012, 0.005, 0.018) * franja;
    col += vec3(1.0, 0.72, 0.42) * (pow(cs, 9000.0) * 2.2 + pow(cs, 260.0) * 0.05) * uDisco;

    // The ring: where this ray meets the planet's equatorial plane (the planet's radius is 1 and we
    // stand on it, at latitude uLat).
    vec3 A = vec3(0.0, sin(uLat), cos(uLat));
    float dA = dot(d, A);
    if (dA < -1e-4) {
      float t = -sin(uLat) / dA;
      vec3 Hh = vec3(0.0, 1.0, 0.0) + d * t;
      float rr = length(Hh);
      float banda = smoothstep(1.28, 1.34, rr) * (1.0 - smoothstep(2.2, 2.32, rr));
      float tono = pow(n1(rr * 46.0), 1.6) * (0.3 + 0.7 * pow(n1(rr * 330.0), 2.0)) * 1.6;
      tono *= 1.0 - 0.9 * (smoothstep(1.9, 1.93, rr) * (1.0 - smoothstep(1.97, 2.0, rr)));
      tono *= 1.0 - 0.6 * (smoothstep(1.5, 1.52, rr) * (1.0 - smoothstep(1.54, 1.56, rr)));
      float ang = atan(Hh.x, -Hh.z);
      float grano = 0.6 + 0.8 * h21(floor(vec2(rr * 1400.0, ang * 1400.0)));
      // The planet's shadow falls across the far side of the ring.
      vec3 Hs = Hh - uSol * dot(Hh, uSol);
      float sombra = dot(Hh, uSol) < 0.0 ? smoothstep(0.96, 1.03, length(Hs)) : 1.0;
      float bruma = smoothstep(0.04, 0.42, d.y);
      col += vec3(1.0, 0.86, 0.7) * banda * tono * grano * bruma * (0.08 + 0.92 * sombra) * 0.2 * uAnillo;
    }
    // A few stars.
    vec2 sc = vec2(atan(d.x, d.z), asin(clamp(d.y, -1.0, 1.0))) * 240.0;
    vec2 ci = floor(sc);
    float st = h21(ci);
    if (st > 0.985) col += vec3(0.8, 0.82, 1.0) * (st - 0.985) * 40.0 * exp(-dot(fract(sc) - 0.5, fract(sc) - 0.5) * 30.0) * smoothstep(0.05, 0.35, d.y);
    gl_FragColor = vec4(col, 1.0);
  }
`;

// ---------------------------------------------------------------- the scene

const SER_PRE = /* glsl */ `
  attribute vec3 aC, aN;
  attribute vec4 aQ;
  uniform float uViento;
  ${SEGURO}
`;

const SER_MOVE = /* glsl */ `
  float fase = aQ.x, bpm = aQ.y, j = aQ.z, R = aQ.w;
  float tt = uTime + fase * 97.0;
  float bt = lubdub(tt, bpm);
  vec3 l = position;
  if (j < 0.0) {
    // The bell closes a little on every beat, and everything in it lights up.
    float bajo = 1.0 - smoothstep(-0.2 * R, 0.6 * R, l.y);
    l.xz *= 1.0 - 0.06 * bt * bajo;
    l.y *= 1.0 + 0.035 * bt;
    em *= 1.0 + 0.4 * bt;
    if (aKind > 1.5 && aKind < 2.5) { em *= 0.55 + 1.9 * bt; fuente = 1.0; }
  } else {
    // Tendrils sway, trail in the wind, and carry each beat down as a pulse of light.
    float w = uTime * 0.3 + fase * 6.28 + aN.x * 6.28;
    l.x += R * (0.09 * sin(w + j * 2.4) * j + uViento * j * j);
    l.z += R * (0.09 * cos(w * 0.83 + j * 2.0) * j);
    float x = fract(tt * bpm / 60.0);
    float dj = (j - x * 6.5) / 0.24;
    em *= 0.42 + 3.4 * exp(-dj * dj) * (1.0 - 0.1 * j);
    if (aKind > 4.5) fuente = 0.6;
  }
  fuente = max(fuente, 0.3);
  l.y += R * 0.05 * sin(uTime * 0.21 + fase * 6.28);
  p = aC + l;
  if (j < 0.0 && dot(aN, aN) > 0.5) {
    // A membrane: faint face on, bright at the edge.
    vec3 nv = normalize(mat3(modelViewMatrix) * aN);
    vec3 vv = normalize((modelViewMatrix * vec4(p, 1.0)).xyz);
    float fr = 1.0 - abs(dot(nv, vv));
    em *= 0.1 + 1.35 * fr * fr;
  }
  em *= 1.0 + 0.12 * sin(uTime * (0.5 + seed) + seed * 40.0);
`;

const NUBE_MOVE = /* glsl */ `
  p.y += 0.2 * sin(uTime * 0.11 + seed * 30.0);
  if (aKind > 1.5) em *= uVelo;
  else if (aKind > 0.5) {
    float paso = floor(uTime * 9.0);
    float fl = step(0.993, fract(sin(paso * 12.9898 + aDelay * 3911.7) * 43758.5453));
    em = em * (1.0 + 6.0 * fl) + vec3(0.3, 0.27, 0.5) * fl * 0.25;
    em *= uTormenta;
  }
`;

let SERES: ReturnType<Acopio['datos']> | null = null;
let NUBES: MateriaData | null = null;

export const flotadores: Escena = {
  id: 'flotadores',
  nombre: 'Los flotadores',
  estilos: [
    { key: '1', nombre: 'La manada', nota: 'De lejos son chispas en el horizonte. La cámara entra en la manada, pasa junto a uno de seis kilómetros y sube: siguen hasta donde alcanza la vista.' },
    { key: '2', nombre: 'Debajo de uno', nota: 'Empieza en lo oscuro, bajo un solo gigante: solo sus hilos, con el latido bajando como luz. La cámara sube entre ellos, ve la campana por dentro y sale junto a la cúpula.' },
    { key: '3', nombre: 'La caída', nota: 'Empieza en el anillo. La cámara cae por las capas de nubes, con la tormenta abajo, y se queda flotando al lado de uno.' },
  ],
  montar(stage, modo): Instancia {
    const { root, camera } = stage;

    const fondo = pantalla(FONDO, { uSol: { value: SOL.clone() }, uLat: { value: LAT }, uAnillo: { value: 1 }, uDisco: { value: modo === 1 ? 0 : 1 } });
    root.add(fondo.mesh);

    NUBES ??= nubes();
    const nube = materia(NUBES, { pre: /* glsl */ `uniform float uTormenta, uVelo;`, move: NUBE_MOVE, uniforms: { uTormenta: { value: 1 }, uVelo: { value: modo === 2 ? 1 : 0 } } });
    nube.u.uInk.value = 1;
    nube.u.uFog.value = 190;
    nube.u.uFogNear.value = 25;
    nube.points.renderOrder = 1;
    root.add(nube.points);

    if (!SERES) {
      const b = acopio(2026);
      for (const s of manada()) ser(b, s);
      SERES = b.datos();
    }
    const seres = materia(SERES.data, {
      pre: SER_PRE,
      move: SER_MOVE,
      uniforms: { uViento: { value: 0.016 } },
      extra: { aC: [SERES.aC, 3], aN: [SERES.aN, 3], aQ: [SERES.aQ, 4] },
    });
    seres.u.uInk.value = 1;
    seres.u.uFog.value = 300;
    seres.u.uFogNear.value = 40;
    seres.points.renderOrder = 2;
    root.add(seres.points);

    // ------------------------------------------------ the choreography
    const tl = new Timeline({ luz: 1, regla: 0, anillo: 1 });
    const cam = (dur: number, p: THREE.Vector3, t: THREE.Vector3, e: Ease | null = null) => tl.to(dur, { px: p.x, py: p.y, pz: p.z, tx: t.x, ty: t.y, tz: t.z }, e);
    const camSet = (p: THREE.Vector3, t: THREE.Vector3) => tl.set({ px: p.x, py: p.y, pz: p.z, tx: t.x, ty: t.y, tz: t.z });
    const H = HEROE.c;
    const SIN_SUELO = 'Un planeta sin suelo: nubes, y debajo más nubes, miles de kilómetros.';
    const FLOTAR = 'Lo que viviera aquí no podría posarse nunca. Flotaría toda su vida.';
    const SEIS = 'Un solo ser, del tamaño de una ciudad. Su corazón late una vez cada diez segundos.';
    const NADIE = 'Nadie los ha visto. Es posible que existan.';

    if (modo === 0) {
      camSet(V(-34, 5, 96), V(6, 6, -120));
      tl.set({ luz: 0.0 });
      tl.caption(4, 'Otro cielo', SIN_SUELO);
      tl.with(1.2, { luz: 1 });
      cam(4, V(-25, 4.5, 62), V(4, 4, -110));
      tl.caption(6, 'Los flotadores', FLOTAR);
      cam(6, V(-11, 3.2, 24), V(1, 2.5, -40));
      tl.caption(8, 'Seis kilómetros', SEIS);
      tl.with(2.5, { regla: 1 });
      cam(4, V(-7.6, 1.2, 8.5), V(1.5, 1.0, -24));
      tl.with(2, { regla: 0 });
      cam(4, V(-4.4, -3.4, -4.5), V(3, -1, -60));
      tl.caption(8, 'La manada', NADIE);
      cam(4, V(-1, 3, -19), V(14, 6, -140));
      cam(4, V(4, 17, -30), V(45, 42, -420));
    } else if (modo === 1) {
      camSet(V(0.9, -15.5, 2.2), V(0.2, 0.5, 0.3));
      tl.set({ luz: 0.0, anillo: 0 });
      tl.caption(6, 'Debajo', 'En lo oscuro, algo baja como luz por unos hilos de kilómetros.');
      tl.with(1.2, { luz: 1 });
      cam(6, V(1.3, -9.5, 2.6), V(0.1, 1.2, 0.1));
      tl.caption(6, 'Por dentro', 'Bolsas de gas más liviano que el aire. Y en el centro, algo que late.');
      cam(6, V(1.9, -2.6, 3.4), V(0, 2.3, 0));
      tl.caption(6, 'Seis kilómetros', SEIS);
      tl.with(3, { anillo: 1 });
      cam(3, V(5.2, -0.6, 6.4), V(0, 2.2, 0));
      tl.with(2, { regla: 1 });
      cam(3, V(8.5, 3.2, 10.5), V(-0.5, 2.4, -3));
      tl.caption(7, 'La manada', NADIE);
      tl.with(2, { regla: 0 });
      cam(3.5, V(9.5, 8.5, 12), V(-4, 3, -40));
      cam(3.5, V(8, 15, 12), V(10, 8, -300));
    } else {
      camSet(V(0, 170, 44), V(0, 330, -150));
      tl.set({ luz: 0.0 });
      tl.caption(3, 'El anillo', 'Desde aquí, el anillo del planeta cruza todo el cielo.');
      tl.with(1, { luz: 1 });
      cam(3, V(0, 150, 42), V(0, 190, -150));
      tl.caption(7, 'Otro cielo', SIN_SUELO);
      cam(3.5, V(0, 100, 40), V(0, 40, -90), EASE.sine);
      cam(3.5, V(-2, 44, 34), V(0, 0, -50));
      tl.caption(6, 'Los flotadores', FLOTAR);
      cam(6, V(-6, 14, 24), V(0, 2, -6));
      tl.caption(8, 'Seis kilómetros', SEIS);
      tl.with(3, { regla: 1 });
      cam(4, V(-7.4, 4.4, 11.5), V(0.5, 2.2, -8));
      tl.with(3, { regla: 0 });
      cam(4, V(-7.8, 2.6, 9.4), V(2, 2.6, -30));
    }

    const q = new THREE.Vector3();
    let reglaA = 0;
    return {
      tl,
      escalera: false,
      cuenta(): Cuenta | null {
        return null;
      },
      rotulo(p): Rotulo | null {
        const cp = tl.captionAt(p);
        return cp ? { capitulo: 'III · Otros cielos', name: cp.name, fact: cp.fact } : null;
      },
      update(f: Frame) {
        const g = (k: string) => tl.get(k, f.p);
        camera.near = 0.05;
        camera.far = 6000;
        camera.fov = 40;
        camera.position.set(g('px'), g('py'), g('pz'));
        camera.up.set(0, 1, 0);
        camera.lookAt(g('tx'), g('ty'), g('tz'));
        camera.updateMatrixWorld();
        const luz = g('luz');
        reglaA = g('regla');

        stage.bloom.strength = 0.5;
        stage.bloom.radius = 0.62;
        stage.bloom.threshold = 0.16;
        stage.renderer.toneMappingExposure = 1.1;
        fondo.u.uAnillo.value = g('anillo') * (0.25 + 0.75 * luz);

        // Seen from high above, the deck's points would fall under a pixel and go out.
        const alto = Math.max(1, (camera.position.y + 16) / 26);
        enfocar(nube, f.focal, f.dpr, f.time);
        nube.u.uSizeUnit.value = alto;
        nube.u.uMinPx.value = 1.5 * f.dpr;
        nube.u.uMaxPx.value = 10 * f.dpr;
        nube.u.uGain.value = luz * lerp(1, 1.5, ease(1, 6, alto));
        nube.u.uTormenta.value = 1;

        enfocar(seres, f.focal, f.dpr, f.time);
        seres.u.uMinPx.value = 1.5 * f.dpr;
        seres.u.uMaxPx.value = 13 * f.dpr;
        seres.u.uGain.value = 0.35 + 0.65 * luz;
      },
      placa(g2, f) {
        if (reglaA < 0.01) return;
        // The hero's width, as a rule over its dome.
        q.copy(H).applyMatrix4(camera.matrixWorldInverse);
        if (q.z > -1) return;
        const k = f.focal / -q.z;
        const cx = f.W / 2 + q.x * k;
        const cy = f.H / 2 - q.y * k - HEROE.R * 0.86 * k - 22 * f.u;
        const w = HEROE.R * k;
        g2.save();
        g2.globalAlpha = reglaA;
        g2.strokeStyle = ink(0.7);
        g2.lineWidth = Math.max(1, 1.1 * f.u);
        g2.beginPath();
        g2.moveTo(cx - w, cy + 6 * f.u);
        g2.lineTo(cx - w, cy);
        g2.lineTo(cx + w, cy);
        g2.lineTo(cx + w, cy + 6 * f.u);
        g2.stroke();
        g2.font = FONT.mono(11 * f.u);
        g2.letterSpacing = `${1.2 * f.u}px`;
        g2.textAlign = 'center';
        g2.fillStyle = ink(0.9);
        g2.fillText('6,4 KM', cx, cy - 9 * f.u);
        g2.restore();
      },
      dispose() {},
    };
  },
};
