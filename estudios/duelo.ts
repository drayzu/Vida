import * as THREE from 'three';
import { Timeline, EASE } from './timeline';
import { pantalla } from '../src/engine/pantalla';
import { enfocar, materia, materiaBuilder } from '../src/engine/materia';
import { clamp, lerp, smoothstep } from '../src/engine/math';
import type { Cuenta, Rotulo } from './placa';
import { SERIE, TIBIO, TU, V } from './comun';
import type { Escena, Frame, Instancia } from './tipos';
import { ESTRELLAS, col, mz, type RGB } from './mundos';

/**
 * Study · «Lo supo» with elephants (GUION-formas, moments 14 and 15). 15 Nov 2026. Phase 0.
 *
 * The first study of this moment (`supo.ts`) was abstract and Diego found it boring: nothing
 * happened. This one is literal. A herd of elephants of light walks at night and comes upon the
 * bones of one of their own. The one who leads stops and touches them with her trunk. The calf, who
 * had fallen behind, runs up and touches them too. The others leave; she is the last to go.
 *
 * Years later the herd comes back the other way. There are two sets of bones now. The one who
 * leads, and stops, and touches them, is the one who was the calf.
 */

const BLANCO: RGB = [TIBIO.r, TIBIO.g, TIBIO.b];
const vivo = (c: THREE.Color, k = 1.6): RGB => {
  const l = (c.r + c.g + c.b) / 3;
  return [Math.max(0, l + (c.r - l) * k), Math.max(0, l + (c.g - l) * k), Math.max(0, l + (c.b - l) * k)];
};
const ROSA = vivo(SERIE.abismo);
const AZUL = vivo(SERIE.tiempo);
const VIOLETA = vivo(SERIE.infinito);
const VERDE = vivo(SERIE.destino);
const AMBAR = vivo(SERIE.mente);
const NARANJA = mz(vivo(SERIE.espacio), AMBAR, 0.4);
const CORAZON: RGB = [TU.r, TU.g, TU.b];

/** The herd. `i` is its index in the shader's arrays. */
const MADRE = 0;
const UNA = 1;
const OTRA = 2;
const JOVEN = 3;
const CRIA = 4;
const NUEVA = 5;
export const COLORES: RGB[] = [ROSA, AZUL, VIOLETA, VERDE, AMBAR, NARANJA];
const N = COLORES.length;
/** How far it goes in one full cycle of its four legs, at scale 1. */
const ZANCADA = 2.18;
/** Where the second set of bones lies: mirrored, with the skull at this end. */
export const X2 = 8.8;

export function mundo() {
  const b = materiaBuilder(1187);
  const r = b.r;
  const aL: number[] = [];
  const aN: number[] = [];
  const aQ: number[] = [];
  const aId: number[] = [];
  const O = V();
  const put = (kind: number, p: THREE.Vector3, color: RGB, size: number, luz: number, Q: number[] = [0, 0, 0, 0], n: THREE.Vector3 = O, id = 0) => {
    b.push(p.x, p.y, p.z, col(color), size, luz, { kind });
    aL.push(p.x, p.y, p.z);
    aN.push(n.x, n.y, n.z);
    aQ.push(Q[0], Q[1], Q[2], Q[3]);
    aId.push(id);
  };

  // ── One elephant, in its own frame: x forward, y up, z to its side. Drawn, not filled. ──
  const elefante = (id: number) => {
    const tono = mz(COLORES[id], BLANCO, 0.18);
    const S = 0.022;
    /** A skin of rings along x over an ellipsoid; `forma` can push each point (a higher shoulder, a flatter belly). */
    const elipsoide = (kind: number, c: THREE.Vector3, rad: THREE.Vector3, anillos: number, densidad: number, relleno: number, forma: (p: THREE.Vector3, s: number, sa: number) => void) => {
      const punto = (s: number, a: number) => {
        const f = Math.sqrt(Math.max(0, 1 - s * s));
        const p = V(c.x + rad.x * s, c.y + rad.y * f * Math.sin(a), rad.z * f * Math.cos(a));
        const n = V(s / rad.x, (f * Math.sin(a)) / rad.y, (f * Math.cos(a)) / rad.z).normalize();
        forma(p, s, Math.sin(a));
        return { p, n };
      };
      for (let k = 0; k < anillos; k++) {
        const s = lerp(-0.97, 0.97, k / (anillos - 1));
        const m = Math.round(densidad * (0.35 + 0.65 * Math.sqrt(1 - s * s)));
        for (let i = 0; i < m; i++) {
          const { p, n } = punto(s, ((i + r()) / m) * Math.PI * 2);
          put(kind, p, tono, S, 0.45, [0, 0, 0, 0], n, id);
        }
      }
      // The line of the back and of the belly.
      for (const a of [Math.PI / 2, -Math.PI / 2]) {
        for (let i = 0; i < 420; i++) {
          const { p } = punto(Math.sin(lerp(-1.5, 1.5, (i + r()) / 420)), a);
          put(kind, p, tono, S * 1.15, a > 0 ? 1.5 : 1.1, [0, 0, 0, 0], V(0, Math.sign(a), 0), id);
        }
      }
      for (let i = 0; i < relleno; i++) {
        const { p, n } = punto(Math.sin((r() - 0.5) * Math.PI), r() * Math.PI * 2);
        put(kind, p, tono, S * 0.9, 0.22, [0, 0, 0, 0], n, id);
      }
    };
    // The body: shoulders a little higher than the hips, the belly flatter than the back.
    elipsoide(1, V(0, 2.2, 0), V(1.8, 1.0, 0.86), 30, 110, 2200, (p, s, sa) => {
      if (sa < 0) p.y = 2.2 + (p.y - 2.2) * 0.82;
      // A high shoulder, a dip behind it, and a rump that falls away.
      else p.y += 0.2 * Math.exp(-(((s - 0.5) / 0.3) ** 2)) + 0.1 * Math.exp(-(((s + 0.45) / 0.3) ** 2)) - 0.25 * smoothstep(-0.55, -1, s);
    });
    // The head: a high forehead.
    elipsoide(3, V(2.0, 2.62, 0), V(0.74, 0.84, 0.6), 13, 64, 700, (p, s) => {
      p.y += 0.1 * (1 - s * s);
    });
    // The trunk: rings down a line that hangs and curls a little forward at the tip.
    const trompa = (u: number) => V(2.55 + 0.1 * u + 0.26 * u * u, 2.15 - 1.72 * u, 0);
    for (let k = 0; k < 28; k++) {
      const u = (k + 0.5) / 28;
      const c = trompa(u);
      const rad = lerp(0.27, 0.1, u);
      for (let i = 0; i < 22; i++) {
        const a = ((i + r()) / 22) * Math.PI * 2;
        put(5, V(c.x + Math.cos(a) * rad, c.y, Math.sin(a) * rad), tono, S, 0.5, [u, 0, 0, 0], V(Math.cos(a), 0, Math.sin(a)), id);
      }
    }
    for (const a of [0, Math.PI]) {
      for (let i = 0; i < 260; i++) {
        const u = (i + r()) / 260;
        const c = trompa(u);
        const rad = lerp(0.27, 0.1, u);
        put(5, V(c.x + Math.cos(a) * rad, c.y, 0), tono, S * 1.15, 1.4, [u, 0, 0, 0], V(Math.cos(a), 0, 0), id);
      }
    }
    for (const lado of [-1, 1]) {
      // A tusk and an eye.
      for (let i = 0; i < 90; i++) {
        const v = i / 89;
        put(6, V(2.45 + 0.95 * v, 1.95 - 0.55 * v + 0.5 * v * v, lado * (0.3 + 0.1 * v)), BLANCO, S * 1.1, 1.1 - 0.3 * v, [0, 0, 0, 0], O, id);
      }
      put(6, V(2.52, 2.84, lado * 0.5), BLANCO, 0.06, 1.8, [0, 0, 0, 0], O, id);
      // An ear: its edge, and a few veins from the hinge.
      const ec = V(1.42, 2.5, lado * 0.74);
      const borde = (a: number) => V(ec.x + 0.6 * Math.cos(a) * (1 - 0.3 * Math.sin(a)), ec.y + 0.92 * Math.sin(a) - 0.15 * Math.cos(a), ec.z);
      const flap = (p: THREE.Vector3) => [clamp((1.95 - p.x) / 1.1, 0, 1), lado, 1, 0];
      for (let i = 0; i < 260; i++) {
        const p = borde((i / 260) * Math.PI * 2);
        put(4, p, tono, S, 0.5, flap(p), O, id);
      }
      for (let k = 0; k < 7; k++) {
        const fin = borde(Math.PI * (0.55 + 0.15 * k));
        const ini = V(1.95, 2.75, lado * 0.62);
        for (let i = 0; i < 26; i++) {
          const p = ini.clone().lerp(fin, i / 26);
          put(4, p, tono, S * 0.9, 0.2, flap(p), O, id);
        }
      }
      // Two legs: columns, with a ring at the foot.
      for (const [hx, off, r0, r1] of [
        [1.08, lado > 0 ? 0.25 : 0.75, 0.33, 0.3],
        [-1.15, lado > 0 ? 0.0 : 0.5, 0.36, 0.28],
      ]) {
        const Q = [hx, 1.6, off, 0];
        for (let k = 0; k < 12; k++) {
          const y = lerp(1.85, 0.02, k / 11);
          const rad = lerp(r0, r1, k / 11);
          const m = k === 11 ? 60 : 30;
          for (let i = 0; i < m; i++) {
            const a = ((i + r()) / m) * Math.PI * 2;
            put(2, V(hx + Math.cos(a) * rad, y, lado * 0.48 + Math.sin(a) * rad), tono, S, k === 11 ? 1.1 : 0.4, Q, V(Math.cos(a), 0, Math.sin(a)), id);
          }
        }
        for (const a of [0, Math.PI]) {
          for (let i = 0; i < 200; i++) {
            const t = (i + r()) / 200;
            put(2, V(hx + Math.cos(a) * lerp(r0, r1, t), lerp(1.85, 0.02, t), lado * 0.48), tono, S * 1.15, lado > 0 ? 1.4 : 0.9, Q, V(Math.cos(a), 0, 0), id);
          }
        }
      }
    }
    // The tail, with a tuft.
    for (let i = 0; i < 90; i++) {
      const u = i / 89;
      put(7, V(-1.74 - 0.3 * u, 2.5 - 1.4 * u, 0), tono, S * (u > 0.85 ? 1.6 : 1), 0.8, [u, 0, 0, 0], O, id);
    }
    // Its heart.
    for (let i = 0; i < 150; i++) {
      const [x, y, z] = b.onSphere();
      const k = 0.17 * Math.cbrt(r());
      put(8, V(0.9 + x * k, 2.0 + y * k, z * k), CORAZON, 0.028, 0.5, [0, 0, 0, 0], O, id);
    }
    put(8, V(0.9, 2.0, 0), CORAZON, 0.13, 1.1, [0, 0, 0, 0], O, id);
  };
  for (let id = 0; id < N; id++) elefante(id);

  // ── What is left of one: a skull with its tusks, a spine, ribs, two long bones. Pale. ──
  const huesos = (kind: number, x: (lx: number) => number) => {
    const S = 0.03;
    const hueso = (p: THREE.Vector3, luz = 0.5) => put(kind, V(x(p.x), p.y, p.z + 1.0), BLANCO, S, luz);
    for (let i = 0; i < 520; i++) {
      const a = (i / 520) * Math.PI * 2;
      hueso(V(0.5 + 0.62 * Math.cos(a), 0.56 + 0.5 * Math.sin(a) + 0.08 * Math.cos(2 * a), 0.36 * Math.sin(a * 3) * 0.2), 0.6);
    }
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * Math.PI * 2;
      hueso(V(0.42 + 0.15 * Math.cos(a), 0.62 + 0.13 * Math.sin(a), 0.3), 0.45);
    }
    for (const lado of [-1, 1]) {
      for (let i = 0; i < 150; i++) {
        const v = i / 149;
        hueso(V(0.1 - 1.15 * v, 0.34 - 0.2 * v + 0.62 * v * v, lado * (0.26 + 0.12 * v)), 0.75 - 0.25 * v);
      }
      for (let i = 0; i < 120; i++) {
        const v = i / 119;
        hueso(V(lerp(lado > 0 ? 1.2 : 3.0, lado > 0 ? 2.3 : 4.2, v), 0.08 + 0.05 * Math.sin(v * Math.PI), lado * 1.0 + 0.3 * v), 0.4);
      }
    }
    for (let i = 0; i < 300; i++) {
      const v = i / 299;
      hueso(V(1.15 + 2.6 * v, 0.42 - 0.2 * v + 0.05 * Math.sin(v * 40), 0), 0.55);
    }
    for (let k = 0; k < 9; k++) {
      const x0 = 1.5 + 0.23 * k;
      const alto = 0.95 - 0.045 * k - 0.02 * (k - 3) * (k - 3) * 0.3;
      for (let i = 0; i < 110; i++) {
        const t = i / 109;
        const a = t * Math.PI;
        hueso(V(x0 + 0.34 * Math.sin(a), 0.05 + alto * Math.sin(a), 0.62 * Math.cos(a)), 0.5);
      }
    }
  };
  huesos(9, (lx) => lx);
  huesos(10, (lx) => X2 - lx);
  // The ring that opens from the bones when they are touched.
  for (const [kind, cx, color] of [
    [14, 0.4, ROSA],
    [15, X2 - 0.4, AMBAR],
  ] as [number, number, RGB][]) {
    for (let i = 0; i < 900; i++) {
      const a = (i / 900) * Math.PI * 2;
      put(kind, V(cx, 0.04, 1.0), color, 0.045, 0.9, [Math.cos(a), Math.sin(a), 0, 0]);
    }
  }

  // ── The ground has no colour of its own: lines that follow it. What grows on it does. ──
  for (let z = -90; z < 26; z += 1.5) {
    for (let i = 0; i < 230; i++) {
      const x = -90 + r() * 180;
      put(11, V(x, 0.05 * Math.sin(x * 0.4 + z), z + 0.5 * Math.sin(x * 0.13 + z * 0.4)), BLANCO, 0.07, 0.1);
    }
  }
  for (let i = 0; i < 3200; i++) {
    const x = -70 + r() * 140;
    const z = -55 + r() * 58;
    const alto = 0.2 + 0.55 * r() * r();
    const fase = r();
    for (let k = 0; k < 5; k++) put(12, V(x, (alto * (k + 1)) / 5, z), VERDE, 0.045, 0.22 + 0.06 * k, [fase, (k + 1) / 5, 0, 0]);
  }
  for (const [x, z, alto] of [
    [-26, -30, 6.5],
    [17, -44, 7.5],
    [44, -24, 6],
    [-55, -60, 8],
    [70, -70, 8],
  ]) {
    for (let i = 0; i < 90; i++) put(13, V(x + 0.5 * Math.sin(i * 0.07), (alto * i) / 90, z), VERDE, 0.1, 0.22);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      for (let i = 0; i < 40; i++) put(13, V(x + Math.cos(a) * 0.09 * i, alto * (0.6 + 0.01 * i), z + Math.sin(a) * 0.09 * i), VERDE, 0.09, 0.2);
    }
    for (let i = 0; i < 900; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r());
      put(13, V(x + Math.cos(a) * d * alto * 0.85, alto + 0.9 * (1 - d * d) * (0.4 + 0.6 * r()), z + Math.sin(a) * d * alto * 0.85), VERDE, 0.1, 0.16 + 0.3 * d * d);
    }
  }

  const f = (a: number[]) => new Float32Array(a);
  return { data: b.data(), aL: f(aL), aN: f(aN), aQ: f(aQ), aId: f(aId) };
}

export const PRE = /* glsl */ `
  attribute vec3 aL, aN;
  attribute vec4 aQ;
  attribute float aId;
  uniform vec3 uCam;
  uniform vec4 uPos[${N}], uPose[${N}];
  uniform vec2 uToca, uAnillo;
  uniform float uSegunda, uVivo;
  vec2 gira(vec2 v, vec2 c, float a) {
    vec2 d = v - c;
    return c + vec2(d.x * cos(a) - d.y * sin(a), d.x * sin(a) + d.y * cos(a));
  }
`;

export const MOVE = /* glsl */ `
  vec3 tibio = vec3(1.0, 0.89, 0.8);
  if (aKind < 8.5) {
    // An elephant. \`P\`: x, z, which way it faces, its size. \`Z\`: where it is in its step, how much it walks, head down, trunk out.
    int id = int(aId + 0.5);
    vec4 P = uPos[id];
    vec4 Z = uPose[id];
    float t = uTime + aId * 1.7;
    vec3 q = aL;
    if (aKind > 1.5 && aKind < 2.5) {
      // A leg swings from the hip; the foot lifts while it goes forward.
      float ph = 6.2832 * (Z.x + aQ.z);
      q.xy = gira(q.xy, aQ.xy, Z.y * 0.36 * sin(ph));
      q.y += Z.y * 0.16 * max(0.0, cos(ph)) * (1.0 - clamp(q.y / aQ.y, 0.0, 1.0));
    } else if (aKind > 2.5 && aKind < 6.5) {
      if (aKind > 4.5 && aKind < 5.5) {
        // The trunk reaches forward from its root, and is never quite still.
        float u = aQ.x;
        q.xy = gira(q.xy, vec2(2.55, 2.15), u * u * 1.1 * Z.w + u * 0.1 * sin(t * 0.8));
        q.z += u * u * 0.22 * sin(t * 0.6);
      } else if (aKind > 3.5 && aKind < 4.5) {
        // The ears fan.
        float ab = 0.5 + 0.5 * sin(t * 0.9);
        q.z += aQ.y * aQ.x * (0.1 + 0.45 * ab * ab);
      }
      // The head goes down from the neck.
      q.xy = gira(q.xy, vec2(1.35, 2.45), -0.42 * Z.z + 0.03 * sin(t * 0.5));
    } else if (aKind > 6.5 && aKind < 7.5) {
      q.z += aQ.x * 0.35 * sin(t * 1.3);
    }
    // The whole body rises and falls twice in each step.
    q.y += Z.y * 0.05 * sin(12.566 * Z.x) * step(0.3, q.y);
    q *= P.w;
    float cs = cos(P.z), sn = sin(P.z);
    p = vec3(P.x + q.x * cs + q.z * sn, q.y, P.y - q.x * sn + q.z * cs);
    // One beat that runs out from the heart: an elephant's, slow.
    float pul = uVivo * exp(-fract(t / 2.0 - length(aL - vec3(0.9, 2.0, 0.0)) * 0.1) * 3.5);
    if (aKind < 3.5 || (aKind > 4.5 && aKind < 5.5)) {
      vec3 n = normalize(vec3(aN.x * cs + aN.z * sn, aN.y, -aN.x * sn + aN.z * cs));
      float f = 1.0 - abs(dot(n, normalize(uCam - p)));
      em *= (0.1 + 1.5 * f * f) * (0.55 + 0.8 * pul);
      // The head is quieter than the back, so it does not read as a ring.
      if (aKind > 2.5 && aKind < 3.5) em *= 0.55;
    } else if (aKind < 7.5) {
      em *= 0.65 + 0.5 * pul;
    } else {
      em *= uVivo * (0.5 + 1.8 * exp(-fract(t / 2.0) * 4.0));
      fuente = 0.9;
    }
    em *= step(0.01, P.w);
  } else if (aKind < 10.5) {
    // The bones. While they are touched, the light of the one who touches them reaches them.
    bool segunda = aKind > 9.5;
    float toca = segunda ? uToca.y : uToca.x;
    vec3 luz = segunda ? vec3(1.0, 0.72, 0.3) : vec3(1.0, 0.35, 0.5);
    float cerca = exp(-abs(p.x - (segunda ? ${(X2 - 0.4).toFixed(2)} : 0.4)) * 0.45);
    em = em * 0.55 + luz * 0.5 * toca * cerca * (0.5 + 0.5 * sin(uTime * 3.14));
    if (segunda) em *= uSegunda;
  } else if (aKind < 11.5) {
    em *= 1.0;
  } else if (aKind < 12.5) {
    p.x += 0.12 * aQ.y * aQ.y * sin(uTime * 0.7 + aQ.x * 6.28);
  } else if (aKind < 13.5) {
    em *= 1.0;
  } else {
    // The ring opens once.
    float k = aKind > 14.5 ? uAnillo.y : uAnillo.x;
    p.xz += aQ.xy * (0.3 + 9.0 * k);
    em *= sin(3.1416 * k) * (1.0 - 0.6 * k);
  }
`;

export const FONDO = /* glsl */ `
  ${ESTRELLAS}
  void main() {
    vec3 d = normalize(vDir);
    gl_FragColor = vec4(vec3(0.003) + estrellas(d), 1.0);
  }
`;

/** Piecewise: `k` is a list of [when, value]; eased between them. */
const clave = (k: number[][], t: number) => {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (t <= k[i][0]) return lerp(k[i - 1][1], k[i][1], smoothstep(k[i - 1][0], k[i][0], t));
  return k[k.length - 1][1];
};
const entre = (a: number, b: number, c: number, d: number, t: number) => smoothstep(a, b, t) * (1 - smoothstep(c, d, t));

type Paso = { x: number[][]; z: number; escala: number; cabeza?: (t: number) => number };
/** The first time: they walk towards +x and find the bones at x = 0. */
const PRIMERA: (Paso | null)[] = [
  { x: [[0, -34], [0.38, -3.0], [0.78, -3.0], [1, 22]], z: -0.2, escala: 1, cabeza: (t) => entre(0.4, 0.47, 0.72, 0.78, t) },
  { x: [[0, -41], [0.42, -9.5], [0.62, -9.5], [1, 26]], z: -2.6, escala: 0.93 },
  { x: [[0, -47], [0.45, -14.5], [0.66, -14.5], [1, 24]], z: -4.6, escala: 0.97 },
  { x: [[0, -52], [0.47, -19], [0.52, -19], [0.58, -6.6], [0.7, -6.6], [1, 25]], z: -1.4, escala: 0.7, cabeza: (t) => 0.5 * entre(0.58, 0.62, 0.67, 0.7, t) },
  // The calf stops to look at something, falls behind, and runs.
  { x: [[0, -39], [0.16, -27], [0.24, -27], [0.36, -9], [0.5, -2.7], [0.88, -2.7], [1, 16]], z: 1.3, escala: 0.45, cabeza: (t) => Math.max(entre(0.17, 0.19, 0.22, 0.24, t), 0.85 * entre(0.52, 0.58, 0.84, 0.88, t)) },
  null,
];
/** Years later: they come back towards -x. The calf is grown and leads. */
const DESPUES: (Paso | null)[] = [
  null,
  { x: [[0, 48], [0.55, 19.5]], z: -2.6, escala: 0.95 },
  null,
  { x: [[0, 54], [0.6, 25.5]], z: -1.4, escala: 0.92 },
  { x: [[0, 40], [0.45, X2 + 3.0]], z: -0.2, escala: 1, cabeza: (t) => smoothstep(0.5, 0.62, t) },
  { x: [[0, 46], [0.2, 34], [0.3, 34], [0.62, X2 + 2.7]], z: 1.3, escala: 0.42, cabeza: (t) => Math.max(entre(0.21, 0.23, 0.27, 0.3, t), 0.8 * smoothstep(0.7, 0.8, t)) },
];

export const duelo: Escena = {
  id: 'duelo',
  nombre: 'Lo supo · elefantes',
  estilos: [{ key: '1', nombre: 'Lo supo · Años después', nota: 'Una manada de elefantes de luz encuentra los huesos de uno de los suyos. La que guía los toca con la trompa y es la última en irse. Años después vuelven, y la que se detiene es la que era la cría.' }],
  montar(stage): Instancia {
    const { root, camera } = stage;
    const fondo = pantalla(FONDO, {});
    root.add(fondo.mesh);

    const M = mundo();
    const U = {
      uCam: { value: V() },
      uPos: { value: COLORES.map(() => new THREE.Vector4()) },
      uPose: { value: COLORES.map(() => new THREE.Vector4()) },
      uToca: { value: new THREE.Vector2() },
      uAnillo: { value: new THREE.Vector2() },
      uSegunda: { value: 0 },
      uVivo: { value: 1 },
    };
    const todo = materia(M.data, { pre: PRE, move: MOVE, uniforms: U, extra: { aL: [M.aL, 3], aN: [M.aN, 3], aQ: [M.aQ, 4], aId: [M.aId, 1] } });
    root.add(todo.points);

    const tl = new Timeline({ luz: 0, t1: 0, t3: 0, paso: 0, px: -22, py: 1.5, pz: 27, tx: -27, ty: 2.6, tz: 0 });
    tl.caption(10, 'Lo supo', 'Una vez, algo vivo supo que iba a morir.');
    tl.with(1.5, { luz: 1 });
    tl.with(26, { t1: 1 }, EASE.linear);
    tl.to(10, { px: 3.5, py: 1.5, pz: 16, tx: -3, ty: 2.1 }, EASE.sine);
    tl.caption(10, 'Se queda', 'Los elefantes tocan los huesos de otros elefantes y se quedan junto a ellos.');
    tl.to(10, { px: 4.2, py: 1.2, pz: 9.5, tx: -1.2, ty: 1.7 }, EASE.sine);
    tl.caption(6, 'Se van', '');
    tl.to(6, { px: -4, py: 1.4, pz: 13, tx: 5, ty: 2.0 }, EASE.sine);
    tl.caption(15, 'Años después', '');
    tl.to(1.2, { luz: 0 });
    tl.to(0.3, { paso: 1, px: 20, py: 1.5, pz: 22, tx: 15, ty: 2.4 });
    tl.with(1.5, { luz: 1 });
    tl.with(11, { t3: 1 }, EASE.linear);
    tl.to(6, { px: 10, py: 1.4, pz: 15, tx: 9.5, ty: 2.0 }, EASE.sine);
    tl.to(5, { px: 6.2, py: 1.2, pz: 9.5, tx: 9.6, ty: 1.7 }, EASE.sine);
    tl.wait(2.5);
    tl.caption(4, 'Hacia arriba', '');
    tl.to(4, { ty: 30, tz: -30 }, EASE.sine);

    return {
      tl,
      escalera: false,
      cuenta(): Cuenta | null {
        return null;
      },
      rotulo(p): Rotulo | null {
        const cp = tl.captionAt(p);
        return cp ? { capitulo: 'II · No es para nosotros', name: cp.name, fact: cp.fact } : null;
      },
      update(f: Frame) {
        const g = (k: string) => tl.get(k, f.p);
        const despues = g('paso') > 0.5;
        const t = despues ? g('t3') : g('t1');
        const pasos = despues ? DESPUES : PRIMERA;
        const giro = despues ? Math.PI : 0;
        for (let i = 0; i < N; i++) {
          const e = pasos[i];
          const P = U.uPos.value[i];
          const Z = U.uPose.value[i];
          if (!e) {
            P.set(0, 0, 0, 0);
            continue;
          }
          const x = clave(e.x, t);
          const v = Math.abs(clave(e.x, t + 0.004) - clave(e.x, t - 0.004)) / 0.008;
          const cabeza = e.cabeza ? e.cabeza(t) : 0;
          P.set(x, e.z, giro, e.escala);
          // Its step is tied to the ground it has covered, so its feet do not slide.
          Z.set(((despues ? -x : x) / (ZANCADA * e.escala)) % 1, clamp(v / 14, 0, 1), cabeza, 0.72 * cabeza + 0.12 * Math.sin(f.time * 0.5 + i));
        }
        U.uToca.value.set(despues ? 0 : PRIMERA[MADRE]!.cabeza!(t), despues ? DESPUES[CRIA]!.cabeza!(t) : 0);
        U.uAnillo.value.set(despues ? 0 : smoothstep(0.47, 0.6, t), despues ? smoothstep(0.62, 0.8, t) : 0);
        U.uSegunda.value = despues ? 1 : 0;

        camera.near = 0.05;
        camera.far = 3000;
        camera.fov = 40;
        camera.position.set(g('px'), g('py'), g('pz'));
        camera.up.set(0, 1, 0);
        camera.lookAt(g('tx'), g('ty'), g('tz'));
        camera.updateMatrixWorld();
        stage.bloom.strength = 0.35;
        stage.bloom.radius = 0.6;
        stage.bloom.threshold = 0.2;
        U.uCam.value.copy(camera.position);
        enfocar(todo, f.focal, f.dpr, f.time);
        todo.u.uMinPx.value = 1.3 * f.dpr;
        todo.u.uMaxPx.value = 9 * f.dpr;
        todo.u.uGain.value = g('luz') * 0.6;
        todo.u.uFog.value = 170;
        todo.u.uFogNear.value = 30;
      },
      placa() {},
      dispose() {},
    };
  },
};

// The herd, by name, for whoever reads the tables above.
export const MANADA = { MADRE, UNA, OTRA, JOVEN, CRIA, NUEVA };
