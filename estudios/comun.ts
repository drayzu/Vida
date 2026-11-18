import * as THREE from 'three';

/** What Vida's studies share: the series' colours, the heartbeat and small helpers. */

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/** «Tú»: the teal of the series since Destino. */
export const TU = new THREE.Color(0.45, 1.0, 0.85);
/** The work's colour (proposal): the first light of the morning. */
export const MELOCOTON = new THREE.Color('#ffc4a3');
/** Warm white: the two cells at the start (neither you nor the other: the beginning). */
export const TIBIO = new THREE.Color('#ffe2cc');

/** The other six works: the people in Vida carry their colours. */
export const SERIE = {
  espacio: new THREE.Color('#ff5b2e'),
  tiempo: new THREE.Color('#8fb4ff'),
  destino: new THREE.Color('#6fe3c1'),
  infinito: new THREE.Color('#c9b4ff'),
  mente: new THREE.Color('#ffd180'),
  abismo: new THREE.Color('#ff6f91'),
};

export const ease = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * A heartbeat: two strokes (lub, then a softer dub) once per period, 0 between them. `t` in
 * seconds, `bpm` beats per minute. Same shape as the GLSL `lubdub` below.
 */
export function lubdub(t: number, bpm: number) {
  const T = 60 / bpm;
  const x = (((t % T) + T) % T) / T;
  const a = (x - 0.06) / 0.035;
  const b = (x - 0.22) / 0.04;
  return Math.exp(-a * a) + 0.6 * Math.exp(-b * b);
}

/** GLSL that cannot make a NaN, noise, and the same heartbeat. */
export const SEGURO = /* glsl */ `
  float pw(float x, float n) { return pow(max(x, 0.0), n); }
  float h21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float ruido(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 4; i++) { s += a * ruido(p); p = p * 2.03 + 17.1; a *= 0.5; }
    return s;
  }
  float lubdub(float t, float bpm) {
    float x = fract(t * bpm / 60.0);
    float a = (x - 0.06) / 0.035;
    float b = (x - 0.22) / 0.04;
    return exp(-a * a) + 0.6 * exp(-b * b);
  }
`;
