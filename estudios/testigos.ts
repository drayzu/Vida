import * as THREE from 'three';
import { Timeline } from './timeline';
import { pantalla } from '../src/engine/pantalla';
import { enfocar, materia, materiaBuilder } from '../src/engine/materia';
import { clamp, lerp } from '../src/engine/math';
import type { Cuenta, Rotulo } from './placa';
import { TIBIO, V } from './comun';
import type { Escena, Frame, Instancia } from './tipos';
import { ESTRELLAS, col, fbm, lin, mz, sembrar, type Cam, type Mundo, type RGB } from './mundos';

/**
 * Study · «El mundo sin testigos y el océano que se oxida» (BRIEF v2, golden shot 4). Phase 0.
 *
 * The Earth before any eye, and the first thing life did to it. The rule of colour from the other
 * side: where nothing is alive, nothing has colour. The first two are warm white on black; the
 * colour arrives in the third, and life brings it.
 *
 *  1 · Los cristales: beams of crystal that grow in the dark (Naica).
 *  2 · Las dunas: crescent dunes that walk with the wind like herds, the small ones catching the big.
 *  3 · El mar se oxida: the first breath of the planet. The iron in the sea rusts, falls, and is
 *      left written in the rock in red and black bands.
 */

const BLANCO: RGB = [TIBIO.r, TIBIO.g, TIBIO.b];

// ---------------------------------------------------------------- 1 · crystals

function cristales(root: THREE.Group, tl: Timeline, cam: Cam): Mundo {
  const fondo = pantalla(/* glsl */ `void main() { gl_FragColor = vec4(0.004, 0.004, 0.006, 1.0); }`);
  root.add(fondo.mesh);

  const b = materiaBuilder(71);
  const r = b.r;
  const aN: number[] = [];
  const TECHO = 17;
  const suelo = (x: number, z: number) => 1.6 * fbm(x * 0.09 + 2, z * 0.09 + 5);

  // The cave: barely there.
  sembrar(r, 150_000, -80, 30, 110, (x, z, dm) => {
    const arriba = r() < 0.4;
    b.push(x, arriba ? TECHO - suelo(x + 40, z) * 1.6 : suelo(x, z), z, col(BLANCO), 0.004 * Math.max(dm, 4), 0.035, { from: [x, arriba ? TECHO - suelo(x + 40, z) * 1.6 : suelo(x, z), z] });
    aN.push(0, 0, 0);
  });

  // The beams: four-sided, blunt at the end, each from a seed on the rock.
  for (let k = 0; k < 74; k++) {
    const z = lerp(26, -84, k / 74) + (r() - 0.5) * 8;
    const x = (r() * 2 - 1) * 24;
    const arriba = r() < 0.3;
    const base = V(x, arriba ? TECHO : suelo(x, z) - 0.4, z);
    const dir = V((r() - 0.5) * 2.2 - x * 0.02, arriba ? -1 : 1, (r() - 0.5) * 1.8).normalize();
    const L = 5 + 13 * r() * r();
    const w = 0.35 + 0.9 * r() * (L / 18 + 0.4);
    // Two axes across the beam.
    const u1 = V(dir.y, -dir.x, 0).normalize();
    const u2 = V().crossVectors(dir, u1).normalize();
    const giro = r() * Math.PI;
    const e1 = u1.clone().multiplyScalar(Math.cos(giro)).addScaledVector(u2, Math.sin(giro));
    const e2 = V().crossVectors(dir, e1).normalize();
    const d = Math.max(5, Math.hypot(x, z - clamp(z, -80, 30)));
    const m = Math.round(clamp(24000 / (1 + d / 22), 3500, 13000));
    const nace = r();
    for (let i = 0; i < m; i++) {
      const cara = Math.floor(r() * 4);
      const n = (cara < 2 ? e1 : e2).clone().multiplyScalar(cara % 2 ? -1 : 1);
      const tg = cara < 2 ? e2 : e1;
      const arista = r() < 0.3;
      const t = arista ? (r() < 0.5 ? -0.5 : 0.5) : r() - 0.5;
      const u = Math.pow(r(), 0.85);
      const fino = u > 0.88 ? 1 - 0.75 * ((u - 0.88) / 0.12) : 1;
      const o = n.clone().multiplyScalar((w / 2) * fino).addScaledVector(tg, t * w * fino);
      const pos = base.clone().addScaledVector(dir, L * u).add(o);
      const sem = base.clone().addScaledVector(o, 0.25).addScaledVector(dir, 0.3 * u);
      b.push(pos.x, pos.y, pos.z, col(BLANCO), 0.0042 * d, arista ? 0.75 : 0.42, { from: [sem.x, sem.y, sem.z], delay: nace });
      if (arista) aN.push(0, 0, 0);
      else aN.push(n.x, n.y, n.z);
    }
  }
  const cueva = materia(b.data(), {
    pre: /* glsl */ `attribute vec3 aN;`,
    move: /* glsl */ `
      if (dot(aN, aN) > 0.5) {
        // Clear crystal: faint face on, bright where it turns away.
        vec3 nv = normalize(mat3(modelViewMatrix) * aN);
        vec3 vv = normalize((modelViewMatrix * vec4(p, 1.0)).xyz);
        float fr = 1.0 - abs(dot(nv, vv));
        em *= 0.1 + 1.5 * fr * fr;
      }
      em *= mix(0.04, 1.0, k * k) * (1.0 + 4.0 * pow(max(0.0, sin(seed * 60.0 + uTime * 0.5)), 24.0));
    `,
    extra: { aN: [new Float32Array(aN), 3] },
  });
  cueva.u.uFog.value = 70;
  cueva.u.uFogNear.value = 12;
  cueva.u.uSpread.value = 1.6;
  root.add(cueva.points);

  tl.set({ luz: 0, crece: 0 });
  cam.set(V(0, 3, 32), V(0, 6, -40));
  tl.caption(6, 'Sin testigos', 'Durante miles de millones de años, todo esto fue bello. Nadie lo vio.');
  tl.with(1.2, { luz: 1 });
  tl.with(15, { crece: 1 });
  cam.to(6, V(1.5, 3.6, 8), V(-2, 7, -50));
  tl.caption(6, 'Cristales', 'Crecen en lo oscuro, sin apuro. Diez metros en cientos de miles de años.');
  cam.to(6, V(-1.5, 5, -20), V(3, 8, -70));
  cam.to(5, V(0.5, 7, -44), V(-2, 9, -90));

  return {
    tl,
    nubes: [cueva],
    vivir(_f, g) {
      cueva.u.uGain.value = g('luz') * 0.7;
      cueva.u.uK.value = g('crece');
    },
  };
}

// ---------------------------------------------------------------- 2 · dunes

function dunas(root: THREE.Group, tl: Timeline, cam: Cam): Mundo {
  const ND = 26;
  const SOL = V(-0.36, 0.2, -0.91).normalize();
  const fondo = pantalla(
    /* glsl */ `
    uniform vec3 uSol;
    ${ESTRELLAS}
    void main() {
      vec3 d = normalize(vDir);
      float cs = max(dot(d, uSol), 0.0);
      vec3 t = vec3(1.0, 0.89, 0.8);
      vec3 c = vec3(0.004) + t * (smoothstep(0.9996, 0.9998, cs) * 4.0 + pow(cs, 400.0) * 0.14 + pow(cs, 14.0) * 0.05 * exp(-abs(d.y) * 6.0)) + t * 0.012 * exp(-abs(d.y) * 9.0);
      gl_FragColor = vec4(c + estrellas(d), 1.0);
    }
  `,
    { uSol: { value: SOL } },
  );
  root.add(fondo.mesh);

  const b = materiaBuilder(81);
  sembrar(b.r, 950_000, -150, 44, 330, (x, z, dm) => {
    b.push(x, 0, z, col(BLANCO), 0.0036 * Math.max(dm, 4), 0.8);
  });
  // Each dune: where it started, how big it is. Small ones walk faster.
  const r = b.r;
  const inicio: [number, number, number][] = [];
  for (let i = 0; i < ND; i++) inicio.push([(r() * 2 - 1) * 190, 34 - 230 * Math.pow(r(), 0.8), 9 + 30 * r() * r()]);
  const uDun = inicio.map(() => new THREE.Vector4());

  const arena = materia(b.data(), {
    pre: /* glsl */ `
      uniform vec4 uDun[${ND}];
      uniform vec3 uSol;
      float duna(vec2 q) {
        float h = 0.0;
        for (int i = 0; i < ${ND}; i++) {
          vec4 d = uDun[i];
          vec2 l = (q - d.xy) / d.z;
          // A crescent: a mound with its lee side scooped out, horns downwind.
          float g1 = exp(-(l.x * l.x * 0.9 + l.y * l.y * 1.6));
          float g2 = exp(-((l.x - 0.55) * (l.x - 0.55) * 2.2 + l.y * l.y * 3.2));
          h += d.z * 0.25 * max(g1 - 0.85 * g2, 0.0);
        }
        return h + 0.05 * sin(q.x * 2.6 + 1.5 * sin(q.y * 0.35));
      }
    `,
    move: /* glsl */ `
      float e = 0.5;
      float h0 = duna(p.xz);
      vec3 nn = normalize(vec3(h0 - duna(p.xz + vec2(e, 0.0)), e, h0 - duna(p.xz + vec2(0.0, e))));
      p.y = h0;
      float lit = max(dot(nn, uSol), 0.0);
      em *= 0.035 + 5.0 * pow(lit, 1.25);
    `,
    uniforms: { uDun: { value: uDun }, uSol: { value: SOL } },
  });
  arena.u.uFog.value = 210;
  arena.u.uFogNear.value = 30;
  root.add(arena.points);

  tl.set({ luz: 0, viaje: 0 });
  cam.set(V(0, 7, 44), V(0, 3, -60));
  tl.caption(6, 'Sin testigos', 'Durante miles de millones de años, todo esto fue bello. Nadie lo vio.');
  tl.with(1.2, { luz: 1 });
  tl.with(17, { viaje: 1 });
  cam.to(6, V(-4, 9, 8), V(3, 2, -90));
  tl.caption(6, 'Dunas', 'Caminan con el viento, como manadas. Las chicas alcanzan a las grandes.');
  cam.to(6, V(3, 13, -26), V(-2, 0, -130));
  tl.caption(5, 'Una tarde', 'Hubo una cada día. Ninguna tuvo quién la mirara.');
  cam.to(5, V(0, 24, -50), V(-20, -2, -200));

  return {
    tl,
    nubes: [arena],
    vivir(f, g) {
      const T = g('viaje') * 70 + f.time * 0.5;
      for (let i = 0; i < ND; i++) {
        const [x0, z0, s] = inicio[i];
        const x = ((((x0 + (T * 14) / s + 220) % 440) + 440) % 440) - 220;
        uDun[i].set(x, z0, s, 0);
      }
      arena.u.uGain.value = g('luz');
    },
  };
}

// ---------------------------------------------------------------- 3 · the sea rusts

function oxido(root: THREE.Group, tl: Timeline, cam: Cam): Mundo {
  const HIERRO = lin('#9fb4c8');
  const VIVO = lin('#7dffb0');
  const fondo = pantalla(/* glsl */ `
    void main() {
      vec3 d = normalize(vDir);
      vec3 c = vec3(0.002, 0.004, 0.007) + vec3(0.012, 0.02, 0.028) * smoothstep(0.0, 0.9, d.y);
      gl_FragColor = vec4(c, 1.0);
    }
  `);
  root.add(fondo.mesh);

  const ALTO = 40;
  const b = materiaBuilder(91);
  const r = b.r;
  // A slice of the sea, seen from the side: wide, tall, and only a few metres deep, so what falls
  // and what settles can be read like a page.
  const en = () => [(r() * 2 - 1) * 90, -16 + 12 * r()] as const;
  // The iron dissolved in the water.
  for (let i = 0; i < 760_000; i++) {
    const [x, z] = en();
    b.push(x, 0.5 + (ALTO - 0.5) * r(), z, col(HIERRO), 0.075, 0.2, { kind: 0 });
  }
  // The first ones that breathe, just under the surface.
  for (let i = 0; i < 26_000; i++) {
    const [x, z] = en();
    b.push(x, ALTO - 3.5 * r() * r(), z, col(VIVO), 0.11, 0.7, { kind: 1 });
  }
  // The surface and the bare seabed.
  for (let i = 0; i < 40_000; i++) {
    const [x, z] = en();
    b.push(x, ALTO + 1, z, col(BLANCO), 0.08, 0.45, { kind: 2 });
  }
  for (let i = 0; i < 40_000; i++) {
    const [x, z] = en();
    b.push(x, 0.25 * fbm(x * 0.1, z * 0.1), z, col(mz(HIERRO, BLANCO, 0.5)), 0.08, 0.08, { kind: 3 });
  }
  const mar = materia(b.data(), {
    pre: /* glsl */ `uniform float uOx;`,
    move: /* glsl */ `
      if (aKind < 0.5) {
        float y0 = p.y;
        // When the oxygen reaches this depth (0 at the surface, 1 at the bottom), and how long ago.
        float frente = (${ALTO}.0 - y0) / ${ALTO}.0 + 0.09 * sin(p.x * 0.07) + 0.05 * sin(p.x * 0.19 + 2.0);
        float hace = uOx * 1.8 - frente - 0.16;
        float caida = max(hace, 0.0) * 55.0;
        // The later it lands, the higher in the sediment; the bands are the pulses of that rain.
        float capa = clamp((frente + y0 / 55.0 - 0.7) / 0.32, 0.0, 1.0);
        float cama = 0.2 + 5.2 * capa + 0.2 * seed;
        float posado = step(y0 - caida, cama);
        p.y = max(y0 - caida, cama);
        p.x += (1.0 - posado) * 0.5 * sin(uTime * 0.4 + seed * 40.0);
        float rojo = smoothstep(0.0, 0.06, hace);
        float banda = smoothstep(-0.25, 0.25, sin(capa * 44.0));
        vec3 herrumbre = vec3(1.0, 0.24, 0.07);
        vec3 enRoca = mix(vec3(0.05, 0.045, 0.06), herrumbre * 1.5, banda);
        em = mix(em, mix(herrumbre * 0.45, enRoca * 0.3, posado), rojo);
      } else if (aKind < 1.5) {
        p.xz += 0.6 * vec2(sin(uTime * 0.3 + seed * 50.0), cos(uTime * 0.27 + seed * 31.0));
        em *= smoothstep(0.0, 0.12, uOx) * (0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (0.7 + seed) + seed * 60.0), 3.0));
        fuente = 0.5;
      } else if (aKind < 2.5) {
        float ola = sin(p.x * 0.16 + uTime * 0.5) + sin(p.z * 0.21 - uTime * 0.4);
        p.y += 0.5 * ola;
        em *= 0.3 + 1.2 * pow(0.5 + 0.25 * ola, 3.0);
      }
    `,
    uniforms: { uOx: { value: 0 } },
  });
  mar.u.uFog.value = 0;
  root.add(mar.points);

  tl.set({ luz: 0, ox: 0 });
  cam.set(V(0, 25, 34), V(0, 25, -10));
  tl.caption(5, 'Un mar con hierro', 'El mar antiguo estaba lleno de hierro disuelto. No se veía.');
  tl.with(1.2, { luz: 1 });
  cam.to(5, V(0, 27, 26), V(0, 28, -10));
  tl.caption(7, 'La primera respiración', 'Algo vivo empezó a soltar oxígeno. El hierro se oxidó y empezó a caer.');
  tl.with(12, { ox: 1 });
  cam.to(7, V(0, 14, 28), V(0, 12, -10));
  tl.caption(6, 'Franjas', 'Quedó escrito en la roca: rojo, negro, rojo. Sigue ahí.');
  cam.to(6, V(0, 3.6, 9), V(0, 3.0, -10));

  return {
    tl,
    nubes: [mar],
    vivir(_f, g) {
      mar.u.uGain.value = g('luz');
      mar.u.uOx.value = g('ox');
    },
  };
}

// ---------------------------------------------------------------- the scene

export const testigos: Escena = {
  id: 'testigos',
  nombre: 'Sin testigos',
  estilos: [
    { key: '1', nombre: 'Los cristales', nota: 'Una cueva a oscuras. Vigas de cristal de diez metros crecen desde la roca, sin color y sin nadie.' },
    { key: '2', nombre: 'Las dunas', nota: 'Dunas en media luna bajo un sol blanco. El scroll las hace caminar: las chicas van más rápido, alcanzan a las grandes y las cruzan.' },
    { key: '3', nombre: 'El mar se oxida', nota: 'Bajo el agua. Algo vivo aparece cerca de la superficie, el hierro del mar se vuelve rojo, cae y queda en franjas. Es el primer color que no es blanco.' },
  ],
  montar(stage, modo): Instancia {
    const { root, camera } = stage;
    const tl = new Timeline({ luz: 1 });
    const cam: Cam = {
      set: (p, t) => void tl.set({ px: p.x, py: p.y, pz: p.z, tx: t.x, ty: t.y, tz: t.z }),
      to: (dur, p, t, e = null) => void tl.to(dur, { px: p.x, py: p.y, pz: p.z, tx: t.x, ty: t.y, tz: t.z }, e),
    };
    const m = (modo === 0 ? cristales : modo === 1 ? dunas : oxido)(root, tl, cam);

    return {
      tl,
      escalera: false,
      cuenta(): Cuenta | null {
        return null;
      },
      rotulo(p): Rotulo | null {
        const cp = tl.captionAt(p);
        return cp ? { capitulo: modo === 2 ? 'II · Lo que la vida hizo' : 'I · El hilo', name: cp.name, fact: cp.fact } : null;
      },
      update(f: Frame) {
        const g = (k: string) => tl.get(k, f.p);
        camera.near = 0.05;
        camera.far = 6000;
        camera.fov = 42;
        camera.position.set(g('px'), g('py'), g('pz'));
        camera.up.set(0, 1, 0);
        camera.lookAt(g('tx'), g('ty'), g('tz'));
        camera.updateMatrixWorld();
        stage.bloom.strength = 0.5;
        stage.bloom.radius = 0.6;
        stage.bloom.threshold = 0.2;
        for (const n of m.nubes) {
          enfocar(n, f.focal, f.dpr, f.time);
          n.u.uMinPx.value = 1.5 * f.dpr;
          n.u.uMaxPx.value = 10 * f.dpr;
        }
        m.vivir(f, g);
      },
      dispose() {},
    };
  },
};
