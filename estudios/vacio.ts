import * as THREE from 'three';
import { Timeline, EASE } from './timeline';
import { enfocar, materia, materiaBuilder } from '../src/engine/materia';
import { clamp, smoothstep } from '../src/engine/math';
import { grupo, type Cuenta, type Rotulo } from './placa';
import { SEGURO, TU, V } from './comun';
import type { Escena, Frame, Instancia } from './tipos';
import { BPM, camara, reloj } from './hoy';
import { BLANCO, telarana } from './cosmos';

/**
 * Study · «El vacío» (GUION-vienen, moments 23–25).
 *
 * 23 · Todas partes: the cosmic web, every point a galaxy (warm: starlight). From ours, at the
 *      centre, their white spreads out along the threads, galaxy after galaxy.
 *      Then it stops: the universe stretches, and almost every galaxy we can see is already moving
 *      away too fast for anything that leaves here to ever reach it (about 16 500 million
 *      light-years is the limit today; what we see goes out to about 46 500 million). Beyond the
 *      limit the galaxies drift off, redden and go out.
 * 24 · Nadie contesta: from the edge of what they reached, calls go out (spheres of light that
 *      grow and fade). Nothing comes back.
 * 25 · La pregunta: the web goes; at the centre, two points, yours (teal, your beat) and one of
 *      theirs (white, a slower rhythm), side by side, in the black.
 *
 * Unit: a thousand million light-years.
 */

const VISIBLE = 46.5;
const ALCANCE = 16.5;

const WEB_PRE = /* glsl */ `
  attribute vec4 aQ;
  uniform float uR, uEstira, uBlanco;
  uniform vec3 uB;
  ${SEGURO}
`;
const WEB_MOVE = /* glsl */ `
  float d = aQ.x;
  // Theirs: white where they have arrived (the front a little brighter).
  float suyo = smoothstep(uR, uR - 1.6, d);
  float frente = exp(-pow((d - uR) / 0.9, 2.0)) * step(0.05, uR);
  em = mix(em, uB * (0.9 + 0.4 * (aKind < 0.5 ? 1.0 : 0.0)), suyo * uBlanco) + uB * frente * 1.8;
  // Beyond the limit: the universe stretches, the galaxies redden, drift off and go out.
  float fuera = smoothstep(${ALCANCE.toFixed(1)}, ${(ALCANCE + 7).toFixed(1)}, d);
  float e = uEstira * fuera;
  p *= 1.0 + 0.32 * e;
  em = mix(em, em * vec3(1.0, 0.38, 0.22), clamp(e * 1.4, 0.0, 1.0));
  em *= 1.0 - 0.55 * e;
  fuente = 1.0;
`;

/** Their calls: spheres of points that grow from the edge of their reach and fade. */
function llamadas() {
  const b = materiaBuilder(2302);
  for (let s = 0; s < 3; s++)
    for (let i = 0; i < 7000; i++) {
      const [x, y, z] = b.onSphere();
      b.push(x, y, z, BLANCO, 0.12, 1.0, { kind: s });
    }
  return b.data();
}
const LLAMA_PRE = /* glsl */ `
  uniform float uLlama;
`;
const LLAMA_MOVE = /* glsl */ `
  float kl = clamp(uLlama * 1.5 - aKind * 0.25, 0.0, 1.0);
  float rr = ${ALCANCE.toFixed(1)} + kl * 26.0;
  p = position * rr;
  em *= smoothstep(0.0, 0.2, kl) * (1.0 - smoothstep(0.35, 1.0, kl)) * 0.8;
  fuente = 1.0;
`;

/** You and one of them. */
function pareja() {
  const b = materiaBuilder(2503);
  const aQ: number[] = [];
  const uno = (x: number, c: THREE.Color, bpm: number, tu: number) => {
    b.push(x, 0, 0, c, 0.012, 2.2, { kind: 0 });
    aQ.push(bpm, tu, 0, 0);
    for (let k = 0; k < 90; k++) {
      b.push(x, 0, 0, c, 0.01, 0.9, { kind: 1 });
      aQ.push(bpm, tu, (k / 90) * Math.PI * 2, 0);
    }
  };
  uno(-0.32, TU, BPM, 1);
  uno(0.32, BLANCO, 9, 0);
  return { data: b.data(), aQ: new Float32Array(aQ) };
}
const PAREJA_PRE = /* glsl */ `
  attribute vec4 aQ;
  uniform float uAnillo;
`;
const PAREJA_MOVE = /* glsl */ `
  float ph = fract(uTime * aQ.x / 60.0 + aQ.y * 0.37);
  if (aKind < 0.5) em *= 0.35 + 1.4 * exp(-ph * (aQ.y > 0.5 ? 6.0 : 2.0));
  else {
    // The ring faces you (the camera's right and up, in the world).
    vec3 der = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 arr = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    p += (der * cos(aQ.z) + arr * sin(aQ.z)) * uAnillo * (0.1 + 0.9 * ph);
    em *= 1.4 * smoothstep(0.0, 0.1, ph) * pow(1.0 - ph, 1.3);
  }
  fuente = 1.0;
`;

export const vacio: Escena = {
  id: 'vacio',
  nombre: 'El vacío',
  estilos: [{ key: '1', nombre: 'Todas partes · Nadie contesta · La pregunta', nota: 'La telaraña de galaxias. Desde la nuestra, su blanco se extiende por los hilos. Se detiene: el universo se estira y casi todo lo que vemos ya está fuera de alcance. Llaman hacia afuera y nadie contesta. Al final, en el negro, tu punto y uno de ellos.' }],
  montar(stage): Instancia {
    const { root, camera } = stage;

    const W = telarana(2301, 80_000, VISIBLE, 7.5);
    const UW = { uR: { value: 0 }, uEstira: { value: 0 }, uBlanco: { value: 1 }, uB: { value: BLANCO.clone().multiplyScalar(1.15) } };
    const web = materia(W.data, { pre: WEB_PRE, move: WEB_MOVE, uniforms: UW, extra: { aQ: [W.aQ, 4] } });
    const UL = { uLlama: { value: 0 } };
    const lla = materia(llamadas(), { pre: LLAMA_PRE, move: LLAMA_MOVE, uniforms: UL });
    const PA = pareja();
    const UP = { uAnillo: { value: 0.1 } };
    const par = materia(PA.data, { pre: PAREJA_PRE, move: PAREJA_MOVE, uniforms: UP, extra: { aQ: [PA.aQ, 4] } });
    for (const n of [web, lla, par]) root.add(n.points);

    const tl = new Timeline({ luz: 0, R: 0, estira: 0, llama: 0, web: 1, par: 0 });
    tl.set({ ld: 1.25, az: 0.4, el: 0.3 });
    tl.caption(10, 'Todas partes', 'Quizá lleguen a todas partes: galaxia tras galaxia, todo lo que el universo no nos dejó hacer.');
    tl.with(2, { luz: 1 });
    tl.wait(1);
    tl.with(9, { R: 10 }, EASE.inOut);
    tl.to(9, { ld: 1.6, az: 0.9, el: 0.38 });
    tl.label('alcance');
    tl.caption(11, 'Fuera de alcance', 'Pero el universo se estira. Casi todas las galaxias que vemos se alejan tan rápido que nada que salga de aquí las alcanzará jamás.');
    tl.with(5, { R: ALCANCE });
    tl.with(11, { estira: 1 }, EASE.inOut);
    tl.to(11, { ld: 2.2, az: 1.5, el: 0.45 });
    tl.label('nadie');
    tl.caption(9, 'Nadie contesta', 'Llaman hacia afuera. Nadie contesta.');
    tl.with(9, { llama: 1 }, EASE.linear);
    tl.to(9, { az: 1.85, el: 0.5 });
    tl.label('paraque');
    tl.caption(9, 'Para qué', 'Y nadie les dice para qué. El universo no se lo dijo a nadie.');
    tl.to(9, { az: 2.1, ld: 2.15, el: 0.4, web: 0.55 });
    tl.label('pregunta');
    tl.caption(13, 'La pregunta', 'Lo que les dejamos no es nuestro cuerpo. Es esta pregunta.');
    tl.with(5, { web: 0 });
    tl.with(7, { ld: 0.15, el: 0.18, az: 2.35 }, EASE.inOut);
    tl.wait(4);
    tl.with(4, { par: 1 });
    tl.to(9, { ld: 0.05, az: 2.45, el: 0.2 });

    const T = V();
    return {
      tl,
      escalera: false,
      cuenta(): Cuenta | null {
        return null;
      },
      rotulo(p): Rotulo | null {
        const cp = tl.captionAt(p);
        return cp ? { capitulo: 'IV · El vacío', name: cp.name, fact: cp.fact } : null;
      },
      update(f: Frame) {
        const g = (k: string) => tl.get(k, f.p);
        const ld = g('ld');
        const D = Math.pow(10, ld);
        camara(camera, T, D, g('az'), g('el'));
        stage.bloom.strength = 0.6;
        stage.bloom.radius = 0.6;
        stage.bloom.threshold = 0.12;
        const luz = g('luz');

        enfocar(web, f.focal, f.dpr, f.time);
        web.u.uMinPx.value = 1.15 * f.dpr;
        web.u.uMaxPx.value = 5 * f.dpr;
        web.u.uGain.value = luz * 0.75 * g('web');
        UW.uR.value = g('R');
        UW.uEstira.value = g('estira');

        enfocar(lla, f.focal, f.dpr, f.time);
        lla.u.uMaxPx.value = 3 * f.dpr;
        lla.u.uGain.value = luz * g('web');
        UL.uLlama.value = g('llama');

        enfocar(par, f.focal, f.dpr, f.time);
        par.u.uMaxPx.value = 9 * f.dpr;
        par.u.uGain.value = luz * g('par');
        UP.uAnillo.value = clamp(D * 0.06, 0.02, 0.2);
      },
      placa(g2, f) {
        const p = f.p;
        const a = tl.get('luz', p) * smoothstep(1, 2.2, p) * (1 - smoothstep(tl.at('pregunta'), tl.at('pregunta') + 2, p));
        const R = tl.get('R', p);
        const linea = p < tl.at('alcance') + 4 ? `${grupo(R * 1000)} millones de años luz desde aquí` : 'Lo que se puede alcanzar · unos 16 500 millones de años luz';
        reloj(g2, f, a, '¿?', 'latidos', linea);
      },
      dispose() {},
    };
  },
};
