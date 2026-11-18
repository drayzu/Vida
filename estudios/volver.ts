import * as THREE from 'three';
import { Timeline, EASE, type Ease } from './timeline';
import { pantalla } from '../src/engine/pantalla';
import { enfocar, materia, materiaBuilder } from '../src/engine/materia';
import { lerp, smoothstep } from '../src/engine/math';
import type { Cuenta, Rotulo } from './placa';
import { TIBIO, V } from './comun';
import type { Escena, Frame, Instancia } from './tipos';
import { col, type RGB } from './mundos';
import { COLORES, FONDO, MANADA, MOVE as MOVE_DUELO, PRE as PRE_DUELO, X2, mundo as mundoDuelo } from './duelo';

/**
 * Study · «Volver» (GUION-formas, moment 31). Phase 0.
 *
 * The place of «Años después» (`duelo.ts`), much later: the two sets of bones, at night. Nobody is
 * left. Something that comes from us arrives: a small light with a dotted trail.
 *  - it comes down and touches the first bones. Over them, drawn in dots and rising from the ground,
 *    the one who led stands again. She does not beat yet;
 *  - it crosses to the other bones. Over them, the one who was the calf, as small as she was;
 *  - a heart lights. They move: the big one lowers her head, the calf lifts her trunk, and they
 *    touch;
 *  - where they touch there are two cells. They become one. It beats;
 *  - under it, two trails run side by side: the continuous one and the dotted one.
 *
 * Everything that is made again is dotted. What was is continuous: the bones, the ground.
 */

const BLANCO: RGB = [TIBIO.r, TIBIO.g, TIBIO.b];
const ELLOS: RGB = [0.55, 0.78, 1.0];
const N = COLORES.length;
const S1 = V(0.5, 0.6, 1.0);
const S2 = V(X2 - 0.5, 0.6, 1.0);
/** Where the one who led stands, facing the other bones. */
const XB = 7.0;
const ESCALA_CRIA = 0.45;

/** The way of the one who comes: down to the bones, across, and up to watch. */
const CAMINO = new THREE.CatmullRomCurve3([
  V(15, 17, -8),
  V(11.5, 7, -1),
  S2.clone().add(V(0.9, 1.3, 0.7)),
  S2.clone().add(V(-0.4, 0.45, 0.9)),
  S2.clone().add(V(0.3, 1.0, -0.3)),
  V(4.4, 3.4, 2.4),
  S1.clone().add(V(0.3, 0.45, 0.9)),
  S1.clone().add(V(-0.5, 1.1, -0.2)),
  V(3.4, 5.6, 0.4),
]);

/** The tip of a trunk, in the elephant's own frame: the same two turns the shader makes. */
function punta(cabeza: number, trompa: number) {
  const gira = (x: number, y: number, cx: number, cy: number, a: number) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)];
  const [x, y] = gira(2.91, 0.43, 2.55, 2.15, 1.1 * trompa);
  return gira(x, y, 1.35, 2.45, -0.42 * cabeza);
}

function mundo() {
  const b = materiaBuilder(3131);
  const r = b.r;
  const aQ: number[] = [];
  const put = (p: THREE.Vector3, color: RGB, size: number, luz: number, kind: number, Q: number[]) => {
    b.push(p.x, p.y, p.z, col(color), size, luz, { kind });
    aQ.push(Q[0], Q[1], Q[2], Q[3]);
  };
  const O = V();

  // The one who comes: a core and a dotted ring.
  put(O, ELLOS, 0.22, 1.4, 0, [0, 0, 0, 0]);
  for (let i = 0; i < 160; i++) {
    const [x, y, z] = b.onSphere();
    put(V(x, y, z).multiplyScalar(0.07 * Math.cbrt(r())), ELLOS, 0.02, 0.7, 0, [0, 0, 0, 0]);
  }
  for (let i = 0; i < 240; i++) {
    const a = (i / 240) * Math.PI * 2;
    if (Math.floor(i / 6) % 2) continue;
    put(V(Math.cos(a), Math.sin(a), 0).multiplyScalar(0.3), ELLOS, 0.02, 0.9, 0, [1, 0, 0, 0]);
  }
  // Its trail: dotted.
  for (let i = 0; i < 2600; i++) {
    const u = i / 2599;
    if (Math.floor(u * 150) % 2) continue;
    put(CAMINO.getPoint(u), ELLOS, 0.03, 0.8, 1, [u, 0, 0, 0]);
  }

  // Two cells. Each: a dotted skin and something inside.
  for (const [lado, color] of [
    [-1, COLORES[MANADA.CRIA]],
    [1, COLORES[MANADA.MADRE]],
  ] as [number, RGB][]) {
    for (let i = 0; i < 2600; i++) {
      const [x, y, z] = b.onSphere();
      if (Math.floor((Math.atan2(z, x) / 6.283 + 0.5) * 28 + y * 3) % 2) continue;
      put(V(x, y, z).multiplyScalar(0.085), color, 0.0035, 0.5 + 0.9 * (1 - Math.abs(z)), 2, [lado, 0, r(), 0]);
    }
    for (let i = 0; i < 420; i++) {
      const [x, y, z] = b.onSphere();
      put(V(x, y, z).multiplyScalar(0.03 * Math.cbrt(r())), color, 0.004, 0.8, 2, [lado, 1, r(), 0]);
    }
  }

  // The two trails: the one that was and the one that is made. Side by side.
  for (let i = 0; i < 3000; i++) {
    const s = -1 + 2 * (i / 2999);
    const y = -0.15 + 0.07 * s * s;
    put(V(s * 3.2, y + 0.022, 0), BLANCO, 0.007, 0.9, 3, [s, 0, 0, 0]);
    if (Math.floor(i / 14) % 2 === 0) put(V(s * 3.2, y - 0.022, 0), ELLOS, 0.007, 1.2, 3, [s, 1, 0, 0]);
  }

  return { data: b.data(), aQ: new Float32Array(aQ) };
}

/** The elephants of `duelo`, made again: dotted, and raised from the ground over the bones. */
const PRE_ELEF = /* glsl */ `
  ${PRE_DUELO}
  uniform vec2 uDib;
`;
const MOVE_ELEF = /* glsl */ `
  ${MOVE_DUELO}
  if (aKind < 8.5) {
    float d = aId < 0.5 ? uDib.x : uDib.y;
    float e = smoothstep(0.0, 0.22, d * 1.3 - aL.y / 3.7 - 0.06 * fract(seed * 7.13));
    p.y = mix(0.06 + 0.25 * fract(seed * 13.7), p.y, e * e * (3.0 - 2.0 * e));
    float raya = aKind > 7.5 ? 1.0 : step(0.42, fract((aL.x + aL.y * 1.3 + aL.z) * 3.2));
    float chica = aId < 0.5 ? 1.0 : 0.4;
    em *= e * raya * 1.7 * chica;
    // While it is being drawn, the edge of the drawing is the light of the one who draws.
    em += vec3(0.55, 0.78, 1.0) * 0.5 * chica * raya * e * (1.0 - smoothstep(0.22, 0.6, d * 1.3 - aL.y / 3.7)) * step(d, 0.999);
  }
`;

const PRE = /* glsl */ `
  attribute vec4 aQ;
  uniform vec3 uVisP, uM;
  uniform float uVis, uSep, uUna, uCel, uRastros;
  float lubdub(float x) {
    x = fract(x);
    float a = (x - 0.08) / 0.045;
    float b = (x - 0.27) / 0.05;
    return exp(-a * a) + 0.6 * exp(-b * b);
  }
`;
const MOVE = /* glsl */ `
  if (aKind < 0.5) {
    // The one who comes. It beats very slowly.
    float late = 0.75 + 0.25 * sin(uTime * 0.9);
    p = uVisP + p * (aQ.x > 0.5 ? 0.8 + 0.25 * late : 1.0);
    em *= late * (1.0 - 0.75 * uCel);
    fuente = aQ.x > 0.5 ? 0.0 : 0.8;
  } else if (aKind < 1.5) {
    float w = uVis - aQ.x;
    em *= step(0.0, w) * (0.12 + 0.9 * exp(-w * 9.0)) * (1.0 - 0.8 * uCel);
  } else if (aKind < 2.5) {
    // Two cells that become one.
    float beat = lubdub(uTime * 1.05) * uUna;
    float esc = (aQ.y > 0.5 ? 1.0 : 1.0 + 0.3 * uUna) * (1.0 + 0.07 * beat);
    vec3 q = p;
    if (aQ.y > 0.5) q += 0.012 * uUna * vec3(sin(uTime * 0.7 + aQ.z * 40.0), cos(uTime * 0.9 + aQ.z * 31.0), sin(uTime * 0.5 + aQ.z * 17.0));
    p = uM + q * esc + vec3(aQ.x * uSep * 0.19, 0.0, 0.0);
    em = mix(em, vec3(1.0, 0.89, 0.8) * (em.r + em.g + em.b) * 0.4, 0.45 * uUna) * uCel * (0.8 + 0.9 * beat);
  } else {
    // The trails pass under it: one whole, one dotted.
    p = uM + p;
    em *= step(aQ.x, -1.0 + 2.0 * uRastros) * (0.5 + 1.5 * exp(-(-1.0 + 2.0 * uRastros - aQ.x) * 5.0));
  }
`;

const CAP = 'IV · Volver';

export const volver: Escena = {
  id: 'volver',
  nombre: 'Volver',
  estilos: [{ key: '1', nombre: 'Volver', nota: 'El lugar de «Años después», mucho más tarde. Una luz chica, de rastro punteado, baja hasta los huesos. Sobre unos se levanta, dibujada en punteado, la que guiaba; sobre los otros, la que era la cría. Un corazón se enciende, se tocan con la trompa, y donde se tocan dos células se vuelven una.' }],
  montar(stage): Instancia {
    const { root, camera } = stage;
    const fondo = pantalla(FONDO, {});
    root.add(fondo.mesh);

    const D = mundoDuelo();
    const UE = {
      uCam: { value: V() },
      uPos: { value: COLORES.map(() => new THREE.Vector4()) },
      uPose: { value: COLORES.map(() => new THREE.Vector4()) },
      uToca: { value: new THREE.Vector2() },
      uAnillo: { value: new THREE.Vector2() },
      uSegunda: { value: 1 },
      uVivo: { value: 0 },
      uDib: { value: new THREE.Vector2() },
    };
    const lugar = materia(D.data, { pre: PRE_ELEF, move: MOVE_ELEF, uniforms: UE, extra: { aL: [D.aL, 3], aN: [D.aN, 3], aQ: [D.aQ, 4], aId: [D.aId, 1] } });
    root.add(lugar.points);

    const M = mundo();
    const U = {
      uVisP: { value: V() },
      uM: { value: V() },
      uVis: { value: 0 },
      uSep: { value: 1 },
      uUna: { value: 0 },
      uCel: { value: 0 },
      uRastros: { value: 0 },
    };
    const nuevo = materia(M.data, { pre: PRE, move: MOVE, uniforms: U, extra: { aQ: [M.aQ, 4] } });
    root.add(nuevo.points);

    // Where the trunks meet: the big one lowers her head; the calf lifts hers until they touch.
    const B = { cabeza: 0.25, trompa: 0.8 };
    const tb = punta(B.cabeza, B.trompa);
    let cc = 0;
    for (let c = -1.4, mejor = 1e9; c < 0.4; c += 0.02) {
      const err = Math.abs(punta(c, 0.9)[1] * ESCALA_CRIA - tb[1]);
      if (err < mejor) {
        mejor = err;
        cc = c;
      }
    }
    const C = { cabeza: cc, trompa: 0.9 };
    const MX = XB - tb[0];
    const XC = MX - punta(C.cabeza, C.trompa)[0] * ESCALA_CRIA;
    const TOQUE = V(MX, tb[1], 1.0);
    U.uM.value.copy(TOQUE);

    const tl = new Timeline({ luz: 0, vis: 0, dibB: 0, dibC: 0, vivo: 0, toca: 0, cel: 0, sep: 1, una: 0, rastros: 0, lugar: 1 });
    const cam = (dur: number, p: number[], t: number[], e: Ease | null = EASE.sine) => tl.to(dur, { px: p[0], py: p[1], pz: p[2], tx: t[0], ty: t[1], tz: t[2] }, e);
    tl.set({ px: 4.4, py: 13, pz: 24, tx: 4.6, ty: 0.8, tz: 1 });

    tl.caption(5.5, 'Lo que quedó', 'Quizá un día quieran saber cómo era.');
    tl.with(1.5, { luz: 1 });
    tl.with(5.5, { vis: 0.3 }, EASE.inOut);
    cam(5.5, [5.2, 1.6, 14], [4.8, 2.0, 1]);
    tl.label('ella');
    tl.caption(6, 'La que guiaba', '');
    tl.with(2.4, { vis: 0.5 }, EASE.inOut);
    tl.with(6, { dibB: 1 }, EASE.inOut);
    cam(6, [5.6, 1.5, 11.5], [6.2, 2.2, 1]);
    tl.label('cria');
    tl.caption(5.5, 'La que era la cría', '');
    tl.with(2.6, { vis: 0.8 }, EASE.inOut);
    tl.wait(1.2);
    tl.with(4.3, { dibC: 1 }, EASE.inOut);
    cam(4.3, [3.4, 1.2, 9.5], [3.6, 1.6, 1]);
    tl.label('late');
    tl.caption(6.5, 'Late', 'Quizá nos vuelvan a hacer. No lo sabemos.');
    tl.with(3, { vis: 1 }, EASE.inOut);
    tl.with(1.5, { vivo: 1 });
    tl.wait(1.5);
    tl.with(4.2, { toca: 1 }, EASE.inOut);
    cam(5, [MX + 0.6, 1.25, 7.2], [MX + 0.5, 1.5, 1]);
    tl.label('dos');
    tl.caption(5, 'Dos', '');
    tl.with(2.5, { cel: 1 });
    tl.with(4, { lugar: 0.1 });
    cam(5, [TOQUE.x, TOQUE.y + 0.02, TOQUE.z + 0.95], [TOQUE.x, TOQUE.y, TOQUE.z]);
    tl.label('una');
    tl.caption(7.5, 'Una', '');
    tl.with(2.6, { sep: 0 }, EASE.inOut);
    tl.wait(2.2);
    tl.with(1.2, { una: 1 });
    tl.with(3.8, { rastros: 1 }, EASE.inOut);
    cam(3.8, [TOQUE.x + 0.15, TOQUE.y - 0.03, TOQUE.z + 1.5], [TOQUE.x + 0.15, TOQUE.y - 0.05, TOQUE.z]);
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
        const toca = g('toca');
        for (let i = 0; i < N; i++) UE.uPos.value[i].set(0, 0, 0, 0);
        // She stands over her bones, facing the others. The calf stands over hers, facing her.
        UE.uPos.value[MANADA.MADRE].set(XB, 1.0, Math.PI, 1);
        UE.uPose.value[MANADA.MADRE].set(0, 0, B.cabeza * toca, lerp(0.08, B.trompa, toca));
        UE.uPos.value[MANADA.CRIA].set(XC, 1.0, 0, ESCALA_CRIA);
        UE.uPose.value[MANADA.CRIA].set(0, 0, C.cabeza * toca, lerp(0.08, C.trompa, toca));
        UE.uDib.value.set(g('dibB'), g('dibC'));
        UE.uVivo.value = g('vivo');

        camera.near = 0.05;
        camera.far = 3000;
        camera.fov = 40;
        camera.position.set(g('px'), g('py'), g('pz'));
        camera.up.set(0, 1, 0);
        camera.lookAt(g('tx'), g('ty'), g('tz'));
        camera.updateMatrixWorld();
        stage.bloom.strength = 0.35;
        stage.bloom.radius = 0.6;
        stage.bloom.threshold = 0.2;
        UE.uCam.value.copy(camera.position);
        enfocar(lugar, f.focal, f.dpr, f.time);
        lugar.u.uMinPx.value = 1.3 * f.dpr;
        lugar.u.uMaxPx.value = 9 * f.dpr;
        lugar.u.uGain.value = g('luz') * 0.6 * g('lugar');
        lugar.u.uFog.value = 170;
        lugar.u.uFogNear.value = 30;

        const vis = g('vis');
        CAMINO.getPoint(Math.min(vis, 1), U.uVisP.value);
        U.uVis.value = vis;
        U.uSep.value = g('sep');
        U.uUna.value = g('una');
        U.uCel.value = g('cel');
        U.uRastros.value = g('rastros');
        enfocar(nuevo, f.focal, f.dpr, f.time);
        nuevo.u.uMinPx.value = 1.3 * f.dpr;
        nuevo.u.uMaxPx.value = 9 * f.dpr;
        nuevo.u.uGain.value = g('luz') * 0.7;
      },
      placa() {},
      dispose() {},
    };
  },
};
