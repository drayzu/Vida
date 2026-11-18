import * as THREE from 'three';
import { Timeline, EASE, type Ease } from './timeline';
import { enfocar, materia, materiaBuilder } from '../src/engine/materia';
import { clamp, lerp, smoothstep } from '../src/engine/math';
import { FONT, grupo, ink, type Cuenta, type Rotulo } from './placa';
import { SERIE, TIBIO, V } from './comun';
import type { Escena, Frame, Instancia } from './tipos';
import { col, mz, type RGB } from './mundos';

/**
 * Study · «Lejos», «Después» and «No es para nosotros» (GUION-formas, moments 18–20). Phase 0.
 *
 * The script had a black frame with two numbers and «nothing moves». Here the two numbers are
 * something that happens:
 *  - a life leaves home towards the nearest star. It is a heart that sends out a ring on each beat,
 *    as in «Ya no está». At eighty years its next beat does not come, and it has gone almost
 *    nowhere. Another starts where it stopped. And another: 875 lives, one after the other, to
 *    reach a small red star. It is the nearest one;
 *  - then the stars go out in the order they really will: the blue ones first, with a flash; the
 *    yellow ones swell red and fade; the red ones last. The one we reached is the last of all;
 *  - black. One point is left, blue and warm. It beats.
 *
 * The colour rule: there is no background here. Every star is a point that can go out.
 */

const BLANCO: RGB = [TIBIO.r, TIBIO.g, TIBIO.b];
const PALETA: RGB[] = [SERIE.mente, SERIE.abismo, SERIE.destino, SERIE.tiempo, SERIE.infinito, SERIE.espacio].map((c) => [c.r, c.g, c.b] as RGB);
/** Lives it takes: about 70 000 years at the speed of our farthest probe, 80 years each. */
const VIDAS = 875;
const CASA = V(-1.7, 0, 0);
const ROJA = V(VIDAS + 1.4, 0, 0);

function mundo() {
  const b = materiaBuilder(907);
  const r = b.r;
  const aQ: number[] = [];
  const put = (p: THREE.Vector3, color: RGB, size: number, luz: number, kind: number, Q: number[]) => {
    b.push(p.x, p.y, p.z, col(color), size, luz, { kind });
    aQ.push(Q[0], Q[1], Q[2], Q[3]);
  };
  const O = V();

  // The stars: each one knows when it goes out. Most are small and red, and those last longest.
  for (let i = 0; i < 22000; i++) {
    const [x, y, z] = b.onSphere();
    const banda = r() < 0.78;
    const d = V(x, banda ? y * 0.22 : y, z).normalize().applyAxisAngle(V(1, 0, 0), 0.5).multiplyScalar(3000 + 17000 * r());
    const k = r();
    const clase = k < 0.05 ? 0 : k < 0.24 ? 1 : k < 0.5 ? 2 : 3;
    const color: RGB = clase === 0 ? [0.55, 0.7, 1.0] : clase === 1 ? [1.0, 0.95, 0.8] : clase === 2 ? [1.0, 0.7, 0.4] : [1.0, 0.36, 0.2];
    const luz = (clase === 0 ? 5.5 : clase === 1 ? 3.0 : clase === 2 ? 2.0 : 1.4) * (0.3 + 1.6 * r() * r());
    const td = clase === 0 ? 0.04 + 0.16 * r() : clase === 1 ? 0.24 + 0.24 * r() : clase === 2 ? 0.45 + 0.25 * r() : 0.66 + 0.3 * r();
    put(d.add(V(VIDAS / 2, 0, 0)), color, 9 * luz, luz, 0, [td, clase, r(), 0]);
  }

  // The lives: a heart, its ring, and the way it went.
  for (let i = 0; i < VIDAS; i++) {
    const color = i === 0 ? PALETA[0] : PALETA[Math.floor(r() * PALETA.length)];
    const fase = r();
    const cerca = i < 8;
    const R = cerca ? 0.42 : 0.5;
    const size = cerca ? 0.011 : 0.05;
    put(O, mz(color, BLANCO, 0.35), cerca ? 0.04 : 1.2, cerca ? 1.6 : 3.0, 1, [i, 0, fase, R]);
    const n = cerca ? 240 : 12;
    for (let k = 0; k < n; k++) put(O, color, size, 0.9, 2, [i, (k / n) * Math.PI * 2, fase, R]);
    if (cerca) for (let k = 0; k < 600; k++) put(V(Math.sqrt(r()), 0, 0), color, size, 0.55, 4, [i, r() * Math.PI * 2, fase, R]);
    const m = cerca ? 90 : 8;
    for (let k = 0; k < m; k++) put(O, color, cerca ? 0.009 : 0.3, cerca ? 0.8 : 1.4, 3, [i, (k + 0.5) / m, 0, 0]);
  }

  // The nearest star: small and red.
  for (let i = 0; i < 2200; i++) {
    const [x, y, z] = b.onSphere();
    put(ROJA.clone().add(V(x, y, z).multiplyScalar(0.55 * Math.pow(r(), 0.35))), [1.0, 0.16 + 0.12 * r(), 0.05], 0.03, 0.8, 5, [0, 0, 0, 0]);
  }
  put(ROJA, [1.0, 0.25, 0.1], 30, 1.1, 5, [1, 0, 0, 0]);

  // Home: a blue point with a thin bright layer.
  for (let i = 0; i < 3200; i++) {
    const [x, y, z] = b.onSphere();
    const nube = Math.sin(x * 7 + 2 * Math.sin(y * 9)) * Math.sin(z * 6 + y * 4) > 0.45;
    put(CASA.clone().add(V(x, y, z).multiplyScalar(0.16)), nube ? BLANCO : [0.16, 0.42, 1.0], 0.006, nube ? 0.5 : 0.75, 6, [0, 0, 0, 0]);
  }
  for (let i = 0; i < 900; i++) {
    const [x, y, z] = b.onSphere();
    put(CASA.clone().add(V(x, y, z).multiplyScalar(0.167)), [0.3, 0.95, 0.85], 0.005, 0.5, 6, [1, 0, 0, 0]);
  }
  put(CASA, [0.3, 0.6, 1.0], 30, 1.6, 7, [0, 0, 0, 0]);

  return { data: b.data(), aQ: new Float32Array(aQ) };
}

const PRE = /* glsl */ `
  attribute vec4 aQ;
  uniform vec3 uCamW;
  uniform float uVia, uFin, uRastro, uAzul;
  float lubdub(float t, float bpm) {
    float x = fract(t * bpm / 60.0);
    float a = (x - 0.06) / 0.035;
    float b = (x - 0.22) / 0.04;
    return exp(-a * a) + 0.6 * exp(-b * b);
  }
`;

const MOVE = /* glsl */ `
  vec3 tibio = vec3(1.0, 0.89, 0.8);
  if (aKind < 0.5) {
    float td = aQ.x;
    float lum = (em.r + em.g + em.b) / 3.0;
    float titila = 0.8 + 0.2 * sin(uTime * (0.6 + aQ.z) + aQ.z * 40.0);
    if (aQ.y < 0.5) {
      // Blue: short lives, and a flash at the end.
      float vivo = 1.0 - smoothstep(td - 0.004, td, uFin);
      em *= vivo * titila + 9.0 * exp(-pow((uFin - td) / 0.007, 2.0));
    } else if (aQ.y < 1.5) {
      // Like the Sun: it swells red, and what is left is a pale ember that cools.
      float g = smoothstep(td - 0.07, td - 0.012, uFin);
      float vivo = 1.0 - smoothstep(td - 0.012, td, uFin);
      em = mix(em, vec3(1.0, 0.22, 0.08) * lum * 3.0, g) * vivo * titila + vec3(0.8, 0.86, 1.0) * 0.07 * (1.0 - vivo) * (1.0 - smoothstep(td, td + 0.22, uFin));
    } else {
      // Small and red: they just fade, slowly.
      em *= (1.0 - smoothstep(td - 0.08, td, uFin)) * titila;
    }
    fuente = 1.0;
  } else if (aKind < 4.5) {
    // A life: it starts where the one before stopped, and goes one step.
    float age = uVia * ${VIDAS.toFixed(1)} - aQ.x;
    float viva = step(0.0, age) * step(age, 1.0);
    float fue = step(1.0, age);
    // The last beat: the ring already out finishes, and no new one comes.
    float fin = 1.0 - smoothstep(0.9, 0.99, age);
    vec3 c = vec3(aQ.x + clamp(age, 0.0, 1.0), 0.0, 0.0);
    float ph = fract(uTime / 0.95 + aQ.z);
    if (aKind < 1.5) {
      p = c;
      em = em * (0.15 + 1.0 * exp(-ph * 6.0)) * viva * fin + tibio * 0.05 * max(fue, viva * (1.0 - fin)) * uRastro;
      fuente = aQ.x > 7.5 ? 1.0 : 0.7;
    } else if (aKind < 2.5) {
      float rr = aQ.w * (0.1 + 0.9 * ph) * (1.0 + 0.16 * cos(5.0 * aQ.y));
      p = c + vec3(cos(aQ.y), sin(aQ.y), 0.0) * rr;
      em *= 1.6 * smoothstep(0.0, 0.1, ph) * pow(1.0 - ph, 1.3) * viva * fin;
      fuente = aQ.x > 7.5 ? 0.5 : 0.0;
    } else if (aKind < 3.5) {
      p = vec3(aQ.x + aQ.y, 0.0, 0.0);
      em = mix(tibio * (aQ.x > 7.5 ? 0.3 : 0.09), em * 0.6, viva * fin) * step(aQ.y, age) * uRastro;
      fuente = aQ.x > 7.5 ? 1.0 : 0.0;
    } else {
      float rad = aQ.w * 0.42 * (0.35 + 0.65 * abs(cos(2.5 * aQ.y))) * position.x * (1.0 + 0.06 * exp(-ph * 5.0));
      p = c + vec3(cos(aQ.y), sin(aQ.y), 0.0) * rad;
      em = mix(tibio * 0.06 * fue * uRastro, em * (0.3 + 0.9 * exp(-ph * 5.0)), viva * fin);
    }
  } else if (aKind < 5.5) {
    // The nearest star is the last one to go out.
    float lejos = smoothstep(6.0, 60.0, length(p - uCamW));
    em *= (1.0 - smoothstep(0.93, 0.995, uFin)) * (aQ.x > 0.5 ? lejos : 1.0) * (0.8 + 0.2 * sin(uTime * 1.1 + seed * 30.0));
    fuente = aQ.x;
  } else if (aKind < 6.5) {
    float late = 1.0 + 0.5 * lubdub(uTime, 52.0) * uAzul;
    em *= (0.5 + 0.5 * uAzul) * late * (aQ.x > 0.5 ? 1.6 : 1.0);
  } else {
    em *= (0.35 + 0.65 * uAzul) * (1.0 + 0.7 * lubdub(uTime, 52.0) * uAzul) * smoothstep(3.0, 40.0, length(p - uCamW));
    fuente = 1.0;
  }
`;

const anos = (y: number) => {
  if (y < 1e12) return `${grupo(Math.round(y / 1e9) * 1000)} millones de años`;
  const n = Math.round(y / 1e12);
  return n === 1 ? '1 billón de años' : `${grupo(n)} billones de años`;
};

const CAP = 'II · No es para nosotros';

export const lejos: Escena = {
  id: 'lejos',
  nombre: 'Lejos',
  estilos: [{ key: '1', nombre: 'Lejos · Después · No es para nosotros', nota: 'Una vida sale hacia la estrella más cercana. A los ochenta años su latido no vuelve y casi no ha avanzado; otra sigue donde quedó. Son 875 vidas. Después las estrellas se apagan en su orden: las azules primero, las rojas al final. Queda un punto azul.' }],
  montar(stage): Instancia {
    const { root, camera } = stage;
    const M = mundo();
    const U = { uCamW: { value: V() }, uVia: { value: 0 }, uFin: { value: 0 }, uRastro: { value: 1 }, uAzul: { value: 0 } };
    const todo = materia(M.data, { pre: PRE, move: MOVE, uniforms: U, extra: { aQ: [M.aQ, 4] } });
    root.add(todo.points);

    // The camera is either beside the life that is going (`sigue`) or somewhere of its own.
    const tl = new Timeline({ luz: 0, via: 0, fin: 0, rastro: 1, azul: 0, sigue: 1, reloj: 1 });
    const rel = (dur: number, p: THREE.Vector3, t: THREE.Vector3, e: Ease | null = null) => tl.to(dur, { rx: p.x, ry: p.y, rz: p.z, ux: t.x, uy: t.y, uz: t.z }, e);
    const abs = (dur: number, p: THREE.Vector3, t: THREE.Vector3, e: Ease | null = null) => tl.to(dur, { ax: p.x, ay: p.y, az: p.z, tx: t.x, ty: t.y, tz: t.z }, e);
    const MEDIO = V(VIDAS / 2, 0, 0);
    tl.set({ rx: -0.7, ry: 0.5, rz: 2.9, ux: -0.45, uy: 0, uz: 0, ax: MEDIO.x, ay: 150, az: 650, tx: MEDIO.x, ty: 0, tz: 0 });

    tl.caption(4.6, 'Lejos', 'Un cuerpo dura ochenta años.');
    tl.with(1.2, { luz: 1 });
    tl.with(4.6, { via: 1 / VIDAS }, EASE.linear);
    rel(4.6, V(0.3, 0.35, 2.3), V(0.05, 0, 0));
    tl.label('otra');
    tl.caption(3.6, 'Otra', 'Otra sigue donde quedó.');
    tl.with(3.6, { via: 7.2 / VIDAS }, EASE.in);
    rel(3.6, V(-1.5, 2.2, 8), V(-1.5, 0, 0));
    tl.label('todas');
    tl.caption(6.5, 'Ochocientas setenta y cinco vidas', 'La estrella más cercana queda a setenta mil años.');
    tl.with(5.5, { via: 1.0005 }, EASE.inOut);
    tl.with(3, { sigue: 0 }, EASE.sine);
    tl.wait(6.5);
    tl.label('llega');
    tl.caption(3, 'La más cercana', 'Y es la más cercana.');
    abs(3, ROJA.clone().add(V(-4.5, 1.2, 6.5)), ROJA.clone().add(V(-1.2, 0, 0)), EASE.sine);
    tl.label('despues');
    tl.caption(10, 'Después', 'Y casi todo el tiempo que queda será oscuro y frío.');
    tl.with(10, { fin: 1 }, EASE.linear);
    tl.with(4, { rastro: 0 });
    abs(10, ROJA.clone().add(V(-14, 5, 30)), ROJA.clone().add(V(40, 60, -400)), EASE.sine);
    tl.label('negro');
    abs(2.2, ROJA.clone().add(V(-120, 20, 140)), CASA, EASE.sine);
    tl.label('azul');
    tl.caption(8, 'No es para nosotros', 'El universo no es para nosotros. No está mal.');
    tl.with(2.5, { azul: 1, reloj: 0 });
    abs(8, CASA.clone().add(V(0.3, 0.15, 1.5)), CASA, EASE.sine);

    const cabeza = V();
    const a = V();
    const b2 = V();
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
        const s = g('sigue');
        cabeza.set(Math.min(g('via') * VIDAS, VIDAS), 0, 0);
        a.set(g('ax'), g('ay'), g('az'));
        b2.set(cabeza.x + g('rx'), g('ry'), g('rz'));
        camera.near = 0.02;
        camera.far = 100000;
        camera.fov = 40;
        camera.position.copy(a).lerp(b2, s);
        a.set(g('tx'), g('ty'), g('tz'));
        b2.set(cabeza.x + g('ux'), g('uy'), g('uz'));
        camera.up.set(0, 1, 0);
        camera.lookAt(a.lerp(b2, s));
        camera.updateMatrixWorld();
        stage.bloom.strength = 0.45;
        stage.bloom.radius = 0.6;
        stage.bloom.threshold = 0.2;
        U.uCamW.value.copy(camera.position);
        U.uVia.value = g('via');
        U.uFin.value = g('fin');
        U.uRastro.value = g('rastro');
        U.uAzul.value = g('azul');
        enfocar(todo, f.focal, f.dpr, f.time);
        todo.u.uMinPx.value = 1.3 * f.dpr;
        todo.u.uMaxPx.value = 9 * f.dpr;
        todo.u.uGain.value = g('luz') * 0.75;
      },
      placa(g2, f) {
        const g = (k: string) => tl.get(k, f.p);
        const alpha = g('luz') * g('reloj');
        if (alpha < 0.01) return;
        const t = g('via') * VIDAS;
        const fin = g('fin');
        let n: string;
        let que: string;
        let linea: string;
        if (f.p >= tl.at('despues')) {
          n = anos(Math.pow(10, 10 + 4 * fin));
          que = '';
          linea = fin > 0.995 ? 'NADA BRILLA' : 'PRIMERO SE APAGAN LAS AZULES · AL FINAL, LAS ROJAS';
        } else if (t <= 1) {
          n = `${Math.round(clamp(t, 0, 1) * 80)}`;
          que = t > 0.985 ? 'años · una vida' : 'años';
          linea = 'HACIA LA ESTRELLA MÁS CERCANA';
        } else {
          const v = Math.min(VIDAS, Math.floor(t) + 1);
          n = grupo(v);
          que = 'vidas';
          linea = `${grupo(Math.round(lerp(0, 70000, Math.min(t / VIDAS, 1)) / 10) * 10)} AÑOS · A LA VELOCIDAD DE NUESTRA SONDA MÁS LEJANA`;
        }
        const u = f.u;
        const x = 44 * u;
        g2.save();
        g2.textBaseline = 'alphabetic';
        g2.shadowColor = 'rgba(0,0,0,0.85)';
        g2.shadowBlur = 12 * u;
        g2.globalAlpha = alpha * smoothstep(0.3, 1.2, f.p);
        g2.font = FONT.serif((que ? 66 : 44) * u);
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
