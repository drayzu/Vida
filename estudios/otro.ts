import * as THREE from 'three';
import { Timeline, EASE } from './timeline';
import { enfocar, materia, materiaBuilder } from '../src/engine/materia';
import { smoothstep } from '../src/engine/math';
import { grupo, type Cuenta, type Rotulo } from './placa';
import { SEGURO, V } from './comun';
import type { Escena, Frame, Instancia } from './tipos';
import { BPM, CORAZON_MOVE, CORAZON_PRE, LATIDOS, camara, contador, corazon, reloj } from './hoy';
import { BLANCO } from './cosmos';

/**
 * Study · «Otro tiempo» (GUION-vienen, moments 18 and the first half of 19).
 *
 * 18 · Otro tiempo · la Tierra: three hearts side by side, at their real sizes and rates. A blue
 *      whale's (about 1.5 m, some 180 kg; twice a minute when it dives), yours (66 a minute) and a
 *      hummingbird's (a few millimetres; up to about 1 200 a minute), which from where yours is
 *      is only a speck that trembles.
 * 19 · Otro tiempo · ellos (the quick one): your heart, slowed down until one beat fills the whole
 *      moment. Around it, the world of a mind that thinks a million times faster: a ring of white
 *      lights over which ten days and ten nights go by during that one beat of yours.
 *
 * Unit: one metre. The three hearts are the same drawing at three scales.
 */

const DIAS_POR_LATIDO = (60 / BPM) * 1e6 / 86400;

/** The same heart at another scale and place, with its own clock. */
const ESCALADO_PRE = CORAZON_PRE + /* glsl */ `
  uniform float uS;
  uniform vec3 uO;
`;
const ESCALADO_MOVE = CORAZON_MOVE.replace(/cameraPosition/g, '((cameraPosition - uO) / uS)') + /* glsl */ `
  p = p * uS + uO;
  sz *= uS;
`;

/** Their world around your heart: a band of white lights, with day passing over it. */
function anillo() {
  const b = materiaBuilder(1903);
  const r = b.r;
  const aQ: number[] = [];
  for (let i = 0; i < 26_000; i++) {
    const a = r() * Math.PI * 2;
    const t = r() * Math.PI * 2;
    const rr = 0.006 + 0.022 * Math.sqrt(r());
    const R0 = 0.24;
    const x = (R0 + Math.cos(t) * rr) * Math.cos(a);
    const z = (R0 + Math.cos(t) * rr) * Math.sin(a);
    const y = Math.sin(t) * rr * 0.35;
    b.push(x, y, z, BLANCO, 0.001, 0.5 + 0.8 * r() * r(), { kind: 0 });
    aQ.push(a, r(), 0, 0);
  }
  // Threads across it: what they send from one side to the other.
  for (let i = 0; i < 9000; i++) {
    const a = r() * Math.PI * 2;
    const c = a + Math.PI * (0.4 + 1.2 * r());
    const t = r();
    const x = 0.24 * ((1 - t) * Math.cos(a) + t * Math.cos(c));
    const z = 0.24 * ((1 - t) * Math.sin(a) + t * Math.sin(c));
    b.push(x, 0.04 * Math.sin(Math.PI * t), z, BLANCO, 0.001, 0.25, { kind: 1 });
    aQ.push(a + (c - a) * t, r(), t, 0);
  }
  return { data: b.data(), aQ: new Float32Array(aQ) };
}

const ANILLO_PRE = /* glsl */ `
  attribute vec4 aQ;
  uniform float uDias, uVer;
  ${SEGURO}
`;
const ANILLO_MOVE = /* glsl */ `
  // The day: a light that goes round the band once per day of theirs.
  float sol = 0.5 + 0.5 * cos(aQ.x - uDias * 6.2831853);
  float dia = smoothstep(0.35, 0.95, sol);
  // And the night is full of their own lights, which never stop: they flicker every frame.
  float chispa = step(0.82, h21(vec2(seed * 91.7, floor(uTime * 60.0))));
  em *= (aKind < 0.5 ? 0.03 + 0.85 * dia + 0.7 * chispa * (1.0 - dia) : 0.03 + 1.2 * chispa) * uVer;
  fuente = 0.6;
`;

export const otro: Escena = {
  id: 'otro',
  nombre: 'Otro tiempo',
  estilos: [{ key: '1', nombre: 'Tres corazones · Diez días', nota: 'El corazón de una ballena azul, el tuyo y el de un colibrí, a su tamaño y a su ritmo. Después tu corazón, tan lento que un latido llena todo el momento; alrededor, el mundo de una mente un millón de veces más rápida, sobre el que pasan diez días y diez noches.' }],
  montar(stage): Instancia {
    const { root, camera } = stage;

    const H = corazon();
    const nuevo = (s: number, o: THREE.Vector3, bpm: number) => {
      const U = { uBpm: { value: bpm }, uS: { value: s }, uO: { value: o } };
      const n = materia(H.data, { pre: ESCALADO_PRE, move: ESCALADO_MOVE, uniforms: U, extra: { aN: [H.aN, 3], aQ: [H.aQ, 4] } });
      root.add(n.points);
      return n;
    };
    const BALLENA = V(-1.0, 0.0, -0.2);
    const TUYO = V(0.42, -0.62, 0.15);
    const COLIBRI = V(0.62, -0.62, 0.15);
    const ballena = nuevo(12.5, BALLENA, 2);
    const tuyo = nuevo(1, TUYO, BPM);
    const colibri = nuevo(0.05, COLIBRI, 1200);
    const AN = anillo();
    const UA = { uDias: { value: 0 }, uVer: { value: 0 } };
    const mente = materia(AN.data, { pre: ANILLO_PRE, move: ANILLO_MOVE, uniforms: UA, extra: { aQ: [AN.aQ, 4] } });
    mente.points.position.copy(TUYO);
    root.add(mente.points);

    const tl = new Timeline({ luz: 0, lento: 0, fase: 0, anillo: 0 });
    tl.set({ D: 4.2, tx: BALLENA.x, ty: BALLENA.y, tz: BALLENA.z, az: 0.35, el: 0.12 });
    tl.caption(10, 'Otro tiempo', 'El corazón de una ballena azul pesa lo que una moto. Cuando bucea, late dos veces por minuto.');
    tl.with(2, { luz: 1 });
    tl.to(10, { az: 0.75, D: 3.8 });
    tl.label('tuyo');
    tl.caption(7, 'El tuyo', 'El tuyo, unas setenta.');
    tl.to(7, { D: 1.0, tx: TUYO.x, ty: TUYO.y + 0.01, tz: TUYO.z, az: 0.45, el: 0.1 }, EASE.inOut);
    tl.label('colibri');
    tl.caption(9, 'El colibrí', 'El de un colibrí, más de mil doscientas veces por minuto: veinte por segundo.');
    tl.to(9, { D: 0.035, tx: COLIBRI.x, ty: COLIBRI.y + 0.0005, tz: COLIBRI.z, az: 0.7, el: 0.15 }, EASE.inOut);
    tl.label('cada');
    tl.caption(8, 'Cada vida tiene su tiempo', 'Mientras la ballena late una vez, el colibrí late seiscientas.');
    tl.to(8, { D: 2.6, tx: -0.3, ty: -0.2, tz: 0, az: 0.5, el: 0.2 }, EASE.inOut);
    tl.label('rapido');
    tl.caption(13, 'Diez días', 'Una mente que piense un millón de veces más rápido que tú: para ella, cada latido tuyo dura diez días.');
    tl.with(2, { lento: 1 });
    tl.with(4, { anillo: 1 });
    tl.with(13, { fase: 1 }, EASE.linear);
    tl.to(13, { D: 0.62, tx: TUYO.x, ty: TUYO.y, tz: TUYO.z, az: 0.25, el: 0.42 }, EASE.inOut);
    tl.label('ochenta');
    tl.caption(10, 'Ochenta millones de años', 'Tu vida entera, para ella, duraría ochenta millones de años: más que desde que se extinguieron los dinosaurios.');
    tl.to(10, { D: 1.1, az: -0.25, el: 0.62 });

    const T = V();
    const contar = contador(LATIDOS);
    let latidos = 1;
    let t0: number | null = null;
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
        if (t0 === null) t0 = f.time;
        T.set(g('tx'), g('ty'), g('tz'));
        const D = g('D');
        camara(camera, T, D, g('az'), g('el'));
        camera.near = Math.max(1e-4, D * 0.01);
        camera.far = 100;
        camera.updateProjectionMatrix();
        stage.bloom.strength = 0.5;
        stage.bloom.radius = 0.6;
        stage.bloom.threshold = 0.16;
        const luz = g('luz');
        latidos = contar(f.time);
        const t = f.time - t0;
        const lento = g('lento');

        for (const n of [ballena, tuyo, colibri]) {
          enfocar(n, f.focal, f.dpr, t);
          n.u.uMaxPx.value = 8 * f.dpr;
          n.u.uGain.value = luz * 0.95;
        }
        // Slowed down, one of your beats fills the moment.
        tuyo.u.uTime.value = lento > 0.5 ? g('fase') * (60 / BPM) * 0.999 : t;
        ballena.u.uGain.value *= 1 - lento;
        colibri.u.uGain.value *= 1 - lento;

        enfocar(mente, f.focal, f.dpr, f.time);
        mente.u.uMaxPx.value = 5 * f.dpr;
        mente.u.uGain.value = luz * g('anillo');
        UA.uDias.value = g('fase') * DIAS_POR_LATIDO;
        UA.uVer.value = 1;
      },
      placa(g2, f) {
        const p = f.p;
        const a = tl.get('luz', p) * smoothstep(0.6, 1.8, p);
        if (p < tl.at('rapido')) {
          const linea = p < tl.at('tuyo') ? 'Ballena azul · 2 por minuto' : p < tl.at('colibri') ? 'Tú · 66 por minuto' : p < tl.at('cada') ? 'Colibrí · 1 200 por minuto' : 'Tres tiempos';
          reloj(g2, f, a, grupo(latidos), latidos === 1 ? 'latido tuyo' : 'latidos tuyos', linea);
        } else if (p < tl.at('ochenta')) {
          const dias = tl.get('fase', p) * DIAS_POR_LATIDO;
          const h = Math.floor((dias % 1) * 24);
          reloj(g2, f, a, '1', 'latido tuyo', `${Math.floor(dias)} días y ${h} horas suyos`);
        } else {
          reloj(g2, f, a * smoothstep(tl.at('ochenta'), tl.at('ochenta') + 1, p), '3 200 millones de', 'latidos', 'Tu vida · 80 millones de años suyos');
        }
      },
      dispose() {},
    };
  },
};
