import * as THREE from 'three';
import { Timeline, EASE, type Ease } from './timeline';
import { enfocar, materia, materiaBuilder } from '../src/engine/materia';
import { lerp, smoothstep } from '../src/engine/math';
import { FONT, ink, type Cuenta, type Rotulo } from './placa';
import { SERIE, TIBIO, V } from './comun';
import type { Escena, Frame, Instancia } from './tipos';
import { col, mz, type RGB } from './mundos';

/**
 * Study · «El frío» (GUION-formas, moment 28). Phase 0.
 *
 * The last three suns go out, one by one, and the stars with them. The dark that follows is not
 * empty: slow forests of faint light open in it, more and more of them. For what comes from us, the
 * cold is the best season. At the end each forest gathers into a sphere and stays still: the
 * spheres of «Un planeta azul».
 *
 * It has to read as a season, not as computing: things that grow, branch and bud. All of it is
 * speculative, so every line is dotted.
 */

const BLANCO: RGB = [TIBIO.r, TIBIO.g, TIBIO.b];
const vivo = (c: THREE.Color, k = 2.1): RGB => {
  const l = (c.r + c.g + c.b) / 3;
  return [Math.max(0, l + (c.r - l) * k), Math.max(0, l + (c.g - l) * k), Math.max(0, l + (c.b - l) * k)];
};
const PALETA: RGB[] = [SERIE.destino, SERIE.tiempo, SERIE.infinito, SERIE.abismo, SERIE.mente].map((c) => vivo(c));
const SOLES = [V(-420, 250, -1400), V(-130, 330, -1450), V(120, 210, -1380)];
const MIRA0 = V(-140, 250, -1400);
const LEJOS = 300;

function mundo() {
  const b = materiaBuilder(877);
  const r = b.r;
  const aC: number[] = [];
  const aT: number[] = [];
  const aQ: number[] = [];
  const O = V();
  const dir = () => {
    const [x, y, z] = b.onSphere();
    return V(x, y, z);
  };
  const put = (p: THREE.Vector3, color: RGB, size: number, luz: number, kind: number, C: THREE.Vector3, T: THREE.Vector3, Q: number[]) => {
    b.push(p.x, p.y, p.z, col(color), size, luz, { kind });
    aC.push(C.x, C.y, C.z);
    aT.push(T.x, T.y, T.z);
    aQ.push(Q[0], Q[1], Q[2], Q[3]);
  };

  // The last stars, and the last three suns.
  for (let i = 0; i < 2600; i++) {
    const m = r();
    put(dir().multiplyScalar(2600), mz([1, 0.75, 0.55], [0.75, 0.85, 1], r()), 3.2, 0.25 + 1.6 * m * m * m, 0, O, O, [r(), 0, 0, 0]);
  }
  SOLES.forEach((s, i) => put(s, [1.0, 0.9, 0.75], [30, 22, 26][i], 7, 1, O, O, [i, 0, 0, 0]));

  /**
   * One forest: it grows from a heart in every direction, each arm branching until it ends in a bud.
   * Its points are also given a place on a sphere, where they will gather at the end.
   */
  const bosque = (C: THREE.Vector3, R: number, L: number, hondo: number, cA: RGB, cB: RGB, demora: number, hero: number) => {
    const sem = r();
    const paso = hero ? 0.13 : 0.2 + R * 0.012;
    const size = hero ? 0.07 : 0.1 + 0.01 * R;
    const Rs = R * 0.58;
    const lineas = hero ? 13 : 3;
    // Dotted lines on the sphere: parallels and meridians for the one we watch, three circles for the rest.
    const enEsfera = () => {
      const k = Math.floor(r() * lineas);
      const cortes = hero ? 26 : 10;
      const u = ((Math.floor(r() * cortes) + r() * 0.5) / cortes) * Math.PI * 2;
      if (hero && k < 6) {
        const lat = lerp(-1.1, 1.1, k / 5);
        return V(Math.cos(lat) * Math.cos(u), Math.sin(lat), Math.cos(lat) * Math.sin(u)).multiplyScalar(Rs);
      }
      const a = hero ? ((k - 6) / 7) * Math.PI : k === 0 ? -1 : (k * Math.PI) / 2;
      if (a < 0) return V(Math.cos(u), 0, Math.sin(u)).multiplyScalar(Rs);
      return V(Math.cos(u) * Math.cos(a), Math.sin(u), Math.cos(u) * Math.sin(a)).multiplyScalar(Rs);
    };
    const pon = (p: THREE.Vector3, q: number, kind: number, luz: number, s = 1) => {
      put(C.clone().add(p), mz(mz(cA, cB, Math.min(q, 1)), BLANCO, kind === 3 ? 0.35 : 0.05), size * s, luz, kind, C, enEsfera(), [q, sem, demora, hero]);
    };
    const rama = (p0: THREE.Vector3, d0: THREE.Vector3, len: number, nivel: number, camino: number, total: number) => {
      const m = Math.max(2, Math.round(len / paso));
      const p = p0.clone();
      const d = d0.clone();
      const tuerce = dir().multiplyScalar(0.28 / m);
      for (let i = 0; i < m; i++) {
        d.add(tuerce).normalize();
        p.addScaledVector(d, len / m);
        pon(p, (camino + (len * (i + 1)) / m) / total, 2, 1.7 * Math.pow(0.66, nivel), 1.7 * Math.pow(0.82, nivel));
      }
      const fin = camino + len;
      if (nivel >= hondo) {
        // The bud.
        pon(p.clone().addScaledVector(d, paso * 0.8), fin / total, 3, 1.5, hero ? 2.6 : 2.0);
        return;
      }
      const hijos = nivel < 2 && r() < 0.55 ? 3 : 2;
      for (let h = 0; h < hijos; h++) {
        const eje = dir().cross(d).normalize();
        const nd = d.clone().applyAxisAngle(eje, h === 0 ? 0.08 + 0.14 * r() : 0.45 + 0.3 * r());
        rama(p, nd, len * (h === 0 ? 0.76 : 0.62), nivel + 1, fin, total);
      }
    };
    let total = 0;
    for (let n = 0, l = 1; n <= hondo; n++, l *= 0.76) total += l;
    for (let k = 0; k < L; k++) {
      const l0 = (R / total) * (0.75 + 0.3 * r());
      rama(V(), dir(), l0, 0, 0, R);
    }
    for (let i = 0; i < (hero ? 160 : 14); i++) pon(dir().multiplyScalar(0.05 * R * Math.cbrt(r())), 0, 4, 1.2, 1.5);
  };

  bosque(O, 15, 9, 5, PALETA[0], PALETA[2], 0, 1);
  for (let i = 0; i < 150; i++) {
    const C = dir().multiplyScalar(26 + (LEJOS - 26) * Math.cbrt(r()));
    C.y *= 0.6;
    C.z = C.z * 0.9 - 40;
    if (C.length() < 34) continue;
    const a = Math.floor(r() * PALETA.length);
    bosque(C, 7 + 10 * r() * r(), 4 + Math.floor(r() * 3), 3, PALETA[a], PALETA[(a + 1 + Math.floor(r() * 2)) % PALETA.length], 0.22 + 0.5 * (C.length() / LEJOS) + 0.06 * r(), 0);
  }

  const f = (a: number[]) => new Float32Array(a);
  return { data: b.data(), aC: f(aC), aT: f(aT), aQ: f(aQ) };
}

const PRE = /* glsl */ `
  attribute vec3 aC, aT;
  attribute vec4 aQ;
  uniform vec3 uSoles;
  uniform float uEstrellas, uCrece, uEsfera;
`;

const MOVE = /* glsl */ `
  if (aKind < 0.5) {
    em *= uEstrellas * smoothstep(aQ.x * 0.7, aQ.x * 0.7 + 0.3, uEstrellas);
    fuente = 1.0;
  } else if (aKind < 1.5) {
    // A sun going out: white, then amber, then an ember.
    float s = aQ.x < 0.5 ? uSoles.x : aQ.x < 1.5 ? uSoles.y : uSoles.z;
    em *= vec3(pow(s, 0.5), pow(s, 1.4), pow(s, 3.0)) * s;
    sz *= 0.45 + 0.55 * s;
    fuente = 1.0;
  } else {
    float q = aQ.x;
    float g = smoothstep(aQ.z, aQ.z + 0.25, uCrece);
    // It opens from the heart out, slowly.
    float brote = smoothstep(q - 0.05, q + 0.03, g * 1.1) * smoothstep(0.0, 0.03, g);
    vec3 loc = position - aC;
    loc += 0.02 * length(loc) * vec3(sin(uTime * 0.11 + aQ.y * 30.0 + q * 3.0), cos(uTime * 0.09 + aQ.y * 17.0 + q * 2.0), sin(uTime * 0.07 + aQ.y * 9.0));
    loc *= 0.35 + 0.65 * g;
    // At the end the lights gather into a sphere and stay still.
    float e = smoothstep(aQ.z * 0.5 + seed * 0.25, aQ.z * 0.5 + seed * 0.25 + 0.3, uEsfera);
    p = aC + mix(loc, aT, e);
    // Light travels out along each arm, without hurry.
    float tt = uTime * 0.06 + aQ.y;
    float ola = exp(-pow((q - fract(tt) * 1.2) / 0.1, 2.0));
    float base = aKind < 2.5 ? 0.6 : aKind < 3.5 ? 0.8 : 0.7;
    float vivoL = (base + (aKind < 2.5 ? 1.5 : 2.2) * ola) * brote;
    em = mix(em * vivoL, mix(em, vec3(1.0, 0.89, 0.8) * dot(em, vec3(0.34)), 0.55) * 1.1, e);
    fuente = 0.6;
  }
`;

export const frio: Escena = {
  id: 'frio',
  nombre: 'El frío',
  estilos: [{ key: '1', nombre: 'Se apagan · El frío · Se juntan', nota: 'Los últimos tres soles se apagan. Lo negro no queda vacío: se abren bosques lentos de luz tenue, cada vez más. Al final cada uno se junta en una esfera y se queda quieto.' }],
  montar(stage): Instancia {
    const { root, camera } = stage;
    const M = mundo();
    const U = {
      uSoles: { value: V(1, 1, 1) },
      uEstrellas: { value: 1 },
      uCrece: { value: 0 },
      uEsfera: { value: 0 },
    };
    const todo = materia(M.data, { pre: PRE, move: MOVE, uniforms: U, extra: { aC: [M.aC, 3], aT: [M.aT, 3], aQ: [M.aQ, 4] } });
    root.add(todo.points);

    const tl = new Timeline({ luz: 0, s1: 1, s2: 1, s3: 1, estrellas: 1, crece: 0, esfera: 0 });
    const cam = (dur: number, p: THREE.Vector3, t: THREE.Vector3, e: Ease | null = null) => tl.to(dur, { px: p.x, py: p.y, pz: p.z, tx: t.x, ty: t.y, tz: t.z }, e);
    const O = V(0, 0, 0);
    tl.set({ px: 0, py: 3, pz: 64, tx: MIRA0.x, ty: MIRA0.y, tz: MIRA0.z });
    tl.caption(10, 'Se apagan', 'Los últimos soles se apagan, de a uno.');
    tl.with(1.5, { luz: 1 });
    tl.with(10, { estrellas: 0 }, EASE.sine);
    tl.wait(1.5);
    tl.with(2.6, { s1: 0 }, EASE.in);
    tl.wait(2.6);
    tl.with(2.6, { s2: 0 }, EASE.in);
    tl.wait(2.6);
    tl.with(3.3, { s3: 0 }, EASE.in);
    tl.wait(-6.7);
    cam(10, V(0, 3, 64), MIRA0);
    tl.caption(4, 'Lo negro', '');
    tl.wait(2);
    tl.with(2, { crece: 0.04 }, EASE.linear);
    tl.wait(-2);
    cam(4, V(4, 4, 62), O, EASE.sine);
    tl.caption(12, 'El frío', 'Lo que para nosotros es el final, para ellos es la mejor época.');
    tl.with(12, { crece: 0.3 }, EASE.sine);
    cam(12, V(26, 9, 50), O, EASE.sine);
    tl.caption(13, 'Cada vez más', 'En lo oscuro se abren bosques lentos de luz tenue.');
    tl.with(13, { crece: 1 }, EASE.sine);
    cam(13, V(90, 70, 330), V(0, -6, -40), EASE.sine);
    tl.caption(10, 'Se juntan', 'Las luces se juntan.');
    tl.with(10, { esfera: 1 }, EASE.sine);
    cam(10, V(60, 44, 250), V(0, -4, -30));
    tl.caption(7, 'Quietas', 'Y se quedan quietas.');
    cam(7, V(22, 12, 74), O, EASE.sine);

    return {
      tl,
      escalera: false,
      cuenta(): Cuenta | null {
        return null;
      },
      rotulo(p): Rotulo | null {
        const cp = tl.captionAt(p);
        return cp ? { capitulo: 'III · Lo que viene de nosotros', name: cp.name, fact: cp.fact } : null;
      },
      update(f: Frame) {
        const g = (k: string) => tl.get(k, f.p);
        camera.near = 0.1;
        camera.far = 8000;
        camera.fov = 40;
        camera.position.set(g('px'), g('py'), g('pz'));
        camera.up.set(0, 1, 0);
        camera.lookAt(g('tx'), g('ty'), g('tz'));
        camera.updateMatrixWorld();
        stage.bloom.strength = 0.3;
        stage.bloom.radius = 0.6;
        stage.bloom.threshold = 0.2;
        U.uSoles.value.set(g('s1'), g('s2'), g('s3'));
        U.uEstrellas.value = g('estrellas');
        U.uCrece.value = g('crece');
        U.uEsfera.value = g('esfera');
        enfocar(todo, f.focal, f.dpr, f.time);
        todo.u.uMinPx.value = 1.3 * f.dpr;
        todo.u.uMaxPx.value = 60 * f.dpr;
        todo.u.uGain.value = g('luz') * 0.6;
      },
      placa(g2, f) {
        const a = tl.get('luz', f.p) * smoothstep(14, 16, f.p);
        const u = f.u;
        g2.save();
        g2.textBaseline = 'alphabetic';
        g2.globalAlpha = a;
        g2.font = FONT.mono(11 * u);
        g2.letterSpacing = `${0.9 * u}px`;
        g2.fillStyle = ink(0.78);
        g2.fillText('PUNTEADO: LO POSIBLE', 44 * u, f.H - 52 * u);
        g2.restore();
      },
      dispose() {},
    };
  },
};
