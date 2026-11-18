import { rng } from '../src/engine/math';

/**
 * A human body as a distance field, in metres: standing, feet at y = 0, facing +z, 1.75 m tall,
 * arms a little away from the body. Smooth unions of capsules (whose radius changes along them)
 * and ellipsoids. From it come points on the skin, inside the body, and on contour lines.
 *
 * Its left side is +x (the heart is there): seen from the front, on the viewer's right.
 */

type Cap = [0, number, number, number, number, number, number, number, number];
type Ell = [1, number, number, number, number, number, number];
type Prim = Cap | Ell;

const P: Prim[] = [];
/** How softly each part melts into the ones before it (the trunk softer than the limbs). */
const K: number[] = [];
let k = 0.07;
const cap = (a: [number, number, number], b: [number, number, number], ra: number, rb: number) => {
  P.push([0, ...a, ...b, ra, rb]);
  K.push(k);
};
const ell = (c: [number, number, number], r: [number, number, number]) => {
  P.push([1, ...c, ...r]);
  K.push(k);
};
const par = (f: (s: number) => void) => {
  f(1);
  f(-1);
};

ell([0, 1.635, 0.005], [0.077, 0.104, 0.092]);
ell([0, 1.57, 0.03], [0.058, 0.055, 0.06]);
cap([0, 1.44, -0.005], [0, 1.56, 0.008], 0.053, 0.047);
cap([-0.155, 1.405, -0.015], [0.155, 1.405, -0.015], 0.058, 0.058);
ell([0, 1.29, 0.0], [0.162, 0.17, 0.104]);
ell([0, 1.1, 0.008], [0.135, 0.17, 0.094]);
ell([0, 0.94, -0.005], [0.162, 0.11, 0.103]);
par((s) => ell([s * 0.075, 0.885, -0.045], [0.085, 0.09, 0.075]));
k = 0.055;
par((s) => cap([s * 0.09, 0.9, 0.0], [s * 0.095, 0.49, 0.012], 0.082, 0.052));
k = 0.04;
par((s) => {
  ell([s * 0.175, 1.37, -0.012], [0.05, 0.065, 0.05]);
  ell([s * 0.22, 1.24, 0.0], [0.04, 0.085, 0.04]);
  ell([s * 0.255, 1.0, 0.012], [0.036, 0.08, 0.034]);
  cap([s * 0.19, 1.395, -0.012], [s * 0.245, 1.12, -0.01], 0.047, 0.034);
  cap([s * 0.245, 1.12, -0.01], [s * 0.27, 0.86, 0.035], 0.033, 0.024);
  ell([s * 0.276, 0.785, 0.045], [0.021, 0.062, 0.04]);
  cap([s * 0.095, 0.49, 0.012], [s * 0.1, 0.075, -0.012], 0.05, 0.032);
  ell([s * 0.098, 0.345, -0.022], [0.046, 0.1, 0.046]);
  cap([s * 0.1, 0.045, -0.035], [s * 0.112, 0.028, 0.125], 0.036, 0.028);
});

const smin = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};

/** Signed distance to one part's own surface. */
function dp(q: Prim, x: number, y: number, z: number) {
  if (q[0] === 0) {
    const bx = q[4] - q[1];
    const by = q[5] - q[2];
    const bz = q[6] - q[3];
    const px = x - q[1];
    const py = y - q[2];
    const pz = z - q[3];
    const t = Math.min(1, Math.max(0, (px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz)));
    return Math.hypot(px - bx * t, py - by * t, pz - bz * t) - (q[7] + (q[8] - q[7]) * t);
  }
  const px = (x - q[1]) / q[4];
  const py = (y - q[2]) / q[5];
  const pz = (z - q[3]) / q[6];
  const k0 = Math.hypot(px, py, pz);
  const k1 = Math.hypot(px / q[4], py / q[5], pz / q[6]);
  return k1 > 0 ? (k0 * (k0 - 1)) / k1 : -Math.min(q[4], q[5], q[6]);
}

/** Signed distance to the skin (negative inside). */
export function sdf(x: number, y: number, z: number) {
  let d = 1e9;
  for (let i = 0; i < P.length; i++) d = smin(d, dp(P[i], x, y, z), K[i]);
  return d;
}

/** Where parts meet, two of them claim the same skin: keep a point there with that much less chance. */
function reclamos(p: [number, number, number]) {
  let n = 0;
  for (const q of P) if (Math.abs(dp(q, p[0], p[1], p[2])) < 0.012) n++;
  return Math.max(1, n);
}

/** The outward normal at a point (central differences). */
export function normal(x: number, y: number, z: number): [number, number, number] {
  const e = 0.0008;
  const nx = sdf(x + e, y, z) - sdf(x - e, y, z);
  const ny = sdf(x, y + e, z) - sdf(x, y - e, z);
  const nz = sdf(x, y, z + e) - sdf(x, y, z - e);
  const l = Math.hypot(nx, ny, nz) || 1;
  return [nx / l, ny / l, nz / l];
}

/** Where the heart is. */
export const CORAZON: [number, number, number] = [0.035, 1.28, 0.045];

/** Rough area of each primitive, to spread points on the skin evenly. */
function area(q: Prim) {
  if (q[0] === 0) {
    const l = Math.hypot(q[4] - q[1], q[5] - q[2], q[6] - q[3]);
    const r = (q[7] + q[8]) / 2;
    return 2 * Math.PI * r * l + 2 * Math.PI * r * r;
  }
  const [a, b, c] = [q[4], q[5], q[6]];
  return 4 * Math.PI * Math.pow((Math.pow(a * b, 1.6) + Math.pow(a * c, 1.6) + Math.pow(b * c, 1.6)) / 3, 1 / 1.6);
}
const AREAS = P.map(area);
const TOTAL = AREAS.reduce((a, b) => a + b, 0);

/** Whether a point on part `i` lies inside another part (then the skin there belongs to that one). */
function enterrado(p: [number, number, number], i: number) {
  for (let j = 0; j < P.length; j++) if (j !== i && dp(P[j], p[0], p[1], p[2]) < -0.004) return true;
  return false;
}

/** A point on one primitive's own surface (before the union smooths it). */
function enPrimitiva(q: Prim, r: () => number): [number, number, number] {
  const th = r() * Math.PI * 2;
  if (q[0] === 0) {
    const t = r();
    const tc = Math.min(1, Math.max(0, t));
    const ax = q[4] - q[1];
    const ay = q[5] - q[2];
    const az = q[6] - q[3];
    const l = Math.hypot(ax, ay, az);
    const dx = ax / l;
    const dy = ay / l;
    const dz = az / l;
    // Two directions across the axis.
    let ux = -dz;
    let uy = 0;
    let uz = dx;
    if (Math.hypot(ux, uy, uz) < 0.2) [ux, uy, uz] = [0, dz, -dy];
    const ul = Math.hypot(ux, uy, uz);
    ux /= ul;
    uy /= ul;
    uz /= ul;
    const vx = dy * uz - dz * uy;
    const vy = dz * ux - dx * uz;
    const vz = dx * uy - dy * ux;
    const rr = q[7] + (q[8] - q[7]) * tc;
    const c = Math.cos(th) * rr;
    const s = Math.sin(th) * rr;
    return [q[1] + ax * t + ux * c + vx * s, q[2] + ay * t + uy * c + vy * s, q[3] + az * t + uz * c + vz * s];
  }
  const u = r() * 2 - 1;
  const s = Math.sqrt(1 - u * u);
  return [q[1] + Math.cos(th) * s * q[4], q[2] + u * q[5], q[3] + Math.sin(th) * s * q[6]];
}

/** Moves a point onto the skin along the field's gradient. */
function proyectar(p: [number, number, number]) {
  for (let i = 0; i < 4; i++) {
    const d = sdf(p[0], p[1], p[2]);
    if (Math.abs(d) < 1e-4) break;
    const n = normal(p[0], p[1], p[2]);
    p[0] -= n[0] * d;
    p[1] -= n[1] * d;
    p[2] -= n[2] * d;
  }
  return Math.abs(sdf(p[0], p[1], p[2])) < 0.0015;
}

export interface Punto {
  p: [number, number, number];
  n: [number, number, number];
}

/** `n` points on the skin, evenly spread, with their normals. */
export function piel(n: number, seed: number): Punto[] {
  const r = rng(seed);
  const out: Punto[] = [];
  while (out.length < n) {
    let k = r() * TOTAL;
    let i = 0;
    while (k > AREAS[i] && i < P.length - 1) k -= AREAS[i++];
    const p = enPrimitiva(P[i], r);
    // A point buried inside another part would crowd the skin where parts overlap.
    if (enterrado(p, i)) continue;
    if (!proyectar(p)) continue;
    if (r() * reclamos(p) > 1) continue;
    out.push({ p, n: normal(p[0], p[1], p[2]) });
  }
  return out;
}

/** `n` points inside the body. */
export function dentro(n: number, seed: number): [number, number, number][] {
  const r = rng(seed);
  const out: [number, number, number][] = [];
  while (out.length < n) {
    const x = -0.33 + 0.66 * r();
    const y = 1.78 * r();
    const z = -0.16 + 0.33 * r();
    if (sdf(x, y, z) < -0.004) out.push([x, y, z]);
  }
  return out;
}

/**
 * `n` points on the body's contour lines: the skin cut by horizontal planes every `paso` metres,
 * like the lines of a map. Each comes with its normal and the index of its line.
 */
export function curvas(n: number, paso: number, seed: number): (Punto & { linea: number })[] {
  const r = rng(seed);
  const out: (Punto & { linea: number })[] = [];
  while (out.length < n) {
    let k = r() * TOTAL;
    let i = 0;
    while (k > AREAS[i] && i < P.length - 1) k -= AREAS[i++];
    const p = enPrimitiva(P[i], r);
    if (enterrado(p, i)) continue;
    if (!proyectar(p)) continue;
    if (r() * reclamos(p) > 1) continue;
    const linea = Math.round(p[1] / paso);
    const y = linea * paso;
    if (Math.abs(p[1] - y) > paso * 0.45) continue;
    // Down onto the plane, then onto the skin across it (the gradient without its height).
    p[1] = y;
    let ok = false;
    for (let j = 0; j < 5; j++) {
      const d = sdf(p[0], y, p[2]);
      if (Math.abs(d) < 3e-4) {
        ok = true;
        break;
      }
      const g = normal(p[0], y, p[2]);
      const h = Math.hypot(g[0], g[2]);
      if (h < 0.25) break;
      p[0] -= (g[0] / (h * h)) * d;
      p[2] -= (g[2] / (h * h)) * d;
    }
    if (!ok) continue;
    out.push({ p, n: normal(p[0], p[1], p[2]), linea });
  }
  return out;
}
