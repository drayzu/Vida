import * as THREE from 'three';
import { Timeline, EASE, type Ease } from './timeline';
import { pantalla } from '../src/engine/pantalla';
import { enfocar, materia, materiaBuilder } from '../src/engine/materia';
import { clamp, lerp, smoothstep } from '../src/engine/math';
import type { Cuenta, Rotulo } from './placa';
import { SERIE, TIBIO, V } from './comun';
import type { Escena, Frame, Instancia } from './tipos';
import { ESTRELLAS, col, fbm, lin, mz, sembrar, type RGB } from './mundos';

/**
 * Study · «Se hace el color», second version (BRIEF v2, golden shot 3). Phase 0.
 *
 * The first version filled the frame with coloured points and the shapes were lost. This one keeps
 * the way Diego chose (a giant eye in the dark, the world inside its pupil, the camera goes through)
 * and follows the rule the other studies settled: the black of the series stays and colour is light.
 * The land never gets painted. What lights up, one by one, is what is alive: first the eye itself,
 * then everything green as a wave leaves the eye, and then the flowers as a second wave leaves the
 * first flower. The ground and the sky stay dark.
 */

const BLANCO: RGB = [TIBIO.r, TIBIO.g, TIBIO.b];
const E = V(0, 3.2, 12);
const S_OJO = 4;
const RP = 0.36;

const suelo = (x: number, z: number) => 3.2 * fbm(x * 0.028 + 3, z * 0.028 + 8) + 0.5 * fbm(x * 0.13, z * 0.13) - 1.4;
const HF = V(1.4, suelo(1.4, -22) + 1.15, -22);

const VERDES: RGB[] = [lin('#7ee06a'), lin('#b9e86a'), lin('#4fd08f'), lin('#35b89a')];
const FLORES: RGB[] = [SERIE.espacio, SERIE.mente, SERIE.abismo, SERIE.infinito, SERIE.tiempo].map((c) => [c.r, c.g, c.b] as RGB).concat([BLANCO]);

function prado() {
  const b = materiaBuilder(301);
  const r = b.r;
  const aH: number[] = [];
  const put = (x: number, y: number, z: number, c: RGB, size: number, luz: number, kind: number, h: number) => {
    b.push(x, y, z, col(c), size, luz, { kind });
    aH.push(h);
  };
  const tam = (dm: number) => 0.0036 * Math.max(dm, 4);

  // The ground: never coloured.
  sembrar(r, 210_000, -110, 8, 200, (x, z, dm) => {
    if (z > 9) return;
    put(x, suelo(x, z), z, BLANCO, tam(dm), 0.03, 0, 0);
  });
  // Grass: tufts of a few blades.
  sembrar(r, 17_000, -110, 8, 150, (x, z, dm) => {
    if (z > 9) return;
    const y = suelo(x, z);
    const c = VERDES[Math.floor(r() * 2)];
    const alto = 0.25 + 0.45 * r();
    for (let k = 0; k < 3; k++) {
      const a = r() * Math.PI * 2;
      const inc = 0.15 + 0.3 * r();
      for (let i = 0; i < 5; i++) {
        const t = (i + r()) / 5;
        put(x + Math.cos(a) * inc * t * t, y + alto * t, z + Math.sin(a) * inc * t * t, c, tam(dm), 0.22 + 0.3 * t, 1, alto * t);
      }
    }
  });
  // Ferns: arching fronds from one foot.
  sembrar(r, 1500, -110, 6, 150, (x, z, dm) => {
    if (z > 7 || Math.hypot(x - HF.x, z - HF.z) < 2.5) return;
    const y = suelo(x, z);
    const c = VERDES[2 + Math.floor(r() * 2)];
    const R = 0.6 + 1.1 * r();
    const m = Math.round(clamp(900 / (1 + dm / 25), 160, 620));
    const hojas = 7 + Math.floor(r() * 5);
    for (let i = 0; i < m; i++) {
      const a = (Math.floor(r() * hojas) / hojas) * Math.PI * 2 + 0.6;
      const t = r();
      const o = (r() - 0.5) * 0.5 * R * Math.sin(t * Math.PI);
      const rad = R * t;
      const h = R * 0.9 * Math.sin(t * 2.2);
      put(x + Math.cos(a) * rad - Math.sin(a) * o, y + h, z + Math.sin(a) * rad + Math.cos(a) * o, c, tam(dm), 0.3 + 0.5 * Math.abs(o) + 0.3 * t, 1, h);
    }
  });
  // Trees: a pale trunk and a crown.
  sembrar(r, 420, -110, 0, 170, (x, z, dm) => {
    if (dm < 9) return;
    const y = suelo(x, z);
    const H = 4 + 5 * r();
    const c = VERDES[Math.floor(r() * 4)];
    const m = Math.round(clamp(5200 / (1 + dm / 30), 700, 2600));
    for (let i = 0; i < m; i++) {
      if (r() < 0.12) {
        const t = r();
        put(x + (r() - 0.5) * 0.25, y + H * 0.6 * t, z + (r() - 0.5) * 0.25, mz(BLANCO, lin('#b98a5e'), 0.6), tam(dm), 0.2, 0, 0);
        continue;
      }
      const u = r() * 2 - 1;
      const a = r() * Math.PI * 2;
      const w = Math.sqrt(1 - u * u) * (0.75 + 0.25 * r());
      const bulto = 0.8 + 0.4 * fbm(Math.cos(a) * 2 + x, u * 2 + z);
      const rc = H * 0.34 * bulto;
      put(x + Math.cos(a) * w * rc, y + H * 0.72 + u * rc * 0.85, z + Math.sin(a) * w * rc, c, tam(dm), 0.12 + 0.5 * Math.pow(w, 3), 1, H * 0.5);
    }
  });
  // Flowers: drifts of one colour.
  sembrar(r, 26_000, -110, 6, 190, (x, z, dm) => {
    if (z > 7) return;
    const parche = fbm(x * 0.05 + 31, z * 0.05 + 8);
    if (parche < 0.47 && r() > 0.08) return;
    const y = suelo(x, z);
    const c = FLORES[r() < 0.8 ? Math.floor(parche * 23) % 6 : Math.floor(r() * 6)];
    const alto = 0.3 + 0.35 * r();
    for (let i = 0; i < 4; i++) put(x, y + (alto * (i + r())) / 4, z, VERDES[0], tam(dm), 0.4, 1, (alto * i) / 4);
    const rad = 0.05 + 0.05 * r();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      put(x + Math.cos(a) * rad, y + alto + 0.02 * Math.sin(a * 3), z + Math.sin(a) * rad, c, tam(dm) * 1.5, 1.1, 2, alto);
    }
  });
  return { data: b.data(), aH: new Float32Array(aH) };
}

/** The eye: an iris of fibres between two lids. Closed, every point lies on one line. */
function ojo() {
  const b = materiaBuilder(302);
  const r = b.r;
  const aR: number[] = [];
  const arriba = (x: number) => 0.8 * Math.pow(Math.max(0, 1 - (x / 1.95) ** 2), 0.7);
  const abajo = (x: number) => -0.6 * Math.pow(Math.max(0, 1 - (x / 1.95) ** 2), 0.8);
  const ORO = lin('#ffb347');
  const AMBAR = lin('#ff7a3d');
  const BORDE = lin('#3aa58f');
  const put = (x: number, y: number, c: RGB, size: number, luz: number, rr: number) => {
    b.push(E.x + x * S_OJO, E.y + y * S_OJO, E.z, col(c), size * S_OJO, luz, { from: [E.x + x * S_OJO, E.y + y * 0.02 * S_OJO, E.z], delay: Math.min(1, Math.abs(x) / 1.95) });
    aR.push(rr);
  };
  for (let i = 0; i < 90_000; i++) {
    const f = Math.floor(r() * 260);
    const t = Math.pow(r(), 0.8);
    const rr = lerp(RP, 1, t);
    const a = (f / 260) * Math.PI * 2 + 0.05 * Math.sin(rr * 14 + f) + (r() - 0.5) * 0.012;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (y > arriba(x) || y < abajo(x)) continue;
    const c = t < 0.45 ? mz(ORO, AMBAR, t / 0.45) : mz(AMBAR, BORDE, (t - 0.45) / 0.55);
    put(x, y, c, 0.006, (0.35 + 0.6 * ((f * 7919) % 13) / 13) * (1 - 0.5 * smoothstep(0.85, 1, t)), rr);
  }
  for (let i = 0; i < 5000; i++) {
    const a = r() * Math.PI * 2;
    const x = Math.cos(a) * RP * (1 + 0.02 * r());
    const y = Math.sin(a) * RP * (1 + 0.02 * r());
    if (y > arriba(x) || y < abajo(x)) continue;
    put(x, y, ORO, 0.007, 0.9, RP);
  }
  // The lids.
  for (let i = 0; i < 12_000; i++) {
    const x = (r() * 2 - 1) * 1.95;
    const sup = r() < 0.55;
    put(x, (sup ? arriba(x) : abajo(x)) + (r() - 0.5) * 0.012, BLANCO, 0.006, sup ? 0.7 : 0.45, 2);
  }
  return { data: b.data(), aR: new Float32Array(aR) };
}

/** The first flower: eight petals that open out of a bud. */
function flor() {
  const b = materiaBuilder(303);
  const r = b.r;
  const ROSA: RGB = [SERIE.abismo.r, SERIE.abismo.g, SERIE.abismo.b];
  const NARANJA: RGB = [SERIE.espacio.r, SERIE.espacio.g, SERIE.espacio.b];
  const ORO: RGB = [SERIE.mente.r, SERIE.mente.g, SERIE.mente.b];
  const base = suelo(HF.x, HF.z);
  for (let i = 0; i < 2600; i++) {
    const t = r();
    const y = lerp(base, HF.y, t);
    b.push(HF.x + 0.03 * Math.sin(t * 3), y, HF.z, col(VERDES[0]), 0.004, 0.5, { from: [HF.x, y, HF.z], kind: 1 });
  }
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    for (let i = 0; i < 5200; i++) {
      const u = Math.pow(r(), 0.7);
      const borde = r() < 0.22;
      const v = borde ? (r() < 0.5 ? -1 : 1) : r() * 2 - 1;
      const w = 0.17 * Math.pow(Math.sin(u * Math.PI * 0.94 + 0.1), 0.7);
      const rad = 0.06 + 0.5 * u;
      const y = 0.16 * u * u - 0.05 * v * v;
      const rc = 0.03 + 0.09 * Math.sin(u * Math.PI);
      const o = v * w;
      b.push(HF.x + ca * rad - sa * o, HF.y + y, HF.z + sa * rad + ca * o, col(mz(NARANJA, ROSA, u)), 0.0042, borde ? 1.0 : 0.5 + 0.3 * u, {
        from: [HF.x + ca * rc - sa * o * 0.35, HF.y + 0.5 * u, HF.z + sa * rc + ca * o * 0.35],
        delay: 0.3 * r(),
        kind: 2,
      });
    }
  }
  for (let i = 0; i < 2600; i++) {
    const d = 0.07 * Math.sqrt(r());
    const a = r() * Math.PI * 2;
    b.push(HF.x + Math.cos(a) * d, HF.y + 0.02, HF.z + Math.sin(a) * d, col(ORO), 0.005, 1.0, { from: [HF.x + Math.cos(a) * d * 0.3, HF.y + 0.05, HF.z + Math.sin(a) * d * 0.3], kind: 2 });
  }
  return b.data();
}

const GRIS = /* glsl */ `
  vec3 gris(vec3 c) { return vec3(1.0, 0.89, 0.8) * dot(c, vec3(0.3, 0.6, 0.1)) * 0.5; }
`;

export const color2: Escena = {
  id: 'color2',
  nombre: 'Se hace el color · 2',
  estilos: [{ key: '1', nombre: 'A través del ojo', nota: 'Un ojo se abre en lo negro. El mundo está dentro de su pupila, en blanco. El ojo toma color, la cámara lo cruza y lo vivo se enciende como una ola; después se abre la primera flor y las demás contestan.' }],
  montar(stage): Instancia {
    const { root, camera } = stage;

    const fondo = pantalla(
      /* glsl */ `
      uniform float uCielo;
      ${ESTRELLAS}
      void main() {
        vec3 d = normalize(vDir);
        vec3 c = vec3(0.003) + vec3(1.0, 0.89, 0.8) * 0.012 * exp(-abs(d.y) * 8.0);
        gl_FragColor = vec4((c + estrellas(d)) * uCielo, 1.0);
      }
    `,
      { uCielo: { value: 0 } },
    );
    root.add(fondo.mesh);

    const P = prado();
    const U = {
      uOla1: { value: new THREE.Vector4(E.x, E.y, E.z, 0) },
      uOla2: { value: new THREE.Vector4(HF.x, HF.y, HF.z, 0) },
      uAn1: { value: 1 },
      uAn2: { value: 1 },
      uCr1: { value: 1 },
      uCr2: { value: 1 },
      uPup: { value: new THREE.Vector4(0, 0, 0, 0) },
      uAsp: { value: 16 / 9 },
    };
    const campo = materia(P.data, {
      pre: /* glsl */ `
        attribute float aH;
        uniform vec4 uOla1, uOla2, uPup;
        uniform float uAn1, uAn2, uCr1, uCr2, uAsp;
        ${GRIS}
      `,
      move: /* glsl */ `
        // What is alive lights up when its wave arrives: green things with the first, flowers with the second.
        vec4 ola = aKind > 1.5 ? uOla2 : uOla1;
        float an = aKind > 1.5 ? uAn2 : uAn1;
        float dd = length(position - ola.xyz);
        float enc = aKind < 0.5 ? 0.0 : (1.0 - smoothstep(ola.w - an, ola.w, dd)) * step(0.001, ola.w);
        float cresta = aKind < 0.5 ? 0.0 : exp(-pow((dd - ola.w) / (an * 0.7 + 0.01), 2.0)) * step(0.001, ola.w) * (aKind > 1.5 ? uCr2 : uCr1);
        em = mix(gris(em), em, enc) * (1.0 + 2.6 * cresta);
        p.x += aH * 0.1 * sin(uTime * 0.9 + position.x * 0.4 + position.z * 0.2);
        p.z += aH * 0.07 * cos(uTime * 0.7 + position.z * 0.4);
      `,
      post: /* glsl */ `
        // Before the camera is through it, the world shows only inside the pupil.
        if (uPup.w > 0.5) {
          vec2 q = gl_Position.xy / gl_Position.w - uPup.xy;
          q.x *= uAsp;
          if (length(q) > uPup.z) { em *= 0.0; occ *= 0.0; }
        }
      `,
      uniforms: U,
      extra: { aH: [P.aH, 1] },
    });
    campo.u.uFog.value = 75;
    campo.u.uFogNear.value = 12;
    campo.points.renderOrder = 1;
    root.add(campo.points);

    const O = ojo();
    const iris = materia(O.data, {
      pre: /* glsl */ `attribute float aR; uniform float uOjoC; uniform vec3 uE; ${GRIS}`,
      move: /* glsl */ `
        // The iris never keeps still.
        p.xy = uE.xy + (p.xy - uE.xy) * (1.0 + 0.03 * sin(uTime * 1.2) * (1.0 - min(aR, 1.0)) * k);
        float fr = uOjoC * 1.6;
        float enc = aR > 1.5 ? 0.0 : 1.0 - smoothstep(fr - 0.3, fr, aR);
        float cr = aR > 1.5 ? 0.0 : exp(-pow((aR - (fr - 0.15)) / 0.1, 2.0)) * step(0.01, uOjoC) * (1.0 - smoothstep(0.7, 1.0, uOjoC));
        em = mix(gris(em) * 1.6, em * 0.9, enc) * (1.0 + 1.6 * cr);
        em *= mix(0.25, 1.0, k) * (1.0 + 0.14 * sin(uTime * (0.6 + seed) + seed * 40.0));
      `,
      uniforms: { uOjoC: { value: 0 }, uE: { value: E.clone() } },
      extra: { aR: [O.aR, 1] },
    });
    iris.u.uSpread.value = 0.5;
    iris.points.renderOrder = 3;
    root.add(iris.points);

    const hero = materia(flor(), {
      pre: /* glsl */ `uniform float uFlorC; ${GRIS}`,
      move: /* glsl */ `
        em = mix(gris(em) * 1.3, em, aKind > 1.5 ? uFlorC : 1.0);
        p.x += 0.012 * sin(uTime * 0.9 + p.y * 2.0);
      `,
      uniforms: { uFlorC: { value: 0 } },
    });
    hero.u.uSpread.value = 0.6;
    hero.points.renderOrder = 2;
    root.add(hero.points);

    // ------------------------------------------------ the choreography
    const tl = new Timeline({ abre: 0, ojoC: 0, ola1: 0, ola2: 0, florAbre: 0, florC: 0, luz: 0 });
    const cam = (dur: number, p: THREE.Vector3, t: THREE.Vector3, e: Ease | null = null) => tl.to(dur, { px: p.x, py: p.y, pz: p.z, tx: t.x, ty: t.y, tz: t.z }, e);
    const lejos = V(0, 2.2, -60);
    tl.set({ px: 0, py: E.y, pz: 24, tx: lejos.x, ty: E.y, tz: lejos.z });
    tl.caption(4, 'Sin ojos', 'Durante tres mil millones de años, nada vivo tuvo ojos.');
    cam(4, V(0, E.y, 22), V(0, E.y, -60));
    tl.caption(5, 'El primer ojo', 'Después, la vida aprendió a ver.');
    tl.with(2.8, { abre: 1 }, EASE.inOut);
    tl.with(3.5, { luz: 1 });
    cam(5, V(0, E.y, 18.5), V(0, E.y, -60));
    tl.caption(7, 'Se hace el color', '');
    tl.with(2.4, { ojoC: 1 });
    cam(2.4, V(0, E.y, 16.5), V(0, E.y - 0.3, -60));
    tl.with(6.6, { ola1: 1 }, EASE.linear);
    cam(2.2, V(0, E.y, 11.4), lejos, EASE.in);
    cam(2.4, V(-1.2, suelo(-1.2, 0) + 2.4, 0), V(1, 1.2, -50), EASE.out);
    const FC = HF.clone().add(V(-0.75, 0.42, 1.55));
    tl.caption(6, 'La primera flor', 'Y después, a hacerse ver.');
    cam(3.4, FC, HF.clone().add(V(0.05, 0.08, 0)));
    tl.to(2.6, { florAbre: 1 }, EASE.inOut);
    tl.caption(8, 'Una llamada', 'Mucho del color del mundo es una vida llamando a otra.');
    tl.with(1.6, { florC: 1 });
    tl.with(8, { ola2: 1 }, EASE.linear);
    cam(1.6, FC, HF.clone().add(V(0.05, 0.08, 0)));
    cam(2.6, V(-1.5, suelo(-1.5, -19) + 4.5, -19), V(2, 1, -70));
    cam(3.8, V(-2, suelo(-2, -26) + 13, -26), V(4, 0, -120));

    const q = new THREE.Vector3();
    return {
      tl,
      escalera: false,
      cuenta(): Cuenta | null {
        return null;
      },
      rotulo(p): Rotulo | null {
        const cp = tl.captionAt(p);
        return cp ? { capitulo: 'I · El hilo', name: cp.name, fact: cp.fact } : null;
      },
      update(f: Frame) {
        const g = (k: string) => tl.get(k, f.p);
        camera.near = 0.02;
        camera.far = 4000;
        camera.fov = 40;
        camera.position.set(g('px'), g('py'), g('pz'));
        camera.up.set(0, 1, 0);
        camera.lookAt(g('tx'), g('ty'), g('tz'));
        camera.updateMatrixWorld();
        stage.bloom.strength = 0.5;
        stage.bloom.radius = 0.6;
        stage.bloom.threshold = 0.2;
        U.uAsp.value = f.W / f.H;

        // The pupil as the camera sees it; once through, the whole world is there.
        q.copy(E).applyMatrix4(camera.matrixWorldInverse);
        const th = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        const abre = g('abre');
        const abierto = smoothstep(0.15, 1, abre);
        const dentro = q.z > -0.25;
        if (dentro) U.uPup.value.set(0, 0, 0, 0);
        else U.uPup.value.set(q.x / -q.z / (th * (f.W / f.H)), q.y / -q.z / th, (S_OJO * RP * 0.96 * abierto) / -q.z / th, 1);
        fondo.u.uCielo.value = dentro ? Math.min(1, (fondo.u.uCielo.value as number) + f.dt * 0.8) : 0;

        const o1 = g('ola1');
        const o2 = g('ola2');
        const R1 = o1 > 0 ? 3 * Math.pow(330 / 3, o1) : 0;
        const R2 = o2 > 0 ? 0.3 * Math.pow(330 / 0.3, o2) : 0;
        U.uOla1.value.w = R1;
        U.uOla2.value.w = R2;
        U.uAn1.value = 0.4 + 0.2 * R1;
        U.uAn2.value = 0.1 + 0.2 * R2;
        U.uCr1.value = 1 - smoothstep(0.8, 1, o1);
        U.uCr2.value = 1 - smoothstep(0.8, 1, o2);

        enfocar(campo, f.focal, f.dpr, f.time);
        campo.u.uMinPx.value = 1.5 * f.dpr;
        campo.u.uMaxPx.value = 9 * f.dpr;
        campo.u.uGain.value = g('luz');

        enfocar(iris, f.focal, f.dpr, f.time);
        iris.u.uMinPx.value = 1.5 * f.dpr;
        iris.u.uK.value = abre;
        iris.u.uOjoC.value = g('ojoC');
        // Gone once the camera is through it.
        iris.u.uGain.value = dentro ? 0 : 0.42 * smoothstep(0.2, 1.4, -q.z);

        enfocar(hero, f.focal, f.dpr, f.time);
        hero.u.uMinPx.value = 1.5 * f.dpr;
        hero.u.uMaxPx.value = 9 * f.dpr;
        hero.u.uK.value = g('florAbre');
        hero.u.uFlorC.value = g('florC');
        hero.u.uGain.value = g('luz') * (0.42 + 0.2 * g('florC'));
      },
      dispose() {},
    };
  },
};
