import * as THREE from 'three';
import { Timeline, EASE, type Ease } from './timeline';
import { pantalla } from '../src/engine/pantalla';
import { enfocar, materia, materiaBuilder } from '../src/engine/materia';
import { lerp, smoothstep } from '../src/engine/math';
import { FONT, ink, type Cuenta, type Rotulo } from './placa';
import { SERIE, TIBIO, V } from './comun';
import type { Escena, Frame, Instancia } from './tipos';
import { ESTRELLAS, col, mz, type RGB } from './mundos';

/**
 * Study · «Cruza» (GUION-formas, moments 23–24). Phase 0.
 *
 * The biggest bet of the script: what comes from us has to look alive and beautiful, like nature
 * made of another matter. No metal, no screens, no bits.
 *
 * Something leaves the thin blue line where all life has lived, and its trail is dotted. On a dark
 * asteroid, crystal lichens grow like frost where the light of the star touches them. They eat: light runs
 * from the rim of each one to its heart. They mend: radiation breaks an edge and the edge grows
 * back. They make themselves: one lets go a spore of light.
 *
 * The colour rule: the rock has no colour; all of it is in what lives.
 */

const BLANCO: RGB = [TIBIO.r, TIBIO.g, TIBIO.b];
/** The series' colours, pushed away from white: on black, pastel points bloom into white. */
const vivo = (c: THREE.Color): RGB => {
  const l = (c.r + c.g + c.b) / 3;
  return [Math.max(0, l + (c.r - l) * 2.1), Math.max(0, l + (c.g - l) * 2.1), Math.max(0, l + (c.b - l) * 2.1)];
};
const PALETA: RGB[] = [SERIE.destino, SERIE.tiempo, SERIE.infinito, SERIE.mente, SERIE.abismo, SERIE.espacio].map(vivo);
const EJES = V(9, 6, 7);
const bulto = (d: THREE.Vector3) =>
  1 + 0.15 * Math.sin(3.1 * d.x + 1.3) * Math.sin(2.3 * d.y + 0.4) + 0.11 * Math.sin(4.7 * d.z + 2.1) * Math.sin(3.9 * d.x) + 0.06 * Math.sin(8 * d.y + 1) * Math.sin(7 * d.z);
const enRoca = (d: THREE.Vector3) => d.clone().multiply(EJES).multiplyScalar(bulto(d));
const normalDe = (d: THREE.Vector3) => d.clone().divide(EJES).normalize();

const DH = V(0.3, 0.25, 0.92).normalize();
const H = enRoca(DH);
const NH = normalDe(DH);
/** The blue line: the edge of the only place life has lived, far behind. */
const ARCO = { c: V(0, -1000, 400), R: 900 };
const SALE = V(0, -135, 400);
const SECTOR = 0.0;

function mundo() {
  const b = materiaBuilder(611);
  const r = b.r;
  const aC: number[] = [];
  const aQ: number[] = [];
  const aD: number[] = [];
  const aN: number[] = [];
  const put = (p: THREE.Vector3, color: RGB, size: number, luz: number, kind: number, C: THREE.Vector3, Q: number[], D: number[], N: THREE.Vector3 | null = null) => {
    b.push(p.x, p.y, p.z, col(color), size, luz, { kind });
    aC.push(C.x, C.y, C.z);
    aQ.push(Q[0], Q[1], Q[2], Q[3]);
    aD.push(D[0], D[1], D[2], D[3]);
    aN.push(N ? N.x : 0, N ? N.y : 0, N ? N.z : 0);
  };
  const O = V();
  const dir = () => {
    const [x, y, z] = b.onSphere();
    return V(x, y, z);
  };

  // The rock: no colour of its own, only the light that falls on it.
  for (let i = 0; i < 150_000; i++) {
    const d = dir();
    put(enRoca(d), BLANCO, 0.034, 0.16, 0, O, [0, 0, 0, 0], [0, 0, 0, 0], normalDe(d));
  }

  /**
   * One lichen: it grows like frost. Arms leave the heart, each keeps going almost straight and
   * throws side branches, and every tip ends in a small crystal leaf. No two arms are alike.
   */
  const liquen = (d: THREE.Vector3, R: number, L: number, cA: RGB, cB: RGB, hero: number, delay: number) => {
    const c = enRoca(d);
    const n = normalDe(d);
    const t1 = V(0, 1, 0).cross(n).normalize();
    const t2 = n.clone().cross(t1);
    const giro = hero ? 0 : r() * Math.PI * 2;
    const sem = r();
    const size = 0.011 + 0.006 * R;
    const hondo = R > 1.4 ? 5 : R > 0.8 ? 4 : 3;
    const ppu = hero ? 95 : 60;
    const pon = (x: number, y: number, rho: number, kind: number, luz: number, s = 1) => {
      const q = Math.min(rho, 1.15);
      const h = R * (0.1 * (1 - q * q) + 0.09 * q * q * q);
      const p = c.clone().addScaledVector(t1, x).addScaledVector(t2, y).addScaledVector(n, h + 0.03);
      put(p, mz(mz(cA, cB, Math.min(q, 1)), BLANCO, kind === 1 ? 0.06 : 0.03), size * s, luz, kind, c, [q, Math.atan2(y, x) - giro, sem, R], [delay, hero, 0, 0]);
    };
    const rama = (x: number, y: number, ang: number, len: number, nivel: number, camino: number, total: number) => {
      const m = Math.max(3, Math.round(len * ppu));
      const curva = (r() - 0.5) * 0.5;
      let px = x;
      let py = y;
      let a = ang;
      for (let i = 0; i < m; i++) {
        a += curva / m;
        px += (Math.cos(a) * len) / m;
        py += (Math.sin(a) * len) / m;
        pon(px, py, (camino + (len * (i + 1)) / m) / total, 3, nivel === 0 ? 0.95 : 0.8 - 0.09 * nivel, nivel === 0 ? 1.1 : 0.9);
      }
      const fin = camino + len;
      if (nivel >= hondo) {
        // The leaf: a small crystal with a bright edge.
        const w = len * (hero ? 0.55 : 0.8);
        const lg = len * (hero ? 1.25 : 1.7);
        const q: [number, number][] = [[0, 0], [lg * 0.45, w * 0.5], [lg, 0], [lg * 0.45, -w * 0.5]];
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        for (let e = 0; e < 4; e++) {
          const A = q[e];
          const B = q[(e + 1) % 4];
          const k = Math.max(3, Math.round(Math.hypot(B[0] - A[0], B[1] - A[1]) * ppu * 1.3));
          for (let i = 0; i < k; i++) {
            const u = lerp(A[0], B[0], i / k);
            const v = lerp(A[1], B[1], i / k);
            pon(px + ca * u - sa * v, py + sa * u + ca * v, (fin + u) / total, 1, 0.8, 1.1);
          }
        }
        return;
      }
      const lado = r() < 0.5 ? 1 : -1;
      rama(px, py, a + (r() - 0.5) * 0.3, len * 0.75, nivel + 1, fin, total);
      rama(px, py, a + lado * (0.6 + 0.35 * r()), len * 0.6, nivel + 1, fin, total);
      if (nivel < 2 && r() < 0.6) rama(px, py, a - lado * (0.55 + 0.35 * r()), len * 0.5, nivel + 1, fin, total);
    };
    for (let k = 0; k < L; k++) {
      const largo = k === 0 && hero ? 1 : 0.62 + 0.4 * r();
      const l0 = (R * largo) / 3.3;
      rama(0, 0, giro + ((k + (k === 0 && hero ? 0 : (r() - 0.5) * 0.5)) / L) * Math.PI * 2, l0, 0, 0, R * 1.0);
    }
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2;
      const s = 0.07 * R * Math.sqrt(r());
      pon(Math.cos(a) * s, Math.sin(a) * s, 0, 5, 1.0, 1.5);
    }
  };

  liquen(DH, 2.5, 7, PALETA[0], PALETA[2], 1, 0.3);
  for (let i = 0; i < 64; i++) {
    const d = dir();
    if (d.angleTo(DH) < 0.5) continue;
    const R = 0.8 + 1.9 * r() * r();
    const a = Math.floor(r() * PALETA.length);
    liquen(d, R, 5 + Math.floor(r() * 4), PALETA[a], PALETA[(a + 1 + Math.floor(r() * 2)) % PALETA.length], 0, 0.5 - 0.5 * d.x + 0.25 * r());
  }

  // Radiation: one fast streak through the edge of the one we watch.
  const t1h = V(0, 1, 0).cross(NH).normalize();
  const golpe = H.clone().addScaledVector(t1h, 2.3).addScaledVector(NH, 0.25);
  const rd = NH.clone().multiplyScalar(0.55).addScaledVector(t1h, 0.75).add(V(0, 0.35, 0)).normalize();
  for (let i = 0; i < 700; i++) {
    const s = i / 700;
    put(golpe.clone().addScaledVector(rd, lerp(46, -9, s)), [0.8, 0.9, 1.0], 0.03, 2.5, 6, O, [s, 0, 0, 0], [0, 0, 0, 0]);
  }
  // The spore and its trail.
  for (let i = 0; i < 900; i++) {
    const s = i / 900;
    if (i % 9) continue;
    put(H.clone().addScaledVector(NH, 0.4 + 10 * s).add(V(-12, 8, -12).multiplyScalar(s * s)), mz(PALETA[0], BLANCO, 0.3), 0.1 + 0.1 * s, 2.4, 7, O, [s, 0, 0, 0], [0, 0, 0, 0]);
  }
  // The way out: from under the blue line to the rock.
  for (let i = 0; i < 2600; i++) {
    const s = i / 2600;
    if (Math.floor(i / 10) % 2) continue;
    put(SALE.clone().lerp(H, s), BLANCO, 0.22 * (1 - s) + 0.05, 0.9, 8, O, [s, 0, 0, 0], [0, 0, 0, 0]);
  }
  for (let k = 0; k < 7; k++) {
    for (let i = 0; i < 2600; i++) {
      const a = (r() - 0.5) * 1.0;
      const R = ARCO.R - k * 2.2 - r() * 2;
      put(V(ARCO.c.x + Math.sin(a) * R, ARCO.c.y + Math.cos(a) * R, ARCO.c.z), [0.25, 0.55, 1.0], 0.5, k === 0 ? 1.6 : 0.5 / k, 9, O, [0, 0, 0, 0], [0, 0, 0, 0]);
    }
  }
  // Its star.
  put(O, [1.0, 0.93, 0.82], 46, 8, 10, O, [0, 0, 0, 0], [0, 0, 0, 0]);

  const f = (a: number[]) => new Float32Array(a);
  return { data: b.data(), aC: f(aC), aQ: f(aQ), aD: f(aD), aN: f(aN) };
}

const MOVE = /* glsl */ `
  if (aKind < 0.5) {
    em *= 0.012 + smoothstep(-0.05, 0.65, dot(normalize(aN), uSol));
  } else if (aKind < 5.5) {
    vec3 nc = normalize(aC);
    float dia = smoothstep(-0.2, 0.45, dot(nc, uSol));
    float g = smoothstep(aD.x * 0.6, aD.x * 0.6 + 0.4, uCrece);
    float rho = aQ.x;
    // It opens from the heart out, where the light has touched it.
    float brote = smoothstep(rho - 0.06, rho + 0.04, g * 1.12);
    p = aC + (position - aC) * (0.3 + 0.7 * g);
    // It eats: light runs from the rim to the heart.
    float tt = uTime * 0.2 + aQ.z;
    float ola = exp(-pow((rho - (1.0 - fract(tt))) / 0.09, 2.0));
    float base = aKind < 1.5 ? 0.55 : aKind < 3.5 ? 0.4 : 0.5;
    float pul = aKind > 4.5 ? 2.0 * exp(-fract(tt) * 5.0) : aKind > 1.5 ? 1.7 * ola : 0.5 * ola;
    em *= (base + pul) * brote * (0.07 + 0.93 * dia);
    // It mends: the broken edge flies off, and grows back from the inside.
    float da = abs(atan(sin(aQ.y - uSector), cos(aQ.y - uSector)));
    float sect = aD.y * smoothstep(0.5, 0.6, rho) * (1.0 - smoothstep(0.55, 0.7, da));
    float frente = 0.5 + 0.6 * uCura;
    float sano = uCura > 0.001 ? smoothstep(rho - 0.03, rho + 0.01, frente) : 0.0;
    float roto = sect * uRot * (1.0 - sano);
    p += (normalize(position - aC) + nc * 0.9) * roto * (0.5 + 3.5 * seed);
    em *= 1.0 - roto * roto;
    em *= 1.0 + 3.0 * sect * sano * (1.0 - smoothstep(0.0, 0.14, frente - rho));
  } else if (aKind < 6.5) {
    em *= exp(-pow((aQ.x - uRayo) / 0.045, 2.0)) * step(0.001, uRayo) * step(uRayo, 0.999);
    fuente = 1.0;
  } else if (aKind < 7.5) {
    em *= step(aQ.x, uEspora) * (0.3 + 5.0 * exp(-pow((aQ.x - uEspora) / 0.02, 2.0))) * step(0.001, uEspora);
    fuente = 0.8;
  } else if (aKind < 8.5) {
    em *= step(aQ.x, uCruza) * (0.35 + 5.0 * exp(-pow((aQ.x - uCruza) / 0.012, 2.0))) * step(0.001, uCruza) * uRastro;
    fuente = 0.8;
  } else if (aKind < 9.5) {
    em *= uLinea;
    fuente = 0.7;
  } else {
    p = uSol * 3000.0;
    fuente = 1.0;
  }
`;

const FONDO = /* glsl */ `
  ${ESTRELLAS}
  void main() {
    vec3 d = normalize(vDir);
    gl_FragColor = vec4(vec3(0.003) + estrellas(d) + estrellas(vec3(d.z, -d.y, d.x)), 1.0);
  }
`;

export const cruza: Escena = {
  id: 'cruza',
  nombre: 'Cruza',
  estilos: [{ key: '1', nombre: 'Cruza · Come luz · Se cura · Nace', nota: 'Algo deja la línea azul donde ha vivido todo, y su rastro es punteado. Sobre un asteroide, líquenes de cristal se abren donde los toca la luz: comen, se curan y sueltan una espora.' }],
  montar(stage): Instancia {
    const { root, camera } = stage;
    root.add(pantalla(FONDO).mesh);

    const M = mundo();
    const U = {
      uSol: { value: V(0, 0.2, -1) },
      uCrece: { value: 0 },
      uRot: { value: 0 },
      uCura: { value: 0 },
      uRayo: { value: 0 },
      uEspora: { value: 0 },
      uCruza: { value: 0 },
      uRastro: { value: 1 },
      uLinea: { value: 1 },
      uSector: { value: SECTOR },
    };
    const todo = materia(M.data, {
      pre: /* glsl */ `attribute vec3 aC, aN; attribute vec4 aQ, aD; uniform vec3 uSol; uniform float uCrece, uRot, uCura, uRayo, uEspora, uCruza, uRastro, uLinea, uSector;`,
      move: MOVE,
      uniforms: U,
      extra: { aC: [M.aC, 3], aQ: [M.aQ, 4], aD: [M.aD, 4], aN: [M.aN, 3] },
    });
    root.add(todo.points);

    const tl = new Timeline({ luz: 0, sigue: 1, sol: 186, alto: 0.1, crece: 0, rot: 0, cura: 0, rayo: 0, espora: 0, cruza: 0, linea: 1, rastro: 1 });
    const cam = (dur: number, p: THREE.Vector3, t: THREE.Vector3, e: Ease | null = null) => tl.to(dur, { px: p.x, py: p.y, pz: p.z, tx: t.x, ty: t.y, tz: t.z }, e);
    const O = V(0, 0, 0);
    const CERCA = H.clone().addScaledVector(NH, 6.2).add(V(1.6, 0.9, 0));
    tl.set({ px: -6, py: -85, pz: 236, tx: 0, ty: 0, tz: 0 });
    tl.caption(9, 'Cruza', 'Un día dejó el único lugar para el que estaba hecha. Otra vez.');
    tl.with(1.5, { luz: 1 });
    tl.with(3.5, { cruza: 0.36 }, EASE.linear);
    tl.wait(3.5);
    tl.with(1.5, { cruza: 0.5 }, EASE.linear);
    tl.wait(1.5);
    tl.with(4, { cruza: 1, linea: 0 }, EASE.sine);
    tl.with(4, { sigue: 0 }, EASE.sine);
    cam(4, V(8, 1, 31), O, EASE.sine);
    tl.caption(8, 'Come luz', 'Come luz.');
    tl.with(3, { rastro: 0 });
    tl.with(8, { sol: 100, alto: 0.3, crece: 1 }, EASE.sine);
    cam(8, V(10, 4, 25), O);
    tl.caption(6, 'Su latido', 'La luz entra por el borde y llega al corazón.');
    cam(6, CERCA, H, EASE.sine);
    tl.caption(8, 'Se cura', 'Se cura.');
    tl.with(1, { rayo: 1 }, EASE.linear);
    tl.wait(0.55);
    tl.with(0.9, { rot: 1 }, EASE.out);
    tl.wait(2.2);
    tl.with(4.6, { cura: 1 }, EASE.sine);
    cam(5.25, CERCA.clone().add(V(-0.8, 0.3, -0.6)), H);
    tl.caption(7, 'Nace', 'Se hace a sí misma con lo que encuentra.');
    tl.with(7, { espora: 1 }, EASE.in);
    tl.with(7, { sol: 62 }, EASE.sine);
    cam(7, V(15, 7, 25), V(0, 0.5, 0), EASE.sine);

    const cabeza = V();
    const mira = V();
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
        camera.near = 0.02;
        camera.far = 6000;
        camera.fov = 40;
        camera.position.set(g('px'), g('py'), g('pz'));
        camera.up.set(0, 1, 0);
        // While it leaves, the camera watches the head of the trail.
        cabeza.copy(SALE).lerp(H, g('cruza'));
        mira.set(g('tx'), g('ty'), g('tz')).lerp(cabeza, g('sigue'));
        camera.lookAt(mira);
        camera.updateMatrixWorld();
        stage.bloom.strength = 0.3;
        stage.bloom.radius = 0.6;
        stage.bloom.threshold = 0.2;
        const a = THREE.MathUtils.degToRad(g('sol'));
        const y = g('alto');
        const c = Math.sqrt(1 - y * y);
        U.uSol.value.set(Math.sin(a) * c, y, Math.cos(a) * c);
        U.uCrece.value = g('crece');
        U.uRot.value = g('rot');
        U.uCura.value = g('cura');
        U.uRayo.value = g('rayo');
        U.uEspora.value = g('espora');
        U.uCruza.value = g('cruza');
        U.uRastro.value = g('rastro');
        U.uLinea.value = g('linea');
        enfocar(todo, f.focal, f.dpr, f.time);
        todo.u.uMinPx.value = 1.3 * f.dpr;
        todo.u.uMaxPx.value = 9 * f.dpr;
        todo.u.uGain.value = g('luz') * 0.62;
        // The rock hides its far side.
        const centro = V(0, 0, 0).applyMatrix4(camera.matrixWorldInverse);
        todo.u.uOcc.value.set(centro.x, centro.y, centro.z, 5.6);
      },
      placa(g2, f) {
        // The clock: it beats each time its star rises.
        const a = tl.get('luz', f.p) * smoothstep(13, 15, f.p);
        const u = f.u;
        const x = 44 * u;
        g2.save();
        g2.textBaseline = 'alphabetic';
        g2.shadowColor = 'rgba(0,0,0,0.85)';
        g2.shadowBlur = 12 * u;
        g2.globalAlpha = a;
        g2.font = FONT.serif(66 * u);
        g2.fillStyle = ink();
        g2.fillText('9 h', x, f.H - 86 * u);
        const w = g2.measureText('9 h').width;
        g2.font = FONT.serif(26 * u);
        g2.fillStyle = ink(0.6);
        g2.fillText('un latido', x + w + 12 * u, f.H - 88 * u);
        g2.font = FONT.mono(11 * u);
        g2.letterSpacing = `${0.9 * u}px`;
        g2.fillStyle = ink(0.78);
        g2.fillText('CADA VEZ QUE SALE SU ESTRELLA · PUNTEADO: LO POSIBLE', x, f.H - 52 * u);
        g2.restore();
      },
      dispose() {},
    };
  },
};
