import * as THREE from 'three';
import { Timeline, EASE } from './timeline';
import { enfocar, materia, materiaBuilder, type Nube } from '../src/engine/materia';
import { clamp, smoothstep } from '../src/engine/math';
import { FONT, grupo, ink, type Cuenta, type Rotulo } from './placa';
import { SEGURO, SERIE, TU, V } from './comun';
import type { Escena, Frame, Instancia } from './tipos';
import { fbm } from './mundos';
import { C, CIUDAD, DC, GLOBO_MOVE, GLOBO_PRE, MAQ_MOVE, MAQ_PRE, R, ciudad, dentroCiudad, globo, mapa, maquinas } from './tierra';

/**
 * Studies · «Hoy» (GUION-vienen, moments 1–3) and «No es para nosotros» (moments 4–6).
 *
 * The work now opens on the ground, today, and says plainly what we are making.
 *
 * Hoy:
 *  1 · Un latido: your heart, close, beating. Each beat runs through it as it really does: the
 *      atria first, then the ventricles from the apex up.
 *  2 · Ocho mil millones · La Tierra de noche: the camera pulls back. The heart is a light among
 *      the lights of a city, the city one among the lights of the night side of the Earth. Some
 *      lights are whiter and still: buildings without windows.
 *  3 · Lo que estamos haciendo: down into one of them. Rows of machines whose small lights blink
 *      on their own; then waves cross the hall; then all of it beats, like a heart. A figure, not
 *      a claim: the clock says «¿? latidos».
 *
 * No es para nosotros:
 *  4 · Quince segundos: you rise from the city. The clouds lit from below, the water that boils at
 *      body heat at 19 km, no air at 100 km; your light goes faint.
 *  5 · La capa: from far, the planet with the sun behind it: the air is a thin ring of light.
 *  6 · La ventana: around to the day side. The Sun brightens over a billion years: the green goes,
 *      the seas go, and the rock is left without colour (no life, no colour: the rule of the work).
 */

/** Your heartbeats, carried from «Hoy» into «No es para nosotros» when they play in a row. */
let LATIDOS = 0;
const BPM = 66;

const PALETA = [SERIE.mente, SERIE.abismo, SERIE.destino, SERIE.tiempo, SERIE.infinito, SERIE.espacio];

// ---------------------------------------------------------------- the heart

function corazon() {
  const b = materiaBuilder(1805);
  const r = b.r;
  const aN: number[] = [];
  const aQ: number[] = [];
  const rot = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.2, 0.55, -0.5));
  const P = V();
  const N = V();
  const DENS = 1.7e5;
  const put = (p: THREE.Vector3, n: THREE.Vector3, c: THREE.Color, parte: number, tt: number, size = 0.0011, luz = 1) => {
    P.copy(p).add(V(0, -0.012, 0)).applyMatrix4(rot);
    N.copy(n).normalize().transformDirection(rot);
    b.push(P.x, P.y, P.z, c, size, luz, { kind: parte });
    aN.push(N.x, N.y, N.z);
    aQ.push(parte, tt, r(), 0);
  };

  // The ventricles: a rounded cone, the left one wider; a groove runs down the front between them.
  const L = 0.1;
  const RB = 0.047;
  const rv = (t: number) => RB * Math.pow(Math.max(1 - t, 0), 0.55) * (1 + 0.3 * t * (1 - t));
  const surco = (th: number) => {
    const d = Math.atan2(Math.sin(th - 1.25), Math.cos(th - 1.25));
    return 1 - 0.1 * Math.exp(-(d * d) / 0.02);
  };
  const vp = (t: number, th: number) => {
    const rr = rv(t) * surco(th);
    return V(rr * Math.cos(th), 0.02 - L * t, 0.82 * rr * Math.sin(th));
  };
  const rojo = new THREE.Color(1.0, 0.3, 0.24);
  for (let i = 0; i < 6500; ) {
    const t = r();
    const th = r() * Math.PI * 2;
    if (r() > rv(t) / (RB * 1.1)) continue;
    i++;
    const p = vp(t, th);
    const n = vp(t, th + 0.002).sub(p).cross(vp(Math.min(t + 0.002, 0.999), th).sub(p));
    if (n.dot(V(Math.cos(th), 0, Math.sin(th))) < 0) n.negate();
    put(p, n, rojo, 0, 1 - t);
  }

  // The atria, on top, with their small ears.
  const elip = (c: THREE.Vector3, rx: number, ry: number, rz: number, color: THREE.Color, parte: number) => {
    const area = 4 * Math.PI * Math.pow((rx * ry + ry * rz + rx * rz) / 3, 1);
    const n = Math.round(area * DENS);
    for (let i = 0; i < n; i++) {
      const [x, y, z] = b.onSphere();
      put(V(c.x + x * rx, c.y + y * ry, c.z + z * rz), V(x / rx, y / ry, z / rz), color, parte, 1.2);
    }
  };
  const auricula = new THREE.Color(1.0, 0.42, 0.32);
  elip(V(0.03, 0.026, 0.01), 0.026, 0.022, 0.024, auricula, 1);
  elip(V(-0.022, 0.03, -0.022), 0.022, 0.018, 0.02, auricula, 1);
  elip(V(0.022, 0.034, 0.034), 0.011, 0.008, 0.01, auricula, 1);
  elip(V(-0.036, 0.03, 0.018), 0.01, 0.008, 0.009, auricula, 1);

  // The great vessels.
  const tubo = (pts: THREE.Vector3[], radio: number, color: THREE.Color) => {
    const curva = new THREE.CatmullRomCurve3(pts);
    const n = Math.round(curva.getLength() * 2 * Math.PI * radio * DENS);
    for (let i = 0; i < n; i++) {
      const s = r();
      const c = curva.getPointAt(s);
      const T = curva.getTangentAt(s);
      const A = Math.abs(T.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
      const Nn = A.cross(T).normalize();
      const B = T.clone().cross(Nn);
      const th = r() * Math.PI * 2;
      const nrm = Nn.multiplyScalar(Math.cos(th)).add(B.multiplyScalar(Math.sin(th)));
      put(c.add(nrm.clone().multiplyScalar(radio)), nrm, color, 2, 1.5);
    }
  };
  const aorta = new THREE.Color(1.0, 0.25, 0.2);
  const pulmonar = new THREE.Color(0.72, 0.45, 1.0);
  const vena = new THREE.Color(0.45, 0.6, 1.0);
  tubo([V(-0.004, 0.015, 0), V(-0.004, 0.055, 0.004), V(-0.012, 0.085, -0.006), V(-0.032, 0.088, -0.022), V(-0.045, 0.07, -0.03), V(-0.048, 0.03, -0.032), V(-0.048, -0.01, -0.032)], 0.0125, aorta);
  tubo([V(-0.012, 0.087, -0.008), V(-0.006, 0.117, -0.006)], 0.006, aorta);
  tubo([V(-0.022, 0.092, -0.016), V(-0.022, 0.12, -0.018)], 0.0045, aorta);
  tubo([V(-0.032, 0.09, -0.022), V(-0.04, 0.117, -0.026)], 0.005, aorta);
  tubo([V(0.012, 0.012, 0.028), V(0.004, 0.045, 0.03), V(-0.012, 0.062, 0.018)], 0.012, pulmonar);
  tubo([V(-0.012, 0.062, 0.018), V(0.02, 0.07, -0.004), V(0.05, 0.068, -0.01)], 0.008, pulmonar);
  tubo([V(-0.012, 0.062, 0.018), V(-0.04, 0.065, 0), V(-0.062, 0.06, -0.01)], 0.008, pulmonar);
  tubo([V(0.038, 0.03, 0.006), V(0.037, 0.06, 0.003), V(0.036, 0.097, 0)], 0.009, vena);
  tubo([V(0.03, 0.004, -0.005), V(0.03, -0.03, -0.012)], 0.01, vena);

  return { data: b.data(), aN: new Float32Array(aN), aQ: new Float32Array(aQ) };
}

const CORAZON_PRE = /* glsl */ `
  attribute vec3 aN;
  attribute vec4 aQ;
  uniform float uBpm;
  ${SEGURO}
`;
const CORAZON_MOVE = /* glsl */ `
  float x = fract(uTime * uBpm / 60.0);
  float lub = lubdub(uTime, uBpm);
  float atr = lubdub(uTime + 0.13, uBpm);
  if (aQ.x < 0.5) p *= 1.0 - 0.06 * lub;
  else if (aQ.x < 1.5) p *= 1.0 - 0.045 * atr;
  else p += aN * 0.0017 * lub;
  // The beat as it runs through the heart: the atria first, then the ventricles from the apex up.
  float fv = (x - 0.09) / 0.13;
  float onda = (aQ.x < 0.5 ? 1.0 : 0.0) * exp(-pow((aQ.y - fv) / 0.14, 2.0)) * step(-0.3, fv) * step(fv, 1.4);
  float oa = (aQ.x > 0.5 && aQ.x < 1.5 ? 1.0 : 0.0) * exp(-pow((x - 0.025) / 0.03, 2.0));
  vec3 v = normalize(cameraPosition - p);
  float rim = 1.0 - abs(dot(aN, v));
  em *= 0.16 + 1.7 * pw(rim, 2.4);
  em += vec3(1.0, 0.75, 0.55) * (onda + oa) * (0.3 + 0.9 * rim);
`;

// ---------------------------------------------------------------- people

/** You (teal, at the origin) and the others around you, each a heart that sends a ring out on each beat. */
function gente(otros: number) {
  const b = materiaBuilder(1804);
  const r = b.r;
  const aQ: number[] = [];
  const persona = (x: number, y: number, z: number, c: THREE.Color, bpm: number, fase: number, tu: number) => {
    b.push(x, y, z, c, tu ? 0.03 : 0.3, tu ? 2.4 : 1.3, { kind: 0 });
    aQ.push(bpm, fase, 0, tu);
    const n = tu ? 72 : 16;
    for (let k = 0; k < n; k++) {
      b.push(x, y, z, c, tu ? 0.03 : 0.14, 1.0, { kind: 1 });
      aQ.push(bpm, fase, (k / n) * Math.PI * 2, tu);
    }
  };
  persona(0, 0, 0, TU, BPM, 0, 1);
  for (let i = 0; i < otros; ) {
    // Denser near you, as the people in your building and the next ones are.
    const rr = 1700 * Math.pow(r(), 1.7);
    const a = r() * Math.PI * 2;
    const bx = Math.floor((Math.cos(a) * rr - 60) / 120);
    const bz = Math.floor((Math.sin(a) * rr - 60) / 120);
    const x = 60 + bx * 120 + 14 + r() * 92;
    const z = 60 + bz * 120 + 14 + r() * 92;
    if (Math.hypot(x, z) < 6 || Math.hypot(x, z) > 1800 || dentroCiudad(x, z) <= 0) continue;
    i++;
    const pisos = 3 + Math.floor(22 * Math.pow(fbm(bx * 0.4, bz * 0.4), 2));
    persona(x, 3 * Math.floor(r() * pisos), z, PALETA[Math.floor(r() * PALETA.length)], 55 + 40 * r(), r(), 0);
  }
  return { data: b.data(), aQ: new Float32Array(aQ) };
}

const GENTE_PRE = /* glsl */ `
  attribute vec4 aQ;
  uniform float uAnillo, uAnilloTu, uTu, uOtros, uAlt;
`;
const GENTE_MOVE = /* glsl */ `
  float ph = fract(uTime * aQ.x / 60.0 + aQ.y);
  bool tu = aQ.w > 0.5;
  if (tu) p.y += uAlt;
  if (aKind < 0.5) {
    em *= 0.3 + 1.3 * exp(-ph * 6.0);
    fuente = 1.0;
  } else {
    float rr = (tu ? uAnilloTu : uAnillo) * (0.1 + 0.9 * ph);
    p += vec3(cos(aQ.z), 0.0, sin(aQ.z)) * rr;
    em *= 1.6 * smoothstep(0.0, 0.1, ph) * pow(1.0 - ph, 1.3);
    fuente = 0.6;
  }
  em *= tu ? uTu : uOtros;
`;

// ---------------------------------------------------------------- sky

function estrellas() {
  const b = materiaBuilder(1807);
  const r = b.r;
  for (let i = 0; i < 16000; i++) {
    const [x, y, z] = b.onSphere();
    const k = r();
    const c = k < 0.12 ? new THREE.Color(0.7, 0.8, 1.0) : k < 0.7 ? new THREE.Color(1.0, 0.95, 0.88) : new THREE.Color(1.0, 0.75, 0.55);
    b.push(x * 4e9, y * 4e9, z * 4e9, c, 1e6, 0.25 + 2.2 * Math.pow(r(), 4), { kind: 0 });
  }
  return b.data();
}

/** The air over the city at night: the glow of the city on it, the clouds lit from below, and the dark air above. */
function aire() {
  const b = materiaBuilder(1806);
  const r = b.r;
  const naranja = new THREE.Color(1.0, 0.55, 0.25);
  for (let i = 0; i < 50000; i++) {
    const rr = 24000 * Math.sqrt(r());
    const a = r() * Math.PI * 2;
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    const d = dentroCiudad(x, z);
    if (r() > 0.15 + d) continue;
    b.push(x, -1100 * Math.log(1 - r() * 0.98), z, naranja, 160, 0.03 + 0.05 * d, { kind: 0 });
  }
  const gris = new THREE.Color(0.62, 0.62, 0.7);
  for (let i = 0; i < 90000; i++) {
    const rr = 45000 * Math.sqrt(r());
    const a = r() * Math.PI * 2;
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    const f = fbm(x / 6000 + 5.3, z / 6000 + 1.7);
    if (f < 0.5) continue;
    const d = dentroCiudad(x, z);
    const c = gris.clone().lerp(naranja, Math.min(1, d * 1.8));
    b.push(x, 2000 + 700 * r() * (f - 0.45), z, c, 110, (0.05 + 0.4 * d) * smoothstep(0.5, 0.62, f), { kind: 1 });
  }
  return b.data();
}

const AIRE_MOVE = /* glsl */ `
  em *= smoothstep(30.0, 600.0, length(p - cameraPosition));
  if (aKind > 0.5 && aKind < 1.5) em *= 0.9 + 0.1 * sin(uTime * 0.3 + seed * 20.0);
`;

/** The Sun, at a distance that is not the real one (it is only a light). */
function sol(S: THREE.Vector3) {
  const b = materiaBuilder(1808);
  const r = b.r;
  const c0 = C.clone().add(S.clone().multiplyScalar(1.5e8));
  const blanco = new THREE.Color(1.0, 0.97, 0.9);
  b.push(c0.x, c0.y, c0.z, blanco, 3e6, 6, { kind: 0 });
  for (let i = 0; i < 1600; i++) {
    const [x, y, z] = b.onSphere();
    const rr = 1.1e6 * Math.cbrt(r());
    b.push(c0.x + x * rr, c0.y + y * rr, c0.z + z * rr, blanco, 3e5, 2.5, { kind: 1 });
  }
  for (let i = 0; i < 1800; i++) {
    const [x, y, z] = b.onSphere();
    const rr = 1.2e6 + 4e6 * r() * r();
    b.push(c0.x + x * rr, c0.y + y * rr, c0.z + z * rr, new THREE.Color(1.0, 0.94, 0.85), 6e5, 0.12, { kind: 2 });
  }
  return b.data();
}

// ---------------------------------------------------------------- shared

/** Places the camera at distance D from target T, at azimuth `az` and elevation `el`. */
function camara(camera: THREE.PerspectiveCamera, T: THREE.Vector3, D: number, az: number, el: number) {
  const ce = Math.cos(el);
  camera.position.set(T.x + D * ce * Math.sin(az), T.y + D * Math.sin(el), T.z + D * ce * Math.cos(az));
  camera.up.set(0, 1, 0);
  camera.lookAt(T);
  camera.near = Math.max(1e-4, D * 1e-3);
  camera.far = 1e10;
  camera.fov = 40;
  camera.updateMatrixWorld();
}

/** The planet hides what is behind it (only from far: near the ground it would hide nothing anyway). */
function ocultar(nubes: (Nube | null)[], camera: THREE.PerspectiveCamera, D: number) {
  const c = C.clone().applyMatrix4(camera.matrixWorldInverse);
  for (const n of nubes) if (n) n.u.uOcc.value.set(c.x, c.y, c.z, D > 0 ? R * 0.995 : 0);
}

/** The clock at bottom left: a big number, its unit, and a line under it. */
function reloj(g: CanvasRenderingContext2D, f: Frame, a: number, n: string, que: string, linea: string) {
  if (a < 0.01) return;
  const u = f.u;
  const x = 44 * u;
  g.save();
  g.textBaseline = 'alphabetic';
  g.shadowColor = 'rgba(0,0,0,0.85)';
  g.shadowBlur = 12 * u;
  g.globalAlpha = a;
  g.font = FONT.serif(66 * u);
  g.fillStyle = ink();
  g.fillText(n, x, f.H - 86 * u);
  const w = g.measureText(n).width;
  g.font = FONT.serif(26 * u);
  g.fillStyle = ink(0.6);
  g.fillText(que, x + w + 12 * u, f.H - 88 * u);
  g.font = FONT.mono(11 * u);
  g.letterSpacing = `${0.9 * u}px`;
  g.fillStyle = ink(0.78);
  g.fillText(linea.toUpperCase(), x, f.H - 52 * u);
  g.restore();
}

/** Your heartbeats since the scene started, counted on the beat the heart draws. */
function contador(desde: number) {
  let t0: number | null = null;
  return (time: number) => {
    if (t0 === null) t0 = time;
    return desde + Math.max(1, Math.floor((time - t0) * (BPM / 60) - 0.06) + 1);
  };
}

/** Where the Sun is (from the planet's centre): behind it, seen from where the camera ends «La capa». */
const SOL = V(-0.53, -0.84, 0.1).normalize();

// ---------------------------------------------------------------- «Hoy»

export const hoy: Escena = {
  id: 'hoy',
  nombre: 'Hoy',
  estilos: [{ key: '1', nombre: 'Un latido · La Tierra de noche · Lo que estamos haciendo', nota: 'Tu corazón, de cerca. La cámara se aleja: es una luz entre las de una ciudad, y la ciudad una entre las de la Tierra de noche. Algunas luces son blancas y quietas: edificios sin ventanas. Adentro, máquinas cuyas luces parpadean, después se mueven en olas y al final laten.' }],
  montar(stage): Instancia {
    const { root, camera } = stage;

    const H = corazon();
    const UC = { uBpm: { value: BPM } };
    const cor = materia(H.data, { pre: CORAZON_PRE, move: CORAZON_MOVE, uniforms: UC, extra: { aN: [H.aN, 3], aQ: [H.aQ, 4] } });
    const G = gente(4200);
    const UG = { uAnillo: { value: 1 }, uAnilloTu: { value: 1 }, uTu: { value: 1 }, uOtros: { value: 1 }, uAlt: { value: 0 } };
    const per = materia(G.data, { pre: GENTE_PRE, move: GENTE_MOVE, uniforms: UG, extra: { aQ: [G.aQ, 4] } });
    const UV = { uVentanas: { value: 1 } };
    const urb = materia(ciudad(), { pre: /* glsl */ `uniform float uVentanas;`, move: /* glsl */ `if (aKind > ${CIUDAD.VENTANA - 0.5}) em *= uVentanas; fuente = 0.8;`, uniforms: UV });
    const UM = { uDC: { value: DC.clone() }, uOla: { value: 0 }, uSync: { value: 0 }, uCerca: { value: 0 }, uBpm: { value: BPM } };
    const maq = materia(maquinas(), { pre: MAQ_PRE + SEGURO, move: MAQ_MOVE, uniforms: UM });
    const est = materia(estrellas(), { move: 'fuente = 1.0;' });
    for (const n of [est, urb, maq, per, cor]) root.add(n.points);

    const UGl = {
      uS: { value: SOL.clone() }, uC: { value: C.clone() }, uDia: { value: 0 }, uLuces: { value: 1 }, uMaquinas: { value: 1 },
      uNocheTierra: { value: 0.035 }, uAire: { value: 1 }, uEdad: { value: 0 }, uSolFuerte: { value: 0 }, uBrillo: { value: 1 },
    };
    let tierra: Nube | null = null;
    let vivo = true;
    const listo = mapa().then((m) => {
      if (!vivo) return;
      tierra = materia(globo(m, { superficie: 160_000, aire: 70_000 }), { pre: GLOBO_PRE, move: GLOBO_MOVE, uniforms: UGl });
      root.add(tierra.points);
    });

    const tl = new Timeline({ luz: 0, ola: 0, sync: 0 });
    tl.set({ ld: -0.5, az: 0.2, el: 0.1, lx: 0, ly: 0, lz: 0 });
    tl.caption(7, 'Un latido', 'Este es el tuyo.');
    tl.with(1.5, { luz: 1 });
    tl.to(7, { az: 0.85, ld: -0.42 });
    tl.label('gente');
    tl.caption(8, 'Ocho mil millones', 'Esta noche laten ocho mil millones como el tuyo.');
    tl.to(8, { ld: 2.75, el: 0.8, az: 1.15 });
    tl.label('tierra');
    tl.caption(10, 'Hoy', 'Y hoy, en este planeta, estamos haciendo algo que nunca había existido.');
    tl.to(8.5, { ld: 7.35, el: 1.05, az: 1.55 });
    // Down into the main building, to one of its aisles (between the 9th and 10th rows of racks).
    tl.with(0.5, { lx: DC.x + 4, ly: 1.2, lz: DC.z - 2.5 });
    tl.wait(1.5);
    tl.label('dentro');
    tl.caption(7, 'Edificios sin ventanas', 'Adentro zumban máquinas.');
    tl.to(7, { ld: 2.15, el: 0.5, az: -1.15 }, EASE.inOut);
    tl.label('mentes');
    tl.caption(5, 'Mentes', 'Estamos haciendo mentes.');
    tl.with(4.5, { ola: 1 });
    tl.to(5, { ld: 1.35, el: 0.035, az: -1.5708 });
    tl.caption(5.5, 'Quizá', 'Quizá un día sean más inteligentes que nosotros. Quizá sientan.');
    tl.to(5.5, { lx: DC.x + 40 });
    tl.label('late');
    tl.caption(6, 'A su manera', 'Quizá, a su manera, estén vivas.');
    tl.with(4, { sync: 1 });
    tl.to(6, { lx: DC.x + 62, ld: 1.5, el: 0.08 });
    tl.label('como');
    tl.caption(7.5, 'Si lo están', 'Si lo están, ¿cómo vivirían?');
    tl.to(7.5, { ld: 3.82, el: 0.62, az: -2.556, lx: DC.x * 0.5, ly: 0, lz: DC.z * 0.5 });

    const T = V();
    const L = V();
    const contar = contador(0);
    let latidos = 1;
    return {
      tl,
      listo,
      escalera: false,
      cuenta(): Cuenta | null {
        return null;
      },
      rotulo(p): Rotulo | null {
        const cp = tl.captionAt(p);
        return cp ? { capitulo: 'Apertura · Hoy', name: cp.name, fact: cp.fact } : null;
      },
      update(f: Frame) {
        const g = (k: string) => tl.get(k, f.p);
        const ld = g('ld');
        const D = Math.pow(10, ld);
        L.set(g('lx'), g('ly'), g('lz'));
        T.copy(L).lerp(C, Math.min(smoothstep(6.3, 7.3, ld), (0.75 * D) / R));
        camara(camera, T, D, g('az'), g('el'));
        stage.bloom.strength = 0.5;
        stage.bloom.radius = 0.6;
        stage.bloom.threshold = 0.16;
        const luz = g('luz');
        latidos = contar(f.time);
        LATIDOS = latidos;

        enfocar(cor, f.focal, f.dpr, f.time);
        cor.u.uGain.value = luz * 0.95 * (1 - smoothstep(0.2, 0.85, ld));

        enfocar(per, f.focal, f.dpr, f.time);
        per.u.uGain.value = luz * smoothstep(-0.35, 0.3, ld) * (1 - smoothstep(4.5, 5.3, ld));
        UG.uAnillo.value = clamp(D * 0.03, 0.02, 18);
        UG.uAnilloTu.value = clamp(D * 0.035, 0.02, 90);
        UG.uTu.value = smoothstep(0.35, 0.8, ld) * (1 + 4 * smoothstep(3.0, 3.6, ld));
        UG.uOtros.value = smoothstep(0.7, 1.7, ld) * (1 - smoothstep(2.6, 3.2, ld));

        enfocar(urb, f.focal, f.dpr, f.time);
        urb.u.uMinPx.value = 1.3 * f.dpr;
        urb.u.uMaxPx.value = 10 * f.dpr;
        urb.u.uGain.value = luz * 0.75 * smoothstep(0.9, 2.3, ld) * (1 - smoothstep(5.7, 6.4, ld)) * (1 - 0.92 * smoothstep(3.8, 5.2, ld));
        UV.uVentanas.value = 1 - smoothstep(3.2, 3.9, ld);

        enfocar(maq, f.focal, f.dpr, f.time);
        maq.u.uMaxPx.value = 12 * f.dpr;
        const cerca = 1 - smoothstep(2.3, 3.0, Math.log10(camera.position.distanceTo(DC) + 1));
        maq.u.uGain.value = luz * (1 - smoothstep(5.0, 5.8, ld)) * Math.max(smoothstep(1.0, 2.0, ld), cerca);
        UM.uCerca.value = cerca;
        urb.u.uGain.value *= 1 - 0.8 * cerca;
        UM.uOla.value = g('ola');
        UM.uSync.value = g('sync');

        enfocar(est, f.focal, f.dpr, f.time);
        est.u.uMinPx.value = 1.2 * f.dpr;
        est.u.uMaxPx.value = 3 * f.dpr;
        est.u.uGain.value = luz * 0.8 * smoothstep(4.8, 6.0, ld);

        if (tierra) {
          enfocar(tierra, f.focal, f.dpr, f.time);
          tierra.u.uMinPx.value = 1.2 * f.dpr;
          tierra.u.uMaxPx.value = 4 * f.dpr;
          tierra.u.uGain.value = luz * smoothstep(4.6, 5.6, ld);
        }
        ocultar([est, urb, maq, per, tierra], camera, D);
      },
      placa(g2, f) {
        const a = tl.get('luz', f.p) * smoothstep(0.6, 1.8, f.p);
        if (f.p >= tl.at('mentes')) reloj(g2, f, a, '¿?', 'latidos', 'Lo que estamos haciendo');
        else {
          const linea = f.p < tl.at('gente') ? 'Tu corazón' : f.p < tl.at('tierra') ? 'Uno entre ocho mil millones' : 'La Tierra de noche · hoy';
          reloj(g2, f, a, grupo(latidos), latidos === 1 ? 'latido' : 'latidos', linea);
        }
      },
      dispose() {
        vivo = false;
      },
    };
  },
};

// ---------------------------------------------------------------- «No es para nosotros»

const anos = (y: number) => {
  if (y < 1e6) return [grupo(Math.round(y / 1000) * 1000), 'años'];
  return [grupo(Math.round(y / 1e6)), Math.round(y / 1e6) === 1 ? 'millón de años' : 'millones de años'];
};
const altura = (m: number) => (m < 1000 ? `${grupo(m)} m` : `${grupo(m / 1000)} km`);

export const capa: Escena = {
  id: 'capa',
  nombre: 'Quince segundos',
  estilos: [{ key: '1', nombre: 'Quince segundos · La capa · La ventana', nota: 'Subes desde la ciudad: las nubes iluminadas desde abajo, el agua que hierve a 19 km, nada de aire a 100 km. De lejos, el aire es un anillo fino con el Sol detrás. Del lado del día, el Sol brilla cada vez más: se va lo verde, se van los mares, queda la roca sin color.' }],
  montar(stage): Instancia {
    const { root, camera } = stage;

    const G = gente(2600);
    const UG = { uAnillo: { value: 1 }, uAnilloTu: { value: 1 }, uTu: { value: 1 }, uOtros: { value: 1 }, uAlt: { value: 0 } };
    const per = materia(G.data, { pre: GENTE_PRE, move: GENTE_MOVE, uniforms: UG, extra: { aQ: [G.aQ, 4] } });
    const urb = materia(ciudad(), { move: /* glsl */ `fuente = 0.8;` });
    const UM = { uDC: { value: DC.clone() }, uOla: { value: 0 }, uSync: { value: 0 }, uCerca: { value: 0 }, uBpm: { value: BPM } };
    const maq = materia(maquinas(), { pre: MAQ_PRE + SEGURO, move: MAQ_MOVE, uniforms: UM });
    const UA = { uNubes: { value: 1 } };
    const air = materia(aire(), { pre: /* glsl */ `uniform float uNubes;`, move: AIRE_MOVE + /* glsl */ `if (aKind > 0.5 && aKind < 1.5) em *= uNubes;`, uniforms: UA });
    const est = materia(estrellas(), { move: 'fuente = 1.0;' });
    const US = { uSolF: { value: 0 } };
    const astro = materia(sol(SOL), { pre: /* glsl */ `uniform float uSolF;`, move: /* glsl */ `em *= 1.0 + uSolF * (aKind > 1.5 ? 2.0 : 0.6); fuente = 1.0;`, uniforms: US });
    for (const n of [est, astro, urb, maq, air, per]) root.add(n.points);

    const UGl = {
      uS: { value: SOL.clone() }, uC: { value: C.clone() }, uDia: { value: 1 }, uLuces: { value: 1 }, uMaquinas: { value: 1 },
      uNocheTierra: { value: 0.03 }, uAire: { value: 1 }, uEdad: { value: 0 }, uSolFuerte: { value: 0 }, uBrillo: { value: 1 },
    };
    let tierra: Nube | null = null;
    let vivo = true;
    const listo = mapa().then((m) => {
      if (!vivo) return;
      tierra = materia(globo(m, { superficie: 300_000, aire: 90_000, aireCerca: 160_000 }), { pre: GLOBO_PRE, move: GLOBO_MOVE, uniforms: UGl });
      root.add(tierra.points);
    });

    const tl = new Timeline({ luz: 0, vivo: 1, luces: 1, edad: 0, solF: 0, anos: 0 });
    tl.set({ la: 0, ld: 1.35, az: 0.4, el: 0.45 });
    tl.caption(5.5, 'Sube', 'Si subieras, el aire se acabaría pronto.');
    tl.with(1.5, { luz: 1 });
    tl.to(5.5, { la: 3.35, ld: 2.9, el: 0.55, az: 0.95 });
    tl.label('hierve');
    tl.caption(6, 'Diecinueve kilómetros', 'Aquí el agua hierve a la temperatura de tu cuerpo.');
    tl.to(6, { la: 4.28, ld: 3.85, el: 0.42, az: 1.3 });
    tl.label('vacio');
    tl.caption(8, 'Quince segundos', 'Más arriba no hay aire. En quince segundos pierdes el sentido. Casi todo el universo es así.');
    tl.to(3, { la: 5.0, ld: 4.45, el: 0.2, az: 1.5 });
    tl.label('sin');
    tl.with(4, { vivo: 0.12 }, EASE.linear);
    tl.to(5, { ld: 4.7, az: 1.62 });
    tl.label('capa');
    tl.caption(9, 'La capa', 'Todo lo que ha vivido, vivió aquí: en una capa más fina, en proporción, que la piel de una manzana.');
    tl.to(9, { ld: 7.32, el: 1.0, az: 1.7 });
    tl.label('ventana');
    tl.caption(7, 'La ventana', 'El Sol brilla cada vez más.');
    tl.with(3, { luces: 0 });
    tl.with(19, { anos: 1 }, EASE.linear);
    tl.to(7, { el: -0.5, az: -0.9, ld: 7.3 }, EASE.inOut);
    tl.label('mil');
    tl.caption(8, 'Mil millones de años', 'A la vida de la Tierra le quedan unos mil millones de años. Ya vivió cuatro quintos de su tiempo.');
    tl.with(12, { edad: 1, solF: 1 }, EASE.inOut);
    tl.to(8, { az: -0.75, el: -0.45 });
    tl.label('nisiquiera');
    tl.caption(8, 'Ni siquiera aquí', 'Ni siquiera este lugar es para siempre.');
    tl.to(8, { az: -0.6, el: -0.42, ld: 7.36 });

    const T = V();
    const contar = contador(LATIDOS);
    let latidos = 1;
    return {
      tl,
      listo,
      escalera: false,
      cuenta(): Cuenta | null {
        return null;
      },
      rotulo(p): Rotulo | null {
        const cp = tl.captionAt(p);
        return cp ? { capitulo: 'I · No es para nosotros', name: cp.name, fact: cp.fact } : null;
      },
      update(f: Frame) {
        const g = (k: string) => tl.get(k, f.p);
        const ld = g('ld');
        const D = Math.pow(10, ld);
        const alt = Math.pow(10, g('la')) - 1;
        T.set(0, alt, 0).lerp(C, Math.min(smoothstep(6.3, 7.3, ld), (0.75 * D) / R));
        camara(camera, T, D, g('az'), g('el'));
        stage.bloom.strength = 0.5;
        stage.bloom.radius = 0.6;
        stage.bloom.threshold = 0.16;
        const luz = g('luz');
        latidos = contar(f.time);

        enfocar(per, f.focal, f.dpr, f.time);
        per.u.uGain.value = luz * (1 - smoothstep(5.2, 6.0, ld));
        UG.uAlt.value = alt;
        UG.uAnillo.value = clamp(D * 0.03, 0.05, 18);
        UG.uAnilloTu.value = clamp(D * 0.035, 0.05, 3000);
        UG.uTu.value = 2.2 * g('vivo');
        UG.uOtros.value = 1 - smoothstep(2.4, 3.2, ld);

        enfocar(urb, f.focal, f.dpr, f.time);
        urb.u.uMinPx.value = 1.3 * f.dpr;
        urb.u.uMaxPx.value = 10 * f.dpr;
        urb.u.uGain.value = luz * 0.75 * (1 - smoothstep(5.8, 6.5, ld)) * (1 - 0.92 * smoothstep(3.8, 5.2, ld)) * g('luces');

        enfocar(maq, f.focal, f.dpr, f.time);
        maq.u.uMaxPx.value = 12 * f.dpr;
        maq.u.uGain.value = luz * (1 - smoothstep(5.0, 5.8, ld)) * g('luces');

        enfocar(air, f.focal, f.dpr, f.time);
        air.u.uMaxPx.value = 20 * f.dpr;
        air.u.uGain.value = luz * (1 - smoothstep(5.0, 5.8, ld));

        enfocar(est, f.focal, f.dpr, f.time);
        est.u.uMinPx.value = 1.2 * f.dpr;
        est.u.uMaxPx.value = 3 * f.dpr;
        est.u.uGain.value = luz * 0.85 * smoothstep(3.4, 4.8, g('la'));

        enfocar(astro, f.focal, f.dpr, f.time);
        astro.u.uMinPx.value = 1.5 * f.dpr;
        astro.u.uMaxPx.value = 60 * f.dpr;
        astro.u.uGain.value = luz * smoothstep(5.5, 6.5, ld);
        US.uSolF.value = g('solF');

        if (tierra) {
          enfocar(tierra, f.focal, f.dpr, f.time);
          tierra.u.uMinPx.value = 1.2 * f.dpr;
          tierra.u.uMaxPx.value = 7 * f.dpr;
          tierra.u.uGain.value = luz * smoothstep(3.6, 4.6, ld);
          UGl.uLuces.value = g('luces');
          UGl.uMaquinas.value = g('luces');
          UGl.uEdad.value = g('edad');
          UGl.uSolFuerte.value = g('solF');
        }
        ocultar([est, astro, urb, maq, air, per, tierra], camera, D);
      },
      placa(g2, f) {
        const luz = tl.get('luz', f.p);
        const p = f.p;
        if (p < tl.at('capa')) {
          const alt = Math.pow(10, tl.get('la', p)) - 1;
          const a = luz * smoothstep(0.6, 1.8, p) * (1 - smoothstep(tl.at('capa') - 1.5, tl.at('capa'), p));
          let linea = `Altura · ${altura(alt)}`;
          if (alt > 17000 && alt < 30000) linea += ' · el agua hierve a 37 °C';
          if (alt > 95000) {
            const s = clamp((p - tl.at('sin')) / 4, 0, 1) * 15;
            linea = p > tl.at('sin') ? `Sin aire · ${Math.round(s)} segundos` : `Altura · ${altura(alt)} · el espacio`;
          }
          reloj(g2, f, a, grupo(latidos), 'latidos', linea);
        } else if (p >= tl.at('ventana')) {
          const k = tl.get('anos', p);
          const [n, que] = anos(Math.pow(10, 3 + 6 * k));
          reloj(g2, f, luz * smoothstep(tl.at('ventana'), tl.at('ventana') + 1, p), n, que, 'Desde hoy · lo que le queda a la vida de la Tierra es aproximado');
        }
      },
      dispose() {
        vivo = false;
      },
    };
  },
};
