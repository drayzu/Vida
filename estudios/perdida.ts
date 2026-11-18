import * as THREE from 'three';
import { Timeline, EASE, type Ease } from './timeline';
import { pantalla } from '../src/engine/pantalla';
import { enfocar, materia, materiaBuilder } from '../src/engine/materia';
import { clamp, smoothstep } from '../src/engine/math';
import { FONT, ink, type Cuenta, type Rotulo } from './placa';
import { SERIE, TIBIO, V } from './comun';
import type { Escena, Frame, Instancia } from './tipos';
import { ESTRELLAS, col, mz, sembrar, type RGB } from './mundos';

/**
 * Study · «Ya no está» and «Lo que vuelve» (GUION-v2, moments 12–13 and 32). Phase 0.
 *
 * The first study that is not after wonder. Everything so far tests whether the work can amaze;
 * this one tests whether it can hurt, and then console without promising.
 *
 * A sea of pulses: every living thing is a heart of light that sends out a ring on each beat, with
 * its own colour, size and rhythm. One of them, near the camera, beats in two strokes; the clock
 * shows how long its heartbeat lasts. Then the lights go out in waves. Nothing happens to them:
 * the next beat does not come. What is left of each is a pale mark. The one we were watching is
 * among the last.
 *
 * Later, under another sky, the mark beats again, with the same two strokes, drawn dotted (the
 * series' line for what is speculative). Some others follow. Most do not.
 */

const BLANCO: RGB = [TIBIO.r, TIBIO.g, TIBIO.b];
const PALETA: RGB[] = [SERIE.espacio, SERIE.tiempo, SERIE.destino, SERIE.infinito, SERIE.mente, SERIE.abismo].map((c) => [c.r, c.g, c.b] as RGB);
const HEROE = { c: V(0, 0, -6), R: 2.3, per: 2.6, lobes: 5 };
const OLAS = [0.12, 0.3, 0.48, 0.66, 0.84];

function mar() {
  const b = materiaBuilder(401);
  const r = b.r;
  const aC: number[] = [];
  const aQ: number[] = [];
  const aM: number[] = [];
  const put = (c: THREE.Vector3, local: [number, number, number] | null, color: RGB, size: number, luz: number, kind: number, Q: number[], M: number[]) => {
    if (local) b.push(local[0], local[1], local[2], col(color), size, luz, { kind });
    else b.push(c.x, c.y, c.z, col(color), size, luz, { kind });
    aC.push(c.x, c.y, c.z);
    aQ.push(Q[0], Q[1], Q[2], Q[3]);
    aM.push(M[0], M[1], M[2], M[3]);
  };

  /** One being: a heart, the ring it sends out on each beat and, for the near ones, a small body. */
  const ser = (c: THREE.Vector3, R: number, per: number, lobes: number, color: RGB, td: number, tr: number, n: number, size: number, cuerpo: number, doble: boolean, brillo = 1) => {
    const fase = r();
    put(c, null, mz(color, BLANCO, 0.35), size * 1.5, brillo, 0, [fase, per, 0, R], [td, tr, lobes, 0]);
    for (let k = 0; k < (doble ? 2 : 1); k++) {
      const m = k ? Math.round(n * 0.7) : n;
      // Dashes: every other group of points is left out when the being comes back.
      const g = Math.max(1, Math.round(m / (doble ? 72 : 18)));
      for (let i = 0; i < m; i++) {
        put(c, null, color, size, 0.9 * brillo, 1 + (Math.floor(i / g) % 2), [fase, per, (i / m) * Math.PI * 2, R * (k ? 0.62 : 1)], [td, tr, lobes, k ? 0.13 : 0]);
      }
    }
    for (let i = 0; i < cuerpo; i++) {
      const a = r() * Math.PI * 2;
      const rad = R * 0.42 * (0.35 + 0.65 * Math.abs(Math.cos((lobes * a) / 2))) * Math.sqrt(r());
      put(c, [Math.cos(a) * rad, 0.05 * R * (1 - rad / (R * 0.42)), Math.sin(a) * rad], color, size * 0.9, 0.55 * brillo, 3, [fase, per, a, R], [td, tr, lobes, r() < 0.5 ? 1 : 0]);
    }
  };

  const dirs = OLAS.map(() => {
    const a = r() * Math.PI * 2;
    return [Math.cos(a), Math.sin(a)] as const;
  });
  let total = 0;
  let quedan = 0;
  let vuelven = 0;
  sembrar(r, 24_000, -150, 26, 280, (x, z, dm) => {
    if (Math.hypot(x - HEROE.c.x, z - HEROE.c.z) < 3.6) return;
    // Slow hearts are big, fast ones small.
    const per = 0.22 * Math.pow(36, r() * r());
    const R = 0.42 * Math.pow(per, 0.6) * (0.8 + 0.5 * r());
    const color = PALETA[Math.floor(r() * PALETA.length)];
    const k = Math.floor(r() * OLAS.length);
    // More than 99 % of everything that has lived is gone.
    const queda = r() < 0.008;
    const td = queda ? 2 : clamp(OLAS[k] + (0.09 * (x * dirs[k][0] + z * dirs[k][1])) / 160 + 0.012 * r(), 0.02, 0.9);
    const tr = !queda && r() < 0.2 ? 0.16 + 0.84 * r() : 2;
    const cerca = dm < 22;
    ser(V(x, 0, z), R, per, 3 + Math.floor(r() * 5), color, td, tr, cerca ? 64 : dm < 70 ? 28 : 12, 0.0038 * Math.max(dm, 4), cerca ? 70 : 0, false, clamp(34 / dm, 0.4, 1));
    total++;
    if (queda) quedan++;
    if (tr < 2) vuelven++;
  });
  // The one we watch: two strokes, five lobes, among the last to go and the first to come back.
  ser(HEROE.c, HEROE.R, HEROE.per, HEROE.lobes, mz(PALETA[5], PALETA[4], 0.35), 0.93, 0.07, 520, 0.02, 1500, true, 1.7);

  const f = (a: number[]) => new Float32Array(a);
  return { data: b.data(), aC: f(aC), aQ: f(aQ), aM: f(aM), total: total + 1, quedan, vuelven: vuelven + 1 };
}

const MOVE = /* glsl */ `
  float tt = uTime / aQ.y + aQ.x;
  // Dying takes about one beat of its own: the ring already out finishes, and no new one is born.
  float w = clamp(aQ.y * 0.05, 0.008, 0.15);
  float d = smoothstep(aM.x - w, aM.x, uMuerte);
  float vuelve = smoothstep(aM.y - 0.004, aM.y + 0.004, uVuelve);
  // What comes back is drawn dotted: the line of what is only possible.
  float punteado = vuelve * step(0.999, d);
  float marca = d * (1.0 - vuelve);
  vec3 tibio = vec3(1.0, 0.89, 0.8);
  if (aKind < 0.5) {
    float ph = fract(tt);
    float on = max(d < 0.999 ? smoothstep(d - 0.04, d, ph) : 0.0, vuelve);
    // The heart; when it stops, a pale mark stays where it was.
    em = em * (0.1 + 1.0 * exp(-ph * 6.0)) * on + tibio * 0.035 * marca;
    fuente = 0.7;
    p = aC;
  } else if (aKind < 2.5) {
    float ph = fract(tt - aM.w);
    float on = max(d < 0.999 ? smoothstep(d - 0.04, d, ph) : 0.0, vuelve);
    float rr = aQ.w * (0.1 + 0.9 * ph) * (1.0 + 0.16 * cos(aM.z * aQ.z));
    p = aC + vec3(cos(aQ.z), 0.0, sin(aQ.z)) * rr;
    // The ring is the form: brightest while it opens, not at the heart.
    em *= 1.6 * smoothstep(0.0, 0.1, ph) * pow(1.0 - ph, 1.3) * on * (aKind > 1.5 ? 1.0 - punteado : 1.0);
  } else {
    float ph = fract(tt);
    float on = max(d < 0.999 ? smoothstep(d - 0.04, d, ph) : 0.0, vuelve);
    float cuerpo = max(1.0 - d, vuelve);
    p = aC + position * (1.0 + 0.06 * exp(-ph * 5.0) * on);
    em = mix(tibio * 0.08, em * (0.3 + 0.9 * exp(-ph * 5.0) * on), cuerpo) * (aM.w > 0.5 ? 1.0 - punteado : 1.0);
  }
`;

const FONDO = /* glsl */ `
  uniform float uCielo;
  ${ESTRELLAS}
  void main() {
    vec3 d = normalize(vDir);
    vec3 a = vec3(0.003) + estrellas(d);
    // Another sky: other stars, and three small suns low over the horizon.
    vec3 b = vec3(0.004, 0.003, 0.008) + estrellas(vec3(d.z, d.y, -d.x)).bgr;
    vec3 S[3] = vec3[3](normalize(vec3(0.087, 0.087, -0.992)), normalize(vec3(0.496, 0.122, -0.86)), normalize(vec3(0.668, 0.061, -0.742)));
    vec3 C[3] = vec3[3](vec3(1.0, 0.16, 0.42), vec3(0.12, 0.9, 0.7), vec3(0.35, 0.33, 1.0));
    for (int i = 0; i < 3; i++) {
      float cs = max(dot(d, S[i]), 0.0);
      b += C[i] * (smoothstep(0.99988, 0.99995, cs) * 0.8 + pow(cs, 1400.0) * 0.06 + pow(cs, 40.0) * 0.014);
    }
    gl_FragColor = vec4(mix(a, b, uCielo), 1.0);
  }
`;

export const perdida: Escena = {
  id: 'perdida',
  nombre: 'Ya no está',
  estilos: [{ key: '1', nombre: 'Ya no está · Lo que vuelve', nota: 'Un mar de pulsos: cada vida es un corazón que suelta un anillo en cada latido. Se apagan en olas; el próximo latido simplemente no llega. Después, bajo otro cielo, uno vuelve a latir igual que antes.' }],
  montar(stage): Instancia {
    const { root, camera } = stage;

    const fondo = pantalla(FONDO, { uCielo: { value: 0 } });
    root.add(fondo.mesh);

    const M = mar();
    const U = { uMuerte: { value: 0 }, uVuelve: { value: 0 } };
    const seres = materia(M.data, {
      pre: /* glsl */ `attribute vec3 aC; attribute vec4 aQ, aM; uniform float uMuerte, uVuelve;`,
      move: MOVE,
      uniforms: U,
      extra: { aC: [M.aC, 3], aQ: [M.aQ, 4], aM: [M.aM, 4] },
    });
    seres.u.uFog.value = 230;
    seres.u.uFogNear.value = 30;
    root.add(seres.points);

    const tl = new Timeline({ muerte: 0, vuelve: 0, cielo: 0, luz: 0 });
    const cam = (dur: number, p: THREE.Vector3, t: THREE.Vector3, e: Ease | null = null) => tl.to(dur, { px: p.x, py: p.y, pz: p.z, tx: t.x, ty: t.y, tz: t.z }, e);
    const H = HEROE.c;
    const JUNTO = V(-2.6, 1.9, 0.4);
    tl.set({ px: 0, py: 30, pz: 34, tx: 0, ty: 0, tz: -90 });
    tl.caption(6, 'Todo lo que late', 'Un colibrí late veinte veces por segundo. Una ballena azul, dos por minuto.');
    tl.with(1.5, { luz: 1 });
    cam(6, V(-5, 7, 12), V(0, 0, -30));
    tl.caption(9, 'Ya no está', 'Casi todo lo que ha vivido ya no está.');
    tl.with(9, { muerte: 1 }, EASE.linear);
    cam(4, JUNTO, H.clone().add(V(0.6, 0, -3)));
    cam(5, JUNTO.clone().add(V(0.3, -0.2, -0.4)), H.clone().add(V(0.2, 0, -1)));
    // Quiet: the marks, and nothing beating near.
    tl.wait(3.5);
    tl.caption(7, 'Lo que vuelve', 'Algo que se había perdido, otra vez vivo, bajo otro cielo.');
    tl.with(2.5, { cielo: 1 });
    tl.wait(2.5);
    tl.to(1, { vuelve: 0.1 }, EASE.linear);
    cam(3.5, JUNTO.clone().add(V(0.3, 0.1, 0)), H.clone().add(V(0.2, 0, -1)));
    tl.caption(6, 'Bajo otro cielo', '');
    tl.with(6, { vuelve: 1 }, EASE.linear);
    cam(6, V(-3.6, 3.2, 2.6), V(0.8, 0, -14));

    return {
      tl,
      escalera: false,
      cuenta(): Cuenta | null {
        return null;
      },
      rotulo(p): Rotulo | null {
        const cp = tl.captionAt(p);
        if (!cp) return null;
        return { capitulo: cp.name === 'Lo que vuelve' || cp.name === 'Bajo otro cielo' ? 'V · Los jardines' : 'I · El hilo', name: cp.name, fact: cp.fact };
      },
      update(f: Frame) {
        const g = (k: string) => tl.get(k, f.p);
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
        fondo.u.uCielo.value = g('cielo');
        U.uMuerte.value = g('muerte');
        U.uVuelve.value = g('vuelve');
        enfocar(seres, f.focal, f.dpr, f.time);
        seres.u.uMinPx.value = 1.5 * f.dpr;
        seres.u.uMaxPx.value = 8 * f.dpr;
        seres.u.uGain.value = g('luz') * 0.8;
      },
      placa(g2, f) {
        // The clock: how long one heartbeat of the one we watch lasts. Blank while it is gone.
        const g = (k: string) => tl.get(k, f.p);
        const m = g('muerte');
        const v = g('vuelve');
        const vivo = 1 - smoothstep(0.88, 0.92, m);
        const vuelto = smoothstep(0.06, 0.08, v);
        const a = Math.max(vivo, vuelto) * g('luz');
        const u = f.u;
        const x = 44 * u;
        g2.save();
        g2.textBaseline = 'alphabetic';
        g2.shadowColor = 'rgba(0,0,0,0.85)';
        g2.shadowBlur = 12 * u;
        g2.globalAlpha = a;
        g2.font = FONT.serif(66 * u);
        g2.fillStyle = ink();
        g2.fillText('2,6 s', x, f.H - 86 * u);
        const w = g2.measureText('2,6 s').width;
        g2.font = FONT.serif(26 * u);
        g2.fillStyle = ink(0.6);
        g2.fillText('un latido', x + w + 12 * u, f.H - 88 * u);
        g2.globalAlpha = g('luz');
        g2.font = FONT.mono(11 * u);
        g2.letterSpacing = `${0.9 * u}px`;
        g2.fillStyle = ink(0.78);
        const linea = a > 0.5 ? (vuelto > vivo ? 'EL QUE MIRABAS · PUNTEADO: LO POSIBLE' : 'EL QUE ESTÁS MIRANDO') : m > 0.5 ? 'NADA LATE CERCA' : '';
        g2.fillText(linea, x, f.H - 52 * u);
        g2.restore();
      },
      dispose() {},
    };
  },
};
