import * as THREE from 'three';
import { Timeline, EASE } from './timeline';
import { enfocar, materia, materiaBuilder } from '../src/engine/materia';
import { lerp, smoothstep } from '../src/engine/math';
import type { Cuenta, Rotulo } from './placa';
import { SERIE, TIBIO, TU, V } from './comun';
import type { Escena, Frame, Instancia } from './tipos';
import { col, mz, type RGB } from './mundos';

/**
 * Study · «Tú» (GUION-formas, moment 10). Phase 0.
 *
 * The end of the first movement: a figure made of points, standing. Nothing that came before was
 * left behind; it is inside, lit. The camera goes in: under the skin, the cells that are one body;
 * inside each cell, the other one it took in; and at the centre of one, the light of the beginning,
 * which never went out. Then it comes back out and rises until the figure is a point on a planet.
 *
 * Everything here is real, so every line is continuous. The size of a cell is a liberty: a real
 * one is ten thousand times smaller than drawn.
 */

const BLANCO: RGB = [TIBIO.r, TIBIO.g, TIBIO.b];
const vivo = (c: THREE.Color, k = 2.1): RGB => {
  const l = (c.r + c.g + c.b) / 3;
  return [Math.max(0, l + (c.r - l) * k), Math.max(0, l + (c.g - l) * k), Math.max(0, l + (c.b - l) * k)];
};
const AZUL = vivo(SERIE.tiempo);
const VIOLETA = vivo(SERIE.infinito);
const AMBAR = mz(vivo(SERIE.mente), vivo(SERIE.espacio), 0.35);
const VERDE: RGB = [TU.r, TU.g, TU.b];

/** The heart of the figure, where the camera goes in. Units: decimetres. */
const HC = V(0.35, 12.7, 0.3);
const RCEL = 0.06;
const RP = 3000;
const PLANETA = V(0, -RP, 0);

// The figure: a union of rounded limbs, as a distance field.
export type Tramo = [number, number, number, number, number, number, number, number];
export type Bulto = [number, number, number, number, number, number];
// A loose stance: the weight on one leg, the other knee forward, the arms hanging unevenly.
const TRAMOS: Tramo[] = [
  [0, 14.75, 0, 0.05, 15.55, 0.1, 0.5, 0.46],
  // The straight side: arm and leg.
  [0.3, 15.0, -0.05, 1.3, 14.3, -0.05, 0.42, 0.48],
  [1.1, 14.25, 0, 1.8, 13.95, 0, 0.6, 0.55],
  [1.8, 13.95, 0, 2.2, 11.3, -0.1, 0.46, 0.38],
  [2.2, 11.3, -0.1, 2.3, 9.0, 0.5, 0.36, 0.27],
  [0.8, 8.9, 0, 0.75, 4.9, 0.05, 0.8, 0.52],
  [0.75, 4.9, 0.05, 0.7, 0.9, -0.1, 0.5, 0.28],
  [0.7, 0.36, -0.2, 0.9, 0.3, 1.4, 0.36, 0.28],
  // The loose side.
  [-0.3, 15.0, -0.05, -1.3, 14.3, -0.05, 0.42, 0.48],
  [-1.1, 14.25, 0, -1.8, 13.95, 0, 0.6, 0.55],
  [-1.8, 13.95, 0, -2.45, 11.4, 0.1, 0.46, 0.38],
  [-2.45, 11.4, 0.1, -2.9, 9.2, 0.75, 0.36, 0.27],
  [-0.75, 8.9, 0, -1.15, 5.0, 0.75, 0.8, 0.52],
  [-1.15, 5.0, 0.75, -1.35, 1.0, 0.1, 0.5, 0.28],
  [-1.35, 0.36, 0, -1.85, 0.3, 1.45, 0.36, 0.28],
];
const BULTOS: Bulto[] = [
  [0.08, 16.4, 0.2, 0.86, 1.1, 0.98],
  [0, 12.9, 0, 1.55, 2.0, 1.05],
  [0.05, 10.7, 0.05, 1.3, 1.8, 0.95],
  [0.1, 9.2, 0, 1.5, 1.25, 1.0],
  [2.32, 8.25, 0.7, 0.26, 0.65, 0.36],
  [-3.0, 8.5, 0.95, 0.26, 0.65, 0.36],
];
const junta = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
/** A body as a distance field: a smooth union of rounded limbs and lumps. */
export const campo = (TR: Tramo[], BU: Bulto[]) => (x: number, y: number, z: number) => {
  let d = 1e9;
  for (const [ax, ay, az, bx, by, bz, ra, rb] of TR) {
    const px = x - ax, py = y - ay, pz = z - az;
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const t = Math.min(1, Math.max(0, (px * ux + py * uy + pz * uz) / (ux * ux + uy * uy + uz * uz)));
    d = junta(d, Math.hypot(px - ux * t, py - uy * t, pz - uz * t) - lerp(ra, rb, t), 0.22);
  }
  for (const [cx, cy, cz, rx, ry, rz] of BU) {
    const px = x - cx, py = y - cy, pz = z - cz;
    const k0 = Math.hypot(px / rx, py / ry, pz / rz);
    const k1 = Math.hypot(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
    d = junta(d, k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(rx, ry, rz), 0.22);
  }
  return d;
};
export const cuerpo = campo(TRAMOS, BULTOS);

function mundo() {
  const b = materiaBuilder(919);
  const r = b.r;
  const aC: number[] = [];
  const aN: number[] = [];
  const aQ: number[] = [];
  const O = V();
  const dir = () => {
    const [x, y, z] = b.onSphere();
    return V(x, y, z);
  };
  const put = (kind: number, p: THREE.Vector3, color: RGB, size: number, luz: number, C: THREE.Vector3, N: THREE.Vector3, fase = 0) => {
    b.push(p.x, p.y, p.z, col(color), size, luz, { kind });
    aC.push(C.x, C.y, C.z);
    aN.push(N.x, N.y, N.z);
    aQ.push(p.distanceTo(HC), fase, 0, 0);
  };
  const caja = () => V((r() - 0.5) * 7.8, -0.3 + r() * 18.2, -1.7 + r() * 4.4);

  // The skin: barely there. The figure is drawn by what lives in it, not by an outline.
  const e = 0.01;
  for (let n = 0; n < 50_000; ) {
    const p = caja();
    if (Math.abs(cuerpo(p.x, p.y, p.z)) > 0.5) continue;
    const g = V();
    for (let i = 0; i < 4; i++) {
      const d = cuerpo(p.x, p.y, p.z);
      g.set(cuerpo(p.x + e, p.y, p.z) - d, cuerpo(p.x, p.y + e, p.z) - d, cuerpo(p.x, p.y, p.z + e) - d).normalize();
      p.addScaledVector(g, -d);
    }
    put(1, p, mz(AZUL, BLANCO, 0.35), 0.035, 0.6, O, g);
    n++;
  }
  // Under it: every cell, as a light. Most are the cell; some, the one it carries inside.
  for (let n = 0; n < 85_000; ) {
    const p = caja();
    if (cuerpo(p.x, p.y, p.z) > -0.1 || p.distanceTo(HC) < 0.15) continue;
    const dentro = r() < 0.28;
    put(2, p, dentro ? AMBAR : mz(AZUL, VIOLETA, r() * 0.6), dentro ? 0.055 : 0.048, dentro ? 1.0 : 0.7, O, O, r());
    n++;
  }

  /** A small rod: the one inside. */
  const adentro = (C: THREE.Vector3, off: THREE.Vector3, s: number, n: number, size: number, hero: boolean, giro: number) => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(hero ? 0.2 : r() * 6, hero ? giro : r() * 6, hero ? 0.5 + giro * 1.3 : r() * 6));
    const G = C.clone().add(off);
    const fase = r();
    for (let i = 0; i < n; i++) {
      const d = dir();
      put(hero ? 6 : 4, G.clone().add(V(d.x * 0.78, d.y * 0.46, d.z * 0.46).multiplyScalar(s).applyQuaternion(q)), AMBAR, size, 0.75, G, d.applyQuaternion(q), fase);
    }
    if (!hero) return;
    for (let k = 0; k < 6; k++) {
      const x = lerp(-0.56, 0.56, k / 5);
      const rr = 0.44 * Math.sqrt(1 - (x / 0.78) ** 2);
      const lado = k % 2 ? 1 : -1;
      for (let i = 0; i < 240; i++) {
        const a = r() * Math.PI * 2;
        const m = i < 100 ? 1 : Math.sqrt(r());
        const y = Math.cos(a) * rr * m;
        if (y * lado < -0.3 * rr) continue;
        put(7, G.clone().add(V(x, y, Math.sin(a) * rr * m).multiplyScalar(s).applyQuaternion(q)), mz(AMBAR, BLANCO, 0.25), size * 0.8, 0.6, G, O, fase);
      }
    }
  };

  // Around the heart: the cells, each with the others inside.
  const paso = 0.125;
  for (let i = -5; i <= 5; i++) {
    for (let j = -5; j <= 5; j++) {
      for (let k = -5; k <= 5; k++) {
        if (!i && !j && !k) continue;
        const C = HC.clone().add(V(i + (r() - 0.5) * 0.85, j + (r() - 0.5) * 0.85, k + (r() - 0.5) * 0.85).multiplyScalar(paso));
        if (C.distanceTo(HC) > 0.66) continue;
        const R = RCEL * (0.9 + 0.14 * r());
        const tono = mz(AZUL, VIOLETA, r() * 0.7);
        for (let n = 0; n < 520; n++) {
          const d = dir();
          put(3, C.clone().addScaledVector(d, R), tono, 0.0016, 0.9, C, d);
        }
        const cuantos = 2 + Math.floor(r() * 3);
        for (let n = 0; n < cuantos; n++) adentro(C, dir().multiplyScalar(0.036 * Math.cbrt(r())), 0.022, 60, 0.0028, false, 0);
      }
    }
  }
  // The one the camera enters.
  for (let n = 0; n < 16_000; n++) {
    const d = dir();
    put(5, HC.clone().addScaledVector(d, RCEL), AZUL, 0.00055, 0.5, HC, d);
  }
  [V(-0.034, 0.014, -0.012), V(0.036, 0.02, -0.006), V(0.018, -0.034, -0.02), V(-0.022, -0.026, 0.004)].forEach((off, i) => adentro(HC, off, 0.017, 4200, 0.00034, true, 0.3 + i));
  // The light of the beginning: a point, with an edge barely drawn.
  for (let n = 0; n < 260; n++) put(8, HC.clone().add(dir().multiplyScalar(0.0011 * Math.cbrt(r()))), VERDE, 0.0006, 1.6, HC, O);
  for (let n = 0; n < 2600; n++) {
    const d = dir();
    put(9, HC.clone().addScaledVector(d, 0.0062), mz(VERDE, BLANCO, 0.4), 0.00011, 0.5, HC, d);
  }
  // Seen from outside: the light in the chest.
  put(12, HC, VERDE, 0.3, 2.2, O, O);
  // Seen from far: where the figure stands.
  put(11, V(0, 9, 0), VERDE, 90, 5, O, O);
  // The planet: only its edge takes light.
  for (let n = 0; n < 120_000; n++) {
    const d = dir();
    put(10, PLANETA.clone().addScaledVector(d, RP), [0.25, 0.55, 1.0], 16, 0.8, PLANETA, d);
  }

  const f = (a: number[]) => new Float32Array(a);
  return { data: b.data(), aC: f(aC), aN: f(aN), aQ: f(aQ) };
}

const PRE = /* glsl */ `
  attribute vec3 aC, aN;
  attribute vec4 aQ;
  uniform vec3 uCam;
  uniform float uPiel, uPuntos, uCel, uHero, uBorde, uPlaneta, uMarca;
  float canto(vec3 n, vec3 p) { float f = 1.0 - abs(dot(n, normalize(uCam - p))); return f * f; }
`;

const MOVE = /* glsl */ `
  // One rhythm for all of it: a wave that leaves from the heart, once a second.
  float pul = exp(-fract(uTime - aQ.x * 0.045) * 4.5);
  float gp = exp(-fract(uTime * 1.7 + aQ.y * 9.0) * 5.0);
  if (aKind < 1.5) {
    em *= (0.0 + 0.12 * canto(aN, p)) * (0.85 + 0.2 * pul) * uPiel;
  } else if (aKind < 2.5) {
    em *= (0.3 + 0.6 * pul) * uPuntos;
  } else if (aKind < 3.5) {
    p = aC + (position - aC) * (1.0 + 0.03 * pul);
    em *= (0.12 + 1.5 * canto(aN, p)) * (0.5 + 1.0 * pul) * uCel;
  } else if (aKind < 4.5) {
    em *= (0.5 + 1.3 * gp) * uCel;
  } else if (aKind < 5.5) {
    p = aC + (position - aC) * (1.0 + 0.03 * pul);
    em *= (0.12 + 1.6 * canto(aN, p)) * (0.5 + 1.0 * pul) * uHero;
  } else if (aKind < 6.5) {
    em *= (0.25 + 1.4 * canto(aN, p)) * (0.55 + 1.4 * gp) * uHero;
  } else if (aKind < 7.5) {
    em *= (0.3 + 1.3 * gp) * uHero;
  } else if (aKind < 8.5) {
    em *= 0.7 + 1.8 * exp(-fract(uTime) * 4.5);
    fuente = 1.0;
  } else if (aKind < 9.5) {
    em *= (0.1 + 1.6 * canto(aN, p)) * uBorde;
  } else if (aKind < 10.5) {
    float c = canto(aN, p);
    em *= c * sqrt(c) * uPlaneta;
    fuente = 0.6;
  } else if (aKind < 11.5) {
    em *= uMarca;
    fuente = 1.0;
  } else {
    em *= (0.6 + 1.6 * exp(-fract(uTime) * 4.5)) * uPuntos;
    fuente = 1.0;
  }
`;

export const tu: Escena = {
  id: 'tu',
  nombre: 'Tú',
  estilos: [{ key: '1', nombre: 'Tú · Adentro · El comienzo · Un punto', nota: 'Una figura de puntos. La cámara entra: las células que son un cuerpo, la que cada una lleva adentro y, en el centro, la luz del comienzo. Después sale y sube hasta que la figura es un punto sobre un planeta.' }],
  montar(stage): Instancia {
    const { root, camera } = stage;
    const M = mundo();
    const U = {
      uCam: { value: V() },
      uPiel: { value: 1 },
      uPuntos: { value: 1 },
      uCel: { value: 0 },
      uHero: { value: 0 },
      uBorde: { value: 0 },
      uPlaneta: { value: 0 },
      uMarca: { value: 0 },
    };
    const todo = materia(M.data, { pre: PRE, move: MOVE, uniforms: U, extra: { aC: [M.aC, 3], aN: [M.aN, 3], aQ: [M.aQ, 4] } });
    root.add(todo.points);

    /** `ld`: log10 of the camera's distance to what it looks at. Close, it looks at the heart; far, at the figure. `sube`: it rises over the planet. */
    const tl = new Timeline({ luz: 0, ld: 1.62, az: -0.75, el: 0.04, sube: 0 });
    tl.caption(7, 'Tú', 'La vida no empezó con nosotros.');
    tl.with(2, { luz: 1 });
    tl.to(7, { az: -0.45, ld: 1.56 }, EASE.sine);
    tl.caption(8, 'Adentro', 'Todo lo que fue sigue en ti.');
    tl.to(8, { ld: 0.0, az: 0.05 }, EASE.sine);
    tl.caption(6, 'Una dentro de otra', 'Cada célula tuya lleva otra adentro.');
    tl.to(6, { ld: -0.68, az: 0.12 }, EASE.sine);
    tl.caption(7, 'El comienzo', 'Ninguna empezó de nuevo. La primera nunca se apagó.');
    tl.to(5, { ld: -1.5, az: 0.2 }, EASE.sine);
    tl.wait(2);
    tl.caption(7, 'Tú', '');
    tl.to(7, { ld: 1.62, az: 0.45, el: 0.06 }, EASE.sine);
    tl.caption(10, 'Un punto', 'Un punto sobre un planeta.');
    tl.to(10, { ld: 3.97, sube: 1, az: 0.0, el: 0.33 }, EASE.sine);

    const mira = V();
    const figura = V(0, 9, 0);
    return {
      tl,
      escalera: false,
      cuenta(): Cuenta | null {
        return null;
      },
      rotulo(p): Rotulo | null {
        const cp = tl.captionAt(p);
        return cp ? { capitulo: 'I · De forma en forma', name: cp.name, fact: cp.fact } : null;
      },
      update(f: Frame) {
        const g = (k: string) => tl.get(k, f.p);
        const ld = g('ld');
        const dist = Math.pow(10, ld);
        const az = g('az');
        const el = g('el');
        mira.copy(figura).lerp(HC, 1 - smoothstep(0.6, 1.4, ld));
        mira.y -= 0.26 * dist * g('sube');
        camera.near = dist * 0.02;
        camera.far = dist * 40 + 200;
        camera.fov = 40;
        camera.position.set(mira.x + Math.sin(az) * Math.cos(el) * dist, mira.y + Math.sin(el) * dist, mira.z + Math.cos(az) * Math.cos(el) * dist);
        camera.up.set(0, 1, 0);
        camera.lookAt(mira);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld();
        stage.bloom.strength = 0.3;
        stage.bloom.radius = 0.6;
        stage.bloom.threshold = 0.2;
        U.uCam.value.copy(camera.position);
        // Each layer is lit at the distance from which it can be read.
        U.uPiel.value = (0.12 + 0.88 * smoothstep(0.2, 1.0, ld)) * (1 - smoothstep(2.2, 3.0, ld));
        U.uPuntos.value = smoothstep(-0.3, 0.5, ld) * (1 - smoothstep(2.2, 3.0, ld));
        U.uCel.value = (1 - smoothstep(0.5, 1.1, ld)) * (0.3 + 0.7 * smoothstep(-1.1, -0.6, ld));
        U.uHero.value = 1 - smoothstep(0.5, 1.1, ld);
        U.uBorde.value = 1 - smoothstep(-0.9, -0.5, ld);
        U.uPlaneta.value = smoothstep(2.0, 3.0, ld);
        U.uMarca.value = smoothstep(1.9, 2.6, ld);
        enfocar(todo, f.focal, f.dpr, f.time);
        todo.u.uMinPx.value = 1.3 * f.dpr;
        todo.u.uMaxPx.value = 9 * f.dpr;
        todo.u.uGain.value = g('luz') * 0.6;
        // The planet hides its far side.
        const c = PLANETA.clone().applyMatrix4(camera.matrixWorldInverse);
        todo.u.uOcc.value.set(c.x, c.y, c.z, ld > 1.9 ? RP * 0.995 : 0);
      },
      placa() {},
      dispose() {},
    };
  },
};
