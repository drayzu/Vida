import * as THREE from 'three';
import { Timeline, EASE } from './timeline';
import { pantalla } from '../src/engine/pantalla';
import { enfocar, materia, materiaBuilder } from '../src/engine/materia';
import { lerp, smoothstep } from '../src/engine/math';
import type { Cuenta, Rotulo } from './placa';
import { SERIE, TIBIO, V } from './comun';
import type { Escena, Frame, Instancia } from './tipos';
import { ESTRELLAS, col, mz, sembrar, type RGB } from './mundos';

/**
 * Study · «Lo supo» (GUION-formas, moment 14). Phase 0.
 *
 * A short moment in the language of «Ya no está»: every living thing is a heart of light that sends
 * out a ring on each beat, and what is left of one is a pale mark. Among the marks, one of the few
 * lights left moves. It reaches a mark and stays beside it. Nothing else happens.
 *
 * It first went on into «Despacio» (its whole life, until its own beat stopped). Diego found that
 * very boring (15 Nov 2026) and it was cut; the shader still knows how to do it (`uVida`, `uMuere`).
 */

const BLANCO: RGB = [TIBIO.r, TIBIO.g, TIBIO.b];
const rgb = (c: THREE.Color): RGB => [c.r, c.g, c.b];
const HEROE_COLOR = mz(rgb(SERIE.abismo), rgb(SERIE.mente), 0.35);

/** Where the one we watch ends up: right beside the mark at the origin. */
const JUNTO = V(2.2, 0, 0.4);
const CAMINO = new THREE.CatmullRomCurve3([V(-44, 0, -34), V(-30, 0, -17), V(-19, 0, -21), V(-10, 0, -8), V(-3.5, 0, -4.5), V(1.2, 0, -1.6), JUNTO], false, 'centripetal');

type Ser = {
  /** Where it stays. */
  c: THREE.Vector3;
  /** Where it comes from and where it goes, and when (in `vida`, 0–1). */
  de?: THREE.Vector3;
  a?: THREE.Vector3;
  llega?: number;
  sale?: number;
  /** Born here: when, and how long it takes to grow. */
  nace?: number;
  crece?: number;
  /** 0: a being · 1: the one we watch · 2: a mark. */
  quien: number;
  R: number;
  per: number;
  lobes: number;
  color: RGB;
  n: number;
  size: number;
  cuerpo: number;
  doble?: boolean;
  brillo?: number;
};

function campo() {
  const b = materiaBuilder(733);
  const r = b.r;
  const aC: number[] = [];
  const aA: number[] = [];
  const aT: number[] = [];
  const aQ: number[] = [];
  const aM: number[] = [];
  const ser = (s: Ser) => {
    const fase = r();
    const de = s.de ?? s.c;
    const a = s.a ?? s.c;
    const A = [de.x, de.z, a.x, a.z];
    const T = [s.llega ?? -1, s.sale ?? 9, s.nace ?? -1, s.crece ?? 1];
    const brillo = s.brillo ?? 1;
    const put = (local: [number, number, number] | null, color: RGB, size: number, luz: number, kind: number, Q: number[], M: number[]) => {
      if (local) b.push(local[0], local[1], local[2], col(color), size, luz, { kind });
      else b.push(s.c.x, s.c.y, s.c.z, col(color), size, luz, { kind });
      aC.push(s.c.x, s.c.y, s.c.z);
      aA.push(A[0], A[1], A[2], A[3]);
      aT.push(T[0], T[1], T[2], T[3]);
      aQ.push(Q[0], Q[1], Q[2], Q[3]);
      aM.push(M[0], M[1], M[2], M[3]);
    };
    put(null, mz(s.color, BLANCO, 0.35), s.size * 1.5, brillo, 0, [fase, s.per, 0, s.R], [s.lobes, 0, s.quien, 0]);
    if (s.quien !== 2) {
      for (let k = 0; k < (s.doble ? 2 : 1); k++) {
        const m = k ? Math.round(s.n * 0.7) : s.n;
        for (let i = 0; i < m; i++) put(null, s.color, s.size, 0.9 * brillo, 1, [fase, s.per, (i / m) * Math.PI * 2, s.R * (k ? 0.62 : 1)], [s.lobes, k ? 0.13 : 0, s.quien, 0]);
      }
    }
    for (let i = 0; i < s.cuerpo; i++) {
      const ang = r() * Math.PI * 2;
      // Half of the points draw its edge, so the body and its mark have a shape.
      const borde = i % 2 === 0;
      const forma = s.R * 0.42 * (0.35 + 0.65 * Math.abs(Math.cos((s.lobes * ang) / 2)));
      const rad = forma * (borde ? 1 : Math.sqrt(r()));
      put([Math.cos(ang) * rad, 0.05 * s.R * (1 - rad / (s.R * 0.42)), Math.sin(ang) * rad], s.color, s.size * 0.9, (borde ? 0.8 : 0.5) * brillo, 3, [fase, s.per, ang, s.R], [s.lobes, 0, s.quien, 0]);
    }
  };

  // The marks: almost everything that has lived is gone.
  const paso: THREE.Vector3[] = [];
  for (let i = 0; i <= 80; i++) paso.push(CAMINO.getPoint(i / 80));
  const PALETA = [SERIE.espacio, SERIE.tiempo, SERIE.destino, SERIE.infinito, SERIE.mente, SERIE.abismo].map(rgb);
  let vivos = 0;
  sembrar(r, 2400, -46, 12, 240, (x, z) => {
    if (x > -4 && x < 12 && z > -4.5 && z < 9) return;
    if (paso.some((q) => Math.hypot(q.x - x, q.z - z) < 2.4)) return;
    const d = Math.hypot(x, z);
    const per = 0.22 * Math.pow(36, r() * r());
    const R = 0.42 * Math.pow(per, 0.6) * (0.8 + 0.5 * r()) * 1.8;
    const size = 0.004 * Math.max(d, 5);
    // A few are still alive, far away.
    const vivo = d > 30 && r() < 0.006;
    if (vivo) vivos++;
    ser({ c: V(x, 0, z), quien: vivo ? 0 : 2, R, per, lobes: 3 + Math.floor(r() * 5), color: PALETA[Math.floor(r() * 6)], n: 40, size, cuerpo: d < 30 ? 110 : d < 80 ? 44 : 16, brillo: vivo ? 0.9 : Math.min(1, Math.max(0.1, 12 / d)) });
  });
  // The mark it stays beside.
  ser({ c: V(0, 0, 0), quien: 2, R: 2.0, per: 1, lobes: 4, color: BLANCO, n: 0, size: 0.02, cuerpo: 1700, brillo: 1.4 });
  // The one we watch: two strokes, five lobes.
  ser({ c: JUNTO, quien: 1, R: 2.0, per: 1, lobes: 5, color: HEROE_COLOR, n: 520, size: 0.02, cuerpo: 1700, doble: true, brillo: 1.6 });
  // Its way among the marks: one continuous line.
  for (let i = 0; i < 2600; i++) {
    const s = i / 2600;
    const q = CAMINO.getPoint(s);
    b.push(q.x, 0.02, q.z, col(BLANCO), 0.035, 0.5, { kind: 5 });
    aC.push(q.x, 0, q.z);
    aA.push(0, 0, 0, 0);
    aT.push(-1, 9, -1, 1);
    aQ.push(s, 1, 0, 0);
    aM.push(0, 0, 3, 0);
  }

  const f = (a: number[]) => new Float32Array(a);
  return { data: b.data(), aC: f(aC), aA: f(aA), aT: f(aT), aQ: f(aQ), aM: f(aM), vivos };
}

const PRE = /* glsl */ `
  attribute vec3 aC;
  attribute vec4 aA, aT, aQ, aM;
  uniform vec3 uHeroe;
  uniform float uCamino, uVida, uMuere, uLatido;
`;

const MOVE = /* glsl */ `
  vec3 tibio = vec3(1.0, 0.89, 0.8);
  float quien = aM.z;
  vec3 base = aC;
  float esc = 1.0;
  float d = 0.0;
  float tt = uTime / aQ.y + aQ.x;
  if (quien > 1.5) {
    d = 1.0;
  } else if (quien > 0.5) {
    // The one we watch: it walks, and its heart keeps its own time.
    base = uHeroe;
    d = uMuere;
    tt = uLatido;
  } else {
    float llega = smoothstep(aT.x - 0.08, aT.x, uVida);
    float sale = smoothstep(aT.y, aT.y + 0.12, uVida);
    base = mix(mix(vec3(aA.x, 0.0, aA.y), aC, llega), vec3(aA.z, 0.0, aA.w), sale);
    if (aT.z >= 0.0) esc = smoothstep(aT.z, aT.z + 0.02, uVida) * (0.38 + 0.62 * smoothstep(aT.z, aT.z + aT.w, uVida));
  }
  float hay = step(0.001, esc);
  if (aKind < 0.5) {
    float ph = fract(tt);
    float on = d < 0.999 ? smoothstep(d - 0.04, d, ph) : 0.0;
    // The heart; when it stops, a pale mark stays where it was.
    em = (em * (0.1 + 1.0 * exp(-ph * 6.0)) * on + tibio * 0.035 * d) * hay;
    fuente = 0.7;
    p = base;
  } else if (aKind < 2.5) {
    float ph = fract(tt - aM.y);
    float on = d < 0.999 ? smoothstep(d - 0.04, d, ph) : 0.0;
    float rr = aQ.w * esc * (0.1 + 0.9 * ph) * (1.0 + 0.16 * cos(aM.x * aQ.z));
    p = base + vec3(cos(aQ.z), 0.0, sin(aQ.z)) * rr;
    // The ring is the form: brightest while it opens, not at the heart.
    em *= 1.6 * smoothstep(0.0, 0.1, ph) * pow(1.0 - ph, 1.3) * on * hay;
  } else if (aKind < 4.0) {
    float ph = fract(tt);
    float on = d < 0.999 ? smoothstep(d - 0.04, d, ph) : 0.0;
    p = base + position * esc * (1.0 + 0.06 * exp(-ph * 5.0) * on);
    float l = dot(em, vec3(0.333));
    em = mix(em * (0.3 + 0.9 * exp(-ph * 5.0) * on), tibio * 0.16 * l, d) * hay;
  } else {
    // Its trail: drawn behind it, and fainter as its life goes on.
    em *= step(aQ.x, uCamino) * step(0.0005, uCamino) * (0.3 + 1.3 * exp(-(uCamino - aQ.x) * 26.0)) * (1.0 - 0.75 * smoothstep(0.0, 0.3, uVida));
    fuente = 0.6;
  }
`;

const FONDO = /* glsl */ `
  ${ESTRELLAS}
  void main() {
    vec3 d = normalize(vDir);
    gl_FragColor = vec4(vec3(0.003) + estrellas(d) * 0.7, 1.0);
  }
`;

export const supo: Escena = {
  id: 'supo',
  nombre: 'Lo supo',
  estilos: [{ key: '1', nombre: 'Lo supo', nota: 'Entre las marcas, una de las pocas luces que quedan llega hasta una y se queda al lado. No hace nada más.' }],
  montar(stage): Instancia {
    const { root, camera } = stage;
    const fondo = pantalla(FONDO, {});
    root.add(fondo.mesh);

    const M = campo();
    const U = { uHeroe: { value: V() }, uCamino: { value: 0 }, uVida: { value: 0 }, uMuere: { value: 0 }, uLatido: { value: 0 } };
    const seres = materia(M.data, { pre: PRE, move: MOVE, uniforms: U, extra: { aC: [M.aC, 3], aA: [M.aA, 4], aT: [M.aT, 4], aQ: [M.aQ, 4], aM: [M.aM, 4] } });
    seres.u.uFog.value = 230;
    seres.u.uFogNear.value = 30;
    root.add(seres.points);

    const tl = new Timeline({ luz: 0, camino: 0, vida: 0, px: -8, py: 30, pz: 38, tx: -12, ty: 0, tz: -12 });
    tl.caption(12.5, 'Lo supo', 'Una vez, algo vivo supo que iba a morir.');
    tl.with(1.5, { luz: 1 });
    tl.with(9.5, { camino: 1 }, EASE.out);
    tl.to(6, { px: 10, py: 8, pz: 16, tx: 0, ty: 0, tz: -1 }, EASE.sine);
    tl.to(4, { px: 5.6, py: 2.7, pz: 7.6, tx: 1.6, ty: 0.1, tz: 0.6 }, EASE.sine);
    // It stays. Nothing else happens.
    tl.wait(2.5);
    tl.caption(5, 'Hacia arriba', '');
    tl.to(5, { py: 2.4, ty: 26, tz: -30 }, EASE.sine);

    let fase = 0;
    return {
      tl,
      escalera: false,
      cuenta(): Cuenta | null {
        return null;
      },
      rotulo(p): Rotulo | null {
        const cp = tl.captionAt(p);
        return cp ? { capitulo: 'II · No es para nosotros', name: cp.name, fact: cp.fact } : null;
      },
      update(f: Frame) {
        const g = (k: string) => tl.get(k, f.p);
        const vida = g('vida');
        camera.near = 0.05;
        camera.far = 4000;
        camera.fov = 40;
        camera.position.set(g('px'), g('py'), g('pz'));
        camera.up.set(0, 1, 0);
        camera.lookAt(g('tx'), g('ty'), g('tz'));
        camera.updateMatrixWorld();
        stage.bloom.strength = 0.5;
        stage.bloom.radius = 0.6;
        stage.bloom.threshold = 0.2;
        // Its heart at our pace: once a second, and slower towards the end.
        fase += f.dt / lerp(1.0, 2.1, smoothstep(0.76, 0.92, vida));
        U.uLatido.value = fase;
        U.uHeroe.value.copy(CAMINO.getPoint(g('camino')));
        U.uCamino.value = g('camino');
        U.uVida.value = vida;
        U.uMuere.value = smoothstep(0.9, 0.935, vida);
        enfocar(seres, f.focal, f.dpr, f.time);
        seres.u.uMinPx.value = 1.5 * f.dpr;
        seres.u.uMaxPx.value = 8 * f.dpr;
        seres.u.uGain.value = g('luz') * 0.8;
      },
      placa() {},
      dispose() {},
    };
  },
};
