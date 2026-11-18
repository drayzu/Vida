import * as THREE from 'three';
import { materiaBuilder } from '../src/engine/materia';
import { V } from './comun';
import { fbm } from './mundos';
import mapaUrl from './texturas/2k_earth_daymap.jpg';

/**
 * The Earth at every scale, for «Hoy» and «No es para nosotros» (GUION-vienen, moments 1–6).
 *
 * One world in metres. The origin is your heart, in a city at night; y is up. The planet's centre
 * is R below. The city is placed where Santiago is (the anchors of the night lights are real
 * cities, the lights around them are drawn, not measured).
 */

export const R = 6.371e6;
export const C = V(0, -R, 0);
const RAD = Math.PI / 180;

/** A direction on the globe (geographic frame: y to the north pole, longitude 0 on +x). */
export const geo = (lat: number, lon: number) => {
  const a = lat * RAD;
  const o = lon * RAD;
  return V(Math.cos(a) * Math.cos(o), Math.sin(a), -Math.cos(a) * Math.sin(o));
};
const AQUI = geo(-33.45, -70.67);
/** Turns the globe so that the city is on top (at the origin). */
export const Q = new THREE.Quaternion().setFromUnitVectors(AQUI, V(0, 1, 0));
export const enMundo = (g: THREE.Vector3, h = 0, out = V()) => out.copy(g).applyQuaternion(Q).multiplyScalar(R + h).add(C);

/** The main data centre of the city (local metres), and smaller ones. */
export const DC = V(3420, 0, -2280);
const OTROS_DC = [V(-6100, 0, 4300), V(8800, 0, 2600), V(-2400, 0, -9100), V(11800, 0, -7400), V(-12500, 0, -1500)];

export interface Mapa {
  d: Uint8ClampedArray;
  w: number;
  h: number;
}

export function pixeles(url: string) {
  return new Promise<Mapa>((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = 1024;
      cv.height = 512;
      const g = cv.getContext('2d', { willReadFrequently: true })!;
      g.drawImage(img, 0, 0, cv.width, cv.height);
      res({ d: g.getImageData(0, 0, cv.width, cv.height).data, w: cv.width, h: cv.height });
    };
    img.onerror = rej;
    img.src = url;
  });
}
export const mapa = () => pixeles(mapaUrl);

const en = (m: Mapa, g: THREE.Vector3) => {
  const u = Math.atan2(-g.z, g.x) / (2 * Math.PI) + 0.5;
  const v = 0.5 - Math.asin(THREE.MathUtils.clamp(g.y, -1, 1)) / Math.PI;
  const i = (Math.min(m.h - 1, Math.floor(v * m.h)) * m.w + Math.min(m.w - 1, Math.floor(u * m.w))) * 4;
  return [m.d[i] / 255, m.d[i + 1] / 255, m.d[i + 2] / 255] as const;
};

/** 0 sea, 1 green, 2 rock and sand, 3 ice. */
const clase = (r: number, g: number, b: number) => {
  if (Math.min(r, g, b) > 0.62) return 3;
  if (b > r * 1.25 && b >= g * 0.9) return 0;
  if (g >= r * 0.97) return 1;
  return 2;
};
export const esTierra = (m: Mapa, g: THREE.Vector3) => {
  const [r, gg, b] = en(m, g);
  const k = clase(r, gg, b);
  return k === 1 || k === 2;
};

/**
 * Where people are at night: [lat, lon, weight]. Real cities; the weight is rough (how much light
 * the region gives off in the night images, by eye), not a population.
 */
const CIUDADES: [number, number, number][] = [
  // North America
  [40.7, -74, 3], [42.4, -71.1, 1], [38.9, -77, 1.5], [41.9, -87.6, 2], [43.7, -79.4, 1.2], [45.5, -73.6, 0.8], [33.7, -84.4, 1.2],
  [25.8, -80.2, 1.2], [29.8, -95.4, 1.5], [32.8, -96.8, 1.5], [39.7, -105, 0.8], [33.4, -112, 1], [34, -118.2, 2.5], [37.8, -122.4, 1.5],
  [47.6, -122.3, 1], [19.4, -99.1, 2.5], [20.7, -103.3, 0.8], [25.7, -100.3, 0.8], [39.1, -84.5, 0.8], [36.2, -86.8, 0.7], [44.9, -93.2, 0.7],
  // South America
  [-23.5, -46.6, 2.5], [-22.9, -43.2, 1.8], [-34.6, -58.4, 2], [-12, -77, 1.3], [4.7, -74.1, 1.3], [10.5, -66.9, 0.8], [-19.9, -43.9, 0.8],
  [-8, -34.9, 0.7], [-30, -51.2, 0.6], [-15.8, -47.9, 0.6], [-0.2, -78.5, 0.5], [-31.4, -64.2, 0.6], [-32.9, -68.8, 0.4], [-36.8, -73, 0.4],
  [-33.05, -71.6, 0.5], [6.2, -75.6, 0.6], [-25.3, -57.6, 0.4], [-34.9, -56.2, 0.5],
  // Europe
  [51.5, -0.1, 2.2], [48.9, 2.35, 2.2], [40.4, -3.7, 1.3], [41.4, 2.2, 0.9], [38.7, -9.1, 0.6], [51.4, 7, 2], [52.4, 4.9, 1.2], [50.8, 4.4, 1],
  [52.5, 13.4, 1.1], [48.1, 11.6, 0.8], [45.5, 9.2, 1.5], [41.9, 12.5, 1], [40.9, 14.3, 0.7], [48.2, 16.4, 0.7], [52.2, 21, 0.8], [55.8, 37.6, 2.2],
  [59.9, 30.3, 0.9], [50.4, 30.5, 0.8], [41, 29, 1.8], [38, 23.7, 0.7], [47.5, 19, 0.6], [59.3, 18, 0.5], [53.5, -2.2, 1], [50.1, 8.7, 0.8],
  [44.4, 26.1, 0.6], [43.3, 5.4, 0.6], [37.4, -6, 0.4],
  // Middle East and Africa
  [30, 31.2, 2], [27, 31.2, 0.6], [25.7, 32.6, 0.4], [35.7, 51.4, 1.3], [24.7, 46.7, 0.9], [25.2, 55.3, 0.9], [33.3, 44.4, 0.7], [32.1, 34.8, 0.8],
  [6.5, 3.4, 1.3], [-4.3, 15.3, 0.6], [-26.2, 28, 1.2], [-1.3, 36.8, 0.5], [33.6, -7.6, 0.6], [36.8, 3, 0.5], [9, 38.7, 0.5], [-33.9, 18.4, 0.5],
  [36.8, 10.2, 0.4], [21.5, 39.2, 0.6], [5.6, -0.2, 0.4],
  // South Asia
  [28.6, 77.2, 2.5], [19, 72.8, 2], [22.6, 88.4, 1.8], [23.8, 90.4, 1.5], [13, 77.6, 1.3], [13.1, 80.3, 1.2], [17.4, 78.5, 1.1], [24.9, 67, 1.3],
  [31.5, 74.3, 1.2], [23, 72.6, 0.8], [26.8, 80.9, 0.9], [25.6, 85.1, 0.8], [18.5, 73.9, 0.8], [26.9, 75.8, 0.6],
  // East and Southeast Asia
  [39.9, 116.4, 2.3], [39.1, 117.2, 1], [31.2, 121.5, 2.6], [22.8, 113.8, 2.8], [30.7, 104.1, 1.3], [29.6, 106.5, 1.1], [30.6, 114.3, 1.2],
  [34.3, 108.9, 0.9], [41.8, 123.4, 0.9], [36.7, 117, 0.9], [32.1, 118.8, 1.1], [30.3, 120.2, 1], [34.7, 113.6, 0.9], [26.1, 119.3, 0.6],
  [37.6, 127, 2.3], [35.2, 129, 0.8], [35.7, 139.7, 3], [34.7, 135.5, 2], [35.2, 136.9, 1], [33.6, 130.4, 0.7], [43.1, 141.3, 0.4], [25, 121.5, 1.3],
  [14.6, 121, 1.5], [13.8, 100.5, 1.5], [10.8, 106.7, 1.1], [21, 105.8, 0.9], [-6.2, 106.8, 2], [-7.3, 112.7, 0.9], [3.1, 101.7, 1], [1.35, 103.8, 0.9],
  [16.8, 96.2, 0.4], [-7, 110.4, 0.6],
  // Oceania
  [-33.9, 151.2, 1.1], [-37.8, 145, 1], [-27.5, 153, 0.6], [-32, 115.9, 0.5], [-36.8, 174.8, 0.4], [-34.9, 138.6, 0.4],
];

const GA = Math.PI * (3 - Math.sqrt(5));

/** Kinds of the globe's points. */
export const GLOBO = { MAR: 0, VERDE: 1, ROCA: 2, HIELO: 3, LUZ: 4, MAQUINA: 5, AIRE: 6 } as const;

/**
 * The planet as points: its surface (coloured as the day map, for when the Sun is on it), the
 * lights of the night, the white lights of the machines and a thin shell of air.
 */
export function globo(m: Mapa, o: { superficie: number; aire: number; aireCerca?: number }) {
  const b = materiaBuilder(1801);
  const r = b.r;
  const c = new THREE.Color();
  const g = V();
  const w = V();
  const lejosDeAqui = (gg: THREE.Vector3) => gg.angleTo(AQUI) > 0.42 * RAD;

  const N = o.superficie;
  const paso = Math.sqrt((4 * Math.PI) / N);
  const tam = 1.15 * paso * R;
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * (i + 0.5)) / N;
    const s = Math.sqrt(1 - y * y);
    // A regular lattice makes moiré at this size: shake each point within its cell.
    g.set(Math.cos(GA * i) * s + (r() - 0.5) * paso, y + (r() - 0.5) * paso, Math.sin(GA * i) * s + (r() - 0.5) * paso).normalize();
    const [pr, pg, pb] = en(m, g);
    const k = clase(pr, pg, pb);
    const suma = pr + pg + pb;
    let luz = 1;
    if (k === 3) {
      c.setRGB(1.0, 0.95, 0.9);
      luz = 0.45;
    } else if (k === 0) {
      c.setRGB(0.05 + 0.5 * pg, 0.22 + 0.9 * pg, 1.0);
      luz = 0.24 + 0.4 * pb;
    } else if (k === 1) {
      c.setRGB(0.25 + pr, 0.75 + 1.2 * pg, 0.2 + 0.6 * pb);
      luz = 0.55 + 0.9 * suma;
    } else {
      c.setRGB(1.0, 0.7, 0.42);
      luz = 0.1 + 0.22 * suma;
    }
    enMundo(g, 0, w);
    b.push(w.x, w.y, w.z, c, tam, luz, { kind: k });
  }

  // The night: clustered lights around each city, and a wider, fainter halo of towns and roads.
  const naranja = new THREE.Color(1.0, 0.6, 0.28);
  const blanca = new THREE.Color(1.0, 0.88, 0.7);
  const maquina = new THREE.Color(0.8, 0.9, 1.0);
  for (const [lat, lon, peso] of CIUDADES) {
    const sig = 0.3 + 0.22 * peso;
    const cuantos = [Math.round(peso * 650), Math.round(peso * 900)];
    for (let capa = 0; capa < 2; capa++) {
      const ancho = capa === 0 ? sig : sig * 5.5;
      for (let k = 0; k < cuantos[capa]; k++) {
        const rr = ancho * Math.sqrt(-2 * Math.log(1 - r() * 0.999));
        const a = r() * Math.PI * 2;
        const la = lat + rr * Math.sin(a);
        const lo = lon + (rr * Math.cos(a)) / Math.max(0.2, Math.cos(la * RAD));
        g.copy(geo(la, lo));
        if (!esTierra(m, g) || !lejosDeAqui(g)) continue;
        // Towns gather along lines (roads, rivers, coasts): a little noise makes the halo clump.
        if (capa === 1 && fbm(la * 1.7, lo * 1.7) < 0.47) continue;
        enMundo(g, 0, w);
        const lum = capa === 0 ? 0.55 + 1.3 * r() * r() : 0.18 + 0.5 * r() * r();
        b.push(w.x, w.y, w.z, r() < 0.7 ? naranja : blanca, capa === 0 ? 3500 : 2500, lum, { kind: GLOBO.LUZ });
      }
    }
    // The machines: a few white, quiet lights near each city.
    const n = Math.max(1, Math.round(peso * 2.2));
    for (let k = 0; k < n; k++) {
      const la = lat + (r() - 0.5) * sig * 1.6;
      const lo = lon + ((r() - 0.5) * sig * 1.6) / Math.cos(la * RAD);
      g.copy(geo(la, lo));
      if (!lejosDeAqui(g)) continue;
      enMundo(g, 400, w);
      b.push(w.x, w.y, w.z, maquina, 16000, 4 + 2 * r(), { kind: GLOBO.MAQUINA });
    }
  }

  // The air: a shell, seen only where the eye looks along it (the limb).
  const A = o.aire;
  for (let i = 0; i < A; i++) {
    const y = 1 - (2 * (i + 0.5)) / A;
    const s = Math.sqrt(1 - y * y);
    g.set(Math.cos(GA * i) * s, y, Math.sin(GA * i) * s);
    if (o.aireCerca && g.angleTo(AQUI) < 28 * RAD) continue;
    enMundo(g, 12000 + 50000 * r() * r(), w);
    b.push(w.x, w.y, w.z, new THREE.Color(0.22, 0.5, 1.0), 16000, 0.9, { kind: GLOBO.AIRE });
  }
  // Around the city the shell is much denser, so the horizon seen from up high is a clean line.
  const cerca = o.aireCerca ?? 0;
  for (let i = 0; i < cerca; i++) {
    const a = r() * Math.PI * 2;
    const t = Math.acos(1 - r() * (1 - Math.cos(28 * RAD)));
    g.set(Math.sin(t) * Math.cos(a), Math.cos(t), Math.sin(t) * Math.sin(a));
    w.copy(g).multiplyScalar(R + 30000 + 38000 * r()).add(C);
    b.push(w.x, w.y, w.z, new THREE.Color(0.22, 0.5, 1.0), 5000, 0.5, { kind: GLOBO.AIRE });
  }
  return b.data();
}

/** GLSL for the globe: the Sun (uS), the night, the lights, the air, and the ageing (uEdad). */
export const GLOBO_PRE = /* glsl */ `
  uniform vec3 uS, uC;
  uniform float uDia, uLuces, uMaquinas, uNocheTierra, uAire, uEdad, uSolFuerte, uBrillo;
`;
export const GLOBO_MOVE = /* glsl */ `
  vec3 n = normalize(p - uC);
  float sol = dot(n, uS);
  float dia = smoothstep(-0.06, 0.22, sol);
  vec3 v = normalize(cameraPosition - p);
  vec3 roca = vec3(1.0, 0.9, 0.8) * 0.2;
  if (aKind < 3.5) {
    if (aKind < 0.5) {
      // The oceans: they become haze, and then they are gone.
      float seca = smoothstep(0.55, 0.85, uEdad);
      em = mix(em, vec3(0.9, 0.94, 1.0) * 0.17, smoothstep(0.38, 0.6, uEdad) * (1.0 - seca));
      em = mix(em, roca * 0.6, seca);
    } else if (aKind < 1.5) {
      // What is alive goes first: green, then brown, then bare rock.
      em = mix(em, vec3(0.8, 0.5, 0.22) * 0.35, smoothstep(0.08, 0.4, uEdad));
      em = mix(em, roca, smoothstep(0.35, 0.65, uEdad));
    } else if (aKind < 2.5) {
      em = mix(em, roca, smoothstep(0.25, 0.65, uEdad));
    } else {
      em = mix(em, roca, smoothstep(0.02, 0.3, uEdad));
    }
    float noche = aKind > 0.5 ? uNocheTierra : 0.0;
    em = em * dia * uDia * (1.0 + 0.3 * uSolFuerte) + vec3(0.55, 0.6, 0.75) * noche * (1.0 - dia * uDia);
    fuente = 0.5;
  } else if (aKind < 4.5) {
    em *= (1.0 - dia * uDia) * uLuces * (0.88 + 0.12 * sin(uTime * 1.7 + seed * 60.0));
    fuente = 1.0;
  } else if (aKind < 5.5) {
    em *= (1.0 - dia * uDia) * uMaquinas;
    fuente = 1.0;
  } else {
    float limbo = pow(1.0 - abs(dot(n, v)), 6.0);
    float contraluz = pow(max(dot(-v, uS), 0.0), 3.0);
    // Lit by the Sun it is blue; on the night side it is the faint green line of the airglow.
    em = em * limbo * (1.1 * dia * uDia + 2.6 * contraluz) * uAire + vec3(0.3, 1.0, 0.5) * limbo * 0.22 * (1.0 - dia * uDia) * (1.0 - uEdad) * uAire;
    // Seen from inside the shell it would be a fog of big points: only the far limb is drawn.
    em *= smoothstep(2.5e5, 9e5, length(p - cameraPosition));
    fuente = 0.3;
  }
  em *= uBrillo;
`;

/** Kinds of the city's points. */
export const CIUDAD = { CALLE: 0, AVENIDA: 1, AUTOPISTA: 2, BARRIO: 3, VENTANA: 4 } as const;

/** Where the city is: a ragged edge, and the mountains to the east, where there is no light. */
export function dentroCiudad(x: number, z: number) {
  const d = Math.hypot(x, z);
  const borde = 17000 * (0.7 + 0.6 * fbm(x / 9000 + 3.1, z / 9000 + 7.7));
  if (x > 12500 + 2500 * fbm(z / 5000, 2.2)) return 0;
  return Math.max(0, 1 - d / borde);
}

/**
 * A city at night, around the origin: streets on a grid of 120 m blocks (dense near you), avenues,
 * a ring road and highways, and the glow of the neighbourhoods.
 */
export function ciudad() {
  const b = materiaBuilder(1802);
  const r = b.r;
  const sodio = new THREE.Color(1.0, 0.55, 0.22);
  const led = new THREE.Color(0.95, 0.92, 1.0);
  const tibia = new THREE.Color(1.0, 0.78, 0.5);
  const luz = (x: number, z: number, size: number, k: number, kind: number) => {
    b.push(x, 0.3, z, r() < 0.7 ? sodio : led, size, k * (0.6 + 0.6 * r()), { kind });
  };
  const BLOQUE = 120;
  // Streets near you.
  for (let k = -32; k <= 32; k++) {
    const a = 60 + k * BLOQUE;
    for (let s = -3900; s <= 3900; s += 24) {
      const j = (r() - 0.5) * 4;
      for (const [x, z] of [[a + j, s], [s, a + j]]) {
        const d = dentroCiudad(x, z);
        // Fewer side streets far from you, so the dense part has no edge.
        const h = Math.hypot(x, z);
        if (d <= 0 || h > 3900 || r() > (0.35 + d) * (1 - THREE.MathUtils.smoothstep(h, 1200, 3900))) continue;
        luz(x, z, 7, 0.9, CIUDAD.CALLE);
      }
    }
  }
  // Avenues every six blocks, out to the edge.
  for (let k = -32; k <= 32; k++) {
    const a = 60 + k * BLOQUE * 6;
    for (let s = -24000; s <= 24000; s += 55) {
      for (const [x, z] of [[a, s], [s, a]]) {
        const d = dentroCiudad(x, z);
        if (d <= 0 || r() > 0.25 + 1.4 * d) continue;
        luz(x, z, 11, 1.1, CIUDAD.AVENIDA);
      }
    }
  }
  // A ring road and six highways that leave the city.
  for (let i = 0; i < 2600; i++) {
    const a = (i / 2600) * Math.PI * 2;
    const rr = 10500 * (1 + 0.08 * Math.sin(3 * a + 1));
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    if (x > 12000) continue;
    luz(x, z, 16, 1.5, CIUDAD.AUTOPISTA);
  }
  for (let h = 0; h < 6; h++) {
    const a0 = h * 1.05 + 0.4;
    for (let s = 1500; s < 30000; s += 45) {
      const a = a0 + 0.15 * Math.sin(s / 7000 + h);
      const x = Math.cos(a) * s;
      const z = Math.sin(a) * s;
      if (x > 13000) continue;
      luz(x, z, 15, 1.3 * (s < 18000 ? 1 : 0.6), CIUDAD.AUTOPISTA);
    }
  }
  // The glow of the neighbourhoods: many dim, warm lights, denser in the middle.
  for (let i = 0; i < 90000; i++) {
    const rr = 22000 * Math.sqrt(r());
    const a = r() * Math.PI * 2;
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    const d = dentroCiudad(x, z);
    if (r() > d * 1.6) continue;
    b.push(x, 2 + 30 * r(), z, r() < 0.6 ? tibia : sodio, 22, 0.25 + 0.4 * r(), { kind: CIUDAD.BARRIO });
  }
  // Windows near you: the buildings are only their lit windows.
  for (let i = 0; i < 16000; i++) {
    const bx = Math.floor((r() - 0.5) * 34);
    const bz = Math.floor((r() - 0.5) * 34);
    const x = 60 + bx * BLOQUE + 12 + r() * (BLOQUE - 24);
    const z = 60 + bz * BLOQUE + 12 + r() * (BLOQUE - 24);
    const pisos = 3 + Math.floor(22 * Math.pow(fbm(bx * 0.4, bz * 0.4), 2));
    b.push(x, 3 * Math.floor(r() * pisos) + 1.5, z, tibia, 1.6, 0.35 + 0.5 * r(), { kind: CIUDAD.VENTANA });
  }
  return b.data();
}

/** Kinds of the machines' points. */
export const MAQ = { BORDE: 0, LED: 1, HALO: 2 } as const;

/**
 * The buildings without windows. The main one is drawn inside: rows of racks, each with its column
 * of small white lights. The others are their roofs and a glow.
 */
export function maquinas() {
  const b = materiaBuilder(1803);
  const r = b.r;
  const blanco = new THREE.Color(0.82, 0.92, 1.0);
  const borde = (c: THREE.Vector3, w: number, d: number, h: number) => {
    const per = 2 * (w + d);
    const n = Math.round(per / 1.4);
    for (let i = 0; i < n; i++) {
      let s = (i / n) * per;
      let x: number;
      let z: number;
      if (s < w) [x, z] = [s - w / 2, -d / 2];
      else if ((s -= w) < d) [x, z] = [w / 2, s - d / 2];
      else if ((s -= d) < w) [x, z] = [w / 2 - s, d / 2];
      else [x, z] = [-w / 2, d / 2 - (s - w)];
      b.push(c.x + x, h, c.z + z, blanco, 1.2, 0.8, { kind: MAQ.BORDE });
    }
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      for (let k = 0; k < 14; k++) b.push(c.x + (sx * w) / 2, (k / 14) * h, c.z + (sz * d) / 2, blanco, 1.2, 0.5, { kind: MAQ.BORDE });
    }
    for (let i = 0; i < 260; i++) b.push(c.x + (r() - 0.5) * w * 0.9, h * r(), c.z + (r() - 0.5) * d * 0.9, blanco, 24, 0.45, { kind: MAQ.HALO });
  };
  borde(DC, 200, 100, 14);
  for (const o of OTROS_DC) borde(o, 90 + 80 * r(), 50 + 40 * r(), 12);

  // The racks of the main one: 19 rows along x, a rack every 0.65 m, 16 lights each.
  const ambar = new THREE.Color(1.0, 0.75, 0.4);
  for (let fila = 0; fila < 19; fila++) {
    const z = DC.z - 45 + fila * 5;
    for (let x = -95; x <= 95; x += 0.65) {
      for (let k = 0; k < 16; k++) {
        const y = 0.25 + (k / 15) * 1.85;
        // The rows face each other in pairs, so each aisle has lights on both sides.
        b.push(DC.x + x + (r() - 0.5) * 0.3, y, z + (fila % 2 === 0 ? 0.5 : -0.5), r() < 0.04 ? ambar : blanco, 0.035, 0.9, { kind: MAQ.LED });
      }
    }
  }
  return b.data();
}

export const MAQ_PRE = /* glsl */ `
  uniform vec3 uDC;
  uniform float uOla, uSync, uCerca, uBpm;
`;
export const MAQ_MOVE = /* glsl */ `
  if (aKind < 0.5) {
    em *= 0.6 + 0.4 * uSync * lubdub(uTime, uBpm);
    fuente = 0.8;
  } else if (aKind < 1.5) {
    // Each light blinks on its own; then waves cross the hall; then all of it beats.
    float h = h21(vec2(seed * 91.0, floor(uTime * 7.0 + seed * 13.0)));
    float parpadeo = step(0.62, h);
    vec2 q = p.xz - uDC.xz;
    float ola = pow(0.5 + 0.5 * sin(dot(q, vec2(0.09, 0.035)) - uTime * 2.6), 5.0) + pow(0.5 + 0.5 * sin(dot(q, vec2(-0.05, 0.11)) - uTime * 1.9 + 2.0), 6.0);
    float x = fract(uTime * uBpm / 60.0);
    float frente = exp(-pow((length(q) / 110.0 - x * 2.2) / 0.08, 2.0));
    float pulso = lubdub(uTime, uBpm) * 0.8 + frente * 0.9;
    float act = mix(mix(parpadeo, ola, uOla), pulso, uSync);
    em *= (0.18 + 1.7 * act) * mix(0.25, 1.0, uCerca);
  } else {
    em *= (1.0 - uCerca) * (0.75 + 0.6 * uSync * lubdub(uTime, uBpm));
  }
`;
