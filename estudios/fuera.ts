import * as THREE from 'three';
import { Timeline, EASE, type Ease } from './timeline';
import { enfocar, materia, materiaBuilder } from '../src/engine/materia';
import { clamp, lerp, smoothstep } from '../src/engine/math';
import { FONT, grupo, ink, type Cuenta, type Rotulo } from './placa';
import { TIBIO, V } from './comun';
import type { Escena, Frame, Instancia } from './tipos';
import { col, mz, type RGB } from './mundos';

/**
 * Study · «Fuera del cuerpo» (GUION-formas, moment 21). Phase 0.
 *
 * The script had three still pictures (a hand on the rock, signs in rows, rows of equal points) and
 * one point that hums. Here it is one line that somebody follows:
 *  - a living hand, with its pulse, rests on the rock. Pigment is blown over it. The hand leaves and
 *    its shape stays: the first thing kept outside a body. It does not beat;
 *  - other hands come, of other colours. A wall of them;
 *  - along the wall the marks get smaller and line up: signs, written one after another by a tip of
 *    light that carries the colour of the hand;
 *  - the signs lose their strokes until they are points, all the same;
 *  - one of them starts to beat like the hand did. Then faster, until it hums: in one second, the
 *    beats of a whole human life;
 *  - and the points start to move on their own.
 *
 * The colour rule: what lives is colour (the hand, the tip that writes, the point that hums, the
 * points that move). What is kept is pale and still.
 */

const BLANCO: RGB = [TIBIO.r, TIBIO.g, TIBIO.b];
const OCRE: RGB = [1.0, 0.42, 0.16];
const PIGMENTOS: RGB[] = [
  [1.0, 0.3, 0.14],
  [1.0, 0.55, 0.2],
  [1.0, 0.8, 0.38],
  [0.95, 0.9, 0.82],
  [0.8, 0.36, 0.5],
];
const PASO = 0.2;
const X_SIGNOS = 9;
const X_PUNTOS = 33.2;
const COLS = 194;
const FILAS = 17;
const HEROE = V(X_PUNTOS + PASO * 94, 0, 0);

/** The hand as a union of capsules: [ax, ay, bx, by, r]. Negative inside. */
const MANO: number[][] = [
  [-0.02, -0.3, 0.0, -0.04, 0.2],
  [-0.13, 0.08, -0.215, 0.44, 0.05],
  [-0.035, 0.12, -0.06, 0.55, 0.052],
  [0.07, 0.1, 0.11, 0.47, 0.05],
  [0.165, 0.03, 0.26, 0.29, 0.042],
  [-0.15, -0.22, -0.41, 0.03, 0.058],
  [0.02, -0.45, 0.1, -1.7, 0.125],
];
function manoDist(x: number, y: number) {
  let d = 1e9;
  for (const [ax, ay, bx, by, r] of MANO) {
    const vx = bx - ax;
    const vy = by - ay;
    const t = clamp(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy), 0, 1);
    d = Math.min(d, Math.hypot(x - ax - vx * t, y - ay - vy * t) - r);
  }
  return d;
}

function mundo() {
  const b = materiaBuilder(2121);
  const r = b.r;
  const aQ: number[] = [];
  const aC: number[] = [];
  const put = (x: number, y: number, z: number, color: RGB, size: number, luz: number, kind: number, Q: number[], C: number[] = [0, 0, 0]) => {
    b.push(x, y, z, col(color), size, luz, { kind });
    aQ.push(Q[0], Q[1], Q[2], Q[3]);
    aC.push(C[0], C[1], C[2]);
  };

  // The rock: strata and grain. It thins out where the signs become points.
  const vetas = Array.from({ length: 16 }, () => [-4.5 + 9 * r(), 0.3 + 0.7 * r(), r() * 6.28, 0.12 + 0.3 * r()]);
  for (let i = 0; i < 120000; i++) {
    const x = -13 + 50 * r();
    if (r() > 1 - smoothstep(14, 36, x)) continue;
    let y = -4.5 + 9 * r();
    let luz = 0.22 + 0.25 * r();
    if (r() < 0.5) {
      const v = vetas[Math.floor(r() * vetas.length)];
      y = v[0] + v[3] * Math.sin(x * v[1] + v[2]) + 0.03 * (r() - 0.5) * (1 + 6 * r() * r());
      luz *= 1.5;
    }
    const z = -0.06 - 0.2 * (0.5 + 0.5 * Math.sin(x * 1.7 + Math.sin(y * 2.3) * 2)) - 0.1 * r();
    put(x, y, z, mz([0.62, 0.5, 0.42], [0.45, 0.47, 0.55], r()), 0.013, luz, 0, [r(), 0, 0, 0]);
  }

  // The living hand.
  for (let i = 0; i < 11000; ) {
    const x = -0.6 + 1.2 * r();
    const y = -1.7 + 2.4 * r();
    const d = manoDist(x, y);
    if (d > 0) continue;
    i++;
    const borde = Math.exp(d / 0.025);
    put(x, y, 0.03 + 0.03 * r(), mz(OCRE, BLANCO, 0.25 + 0.3 * r()), 0.011, 0.35 + 0.9 * borde, 1, [d, smoothstep(-1.7, -0.5, y), r(), 0]);
  }

  // The marks: pigment around where a hand was.
  const marca = (cx: number, cy: number, s: number, rot: number, espejo: number, color: RGB, n: number, turno: number) => {
    const c = Math.cos(rot);
    const sn = Math.sin(rot);
    for (let i = 0; i < n; ) {
      const lx = -1 + 2 * r();
      const ly = -1.25 + 2.3 * r();
      const d = manoDist(lx, ly);
      if (d <= 0 || r() > Math.exp(-d / 0.15) + 0.015) continue;
      i++;
      const x = lx * espejo * s;
      const y = ly * s;
      put(cx + x * c - y * sn, cy + x * sn + y * c, 0.004 * r(), mz(color, BLANCO, 0.25 * r()), 0.012, 0.5 + 0.5 * r(), 2, [r(), turno, r(), s], [cx, cy, 0]);
    }
  };
  marca(0, 0, 1, 0, 1, OCRE, 9000, -1);
  const puestas: number[][] = [[0, 0]];
  for (let k = 0; k < 400 && puestas.length < 46; k++) {
    const cx = -8 + 16.5 * r();
    const cy = -2.5 + 5 * r();
    if (puestas.some(([x, y]) => Math.hypot(x - cx, y - cy) < 1.05)) continue;
    puestas.push([cx, cy]);
    marca(cx, cy, 0.72 + 0.3 * r(), (r() - 0.5) * 1.1, r() < 0.3 ? -1 : 1, PIGMENTOS[Math.floor(r() * PIGMENTOS.length)], 2600, r());
  }

  // The signs: strokes in rows, written column by column. They lose strokes until they are points.
  const trazo = (x0: number, y0: number, x1: number, y1: number, orden: number, cuna: number) => {
    const n = Math.max(9, Math.round(Math.hypot(x1 - x0, y1 - y0) / 0.012));
    for (let k = 0; k < n; k++) {
      const t = k / (n - 1);
      const ancho = 0.004 + cuna * 0.02 * (1 - t) * (1 - t);
      put(lerp(x0, x1, t) + ancho * (r() - 0.5), lerp(y0, y1, t) + ancho * (r() - 0.5), 0.01, BLANCO, 0.011, 0.75 + 0.5 * (1 - cuna), 3, [orden + 0.02 * t, r(), 0, 0]);
    }
  };
  const columnas = Math.round((X_PUNTOS - X_SIGNOS) / 0.4);
  for (let c = 0; c < columnas; c++) {
    for (let f = 0; f < 9; f++) {
      const s = c / (columnas - 1);
      const x = X_SIGNOS + 0.4 * c + 0.2;
      const y = 1.6 - 0.4 * f;
      const orden = x - 0.2 + 0.36 * (f / 9);
      const e = 0.15 * (1 - 0.3 * s);
      if (s < 0.07) {
        // The first signs are still hands.
        for (let k = 0; k < 5; k++) {
          const a = Math.PI / 2 + (k - 2) * 0.36 + (k === 0 ? 0.5 : 0);
          trazo(x + 0.03 * Math.cos(a), y - 0.06 + 0.03 * Math.sin(a), x + e * 1.1 * Math.cos(a), y - 0.06 + e * 1.1 * Math.sin(a), orden + 0.005 * k, 0);
        }
      } else if (s < 0.26) {
        // Counting: strokes side by side, and sometimes one across.
        const n = 1 + Math.floor(r() * 5);
        for (let k = 0; k < n; k++) {
          const xx = x + (k - (n - 1) / 2) * 0.055;
          trazo(xx + 0.015, y + e, xx - 0.015, y - e, orden + 0.005 * k, 0.4);
        }
        if (n === 5 || r() < 0.2) trazo(x - 0.16, y - 0.05, x + 0.16, y + 0.07, orden + 0.03, 0.4);
      } else {
        // Signs: a few strokes on a small lattice, fewer and shorter each time.
        const fin = smoothstep(0.72, 1, s);
        const n = Math.max(1, Math.round((2 + Math.floor(r() * 3)) * (1 - fin)));
        for (let k = 0; k < n; k++) {
          const ax = Math.floor(r() * 3) - 1;
          const ay = Math.floor(r() * 3) - 1;
          let bx = Math.floor(r() * 3) - 1;
          let by = Math.floor(r() * 3) - 1;
          if (bx === ax && by === ay) {
            bx = -ax;
            by = ay === 0 ? 1 : -ay;
          }
          const m = 1 - 0.94 * fin;
          const ox = n === 1 ? 0 : ax * e * (1 - fin);
          const oy = n === 1 ? 0 : ay * e * (1 - fin);
          trazo(x + ox, y + oy, x + ox + (bx - ax) * e * m, y + oy + (by - ay) * e * m, orden + 0.005 * k, 1 - fin);
        }
      }
    }
  }

  // The points: all the same. On or off.
  for (let c = 0; c < COLS; c++) {
    for (let f = 0; f < FILAS; f++) {
      const x = X_PUNTOS + PASO * c;
      const y = 1.6 - PASO * f;
      if (Math.abs(x - HEROE.x) < 0.01 && Math.abs(y) < 0.01) continue;
      const Q = [x + 0.18 * (f / FILAS), r(), r(), r()];
      for (let k = 0; k < 40; k++) {
        const a = r() * 6.283;
        const rad = 0.032 * Math.sqrt(r());
        put(x + rad * Math.cos(a), y + rad * Math.sin(a), 0.01, BLANCO, 0.012, 0.3, 4, Q, [x, y, 0]);
      }
    }
  }

  // The one that beats.
  for (let k = 0; k < 2600; k++) {
    const a = r() * 6.283;
    const rad = 0.036 * Math.sqrt(r());
    put(HEROE.x + rad * Math.cos(a), rad * Math.sin(a), 0.012, mz(OCRE, BLANCO, 0.35 * (1 - rad / 0.036)), 0.006, 0.5, 5, [rad / 0.036, r(), r(), 0], [HEROE.x, 0, 0]);
  }
  for (let j = 0; j < 4; j++) {
    for (let k = 0; k < 220; k++) put(HEROE.x, 0, 0.012, OCRE, 0.007, 0.8, 6, [j / 4, (k / 220) * 6.283, r(), j], [HEROE.x, 0, 0]);
  }
  for (let k = 0; k < 40; k++) {
    const a = r() * 6.283;
    const rad = 0.032 * Math.sqrt(r());
    put(HEROE.x + rad * Math.cos(a), rad * Math.sin(a), 0.01, mz(OCRE, BLANCO, 0.3), 0.012, 0.35, 7, [0, 0, 0, 0], [HEROE.x, 0, 0]);
  }

  return { data: b.data(), aQ: new Float32Array(aQ), aC: new Float32Array(aC) };
}

const PRE = /* glsl */ `
  attribute vec4 aQ;
  attribute vec3 aC;
  uniform vec3 uCamW, uHeroe;
  uniform float uMano, uSopla, uManos, uEscribe, uZum, uFase, uSolos;
  float lubdub(float x) {
    x = fract(x);
    float a = (x - 0.08) / 0.045;
    float b = (x - 0.27) / 0.05;
    return exp(-a * a) + 0.6 * exp(-b * b);
  }
`;

const MOVE = /* glsl */ `
  vec3 ocre = vec3(1.0, 0.42, 0.16);
  vec3 tibio = vec3(1.0, 0.89, 0.8);
  if (aKind < 0.5) {
    // The rock is seen by the light of what lives near it: the hand, the tip that writes.
    float dm = dot(p.xy, p.xy);
    float df = (p.x - uEscribe) / 1.6;
    em = em * (0.9 + 0.5 * uManos) + em * ocre * (2.6 * uMano * exp(-dm / 0.9) + 1.6 * exp(-df * df) * step(8.0, uEscribe));
  } else if (aKind < 1.5) {
    // The living hand: it comes, rests, and goes. The pulse runs from the wrist to the fingers.
    float f = 1.0 - uMano;
    p += vec3(0.25, -1.0, 2.3) * f * f + vec3(0.0, 0.0, 0.25) * f;
    float pulso = lubdub(uTime * 1.1 - (p.y + 1.7) * 0.22);
    em *= (0.4 + 1.3 * pulso) * smoothstep(0.0, 0.3, uMano) * aQ.y;
  } else if (aKind < 2.5) {
    // Pigment: blown from a mouth, it lands around the hand.
    float s = aQ.y < 0.0 ? uSopla : clamp((uManos - aQ.y * 0.74) / 0.26, 0.0, 1.0);
    float t = clamp((s - aQ.x * 0.62) / 0.38, 0.0, 1.0);
    float e = 1.0 - pow(1.0 - t, 3.0);
    vec3 boca = aC + vec3(0.55, -0.25, 1.9) * aQ.w;
    p = mix(boca, p, e) + vec3(0.0, 0.25, 0.0) * sin(e * 3.1416) * aQ.z;
    em *= step(0.0005, t) * mix(0.9, 0.75, smoothstep(0.85, 1.0, t)) * (aQ.y < 0.0 ? 1.0 : 2.0);
  } else if (aKind < 3.5) {
    // A sign: written once, and it stays.
    float w = uEscribe - aQ.x;
    em = mix(em * 1.5, ocre * 3.0, exp(-max(w, 0.0) * 2.2)) * step(0.0, w);
  } else if (aKind < 4.5) {
    // A point: on or off. Later some of them leave their place.
    float w = uEscribe - aQ.x;
    float mueve = step(aQ.z, uSolos * 0.55) * step(0.001, uSolos);
    float tt = max(0.0, uSolos - aQ.z / 0.55) * (8.0 + 14.0 * aQ.w);
    float ang = floor(aQ.w * 4.0) * 1.5708;
    float salto = floor(tt) + smoothstep(0.5, 1.0, fract(tt));
    float libre = smoothstep(0.45, 1.0, uSolos) * mueve;
    p.xy += mueve * (vec2(cos(ang), sin(ang)) * ${PASO.toFixed(2)} * salto + libre * 0.5 * vec2(sin(tt * 0.8 + aQ.w * 90.0), cos(tt * 0.63 + aQ.y * 70.0)));
    float corre = uSolos * (10.0 + 30.0 * aQ.z);
    float bit = step(0.5, fract(aQ.y * 17.0 + floor(corre + aQ.y * 7.0) * 0.618));
    vec3 propio = 0.55 + 0.45 * cos(6.283 * (aQ.w * 3.0 + vec3(0.0, 0.33, 0.67)));
    em = mix(em * mix(0.1, 1.0, bit), propio * 0.9, mueve);
    em = mix(em, ocre * 2.5, exp(-max(w, 0.0) * 2.2)) * step(0.0, w);
  } else {
    // The one that beats. First like the hand; then faster, until it hums.
    float hum = smoothstep(0.55, 0.95, uZum);
    float d = length(aC - uCamW);
    float cerca = 1.0 - smoothstep(1.2, 2.6, d);
    float escrito = step(aC.x, uEscribe);
    p += uHeroe;
    if (aKind < 5.5) {
      p.xy += 0.003 * hum * vec2(sin(uTime * 71.0 + seed * 90.0), cos(uTime * 83.0 + seed * 50.0));
      float pulso = lubdub(uFase + 0.05 - aQ.x * 0.08);
      float b = mix(0.2 + 1.5 * pulso, 1.1 + 0.25 * sin(uTime * 47.0 + seed * 100.0), hum);
      em *= b * cerca * escrito;
    } else if (aKind < 6.5) {
      float fr = fract(uFase + aQ.x);
      float rr = mix(0.04 + 0.3 * fr, 0.04 + 0.3 * aQ.z * aQ.z, hum);
      p.xy += vec2(cos(aQ.y), sin(aQ.y)) * rr;
      float w = aQ.w < 0.5 ? 1.0 : smoothstep(0.3, 0.55, uZum);
      float b = mix(pow(1.0 - fr, 1.6) * smoothstep(0.0, 0.06, fr), 0.5 + 0.3 * sin(uTime * 39.0 + seed * 80.0), hum);
      em *= b * w * step(0.001, uZum) * (0.25 + 0.75 * cerca) * (1.0 - 0.5 * smoothstep(0.3, 1.0, uSolos));
    } else {
      em *= (1.0 - cerca) * escrito * (1.0 + 1.5 * step(0.001, uZum));
    }
  }
`;

const HOPS = [
  [1, 0],
  [1, 0],
  [0, 1],
  [1, 0],
  [0, 1],
  [1, 0],
  [1, 0],
  [0, -1],
  [1, 0],
  [1, 0],
];

const CAP = 'II · No es para nosotros';

export const fuera: Escena = {
  id: 'fuera',
  nombre: 'Fuera del cuerpo',
  estilos: [{ key: '1', nombre: 'Fuera del cuerpo', nota: 'Una mano viva se apoya en la roca; soplan pigmento y, cuando se va, queda su forma. Vienen otras. Las marcas se ordenan en signos, los signos pierden trazos hasta ser puntos iguales. Uno late como latía la mano, cada vez más rápido, hasta zumbar. Y los puntos empiezan a moverse solos.' }],
  montar(stage): Instancia {
    const { root, camera } = stage;
    const M = mundo();
    const U = {
      uCamW: { value: V() },
      uHeroe: { value: V() },
      uMano: { value: 0 },
      uSopla: { value: 0 },
      uManos: { value: 0 },
      uEscribe: { value: 0 },
      uZum: { value: 0 },
      uFase: { value: 0 },
      uSolos: { value: 0 },
    };
    const todo = materia(M.data, { pre: PRE, move: MOVE, uniforms: U, extra: { aQ: [M.aQ, 4], aC: [M.aC, 3] } });
    root.add(todo.points);

    const tl = new Timeline({ luz: 0, mano: 0, sopla: 0, manos: 0, zum: 0, solos: 0, reloj: 1 });
    const cam = (dur: number, p: number[], t: number[], e: Ease | null = null) => tl.to(dur, { cx: p[0], cy: p[1], cz: p[2], tx: t[0], ty: t[1] }, e);
    tl.set({ cx: 0.5, cy: -0.15, cz: 3.4, tx: 0, ty: -0.05 });

    tl.caption(4.5, 'Una mano', 'Una mano viva, contra la roca.');
    tl.with(1.2, { luz: 1 });
    tl.with(3.2, { mano: 1 }, EASE.out);
    cam(4.5, [0.2, -0.05, 2.7], [0, 0], EASE.sine);
    tl.label('sopla');
    tl.caption(5.4, 'Queda', 'Para no olvidar, empezamos a guardar fuera del cuerpo.');
    tl.with(2.8, { sopla: 1 }, EASE.linear);
    cam(3, [0.05, 0, 2.5], [0, 0.02], EASE.sine);
    tl.with(2.4, { mano: 0 }, EASE.in);
    cam(2.4, [0, 0, 2.8], [0, 0.02], EASE.sine);
    tl.label('otras');
    tl.caption(4.5, 'Otras', 'La mano se va. La marca se queda.');
    tl.with(4.5, { manos: 1 }, EASE.linear);
    cam(4.5, [1.5, 0, 8.6], [1.5, 0], EASE.sine);
    tl.label('signos');
    tl.caption(7, 'Signos', 'Después, signos en filas.');
    cam(7, [30, 0, 4.3], [31, 0], EASE.sine);
    tl.label('puntos');
    tl.caption(5, 'Puntos iguales', 'Después, puntos. Todos iguales.');
    cam(5, [HEROE.x - 0.4, 0.1, 3.3], [HEROE.x, 0], EASE.sine);
    tl.label('late');
    tl.caption(3.6, 'Uno late', 'Un procesador late tres mil millones de veces por segundo.');
    tl.with(3.6, { zum: 0.5 }, EASE.linear);
    cam(3.6, [HEROE.x + 0.05, 0.02, 0.85], [HEROE.x, 0], EASE.sine);
    tl.label('zumba');
    tl.caption(4, 'Zumba', 'Es una vida humana entera.');
    tl.with(4, { zum: 1 }, EASE.linear);
    cam(4, [HEROE.x, 0, 0.62], [HEROE.x, 0], EASE.sine);
    tl.label('solos');
    tl.caption(6.5, 'Se mueven solos', 'Y un día los puntos empiezan a moverse solos.');
    tl.with(6.5, { solos: 1 }, EASE.linear);
    tl.with(2.5, { reloj: 0 });
    cam(6.5, [HEROE.x + 1.6, 0.3, 5.6], [HEROE.x + 1.6, 0.3], EASE.sine);

    const heroe = V();
    const mira = V();
    const K = 3.6;
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
        const s = g('solos');
        // The one that beats is the first to leave its place: a step, another, and then its own way.
        const t = clamp(s * 1.5, 0, 1) * HOPS.length;
        heroe.set(0, 0, 0);
        for (let i = 0; i < HOPS.length; i++) {
          const e = smoothstep(0.45, 1, clamp(t - i, 0, 1));
          heroe.x += HOPS[i][0] * PASO * e;
          heroe.y += HOPS[i][1] * PASO * e;
        }
        const libre = smoothstep(0.66, 1, s);
        heroe.x += libre * 0.5 * Math.sin((s - 0.66) * 14);
        heroe.y += libre * 0.6 * (1 - Math.cos((s - 0.66) * 11));

        camera.near = 0.02;
        camera.far = 400;
        camera.fov = 40;
        camera.position.set(g('cx') + heroe.x * 0.5, g('cy') + heroe.y * 0.5, g('cz'));
        camera.up.set(0, 1, 0);
        camera.lookAt(mira.set(g('tx') + heroe.x * 0.5, g('ty') + heroe.y * 0.5, 0));
        camera.updateMatrixWorld();
        stage.bloom.strength = 0.45;
        stage.bloom.radius = 0.6;
        stage.bloom.threshold = 0.2;
        const z = g('zum');
        U.uCamW.value.copy(camera.position);
        U.uHeroe.value.copy(heroe);
        U.uMano.value = g('mano');
        U.uSopla.value = g('sopla');
        U.uManos.value = g('manos');
        U.uEscribe.value = g('tx') + 1.3 + 40 * smoothstep(0, 0.45, z);
        U.uZum.value = z;
        U.uFase.value = z > 0.9999 ? f.time * 30 : (52 * (Math.exp(K * z) - 1)) / (Math.exp(K) - 1);
        U.uSolos.value = s;
        enfocar(todo, f.focal, f.dpr, f.time);
        todo.u.uMinPx.value = 1.3 * f.dpr;
        todo.u.uMaxPx.value = 14 * f.dpr;
        todo.u.uGain.value = g('luz') * 0.75;
      },
      placa(g2, f) {
        const g = (k: string) => tl.get(k, f.p);
        const alpha = g('luz') * g('reloj');
        if (alpha < 0.01) return;
        const x0 = g('tx');
        const z = g('zum');
        let n: string;
        let que: string;
        let linea: string;
        if (f.p >= tl.at('late')) {
          const hz = Math.pow(10, Math.log10(3e9) * Math.pow(z, 1.4));
          n = grupo(hz < 100 ? Math.round(hz) : Number(hz.toPrecision(2)));
          que = hz < 1.5 ? 'latido por segundo' : 'latidos por segundo';
          linea = z > 0.985 ? 'UN TERCIO DE NANOSEGUNDO CADA UNO · LO QUE LATE UN CORAZÓN EN OCHENTA AÑOS' : 'UN CORAZÓN LATE UNA VEZ POR SEGUNDO';
        } else {
          const a = x0 < X_SIGNOS ? 40000 * Math.pow(5000 / 40000, smoothstep(2, X_SIGNOS, x0)) : x0 < X_PUNTOS ? 5000 * Math.pow(80 / 5000, (x0 - X_SIGNOS) / (X_PUNTOS - X_SIGNOS)) : lerp(80, 0, smoothstep(X_PUNTOS, HEROE.x - 1, x0));
          const hoy = a < 1;
          n = hoy ? 'hoy' : `hace ${grupo(Number(a.toPrecision(a < 100 ? 1 : 2)))}`;
          que = hoy ? '' : 'años';
          linea = x0 < 2 ? (g('sopla') > 0.5 ? 'LA FORMA DE UNA MANO' : 'UNA MANO') : x0 < X_SIGNOS ? 'MANOS EN LA ROCA' : x0 < X_PUNTOS ? 'SIGNOS EN FILAS' : 'PUNTOS IGUALES · ENCENDIDO O APAGADO';
        }
        const u = f.u;
        const x = 44 * u;
        g2.save();
        g2.textBaseline = 'alphabetic';
        g2.shadowColor = 'rgba(0,0,0,0.85)';
        g2.shadowBlur = 12 * u;
        g2.globalAlpha = alpha * smoothstep(0.3, 1.2, f.p);
        g2.font = FONT.serif(58 * u);
        g2.fillStyle = ink();
        g2.fillText(n, x, f.H - 86 * u);
        const w = g2.measureText(n).width;
        g2.font = FONT.serif(26 * u);
        g2.fillStyle = ink(0.6);
        g2.fillText(que, x + w + 12 * u, f.H - 88 * u);
        g2.font = FONT.mono(11 * u);
        g2.letterSpacing = `${0.9 * u}px`;
        g2.fillStyle = ink(0.78);
        g2.fillText(linea, x, f.H - 52 * u);
        g2.restore();
      },
      dispose() {},
    };
  },
};
