import * as THREE from 'three';
import { Timeline, EASE, type Ease } from './timeline';
import { pantalla } from '../src/engine/pantalla';
import { enfocar, materia, materiaBuilder } from '../src/engine/materia';
import { lerp } from '../src/engine/math';
import type { Cuenta, Rotulo } from './placa';
import { SERIE, TIBIO, V } from './comun';
import type { Escena, Frame, Instancia } from './tipos';
import { col, mz, type RGB } from './mundos';

/**
 * Study · «Una dentro de otra» and «Muchos que son uno» (GUION-formas, moments 6–7). Phase 0.
 *
 * The image the whole script leans on: one living thing inside another, and it is biology, not a
 * figure of speech. A large cell takes a small one in and does not undo it. The small one keeps its
 * own colour and its own, faster rhythm; it divides inside. Then the cell divides and its daughters
 * do not let go: a hollow ball of cells, each with the others inside, whose rhythms become one.
 *
 * Everything here is real, so every line is continuous.
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

/** The body: a hollow ball of cells behind the one we watch, which sits at its front pole. */
const RB = 30;
const B = V(0, 0, -RB);
const RC = 3;
const NCEL = 300;
/** The guest, as it rests inside the one we watch. */
const ADENTRO = V(1.5, -0.2, 0.5);

function mundo() {
  const b = materiaBuilder(733);
  const r = b.r;
  const aC: number[] = [];
  const aP: number[] = [];
  const aL: number[] = [];
  const aQ: number[] = [];
  const aG: number[] = [];
  const O = V();
  const dir = () => {
    const [x, y, z] = b.onSphere();
    return V(x, y, z);
  };
  const put = (kind: number, color: RGB, size: number, luz: number, C: THREE.Vector3, P: THREE.Vector3, L: THREE.Vector3, Q: number[], G: number[], delay = 0) => {
    b.push(C.x + L.x, C.y + L.y, C.z + L.z, col(color), size, luz, { kind, delay });
    aC.push(C.x, C.y, C.z);
    aP.push(P.x, P.y, P.z);
    aL.push(L.x, L.y, L.z);
    aQ.push(Q[0], Q[1], Q[2], Q[3]);
    aG.push(G[0], G[1], G[2], G[3]);
  };

  // The sea: motes, so the dark has depth.
  for (let i = 0; i < 5000; i++) {
    const p = V((r() - 0.5) * 150, (r() - 0.5) * 90, 20 - r() * 150);
    put(0, BLANCO, 0.05, 0.22, p, p, O, [0, 0, 0, 0], [0, 0, 0, 0]);
  }

  /** A guest: a small rod with its own skin and, once inside, its folds. */
  const huesped = (C: THREE.Vector3, P: THREE.Vector3, off: THREE.Vector3, etapa: number, s: number, Q: number[], delay: number, n: number, size: number, hero: boolean) => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(hero ? 0.2 : r() * 6, hero ? 0.3 + etapa : r() * 6, hero ? 0.5 + etapa * 1.3 : r() * 6));
    const G = [off.x, off.y, off.z, etapa];
    for (let i = 0; i < n; i++) {
      const d = dir();
      put(3, AMBAR, size, 0.75, C, P, V(d.x * 0.78, d.y * 0.46, d.z * 0.46).multiplyScalar(s).applyQuaternion(q), Q, G, delay);
    }
    if (!hero) return;
    // Its folds: sheets that cross it, from one side and then the other.
    for (let k = 0; k < 6; k++) {
      const x = lerp(-0.56, 0.56, k / 5);
      const rr = 0.44 * Math.sqrt(1 - (x / 0.78) ** 2);
      const lado = k % 2 ? 1 : -1;
      for (let i = 0; i < 260; i++) {
        const a = r() * Math.PI * 2;
        const m = i < 110 ? 1 : Math.sqrt(r());
        const y = Math.cos(a) * rr * m;
        if (y * lado < -0.3 * rr) continue;
        put(4, mz(AMBAR, BLANCO, 0.25), 0.016, 0.6, C, P, V(x, y, Math.sin(a) * rr * m).multiplyScalar(s).applyQuaternion(q), Q, G, delay);
      }
    }
    // The second skin: the one the large cell left around it.
    for (let i = 0; i < 2200; i++) {
      const d = dir();
      put(7, AZUL, 0.018, 0.4, C, P, V(d.x * 0.93, d.y * 0.62, d.z * 0.62).multiplyScalar(s).applyQuaternion(q), Q, G, delay);
    }
  };

  // The one we watch.
  const QH = [0.1, 0.22, 0.31, 1];
  for (let i = 0; i < 30_000; i++) put(1, AZUL, 0.028, 0.5, O, O, dir().multiplyScalar(RC), QH, [0, 0, 0, 0]);
  for (let i = 0; i < 2600; i++) put(2, mz(AZUL, BLANCO, 0.3), 0.03, 0.2, O, O, dir().multiplyScalar(RC * 0.9 * Math.cbrt(r())), QH, [0, 0, 0, 0]);
  const QG = [0.4, 0.85, 0.31, 1];
  huesped(O, O, V(0, 0, 0), 0, 1, QG, 0, 5200, 0.02, true);
  huesped(O, O, V(-2.6, 0.9, -0.3), 1, 1, QG, 0, 5200, 0.02, true);
  huesped(O, O, V(-0.6, -1.5, 0.4), 2, 1, QG, 0, 5200, 0.02, true);
  huesped(O, O, V(-2.4, -1.1, -0.7), 2, 1, QG, 0, 5200, 0.02, true);

  // Its daughters: they are born from the one beside them and do not let go.
  const enCuerpo = (th: number, ph: number) => V(Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)).multiplyScalar(RB).add(B);
  for (let i = 1; i < NCEL; i++) {
    const th = Math.acos(1 - (2 * (i + 0.5)) / NCEL);
    const ph = i * 2.399963;
    const C = enCuerpo(th, ph);
    const P = enCuerpo(Math.max(0, th - 0.23), ph);
    const n = C.clone().sub(B).normalize();
    const s = 0.9 + 0.14 * r();
    const Q = [r(), 0.17 + 0.16 * r(), r(), 0];
    const tono = mz(AZUL, VIOLETA, r() * 0.7);
    const delay = th / Math.PI;
    for (let k = 0; k < 800; k++) put(1, tono, 0.13, 1.0, C, P, dir().multiplyScalar(RC * s), Q, [0, 0, 0, 0], delay);
    const cuantos = 2 + Math.floor(r() * 3);
    for (let k = 0; k < cuantos; k++) {
      const off = dir().multiplyScalar(1.9 * Math.cbrt(r())).addScaledVector(n, 0.3);
      huesped(C, P, off, 0, 1.15, [r(), 0.6 + 0.5 * r(), Q[2], 0], delay, 70, 0.17, false);
    }
  }

  // The others in the sea: the ones that eat light.
  for (let i = 0; i < 46; i++) {
    const C = V((r() - 0.5) * 70, (r() - 0.5) * 40, 6 - r() * 60);
    if (C.length() < 9) continue;
    const R = 0.6 + 0.9 * r();
    const Q = [r(), 0.25 + 0.3 * r(), r(), 0];
    for (let k = 0; k < 420; k++) put(6, VERDE, 0.075, 1.3, C, C, dir().multiplyScalar(R), Q, [0, 0, 0, 0]);
  }

  // The eyelid: one line of light across the body.
  for (let lado = -1; lado <= 1; lado += 2) {
    for (let i = 0; i < 1600; i++) {
      const s = i / 1600;
      const az = lerp(-0.42, 0.42, s);
      const el = lado * 0.07 * Math.cos((az / 0.42) * Math.PI * 0.5);
      const p = V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(RB + RC + 0.8).add(B);
      put(5, BLANCO, 0.14, 0.9, p, p, O, [s, 0, 0, 0], [0, 0, 0, 0]);
    }
  }

  const f = (a: number[]) => new Float32Array(a);
  return { data: b.data(), aC: f(aC), aP: f(aP), aL: f(aL), aQ: f(aQ), aG: f(aG) };
}

const PRE = /* glsl */ `
  attribute vec3 aC, aP, aL;
  attribute vec4 aQ, aG;
  uniform vec3 uCam, uHero, uGuest;
  uniform float uDentro, uParte, uParte2, uCrece, uUno, uOjo, uVerdes, uHeroK;
  const float RG = 0.95;
  float canto(vec3 n, vec3 p) { float f = 1.0 - abs(dot(n, normalize(uCam - p))); return f * f; }
`;

const MOVE = /* glsl */ `
  vec3 nrm = normalize(aL + vec3(1e-5));
  float hero = aQ.w;
  if (aKind < 0.5) {
    p += vec3(sin(uTime * 0.07 + seed * 40.0), cos(uTime * 0.05 + seed * 31.0), sin(uTime * 0.06 + seed * 17.0)) * 1.5;
  } else if (aKind > 4.5 && aKind < 5.5) {
    em *= step(aQ.x, uOjo) * step(0.001, uOjo) * (0.7 + 3.0 * exp(-pow((aQ.x - uOjo) / 0.03, 2.0)));
    fuente = 0.8;
  } else if (aKind > 5.5 && aKind < 6.5) {
    vec3 cc = aC + vec3(sin(uTime * 0.11 + aQ.z * 30.0), cos(uTime * 0.09 + aQ.z * 50.0), 0.0) * 1.2 + normalize(aC) * (1.0 - uVerdes) * 50.0;
    float pul = exp(-fract(uTime * aQ.y + aQ.x) * 4.0);
    p = cc + aL * (1.0 + 0.05 * pul);
    em *= (0.2 + 1.5 * canto(nrm, p)) * (0.6 + 0.9 * pul) * uVerdes;
  } else {
    // A daughter comes out of the cell beside it.
    float g = hero > 0.5 ? 1.0 : smoothstep(aDelay * 0.82, aDelay * 0.82 + 0.18, uCrece);
    vec3 cc = hero > 0.5 ? uHero : mix(aP, aC, g);
    float k = (hero > 0.5 ? uHeroK : 1.0) * g;
    if (aKind < 2.5) {
      // Each one has its rhythm, until the rhythm is one: a wave that leaves from the first.
      float own = exp(-fract(uTime * aQ.y + aQ.x) * 4.0);
      float com = exp(-fract(uTime * 0.3 - aDelay * 1.1) * 4.0);
      float pul = mix(own, com, uUno);
      vec3 q = aL * (1.0 + 0.035 * pul);
      if (aKind < 1.5) q += nrm * 0.07 * sin(nrm.x * 5.0 + nrm.y * 4.0 + uTime * 0.7 + aQ.z * 20.0);
      p = cc + q * g;
      if (hero > 0.5 && aKind < 1.5) {
        // It takes the small one in: its skin reaches, cups it and closes behind.
        vec3 v = p - uGuest;
        float d = length(v);
        float w = smoothstep(RG * 1.55, RG * 0.5, d);
        vec3 hacia = normalize(v / max(d, 1e-4) - nrm * 0.75);
        p = mix(p, uGuest + hacia * RG, w);
        em *= 1.0 + 1.2 * w;
      }
      em *= aKind < 1.5 ? (0.14 + 1.6 * canto(nrm, p)) * (0.4 + 1.3 * pul) : 0.35 + 0.6 * pul;
      em *= k;
    } else {
      // The one inside: its own colour and its own, faster rhythm.
      float st = aG.w < 0.5 ? 1.0 : aG.w < 1.5 ? uParte : uParte2;
      vec3 gc = hero > 0.5 ? uGuest + aG.xyz * st : cc + aG.xyz * g;
      float gp = exp(-fract(uTime * aQ.y + aQ.x + aG.w * 0.37 + aG.x) * 5.0);
      p = gc + aL * g * (1.0 + 0.06 * gp);
      float vis = hero > 0.5 ? smoothstep(0.0, 0.3, st) : 1.0;
      if (aKind < 3.5) em *= (0.25 + 1.4 * canto(nrm, p)) * (0.55 + 1.4 * gp);
      else if (aKind < 4.5) em *= (0.3 + 1.3 * gp) * uDentro;
      else em *= (0.05 + 1.2 * canto(nrm, p)) * uDentro;
      em *= vis * k;
    }
  }
`;

const FONDO = /* glsl */ `
  void main() {
    gl_FragColor = vec4(vec3(0.002, 0.003, 0.004), 1.0);
  }
`;

export const dentro: Escena = {
  id: 'dentro',
  nombre: 'Una dentro de otra',
  estilos: [{ key: '1', nombre: 'Una dentro de otra · Muchos que son uno', nota: 'Una célula grande se traga a una chica y no la deshace: sigue latiendo adentro, con su color y su ritmo, y se divide. Después la célula se divide y sus hijas no se sueltan: un cuerpo.' }],
  montar(stage): Instancia {
    const { root, camera } = stage;
    root.add(pantalla(FONDO).mesh);

    const M = mundo();
    const U = {
      uCam: { value: V() },
      uHero: { value: V() },
      uGuest: { value: V() },
      uDentro: { value: 0 },
      uParte: { value: 0 },
      uParte2: { value: 0 },
      uCrece: { value: 0 },
      uUno: { value: 0 },
      uOjo: { value: 0 },
      uVerdes: { value: 1 },
      uHeroK: { value: 1 },
    };
    const todo = materia(M.data, { pre: PRE, move: MOVE, uniforms: U, extra: { aC: [M.aC, 3], aP: [M.aP, 3], aL: [M.aL, 3], aQ: [M.aQ, 4], aG: [M.aG, 4] } });
    root.add(todo.points);

    const tl = new Timeline({ luz: 0, hx: -5.6, gx: 4.4, gy: 0.7, gz: 0, dentro: 0, parte: 0, parte2: 0, crece: 0, uno: 0, ojo: 0, verdes: 1, heroK: 1 });
    const cam = (dur: number, p: THREE.Vector3, t: THREE.Vector3, e: Ease | null = null) => tl.to(dur, { px: p.x, py: p.y, pz: p.z, tx: t.x, ty: t.y, tz: t.z }, e);
    const C = V(0, 0, -RB);
    tl.set({ px: 0, py: 0.6, pz: 17, tx: 0, ty: 0, tz: 0 });
    tl.caption(8, 'Se acerca', 'Entre las que comen luz, una grande se acerca a una chica.');
    tl.with(1.5, { luz: 1 });
    tl.with(8, { hx: -1.3, gx: 3.6 }, EASE.sine);
    cam(8, V(1.2, 0.5, 13), V(1.2, 0, 0), EASE.sine);
    tl.caption(9, 'Una dentro de otra', 'Una célula se tragó a otra. No la deshizo.');
    tl.with(7, { hx: 0, gx: ADENTRO.x, gy: ADENTRO.y, gz: ADENTRO.z }, EASE.sine);
    tl.wait(5);
    tl.with(3, { dentro: 1 });
    tl.wait(-5);
    cam(9, V(2.4, 0.3, 8), V(1.7, -0.1, 0), EASE.sine);
    tl.caption(7, 'Sigue viva', 'Sigue latiendo adentro, con su ritmo y su color.');
    cam(7, V(1.9, 0.1, 4.6), ADENTRO, EASE.sine);
    tl.caption(8, 'Se divide', 'Todavía vive dentro de cada una de las tuyas.');
    tl.with(4, { parte: 1 }, EASE.sine);
    tl.wait(4);
    tl.with(4, { parte2: 1 }, EASE.sine);
    tl.wait(-4);
    cam(8, V(0, 0.4, 10.5), V(0, 0, 0), EASE.sine);
    tl.caption(13, 'Muchos que son uno', 'Después, muchas dejaron de ser cada una.');
    tl.with(13, { crece: 1 }, EASE.sine);
    tl.with(5, { verdes: 0 });
    tl.with(10, { heroK: 0.5 });
    cam(13, V(10, 12, 78), C, EASE.sine);
    tl.caption(8, 'Un solo ritmo', 'Cada una conserva su luz. El ritmo es uno.');
    tl.with(6, { uno: 1 }, EASE.sine);
    cam(8, V(-10, 8, 70), C);
    tl.caption(6, 'Un párpado', 'En el cuerpo se dibuja una línea de luz.');
    tl.with(4.5, { ojo: 1 }, EASE.sine);
    cam(6, V(-4, 4, 64), C, EASE.sine);

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
        camera.near = 0.05;
        camera.far = 3000;
        camera.fov = 40;
        camera.position.set(g('px'), g('py'), g('pz'));
        camera.up.set(0, 1, 0);
        camera.lookAt(g('tx'), g('ty'), g('tz'));
        camera.updateMatrixWorld();
        stage.bloom.strength = 0.3;
        stage.bloom.radius = 0.6;
        stage.bloom.threshold = 0.2;
        U.uCam.value.copy(camera.position);
        U.uHero.value.set(g('hx'), 0, 0);
        U.uGuest.value.set(g('gx'), g('gy'), g('gz'));
        U.uDentro.value = g('dentro');
        U.uParte.value = g('parte');
        U.uParte2.value = g('parte2');
        U.uCrece.value = g('crece');
        U.uUno.value = g('uno');
        U.uOjo.value = g('ojo');
        U.uVerdes.value = g('verdes');
        U.uHeroK.value = g('heroK');
        enfocar(todo, f.focal, f.dpr, f.time);
        todo.u.uMinPx.value = 1.3 * f.dpr;
        todo.u.uMaxPx.value = 9 * f.dpr;
        todo.u.uGain.value = g('luz') * 0.6;
        // The sea swallows what is far: the back of the body is dimmer than the front.
        todo.u.uFog.value = 75;
        todo.u.uFogNear.value = Math.max(0, camera.position.length() - 4);
      },
      placa() {},
      dispose() {},
    };
  },
};
