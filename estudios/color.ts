import * as THREE from 'three';
import { Timeline, EASE, type Ease } from './timeline';
import { pantalla } from '../src/engine/pantalla';
import { enfocar, materia, materiaBuilder, type MateriaData } from '../src/engine/materia';
import { clamp, lerp, rng, smoothstep } from '../src/engine/math';
import type { Cuenta, Rotulo } from './placa';
import { SEGURO, SERIE, TIBIO, V, ease } from './comun';
import type { Escena, Frame, Instancia } from './tipos';

/**
 * Study · «Se hace el color» (BRIEF v2, golden shot 3). Phase 0, written from scratch for plan v2.
 *
 * A valley of points at dawn, in the black and warm white of the series. An eye opens and colour
 * enters Horizontes for the first time: first the colours that were already there (sky, water,
 * rock), then the land turns green, then a flower opens and life adds its own colours, the six of
 * the series. Three ways for the colour to come in:
 *
 *  1 · La ola: one wavefront leaves the eye and runs to the horizon and up the sky; a second one
 *      leaves the flower.
 *  2 · A través del ojo: a giant eye in the dark; the world in colour is inside its pupil and the
 *      camera goes through. Then a giant flower, and the valley flowers all at once.
 *  3 · Mil llamadas: no single wave. Eyes open all over the valley, each one a small ring of
 *      colour; then flowers answer, each with its own.
 */

// ---------------------------------------------------------------- the valley

const HOME = V(-6.5, 2.0, 9.5);
const MIRA = V(2.5, 1.4, -60);
const ALTO = V(-1, 15, -14);
const MIRA_ALTO = V(4, 0, -120);

const cauce = (z: number) => 6 * Math.sin(z * 0.035) + 3 * Math.sin(z * 0.011 + 1.3);
const anchoRio = (z: number) => 4.5 + 2.5 * Math.sin(z * 0.05 + 0.7) + 15 * Math.exp(-(((z + 42) / 17) ** 2));
/** Distance to the shore, roughly: negative on the water. */
const orilla = (x: number, z: number) => Math.abs(x - cauce(z)) - anchoRio(z);

/** The sun, low, at the end of the river. */
const SOL = (() => {
  const d = V(cauce(-300) - HOME.x, 0, -300 - HOME.z).normalize();
  return V(d.x, 0.075, d.z).normalize();
})();

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

function alturaDe(x: number, z: number) {
  const s = orilla(x, z);
  if (s <= 0) return 0;
  const lomas = 0.6 + 7.5 * fbm(x * 0.03 + 3.1, z * 0.03 + 1.7) + 1.6 * fbm(x * 0.12, z * 0.12 + 9);
  const lejos = smoothstep(-70, -190, z);
  const sierra = lejos * (8 + 62 * Math.pow(fbm(x * 0.011 + 7, z * 0.011 + 2), 1.6));
  const lados = smoothstep(30, 110, Math.abs(x - cauce(z))) * 26 * fbm(x * 0.017 + 1, z * 0.017 + 5);
  return smoothstep(0, 22, s) * lomas + smoothstep(4, 70, s) * (sierra + lados) + 0.02 * Math.min(s, 6);
}

const GX0 = -240;
const GZ0 = -340;
const GS = 0.5;
const GW = 961;
const GH = 761;

type RGB = [number, number, number];
const lin = (hex: string): RGB => {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
};
const mz = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

const ARENA = lin('#e2c79a');
const OCRE = lin('#c9853f');
const ROJA = lin('#a8452b');
const BASALTO = lin('#5b4a52');
const ALTA = lin('#7a6a86');
const NIEVE = lin('#f6eef4');
const PRADO = lin('#86c94a');
const PRADO2 = lin('#c9dc5e');
const BOSQUE = lin('#2c7a4c');
const AMB: RGB = [0.1, 0.13, 0.3];
const SUN: RGB = [1.5, 0.95, 0.5];
/** What flowers wear: the colours of the other works (not the teal, which is yours) and white. */
const FLORES: RGB[] = [lin('#ff4a14'), lin('#ffb62e'), lin('#ff2f66'), lin('#9a6bff'), lin('#3f7dff'), lin('#fff0e0')];

/** The source of each call in way 3, the same in GLSL (`origenDe`). */
const origenDe = (qx: number, qz: number, celda: number) => ({
  x: (qx + 0.5 + 0.3 * Math.sin(qx * 12.9898 + qz * 78.233)) * celda,
  z: (qz + 0.5 + 0.3 * Math.cos(qx * 39.346 + qz * 11.135)) * celda,
  h: 0.5 + 0.5 * Math.sin(qx * 7.13 + qz * 3.71 + 1.7),
});
const CELDA1 = 6;
const CELDA2 = 4.5;

interface Mundo {
  data: MateriaData;
  col2: Float32Array;
  pares: MateriaData;
  alt(x: number, z: number): number;
}
let MUNDO: Mundo | null = null;

/**
 * The valley as points. They are sown where a camera sees them (rays from the two main views into
 * the height field), so the density is even on screen, and drawn far to near so the near hills hide
 * the far ones.
 */
function mundo(): Mundo {
  if (MUNDO) return MUNDO;
  const grid = new Float32Array(GW * GH);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) grid[j * GW + i] = alturaDe(GX0 + i * GS, GZ0 + j * GS);
  const alt = (x: number, z: number) => {
    const fx = clamp((x - GX0) / GS, 0, GW - 1.001);
    const fz = clamp((z - GZ0) / GS, 0, GH - 1.001);
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const u = fx - i;
    const v = fz - j;
    const o = j * GW + i;
    return lerp(lerp(grid[o], grid[o + 1], u), lerp(grid[o + GW], grid[o + GW + 1], u), v);
  };
  const dentro = (x: number, z: number) => x > GX0 + 1 && x < GX0 + (GW - 2) * GS && z > GZ0 + 1 && z < GZ0 + (GH - 2) * GS;

  /** Where a ray meets the land (distance), or -1. */
  function tocar(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, tmax: number) {
    let t = 0.15;
    let prev = 0;
    while (t < tmax) {
      const x = ox + dx * t;
      const y = oy + dy * t;
      const z = oz + dz * t;
      if (!dentro(x, z) || (y > 80 && dy >= 0)) return -1;
      const h = alt(x, z);
      if (y < h) {
        let a = prev;
        let b = t;
        for (let k = 0; k < 6; k++) {
          const m = (a + b) / 2;
          if (oy + dy * m < alt(ox + dx * m, oz + dz * m)) b = m;
          else a = m;
        }
        return b;
      }
      prev = t;
      t += clamp((y - h) * 0.5, 0.1, t * 0.05 + 0.4);
    }
    return -1;
  }

  const r = rng(101);
  const STR = 18;
  let cap = 1_200_000;
  let buf = new Float32Array(cap * STR);
  let n = 0;
  function put(x: number, y: number, z: number, c1: RGB, c2: RGB, size: number, ink: number, kind: number, fx: number, fy: number, fz: number, delay: number) {
    if (n >= cap) {
      cap = Math.round(cap * 1.4);
      const b2 = new Float32Array(cap * STR);
      b2.set(buf);
      buf = b2;
    }
    const o = n++ * STR;
    buf[o] = x;
    buf[o + 1] = y;
    buf[o + 2] = z;
    buf[o + 3] = c1[0];
    buf[o + 4] = c1[1];
    buf[o + 5] = c1[2];
    buf[o + 6] = c2[0];
    buf[o + 7] = c2[1];
    buf[o + 8] = c2[2];
    buf[o + 9] = size;
    buf[o + 10] = ink;
    buf[o + 11] = kind;
    buf[o + 12] = r();
    buf[o + 13] = fx;
    buf[o + 14] = fy;
    buf[o + 15] = fz;
    buf[o + 16] = delay;
    buf[o + 17] = Math.hypot(x - HOME.x, y - HOME.y, z - HOME.z);
  }

  const SL = V(SOL.x, 0.45, SOL.z).normalize();
  const SH = V(SOL.x, 0, SOL.z).normalize();
  const brillo = (x: number, y: number, z: number) => {
    const dx = x - HOME.x;
    const dy = y - HOME.y;
    const dz = z - HOME.z;
    const L = Math.hypot(dx, dy, dz) || 1;
    return Math.pow(Math.max(0, (dx * SH.x + dz * SH.z) / L), 4);
  };
  const arboles: [number, number, number][] = [];

  /** One point of land at (x, z): its two colours (bare, and once the land is green), lit by the low sun. */
  function tierra(x: number, z: number, pFlor: number) {
    const y = alt(x, z);
    const s = orilla(x, z);
    if (s <= 0.02) return;
    const e = 0.6;
    let nx = alt(x - e, z) - alt(x + e, z);
    let nz = alt(x, z - e) - alt(x, z + e);
    let ny = 2 * e;
    const nl0 = Math.hypot(nx, ny, nz);
    nx /= nl0;
    ny /= nl0;
    nz /= nl0;
    // Bare: sand by the water, ochre and red earth, dark rock where it is steep, snow up high.
    let a = mz(OCRE, ROJA, smoothstep(0.35, 0.6, fbm(x * 0.021 + 11, z * 0.021 + 4)));
    a = mz(a, ARENA, (1 - smoothstep(0, 9, s)) * 0.85);
    a = mz(a, BASALTO, smoothstep(0.9, 0.7, ny) * 0.65);
    a = mz(a, ALTA, smoothstep(16, 30, y) * 0.8);
    const nieve = smoothstep(0, 6, y - 30 - 14 * fbm(x * 0.05, z * 0.05)) * smoothstep(0.5, 0.75, ny);
    a = mz(a, NIEVE, nieve);
    // Green: meadows low and flat, forest on the slopes.
    const verdor = smoothstep(30, 20, y) * smoothstep(0.62, 0.8, ny) * smoothstep(0.3, 1.4, s) * (1 - nieve);
    const prado = smoothstep(0.84, 0.93, ny) * smoothstep(20, 10, y);
    const veg = mz(BOSQUE, mz(PRADO, PRADO2, smoothstep(0.35, 0.65, fbm(x * 0.07, z * 0.07))), prado);
    const b = mz(a, veg, verdor);

    const nl = Math.max(0, nx * SL.x + ny * SL.y + nz * SL.z);
    const g = brillo(x, y, z);
    const k = (0.05 + 0.95 * nl * nl) * (0.5 + 1.3 * g);
    const L: RGB = [AMB[0] * (0.5 + 0.5 * ny) + SUN[0] * k, AMB[1] * (0.5 + 0.5 * ny) + SUN[1] * k, AMB[2] * (0.5 + 0.5 * ny) + SUN[2] * k];
    const c1: RGB = [a[0] * L[0], a[1] * L[1], a[2] * L[2]];
    const tr = verdor * g * 0.35;
    const c2: RGB = [b[0] * (L[0] + SUN[0] * tr), b[1] * (L[1] + SUN[1] * tr), b[2] * (L[2] + SUN[2] * tr)];
    const d = Math.hypot(x - HOME.x, y - HOME.y, z - HOME.z);
    const size = 0.002 * Math.max(d, 0.8) * (0.7 + 0.7 * r());
    const yy = y + r() * 0.04 * (1 + d * 0.01);
    put(x, yy, z, c1, c2, size, 0.8, 0, x, yy, z, 0);

    // A flower: meadows wear them in drifts of one colour.
    if (verdor * prado > 0.45 && r() < pFlor) {
      const parche = Math.floor(fbm(x * 0.045 + 31, z * 0.045 + 8) * 14) % 6;
      const c = FLORES[r() < 0.72 ? parche : Math.floor(r() * 6)];
      const lum = 0.55 + 0.5 * g + 0.25 * nl;
      const fy = y + 0.06 + r() * 0.2 * (1 + d * 0.012);
      put(x + (r() - 0.5) * 0.1, fy, z + (r() - 0.5) * 0.1, [c[0] * lum, c[1] * lum, c[2] * lum], c, size * 1.5, 0.5, 1, x, fy, z, 0);
    }
    if (verdor > 0.7 && y < 24 && s > 7 && d > 16 && r() < 0.012) arboles.push([x, y, z]);
  }

  function vista(from: THREE.Vector3, to: THREE.Vector3, rayos: number, az: number, e0: number, e1: number, pFlor: number) {
    const f = V(to.x - from.x, 0, to.z - from.z).normalize();
    for (let i = 0; i < rayos; i++) {
      const a = (r() * 2 - 1) * az;
      const hx = f.x * Math.cos(a) - f.z * Math.sin(a);
      const hz = f.x * Math.sin(a) + f.z * Math.cos(a);
      const el = lerp(e0, e1, r());
      const L = Math.hypot(1, el);
      const t = tocar(from.x, from.y, from.z, hx / L, el / L, hz / L, 420);
      if (t > 0) tierra(from.x + (hx / L) * t, from.z + (hz / L) * t, pFlor);
    }
  }
  vista(HOME, MIRA, 900_000, 0.8, -1.15, 0.3, 0.3);
  vista(ALTO, MIRA_ALTO, 300_000, 0.8, -1.3, 0.12, 0.3);
  // Near the two heroes, all around.
  for (let i = 0; i < 60_000; i++) {
    const d = 0.04 * Math.pow(750, r());
    const a = r() * Math.PI * 2;
    tierra(-5 + Math.cos(a) * d, 4 + Math.sin(a) * d, 0.34);
  }

  // Conifers: cones of points that grow out of the ground when the land turns green.
  let plantados = 0;
  for (const [x, y, z] of arboles) {
    if (plantados > 1100) break;
    if (Math.hypot(x + 4.2, z - 3) < 9) continue;
    plantados++;
    const d = Math.hypot(x - HOME.x, y - HOME.y, z - HOME.z);
    const H = 1.8 + 3.6 * r();
    const m = Math.round(clamp(260 / (1 + d / 45), 36, 230));
    const g = brillo(x, y, z);
    const tono = 0.7 + 0.6 * r();
    for (let k = 0; k < m; k++) {
      const u = Math.pow(r(), 0.8);
      const a = r() * Math.PI * 2;
      const rad = 0.3 * H * Math.pow(1 - u, 0.8) * Math.sqrt(r());
      const ox = Math.cos(a) * rad;
      const oz = Math.sin(a) * rad;
      const lado = Math.max(0, (ox * SL.x + oz * SL.z) / (rad + 1e-3));
      const kk = (0.14 + 0.7 * lado + 0.3 * u) * (0.6 + 1.2 * g);
      const c: RGB = [BOSQUE[0] * tono * (AMB[0] * 0.8 + SUN[0] * kk), BOSQUE[1] * tono * (AMB[1] * 0.8 + SUN[1] * kk), BOSQUE[2] * tono * (AMB[2] * 0.8 + SUN[2] * kk)];
      put(x + ox, y + 0.1 + H * u, z + oz, c, c, 0.0024 * Math.max(d, 2) * (0.7 + 0.6 * r()), 0.85, 2, x, y, z, r());
    }
  }

  // Far to near.
  const idx = new Uint32Array(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  idx.sort((i, j) => buf[j * STR + 17] - buf[i * STR + 17]);
  const data: MateriaData = {
    position: new Float32Array(n * 3),
    aFrom: new Float32Array(n * 3),
    color: new Float32Array(n * 3),
    aInk: new Float32Array(n),
    size: new Float32Array(n),
    seed: new Float32Array(n),
    aDelay: new Float32Array(n),
    aKind: new Float32Array(n),
  };
  const col2 = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) {
    const o = idx[k] * STR;
    for (let c = 0; c < 3; c++) {
      data.position[k * 3 + c] = buf[o + c];
      data.color[k * 3 + c] = buf[o + 3 + c];
      col2[k * 3 + c] = buf[o + 6 + c];
      data.aFrom[k * 3 + c] = buf[o + 13 + c];
    }
    data.size[k] = buf[o + 9];
    data.aInk[k] = buf[o + 10];
    data.aKind[k] = buf[o + 11];
    data.seed[k] = buf[o + 12];
    data.aDelay[k] = buf[o + 16];
  }

  // Way 3: a pair of eyes at the source of each call, where the first view can see it.
  const bp = materiaBuilder(55);
  for (let qz = -45; qz <= 5; qz++)
    for (let qx = -28; qx <= 28; qx++) {
      const o = origenDe(qx, qz, CELDA1);
      if (!dentro(o.x, o.z)) continue;
      const y = alt(o.x, o.z) + 0.16;
      const dx = o.x - HOME.x;
      const dy = y - HOME.y;
      const dz = o.z - HOME.z;
      const L = Math.hypot(dx, dy, dz);
      if (L < 5 || L > 250) continue;
      const t = tocar(HOME.x, HOME.y, HOME.z, dx / L, dy / L, dz / L, L);
      if (t > 0 && t < L - 1.5) continue;
      const t0 = Math.pow(o.h, 0.5) * 0.72;
      for (const lado of [-1, 1]) bp.push(o.x + lado * 0.09, y, o.z, TIBIO, 0.035, 1.3, { delay: t0 });
    }
  MUNDO = { data, col2, pares: bp.data(), alt };
  return MUNDO;
}

// ---------------------------------------------------------------- the colour, as a state of the whole scene

/** Shared by the sky and by every cloud of points: where there is colour already, and the crest of the wave. */
const colorGLSL = (modo: number) => /* glsl */ `
  const vec3 TINTA = vec3(0.84, 0.80, 0.71);
  uniform vec4 uOla1, uOla2, uPup;
  uniform float uAn1, uAn2, uCresta1, uCresta2, uT1, uT2, uVerde, uAsp;
  uniform vec3 uSeis[6];
  uniform vec3 uOjo, uFlor;
  float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
  /** The six colours of the series, going round. */
  vec3 seis(float h) {
    h = fract(h) * 6.0;
    int i = int(floor(h));
    int j = i == 5 ? 0 : i + 1;
    return mix(uSeis[i], uSeis[j], fract(h));
  }
  float cauce(float z) { return 6.0 * sin(z * 0.035) + 3.0 * sin(z * 0.011 + 1.3); }
  float anchoRio(float z) { float q = (z + 42.0) / 17.0; return 4.5 + 2.5 * sin(z * 0.05 + 0.7) + 15.0 * exp(-q * q); }
  float orilla(vec2 xz) { return abs(xz.x - cauce(xz.y)) - anchoRio(xz.y); }
  /** A front at radius R, an wide: how much colour (x), the crest (y) and where in the crest (z). */
  vec3 anillo(float d, float R, float an) {
    float a = 1.0 - smoothstep(R - an, R, d);
    float x = (d - (R - an * 0.5)) / (an * 0.5);
    return vec3(a, exp(-x * x * 2.2), (R - d) / an * 0.8);
  }
  float mascara(vec2 nd) {
    float l = length((nd - uPup.xy) * vec2(uAsp, 1.0));
    float m = uPup.z > 1e-4 ? 1.0 - smoothstep(uPup.z * 0.84, uPup.z, l) : 0.0;
    return max(m, uPup.w);
  }
  ${
    modo === 0
      ? /* glsl */ `
  vec3 color1(vec3 p) {
    float d = distance(p, uOla1.xyz) + (ruido(p.xz * 0.19) - 0.5) * uAn1 * 1.3;
    return anillo(d, uOla1.w, uAn1) * vec3(1.0, step(0.001, uOla1.w) * uCresta1, 1.0);
  }
  vec3 color2(vec3 p, float sd) {
    float d = distance(p, uOla2.xyz) + (ruido(p.xz * 0.23 + 40.0) - 0.5) * uAn2 * 1.3;
    return anillo(d, uOla2.w, uAn2) * vec3(1.0, step(0.001, uOla2.w) * uCresta2, 1.0);
  }
  /** The wave reaches the horizon and climbs the sky. */
  vec3 cielo1(vec3 d) {
    float dd = 190.0 + max(d.y, 0.0) * 330.0 + (fbm(d.xz * 3.0 + d.y * 4.0) - 0.5) * 60.0;
    return anillo(dd, uOla1.w, 45.0) * vec3(1.0, uCresta1, 1.0);
  }`
      : modo === 1
        ? /* glsl */ `
  vec3 color1(vec3 p) { return vec3(1.0, 0.0, 0.0); }
  /** The valley flowers almost at once, a little sooner near the first flower. */
  vec3 color2(vec3 p, float sd) {
    float t0 = 0.55 * sd + 0.3 * clamp(distance(p, uFlor) / 260.0, 0.0, 1.0);
    float a = smoothstep(t0, t0 + 0.14, uT2);
    return vec3(a, a * (1.0 - a) * 4.0, sd * 3.0);
  }
  vec3 cielo1(vec3 d) { return vec3(1.0, 0.0, 0.0); }`
        : /* glsl */ `
  vec3 origenDe(vec2 q, float celda) {
    vec2 o = (q + 0.5 + 0.3 * vec2(sin(dot(q, vec2(12.9898, 78.233))), cos(dot(q, vec2(39.346, 11.135))))) * celda;
    return vec3(o, 0.5 + 0.5 * sin(dot(q, vec2(7.13, 3.71)) + 1.7));
  }
  /** Many small calls: each cell of the valley has one, at its own moment; later ones come faster. */
  vec3 llamadas(vec3 p, float T, float celda, vec3 primero) {
    vec2 id = floor(p.xz / celda);
    float a = 0.0, c = 0.0, hue = 0.0;
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      vec3 f = origenDe(id + vec2(float(i), float(j)), celda);
      float edad = (T - sqrt(f.z) * 0.72) / 0.28;
      if (edad <= 0.0) continue;
      float R = celda * 1.22 * (1.0 - exp(-edad * 3.2));
      float an = 0.2 + R * 0.24;
      vec3 r = anillo(distance(p.xz, f.xy) + (ruido(p.xz * 0.6) - 0.5) * an, R, an);
      float vivo = 1.0 - smoothstep(0.45, 1.0, edad);
      a = max(a, r.x);
      if (r.y * vivo > c) { c = r.y * vivo; hue = f.z * 5.0 + r.z * 0.25; }
    }
    // The first one, in front of you.
    float e0 = T / 0.34;
    float R0 = 17.0 * (1.0 - exp(-e0 * 3.0));
    float an0 = 0.1 + R0 * 0.2;
    vec3 r0 = anillo(distance(p, primero) + (ruido(p.xz * 0.6) - 0.5) * an0, R0, an0);
    float v0 = step(0.0005, T) * (1.0 - smoothstep(0.5, 1.0, e0));
    a = max(a, r0.x * step(0.0005, T));
    if (r0.y * v0 > c) { c = r0.y * v0; hue = r0.z; }
    return vec3(max(a, smoothstep(0.93, 1.0, T)), c, hue);
  }
  vec3 color1(vec3 p) { return llamadas(p, uT1, ${CELDA1.toFixed(1)}, uOjo); }
  vec3 color2(vec3 p, float sd) { return llamadas(p, uT2, ${CELDA2.toFixed(1)}, uFlor); }
  /** The sky takes its colour in patches, as the calls add up. */
  vec3 cielo1(vec3 d) {
    float n = fbm(d.xz * 2.2 / (0.35 + max(d.y, 0.0)) + 3.0);
    float k = smoothstep(0.3, 0.98, uT1) * 1.5 - 0.25;
    float a = smoothstep(n - 0.35, n + 0.35, k);
    return vec3(a, 0.0, 0.0);
  }`
  }
`;

const FONDO = (modo: number) => /* glsl */ `
  uniform vec3 uCam, uSol;
  uniform float uLuz;
  ${SEGURO}
  ${colorGLSL(modo)}
  /** The sky at dawn: gold by the sun, rose away from it, violet, blue overhead; thin clouds lit from below. */
  vec3 cieloDe(vec3 d) {
    float y = max(d.y, 0.0);
    float mu = max(dot(d, uSol), 0.0);
    float az = pw(mu, 2.0);
    vec3 hor = mix(vec3(0.50, 0.13, 0.22), vec3(1.0, 0.36, 0.10), az);
    vec3 med = vec3(0.20, 0.11, 0.42) * 0.6;
    vec3 zen = vec3(0.012, 0.04, 0.20) * 0.7;
    vec3 c = mix(hor, med, smoothstep(0.0, 0.24, y));
    c = mix(c, zen, smoothstep(0.1, 0.62, y));
    c += vec3(1.0, 0.70, 0.40) * (pw(mu, 40.0) * 0.22 + pw(mu, 700.0) * 0.9 + smoothstep(0.99975, 0.99992, mu) * 7.0);
    vec2 q = d.xz / (y + 0.14);
    float n = fbm(q * vec2(0.55, 1.5) + vec2(uTime * 0.004, 0.0));
    float nubes = smoothstep(0.46, 0.76, n) * smoothstep(0.015, 0.1, y) * (1.0 - smoothstep(0.3, 0.62, y));
    vec3 luzN = mix(vec3(0.85, 0.20, 0.36), vec3(1.2, 0.62, 0.25), az);
    return mix(c, luzN * 0.8, nubes * 0.75);
  }
  void main() {
    vec3 d = normalize(vDir);
    vec3 col;
    vec3 w;
    if (d.y >= 0.0) {
      col = cieloDe(d);
      w = cielo1(d);
    } else {
      float t = -uCam.y / min(d.y, -1e-4);
      vec3 P = uCam + d * t;
      vec3 llano = normalize(vec3(d.x, 0.003, d.z));
      float s = orilla(P.xz);
      if (s < 0.0) {
        // The water: a mirror of the sky, a little broken.
        float r1 = fbm(P.xz * vec2(0.8, 0.3) + vec2(uTime * 0.07, uTime * 0.04));
        float r2 = ruido(P.xz * 2.7 - uTime * 0.18);
        vec3 rd = normalize(vec3(d.x + (r1 - 0.5) * 0.07, -d.y + (r2 - 0.5) * 0.035 + 0.004, d.z));
        float fres = mix(0.32, 0.92, pw(1.0 - clamp(-d.y, 0.0, 1.0), 5.0));
        col = cieloDe(rd) * fres + vec3(0.0, 0.012, 0.02);
        col *= smoothstep(0.0, -0.7, s) * 0.85 + 0.15;
        w = mix(color1(P), cielo1(llano), smoothstep(220.0, 420.0, t));
      } else {
        // Under the points the land is dark; only the haze of the horizon reaches it.
        col = cieloDe(llano) * exp(d.y * 80.0) * 0.5;
        w = cielo1(llano);
      }
    }
    vec3 c = mix(TINTA * lum(col) * 0.5, col, w.x) + seis(w.z) * w.y * (0.1 + lum(col)) * 1.1;
    gl_FragColor = vec4(c * mascara(vUv * 2.0 - 1.0) * uLuz, 1.0);
  }
`;

/** The land, the trees and the flowers, in one cloud. */
const TIERRA_MOVE = /* glsl */ `
  float esFlor = aKind > 0.5 && aKind < 1.5 ? 1.0 : 0.0;
  float esArbol = aKind > 1.5 ? 1.0 : 0.0;
  vec3 w1 = color1(p);
  vec3 w2 = color2(p, seed);
  vec3 real = mix(em, aCol2, uVerde * (1.0 - esFlor));
  float g = lum(real);
  // The ground lifts a little as the wave passes.
  p.y += min(w1.y * uAn1 * 0.1, 7.0) + min(w2.y * uAn2 * 0.05, 3.0) * (1.0 - esFlor);
  em = mix(TINTA * g * 0.55, real, w1.x) + seis(w1.z) * w1.y * (0.12 + g) * 1.6;
  float vive = mix(1.0, smoothstep(0.02, 0.3, uVerde), esArbol) * mix(1.0, w2.x, esFlor);
  em *= vive;
  occ *= vive;
  sz *= mix(1.0, 0.55 + 0.45 * w2.x + 0.6 * w2.y, esFlor);
  em += real * w2.y * 0.7 * esFlor + seis(w2.z) * w2.y * 0.25 * g * (1.0 - esFlor);
  // Everything breathes.
  em *= 1.0 + 0.12 * sin(uTime * (0.5 + seed) + seed * 50.0);
`;
const MASCARA_POST = /* glsl */ `
  float mk = mascara(gl_Position.xy / max(gl_Position.w, 1e-6));
  em *= mk;
  occ *= mk;
`;

// ---------------------------------------------------------------- the eye and the flower

const RP = 0.34;
const BLANCO = new THREE.Color(1, 0.96, 0.9);

/** An iris of fibres, radius 1, facing +z. Closed, the fibres reach the centre; open, they leave a pupil. */
function ojoDatos(): MateriaData {
  const b = materiaBuilder(31);
  const r = b.r;
  const c = new THREE.Color();
  for (let f = 0; f < 1000; f++) {
    const a0 = r() * Math.PI * 2;
    const ph = r() * 6.28;
    const wob = 0.02 + 0.05 * r();
    const luzF = 0.3 + 0.9 * r() * r();
    const r1 = 0.9 + 0.1 * r();
    const tono = r();
    const m = 70 + Math.floor(60 * r());
    for (let j = 0; j < m; j++) {
      const t = Math.pow(r(), 0.85);
      const rr = lerp(RP, r1, t);
      const a = a0 + wob * Math.sin(t * 6 + ph) + (r() - 0.5) * 0.012;
      const rc = lerp(0.015, r1, t);
      // Amber by the pupil, gold on the collarette, then blue, violet at the rim.
      if (rr < 0.52) c.copy(SERIE.espacio).lerp(SERIE.mente, smoothstep(RP, 0.52, rr));
      else if (rr < 0.8) c.copy(SERIE.mente).lerp(SERIE.tiempo, smoothstep(0.52, 0.8, rr));
      else c.copy(SERIE.tiempo).lerp(SERIE.infinito, smoothstep(0.8, 1.0, rr));
      c.lerp(BLANCO, 0.2 * tono);
      const coll = Math.exp(-(((rr - 0.5) / 0.045) ** 2));
      const light = luzF * (0.45 + 0.9 * coll + 0.3 * (1 - t));
      b.push(rr * Math.cos(a), rr * Math.sin(a), 0.1 * (1 - rr), c, 0.006, light * 0.42, { from: [rc * Math.cos(a), rc * Math.sin(a), 0.03], delay: r() });
    }
  }
  // The ruff of the pupil.
  for (let i = 0; i < 3200; i++) {
    const a = r() * Math.PI * 2;
    const rr = RP + 0.02 * r() * r();
    c.copy(SERIE.espacio).lerp(SERIE.mente, 0.35 * r());
    b.push(rr * Math.cos(a), rr * Math.sin(a), 0.07, c, 0.006, 0.5, { from: [0.02 * r() * Math.cos(a), 0.02 * r() * Math.sin(a), 0.03], delay: r() });
  }
  // The rim.
  for (let i = 0; i < 7000; i++) {
    const a = r() * Math.PI * 2;
    const rr = 0.97 + 0.07 * r();
    c.copy(SERIE.infinito).lerp(SERIE.tiempo, r() * 0.5);
    b.push(rr * Math.cos(a), rr * Math.sin(a), 0, c, 0.007, 0.26);
  }
  // The orb behind it.
  for (let i = 0; i < 9000; i++) {
    const [x, y, z] = b.onSphere();
    if (z < -0.2) continue;
    const X = x * 1.35;
    const Y = y * 1.35;
    const Z = z * 1.35 - 0.907;
    if (Math.hypot(X, Y) < 1.02) continue;
    b.push(X, Y, Z, BLANCO, 0.008, 0.1);
  }
  return b.data();
}

/** A flower, petal length 1, axis +y: a disc of seeds in golden-angle spirals and three whorls of petals. Closed, a bud. */
function florDatos(): MateriaData {
  const b = materiaBuilder(41);
  const r = b.r;
  const c = new THREE.Color();
  const GA = Math.PI * (3 - Math.sqrt(5));
  const RD = 0.2;
  for (let i = 0; i < 2600; i++) {
    const t = i / 2600;
    const rr = RD * Math.sqrt(t);
    const a = i * GA;
    c.copy(SERIE.mente).lerp(SERIE.espacio, t * 0.8);
    b.push(rr * Math.cos(a), 0.06 * (1 - t) + 0.02, rr * Math.sin(a), c, 0.013, 0.5, { ink: 0.8, from: [rr * 0.5 * Math.cos(a), 0.02, rr * 0.5 * Math.sin(a)], delay: 0.8 });
  }
  const rosa = new THREE.Color('#ff9db4');
  const CARMIN = new THREE.Color('#ff2f66');
  const WH = [
    { n: 8, L: 0.56, w: 0.2, el: 62 },
    { n: 13, L: 0.8, w: 0.19, el: 38 },
    { n: 21, L: 1.0, w: 0.15, el: 14 },
  ];
  WH.forEach((wh, wi) => {
    for (let j = 0; j < wh.n; j++) {
      const th = ((j + 0.5 * wi) / wh.n) * Math.PI * 2 + (r() - 0.5) * 0.08;
      const el0 = THREE.MathUtils.degToRad(wh.el + (r() - 0.5) * 8);
      const L = wh.L * (0.92 + 0.16 * r());
      for (let k = 0; k < 1500; k++) {
        const u = Math.pow(r(), 0.7);
        const v = r() * 2 - 1;
        const hw = wh.w * Math.pow(Math.sin(Math.PI * Math.min(1, 0.08 + u * 0.92)), 0.6);
        const at = (el: number, rad0: number, len: number, half: number, tw: number): [number, number, number] => {
          const rad = rad0 + len * u * Math.cos(el);
          const y = len * u * Math.sin(el) + 0.5 * half * v * v;
          const lat = v * half;
          const t2 = th + tw;
          return [Math.cos(t2) * rad - Math.sin(t2) * lat, y, Math.sin(t2) * rad + Math.cos(t2) * lat];
        };
        const abierta = at(el0 - 0.24 * u, RD * 0.8, L, hw, 0);
        const boton = at(THREE.MathUtils.degToRad(85 - 5 * u), RD * 0.3, L * 0.78, hw * 0.5, 0.55 * u);
        // Orange at the base, carmine, pale at the tip; veins, and a bright edge against the light.
        c.copy(SERIE.espacio).lerp(CARMIN, smoothstep(0.05, 0.4, u)).lerp(rosa, smoothstep(0.7, 1.0, u) * 0.45);
        const light = (0.5 + 0.45 * Math.abs(Math.cos(v * 7)) + 0.6 * smoothstep(0.75, 1, Math.abs(v))) * (0.7 + 0.3 * wi * 0.5);
        b.push(abierta[0], abierta[1], abierta[2], c, 0.014, light * 0.3, { ink: 0.75, from: boton, delay: (2 - wi) * 0.3 + 0.2 * r() });
      }
    }
  });
  // The stem and two leaves.
  const verde = new THREE.Color('#5aa04e');
  for (let i = 0; i < 900; i++) {
    const t = r();
    const p: [number, number, number] = [0.05 * Math.sin(t * 3) + (r() - 0.5) * 0.03, -2.7 * t, (r() - 0.5) * 0.03];
    b.push(p[0], p[1], p[2], verde, 0.012, 0.3, { from: p });
  }
  for (const lado of [-1, 1])
    for (let i = 0; i < 700; i++) {
      const u = r();
      const v = r() * 2 - 1;
      const hw = 0.14 * Math.sin(Math.PI * u);
      const p: [number, number, number] = [lado * (0.1 + 0.7 * u), -1.4 - 0.3 * lado + 0.45 * u - 0.5 * u * u, v * hw];
      b.push(p[0], p[1], p[2], verde, 0.012, 0.28 + 0.2 * Math.abs(v), { from: p });
    }
  return b.data();
}

// ---------------------------------------------------------------- the scene

const R_MIN = 0.1;
const R_MAX = 520;

export const color: Escena = {
  id: 'color',
  nombre: 'Se hace el color',
  estilos: [
    { key: '1', nombre: 'La ola', nota: 'Una sola ola sale del ojo, corre hasta el horizonte y sube por el cielo. Otra sale de la flor.' },
    { key: '2', nombre: 'A través del ojo', nota: 'Un ojo gigante en lo negro: el mundo en color está dentro de su pupila y la cámara la cruza. Después, una flor gigante.' },
    { key: '3', nombre: 'Mil llamadas', nota: 'Sin una ola única: se abren ojos por todo el valle, cada uno con su anillo de color. Después contestan las flores.' },
  ],
  montar(stage, modo): Instancia {
    const root = stage.root;
    const { camera } = stage;
    const M = mundo();

    // Where the two heroes are: on the near bank.
    const xo = cauce(1.5) - anchoRio(1.5);
    const E = V(xo - 0.7, M.alt(xo - 0.7, 1.5) + 0.11, 1.5);
    const xf = cauce(4.5) - anchoRio(4.5);
    const F = V(xf - 2.0, M.alt(xf - 2.0, 4.5), 4.5);
    const EJE_FLOR = V(-0.12, 0.8, 0.58).normalize();
    const FS = 0.16;
    const HF = F.clone().addScaledVector(EJE_FLOR, 2.7 * FS);
    const OJO_CAM = E.clone().add(V(-0.13, 0.12, 0.4));
    const fwd = MIRA.clone().sub(HOME).normalize();
    // Way 2: the eye is in the dark, on the way to the valley.
    const E2 = HOME.clone().addScaledVector(fwd, -4.2);
    const S_OJO = modo === 1 ? 0.55 : 0.12;
    const OJO = modo === 1 ? E2 : E;

    const U = {
      uOla1: { value: new THREE.Vector4(OJO.x, OJO.y, OJO.z, 0) },
      uOla2: { value: new THREE.Vector4(HF.x, HF.y, HF.z, 0) },
      uPup: { value: new THREE.Vector4(0, 0, 0, 1) },
      uAn1: { value: 1 },
      uAn2: { value: 1 },
      uCresta1: { value: 1 },
      uCresta2: { value: 1 },
      uT1: { value: 0 },
      uT2: { value: 0 },
      uVerde: { value: 0 },
      uAsp: { value: 16 / 9 },
      uSeis: { value: [SERIE.espacio, SERIE.mente, SERIE.abismo, SERIE.infinito, SERIE.tiempo, SERIE.destino].map((c) => c.clone()) },
      uOjo: { value: E.clone() },
      uFlor: { value: HF.clone() },
    };

    const fondo = pantalla(FONDO(modo), { ...U, uCam: { value: HOME.clone() }, uSol: { value: SOL.clone() }, uLuz: { value: 1 } });
    root.add(fondo.mesh);

    const tierra = materia(M.data, {
      pre: /* glsl */ `attribute vec3 aCol2; ${SEGURO} ${colorGLSL(modo)}`,
      move: TIERRA_MOVE,
      post: MASCARA_POST,
      uniforms: U,
      extra: { aCol2: [M.col2, 3] },
    });
    tierra.u.uInk.value = 1;
    tierra.u.uFog.value = 420;
    tierra.u.uFogNear.value = 20;
    tierra.u.uSpread.value = 0.6;
    tierra.points.renderOrder = 1;
    root.add(tierra.points);

    // Way 3: the eyes that open all over the valley.
    const pares = materia(M.pares, {
      pre: /* glsl */ `uniform float uT1;`,
      move: /* glsl */ `em *= step(aDelay, uT1) * step(0.0005, uT1) * (1.0 + 4.0 * exp(-(uT1 - aDelay) * 70.0));`,
      uniforms: { uT1: U.uT1 },
    });
    pares.u.uFuente.value = 1;
    pares.points.renderOrder = 2;
    pares.points.visible = modo === 2;
    root.add(pares.points);

    const ojo = materia(ojoDatos(), {
      sizeUnit: S_OJO,
      pre: /* glsl */ `
        uniform float uOjoC;
        const vec3 TINTA = vec3(0.84, 0.80, 0.71);
        float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
      `,
      move: /* glsl */ `
        float rr = length(position.xy);
        // The pupil never keeps still.
        p.xy *= 1.0 + 0.035 * sin(uTime * 1.3) * (1.0 - rr) * k;
        float f = uOjoC * 1.6;
        float c = 1.0 - smoothstep(f - 0.3, f, rr);
        float cr = exp(-pow((rr - (f - 0.15)) / 0.12, 2.0)) * step(0.01, uOjoC) * (1.0 - smoothstep(0.75, 1.0, uOjoC));
        em = mix(TINTA * lum(em), em * 1.3, c) * (1.0 + 2.2 * cr);
        em *= 1.0 + 0.15 * sin(uTime * (0.6 + seed) + seed * 40.0);
      `,
      uniforms: { uOjoC: { value: 0 } },
    });
    ojo.u.uSpread.value = 0.25;
    const ojoG = new THREE.Group();
    ojoG.position.copy(OJO);
    ojoG.scale.setScalar(S_OJO);
    if (modo === 1) ojoG.lookAt(E2.clone().addScaledVector(fwd, -1));
    else ojoG.lookAt(OJO_CAM);
    ojoG.add(ojo.points);
    // The light on the eye: it is wet.
    const bb = materiaBuilder(32);
    bb.push(-0.3, 0.34, 0.2, BLANCO, 0.05, 1.5);
    bb.push(0.22, -0.28, 0.16, BLANCO, 0.025, 0.5);
    const destello = materia(bb.data(), { sizeUnit: S_OJO });
    destello.u.uFuente.value = 1;
    ojoG.add(destello.points);
    ojo.points.renderOrder = 3;
    destello.points.renderOrder = 4;
    root.add(ojoG);

    const flor = materia(florDatos(), {
      sizeUnit: FS,
      move: /* glsl */ `
        p.xz += 0.02 * sin(uTime * 0.9 + p.y * 1.7) * (1.0 + p.y * 0.3);
        em *= mix(0.4, 1.0, k) * (1.0 + 0.12 * sin(uTime * (0.6 + seed) + seed * 40.0));
      `,
    });
    flor.u.uSpread.value = 0.9;
    flor.u.uInk.value = 1;
    const florG = new THREE.Group();
    florG.position.copy(HF);
    florG.scale.setScalar(FS);
    florG.quaternion.setFromUnitVectors(V(0, 1, 0), EJE_FLOR);
    florG.add(flor.points);
    flor.points.renderOrder = 5;
    root.add(florG);

    // ------------------------------------------------ the choreography
    const tl = new Timeline();
    const cam = (dur: number, p: THREE.Vector3, t: THREE.Vector3, e: Ease | null = null) => tl.to(dur, { px: p.x, py: p.y, pz: p.z, tx: t.x, ty: t.y, tz: t.z }, e);
    const camSet = (p: THREE.Vector3, t: THREE.Vector3) => tl.set({ px: p.x, py: p.y, pz: p.z, tx: t.x, ty: t.y, tz: t.z });
    tl.set({ ola1: 0, ola2: 0, abre: 0, ojoC: 0, verde: 0, florAbre: 0 });
    const SIN = 'Durante tres mil millones de años, nada vivo tuvo ojos.';
    const VER = 'Después, la vida aprendió a ver.';
    const FLO = 'Y después, a hacerse ver.';
    const LLA = 'Mucho del color del mundo es una vida llamando a otra.';
    const VERDE = 'La vida salió del agua. La tierra se cubrió.';
    const FLOR_CAM = HF.clone().add(V(-0.42, 0.14, 0.9));
    const finalVuelo = () => {
      cam(4, V(-5.5, 6.5, 7), V(3, 1.0, -70));
      cam(6, ALTO, MIRA_ALTO);
    };

    if (modo === 0) {
      camSet(HOME, MIRA);
      tl.caption(6, 'Sin ojos', SIN);
      cam(6, HOME.clone().add(V(0.4, -0.1, -1.2)), MIRA);
      tl.caption(8.8, 'El primer ojo', VER);
      cam(4.4, OJO_CAM, E.clone().add(V(0, 0.01, 0)));
      tl.to(2.4, { abre: 1 }, EASE.inOut);
      tl.to(2.0, { ojoC: 1 });
      tl.caption(9.5, 'Se hace el color', '');
      tl.with(9.5, { ola1: 1 }, EASE.linear);
      cam(3.6, E.clone().add(V(-1.6, 1.0, 3.6)), E.clone().add(V(1.2, 0.1, -5)));
      cam(5.9, V(-7.5, 4.6, 13), V(2.5, 4.0, -80));
      tl.caption(5, 'El verde', VERDE);
      tl.with(5, { verde: 1 });
      cam(5, V(-7.0, 3.0, 11), V(2.5, 1.4, -60));
      tl.caption(8, 'La primera flor', FLO);
      cam(3.6, FLOR_CAM, HF.clone().add(V(0.05, 0.02, 0)));
      tl.to(3.0, { florAbre: 1 }, EASE.inOut);
      tl.wait(1.4);
      tl.caption(10, 'Una llamada', LLA);
      tl.with(10, { ola2: 1 }, EASE.linear);
      cam(0.01, FLOR_CAM, HF.clone().add(V(0.05, 0.02, 0)));
      finalVuelo();
    } else if (modo === 1) {
      const eje = (k: number) => E2.clone().addScaledVector(fwd, k);
      const lejos = eje(60);
      camSet(eje(-2.5), lejos);
      tl.caption(5, 'Sin ojos', SIN);
      cam(5, eje(-2.05), lejos);
      tl.caption(8, 'El primer ojo', VER);
      tl.with(3.2, { abre: 1 }, EASE.inOut);
      cam(3.2, eje(-1.8), lejos);
      tl.with(2.6, { ojoC: 1 });
      cam(4.8, eje(-1.35), lejos);
      tl.caption(7, 'Se hace el color', '');
      cam(3.6, eje(0.3), lejos, EASE.in);
      cam(3.4, HOME, MIRA, EASE.out);
      tl.set({ ola1: 1 });
      tl.caption(5, 'El verde', VERDE);
      tl.with(5, { verde: 1 });
      cam(5, V(-7.0, 2.6, 10.5), MIRA);
      tl.caption(8, 'La primera flor', FLO);
      cam(3.6, HF.clone().add(V(-0.3, 0.22, 0.72)), HF.clone().add(V(0.02, 0.03, 0)));
      tl.to(3.0, { florAbre: 1 }, EASE.inOut);
      tl.wait(1.4);
      tl.caption(10, 'Una llamada', LLA);
      tl.with(7.5, { ola2: 1 }, EASE.linear);
      cam(0.01, HF.clone().add(V(-0.3, 0.22, 0.72)), HF.clone().add(V(0.02, 0.03, 0)));
      finalVuelo();
    } else {
      camSet(HOME, MIRA);
      tl.caption(5, 'Sin ojos', SIN);
      cam(5, V(-6.2, 1.8, 8.4), MIRA);
      tl.caption(11, 'Los primeros ojos', VER);
      tl.with(2.2, { abre: 1 }, EASE.inOut);
      tl.with(3.0, { ojoC: 1 });
      tl.with(11, { ola1: 1 }, EASE.linear);
      cam(5, V(-5.6, 1.5, 6.5), V(1, 0.9, -50));
      cam(6, V(-6.6, 3.4, 10), V(2.5, 2.6, -70));
      tl.caption(4.5, 'El verde', VERDE);
      tl.with(4.5, { verde: 1 });
      cam(4.5, V(-6.4, 1.5, 7.6), V(1.5, 0.8, -50));
      tl.caption(12, 'Las flores contestan', FLO);
      tl.with(2.6, { florAbre: 1 }, EASE.inOut);
      tl.with(12, { ola2: 1 }, EASE.linear);
      cam(3, V(-6.3, 1.5, 7.4), V(1.5, 0.8, -50));
      cam(3.5, V(-5.5, 6.5, 7), V(3, 1.0, -70));
      cam(5.5, ALTO, MIRA_ALTO);
      tl.caption(3, 'Una llamada', LLA);
      tl.wait(3);
    }

    const q = new THREE.Vector3();
    return {
      tl,
      escalera: false,
      cuenta(): Cuenta | null {
        return null;
      },
      rotulo(p): Rotulo | null {
        const cp = tl.captionAt(p);
        return cp ? { capitulo: 'I · El hilo', name: cp.name, fact: cp.fact } : null;
      },
      update(f: Frame) {
        const p = f.p;
        const g = (k: string) => tl.get(k, p);
        camera.near = 0.02;
        camera.far = 4000;
        camera.fov = 40;
        camera.position.set(g('px'), g('py'), g('pz'));
        camera.up.set(0, 1, 0);
        camera.lookAt(g('tx'), g('ty'), g('tz'));
        camera.updateMatrixWorld();
        (fondo.u.uCam.value as THREE.Vector3).copy(camera.position);
        U.uAsp.value = f.W / f.H;

        const o1 = g('ola1');
        const o2 = g('ola2');
        const R1 = o1 > 0 ? R_MIN * S_OJO * 8 * Math.pow(R_MAX / (R_MIN * S_OJO * 8), o1) : 0;
        const R2 = o2 > 0 ? 0.06 * Math.pow(R_MAX / 0.06, o2) : 0;
        U.uOla1.value.w = R1;
        U.uOla2.value.w = R2;
        U.uAn1.value = modo === 2 ? 0 : 0.03 + 0.2 * R1;
        U.uAn2.value = modo === 2 ? 0 : 0.03 + 0.2 * R2;
        U.uCresta1.value = 1 - ease(0.82, 1, o1);
        U.uCresta2.value = 1 - ease(0.82, 1, o2);
        U.uT1.value = o1;
        U.uT2.value = o2;
        U.uVerde.value = g('verde');

        // Way 2: the world shows only through the pupil, until the camera is through it.
        let mundoVisto = 1;
        if (modo === 1) {
          q.copy(E2).applyMatrix4(camera.matrixWorldInverse);
          const th = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
          const kmin = clamp(g('abre') * 1.25 - 0.25, 0, 1);
          const abierto = kmin * kmin * (3 - 2 * kmin);
          if (q.z > -0.03) U.uPup.value.set(0, 0, 0, 1);
          else U.uPup.value.set(q.x / -q.z / (th * (f.W / f.H)), q.y / -q.z / th, (S_OJO * RP * 0.93 * abierto) / -q.z / th, 0);
          mundoVisto = q.z > -0.03 ? 1 : ease(1.2, 0.2, -q.z);
        }
        const claro = modo === 1 ? Math.max(mundoVisto, 0.75 * ease(0.2, 0.9, g('abre'))) : 1;
        stage.bloom.strength = lerp(0.62, 0.3, claro);
        stage.bloom.threshold = lerp(0.12, 0.8, claro);
        stage.bloom.radius = 0.6;
        stage.renderer.toneMappingExposure = lerp(1.1, 0.95, mundoVisto);

        enfocar(tierra, f.focal, f.dpr, f.time);
        tierra.u.uMinPx.value = 1.7 * f.dpr;
        tierra.u.uMaxPx.value = 9 * f.dpr;
        tierra.u.uK.value = g('verde');
        tierra.u.uGain.value = 0.9;
        if (modo === 2) {
          enfocar(pares, f.focal, f.dpr, f.time);
          pares.u.uMinPx.value = 2.2 * f.dpr;
          pares.u.uGain.value = 1.1 * (1 - 0.6 * ease(0.7, 1, o1));
        }

        enfocar(ojo, f.focal, f.dpr, f.time);
        ojo.u.uK.value = g('abre');
        ojo.u.uOjoC.value = g('ojoC');
        ojo.u.uGain.value = 1;
        enfocar(destello, f.focal, f.dpr, f.time);
        destello.u.uMinPx.value = 2.4 * f.dpr;
        destello.u.uGain.value = 0.25 + 1.1 * ease(0.5, 1, g('abre'));

        enfocar(flor, f.focal, f.dpr, f.time);
        flor.u.uK.value = g('florAbre');
        flor.u.uGain.value = ease(0.3, 1, g('verde'));
      },
      dispose() {},
    };
  },
};
