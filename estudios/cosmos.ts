import * as THREE from 'three';
import { materiaBuilder } from '../src/engine/materia';
import { gauss, rng } from '../src/engine/math';

/**
 * What the far studies share: a spiral galaxy in points (unit: one light-year), the network that
 * «they» could weave through it, and the cosmic web of galaxies (unit: a million light-years).
 */

export const VIEJA = new THREE.Color(1.0, 0.78, 0.52);
export const JOVEN = new THREE.Color(0.52, 0.68, 1.0);
export const ROSA = new THREE.Color(1.0, 0.42, 0.52);
export const BLANCO = new THREE.Color(0.93, 0.96, 1.0);

/** Galaxy kinds of point. */
export const GAL = { BULBO: 0, VIEJA: 1, JOVEN: 2, NEBULOSA: 3, POLVO: 4 } as const;

const PASO = 0.24; // pitch of the arms (radians)
const brazo = (r: number) => Math.log(Math.max(r, 800) / 2200) / Math.tan(PASO);

/** Where a star of the disk goes: radius from an exponential disk, angle along one of the arms. */
function enDisco(r: () => number, joven: boolean, radio: number) {
  const rr = Math.min(radio * 1.1, -radio * 0.22 * Math.log(1 - r() * 0.985));
  const k = r();
  // Two main arms and two fainter ones.
  const fase = k < 0.36 ? 0 : k < 0.72 ? Math.PI : k < 0.86 ? Math.PI / 2 : (3 * Math.PI) / 2;
  const abierto = joven ? 0.1 : 0.55;
  const th = brazo(rr) + fase + gauss(r) * abierto * (1 + 3000 / (rr + 3000));
  return [rr * Math.cos(th), rr * Math.sin(th), rr] as const;
}

/**
 * A spiral galaxy about `radio` light-years across its disk (radius), facing +y. Old stars warm,
 * young ones blue along the arms, pink nebulae in knots, and dust that blocks light along the
 * inside of the arms.
 */
export function galaxia(seed: number, n: number, radio = 50_000) {
  const b = materiaBuilder(seed);
  const r = b.r;
  for (let i = 0; i < n; i++) {
    const k = r();
    if (k < 0.16) {
      // The bulge: a squashed ball of old stars.
      const [x, y, z] = b.onSphere();
      const rr = radio * 0.11 * Math.pow(r(), 1.6) * (0.4 + 0.6 * r());
      b.push(x * rr * 1.25, y * rr * 0.6, z * rr, VIEJA.clone().lerp(new THREE.Color(1, 0.7, 0.45), r() * 0.5), 60, 0.55, { kind: GAL.BULBO });
      continue;
    }
    const joven = k > 0.62;
    const [x, z, rr] = enDisco(r, joven, radio);
    const grosor = joven ? 120 : 380 + 900 * Math.exp(-rr / 6000);
    b.push(x, gauss(r) * grosor, z, joven ? JOVEN : VIEJA, 60, joven ? 0.9 : 0.42, { kind: joven ? GAL.JOVEN : GAL.VIEJA });
  }
  // Nebulae: small pink knots along the arms.
  for (let c = 0; c < 260; c++) {
    const [cx, cz] = enDisco(r, true, radio);
    const m = 6 + Math.floor(r() * 20);
    for (let j = 0; j < m; j++) b.push(cx + gauss(r) * 260, gauss(r) * 80, cz + gauss(r) * 260, ROSA, 90, 0.9, { kind: GAL.NEBULOSA });
  }
  // Dust: dark, along the inner edge of the arms.
  for (let i = 0; i < n * 0.16; i++) {
    const rr = Math.min(radio, 3500 - radio * 0.2 * Math.log(1 - r() * 0.98));
    const fase = r() < 0.5 ? 0 : Math.PI;
    const th = brazo(rr) + fase - 0.16 + gauss(r) * 0.07;
    b.push(rr * Math.cos(th), gauss(r) * 90, rr * Math.sin(th), new THREE.Color(0.05, 0.035, 0.03), 260, 0.2, { kind: GAL.POLVO, ink: 0.35 });
  }
  return b.data();
}

/**
 * Their network through the galaxy: nodes where the stars are, each joined to its nearest ones,
 * and points along every link. Each point knows how far it is, along the network, from the node
 * where a thought starts (the one farthest out along +x).
 */
export function red(seed: number, nodos: number, radio = 50_000, paso = 110) {
  const r = rng(seed);
  const P: [number, number, number][] = [];
  while (P.length < nodos) {
    const k = r();
    if (k < 0.06) {
      const a = r() * Math.PI * 2;
      const rr = radio * 0.1 * Math.sqrt(r());
      P.push([rr * Math.cos(a), gauss(r) * 300, rr * Math.sin(a)]);
    } else if (k < 0.4) {
      const [x, z] = enDisco(r, true, radio);
      P.push([x, gauss(r) * 200, z]);
    } else {
      // Spread over the disk's area, a little bunched towards the arms: a net, not a knot.
      const rr = radio * (0.08 + 0.92 * Math.sqrt(r()));
      const th = brazo(rr) + (r() < 0.5 ? 0 : Math.PI) + gauss(r) * 0.6;
      P.push([rr * Math.cos(th), gauss(r) * 250, rr * Math.sin(th)]);
    }
  }
  // Links to the 3 nearest (both ways), as a list of edges.
  const vecinos: number[][] = P.map(() => []);
  const aristas: [number, number][] = [];
  const hay = new Set<string>();
  for (let i = 0; i < P.length; i++) {
    const d: [number, number][] = [];
    for (let j = 0; j < P.length; j++) if (j !== i) d.push([Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1], P[i][2] - P[j][2]), j]);
    d.sort((a, b) => a[0] - b[0]);
    for (const [, j] of d.slice(0, 3)) {
      const key = i < j ? `${i},${j}` : `${j},${i}`;
      if (hay.has(key)) continue;
      hay.add(key);
      aristas.push([i, j]);
      vecinos[i].push(j);
      vecinos[j].push(i);
    }
  }
  const largo = (i: number, j: number) => Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1], P[i][2] - P[j][2]);
  // Where the thought starts: the node farthest out along +x.
  let s = 0;
  for (let i = 1; i < P.length; i++) if (P[i][0] > P[s][0]) s = i;
  // Dijkstra (simple: the graph is small).
  const dist = new Float64Array(P.length).fill(Infinity);
  const hecho = new Uint8Array(P.length);
  dist[s] = 0;
  for (let it = 0; it < P.length; it++) {
    let u = -1;
    for (let i = 0; i < P.length; i++) if (!hecho[i] && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || dist[u] === Infinity) break;
    hecho[u] = 1;
    for (const v of vecinos[u]) dist[v] = Math.min(dist[v], dist[u] + largo(u, v));
  }
  let lejos = 0;
  for (let i = 0; i < P.length; i++) if (dist[i] < Infinity) lejos = Math.max(lejos, dist[i]);
  for (let i = 0; i < P.length; i++) if (dist[i] === Infinity) dist[i] = lejos * 1.2;

  const b = materiaBuilder(seed + 1);
  const aD: number[] = [];
  for (const [i, j] of aristas) {
    const L = largo(i, j);
    const m = Math.max(2, Math.round(L / paso));
    for (let k = 0; k <= m; k++) {
      const t = k / m;
      const x = P[i][0] + (P[j][0] - P[i][0]) * t;
      const y = P[i][1] + (P[j][1] - P[i][1]) * t;
      const z = P[i][2] + (P[j][2] - P[i][2]) * t;
      b.push(x, y, z, BLANCO, 40, 0.45, { kind: 1 });
      aD.push(Math.min(dist[i] + t * L, dist[j] + (1 - t) * L));
    }
  }
  for (let i = 0; i < P.length; i++) {
    b.push(P[i][0], P[i][1], P[i][2], BLANCO, 160, 2.2, { kind: 0 });
    aD.push(dist[i]);
  }
  return { data: b.data(), aD: new Float32Array(aD), fuente: P[s], lejos };
}

/**
 * The cosmic web: galaxies on the walls and, above all, the threads between empty cells (a
 * Voronoi foam of a jittered grid), inside a sphere of `radio`. Each point is a galaxy, or a heap of
 * them. Unit: whatever `radio` is in (the void study uses thousands of millions of light-years).
 */
export function telarana(seed: number, n: number, radio: number, celda: number) {
  const r = rng(seed);
  const m = Math.ceil((2 * radio) / celda) + 2;
  const S = new Float32Array(m * m * m * 3);
  for (let i = 0; i < m * m * m; i++) {
    const cx = i % m;
    const cy = Math.floor(i / m) % m;
    const cz = Math.floor(i / (m * m));
    S[i * 3] = -radio - celda + (cx + r()) * celda;
    S[i * 3 + 1] = -radio - celda + (cy + r()) * celda;
    S[i * 3 + 2] = -radio - celda + (cz + r()) * celda;
  }
  const b = materiaBuilder(seed + 1);
  const aQ: number[] = [];
  const calidas = [new THREE.Color(1.0, 0.8, 0.58), new THREE.Color(1.0, 0.68, 0.48), new THREE.Color(1.0, 0.9, 0.78), new THREE.Color(0.75, 0.82, 1.0)];
  let tries = 0;
  while (b.count < n && tries < n * 400) {
    tries++;
    const x = (r() * 2 - 1) * radio;
    const y = (r() * 2 - 1) * radio;
    const z = (r() * 2 - 1) * radio;
    const d0 = Math.hypot(x, y, z);
    if (d0 > radio) continue;
    const ix = Math.floor((x + radio + celda) / celda);
    const iy = Math.floor((y + radio + celda) / celda);
    const iz = Math.floor((z + radio + celda) / celda);
    let d1 = Infinity;
    let d2 = Infinity;
    let d3 = Infinity;
    for (let a = -1; a <= 1; a++)
      for (let c = -1; c <= 1; c++)
        for (let e = -1; e <= 1; e++) {
          const jx = ix + a;
          const jy = iy + c;
          const jz = iz + e;
          if (jx < 0 || jy < 0 || jz < 0 || jx >= m || jy >= m || jz >= m) continue;
          const k = (jx + jy * m + jz * m * m) * 3;
          const d = Math.hypot(x - S[k], y - S[k + 1], z - S[k + 2]);
          if (d < d1) {
            d3 = d2;
            d2 = d1;
            d1 = d;
          } else if (d < d2) {
            d3 = d2;
            d2 = d;
          } else if (d < d3) d3 = d;
        }
    const muro = (d2 - d1) / celda;
    const hilo = (d3 - d1) / celda;
    const p = hilo < 0.06 ? 1 : muro < 0.035 ? 0.05 : 0.0007;
    if (r() > p) continue;
    const brillo = hilo < 0.025 ? 1.7 : hilo < 0.06 ? 1 : 0.5;
    b.push(x, y, z, calidas[Math.floor(r() * (r() < 0.85 ? 3 : 4))], celda * 0.012, brillo, { kind: hilo < 0.06 ? 0 : 1 });
    aQ.push(d0, hilo, 0, 0);
  }
  return { data: b.data(), aQ: new Float32Array(aQ) };
}
