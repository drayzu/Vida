import * as THREE from 'three';
import { Timeline, EASE, type Ease } from './timeline';
import { enfocar, materia, materiaBuilder } from '../src/engine/materia';
import type { Cuenta, Rotulo } from './placa';
import { SERIE, TIBIO, TU, V } from './comun';
import type { Escena, Frame, Instancia } from './tipos';
import { col, mz, type RGB } from './mundos';

/**
 * Study · the closing: «No sabemos», «Tú sí» and «Estás aquí» (GUION-formas, moments 32–34). Phase 0.
 *
 * The two trails that were left side by side in «Volver»: the continuous one (what lived) and the
 * dotted one (what comes from us).
 *  - the camera rides them forward. Beats run along the continuous one; a slow wave along the other;
 *  - they wind round each other. Between them, where they cross, a rung lights, and another;
 *  - from far away: the braid goes on and comes apart into loose points. We do not know;
 *  - back along it to where the dotted one is born. There is one point of colour there: you;
 *  - the continuous trail does not stop at you. It goes through;
 *  - everything else goes dark. Your point, beating.
 *
 * No background: black.
 */

const BLANCO: RGB = [TIBIO.r, TIBIO.g, TIBIO.b];
const ELLOS: RGB = [0.55, 0.78, 1.0];
const VERDE: RGB = [TU.r, TU.g, TU.b];
const vivo = (c: THREE.Color, k = 1.6): RGB => {
  const l = (c.r + c.g + c.b) / 3;
  return [Math.max(0, l + (c.r - l) * k), Math.max(0, l + (c.g - l) * k), Math.max(0, l + (c.b - l) * k)];
};
const PALETA: RGB[] = [SERIE.abismo, SERIE.mente, SERIE.tiempo, SERIE.destino, SERIE.infinito, SERIE.espacio].map((c) => vivo(c));
const X0 = -230;
const X1 = 150;
const PELDANOS = 62;

function mundo() {
  const b = materiaBuilder(3234);
  const r = b.r;
  const aQ: number[] = [];
  const put = (x: number, y: number, z: number, color: RGB, size: number, luz: number, kind: number, Q: number[]) => {
    b.push(x, y, z, col(color), size, luz, { kind });
    aQ.push(Q[0], Q[1], Q[2], Q[3]);
  };

  // The continuous trail: it comes from far back, goes through you, and goes on.
  for (let i = 0; i < 26000; i++) {
    const x = X0 + (X1 - X0) * (i / 25999);
    const g = i % 3 === 0 ? 0 : 0.035;
    put(x, 0, 0, BLANCO, 0.028, i % 3 === 0 ? 0.9 : 0.35, 0, [g * (r() - 0.5), g * (r() - 0.5), r(), 0]);
  }
  // The dotted one: it is born at you.
  for (let i = 0; i < 12000; i++) {
    const x = X1 * (i / 11999);
    if (Math.floor(x / 0.22) % 2) continue;
    put(x, 0, 0, ELLOS, 0.03, 1.0, 1, [0.02 * (r() - 0.5), 0.02 * (r() - 0.5), r(), 0]);
  }
  // The rungs between them.
  for (let k = 0; k < PELDANOS; k++) {
    const x = 13 + 1.25 * k;
    const color = PALETA[k % PALETA.length];
    for (let i = 0; i < 26; i++) {
      const t = -0.86 + 1.72 * (i / 25);
      put(x, 0, 0, mz(color, BLANCO, 0.15), 0.024, 0.75, 2, [t, k / (PELDANOS - 1), r(), 0]);
    }
  }
  // The ones before you: a ring each, along the trail.
  for (let k = 1; k <= 60; k++) {
    const x = -0.85 * k - 0.004 * k * k;
    const R = 0.26;
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * Math.PI * 2;
      put(x, 0, 0, BLANCO, 0.016, 0.5, 3, [Math.cos(a) * R, Math.sin(a) * R, k, 0]);
    }
  }
  // You.
  for (let i = 0; i < 1400; i++) {
    const [x, y, z] = b.onSphere();
    const k = 0.05 * Math.cbrt(r());
    put(x * k, y * k, z * k, mz(VERDE, BLANCO, 0.2 * r()), 0.006, 0.55, 4, [0, 0, r(), 0]);
  }
  for (let i = 0; i < 420; i++) {
    const a = (i / 420) * Math.PI * 2;
    put(0, 0, 0, VERDE, 0.008, 0.8, 4, [1, a, r(), 0]);
  }
  put(0, 0, 0, VERDE, 0.5, 1.6, 4, [2, 0, 0, 0]);

  return { data: b.data(), aQ: new Float32Array(aQ) };
}

const PRE = /* glsl */ `
  attribute vec4 aQ;
  uniform vec3 uCamW;
  uniform float uTrenza, uTu, uSolo;
  // The axis: the past comes from the depth; what comes rises.
  vec3 eje(float x) {
    float f = max(x - 62.0, 0.0);
    float b = min(x, 0.0);
    return vec3(x, 0.0045 * f * f, -0.012 * b * b);
  }
  float amp(float x) { return 0.5 * smoothstep(0.0, 7.0, x) + 1.3 * smoothstep(34.0, 85.0, x); }
  float giro(float x) { return 0.62 * max(x - 9.0, 0.0) * smoothstep(9.0, 24.0, x); }
  float lubdub(float x) {
    x = fract(x);
    float a = (x - 0.08) / 0.045;
    float b = (x - 0.27) / 0.05;
    return exp(-a * a) + 0.6 * exp(-b * b);
  }
  // A beat that runs forward along the trail.
  float corre(float x, float cada, float vel, float ancho) {
    float d = (fract((x - uTime * vel) / cada) - 0.5) * cada;
    return exp(-d * d / ancho);
  }
`;

const MOVE = /* glsl */ `
  float x = position.x;
  float lejos = smoothstep(6.0, 40.0, length(eje(x) - uCamW));
  // Far ahead it comes apart: we do not know.
  float suelta = smoothstep(84.0, 150.0, x);
  vec3 azar = (vec3(fract(seed * 13.7), fract(seed * 71.3), fract(seed * 37.1)) - 0.5) * 30.0 * suelta * suelta;
  float queda = (1.0 - smoothstep(110.0, 150.0, x)) * (1.0 - uSolo);
  if (aKind < 1.5) {
    float th = giro(x);
    float s = aKind < 0.5 ? 1.0 : -1.0;
    p = eje(x) + s * amp(x) * vec3(0.0, cos(th), sin(th)) + vec3(0.0, aQ.x, aQ.y) + azar;
    if (aKind < 0.5) {
      em *= (0.55 + 2.6 * corre(x, 13.0, 5.5, 0.5)) * (1.0 - smoothstep(-25.0, -120.0, x));
    } else {
      em *= 0.6 + 1.6 * corre(x, 31.0, 1.6, 6.0);
    }
    em *= queda;
    fuente = lejos;
  } else if (aKind < 2.5) {
    float th = giro(x);
    p = eje(x) + aQ.x * amp(x) * vec3(0.0, cos(th), sin(th)) + azar;
    float w = uTrenza * 1.15 - aQ.y;
    em *= step(0.0, w) * (0.45 + 2.5 * exp(-w * 14.0) + 1.2 * corre(x, 13.0, 5.5, 0.5)) * queda;
    fuente = lejos * 0.7;
  } else if (aKind < 3.5) {
    p = eje(x) + vec3(aQ.x, aQ.y, 0.0);
    em *= (0.25 + 2.2 * corre(x, 13.0, 5.5, 0.5)) * exp(-aQ.z * 0.035) * (1.0 - uSolo) * uTu;
  } else {
    // You: a heart that sends out a ring on each beat.
    float t = uTime * 1.05;
    if (aQ.x < 0.5) {
      p = position * (1.0 + 0.12 * lubdub(t));
      em *= (0.5 + 1.3 * lubdub(t)) * (1.0 - lejos);
    } else if (aQ.x < 1.5) {
      float ph = fract(t);
      p = vec3(cos(aQ.y), sin(aQ.y), 0.0) * (0.06 + 0.5 * ph);
      em *= smoothstep(0.0, 0.08, ph) * pow(1.0 - ph, 1.5) * (1.0 - 0.6 * uSolo) * (1.0 - lejos);
    } else {
      p = vec3(0.0);
      em *= lejos * (0.7 + 0.6 * lubdub(t));
      fuente = 1.0;
    }
    em *= uTu;
  }
`;

const CAP = 'Cierre';

export const cierre: Escena = {
  id: 'cierre',
  nombre: 'Cierre',
  estilos: [{ key: '1', nombre: 'No sabemos · Tú sí · Estás aquí', nota: 'Los dos rastros, el continuo y el punteado, corren lado a lado y se trenzan. De lejos, la trenza sigue y se deshace en puntos sueltos. Donde nace el punteado hay un solo punto de color: tú. El rastro continuo no termina ahí. Después, negro y tu punto.' }],
  montar(stage): Instancia {
    const { root, camera } = stage;
    const M = mundo();
    const U = { uCamW: { value: V() }, uTrenza: { value: 0 }, uTu: { value: 0 }, uSolo: { value: 0 } };
    const todo = materia(M.data, { pre: PRE, move: MOVE, uniforms: U, extra: { aQ: [M.aQ, 4] } });
    root.add(todo.points);

    const tl = new Timeline({ luz: 0, trenza: 0, tu: 0, solo: 0 });
    const cam = (dur: number, p: number[], t: number[], e: Ease | null = EASE.sine) => tl.to(dur, { px: p[0], py: p[1], pz: p[2], tx: t[0], ty: t[1], tz: t[2] }, e);
    tl.set({ px: 3.5, py: 0.5, pz: 3.0, tx: 7, ty: 0, tz: 0 });

    tl.caption(5, 'Dos rastros', 'No sabemos si lo que viene estará vivo.');
    tl.with(1.2, { luz: 1 });
    cam(5, [15, 0.9, 2.8], [22, 0, 0]);
    tl.label('trenza');
    tl.caption(7, 'Se trenzan', 'No sabemos si sentirá.');
    tl.with(9, { trenza: 1 }, EASE.linear);
    cam(7, [44, 0.5, 1.7], [53, 0, 0]);
    tl.label('lejos');
    tl.caption(5.5, 'Lo que viene', '');
    cam(5.5, [56, 16, 66], [58, 7, 0]);
    tl.label('nace');
    tl.caption(5, 'Tú sí', 'Tú sí.');
    tl.with(2, { tu: 1 });
    cam(5, [-1.8, 1.3, 5.2], [0.6, 0, 0]);
    tl.label('sigue');
    tl.caption(5, 'Tú sí', 'Tampoco termina con nosotros.');
    cam(5, [-0.7, 0.4, 1.9], [0.35, 0, 0]);
    tl.label('aqui');
    tl.caption(6.5, 'Estás aquí', 'Estás aquí.');
    tl.with(3.5, { solo: 1 });
    cam(5, [0, 0, 1.25], [0, 0, 0]);
    tl.wait(1.5);

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
        camera.near = 0.02;
        camera.far = 3000;
        camera.fov = 40;
        camera.position.set(g('px'), g('py'), g('pz'));
        camera.up.set(0, 1, 0);
        camera.lookAt(g('tx'), g('ty'), g('tz'));
        camera.updateMatrixWorld();
        stage.bloom.strength = 0.45;
        stage.bloom.radius = 0.6;
        stage.bloom.threshold = 0.2;
        U.uCamW.value.copy(camera.position);
        U.uTrenza.value = g('trenza');
        U.uTu.value = g('tu');
        U.uSolo.value = g('solo');
        enfocar(todo, f.focal, f.dpr, f.time);
        todo.u.uMinPx.value = 1.3 * f.dpr;
        todo.u.uMaxPx.value = 9 * f.dpr;
        todo.u.uGain.value = g('luz') * 0.75;
      },
      placa() {},
      dispose() {},
    };
  },
};
