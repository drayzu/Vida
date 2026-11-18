import * as THREE from 'three';
import { Timeline, type Ease } from './timeline';
import { pantalla } from '../src/engine/pantalla';
import { enfocar, materia, materiaBuilder, type Nube } from '../src/engine/materia';
import { clamp, lerp, smoothstep } from '../src/engine/math';
import type { Cuenta, Rotulo } from './placa';
import { V } from './comun';
import type { Escena, Frame, Instancia } from './tipos';

/**
 * Study · «Los mundos con otras leyes» (BRIEF v2, golden shot 10; act V, Los jardines). Phase 0.
 *
 * Worlds that a life no longer biological could make, with any physics it likes: the licence for
 * the impossible and the peak of colour of the whole work. The rule of the flotadores study holds
 * even here: the black of the series stays, and all the colour is light.
 *
 * Three worlds, each with one law changed:
 *  1 · El agua sube: water falls upwards, from a lake in a canyon to a sea that is the sky.
 *  2 · Tres soles: three suns of three colours; every thing has three shadows and none is black.
 *  3 · El mar de luz: an ocean whose waves are light; every swell brings its own colour.
 */

export type RGB = [number, number, number];
export const lin = (hex: string): RGB => {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
};
export const col = (c: RGB, k = 1) => new THREE.Color(c[0] * k, c[1] * k, c[2] * k);
export const mz = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export const h2 = (x: number, y: number) => {
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
export function fbm(x: number, y: number) {
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

/**
 * Sows `n` points around the line the camera stays near (x = 0, z from z0 to z1), denser close to
 * it, so the density is even on screen. `fn` gets each (x, z) and its distance to the line.
 */
export function sembrar(r: () => number, n: number, z0: number, z1: number, dmax: number, fn: (x: number, z: number, dm: number) => void) {
  for (let i = 0; i < n; i++) {
    const d = 1.2 * Math.pow(dmax / 1.2, r());
    const a = r() * Math.PI * 2;
    const x = Math.cos(a) * d;
    const z = lerp(z0, z1, r()) + Math.sin(a) * d;
    const dm = Math.hypot(x, z - clamp(z, z0, z1));
    if (r() > Math.min(1, (dm + 2) / (d + 2))) continue;
    fn(x, z, dm);
  }
}

export const ESTRELLAS = /* glsl */ `
  float h21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  vec3 estrellas(vec3 d) {
    vec2 sc = vec2(atan(d.x, d.z), asin(clamp(d.y, -1.0, 1.0))) * 220.0;
    float st = h21(floor(sc));
    vec2 f = fract(sc) - 0.5;
    return st > 0.984 ? vec3(0.8, 0.84, 1.0) * (st - 0.984) * 40.0 * exp(-dot(f, f) * 30.0) * smoothstep(0.03, 0.3, d.y) : vec3(0.0);
  }
`;

export interface Mundo {
  tl: Timeline;
  nubes: Nube[];
  /** Per frame, after the camera is placed. */
  vivir(f: Frame, g: (k: string) => number): void;
}

// ---------------------------------------------------------------- 1 · the water rises

const TECHO = 72;
const orillaDe = (z: number) => 16 + 6 * Math.sin(z * 0.03) + 4 * Math.sin(z * 0.011 + 1);

function aguaSube(root: THREE.Group, tl: Timeline, cam: Cam): Mundo {
  const AGUA = lin('#35d6ff');
  const HONDO = lin('#2a5cff');
  const ROSA = lin('#ff8fd0');
  const ROCA = lin('#7a6a9a');

  const fondo = pantalla(/* glsl */ `
    ${ESTRELLAS}
    void main() {
      vec3 d = normalize(vDir);
      vec3 c = vec3(0.002, 0.003, 0.01) + vec3(0.004, 0.012, 0.03) * exp(-abs(d.y - 0.03) * 9.0);
      gl_FragColor = vec4(c, 1.0);
    }
  `);
  root.add(fondo.mesh);

  // The canyon: dim rock, lit only by the water.
  const b = materiaBuilder(41);
  const r = b.r;
  const alto = (x: number, z: number) => {
    const s = Math.abs(x) - orillaDe(z);
    if (s <= 0) return 0;
    const pared = Math.min(1, s / 13);
    return (8 + 44 * fbm(x * 0.016 + 3, z * 0.016 + 9)) * Math.pow(pared, 0.55) + 2.2 * fbm(x * 0.15, z * 0.15) * pared;
  };
  sembrar(r, 520_000, -90, 34, 230, (x, z, dm) => {
    const y = alto(x, z);
    if (y <= 0) return;
    const e = 0.8;
    const ny = (2 * e) / Math.hypot(alto(x - e, z) - alto(x + e, z), 2 * e, alto(x, z - e) - alto(x, z + e));
    // Steep faces catch the glow of the falls; tops stay almost dark.
    const cara = 1 - ny;
    const cerca = Math.exp(-(Math.abs(x) - orillaDe(z)) / 14);
    b.push(x, y, z, col(mz(ROCA, AGUA, 0.55 * cerca)), 0.0042 * Math.max(dm, 5), 0.1 + 1.3 * cara * cerca + 0.12 * ny);
  });
  const roca = materia(b.data());
  roca.u.uFog.value = 240;
  roca.u.uFogNear.value = 20;
  roca.points.renderOrder = 1;
  root.add(roca.points);

  // The lake below and the sea above: two sheets of the same water.
  const w = materiaBuilder(42);
  const caidas: [number, number, number][] = [];
  for (let k = 0; k < 11; k++) {
    const z = 22 - k * 15 + (w.r() - 0.5) * 6;
    const lado = k % 2 ? 1 : -1;
    caidas.push([lado * (orillaDe(z) + 0.6 + 2 * w.r()), z, 2.4 + 3.2 * w.r()]);
  }
  sembrar(w.r, 150_000, -90, 34, 260, (x, z, dm) => {
    if (Math.abs(x) > orillaDe(z)) return;
    w.push(x, 0, z, col(mz(HONDO, AGUA, w.r())), 0.004 * Math.max(dm, 5), 0.55, { kind: 0 });
  });
  sembrar(w.r, 330_000, -110, 34, 420, (x, z, dm) => {
    // Brighter where a fall arrives.
    let llega = 0;
    for (const [cx, cz] of caidas) llega += Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / 90);
    w.push(x, TECHO, z, col(mz(mz(HONDO, AGUA, 0.3 + 0.5 * w.r()), ROSA, Math.min(1, llega) * 0.7)), 0.0036 * Math.max(Math.hypot(dm, TECHO * 0.7), 20), 0.5 + 0.9 * Math.min(1, llega), { kind: 1 });
  });
  const hojas = materia(w.data(), {
    move: /* glsl */ `
      float ola = sin(p.x * 0.09 + uTime * 0.35) + sin(p.z * 0.12 - uTime * 0.28) + 0.6 * sin((p.x + p.z) * 0.21 + uTime * 0.5);
      p.y += ola * mix(0.12, 0.9, aKind);
      // Crests of light, so the two sheets read as water.
      float cresta = pow(0.5 + 0.5 * sin(p.x * 0.13 + p.z * 0.05 + uTime * 0.4), 4.0) + pow(0.5 + 0.5 * sin(p.z * 0.17 - p.x * 0.06 - uTime * 0.33), 4.0);
      em *= 0.3 + 1.5 * cresta + 0.2 * sin(uTime * (0.6 + seed) + seed * 40.0);
    `,
  });
  hojas.u.uFog.value = 300;
  hojas.u.uFogNear.value = 30;
  hojas.points.renderOrder = 2;
  root.add(hojas.points);

  // The falls: water that leaves the lake slowly and speeds up towards the sky.
  const f = materiaBuilder(43);
  const aV: number[] = [];
  for (const [cx, cz, ancho] of caidas) {
    const d = Math.max(8, Math.hypot(cx, cz - clamp(cz, -90, 34)));
    for (let i = 0; i < 26_000; i++) {
      const a = f.r() * Math.PI * 2;
      const o = ancho * Math.sqrt(f.r());
      f.push(cx + Math.cos(a) * o * 0.5, 0, cz + Math.sin(a) * o, col(mz(HONDO, AGUA, 0.5 + 0.5 * f.r())), 0.0046 * d, 0.55, { delay: f.r(), kind: 0 });
      aV.push(Math.cos(a), Math.sin(a), 2 + 7 * f.r(), TECHO);
    }
  }
  // And a rain that goes up, everywhere over the lake.
  for (let i = 0; i < 26_000; i++) {
    const z = lerp(-110, 40, f.r());
    const x = (f.r() * 2 - 1) * orillaDe(z);
    f.push(x, 0, z, col(AGUA), 0.0046 * Math.max(6, Math.hypot(x, z - clamp(z, -90, 34))), 0.28, { delay: f.r(), kind: 1 });
    aV.push(0, 0, 0, TECHO);
  }
  const sube = materia(f.data(), {
    pre: /* glsl */ `attribute vec4 aV; uniform vec3 uAlto;`,
    move: /* glsl */ `
      float av = fract(aDelay + uTime * mix(0.034, 0.02, aKind) * (0.7 + 0.6 * seed));
      p.y += aV.w * pow(av, 1.7);
      p.xz += aV.xy * aV.z * av * av;
      p.x += 0.5 * sin(uTime * 0.7 + seed * 50.0 + p.y * 0.25) * (0.3 + 2.2 * av);
      p.z += 0.5 * cos(uTime * 0.6 + seed * 31.0 + p.y * 0.22) * (0.3 + 2.2 * av);
      em = mix(em, uAlto * (0.5 + 0.5 * seed), av) * smoothstep(0.0, 0.03, av) * (1.0 - smoothstep(0.93, 1.0, av));
    `,
    uniforms: { uAlto: { value: col(ROSA, 0.6) } },
    extra: { aV: [new Float32Array(aV), 4] },
  });
  sube.u.uFog.value = 300;
  sube.u.uFogNear.value = 30;
  sube.points.renderOrder = 3;
  root.add(sube.points);

  cam.set(V(0, 2.6, 36), V(0, 9, -60));
  tl.set({ luz: 0 });
  tl.caption(5, 'Otra ley', 'Alguien hizo este mundo. Aquí el agua cae hacia arriba.');
  tl.with(1.2, { luz: 1 });
  cam.to(5, V(-3, 4, 8), V(2, 16, -70));
  tl.caption(6, 'El agua sube', 'Sale despacio del lago y toma velocidad hacia el cielo.');
  cam.to(6, V(4, 10, -22), V(-6, 40, -80));
  tl.caption(6, 'El mar de arriba', 'El cielo es un mar. La lluvia vuelve a él.');
  cam.to(6, V(7, 34, -42), V(-12, 66, -120));

  return {
    tl,
    nubes: [roca, hojas, sube],
    vivir(_f, g) {
      roca.u.uGain.value = g('luz');
      hojas.u.uGain.value = g('luz') * 1.5;
      sube.u.uGain.value = g('luz');
    },
  };
}

// ---------------------------------------------------------------- 2 · three suns

function tresSoles(root: THREE.Group, tl: Timeline, cam: Cam): Mundo {
  const SOLES: RGB[] = [lin('#ff2a6a'), lin('#1fe6b4'), lin('#5a54ff')];
  const NP = 16;
  const suelo = (x: number, z: number) => 5 * fbm(x * 0.022 + 4, z * 0.022 + 1) + 0.35 * Math.sin(x * 0.8 + z * 0.35 + 5 * fbm(x * 0.05, z * 0.05));

  // The spires: six-sided crystals. The shader also needs them as cylinders, for their shadows.
  const b = materiaBuilder(51);
  const r = b.r;
  const aN: number[] = [];
  const pil: THREE.Vector4[] = [];
  for (let k = 0; k < NP; k++) {
    const z = 30 - k * 9.5 + (r() - 0.5) * 6;
    const x = (k % 2 ? 1 : -1) * (5 + 22 * r() * r()) + (r() - 0.5) * 3;
    pil.push(new THREE.Vector4(x, z, 0.9 + 1.9 * r(), 9 + 30 * r() * r()));
  }
  const uSolD = [V(), V(), V()];
  const uSolC = SOLES.map((c) => col(c));

  sembrar(r, 620_000, -130, 40, 300, (x, z, dm) => {
    const y = suelo(x, z);
    const e = 0.35;
    const nx = suelo(x - e, z) - suelo(x + e, z);
    const nz = suelo(x, z - e) - suelo(x, z + e);
    const nl = Math.hypot(nx, 2 * e, nz);
    b.push(x, y, z, 0xffffff, 0.0038 * Math.max(dm, 4), 0.8, { kind: 0 });
    aN.push(nx / nl, (2 * e) / nl, nz / nl);
  });
  for (const p of pil) {
    const d = Math.max(6, Math.hypot(p.x, p.y - clamp(p.y, -130, 40)));
    const base = suelo(p.x, p.y) - 1;
    const giro = r() * 6;
    const m = Math.round(clamp(26000 / (1 + d / 30), 5000, 20000));
    for (let i = 0; i < m; i++) {
      const cara = Math.floor(r() * 6);
      const a = giro + (cara / 6) * Math.PI * 2;
      const u = r();
      const punta = u > 0.8 ? 1 - (u - 0.8) / 0.2 : 1;
      const ap = p.z * 0.87 * punta;
      const t = (r() - 0.5) * p.z * punta;
      b.push(p.x + Math.cos(a) * ap - Math.sin(a) * t, base + u * (p.w + 1), p.y + Math.sin(a) * ap + Math.cos(a) * t, 0xffffff, 0.0042 * d, 1.05, { kind: 1 });
      const ny = u > 0.8 ? 0.45 : 0;
      const nl = Math.hypot(1, ny);
      aN.push(Math.cos(a) / nl, ny / nl, Math.sin(a) / nl);
    }
  }
  const mundo = materia(b.data(), {
    pre: /* glsl */ `attribute vec3 aN; uniform vec3 uSolD[3], uSolC[3]; uniform vec4 uPil[${NP}];`,
    move: /* glsl */ `
      vec3 luz = vec3(0.0);
      for (int i = 0; i < 3; i++) {
        vec3 L = uSolD[i];
        // Slopes are told apart: the ground leans its normal, so each face takes the sun it looks at.
        vec3 nn = aKind < 0.5 ? normalize(vec3(aN.x * 5.0, aN.y, aN.z * 5.0)) : aN;
        float lit = max(dot(nn, L), 0.0);
        lit *= lit;
        float sh = 1.0;
        if (aKind < 0.5) {
          vec2 Lh = L.xz;
          float ll = dot(Lh, Lh);
          for (int j = 0; j < ${NP}; j++) {
            vec4 q = uPil[j];
            vec2 d = p.xz - q.xy;
            float t = -dot(d, Lh) / ll;
            if (t > 0.0) sh *= 1.0 - (1.0 - smoothstep(q.z * 0.8, q.z * 1.2, length(d + Lh * t))) * step(p.y + t * L.y, q.w);
          }
          lit = lit * 3.6 + 0.02;
        }
        luz += uSolC[i] * lit * sh;
      }
      em = color * luz;
    `,
    uniforms: { uSolD: { value: uSolD }, uSolC: { value: uSolC }, uPil: { value: pil } },
    extra: { aN: [new Float32Array(aN), 3] },
  });
  mundo.u.uFog.value = 170;
  mundo.u.uFogNear.value = 30;
  mundo.points.renderOrder = 1;
  root.add(mundo.points);

  const fondo = pantalla(
    /* glsl */ `
    uniform vec3 uSolD[3], uSolC[3];
    ${ESTRELLAS}
    void main() {
      vec3 d = normalize(vDir);
      vec3 c = vec3(0.004, 0.003, 0.01);
      float franja = exp(-abs(d.y) * 8.0);
      for (int i = 0; i < 3; i++) {
        float cs = max(dot(d, uSolD[i]), 0.0);
        c += uSolC[i] * (smoothstep(0.99955, 0.99975, cs) * 5.0 + pow(cs, 300.0) * 0.5 + pow(cs, 12.0) * 0.06 * franja);
      }
      gl_FragColor = vec4(c + estrellas(d), 1.0);
    }
  `,
    { uSolD: { value: uSolD }, uSolC: { value: uSolC } },
  );
  root.add(fondo.mesh);

  tl.set({ luz: 0, giro: 0 });
  cam.set(V(-2, 7, 46), V(2, 9, -60));
  tl.caption(5, 'Otra ley', 'Alguien hizo este mundo, y le puso tres soles.');
  tl.with(1.2, { luz: 1 });
  tl.with(17, { giro: 1 });
  cam.to(5, V(1, 6.5, 18), V(-3, 8, -70));
  tl.caption(6, 'Tres sombras', 'Cada cosa tiene tres sombras, y ninguna es negra.');
  cam.to(6, V(-1.5, 5.5, -18), V(4, 7, -90));
  tl.caption(6, 'Ningún color es de nadie', 'Donde un sol no llega, pintan los otros dos.');
  cam.to(6, V(3, 22, -52), V(-4, 4, -130));

  return {
    tl,
    nubes: [mundo],
    vivir(f, g) {
      // The suns go round, low; each at its own pace.
      const t = g('giro') * 1.1 + f.time * 0.012;
      const az = [-0.42 + t * 0.4, 0.5 + t * 0.3, 3.3 - t * 0.6];
      const el = [0.2, 0.33, 0.24];
      for (let i = 0; i < 3; i++) uSolD[i].set(Math.sin(az[i]) * Math.cos(el[i]), Math.sin(el[i]), -Math.cos(az[i]) * Math.cos(el[i]));
      mundo.u.uGain.value = g('luz');
    },
  };
}

// ---------------------------------------------------------------- 3 · the sea of light

function marDeLuz(root: THREE.Group, tl: Timeline, cam: Cam): Mundo {
  const fondo = pantalla(/* glsl */ `
    ${ESTRELLAS}
    void main() {
      vec3 d = normalize(vDir);
      float franja = exp(-abs(d.y) * 10.0);
      vec3 c = vec3(0.003, 0.003, 0.009) + franja * (vec3(0.05, 0.015, 0.04) + 0.03 * vec3(sin(d.x * 3.0), sin(d.x * 3.0 + 2.1), sin(d.x * 3.0 + 4.2)));
      gl_FragColor = vec4(max(c, 0.0) + estrellas(d), 1.0);
    }
  `);
  root.add(fondo.mesh);

  const b = materiaBuilder(61);
  sembrar(b.r, 900_000, -140, 44, 520, (x, z, dm) => {
    b.push(x, 0, z, 0xffffff, 0.0036 * Math.max(dm, 4), 1);
  });
  const mar = materia(b.data(), {
    pre: /* glsl */ `
      const vec2 DIR[6] = vec2[6](vec2(0.94, 0.34), vec2(-0.5, 0.87), vec2(0.17, -0.98), vec2(-0.87, -0.5), vec2(0.64, 0.77), vec2(-0.98, 0.17));
      const float LAR[6] = float[6](74.0, 46.0, 29.0, 17.0, 10.5, 6.0);
      const float AMP[6] = float[6](1.7, 1.1, 0.7, 0.4, 0.22, 0.12);
      const float PESO[6] = float[6](1.0, 0.8, 0.5, 0.22, 0.1, 0.05);
      const vec3 COL[6] = vec3[6](vec3(1.0, 0.16, 0.42), vec3(1.0, 0.62, 0.12), vec3(0.08, 0.9, 0.78), vec3(0.55, 0.3, 1.0), vec3(0.16, 0.45, 1.0), vec3(0.75, 1.0, 0.3));
    `,
    move: /* glsl */ `
      vec3 c = vec3(0.0);
      float y = 0.0, ws = 0.0;
      for (int i = 0; i < 6; i++) {
        float kk = 6.2832 / LAR[i];
        float th = dot(DIR[i], p.xz) * kk - uTime * sqrt(9.8 * kk) * 0.35 + float(i) * 1.7;
        float sn = sin(th);
        y += AMP[i] * sn;
        // Each swell is lit along its crest, in its own colour.
        float wi = pow(0.5 + 0.5 * sn, 4.0) * PESO[i];
        c += COL[i] * wi;
        ws += wi;
      }
      p.y += y;
      // Where swells cross, the strongest keeps its colour instead of all of them adding up to white.
      c = c / (ws + 0.25) * min(ws, 1.3) + vec3(0.006, 0.008, 0.03);
      em = c * (0.75 + 0.25 * sin(uTime * (0.8 + seed) + seed * 40.0));
    `,
  });
  mar.u.uFog.value = 170;
  mar.u.uFogNear.value = 40;
  mar.points.renderOrder = 1;
  root.add(mar.points);

  tl.set({ luz: 0 });
  cam.set(V(0, 9, 46), V(0, 2, -60));
  tl.caption(5, 'Otra ley', 'Alguien hizo este mundo. Aquí el mar es de luz.');
  tl.with(1.2, { luz: 1 });
  cam.to(5, V(2, 7.5, 14), V(-4, 0, -80));
  tl.caption(6, 'Cada ola, un color', 'Vienen de seis lados. Donde se cruzan, se suman.');
  cam.to(6, V(-2, 10, -24), V(6, -2, -120));
  tl.caption(6, 'Hasta el horizonte', 'No hay sol. La luz sale del agua.');
  cam.to(6, V(0, 30, -64), V(0, -4, -260));

  return {
    tl,
    nubes: [mar],
    vivir(_f, g) {
      mar.u.uGain.value = g('luz') * 1.5;
    },
  };
}

// ---------------------------------------------------------------- the scene

export interface Cam {
  set(p: THREE.Vector3, t: THREE.Vector3): void;
  to(dur: number, p: THREE.Vector3, t: THREE.Vector3, e?: Ease | null): void;
}

export const mundos: Escena = {
  id: 'mundos',
  nombre: 'Otras leyes',
  estilos: [
    { key: '1', nombre: 'El agua sube', nota: 'Un cañón oscuro con un lago. El agua sale de él hacia arriba, en cascadas y en lluvia, hasta un mar que hace de cielo.' },
    { key: '2', nombre: 'Tres soles', nota: 'Una llanura de cristales bajo tres soles de tres colores. Todo el color viene de la luz: cada cosa tiene tres sombras y ninguna es negra.' },
    { key: '3', nombre: 'El mar de luz', nota: 'Un océano sin sol. Las olas vienen de seis lados y cada una trae su color en la cresta; donde se cruzan, se suman.' },
  ],
  montar(stage, modo): Instancia {
    const { root, camera } = stage;
    const tl = new Timeline({ luz: 1 });
    const cam: Cam = {
      set: (p, t) => void tl.set({ px: p.x, py: p.y, pz: p.z, tx: t.x, ty: t.y, tz: t.z }),
      to: (dur, p, t, e = null) => void tl.to(dur, { px: p.x, py: p.y, pz: p.z, tx: t.x, ty: t.y, tz: t.z }, e),
    };
    const m = (modo === 0 ? aguaSube : modo === 1 ? tresSoles : marDeLuz)(root, tl, cam);

    return {
      tl,
      escalera: false,
      cuenta(): Cuenta | null {
        return null;
      },
      rotulo(p): Rotulo | null {
        const cp = tl.captionAt(p);
        return cp ? { capitulo: 'V · Los jardines', name: cp.name, fact: cp.fact } : null;
      },
      update(f: Frame) {
        const g = (k: string) => tl.get(k, f.p);
        camera.near = 0.05;
        camera.far = 6000;
        camera.fov = 42;
        camera.position.set(g('px'), g('py'), g('pz'));
        camera.up.set(0, 1, 0);
        camera.lookAt(g('tx'), g('ty'), g('tz'));
        camera.updateMatrixWorld();
        stage.bloom.strength = 0.55;
        stage.bloom.radius = 0.62;
        stage.bloom.threshold = 0.2;
        for (const n of m.nubes) {
          enfocar(n, f.focal, f.dpr, f.time);
          n.u.uMinPx.value = 1.5 * f.dpr;
          n.u.uMaxPx.value = 10 * f.dpr;
        }
        m.vivir(f, g);
      },
      dispose() {},
    };
  },
};
