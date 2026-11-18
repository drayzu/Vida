import * as THREE from 'three';
import { Timeline, EASE } from './timeline';
import { pantalla } from '../src/engine/pantalla';
import { enfocar, materia, materiaBuilder } from '../src/engine/materia';
import { clamp, lerp, smoothstep } from '../src/engine/math';
import { FONT, ink, type Cuenta, type Rotulo } from './placa';
import { SERIE, TIBIO, TU, V } from './comun';
import type { Escena, Frame, Instancia } from './tipos';
import { ESTRELLAS, col, mz, type RGB } from './mundos';

/**
 * Study · «Hacia atrás» and «El comienzo» (GUION-formas, moments 3 and 4). 15 Nov 2026. Phase 0.
 *
 * The trail: the light that passes from one form to the next. Here the camera rides it backwards.
 * First through the rings of the ones before you (your mother, hers, hers), which come faster until
 * they are one line. Then the trails of other living things come in from the sides and join yours,
 * one after another: every one of them is a common ancestor. The line goes back into the water,
 * down past cells that live alone, thins, and ends in one point. The point divides.
 *
 * Everything here is real, so the trail is a continuous line.
 */

const BLANCO: RGB = [TIBIO.r, TIBIO.g, TIBIO.b];
const rgb = (c: THREE.Color): RGB => [c.r, c.g, c.b];
const vivo = (c: THREE.Color, k = 1.7): RGB => {
  const l = (c.r + c.g + c.b) / 3;
  return [Math.max(0, l + (c.r - l) * k), Math.max(0, l + (c.g - l) * k), Math.max(0, l + (c.b - l) * k)];
};
const AGUA: RGB = [0.25, 0.55, 1.0];
const L = 900;

/** How far back, by the place on the trail (0: you · 1: the beginning): log10 of years, between these marks. */
const EDAD = [
  [0, 1.4],
  [0.3, 5.5],
  [0.45, 6.82],
  [0.6, 7.95],
  [0.68, 8.5],
  [0.74, 8.63],
  [0.8, 8.81],
  [0.86, 9.08],
  [0.9, 9.2],
  [0.97, 9.54],
  [1, 9.6],
];
const anos = (s: number) => {
  let i = 1;
  while (i < EDAD.length - 1 && s > EDAD[i][0]) i++;
  return Math.pow(10, lerp(EDAD[i - 1][1], EDAD[i][1], clamp((s - EDAD[i - 1][0]) / (EDAD[i][0] - EDAD[i - 1][0]), 0, 1)));
};
/** Where the n-th generation before you is on the trail (25 years each). */
const generacion = (n: number) => (0.3 * Math.log10(n)) / 4.1;

/** The trails that join yours, going back. The dates are rounded and still to be checked. */
const AFLUENTES: { s: number; quien: string; color: RGB; lado: number }[] = [
  { s: 0.45, quien: 'LOS CHIMPANCÉS', color: vivo(SERIE.mente), lado: 1 },
  { s: 0.6, quien: 'LOS RATONES', color: vivo(SERIE.abismo), lado: -1 },
  { s: 0.68, quien: 'LAS AVES Y LOS REPTILES', color: vivo(SERIE.espacio), lado: 1 },
  { s: 0.74, quien: 'CASI TODOS LOS PECES', color: vivo(SERIE.tiempo), lado: -1 },
  { s: 0.8, quien: 'LOS INSECTOS', color: vivo(SERIE.infinito), lado: 1 },
  { s: 0.86, quien: 'LOS HONGOS', color: vivo(SERIE.abismo), lado: -1 },
  { s: 0.9, quien: 'LAS PLANTAS', color: vivo(SERIE.destino), lado: 1 },
  { s: 0.97, quien: 'LAS BACTERIAS', color: vivo(SERIE.tiempo), lado: -1 },
];
/** Where the trail goes back under the water (about 375 million years ago). */
const ORILLA = 0.71;

/** The trail: it runs towards -x, over the land, then down through the surface (y = 0) into the deep. */
const camino = (s: number, out = V()) =>
  out.set(
    -L * s,
    7 * (1 - smoothstep(0.55, ORILLA, s)) + 2 * Math.sin(9 * s) * (1 - smoothstep(0.5, 0.7, s)) - 42 * smoothstep(ORILLA, 0.96, s) + 0.6,
    14 * Math.sin(5.2 * s + 0.5) + 5 * Math.sin(13 * s),
  );

function mundo() {
  const b = materiaBuilder(2203);
  const r = b.r;
  const aC: number[] = [];
  const aQ: number[] = [];
  const put = (kind: number, p: THREE.Vector3, color: RGB, size: number, luz: number, Q: number[] = [0, 0, 0, 0], c: THREE.Vector3 = p) => {
    b.push(p.x, p.y, p.z, col(color), size, luz, { kind });
    aC.push(c.x, c.y, c.z);
    aQ.push(Q[0], Q[1], Q[2], Q[3]);
  };
  const c = V();

  // The trail itself: thinner towards the beginning.
  for (let i = 0; i < 70_000; i++) {
    const s = Math.pow(r(), 0.8);
    camino(s, c);
    const fino = 1 - 0.75 * smoothstep(0.86, 1, s);
    put(1, V(c.x, c.y + (r() - 0.5) * 0.1 * fino, c.z + (r() - 0.5) * 0.1 * fino), BLANCO, 0.05 * fino, 0.75, [s, r(), 0, 0]);
  }
  // The ones before you: a heart and a ring each, across the trail, so the camera goes through them.
  for (let n = 1; n <= 420; n++) {
    const s = generacion(n);
    camino(s, c);
    const R = 2.4 / Math.pow(n, 0.42);
    const fase = r();
    const color = mz(mz(rgb(SERIE.abismo), rgb(SERIE.mente), r()), BLANCO, 0.25);
    put(4, c.clone(), color, 0.12 * Math.max(0.35, R / 2.4), 1.2, [fase, 1, 0, R], c);
    const m = Math.round(clamp(260 * (R / 2.4), 26, 260));
    for (let i = 0; i < m; i++) put(5, c.clone(), color, 0.05 * Math.max(0.5, R / 2.4), 0.9, [fase, 1, (i / m) * Math.PI * 2, R], c);
  }
  // The trails that join it. Each comes in from the side, and each is itself many.
  for (const [k, a] of AFLUENTES.entries()) {
    const m = camino(a.s);
    const rama = (u: number, abre: number, sube: number, out = V()) => {
      camino(a.s - 0.2 * u, out);
      const lejos = Math.pow(u, 1.5);
      return out.set(out.x, out.y + sube * 26 * lejos + 5 * u * u, out.z + a.lado * (70 * lejos + abre * 40 * u * u));
    };
    for (let j = 0; j < 7; j++) {
      const abre = (j - 3) / 3;
      const sube = Math.sin(j * 2.1 + k);
      const n = j === 3 ? 2600 : 1100;
      for (let i = 0; i < n; i++) {
        // The twigs split off the main branch a little way out.
        const u = j === 3 ? Math.pow(r(), 1.4) : 0.25 + 0.75 * r();
        const p = j === 3 ? rama(u, 0, 0) : rama(u, abre * smoothstep(0.25, 1, u), sube * smoothstep(0.25, 1, u));
        put(2, p, a.color, 0.1 * (j === 3 ? 1 : 0.75), j === 3 ? 1.0 : 0.6, [a.s, u, k, r()], m);
      }
    }
    // The flash where it joins.
    for (let i = 0; i < 420; i++) {
      const ang = (i / 420) * Math.PI * 2;
      put(3, m.clone(), a.color, 0.06, 1.0, [a.s, 0, ang, 0], m);
    }
  }
  // The surface of the water, where the trail goes back under it.
  const orilla = camino(ORILLA);
  for (let i = 0; i < 70_000; i++) {
    const x = orilla.x + (r() - 0.62) * 420;
    put(6, V(x, 0, orilla.z + (r() - 0.5) * 220), AGUA, 0.16, 0.8, [r(), 0, 0, 0], orilla);
  }
  // Under it: motes, and cells that live alone, fewer and paler the farther back.
  for (let i = 0; i < 9000; i++) {
    const s = lerp(0.6, 1, r());
    camino(s, c);
    const y = c.y + (r() - 0.5) * 50;
    if (y > -0.5) continue;
    put(7, V(c.x + (r() - 0.5) * 30, y, c.z + (r() - 0.5) * 80), mz(AGUA, BLANCO, 0.4), 0.06, 0.28, [r(), 0, 0, 0]);
  }
  const celula = (centro: THREE.Vector3, R: number, color: RGB, luz: number) => {
    const fase = r();
    for (let k = 0; k < 3; k++) {
      const eje = V(...b.onSphere());
      const u = V(1, 0.3, 0.2).cross(eje).normalize();
      const v = eje.clone().cross(u);
      const n = Math.round(clamp(R * 50, 20, 140));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        put(8, centro.clone().addScaledVector(u, Math.cos(a) * R).addScaledVector(v, Math.sin(a) * R), color, 0.06, luz, [fase, R, 0, 0], centro);
      }
    }
    put(8, centro.clone(), color, 0.14, luz * 1.3, [fase, R, 0, 0], centro);
  };
  for (let i = 0; i < 520; i++) {
    const s = 0.76 + 0.235 * Math.pow(r(), 1.9);
    camino(s, c);
    const lejos = 4 + 46 * r();
    const a = r() * Math.PI * 2;
    const palido = smoothstep(0.9, 0.98, s);
    const color = mz([vivo(SERIE.destino), vivo(SERIE.mente), vivo(SERIE.tiempo)][Math.floor(r() * 3)], BLANCO, palido);
    celula(V(c.x + (r() - 0.5) * 12, c.y + Math.sin(a) * lejos * 0.6, c.z + Math.cos(a) * lejos), 0.5 + 1.2 * r(), color, 0.75 - 0.3 * palido);
  }
  // The beginning: one point, with a faint edge. And the one it becomes two with.
  const fin = camino(1);
  for (const [kind, lado] of [
    [9, 1],
    [10, -1],
  ]) {
    put(kind, fin.clone(), BLANCO, 0.2, 1.6, [lado, 0, 0, 0], fin);
    for (let i = 0; i < 260; i++) {
      const a = (i / 260) * Math.PI * 2;
      put(kind, fin.clone(), BLANCO, 0.03, 0.5, [lado, 1, a, 0], fin);
    }
  }

  const f = (a: number[]) => new Float32Array(a);
  return { data: b.data(), aC: f(aC), aQ: f(aQ) };
}

const PRE = /* glsl */ `
  attribute vec3 aC;
  attribute vec4 aQ;
  uniform float uS, uDiv;
`;

const MOVE = /* glsl */ `
  if (aKind < 1.5) {
    // The trail: light runs along it, and it is brightest where the camera is.
    float corre = 0.5 + 0.5 * sin(aQ.x * 700.0 + uTime * 2.4 + aQ.y);
    em *= (0.5 + 0.5 * corre) * (1.0 - 0.6 * uDiv);
    fuente = 0.5;
  } else if (aKind < 2.5) {
    // A trail that joins: it lights up from its far end as the camera reaches it.
    float cerca = exp(-abs(aQ.x - uS) * 22.0);
    float llega = smoothstep(aQ.x - 0.12, aQ.x - 0.005, uS);
    p += vec3(0.0, sin(uTime * 0.5 + aQ.w * 30.0), cos(uTime * 0.4 + aQ.w * 21.0)) * 0.25 * aQ.y;
    em *= (0.55 + 1.2 * cerca) * (0.6 + 0.4 * sin(aQ.y * 60.0 + uTime * 3.0 + aQ.w)) * mix(0.5, 1.0, llega) * (1.0 - uDiv);
  } else if (aKind < 3.5) {
    float k = clamp((uS - aQ.x + 0.004) / 0.03, 0.0, 1.0);
    p = aC + vec3(0.0, cos(aQ.z), sin(aQ.z)) * (0.4 + 12.0 * k);
    em *= sin(3.1416 * k) * 1.6;
  } else if (aKind < 5.5) {
    // One of the ones before you: a heart, and a ring on each beat.
    float ph = fract(uTime / aQ.y + aQ.x);
    float pasa = 1.0 - smoothstep(0.0, 0.05, uS - (aC.x / -${L}.0));
    if (aKind < 4.5) {
      em *= 0.2 + 1.1 * exp(-ph * 6.0);
      fuente = 0.7;
    } else {
      p = aC + vec3(0.0, cos(aQ.z), sin(aQ.z)) * aQ.w * (0.35 + 0.65 * ph);
      em *= 1.5 * smoothstep(0.0, 0.1, ph) * pow(1.0 - ph, 1.2);
    }
    em *= 0.25 + 0.75 * pasa;
  } else if (aKind < 6.5) {
    p.y += 0.2 * sin(p.x * 0.3 + uTime * 0.8) + 0.14 * sin(p.z * 0.45 + uTime * 1.1);
    // Where the trail goes through it, rings open.
    float d = length(p.xz - aC.xz);
    float anillo = pow(max(0.0, sin(d * 0.9 - uTime * 3.5)), 6.0) * exp(-d / 26.0);
    p.y += 0.4 * anillo;
    em *= 0.35 + 0.45 * sin(p.x * 0.5 + p.z * 0.8 + uTime * 1.2 + aQ.x * 6.28) + 2.2 * anillo;
  } else if (aKind < 7.5) {
    p += vec3(sin(uTime * 0.2 + aQ.x * 40.0), cos(uTime * 0.16 + aQ.x * 31.0), 0.0) * 0.6;
  } else if (aKind < 8.5) {
    // A cell alone: it drifts, and it breathes.
    vec3 deriva = vec3(sin(uTime * 0.13 + aQ.x * 9.0), cos(uTime * 0.11 + aQ.x * 13.0), sin(uTime * 0.09 + aQ.x * 5.0)) * 1.2;
    p = aC + (p - aC) * (1.0 + 0.07 * sin(uTime * 1.3 + aQ.x * 20.0)) + deriva;
    em *= (0.6 + 0.4 * sin(uTime * 1.3 + aQ.x * 20.0)) * (1.0 - uDiv);
  } else {
    // The beginning. It divides: two points, each with its own edge.
    float lado = aQ.x;
    vec3 c = aC + vec3(0.0, 0.0, lado * 0.62 * uDiv);
    if (aQ.y < 0.5) {
      p = c;
      em *= (0.7 + 0.5 * exp(-fract(uTime * 0.5) * 3.0)) * (lado > 0.0 ? 1.0 : uDiv);
      fuente = 1.0;
    } else {
      // While it divides the edge pinches in the middle.
      float r = 0.5 * (1.0 + 0.5 * sin(3.1416 * uDiv) * abs(cos(aQ.z)));
      p = c + vec3(0.0, sin(aQ.z), cos(aQ.z)) * r;
      em *= lado > 0.0 ? 1.0 : smoothstep(0.3, 1.0, uDiv);
    }
  }
`;

const FONDO = /* glsl */ `
  uniform float uAgua;
  ${ESTRELLAS}
  void main() {
    vec3 d = normalize(vDir);
    vec3 cielo = vec3(0.003) + estrellas(d);
    // Under the water there are no stars: a little light from above, and the dark below.
    vec3 mar = vec3(0.0, 0.012, 0.03) * smoothstep(-0.2, 0.9, d.y);
    gl_FragColor = vec4(mix(cielo, mar, uAgua), 1.0);
  }
`;

const fecha = (a: number) => {
  const dos = (x: number) => (x >= 100 ? String(Math.round(x / 10) * 10) : x >= 10 ? String(Math.round(x)) : x.toFixed(1).replace('.', ','));
  if (a < 1000) return `${Math.round(a / 5) * 5} años`;
  if (a < 1e6) return `${dos(a / 1e3)} mil años`;
  if (a < 1e9) return `${dos(a / 1e6)} millones de años`;
  return `${(a / 1e9).toFixed(1).replace('.', ',')} mil millones de años`;
};

export const rastro: Escena = {
  id: 'rastro',
  nombre: 'Hacia atrás',
  estilos: [{ key: '1', nombre: 'Hacia atrás · El comienzo', nota: 'La cámara recorre el rastro hacia atrás: los que vinieron antes de ti, los rastros de otros seres vivos que se van juntando con el tuyo, el agua, las células solas, y un punto.' }],
  montar(stage): Instancia {
    const { root, camera } = stage;
    const fondo = pantalla(FONDO, { uAgua: { value: 0 } });
    root.add(fondo.mesh);

    const M = mundo();
    const U = { uS: { value: 0 }, uDiv: { value: 0 } };
    const todo = materia(M.data, { pre: PRE, move: MOVE, uniforms: U, extra: { aC: [M.aC, 3], aQ: [M.aQ, 4] } });
    root.add(todo.points);

    const tl = new Timeline({ luz: 0, s: 0, div: 0 });
    tl.caption(31, 'Hacia atrás', '');
    tl.with(1.5, { luz: 1 });
    tl.to(7, { s: 0.06 }, EASE.in);
    tl.to(4, { s: 0.3 });
    tl.to(4, { s: 0.45 });
    tl.to(4, { s: 0.62 });
    tl.to(4, { s: 0.76 });
    tl.to(4, { s: 0.9 });
    tl.to(4, { s: 1 }, EASE.out);
    tl.caption(9, 'El comienzo', 'Una vez, al principio, la vida empezó sin otra vida. No sabemos cómo.');
    tl.wait(5);
    tl.to(4, { div: 1 }, EASE.sine);

    const pos = V();
    const mira = V();
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
        // The camera rides just behind and above the trail, and closes in at the end.
        const atras = lerp(0.012, 0.0035, smoothstep(0.9, 1, s));
        camino(s - atras, pos);
        camino(Math.min(1, s + 0.035), mira);
        const alto = lerp(2.4, 1.7, smoothstep(0.02, 0.3, s)) * (1 - smoothstep(0.93, 1, s));
        camera.near = 0.05;
        camera.far = 4000;
        camera.fov = 52;
        camera.position.set(pos.x, pos.y + alto + 0.12 * Math.sin(f.time * 0.6), pos.z + 0.35 * Math.sin(f.time * 0.35) * (1 - smoothstep(0.95, 1, s)));
        camera.up.set(0, 1, 0);
        camera.lookAt(mira);
        camera.updateMatrixWorld();
        const agua = smoothstep(0.4, -1.2, camera.position.y);
        stage.bloom.strength = 0.4;
        stage.bloom.radius = 0.6;
        stage.bloom.threshold = 0.2;
        fondo.u.uAgua.value = agua;
        U.uS.value = s;
        U.uDiv.value = g('div');
        enfocar(todo, f.focal, f.dpr, f.time);
        todo.u.uMinPx.value = 1.3 * f.dpr;
        todo.u.uMaxPx.value = 6 * f.dpr;
        todo.u.uGain.value = g('luz') * 0.6;
        todo.u.uFog.value = lerp(260, 120, agua);
        todo.u.uFogNear.value = 12;
      },
      placa(g2, f) {
        // The clock: how long ago. Under it, who you are passing, or whose trail has just joined yours.
        const g = (k: string) => tl.get(k, f.p);
        const s = g('s');
        const u = f.u;
        const x = 44 * u;
        const n = Math.round(Math.pow(10, (s * 4.1) / 0.3));
        let linea = '';
        if (s >= 1) linea = 'EL COMIENZO';
        else if (s < generacion(1.5)) linea = 'TU MADRE';
        else if (s < generacion(2.5)) linea = 'LA MADRE DE TU MADRE';
        else if (s < generacion(3.5)) linea = 'Y LA SUYA';
        else if (s < 0.3) linea = `${n < 1000 ? n : `${Math.round(n / 1000)} MIL`} GENERACIONES`;
        else if (s < 0.44) linea = 'YA NO SON HUMANOS';
        for (const a of AFLUENTES) if (s >= a.s - 0.004 && s < a.s + 0.05) linea = `SE JUNTA EL RASTRO DE ${a.quien}`;
        if (s >= ORILLA - 0.005 && s < 0.735) linea = 'VUELVE AL AGUA';
        g2.save();
        g2.textBaseline = 'alphabetic';
        g2.shadowColor = 'rgba(0,0,0,0.85)';
        g2.shadowBlur = 12 * u;
        g2.globalAlpha = g('luz');
        g2.font = FONT.serif(26 * u);
        g2.fillStyle = ink(0.6);
        g2.fillText('hace', x, f.H - 88 * u);
        const w = g2.measureText('hace ').width;
        g2.font = FONT.serif(58 * u);
        g2.fillStyle = ink();
        g2.fillText(s < 0.004 ? 'ahora' : fecha(anos(s)), x + (s < 0.004 ? 0 : w), f.H - 86 * u);
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

// The teal of «Tú» is kept for the closing, where the dotted trail starts.
export const TU_RASTRO = TU;
