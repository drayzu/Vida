import * as THREE from 'three';
import { Timeline, EASE } from './timeline';
import { enfocar, materia, materiaBuilder } from '../src/engine/materia';
import { smoothstep } from '../src/engine/math';
import { grupo } from './placa';
import { SEGURO, TU, V } from './comun';
import type { Cuenta, Rotulo } from './placa';
import type { Escena, Frame, Instancia } from './tipos';
import { BPM, LATIDOS, camara, contador, fijarLatidos, reloj } from './hoy';
import { CORAZON, curvas, dentro, piel } from './cuerpo';

/**
 * Study · «Un patrón» (GUION-vienen, moments 8–9).
 *
 *  8 · No eres tu materia: your body, standing in the dark, made of points. The points are a
 *      river: matter comes in from the world (grey: no life, no colour), takes your colour while it
 *      is you, and leaves grey again. The clock speeds up to ten years and the river becomes a
 *      torrent, and the shape does not move.
 *  9 · Un patrón: the river stops and the matter goes. What is left is the drawing: the body's
 *      contour lines, lit only by the beat that runs through them from the heart. Then other matter,
 *      white, square, from no body, fills the same drawing, and it goes on beating.
 */

const GRIS = new THREE.Color(0.6, 0.62, 0.68);
const PULSO = new THREE.Color(1.0, 0.72, 0.6);
const DIEZ_ANOS = 66 * 60 * 24 * 365.25 * 10;

const dist = (p: [number, number, number]) => Math.hypot(p[0] - CORAZON[0], p[1] - CORAZON[1], p[2] - CORAZON[2]);

/** The river: points of the body, each with where it comes from and where it goes. */
function rio() {
  const b = materiaBuilder(808);
  const r = b.r;
  const aN: number[] = [];
  const aSal: number[] = [];
  const aQ: number[] = [];
  const add = (p: [number, number, number], n: [number, number, number] | null) => {
    // It comes from the world around: a wide ring of matter, low, as the air and the water and the food come.
    const a = r() * Math.PI * 2;
    const rr = 1.6 + 3.2 * Math.sqrt(r());
    const from: [number, number, number] = [Math.cos(a) * rr, -0.2 + 2.6 * r() * r(), Math.sin(a) * rr];
    const c = n ? TU.clone().lerp(new THREE.Color(0.75, 1.0, 1.0), 0.25 * r()) : new THREE.Color(0.25, 0.75, 0.9);
    b.push(p[0], p[1], p[2], c, n ? 0.0042 : 0.006, n ? 1 : 0.55, { from, kind: n ? 0 : 1 });
    const nn = n ?? [0, 0, 0];
    aN.push(nn[0], nn[1], nn[2]);
    // It leaves outwards and up, like breath and warmth.
    const o = n ?? [p[0] * 3, 0, p[2] * 3];
    const sx = o[0] * 0.8 + (r() - 0.5) * 0.9;
    const sy = 0.9 + r() * 1.4;
    const sz = o[2] * 0.8 + (r() - 0.5) * 0.9;
    const l = (1.2 + 2.2 * r()) / Math.hypot(sx, sy, sz);
    aSal.push(sx * l, sy * l, sz * l);
    aQ.push(dist(p), 0.75 + 0.5 * r(), (r() < 0.5 ? -1 : 1) * (1.2 + 2.5 * r()), n ? 0 : 1);
  };
  for (const q of piel(78_000, 81)) add(q.p, q.n);
  for (const p of dentro(12_000, 82)) add(p, null);
  return { data: b.data(), aN: new Float32Array(aN), aSal: new Float32Array(aSal), aQ: new Float32Array(aQ) };
}

const RIO_PRE = /* glsl */ `
  attribute vec3 aN, aSal;
  attribute vec4 aQ;
  uniform float uFase, uLejos, uSale, uBpm, uVivo;
  uniform vec3 uGris, uPulso;
  ${SEGURO}
`;
const RIO_MOVE = /* glsl */ `
  vec3 tgt = position;
  float ph = fract(uFase * aQ.y + seed);
  float vida = 1.0;
  const float ENT = 0.07;
  const float SAL = 0.93;
  if (ph < ENT) {
    float e = ph / ENT;
    e = e * e * (3.0 - 2.0 * e);
    vec3 d = (aFrom - tgt) * uLejos;
    float a = (1.0 - e) * aQ.z;
    float c = cos(a), s = sin(a);
    d = vec3(c * d.x - s * d.z, d.y, s * d.x + c * d.z);
    p = tgt + d * (1.0 - e);
    vida = smoothstep(0.6, 1.0, e);
  } else if (ph > SAL) {
    float e = (ph - SAL) / (1.0 - SAL);
    p = tgt + aSal * uLejos * e * e;
    vida = 1.0 - smoothstep(0.0, 0.35, e);
  } else {
    p = tgt;
  }
  // When the river stops, everything leaves, each point at its own time.
  float ls = clamp(uSale * 1.7 - seed * 0.7, 0.0, 1.0);
  p += (aSal * 1.3 + vec3(0.0, 0.5, 0.0)) * ls * ls;
  vida *= 1.0 - smoothstep(0.0, 0.3, ls);
  // Lit as skin: brighter at the edges, the inside a faint glow.
  // Lit as a body: a soft light from above and in front, the edges a little brighter, and the skin
  // turned away from you fainter (you see through it).
  vec3 v = normalize(cameraPosition - p);
  float fr = dot(aN, v);
  float frente2 = 0.22 + 0.78 * smoothstep(-0.25, 0.45, fr);
  float key = max(dot(aN, normalize(vec3(0.4, 0.5, 0.78))), 0.0);
  float rim = 1.0 - abs(fr);
  float luz = aQ.w > 0.5 ? 0.07 : frente2 * (0.05 + 0.42 * key + 0.55 * pw(rim, 3.0));
  // The beat runs out from the heart.
  float x = fract(uTime * uBpm / 60.0);
  float frente = (x - 0.05) * 3.4;
  float onda = exp(-pow((aQ.x - frente) / 0.05, 2.0)) * (1.0 - x) * step(0.0, frente);
  float cor = exp(-aQ.x * aQ.x / 0.0012) * lubdub(uTime, uBpm);
  vec3 vivo = em * luz * (1.0 + 0.8 * onda) + uPulso * (onda * 0.12 + cor * 0.5);
  em = mix(uGris * 0.5, vivo, vida) * uVivo * (1.0 - smoothstep(0.55, 1.0, ls));
`;

/** The drawing: the body's contour lines, which only the beat lights. */
function dibujo() {
  const b = materiaBuilder(809);
  const aN: number[] = [];
  const aQ: number[] = [];
  for (const q of curvas(52_000, 0.022, 83)) {
    b.push(q.p[0], q.p[1], q.p[2], TU.clone().lerp(new THREE.Color(1, 1, 1), 0.35), 0.0026, 1, { kind: 0 });
    aN.push(q.n[0], q.n[1], q.n[2]);
    aQ.push(dist(q.p), q.linea, 0, 0);
  }
  return { data: b.data(), aN: new Float32Array(aN), aQ: new Float32Array(aQ) };
}

const DIB_PRE = /* glsl */ `
  attribute vec3 aN;
  attribute vec4 aQ;
  uniform float uBpm, uBase, uBlanco;
  uniform vec3 uPulso;
  ${SEGURO}
`;
const DIB_MOVE = /* glsl */ `
  float x = fract(uTime * uBpm / 60.0);
  float frente = (x - 0.05) * 3.4;
  float onda = exp(-pow((aQ.x - frente) / 0.045, 2.0)) * (1.0 - 0.7 * x) * step(-0.05, frente);
  vec3 v = normalize(cameraPosition - p);
  float rim = 1.0 - abs(dot(aN, v));
  float cor = exp(-aQ.x * aQ.x / 0.0015) * lubdub(uTime, uBpm);
  em = em * (uBase * (0.35 + 0.9 * pw(rim, 1.5)) + 0.45 * onda) + mix(uPulso, vec3(1.0), 0.4) * (onda * 0.2 + cor * 0.6);
  em *= 1.0 - uBlanco;
`;

/**
 * Other matter in the same drawing: white points on a square grid (made, not grown), that come in
 * from all around and take their places. The beat goes on, but square: the front moves in steps.
 */
function maquina() {
  const b = materiaBuilder(810);
  const r = b.r;
  const aQ: number[] = [];
  const G = 0.0085;
  const visto = new Set<string>();
  for (const q of piel(160_000, 84)) {
    const i = Math.round(q.p[0] / G);
    const j = Math.round(q.p[1] / G);
    const k = Math.round(q.p[2] / G);
    const key = `${i},${j},${k}`;
    if (visto.has(key)) continue;
    visto.add(key);
    const x = i * G;
    const y = j * G;
    const z = k * G;
    const a = r() * Math.PI * 2;
    const rr = 2 + 4 * Math.sqrt(r());
    const from: [number, number, number] = [Math.cos(a) * rr, y + (r() - 0.5) * 3, Math.sin(a) * rr];
    b.push(x, y, z, new THREE.Color(0.92, 0.95, 1.0), 0.0034, 1, { from, delay: Math.min(1, dist([x, y, z]) / 1.4) * 0.6 + r() * 0.4 });
    aQ.push(dist([x, y, z]), q.n[0], q.n[1], q.n[2]);
  }
  return { data: b.data(), aQ: new Float32Array(aQ) };
}

const MAQ_PRE = /* glsl */ `
  attribute vec4 aQ;
  uniform float uBpm, uMaq;
  ${SEGURO}
`;
const MAQ_MOVE = /* glsl */ `
  float x = fract(uTime * uBpm / 60.0);
  float frente = floor((x - 0.05) * 3.4 / 0.09) * 0.09;
  float onda = step(abs(aQ.x - frente), 0.045) * (1.0 - 0.7 * x) * step(-0.05, frente);
  vec3 v = normalize(cameraPosition - p);
  float rim = 1.0 - abs(dot(aQ.yzw, v));
  em *= (0.22 + 0.9 * pw(rim, 1.6) + 0.9 * onda) * uMaq;
`;

/** The world's matter around you, grey and slow. */
function polvo() {
  const b = materiaBuilder(811);
  const r = b.r;
  for (let i = 0; i < 45_000; i++) {
    const a = r() * Math.PI * 2;
    const rr = 0.9 + 7 * Math.sqrt(r());
    b.push(Math.cos(a) * rr, -0.6 + 4.2 * r(), Math.sin(a) * rr, GRIS, 0.008, 0.18 + 0.4 * r() * r(), { kind: 0 });
  }
  return b.data();
}

const POLVO_MOVE = /* glsl */ `
  p += vec3(sin(uTime * 0.07 + seed * 40.0), sin(uTime * 0.05 + seed * 23.0) * 0.6, cos(uTime * 0.06 + seed * 31.0)) * 0.08;
`;

export const patron: Escena = {
  id: 'patron',
  nombre: 'Un patrón',
  estilos: [{ key: '1', nombre: 'No eres tu materia · Un patrón', nota: 'Tu cuerpo de pie, en puntos. Los puntos son un río: entran del mundo sin color, son tú un tiempo y se van grises. Diez años pasan y la forma no se mueve. Después la materia se va y queda el dibujo, que solo el latido enciende; y otra materia, blanca y cuadrada, lo vuelve a llenar.' }],
  montar(stage): Instancia {
    const { root, camera } = stage;

    const RI = rio();
    const UR = {
      uFase: { value: 0 }, uLejos: { value: 0.3 }, uSale: { value: 0 }, uBpm: { value: BPM }, uVivo: { value: 1 },
      uGris: { value: GRIS.clone() }, uPulso: { value: PULSO.clone() },
    };
    const cuerpo = materia(RI.data, { pre: RIO_PRE, move: RIO_MOVE, uniforms: UR, extra: { aN: [RI.aN, 3], aSal: [RI.aSal, 3], aQ: [RI.aQ, 4] } });
    const DI = dibujo();
    const UD = { uBpm: { value: BPM }, uBase: { value: 0 }, uBlanco: { value: 0 }, uPulso: { value: PULSO.clone() } };
    const dib = materia(DI.data, { pre: DIB_PRE, move: DIB_MOVE, uniforms: UD, extra: { aN: [DI.aN, 3], aQ: [DI.aQ, 4] } });
    const MA = maquina();
    const UM = { uBpm: { value: BPM }, uMaq: { value: 0 } };
    const maq = materia(MA.data, { pre: MAQ_PRE, move: MAQ_MOVE, uniforms: UM, extra: { aQ: [MA.aQ, 4] } });
    maq.u.uSpread.value = 1.5;
    const pol = materia(polvo(), { move: POLVO_MOVE });
    for (const n of [pol, cuerpo, dib, maq]) root.add(n.points);

    const tl = new Timeline({ luz: 0, sale: 0, dib: 0, maq: 0, blanco: 0, anos: 0, rate: 0.012, lejos: 0.3 });
    tl.set({ D: 1.9, az: 0.55, el: 0.02, ty: 1.3 });
    tl.caption(8, 'No eres tu materia', 'Lo que te forma entra y sale de ti todo el tiempo: con el aire que respiras, con el agua, con lo que comes.');
    tl.with(2, { luz: 1 });
    tl.to(8, { D: 3.5, az: 0.2, el: 0.1, ty: 0.95, lejos: 1, rate: 0.03 });
    tl.label('rapido');
    tl.caption(7, 'Cuatro millones por segundo', 'Cada segundo mueren en ti unos cuatro millones de células, y nacen otras tantas.');
    tl.to(7, { rate: 0.12, az: -0.3, lejos: 1.5 });
    tl.label('diez');
    tl.caption(9, 'Diez años', 'Casi nada de lo que te forma hoy estaba en ti hace diez años. Y sigues aquí.');
    tl.with(9, { anos: 1 }, EASE.inOut);
    tl.to(9, { rate: 0.55, az: -0.95, D: 4.4, el: 0.16, lejos: 2.3 });
    tl.label('patron');
    tl.caption(9, 'Un patrón', 'Lo que se queda no es la materia. Es la forma, el ritmo: un dibujo.');
    tl.with(2.5, { rate: 0.04, lejos: 1.4 });
    tl.with(6, { sale: 1 }, EASE.linear);
    tl.wait(1.5);
    tl.with(5, { dib: 1 });
    tl.to(7.5, { az: -1.55, D: 3.0, ty: 1.05 });
    tl.label('solo');
    tl.caption(7, 'Se sostiene solo', 'Lo vivo no es una materia. Es un dibujo que se sostiene solo.');
    tl.to(7, { az: -2.15, D: 2.2, ty: 1.2, el: 0.06 });
    tl.label('carne');
    tl.caption(10, 'De carne', 'Y nada dice que tenga que ser de carne.');
    tl.with(6, { maq: 1 }, EASE.linear);
    tl.with(8, { blanco: 1 });
    tl.to(10, { az: -2.75, D: 3.7, ty: 0.95, el: 0.1 });

    const T = V();
    const contar = contador(LATIDOS);
    let latidos = 1;
    let fase = Math.random() * 10;
    return {
      tl,
      escalera: false,
      cuenta(): Cuenta | null {
        return null;
      },
      rotulo(p): Rotulo | null {
        const cp = tl.captionAt(p);
        return cp ? { capitulo: 'II · Lo que vive', name: cp.name, fact: cp.fact } : null;
      },
      update(f: Frame) {
        const g = (k: string) => tl.get(k, f.p);
        T.set(0, g('ty'), 0);
        camara(camera, T, g('D'), g('az'), g('el'));
        camera.near = 0.01;
        camera.far = 100;
        camera.updateProjectionMatrix();
        stage.bloom.strength = 0.55;
        stage.bloom.radius = 0.55;
        stage.bloom.threshold = 0.14;
        const luz = g('luz');
        latidos = contar(f.time);
        fijarLatidos(latidos);
        fase += f.dt * g('rate');

        enfocar(cuerpo, f.focal, f.dpr, f.time);
        cuerpo.u.uMaxPx.value = 6 * f.dpr;
        cuerpo.u.uGain.value = luz * 0.85;
        UR.uFase.value = fase;
        UR.uLejos.value = g('lejos');
        UR.uSale.value = g('sale');

        enfocar(dib, f.focal, f.dpr, f.time);
        dib.u.uMaxPx.value = 5 * f.dpr;
        dib.u.uGain.value = luz * g('dib');
        UD.uBase.value = 0.1 + 0.25 * g('dib');
        UD.uBlanco.value = g('blanco');

        enfocar(maq, f.focal, f.dpr, f.time);
        maq.u.uMaxPx.value = 5 * f.dpr;
        maq.u.uGain.value = luz * smoothstep(0, 0.15, g('maq'));
        maq.u.uK.value = g('maq');
        UM.uMaq.value = 0.4 + 0.6 * g('maq');

        enfocar(pol, f.focal, f.dpr, f.time);
        pol.u.uMaxPx.value = 4 * f.dpr;
        pol.u.uGain.value = luz * 0.9;
      },
      placa(g2, f) {
        const p = f.p;
        const a = tl.get('luz', p) * smoothstep(0.6, 1.8, p);
        if (p < tl.at('patron') + 3) {
          const k = tl.get('anos', p);
          const n = latidos + k * DIEZ_ANOS;
          const anos = k * 10;
          const linea = p < tl.at('diez') ? 'Lo que entra y sale de ti' : anos < 0.95 ? `${grupo(anos * 12)} meses` : `${anos.toFixed(1).replace('.', ',')} años`;
          reloj(g2, f, a * (1 - smoothstep(tl.at('patron') + 1, tl.at('patron') + 3, p)), grupo(n), n === 1 ? 'latido' : 'latidos', linea);
        } else if (p > tl.at('carne') + 2) {
          reloj(g2, f, smoothstep(tl.at('carne') + 2, tl.at('carne') + 4, p), '¿?', 'latidos', 'Otra materia · el mismo dibujo');
        }
      },
      dispose() {},
    };
  },
};
