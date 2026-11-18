import * as THREE from 'three';
import { Timeline, EASE, type Ease } from './timeline';
import { pantalla } from '../src/engine/pantalla';
import { enfocar, materia, materiaBuilder } from '../src/engine/materia';
import { clamp, gauss, lerp, smoothstep } from '../src/engine/math';
import { FONT, ink, type Cuenta, type Rotulo } from './placa';
import { SERIE, TIBIO, V } from './comun';
import type { Escena, Frame, Instancia } from './tipos';
import { ESTRELLAS, col, mz, type RGB } from './mundos';

/**
 * Study · «Nace», «No muere» and «Muchos que son uno» (GUION-formas, moments 24–26). Phase 0.
 *
 * The middle of the third movement, and what «Cruza» left out. One seed to follow from start to
 * end:
 *  - the spore of «Cruza» lands on another rock and a lichen grows; it lets go more, and the dotted
 *    trail branches from rock to rock;
 *  - the lichens let go thousands of seeds (a heart, a stalk and a crown of threads, like a
 *    dandelion's) and we travel with one of them to a red star;
 *  - where each seed lands, a heart starts to beat: a reef in a ring around the star. It is the sea
 *    of pulses of «Ya no está», drawn dotted;
 *  - the waves that put those out pass here too, and nobody goes out: they change colour and shape;
 *  - their rhythms become one, the ring closes around its star like two hands, and the one being
 *    opens like the eyelid of moment 7. Inside there is a sky.
 *
 * The colour rule: rock has no colour; all of it is in what lives.
 */

const BLANCO: RGB = [TIBIO.r, TIBIO.g, TIBIO.b];
const vivo = (c: THREE.Color): RGB => {
  const l = (c.r + c.g + c.b) / 3;
  return [Math.max(0, l + (c.r - l) * 2.1), Math.max(0, l + (c.g - l) * 2.1), Math.max(0, l + (c.b - l) * 2.1)];
};
const PALETA: RGB[] = [SERIE.destino, SERIE.tiempo, SERIE.infinito, SERIE.mente, SERIE.abismo, SERIE.espacio].map(vivo);

/** The field of rocks where the spore lands, far from the red star (which sits at the origin). */
const CAMPO = V(0, 700, 3600);
const SOL = V(0.45, 0.4, 0.8).normalize();
/** Where the seed we follow lands, in the reef (the plane y = 0). */
const HB = V(0, 0, 120);
const R0 = 70;
const R1 = 260;
/** The radius of the one being, once the reef closes around the star. */
const RS = 60;
/** A seed's journey lasts DUR of `viaja`; the one we follow leaves at D0H. */
const DUR = 0.55;
const D0H = 0.1575;
/** The eyelid: where it faces, its up and its side. */
const LA = V(0, 0.13, 0.99).normalize();
const LC = V(0, 1, 0).cross(LA).normalize();
const LB = LA.clone().cross(LC).normalize();

interface Roca {
  c: THREE.Vector3;
  ejes: THREE.Vector3;
  f: number;
  /** When it is seeded (0..1 of `nace`), where and that spot's normal. */
  t: number;
  L: THREE.Vector3;
  n: THREE.Vector3;
}

const bulto = (d: THREE.Vector3, f: number) =>
  1 + 0.15 * Math.sin(3.1 * d.x + 1.3 + f) * Math.sin(2.3 * d.y + 0.4 + 2 * f) + 0.11 * Math.sin(4.7 * d.z + 2.1 + f) * Math.sin(3.9 * d.x + f) + 0.06 * Math.sin(8 * d.y + 1) * Math.sin(7 * d.z + f);
const enRoca = (R: Roca, d: THREE.Vector3) => d.clone().multiply(R.ejes).multiplyScalar(bulto(d, R.f)).add(R.c);
const normalDe = (R: Roca, d: THREE.Vector3) => d.clone().divide(R.ejes).normalize();

function mundo() {
  const b = materiaBuilder(733);
  const r = b.r;
  const aC: number[] = [];
  const aE: number[] = [];
  const aQ: number[] = [];
  const aM: number[] = [];
  const O = V();
  const put = (p: THREE.Vector3, color: RGB, size: number, luz: number, kind: number, C: THREE.Vector3, E: THREE.Vector3, Q: number[], M: number[]) => {
    b.push(p.x, p.y, p.z, col(color), size, luz, { kind });
    aC.push(C.x, C.y, C.z);
    aE.push(E.x, E.y, E.z);
    aQ.push(Q[0], Q[1], Q[2], Q[3]);
    aM.push(M[0], M[1], M[2], M[3]);
  };
  const dir = () => {
    const [x, y, z] = b.onSphere();
    return V(x, y, z);
  };

  // ---------------------------------------------------------------- the rocks

  const rocas: Roca[] = [];
  const nueva = (c: THREE.Vector3, ejes: THREE.Vector3): Roca => {
    const R: Roca = { c, ejes, f: r() * 6, t: 0, L: V(), n: V() };
    // It lands on the side the light falls on.
    let d = dir();
    for (let k = 0; k < 200 && normalDe(R, d).dot(SOL) < 0.6; k++) d = dir();
    R.L = enRoca(R, d);
    R.n = normalDe(R, d);
    return R;
  };
  rocas.push(nueva(CAMPO.clone(), V(9, 6.5, 7.5)));
  for (let k = 0; k < 4000 && rocas.length < 17; k++) {
    const c = CAMPO.clone().add(V(gauss(r) * 40, gauss(r) * 16, gauss(r) * 34 - 8));
    const e = 3.5 + 4.5 * r();
    if (rocas.some((o) => o.c.distanceTo(c) < 15 + e)) continue;
    rocas.push(nueva(c, V(e * (0.8 + 0.5 * r()), e * (0.7 + 0.3 * r()), e * (0.8 + 0.4 * r()))));
  }
  // The order they are seeded in: each from one that already has life, the nearest ones first.
  rocas.sort((p, q) => p.c.distanceTo(CAMPO) - q.c.distanceTo(CAMPO));
  const padre: number[] = [-1];
  rocas[0].t = 0.12;
  for (let i = 1; i < rocas.length; i++) {
    const antes = [...Array(i).keys()].sort((p, q) => rocas[p].c.distanceTo(rocas[i].c) - rocas[q].c.distanceTo(rocas[i].c));
    const pa = antes[r() < 0.7 || antes.length < 2 ? 0 : 1];
    padre.push(pa);
    rocas[i].t = rocas[pa].t + 0.09 + 0.0022 * rocas[pa].c.distanceTo(rocas[i].c);
  }
  const tmax = Math.max(...rocas.map((o) => o.t));
  for (const o of rocas) o.t = 0.12 + ((o.t - 0.12) * 0.66) / (tmax - 0.12);

  for (const R of rocas) {
    const primera = R === rocas[0];
    const n = Math.round((primera ? 4800 : 1500) * (R.ejes.x + R.ejes.y + R.ejes.z));
    for (let i = 0; i < n; i++) {
      const d = dir();
      put(enRoca(R, d), BLANCO, primera ? 0.034 : 0.07, primera ? 0.16 : 0.3, 0, O, normalDe(R, d), [0, 0, 0, 0], [0, 0, 0, 0]);
    }
  }

  // ---------------------------------------------------------------- the lichens (as in «Cruza»)

  const liquen = (c: THREE.Vector3, n: THREE.Vector3, R: number, L: number, cA: RGB, cB: RGB, ppu: number, t: number) => {
    const t1 = V(0, 1, 0).cross(n).normalize();
    const t2 = n.clone().cross(t1);
    const giro = r() * Math.PI * 2;
    const sem = r();
    const size = 0.011 + 0.006 * R;
    const hondo = R > 1.4 ? 5 : R > 0.8 ? 4 : 3;
    const pon = (x: number, y: number, rho: number, parte: number, luz: number, s = 1) => {
      const q = Math.min(rho, 1.15);
      const h = R * (0.1 * (1 - q * q) + 0.09 * q * q * q);
      const p = c.clone().addScaledVector(t1, x).addScaledVector(t2, y).addScaledVector(n, h + 0.03);
      put(p, mz(mz(cA, cB, Math.min(q, 1)), BLANCO, parte === 1 ? 0.06 : 0.03), size * s, luz, 1, c, n, [q, 0, sem, R], [t, parte, 0, 0]);
    };
    const rama = (x: number, y: number, ang: number, len: number, nivel: number, camino: number) => {
      const m = Math.max(3, Math.round(len * ppu));
      const curva = (r() - 0.5) * 0.5;
      let px = x;
      let py = y;
      let a = ang;
      for (let i = 0; i < m; i++) {
        a += curva / m;
        px += (Math.cos(a) * len) / m;
        py += (Math.sin(a) * len) / m;
        pon(px, py, (camino + (len * (i + 1)) / m) / R, 0, nivel === 0 ? 0.95 : 0.8 - 0.09 * nivel, nivel === 0 ? 1.1 : 0.9);
      }
      const fin = camino + len;
      if (nivel >= hondo) {
        // The leaf: a small crystal with a bright edge.
        const w = len * 0.7;
        const lg = len * 1.5;
        const q: [number, number][] = [[0, 0], [lg * 0.45, w * 0.5], [lg, 0], [lg * 0.45, -w * 0.5]];
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        for (let e = 0; e < 4; e++) {
          const A = q[e];
          const B = q[(e + 1) % 4];
          const k = Math.max(3, Math.round(Math.hypot(B[0] - A[0], B[1] - A[1]) * ppu * 1.3));
          for (let i = 0; i < k; i++) {
            const u = lerp(A[0], B[0], i / k);
            const v = lerp(A[1], B[1], i / k);
            pon(px + ca * u - sa * v, py + sa * u + ca * v, (fin + u) / R, 1, 0.8, 1.1);
          }
        }
        return;
      }
      const lado = r() < 0.5 ? 1 : -1;
      rama(px, py, a + (r() - 0.5) * 0.3, len * 0.75, nivel + 1, fin);
      rama(px, py, a + lado * (0.6 + 0.35 * r()), len * 0.6, nivel + 1, fin);
      if (nivel < 2 && r() < 0.6) rama(px, py, a - lado * (0.55 + 0.35 * r()), len * 0.5, nivel + 1, fin);
    };
    for (let k = 0; k < L; k++) rama(0, 0, giro + ((k + (r() - 0.5) * 0.5) / L) * Math.PI * 2, (R * (0.62 + 0.4 * r())) / 3.3, 0, 0);
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2;
      const s = 0.07 * R * Math.sqrt(r());
      pon(Math.cos(a) * s, Math.sin(a) * s, 0, 2, 1.0, 1.5);
    }
  };

  /** Where seeds leave from: every lichen's heart. */
  const salidas: THREE.Vector3[] = [];
  rocas.forEach((R, i) => {
    const chico = Math.min(R.ejes.x, R.ejes.y, R.ejes.z);
    const a = i === 0 ? 0 : Math.floor(r() * PALETA.length);
    liquen(R.L, R.n, i === 0 ? 2.7 : 0.42 * chico, i === 0 ? 7 : 5 + Math.floor(r() * 3), PALETA[a], PALETA[(a + 2) % PALETA.length], i === 0 ? 80 : 50, R.t);
    salidas.push(R.L.clone().addScaledVector(R.n, 0.6));
    // It spreads over its rock.
    for (let k = 0; k < (i === 0 ? 4 : 2); k++) {
      let d = dir();
      for (let j = 0; j < 100 && (normalDe(R, d).dot(SOL) < 0.15 || enRoca(R, d).distanceTo(R.L) < chico * 0.7); j++) d = dir();
      const c2 = Math.floor(r() * PALETA.length);
      liquen(enRoca(R, d), normalDe(R, d), chico * (0.16 + 0.14 * r()), 5, PALETA[c2], PALETA[(c2 + 1) % PALETA.length], 45, R.t + 0.07 + 0.05 * k + 0.04 * r());
      salidas.push(enRoca(R, d).addScaledVector(normalDe(R, d), 0.5));
    }
  });

  // The spores, rock to rock: the dotted trail branches.
  const salto = (A: THREE.Vector3, B: THREE.Vector3, M: THREE.Vector3, n: number, dep: number, arr: number, size: number) => {
    for (let i = 0; i < n; i++) {
      if (Math.floor(i / 4) % 2) continue;
      const s = i / n;
      const p = A.clone().multiplyScalar((1 - s) * (1 - s)).addScaledVector(M, 2 * s * (1 - s)).addScaledVector(B, s * s);
      put(p, mz(PALETA[0], BLANCO, 0.35), size, 2.0, 2, O, O, [s, 0, 0, 0], [dep, arr, 0, 0]);
    }
  };
  const LLEGA = CAMPO.clone().add(V(60, 46, 420));
  salto(LLEGA, rocas[0].L, LLEGA.clone().lerp(rocas[0].L, 0.5).add(V(-6, 10, 0)), 420, 0, 0.12, 0.2);
  for (let i = 1; i < rocas.length; i++) {
    const P = rocas[padre[i]];
    const A = P.L.clone().addScaledVector(P.n, 0.5);
    const B = rocas[i].L;
    const d = A.distanceTo(B);
    const M = A.clone().lerp(B, 0.5).addScaledVector(P.n.clone().add(rocas[i].n).normalize(), d * 0.35);
    salto(A, B, M, Math.round(d * 2.2), lerp(P.t, rocas[i].t, 0.3), rocas[i].t, 0.13);
  }

  // ---------------------------------------------------------------- the reef

  interface Ser {
    c: THREE.Vector3;
    e: THREE.Vector3;
    R: number;
    per: number;
    lobes: number;
    pal: number;
    d0: number;
    tw: number;
    dm: number;
  }
  /** The ring folds into a sphere like two hands closing: the inner rim stays, the rest goes up or down. */
  const enEsfera = (x: number, z: number, arriba: boolean) => {
    const rho = Math.hypot(x, z);
    const u = clamp((rho * rho - R0 * R0) / (R1 * R1 - R0 * R0), 0, 0.999);
    const lat = Math.asin(u) * (arriba ? 1 : -1);
    const a = Math.atan2(z, x);
    return V(Math.cos(a) * Math.cos(lat), Math.sin(lat), Math.sin(a) * Math.cos(lat)).multiplyScalar(RS);
  };
  const onda = (x: number, z: number) => clamp(0.275 + (0.14 * (x * 0.8 + (z - HB.z) * 0.6)) / 200 + 0.01 * r(), 0.05, 0.5);
  const seres: Ser[] = [];
  for (let i = 0; i < 9000; i++) {
    let x: number;
    let z: number;
    if (i < 700) {
      const a = r() * Math.PI * 2;
      const s = 4 + 30 * Math.sqrt(r());
      x = HB.x + Math.cos(a) * s;
      z = HB.z + Math.sin(a) * s;
    } else {
      const rho = Math.sqrt(lerp(R0 * R0, R1 * R1, r()));
      const a = r() * Math.PI * 2;
      x = Math.cos(a) * rho;
      z = Math.sin(a) * rho;
    }
    const dm = Math.hypot(x - HB.x, z - HB.z);
    if (dm < 5.2) continue;
    // Slow hearts are big, fast ones small.
    const per = 0.22 * Math.pow(36, r() * r());
    seres.push({ c: V(x, 0, z), e: enEsfera(x, z, r() < 0.5), R: 0.55 * Math.pow(per, 0.6) * (0.8 + 0.5 * r()), per, lobes: 3 + Math.floor(r() * 5), pal: Math.floor(r() * 6), d0: (0.02 + 0.98 * r()) * (1 - DUR), tw: onda(x, z), dm });
  }
  const heroe: Ser = { c: HB.clone(), e: enEsfera(HB.x, HB.z, true), R: 3.3, per: 2.6, lobes: 5, pal: 3.65, d0: D0H, tw: 0.275, dm: 0 };

  const UNO: RGB = [1, 1, 1];
  const ser = (s: Ser, n: number, size: number, cuerpo: number, doble: boolean, brillo: number) => {
    const fase = r();
    const M = [s.d0 + DUR, s.tw, s.lobes, s.pal];
    put(s.c, UNO, size * 1.5, brillo, 4, s.c, s.e, [fase, s.per, 0, s.R], M);
    for (let k = 0; k < (doble ? 2 : 1); k++) {
      const m = k ? Math.round(n * 0.7) : n;
      // Dotted: every other dash is left out. It is the line of what is only possible.
      const g = Math.max(1, Math.round(m / (doble ? 72 : 18)));
      for (let i = 0; i < m; i++) {
        if (Math.floor(i / g) % 2) continue;
        put(s.c, UNO, size, 0.9 * brillo, 5, s.c, s.e, [fase - (k ? 0.13 : 0), s.per, (i / m) * Math.PI * 2, s.R * (k ? 0.62 : 1)], M);
      }
    }
    for (let i = 0; i < cuerpo; i++) {
      const f = Math.sqrt(r());
      put(V(f, 0.05 * (1 - f), 0), UNO, size * 0.9, 0.55 * brillo, 6, s.c, s.e, [fase, s.per, r() * Math.PI * 2, s.R], M);
    }
  };

  // ---------------------------------------------------------------- the seeds

  const VIAJE = HB.clone().sub(salidas[0]).normalize();
  const W = VIAJE.clone().negate();
  const U1 = V(0, 1, 0).cross(W).normalize();
  const U2 = W.clone().cross(U1);
  /** A heart in front, a stalk, and a crown of threads behind it, each ending in a small crystal. */
  const semilla = (A: THREE.Vector3, B: THREE.Vector3, d0: number, color: RGB, esc: number, hilos: number, bx: number, by: number, paso: number, colas: number) => {
    const sem = r();
    const pon = (x: number, y: number, w: number, rho: number, lag: number, size: number, luz: number, c: RGB = color) => {
      const p = V().addScaledVector(U1, x * esc).addScaledVector(U2, y * esc).addScaledVector(W, w * esc);
      put(p, c, size, luz, 3, A, B, [rho, lag, sem, 0], [d0, 0, bx, by]);
    };
    pon(0, 0, 0, 0, 0, hilos ? 0.1 * esc : 0.3, 2.2, mz(color, BLANCO, 0.4));
    for (let k = 1; k <= colas; k++) pon(0, 0, 0, 0.5, k * paso, hilos ? 0.07 * esc : 0.2, 0.9 * (1 - (0.6 * k) / colas));
    if (!hilos) return;
    for (let i = 0; i < 14; i++) pon(0, 0, (1.2 * i) / 14, (0.35 * i) / 14, 0, 0.03 * esc, 0.9);
    const m = esc > 0.9 ? 90 : 16;
    for (let h = 0; h < hilos; h++) {
      const a = ((h + 0.5 * r()) / hilos) * Math.PI * 2;
      const largo = 1.35 + 0.5 * r();
      for (let i = 1; i <= m; i++) {
        const u = i / m;
        const rad = largo * Math.pow(u, 0.8);
        pon(Math.cos(a) * rad, Math.sin(a) * rad, 1.2 + 1.0 * u * u, 0.35 + 0.65 * u, 0, (i === m ? 0.07 : 0.022) * esc, i === m ? 1.6 : 0.75, i === m ? mz(color, PALETA[2], 0.6) : color);
      }
    }
  };

  // The ones that travel beside ours land beside it.
  const cerca = [...seres].sort((p, q) => p.dm - q.dm).slice(0, 16);
  for (const s of seres) {
    const junto = cerca.indexOf(s);
    const color = mz(PALETA[s.pal], BLANCO, 0.25);
    if (junto >= 0) {
      s.d0 = D0H + (r() - 0.5) * 0.005;
      const A = salidas[0].clone().add(V(gauss(r) * 7, gauss(r) * 4, gauss(r) * 7));
      semilla(A, s.c, s.d0, color, 0.35 + 0.5 * r(), 12, gauss(r) * 5, gauss(r) * 5, 0.0007, 6);
    } else {
      const A = salidas[Math.floor(r() * salidas.length)].clone().add(V(r() - 0.5, r() - 0.5, r() - 0.5));
      const a = r() * Math.PI * 2;
      const m = 40 + 190 * r();
      semilla(A, s.c, s.d0, color, 1, 0, Math.cos(a) * m, Math.sin(a) * m, 0.003, 3);
    }
    const near = s.dm < 30;
    ser(s, near ? 150 : s.dm < 70 ? 40 : 16, 0.0038 * clamp(s.dm, 4, 60), near ? 180 : 0, false, clamp(12 / s.dm, 0.06, 1));
  }
  // The skin of the one being: lights that only show once the ring has closed.
  for (let i = 0; i < 30_000; i++) {
    const rho = Math.sqrt(lerp(R0 * R0, R1 * R1, r()));
    const a = r() * Math.PI * 2;
    const c = V(Math.cos(a) * rho, 0, Math.sin(a) * rho);
    put(c, UNO, 0.22, 0.5, 4, c, enEsfera(c.x, c.z, r() < 0.5), [r(), 3.4, 0, 0], [0, onda(c.x, c.z), 3, Math.floor(r() * 6)]);
  }
  semilla(salidas[0], HB, D0H, mz(PALETA[3], PALETA[4], 0.65), 1, 26, 0, 0, 0.0007, 14);
  ser(heroe, 620, 0.022, 1800, true, 2.4);

  // ---------------------------------------------------------------- the star, and the sky inside

  for (let i = 0; i < 7000; i++) {
    const d = dir().multiplyScalar(8 * Math.pow(r(), 0.4));
    put(d, [1.0, 0.1 + 0.12 * r(), 0.03], 0.4, 0.5, 7, O, O, [0, 0, 0, 0], [0, 0, 0, 0]);
  }
  const SOLES: [THREE.Vector3, RGB][] = [
    [V(-16, 7, 0), [1.0, 0.16, 0.42]],
    [V(9, 13, -10), [0.12, 0.9, 0.7]],
    [V(18, -1, 6), [0.35, 0.33, 1.0]],
  ];
  for (const [c, color] of SOLES) {
    for (let i = 0; i < 700; i++) put(c.clone().add(dir().multiplyScalar(3.2 * Math.pow(r(), 0.6))), color, 0.5, 1.8, 8, O, O, [0, 0, 0, 0], [0, 0, 0, 0]);
  }
  // A sea of light under them, every swell its own colour.
  for (let i = 0; i < 9000; i++) {
    const a = r() * Math.PI * 2;
    const s = 40 * Math.sqrt(r());
    const x = Math.cos(a) * s;
    const z = Math.sin(a) * s;
    const k = Math.floor(r() * 6);
    const ola = Math.sin(x * (0.5 + 0.13 * k) + z * (0.3 - 0.1 * k) + k * 1.7);
    if (ola < 0.55) continue;
    put(V(x, -13 + 1.2 * ola, z), PALETA[k], 0.3, 0.9, 8, O, O, [1, 0, 0, 0], [0, 0, 0, 0]);
  }
  for (let i = 0; i < 1500; i++) put(dir().multiplyScalar(48 * Math.pow(r(), 0.5)), PALETA[Math.floor(r() * 6)], 0.2, 0.7, 8, O, O, [0, 0, 0, 0], [0, 0, 0, 0]);

  const f = (a: number[]) => new Float32Array(a);
  return { data: b.data(), aC: f(aC), aE: f(aE), aQ: f(aQ), aM: f(aM), sale: salidas[0], roca: rocas[0], cuantos: seres.length + 1 };
}

const gl = (v: THREE.Vector3) => `vec3(${v.x.toFixed(6)}, ${v.y.toFixed(6)}, ${v.z.toFixed(6)})`;

const PRE = /* glsl */ `
  attribute vec3 aC, aE;
  attribute vec4 aQ, aM;
  uniform vec3 uSol, uCamW, uPal[6];
  uniform float uNace, uViaja, uCambia, uUno, uJunta, uAbre, uEstrella, uLejos;
  const vec3 HB = ${gl(HB)};
  const vec3 LA = ${gl(LA)};
  const vec3 LB = ${gl(LB)};
  const vec3 LC = ${gl(LC)};
  const float RS = ${RS.toFixed(1)};
  vec3 pal(float x) {
    x = mod(x, 6.0);
    int i = int(floor(x));
    int j = i == 5 ? 0 : i + 1;
    return mix(uPal[i], uPal[j], fract(x));
  }
  /** Half the height of the eyelid's opening at this longitude (radians). */
  float parpado(float lon) {
    return uAbre * 0.46 * pow(max(cos(clamp(lon * 1.7, -1.5708, 1.5708)), 0.0), 0.7);
  }
`;

const MOVE = /* glsl */ `
  if (aKind < 0.5) {
    // Rock: only the light that falls on it, and only the side we see.
    em *= (0.012 + smoothstep(-0.05, 0.65, dot(aE, uSol))) * step(0.0, dot(aE, uCamW - p));
  } else if (aKind < 1.5) {
    // A lichen opens from its heart out, and light runs from its rim to its heart.
    float g = smoothstep(aM.x, aM.x + 0.14, uNace);
    float rho = aQ.x;
    float brote = smoothstep(rho - 0.06, rho + 0.04, g * 1.12);
    p = aC + (position - aC) * (0.3 + 0.7 * g);
    float tt = uTime * 0.2 + aQ.z;
    float ola = exp(-pow((rho - (1.0 - fract(tt))) / 0.09, 2.0));
    float base = aM.y < 0.5 ? 0.4 : 0.55;
    float pul = aM.y > 1.5 ? 2.0 * exp(-fract(tt) * 5.0) : aM.y < 0.5 ? 1.7 * ola : 0.5 * ola;
    // The moment it is seeded, it flashes.
    float chispa = 3.0 * g * (1.0 - g) * 4.0 * (1.0 - smoothstep(0.0, 0.3, rho));
    em *= (base + pul + chispa) * brote * smoothstep(-0.15, 0.2, dot(aE, normalize(uCamW - aC)));
    fuente = 0.35;
  } else if (aKind < 2.5) {
    float head = (uNace - aM.x) / max(aM.y - aM.x, 0.001);
    em *= step(aQ.x, head) * step(0.0, head) * (0.28 + 4.0 * exp(-pow((aQ.x - head) / 0.03, 2.0)) * step(head, 1.04));
    fuente = 0.8;
  } else if (aKind < 3.5) {
    // A seed: it leaves its lichen, crosses and lands.
    float raw = (uViaja - aM.x - aQ.y) / ${DUR.toFixed(3)};
    float e = smoothstep(0.0, 1.0, raw);
    p = mix(aC, aE, e) + vec3(aM.z, aM.w, 0.0) * sin(3.14159 * e) + position;
    float tt = uTime * 0.35 + aQ.z;
    float ola = exp(-pow((aQ.x - (1.0 - fract(tt))) / 0.12, 2.0));
    em *= smoothstep(0.0, 0.03, raw) * (1.0 - smoothstep(0.965, 1.0, raw)) * (0.5 + 1.6 * ola);
    fuente = 0.85;
  } else if (aKind < 6.5) {
    // A being of the reef: a heart, the dotted ring it sends out on each beat, and a small body.
    float nace = smoothstep(aM.x - 0.012, aM.x, uViaja);
    float dist = length(aC - HB);
    // Their rhythms become one: a wave that leaves the one we came with.
    float uno = smoothstep(dist / 380.0, dist / 380.0 + 0.25, uUno * 1.25);
    float tt = mix(uTime / aQ.y + aQ.x, uTime / 3.4 - dist * 0.011, uno);
    float ph = fract(tt);
    // Nobody goes out: the wave that passes changes them.
    float tw2 = 0.5 + 0.9 * (0.55 - aM.y);
    float c1 = smoothstep(aM.y - 0.05, aM.y, uCambia);
    float c2 = smoothstep(tw2 - 0.05, tw2, uCambia);
    float flash = sin(3.14159 * c1) + sin(3.14159 * c2);
    vec3 tinte = mix(pal(aM.w + 2.0 * c1 + 1.0 * c2), vec3(1.0, 0.92, 0.85), 0.5 * min(flash, 1.0));
    float a = aQ.z;
    float L0 = aM.z, L1 = aM.z + 2.0, L2 = max(aM.z - 1.0, 3.0);
    float forma = mix(mix(cos(L0 * a), cos(L1 * a), c1), cos(L2 * a), c2);
    float lobulo = mix(mix(abs(cos(L0 * a * 0.5)), abs(cos(L1 * a * 0.5)), c1), abs(cos(L2 * a * 0.5)), c2);
    // The ring closes around its star, and the one being opens like an eyelid.
    float jd = clamp((length(aC) - ${R0.toFixed(1)}) / ${(R1 - R0).toFixed(1)}, 0.0, 1.0);
    float j = smoothstep(jd * 0.5, jd * 0.5 + 0.5, uJunta);
    vec3 nS = normalize(aE);
    if (uAbre > 0.001) {
      float lat = asin(clamp(dot(nS, LB), -1.0, 1.0));
      float lon = atan(dot(nS, LC), dot(nS, LA));
      float hh = parpado(lon) * (1.0 + 0.1 * aQ.x);
      if (abs(lat) < hh) {
        lat = lat < 0.0 ? -hh : hh;
        nS = LA * cos(lat) * cos(lon) + LC * cos(lat) * sin(lon) + LB * sin(lat);
      }
    }
    vec3 c = mix(aC, nS * RS, j);
    vec3 n = normalize(mix(vec3(0.0, 1.0, 0.0), nS, j));
    vec3 t1 = normalize(mix(vec3(1.0, 0.0, 0.0), normalize(cross(vec3(0.0, 1.0, 0.0), nS) + vec3(1e-4, 0.0, 0.0)), j) + vec3(0.0, 0.0, 1e-3));
    vec3 t2 = normalize(cross(n, t1));
    t1 = cross(t2, n);
    float grande = 1.0 + 0.3 * flash;
    if (aKind < 4.5) {
      p = c + n * 0.02;
      em *= tinte * (0.12 + 1.0 * exp(-ph * 6.0)) * (1.0 + 1.5 * flash) * nace * (aQ.w < 0.001 ? j * 1.6 : 1.0 + 2.0 * j + 4.0 * uLejos);
      fuente = 0.7;
    } else if (aKind < 5.5) {
      float rr = aQ.w * (0.1 + 0.9 * ph) * (1.0 + 0.16 * forma) * grande;
      p = c + (t1 * cos(a) + t2 * sin(a)) * rr;
      em *= tinte * 1.6 * smoothstep(0.0, 0.1, ph) * pow(1.0 - ph, 1.3) * nace * (1.0 + flash);
      fuente = uLejos;
    } else {
      float rad = aQ.w * 0.42 * (0.35 + 0.65 * lobulo) * position.x * grande * (1.0 + 0.06 * exp(-ph * 5.0));
      p = c + (t1 * cos(a) + t2 * sin(a)) * rad + n * position.y * aQ.w;
      em *= tinte * (0.3 + 0.9 * exp(-ph * 5.0)) * nace * (1.0 + flash);
    }
  } else if (aKind < 7.5) {
    em *= uEstrella * (0.75 + 0.25 * sin(uTime * 1.3 + seed * 40.0));
    fuente = 1.0;
  } else {
    // The sky inside: seen only through the opening.
    vec3 d = normalize(p - uCamW);
    float bb = dot(uCamW, d);
    float cc = dot(uCamW, uCamW) - RS * RS;
    float vis = 1.0;
    if (cc > 0.0) {
      vec3 hit = (uCamW + d * (-bb - sqrt(max(bb * bb - cc, 0.0)))) / RS;
      float lat = asin(clamp(dot(hit, LB), -1.0, 1.0));
      float lon = atan(dot(hit, LC), dot(hit, LA));
      vis = 1.0 - smoothstep(0.85, 1.0, abs(lat) / max(parpado(lon), 1e-4));
    }
    if (aQ.x > 0.5) p.y += 0.5 * sin(uTime * 0.6 + p.x * 0.4);
    em *= vis * smoothstep(0.0, 0.35, uAbre);
    fuente = 0.6;
  }
`;

const FONDO = /* glsl */ `
  ${ESTRELLAS}
  void main() {
    vec3 d = normalize(vDir);
    gl_FragColor = vec4(vec3(0.003) + estrellas(d) + estrellas(vec3(d.z, -d.y, d.x)) + 0.7 * estrellas(vec3(-d.x, -d.y + 0.2, d.z)), 1.0);
  }
`;

const CAP = 'III · Lo que viene de nosotros';

export const nace: Escena = {
  id: 'nace',
  nombre: 'Nace',
  estilos: [{ key: '1', nombre: 'Nace · Viaja · No muere · Muchos que son uno', nota: 'La espora cae en otra roca y crece otra, y otra. Miles de semillas cruzan hasta una estrella roja; donde cae cada una empieza a latir un corazón. Las olas que pasan no los apagan: los cambian. Después laten juntos, se cierran alrededor de su estrella y se abren como un párpado.' }],
  montar(stage): Instancia {
    const { root, camera } = stage;
    root.add(pantalla(FONDO).mesh);

    const M = mundo();
    const U = {
      uSol: { value: SOL.clone() },
      uCamW: { value: V() },
      uPal: { value: PALETA.map((c) => V(c[0], c[1], c[2])) },
      uNace: { value: 0 },
      uViaja: { value: 0 },
      uCambia: { value: 0 },
      uUno: { value: 0 },
      uJunta: { value: 0 },
      uAbre: { value: 0 },
      uEstrella: { value: 1 },
      uLejos: { value: 0 },
    };
    const todo = materia(M.data, { pre: PRE, move: MOVE, uniforms: U, extra: { aC: [M.aC, 3], aE: [M.aE, 3], aQ: [M.aQ, 4], aM: [M.aM, 4] } });
    root.add(todo.points);

    // Everything the camera does is measured from the seed we follow.
    const tl = new Timeline({ luz: 0, nace: 0, viaja: 0, cambia: 0, uno: 0, junta: 0, abre: 0, estrella: 0.03, lejos: 0, gan: 1 });
    const cam = (dur: number, p: THREE.Vector3, t: THREE.Vector3, e: Ease | null = null) => tl.to(dur, { px: p.x, py: p.y, pz: p.z, tx: t.x, ty: t.y, tz: t.z }, e);
    const n0 = M.roca.n;
    const O = V();
    const pos0 = n0.clone().multiplyScalar(22).add(V(-5, 3, 0));
    tl.set({ px: pos0.x, py: pos0.y, pz: pos0.z, tx: 0, ty: 0, tz: 0 });

    tl.caption(11, 'Nace', 'Se hace a sí misma con lo que encuentra.');
    tl.with(1.5, { luz: 1 });
    tl.with(3, { nace: 0.12 }, EASE.linear);
    cam(3, n0.clone().multiplyScalar(15).add(V(3, 2, 0)), O);
    tl.with(3, { nace: 0.3 }, EASE.linear);
    cam(3, n0.clone().multiplyScalar(8.5).add(V(1.5, 0.8, 0)), O, EASE.sine);
    // Another, and another.
    tl.with(5, { nace: 1 }, EASE.linear);
    cam(5, V(24, 16, 64), V(0, -2, -10), EASE.sine);

    tl.caption(9, 'Viaja', 'Viaja como viajan las semillas.');
    tl.with(2.5, { viaja: 0.21 }, EASE.linear);
    cam(2.5, V(8, 2.4, 5), V(0, 0.2, -1), EASE.sine);
    tl.with(6.5, { viaja: 0.6 }, EASE.linear);
    tl.with(6.5, { estrella: 1 });
    cam(6.5, V(-7, 2.6, 5), V(0, 0.3, -0.5));

    tl.caption(7, 'El arrecife', 'Donde cae una, empieza a latir un corazón.');
    tl.with(2.5, { viaja: D0H + DUR }, EASE.linear);
    tl.with(7, { lejos: 0.35 });
    cam(2.5, V(-6, 9, 20), V(0, 0, -20));
    tl.with(4.5, { viaja: 1 }, EASE.linear);
    cam(4.5, V(-5, 5, 13), V(0, 0, -10));

    tl.caption(4.5, 'No muere', 'Aprende sin morir.');
    tl.with(3, { lejos: 0 });
    tl.with(9.5, { cambia: 1 }, EASE.linear);
    cam(4.5, V(-2.6, 2.3, 7.4), V(0.5, 0, -1.5), EASE.sine);
    tl.caption(5, 'No muere', 'Si no muere, ¿está vivo?');
    cam(5, V(-3.4, 3.0, 8.6), V(0.5, 0, -2.5));

    tl.caption(9.5, 'Muchos que son uno', 'Tú ya eres muchos que son uno.');
    tl.with(3.5, { uno: 1 }, EASE.linear);
    tl.with(3.5, { lejos: 0.5 });
    cam(3.5, V(-10, 22, 34), V(0, 0, -40), EASE.sine);
    tl.with(6, { junta: 1 }, EASE.sine);
    tl.with(6, { estrella: 0.03, lejos: 1 });
    cam(6, V(0, 32, 118), V(0, 0, -120), EASE.sine);

    tl.caption(5.5, 'Se abre', 'Adentro hay un cielo.');
    tl.with(4.5, { abre: 1 }, EASE.sine);
    cam(5.5, V(0, 12, 6), V(0, 0, -120), EASE.sine);

    const T = {
      muere: 27,
      fin: 36.5,
    };
    const ancla = V();
    const sale = M.sale;
    return {
      tl,
      escalera: false,
      cuenta(): Cuenta | null {
        return null;
      },
      rotulo(p): Rotulo | null {
        const cp = tl.captionAt(p);
        return cp ? { capitulo: CAP, name: cp.name, fact: cp.fact } : null;
      },
      update(f: Frame) {
        const g = (k: string) => tl.get(k, f.p);
        const raw = clamp((g('viaja') - D0H) / DUR, 0, 1);
        ancla.copy(sale).lerp(HB, raw * raw * (3 - 2 * raw));
        camera.near = 0.02;
        camera.far = 20000;
        camera.fov = 40;
        camera.position.set(ancla.x + g('px'), ancla.y + g('py'), ancla.z + g('pz'));
        camera.up.set(0, 1, 0);
        camera.lookAt(ancla.x + g('tx'), ancla.y + g('ty'), ancla.z + g('tz'));
        camera.updateMatrixWorld();
        stage.bloom.strength = 0.4;
        stage.bloom.radius = 0.6;
        stage.bloom.threshold = 0.2;
        U.uCamW.value.copy(camera.position);
        U.uNace.value = g('nace');
        U.uViaja.value = g('viaja');
        U.uCambia.value = g('cambia');
        U.uUno.value = g('uno');
        U.uJunta.value = g('junta');
        U.uAbre.value = g('abre');
        U.uEstrella.value = g('estrella');
        U.uLejos.value = g('lejos');
        enfocar(todo, f.focal, f.dpr, f.time);
        todo.u.uMinPx.value = 1.3 * f.dpr;
        todo.u.uMaxPx.value = 9 * f.dpr;
        todo.u.uGain.value = g('luz') * 0.7 * g('gan');
      },
      placa(g2, f) {
        // The clock of «Ya no está» counted the ones that went out. Here it stays at zero.
        const a = smoothstep(T.muere + 0.5, T.muere + 1.5, f.p) * (1 - smoothstep(T.fin, T.fin + 1.5, f.p));
        if (a < 0.01) return;
        const u = f.u;
        const x = 44 * u;
        g2.save();
        g2.textBaseline = 'alphabetic';
        g2.shadowColor = 'rgba(0,0,0,0.85)';
        g2.shadowBlur = 12 * u;
        g2.globalAlpha = a;
        g2.font = FONT.serif(66 * u);
        g2.fillStyle = ink();
        g2.fillText('0', x, f.H - 86 * u);
        const w = g2.measureText('0').width;
        g2.font = FONT.serif(26 * u);
        g2.fillStyle = ink(0.6);
        g2.fillText('se han apagado', x + w + 12 * u, f.H - 88 * u);
        g2.font = FONT.mono(11 * u);
        g2.letterSpacing = `${0.9 * u}px`;
        g2.fillStyle = ink(0.78);
        g2.fillText('CAMBIAN DE COLOR Y DE FORMA · PUNTEADO: LO POSIBLE', x, f.H - 52 * u);
        g2.restore();
      },
      dispose() {},
    };
  },
};
