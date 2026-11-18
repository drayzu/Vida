import * as THREE from 'three';
import { Timeline, EASE } from './timeline';
import { enfocar, materia, materiaBuilder } from '../src/engine/materia';
import { lerp, smoothstep } from '../src/engine/math';
import type { Cuenta, Rotulo } from './placa';
import { SERIE, TIBIO, TU, V } from './comun';
import type { Escena, Frame, Instancia } from './tipos';
import { col, mz, type RGB } from './mundos';
import { cuerpo } from './tu';

/**
 * Study · «Sale del agua» (GUION-formas, moment 9). Second version, 15 Nov 2026. Phase 0.
 *
 * The mirror of «Cruza», built around one frame: an animal half out of the water, propped on its
 * fins, its head raised towards the land, and behind it the surface as a line of light.
 *
 * The animal is drawn, not filled: ribs along a spine, fins with rays, eyes on top of a flat head, a
 * heart that beats. It is modelled on Tiktaalik (a fish with a neck, and with wrists inside its
 * fins). It swims with its whole body, climbs the shore, breaks the line and lifts its head.
 * Then the camera rises and follows its trail over the land, where the green grows taller, to one
 * who stands at the end of it. Everything here is real, so the trail is a continuous line.
 */

const BLANCO: RGB = [TIBIO.r, TIBIO.g, TIBIO.b];
const vivo = (c: THREE.Color, k = 2.1): RGB => {
  const l = (c.r + c.g + c.b) / 3;
  return [Math.max(0, l + (c.r - l) * k), Math.max(0, l + (c.g - l) * k), Math.max(0, l + (c.b - l) * k)];
};
const AZUL = vivo(SERIE.tiempo);
const VIOLETA = vivo(SERIE.infinito);
const AMBAR = mz(vivo(SERIE.mente), vivo(SERIE.espacio), 0.35);
const VERDE = vivo(SERIE.destino);
const CORAZON: RGB = [TU.r, TU.g, TU.b];
const LINEA: RGB = [0.25, 0.55, 1.0];

/** The ground: deep under the water, up to the shore at x = 0, then almost flat. */
const suelo = (x: number) => (x < 0 ? -9 * smoothstep(0, -34, x) : 0.5 * smoothstep(0, 14, x));
const X0 = -42;
const X1 = 1.5;
const FIN = 150;
const ESCALA = 0.48;
/** Where the animal is, and how it leans, by its place on the way. */
const lugar = (s: number, out: THREE.Vector3) => {
  const x = lerp(X0, X1, s);
  // It swims clear of the bottom; at the shore its belly rests on the ground.
  const a = suelo(x) + lerp(0.55, 1.7, smoothstep(-2, -14, x));
  // A soft corner where it leaves the deep and starts up the slope.
  return out.set(x, 0.5 * (a - 5.4 + Math.sqrt((a + 5.4) * (a + 5.4) + 1.5)), 0);
};
const _a = V();
const _b = V();
const cuesta = (s: number) => {
  lugar(Math.max(0, s - 0.06), _a);
  lugar(Math.min(1, s + 0.06), _b);
  return Math.atan2(_b.y - _a.y, _b.x - _a.x);
};

// The animal's profile from the tip of the tail (t = 0) to the snout (t = 1): half-width and half-height.
const TS = [0, 0.15, 0.3, 0.45, 0.6, 0.72, 0.85, 0.94, 1];
const ANCHO = [0.04, 0.16, 0.4, 0.78, 1.05, 1.22, 1.34, 1.08, 0.42];
const ALTO = [0.2, 0.42, 0.54, 0.62, 0.62, 0.55, 0.4, 0.29, 0.12];
const perfil = (ys: number[], t: number) => {
  let i = 0;
  while (i < TS.length - 2 && t > TS[i + 1]) i++;
  const u = (t - TS[i]) / (TS[i + 1] - TS[i]);
  const p0 = ys[Math.max(0, i - 1)], p1 = ys[i], p2 = ys[i + 1], p3 = ys[Math.min(ys.length - 1, i + 2)];
  return 0.5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (3 * p1 - p0 - 3 * p2 + p3) * u * u * u);
};
const LARGO = 12;
const xDe = (t: number) => (t - 0.5) * LARGO;

function mundo() {
  const b = materiaBuilder(953);
  const r = b.r;
  const aL: number[] = [];
  const aN: number[] = [];
  const aQ: number[] = [];
  const O = V();
  const put = (kind: number, p: THREE.Vector3, color: RGB, size: number, luz: number, Q: number[], N: THREE.Vector3 = O) => {
    b.push(p.x, p.y, p.z, col(color), size, luz, { kind });
    aL.push(p.x, p.y, p.z);
    aN.push(N.x, N.y, N.z);
    aQ.push(Q[0], Q[1], Q[2], Q[3]);
  };

  // ── The animal, in its own frame: x along the body, y up, z to its side. ──
  /** A point of its skin: `t` along the body, `a` around it. The belly is flatter than the back. */
  const piel = (t: number, a: number) => {
    const w = perfil(ANCHO, t);
    const h = perfil(ALTO, t);
    const c = Math.cos(a);
    const s = Math.sin(a);
    const e = 2 / 2.6;
    const z = w * Math.sign(c) * Math.pow(Math.abs(c), e);
    const y = h * Math.sign(s) * Math.pow(Math.abs(s), e) * (s < 0 ? 0.72 : 1);
    return { p: V(xDe(t), y, z), n: V(0, y / (h * h), z / (w * w)).normalize() };
  };
  const tono = (t: number) => mz(mz(AZUL, VERDE, smoothstep(0.1, 0.7, t)), BLANCO, 0.12);
  // Ribs: one ring after another along the spine.
  for (let k = 0; k < 58; k++) {
    const t = lerp(0.035, 0.985, k / 57);
    const n = Math.round(46 + 120 * perfil(ANCHO, t));
    for (let i = 0; i < n; i++) {
      const { p, n: nn } = piel(t, ((i + r()) / n) * Math.PI * 2);
      put(1, p, tono(t), 0.034, 0.95, [p.x, 0, 0, 0], nn);
    }
  }
  // The lines that run its length: back, flanks, belly.
  for (const a of [Math.PI / 2, 0.32, Math.PI - 0.32, 1.0, Math.PI - 1.0, -Math.PI / 2]) {
    for (let i = 0; i < 620; i++) {
      const t = lerp(0.02, 0.995, (i + r()) / 620);
      const { p, n } = piel(t, a);
      put(1, p, tono(t), 0.032, a === Math.PI / 2 ? 1.2 : 0.8, [p.x, 0, 0, 0], n);
    }
  }
  // The skin between them: faint, so the edge of the body takes the light.
  for (let i = 0; i < 26_000; i++) {
    const t = Math.pow(r(), 0.75);
    const { p, n } = piel(t, r() * Math.PI * 2);
    put(1, p, tono(t), 0.03, 0.34, [p.x, 0, 0, 0], n);
  }
  // The mouth: a line along each side of the flat head.
  for (const lado of [-1, 1]) {
    for (let i = 0; i < 260; i++) {
      const t = lerp(0.8, 1, i / 260);
      const { p, n } = piel(t, lado > 0 ? -0.12 : Math.PI + 0.12);
      put(2, p, mz(VERDE, BLANCO, 0.5), 0.034, 0.9, [p.x, 0, 0, 0], n);
    }
    // The eyes: on top of the head, looking up.
    const t = 0.87;
    const c = V(xDe(t), perfil(ALTO, t) * 1.02, lado * perfil(ANCHO, t) * 0.5);
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * Math.PI * 2;
      put(2, c.clone().add(V(Math.cos(a) * 0.2, 0.03, Math.sin(a) * 0.17)), BLANCO, 0.03, 1.2, [c.x, 0, 0, 0]);
    }
    put(3, c.clone().add(V(0, 0.05, 0)), BLANCO, 0.11, 2.4, [c.x, 0, 0, 0]);
  }
  // The spine: a row of lights inside.
  for (let i = 0; i < 64; i++) {
    const t = lerp(0.05, 0.82, i / 63);
    put(3, V(xDe(t), perfil(ALTO, t) * 0.3, 0), AMBAR, 0.075, 0.9, [xDe(t), 0, 0, 0]);
  }
  // The fringe of the tail: short rays above and below.
  for (let k = 0; k < 46; k++) {
    const t = lerp(0.005, 0.36, k / 45);
    const f = 0.95 * Math.pow(Math.max(0, Math.sin((Math.PI * t) / 0.36)), 0.6);
    for (const lado of [1, -0.7]) {
      const y0 = perfil(ALTO, t) * (lado > 0 ? 1 : 0.72) * Math.sign(lado);
      for (let i = 0; i < 16; i++) {
        const u = i / 15;
        put(2, V(xDe(t) - 0.4 * u * u, y0 + lado * f * u, 0), mz(AZUL, AMBAR, 0.25 + 0.5 * u), 0.03, 0.75 * (1 - 0.5 * u), [xDe(t), 0, 0, 0]);
      }
    }
  }
  /** A fin with an arm inside: shoulder, elbow, wrist, and a fan of rays. `q` goes from 0 at the root to 1 at the tips, which stay on the ground. */
  const aleta = (R: THREE.Vector3, E: THREE.Vector3, W: THREE.Vector3, rayos: number, largo: number, lado: number) => {
    const hueso = (A: THREE.Vector3, B: THREE.Vector3, ra: number, rb: number, q0: number, q1: number) => {
      const eje = B.clone().sub(A).normalize();
      const u = V(0, 1, 0).cross(eje).normalize();
      const v = eje.clone().cross(u);
      for (let i = 0; i < 800; i++) {
        const s = r();
        const a = r() * Math.PI * 2;
        const n = u.clone().multiplyScalar(Math.cos(a)).addScaledVector(v, Math.sin(a));
        put(1, A.clone().lerp(B, s).addScaledVector(n, lerp(ra, rb, s)), mz(VERDE, AMBAR, 0.3), 0.03, 0.75, [R.x, lerp(q0, q1, s), 0, 0], n);
      }
    };
    hueso(R, E, 0.2, 0.15, 0, 0.4);
    hueso(E, W, 0.15, 0.1, 0.4, 0.75);
    const haciaAfuera = W.clone().sub(E).normalize();
    for (let k = 0; k < rayos; k++) {
      const a = lerp(-0.75, 0.75, k / (rayos - 1));
      const d = haciaAfuera.clone().applyAxisAngle(V(0, 1, 0), a * lado);
      d.y = -0.04;
      for (let i = 0; i < 44; i++) {
        const u = i / 43;
        put(2, W.clone().addScaledVector(d, largo * u * (1 - 0.25 * a * a)), mz(AMBAR, BLANCO, 0.2 * u), 0.032, 1.0 - 0.45 * u, [R.x, 0.75 + 0.25 * u, 0, 0]);
      }
    }
  };
  for (const lado of [-1, 1]) {
    aleta(V(2.3, -0.25, lado * 1.0), V(1.7, -0.42, lado * 2.0), V(2.6, -0.5, lado * 2.7), 9, 1.35, lado);
    aleta(V(-1.4, -0.25, lado * 0.7), V(-1.9, -0.4, lado * 1.3), V(-1.45, -0.48, lado * 1.8), 6, 0.8, lado);
  }
  // Its heart.
  for (let i = 0; i < 220; i++) {
    const [x, y, z] = b.onSphere();
    const k = 0.26 * Math.cbrt(r());
    put(3, V(1.7 + x * k, -0.05 + y * k, z * k), CORAZON, 0.04, 0.8, [1.7, 0, 1, 0]);
  }
  put(3, V(1.7, -0.05, 0), CORAZON, 0.2, 1.3, [1.7, 0, 1, 0]);

  // ── The world. ──
  // Its trail in the water: one continuous line.
  const c = V();
  for (let i = 0; i < 3000; i++) {
    lugar(i / 3000, c);
    put(4, V(c.x, c.y, (r() - 0.5) * 0.06), BLANCO, 0.06, 0.7, [c.x, 0, 0, 0]);
  }
  // And over the land, to the one who stands at the end of it.
  for (let i = 0; i < 7000; i++) {
    const s = i / 7000;
    const x = lerp(X1 + 6.5, FIN, s);
    put(5, V(x, suelo(x) + 0.12, (r() - 0.5) * 0.06), BLANCO, 0.06, 0.7, [s, 0, 0, 0]);
  }
  // The surface: from below, a line of light.
  for (let i = 0; i < 110_000; i++) put(6, V(-190 + r() * 190.4, 0, -110 + r() * 128), LINEA, 0.13, 0.85, [r(), 0, 0, 0]);
  // Light that comes down through it.
  for (let k = 0; k < 70; k++) {
    const x0 = -150 + r() * 150;
    const z0 = -70 + r() * 76;
    const fase = r();
    for (let i = 0; i < 260; i++) {
      const d = r() * 9;
      const x = x0 + 0.24 * d + (r() - 0.5) * 0.7;
      if (-d < suelo(x)) continue;
      put(10, V(x, -d, z0 + 0.08 * d + (r() - 0.5) * 0.7), mz(LINEA, BLANCO, 0.5), 0.07, 0.3 * (1 - d / 10), [fase, 0, 0, 0]);
    }
  }
  // Motes in the water.
  for (let i = 0; i < 7000; i++) {
    const x = -130 + r() * 131;
    put(7, V(x, lerp(suelo(x), -0.3, r()), -50 + r() * 64), mz(LINEA, BLANCO, 0.4), 0.05, 0.3, [r(), 0, 0, 0]);
  }
  // The ground has no colour of its own: lines that follow its shape.
  for (let x = -130; x < FIN + 50; x += 1.25) {
    for (let i = 0; i < 250; i++) {
      const z = -85 + r() * 101;
      const xx = x + 0.5 * Math.sin(z * 0.23 + x * 0.05);
      put(8, V(xx, suelo(xx) + 0.16 * Math.sin(xx * 0.6 + z * 0.35) * Math.sin(z * 0.8) - 0.05, z), BLANCO, 0.09, 0.13, [r(), 0, 0, 0]);
    }
  }
  // What was already there, and what grew after: green, taller the farther the trail goes.
  for (let i = 0; i < 1500; i++) {
    const x = -70 + r() * (FIN + 110);
    const z = -80 + r() * 92;
    if (Math.abs(z) < 4 + 0.03 * Math.max(0, x)) continue;
    const alto = x < 0 ? 0.5 + 1.5 * r() : (0.8 + 3.5 * r() * r()) * (1 + x / 45);
    const n = Math.round(alto * 7) + 4;
    const fase = r();
    const lean = (r() - 0.5) * 0.3;
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const px = x + lean * alto * t * t;
      put(9, V(px, suelo(x) + alto * t, z), VERDE, 0.09 + 0.05 * t, 0.45 + 0.5 * t, [fase, t, 0, 0]);
      if (x > 0 && t > 0.35 && k % 2 === 0) {
        const w = alto * 0.3 * (1 - t) + 0.15;
        for (const sgn of [-1, 1]) {
          for (let j = 1; j <= 3; j++) put(9, V(px + (sgn * w * j) / 3, suelo(x) + alto * t + (w * 0.5 * j * j) / 9, z), VERDE, 0.08, 0.5, [fase, t, 0, 0]);
        }
      }
    }
  }
  // The one who stands, seen from behind: the figure of «Tú», at its true size beside the animal.
  const pie = V(FIN + 2, suelo(FIN), 0);
  for (let n = 0; n < 26_000; ) {
    const h = V((r() - 0.5) * 7.8, -0.3 + r() * 18.2, -1.7 + r() * 4.4);
    if (cuerpo(h.x, h.y, h.z) > -0.1) continue;
    const dentro = r() < 0.28;
    put(11, V(pie.x + h.z * ESCALA, pie.y + h.y * ESCALA, h.x * ESCALA), dentro ? AMBAR : mz(AZUL, VIOLETA, r() * 0.6), 0.045, dentro ? 1.0 : 0.7, [h.y, r(), 0, 0]);
    n++;
  }
  put(12, V(pie.x + 0.3 * ESCALA, pie.y + 12.7 * ESCALA, 0.35 * ESCALA), CORAZON, 0.22, 1.6, [0, 0, 0, 0]);

  const f = (a: number[]) => new Float32Array(a);
  return { data: b.data(), aL: f(aL), aN: f(aN), aQ: f(aQ) };
}

const PRE = /* glsl */ `
  attribute vec3 aL, aN;
  attribute vec4 aQ;
  uniform vec3 uCam, uPos;
  uniform float uCuesta, uNada, uAlza, uRastro, uOnda;
`;

const MOVE = /* glsl */ `
  if (aKind < 3.5) {
    // The animal. \`aQ.x\`: where along the body this point hangs from; \`aQ.y\`: how far down a fin it is.
    float ax = aQ.x;
    vec3 q = aL;
    // It swims with its whole body, more towards the tail; on land the wave is a walk.
    q.z += uNada * (0.1 + 0.55 * smoothstep(2.0, -6.0, ax)) * sin(1.05 * ax - uTime * 4.2);
    // Fins paddle from the shoulder.
    q.x += aQ.y * 0.5 * sin(uTime * 4.2 + ax) * (0.35 + 0.65 * uNada);
    // It props itself up and lifts its head: the tips of the fins stay on the ground.
    float sube = max(0.0, ax + 1.0);
    float alza = uAlza * 0.037 * sube * sube;
    q.y += alza * (1.0 - aQ.y);
    q.z += uAlza * 0.007 * sube * sube * sin(uTime * 0.6) * (1.0 - aQ.y);
    float cs = cos(uCuesta), sn = sin(uCuesta);
    p = uPos + vec3(q.x * cs - q.y * sn, q.x * sn + q.y * cs, q.z);
    // One beat that runs from the heart to the tail and to the snout.
    float pul = exp(-fract(uTime * 0.9 - abs(ax - 1.7) * 0.11) * 4.0);
    if (aKind < 1.5) {
      float f = 1.0 - abs(dot(normalize(aN), normalize(uCam - p)));
      em *= (0.16 + 1.5 * f * f) * (0.55 + 0.9 * pul);
    } else if (aKind < 2.5) {
      em *= 0.6 + 0.8 * pul;
    } else {
      em *= aQ.z > 0.5 ? 0.6 + 1.8 * exp(-fract(uTime * 0.9) * 4.0) : 0.5 + 1.0 * pul;
      fuente = 0.9;
    }
  } else if (aKind < 4.5) {
    // The trail starts at the tip of its tail.
    float d = uPos.x - 6.0 - aQ.x;
    em *= step(0.0, d) * (0.5 + 1.6 * exp(-d * 0.35));
    fuente = 0.6;
  } else if (aKind < 5.5) {
    em *= step(aQ.x, uRastro) * step(0.0005, uRastro) * (0.55 + 3.0 * exp(-pow((aQ.x - uRastro) / 0.01, 2.0)));
    fuente = 0.6;
  } else if (aKind < 6.5) {
    p.y += 0.12 * sin(p.x * 0.5 + uTime * 0.8) + 0.08 * sin(p.z * 0.7 + uTime * 1.1);
    // Where it breaks the line, rings open.
    float d = length(p.xz - vec2(min(uPos.x + 3.5, -1.5), 0.0));
    float anillo = pow(max(0.0, sin(d * 1.9 - uTime * 4.5)), 6.0) * exp(-d / 9.0) * uOnda;
    p.y += 0.22 * anillo;
    em *= 0.45 + 0.55 * sin(p.x * 0.9 + p.z * 1.3 + uTime * 1.3 + aQ.x * 6.28) + 3.0 * anillo;
  } else if (aKind < 7.5) {
    p += vec3(sin(uTime * 0.2 + aQ.x * 40.0), cos(uTime * 0.16 + aQ.x * 31.0), 0.0) * 0.5;
  } else if (aKind < 8.5) {
    em *= 1.0;
  } else if (aKind < 9.5) {
    p.x += 0.25 * aQ.y * aQ.y * sin(uTime * 0.6 + aQ.x * 6.28);
    em *= 0.5 + 0.5 * exp(-fract(uTime * 0.2 + aQ.x) * 3.0);
  } else if (aKind < 10.5) {
    em *= 0.4 + 0.6 * sin(uTime * 0.5 + aQ.x * 6.28);
  } else if (aKind < 11.5) {
    em *= 0.3 + 0.3 * exp(-fract(uTime - aQ.x * 0.045) * 4.5);
  } else {
    em *= 0.6 + 1.6 * exp(-fract(uTime) * 4.5);
    fuente = 1.0;
  }
`;

export const sale: Escena = {
  id: 'sale',
  nombre: 'Sale del agua',
  estilos: [{ key: '1', nombre: 'Desde abajo · Sale del agua · Hasta ti', nota: 'Vista desde abajo, la superficie es una línea de luz. Un animal sube por la orilla, la rompe y levanta la cabeza hacia la tierra. Después la cámara sigue su rastro hasta alguien que está de pie.' }],
  montar(stage): Instancia {
    const { root, camera } = stage;
    const M = mundo();
    const U = {
      uCam: { value: V() },
      uPos: { value: V() },
      uCuesta: { value: 0 },
      uNada: { value: 1 },
      uAlza: { value: 0 },
      uRastro: { value: 0 },
      uOnda: { value: 0 },
    };
    const todo = materia(M.data, { pre: PRE, move: MOVE, uniforms: U, extra: { aL: [M.aL, 3], aN: [M.aN, 3], aQ: [M.aQ, 4] } });
    root.add(todo.points);

    /** `s`: the animal's place on its way. The camera: `px`, `tx` and `ty` are counted from the animal; the rest are in the world. */
    const tl = new Timeline({ luz: 0, s: 0, alza: 0, rastro: 0, px: -10, py: -6.8, pz: 5, tx: 5, ty: 2.6, tz: 0, niebla: 60 });
    tl.caption(9, 'Desde abajo', 'La superficie, vista desde abajo, es una línea de luz.');
    tl.with(1.5, { luz: 1 });
    tl.to(9, { s: 0.5, px: -6, py: -1.7, pz: 11, tx: 3, ty: 1.4 }, EASE.sine);
    tl.caption(9, 'Sale del agua', 'Un día dejó el único lugar para el que estaba hecha.');
    tl.with(9, { s: 1 }, EASE.out);
    tl.to(9, { px: 10.5, py: 0.55, pz: 10.5, tx: 2.5, ty: 0.1 }, EASE.sine);
    tl.caption(6, 'La orilla', '');
    tl.with(3.5, { alza: 1 }, EASE.sine);
    tl.to(6, { px: 12, py: 0.9, pz: 8, tx: 3, ty: 1.3 }, EASE.sine);
    tl.caption(12, 'Lo que vino después', 'Todo lo que camina viene de ahí.');
    tl.with(11, { rastro: 1 }, EASE.sine);
    tl.with(4, { niebla: 90 });
    tl.to(4, { px: -9, py: 6.5, pz: 7, tx: 16, ty: 0.0 }, EASE.sine);
    tl.to(8, { px: FIN - 40, py: 7, pz: 5, tx: FIN, ty: 3.5 }, EASE.sine);
    tl.caption(6, 'Tú', '');
    tl.to(6, { px: FIN - 32, py: 5.2, pz: 3, tx: FIN + 4, ty: 4.5 }, EASE.sine);

    const c = V();
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
        const s = g('s');
        lugar(s, c);
        camera.near = 0.1;
        camera.far = 2000;
        camera.fov = 40;
        // Under the water the camera floats.
        const flota = 1 - smoothstep(-1, 0.4, g('py'));
        camera.position.set(c.x + g('px') + 0.25 * flota * Math.sin(f.time * 0.45), g('py') + 0.16 * flota * Math.sin(f.time * 0.7), g('pz') + 0.2 * flota * Math.cos(f.time * 0.38));
        camera.up.set(0, 1, 0);
        camera.lookAt(c.x + g('tx'), c.y + g('ty'), g('tz'));
        camera.updateMatrixWorld();
        stage.bloom.strength = 0.3;
        stage.bloom.radius = 0.6;
        stage.bloom.threshold = 0.2;
        U.uCam.value.copy(camera.position);
        U.uPos.value.copy(c);
        U.uCuesta.value = cuesta(s);
        // In the water it swims; out of it, its body barely waves.
        U.uNada.value = 1 - 0.8 * smoothstep(-9, -1, c.x);
        U.uAlza.value = g('alza');
        U.uRastro.value = g('rastro');
        U.uOnda.value = smoothstep(-13, -8, c.x);
        enfocar(todo, f.focal, f.dpr, f.time);
        todo.u.uMinPx.value = 1.3 * f.dpr;
        todo.u.uMaxPx.value = 9 * f.dpr;
        todo.u.uGain.value = g('luz') * 0.6;
        todo.u.uFog.value = g('niebla');
        todo.u.uFogNear.value = 10;
      },
      placa() {},
      dispose() {},
    };
  },
};
