import * as THREE from 'three';
import { Timeline, EASE } from './timeline';
import { enfocar, materia, materiaBuilder } from '../src/engine/materia';
import { smoothstep } from '../src/engine/math';
import { type Cuenta, type Rotulo } from './placa';
import { SEGURO, V } from './comun';
import type { Escena, Frame, Instancia } from './tipos';
import { camara, reloj } from './hoy';

/**
 * Study · «Juntos · la Tierra» (GUION-vienen, moment 13).
 *
 * A siphonophore in the dark sea: what looks like one animal is a colony of hundreds, each with its
 * job. At the front, the float and the swimming bells; then, along a stem tens of metres long,
 * the same group again and again: a shield, a mouth, a long fishing line with side branches. Pulses
 * of blue-green light run along it. At the end it coils into the spiral it was filmed in, off
 * Western Australia in 2020 (an Apolemia estimated at about 47 m).
 *
 * Every point has two places: along a long, wavy line and on the spiral; the engine's `uK` moves
 * it from one to the other. Unit: one metre.
 */

const L = 34;
const N_GRUPOS = 150;

const MAR = new THREE.Color(0.35, 0.9, 1.0);
const VIDRIO = new THREE.Color(0.55, 0.85, 1.0);
const BOCA = new THREE.Color(1.0, 0.55, 0.32);
const FLOTADOR = new THREE.Color(1.0, 0.4, 0.3);

/** The stem, stretched out: gently wavy. */
const linea = (s: number) => V(-s * L, 0.5 * Math.sin(s * Math.PI * 2 * 2.5), 0.9 * Math.sin(s * Math.PI * 2 * 1.2));
/** The stem, coiled: a flat spiral, the head outside. */
const espiral = (s: number) => {
  const th = (1 - s) * Math.PI * 2 * 1.75;
  const r = 1.2 + 4.2 * (1 - s);
  return V(r * Math.cos(th), 0.15 * Math.sin(s * 40), r * Math.sin(th));
};

/** The frame of a curve at `s`: along it, across it (level) and up. */
function marco(f: (s: number) => THREE.Vector3, s: number) {
  const a = f(Math.max(0, s - 0.0005));
  const b = f(Math.min(1, s + 0.0005));
  const T = b.sub(a).normalize();
  const N = T.clone().cross(V(0, 1, 0)).normalize();
  const U = N.clone().cross(T).normalize();
  return { P: f(s), T, N, U };
}

function colonia() {
  const b = materiaBuilder(1301);
  const r = b.r;
  const aQ: number[] = [];
  /** A point at stem position `s`, offset (along, across, up) in the stem's own frame. */
  const put = (s: number, al: number, ac: number, up: number, c: THREE.Color, size: number, luz: number, kind: number, extra = 0) => {
    const A = marco(linea, s);
    const B = marco(espiral, s);
    const q = (m: typeof A) => m.P.clone().addScaledVector(m.T, al).addScaledVector(m.N, ac).addScaledVector(m.U, up);
    const pa = q(A);
    // Hanging things hang down in both shapes.
    const pb = q(B);
    if (kind === 3) {
      pa.copy(A.P).addScaledVector(A.T, al).addScaledVector(A.N, ac).add(V(0, up, 0));
      pb.copy(B.P).addScaledVector(B.T, al).addScaledVector(B.N, ac).add(V(0, up, 0));
    }
    b.push(pb.x, pb.y, pb.z, c, size, luz, { from: [pa.x, pa.y, pa.z], kind, delay: s });
    aQ.push(s, extra, r(), 0);
  };

  // The float, at the very front.
  for (let i = 0; i < 900; i++) {
    const [x, y, z] = b.onSphere();
    put(0, 0.045 + x * 0.03, y * 0.018, z * 0.018, FLOTADOR, 0.0025, 0.7, 0);
  }
  // The swimming bells: two rows of cups around the front of the stem.
  for (let k = 0; k < 14; k++) {
    const s = 0.002 + k * 0.0011;
    const lado = k % 2 ? 1 : -1;
    for (let i = 0; i < 900; i++) {
      // A cup: a hemisphere, open to the back, its rim brighter.
      const u = r();
      const a = r() * Math.PI * 2;
      const ph = u * Math.PI * 0.55;
      const al = -Math.cos(ph) * 0.05;
      const ac = lado * (0.06 + Math.sin(ph) * Math.cos(a) * 0.05);
      const up = Math.sin(ph) * Math.sin(a) * 0.045;
      const borde = u > 0.9 ? 1.4 : 0.35;
      put(s, al, ac, up, VIDRIO, 0.0018, borde, 1);
    }
  }
  // The stem.
  for (let i = 0; i < 14000; i++) {
    const s = 0.016 + r() * 0.984;
    put(s, 0, (r() - 0.5) * 0.008, (r() - 0.5) * 0.008, MAR, 0.002, 0.45, 2);
  }
  // The groups, again and again: a shield, a mouth, a fishing line with its branches.
  for (let g = 0; g < N_GRUPOS; g++) {
    const s = 0.022 + (g / N_GRUPOS) * 0.975;
    const lado = g % 2 ? 1 : -1;
    // The shield (bract): a curved leaf off to one side.
    for (let i = 0; i < 160; i++) {
      const u = r() * 2 - 1;
      const v = r() * 2 - 1;
      if (u * u + v * v > 1) continue;
      put(s, u * 0.05, lado * (0.05 + 0.02 * (1 - u * u)), 0.02 + v * 0.03, VIDRIO, 0.0018, u * u + v * v > 0.8 ? 1.6 : 0.4, 1);
    }
    // The mouth (gastrozooid): a short tube hanging down.
    for (let i = 0; i < 70; i++) {
      const t = r();
      const a = r() * Math.PI * 2;
      put(s, 0.01 + Math.cos(a) * 0.008, Math.sin(a) * 0.008, -0.01 - t * 0.07, BOCA, 0.0018, 0.6 + 0.6 * t, 3);
    }
    // The fishing line (tentacle), long, with side branches that coil (tentilla).
    const largo = 0.5 + 1.6 * r();
    const curva = (r() - 0.5) * 0.4;
    for (let i = 0; i < 260; i++) {
      const t = r();
      put(s, 0.015 + curva * t * t, curva * 0.5 * t, -0.08 - t * largo, MAR, 0.0016, 0.9, 3, t);
    }
    for (let j = 0; j < 9; j++) {
      const t = (j + 0.5) / 9;
      for (let i = 0; i < 22; i++) {
        const w = i / 22;
        const a = w * Math.PI * 3;
        put(s, 0.015 + curva * t * t + Math.cos(a) * 0.012 * w, curva * 0.5 * t + Math.sin(a) * 0.012 * w + 0.03 * w, -0.08 - t * largo - 0.02 * w, MAR, 0.0016, 1.3, 3, t);
      }
    }
  }
  return { data: b.data(), aQ: new Float32Array(aQ) };
}

const COL_PRE = /* glsl */ `
  attribute vec4 aQ;
  uniform float uOnda, uMecer;
  ${SEGURO}
`;
const COL_MOVE = /* glsl */ `
  float sp = aQ.x;
  // It swims: a slow wave runs back along the stem, and the lines sway.
  p.y += 0.12 * uMecer * sin(sp * 40.0 - uTime * 0.7);
  if (aKind > 2.5) p.x += 0.06 * uMecer * aQ.y * sin(uTime * 0.5 + sp * 30.0 + aQ.z);
  // Pulses of light run from the head to the tail, one after another.
  float x = fract(uTime * 0.09) * 1.4 - 0.2;
  float x2 = fract(uTime * 0.09 + 0.5) * 1.4 - 0.2;
  float pulso = exp(-pow((sp - x) / 0.012, 2.0)) + 0.7 * exp(-pow((sp - x2) / 0.012, 2.0));
  float chispa = aKind > 2.5 ? step(0.985, h21(vec2(aQ.z * 77.0, floor(uTime * 3.0 + aQ.z * 5.0)))) : 0.0;
  em *= (0.35 + uOnda * (2.6 * pulso + 3.0 * chispa));
  fuente = 0.5;
`;

/** Marine snow: grey specks that fall slowly (no life, no colour). */
function nieve() {
  const b = materiaBuilder(1302);
  const r = b.r;
  for (let i = 0; i < 40_000; i++) {
    b.push(-L * 0.5 + (r() - 0.5) * (L + 14), (r() - 0.5) * 14, (r() - 0.5) * 16, new THREE.Color(0.62, 0.64, 0.7), 0.006, 0.1 + 0.3 * r() * r(), { kind: 0 });
  }
  return b.data();
}
const NIEVE_MOVE = /* glsl */ `
  p.y = mod(p.y - uTime * 0.03 + 7.0, 14.0) - 7.0;
  p.x += sin(uTime * 0.1 + seed * 40.0) * 0.05;
`;

export const juntos: Escena = {
  id: 'juntos',
  nombre: 'Juntos',
  estilos: [{ key: '1', nombre: 'Juntos · la Tierra', nota: 'Un sifonóforo en el mar oscuro: parece un animal y son cientos, cada uno con su trabajo. Pulsos de luz azul verde corren por él. Al final se enrolla en la espiral en que lo filmaron frente a Australia en 2020.' }],
  montar(stage): Instancia {
    const { root, camera } = stage;

    const C = colonia();
    const UC = { uOnda: { value: 1 }, uMecer: { value: 1 } };
    const col = materia(C.data, { pre: COL_PRE, move: COL_MOVE, uniforms: UC, extra: { aQ: [C.aQ, 4] } });
    col.u.uK.value = 0;
    col.u.uSpread.value = 0.6;
    const nie = materia(nieve(), { move: NIEVE_MOVE });
    for (const n of [nie, col]) root.add(n.points);

    const tl = new Timeline({ luz: 0, k: 0, ce: 0 });
    tl.set({ sc: 0.0, D: 0.75, az: 0.95, el: 0.12 });
    tl.caption(9, 'Juntos', 'En el mar oscuro, a cientos de metros, nada algo que parece un solo animal.');
    tl.with(2.5, { luz: 1 });
    tl.to(9, { sc: 0.03, D: 1.1, az: 0.5, el: 0.2 });
    tl.label('muchos');
    tl.caption(11, 'Muchos', 'No lo es. Son cientos de animales, cada uno con su trabajo: unos nadan, otros cazan, otros comen. Ninguno podría vivir solo.');
    tl.to(11, { sc: 0.16, D: 2.2, az: 1.35, el: 0.18 }, EASE.inOut);
    tl.label('largo');
    tl.caption(10, 'Más de cuarenta metros', 'En 2020 se vio uno frente a Australia, a 600 metros de profundidad: medía más de cuarenta. Más que una ballena azul.');
    tl.to(10, { sc: 0.5, D: 30, az: 1.1, el: 0.32 }, EASE.inOut);
    tl.label('espiral');
    tl.caption(12, 'Tú ya eres muchos', 'Tú también: treinta billones de células que viven como una.');
    tl.with(9, { k: 1, ce: 1 }, EASE.inOut);
    tl.to(12, { D: 15, el: 1.05, az: 0.6 });

    const T = V();
    return {
      tl,
      escalera: false,
      cuenta(): Cuenta | null {
        return null;
      },
      rotulo(p): Rotulo | null {
        const cp = tl.captionAt(p);
        return cp ? { capitulo: 'III · Cómo vivirían', name: cp.name, fact: cp.fact } : null;
      },
      update(f: Frame) {
        const g = (k: string) => tl.get(k, f.p);
        const D = g('D');
        T.copy(linea(g('sc'))).lerp(V(0, 0, 0), g('ce'));
        camara(camera, T, D, g('az'), g('el'));
        camera.near = Math.max(1e-3, D * 0.01);
        camera.far = 1000;
        camera.updateProjectionMatrix();
        stage.bloom.strength = 0.65;
        stage.bloom.radius = 0.6;
        stage.bloom.threshold = 0.12;
        const luz = g('luz');

        enfocar(col, f.focal, f.dpr, f.time);
        col.u.uMaxPx.value = 6 * f.dpr;
        col.u.uGain.value = luz * (1 - 0.55 * smoothstep(2.5, 20, D));
        col.u.uK.value = g('k');

        enfocar(nie, f.focal, f.dpr, f.time);
        nie.u.uMaxPx.value = 4 * f.dpr;
        nie.u.uGain.value = luz * (1 - 0.6 * smoothstep(5, 25, D));
      },
      placa(g2, f) {
        const p = f.p;
        if (p < tl.at('espiral') + 2) return;
        reloj(g2, f, smoothstep(tl.at('espiral') + 2, tl.at('espiral') + 4, p), '30 billones', 'de células', 'Tú · uno solo');
      },
      dispose() {},
    };
  },
};
