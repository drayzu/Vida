import * as THREE from 'three';
import { Timeline, EASE } from './timeline';
import { enfocar, materia, materiaBuilder } from '../src/engine/materia';
import { smoothstep } from '../src/engine/math';
import { type Cuenta, type Rotulo } from './placa';
import { SEGURO, SERIE, TU, V } from './comun';
import type { Escena, Frame, Instancia } from './tipos';
import { BPM, camara } from './hoy';
import { CORAZON, piel } from './cuerpo';
import { BLANCO } from './cosmos';

/**
 * Study · «¿Siente?» (GUION-vienen, moment 22: the only time the act asks it).
 *
 * Three in the dark. One of them: a ball of white points whose light moves in steps, like the
 * machine's beat in «Un patrón». Another person, in their own colour, with a heart that beats.
 * And you, in teal. The camera goes from it to the other person to you, and then sees the three.
 *
 * The argument is the picture: you believe the other person feels because they look like you.
 * The white one does not.
 */

const OTRA = SERIE.mente.clone();

/** A person: the body's skin, placed and turned, with the beat that runs from the heart. */
function persona(seed: number, c: THREE.Color, o: THREE.Vector3, giro: number, bpm: number) {
  const b = materiaBuilder(seed);
  const aN: number[] = [];
  const aQ: number[] = [];
  const cs = Math.cos(giro);
  const sn = Math.sin(giro);
  for (const q of piel(52_000, seed + 1)) {
    const [x, y, z] = q.p;
    const [nx, ny, nz] = q.n;
    b.push(o.x + x * cs + z * sn, o.y + y, o.z - x * sn + z * cs, c, 0.004, 1, { kind: 0 });
    aN.push(nx * cs + nz * sn, ny, -nx * sn + nz * cs);
    aQ.push(Math.hypot(x - CORAZON[0], y - CORAZON[1], z - CORAZON[2]), bpm, seed % 7, 0);
  }
  return { data: b.data(), aN: new Float32Array(aN), aQ: new Float32Array(aQ) };
}

const PERSONA_PRE = /* glsl */ `
  attribute vec3 aN;
  attribute vec4 aQ;
  ${SEGURO}
`;
const PERSONA_MOVE = /* glsl */ `
  vec3 v = normalize(cameraPosition - p);
  float fr = dot(aN, v);
  float cara = 0.22 + 0.78 * smoothstep(-0.25, 0.45, fr);
  float key = max(dot(aN, normalize(vec3(0.4, 0.5, 0.78))), 0.0);
  float rim = 1.0 - abs(fr);
  float x = fract(uTime * aQ.y / 60.0 + aQ.z * 0.13);
  float frente = (x - 0.05) * 3.4;
  float onda = exp(-pow((aQ.x - frente) / 0.05, 2.0)) * (1.0 - x) * step(0.0, frente);
  float cor = exp(-aQ.x * aQ.x / 0.0012) * lubdub(uTime + aQ.z * 0.13 * 60.0 / aQ.y, aQ.y);
  em = em * cara * (0.05 + 0.42 * key + 0.55 * pw(rim, 3.0)) * (1.0 + 0.8 * onda) + vec3(1.0, 0.72, 0.6) * (onda * 0.1 + cor * 0.5);
`;

/** One of them: a ball of white points on a square grid; its light moves in steps. */
function ellos(o: THREE.Vector3) {
  const b = materiaBuilder(2201);
  const r = b.r;
  const aQ: number[] = [];
  const G = 0.016;
  const R0 = 0.34;
  for (let i = -24; i <= 24; i++)
    for (let j = -24; j <= 24; j++)
      for (let k = -24; k <= 24; k++) {
        const x = i * G;
        const y = j * G;
        const z = k * G;
        const d = Math.hypot(x, y, z);
        // A shell, and a sparser inside.
        if (d > R0 || (d < R0 - G * 1.5 && r() > 0.05)) continue;
        b.push(o.x + x, o.y + y, o.z + z, BLANCO, 0.004, d > R0 - G * 1.5 ? 0.8 : 0.5, { kind: 0 });
        aQ.push(d, x / (d || 1), y / (d || 1), z / (d || 1));
      }
  return { data: b.data(), aQ: new Float32Array(aQ) };
}
const ELLOS_PRE = /* glsl */ `
  attribute vec4 aQ;
  ${SEGURO}
`;
const ELLOS_MOVE = /* glsl */ `
  // A slower rhythm than yours, and in steps: a front that jumps from the centre outwards.
  float x = fract(uTime * 0.21);
  float frente = floor(x * 9.0) / 9.0 * 0.4;
  float onda = step(abs(aQ.x - frente), 0.02) * (1.0 - x);
  vec3 v = normalize(cameraPosition - p);
  float rim = 1.0 - abs(dot(aQ.yzw, v));
  // And here and there, a point that lights on its own: something going on inside.
  float chispa = step(0.996, h21(vec2(seed * 53.0, floor(uTime * 8.0))));
  em *= 0.08 + 0.55 * pw(rim, 2.0) + 1.3 * onda + 2.0 * chispa;
`;

export const siente: Escena = {
  id: 'siente',
  nombre: '¿Siente?',
  estilos: [{ key: '1', nombre: '¿Siente?', nota: 'Tres en lo negro: uno de ellos (una esfera de puntos blancos cuya luz avanza a saltos), otra persona con su corazón, y tú. La cámara va de uno a otro y después ve a los tres. Crees que la otra persona siente porque se parece a ti.' }],
  montar(stage): Instancia {
    const { root, camera } = stage;

    const E = V(0, 1.3, 0);
    const P1 = V(-1.6, 0, 0.9);
    const P2 = V(1.6, 0, 0.9);
    const yo = persona(2202, TU, P1, 0.9, BPM);
    const otra = persona(2203, OTRA, P2, -0.9, 74);
    const el = ellos(E);
    const fig = (d: ReturnType<typeof persona>) => materia(d.data, { pre: PERSONA_PRE, move: PERSONA_MOVE, extra: { aN: [d.aN, 3], aQ: [d.aQ, 4] } });
    const tu = fig(yo);
    const ella = fig(otra);
    const suyo = materia(el.data, { pre: ELLOS_PRE, move: ELLOS_MOVE, extra: { aQ: [el.aQ, 4] } });
    for (const n of [tu, ella, suyo]) root.add(n.points);

    const tl = new Timeline({ luz: 0, k: 0 });
    tl.set({ tx: E.x, ty: E.y, tz: E.z, D: 1.5, az: 0.15, el: 0.08 });
    tl.caption(10, '¿Siente?', 'No sabemos si sienten.');
    tl.with(2.5, { luz: 1 });
    tl.to(10, { D: 1.25, az: -0.2 });
    tl.label('otra');
    tl.caption(10, 'Alguien más', 'Tampoco puedes probar que alguien más que tú siente.');
    tl.to(10, { tx: P2.x, ty: 1.45, tz: P2.z, D: 1.5, az: -0.55, el: 0.05 }, EASE.inOut);
    tl.label('parecen');
    tl.caption(9, 'Se parecen a ti', 'Lo crees porque se parecen a ti.');
    tl.to(9, { tx: P1.x, ty: 1.4, tz: P1.z, D: 1.7, az: 0.5, el: 0.05 }, EASE.inOut);
    tl.label('tres');
    tl.caption(9, 'Los tres', 'Lo que no se parece a ti, ¿cómo sabrías si siente?');
    tl.to(9, { tx: 0, ty: 1.0, tz: 0.4, D: 6.2, az: 0.0, el: 0.16 }, EASE.inOut);

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
        T.set(g('tx'), g('ty'), g('tz'));
        camara(camera, T, g('D'), g('az'), g('el'));
        camera.near = 0.01;
        camera.far = 100;
        camera.updateProjectionMatrix();
        stage.bloom.strength = 0.55;
        stage.bloom.radius = 0.55;
        stage.bloom.threshold = 0.14;
        const luz = g('luz');
        for (const n of [tu, ella, suyo]) {
          enfocar(n, f.focal, f.dpr, f.time);
          n.u.uMaxPx.value = 6 * f.dpr;
          n.u.uGain.value = luz * 0.85;
        }
        suyo.u.uGain.value = luz * (1 - 0.15 * smoothstep(tl.at('otra'), tl.at('parecen'), f.p));
      },
      dispose() {},
    };
  },
};
