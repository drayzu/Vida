import * as THREE from 'three';
import { clamp } from '../src/engine/math';

/**
 * Vida's plate: everything drawn in 2D over the film, in device pixels, so a capture holds it.
 * - The clock (bottom left): your heartbeats, large; under it a line (the weeks, then the age, the
 *   hour of the day of your life and the lights near you).
 * - The ladder (right): your whole life, from the first heartbeat (top) to the last (bottom),
 *   measured in heartbeats.
 * - On a bright frame (the light you are born into) the ink turns dark, as in Tiempo.
 */

export const FONT = {
  serif: (px: number) => `${px}px "Instrument Serif"`,
  italic: (px: number) => `italic ${px}px "Instrument Serif"`,
  mono: (px: number) => `500 ${px}px "Geist Mono Variable"`,
  sans: (px: number) => `500 ${px}px "Geist Variable"`,
};

/** The work's colour (proposed: morning peach). */
const AC = { r: 255, g: 196, b: 163 };
export function acento(c: THREE.Color) {
  AC.r = Math.round(c.r * 255);
  AC.g = Math.round(c.g * 255);
  AC.b = Math.round(c.b * 255);
}

/** 0: light ink on black; 1: dark ink on light. */
let OSC = 0;
export function oscuro(k: number) {
  OSC = clamp(k, 0, 1);
}
const mixc = (a: number, b: number) => Math.round(a + (b - a) * OSC);
export const ink = (a = 1) => `rgba(${mixc(236, 26)},${mixc(231, 21)},${mixc(219, 16)},${a})`;
export const ac = (a = 1) => `rgba(${mixc(AC.r, 150)},${mixc(AC.g, 70)},${mixc(AC.b, 40)},${a})`;
const sombra = () => (OSC > 0.5 ? 'rgba(255,240,225,0.0)' : 'rgba(0,0,0,0.85)');

export const grupo = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
/** Minutes since midnight as «05:48». */
export const hora = (min: number) => {
  const m = ((Math.floor(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** A life of about 3.2 billion heartbeats is the day's light, from 06:00 (the first) to 18:00 (the last). */
export const TOTAL = 3.2e9;
export const ANTES = 5.0e7;
/** The hour of the day of your life, measured in heartbeats (birth is 06:00). */
export const horaDe = (latidos: number) => 360 + (latidos / TOTAL) * 720;

export function wrap(g: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// ---------------------------------------------------------------- the clock

export interface Rotulo {
  capitulo?: string;
  name: string;
  fact: string;
}

export interface Cuenta {
  latidos: number;
  /** The line under the number (weeks, age, hour, lights near). */
  linea: string;
  /** Where you are in your life, by heartbeats (0 first, 1 last). */
  vida: number;
  a?: number;
}

/** The heartbeats at bottom left, with the moment's chapter, name and sentence above them. */
export function cuenta(g: CanvasRenderingContext2D, u: number, H: number, c: Cuenta | null, cap: Rotulo | null) {
  const x = 44 * u;
  g.save();
  g.textBaseline = 'alphabetic';
  g.shadowColor = sombra();
  g.shadowBlur = 12 * u;
  if (cap) {
    if (cap.capitulo) {
      g.font = FONT.mono(10.5 * u);
      g.letterSpacing = `${1.6 * u}px`;
      g.fillStyle = ac();
      g.fillText(cap.capitulo.toUpperCase(), x, H - 262 * u);
      g.letterSpacing = '0px';
    }
    g.font = FONT.italic(31 * u);
    g.fillStyle = ink();
    g.fillText(cap.name, x, H - 226 * u);
    g.font = FONT.sans(14.5 * u);
    g.fillStyle = ink(0.7);
    wrap(g, cap.fact, 430 * u).forEach((line, i) => g.fillText(line, x, H - 198 * u + i * 21 * u));
  }
  if (c && (c.a ?? 1) > 0.01) {
    g.globalAlpha = c.a ?? 1;
    const n = grupo(c.latidos);
    g.font = FONT.serif(66 * u);
    g.fillStyle = ink();
    g.fillText(n, x, H - 86 * u);
    const w = g.measureText(n).width;
    g.font = FONT.serif(26 * u);
    g.fillStyle = ink(0.6);
    g.fillText(Math.round(c.latidos) === 1 ? 'latido' : 'latidos', x + w + 12 * u, H - 88 * u);
    g.font = FONT.mono(11 * u);
    g.letterSpacing = `${0.9 * u}px`;
    g.fillStyle = ink(0.78);
    g.fillText(c.linea.toUpperCase(), x, H - 52 * u);
  }
  g.restore();
}

// ---------------------------------------------------------------- the ladder

const HITOS: [number, string][] = [
  [0, 'primer latido'],
  [ANTES / TOTAL, 'nacer'],
  [0.5, 'a mitad de camino'],
  [1, 'el último'],
];

/** Your whole life at the right edge, by heartbeats: the milestones and your mark. */
export function escalera(g: CanvasRenderingContext2D, u: number, W: number, H: number, v: number, alpha = 1) {
  if (alpha <= 0.01) return;
  const x = W - 150 * u;
  const y0 = 96 * u;
  const y1 = H - 76 * u;
  // A root, so the first years have room (by heartbeats they are a sliver).
  const yOf = (k: number) => y0 + Math.sqrt(clamp(k, 0, 1)) * (y1 - y0);
  g.save();
  g.globalAlpha = alpha;
  g.lineWidth = Math.max(1, 1.1 * u);
  g.strokeStyle = ink(0.34);
  g.beginPath();
  g.moveTo(x, y0);
  g.lineTo(x, y1);
  g.stroke();
  g.font = FONT.mono(9 * u);
  g.letterSpacing = `${1 * u}px`;
  g.textBaseline = 'middle';
  let cerca = HITOS[0];
  for (const h of HITOS) if (Math.abs(Math.sqrt(h[0]) - Math.sqrt(v)) < Math.abs(Math.sqrt(cerca[0]) - Math.sqrt(v))) cerca = h;
  for (const h of HITOS) {
    const y = yOf(h[0]);
    g.strokeStyle = ink(0.4);
    g.beginPath();
    g.moveTo(x - 7 * u, y);
    g.lineTo(x + 7 * u, y);
    g.stroke();
    g.textAlign = 'left';
    g.fillStyle = ink(h === cerca ? 0.92 : 0.3);
    g.fillText(h[1].toUpperCase(), x + 14 * u, y);
  }
  const yp = yOf(v);
  g.fillStyle = ac();
  g.shadowColor = ac();
  g.shadowBlur = 10 * u;
  g.beginPath();
  g.arc(x, yp, 4 * u, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** The brand and the study, top left. */
export function marca(g: CanvasRenderingContext2D, u: number, concepto: string, sub: string) {
  g.save();
  g.textBaseline = 'alphabetic';
  g.shadowColor = sombra();
  g.shadowBlur = 10 * u;
  g.font = FONT.serif(27 * u);
  g.fillStyle = ink();
  g.fillText('Vida', 40 * u, 54 * u);
  const w = g.measureText('Vida').width;
  g.font = FONT.mono(10.5 * u);
  g.letterSpacing = `${1.4 * u}px`;
  g.fillStyle = ac();
  g.fillText(concepto.toUpperCase(), 40 * u + w + 16 * u, 52 * u);
  g.fillStyle = ink(0.5);
  g.fillText(sub.toUpperCase(), 40 * u, 76 * u);
  g.restore();
}

/** The title card, centred, as in the other works: series and number, name, question. */
export function titulo(g: CanvasRenderingContext2D, u: number, W: number, H: number, a: number) {
  if (a <= 0.01) return;
  g.save();
  g.globalAlpha = a;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  const cx = W / 2;
  const cy = H * 0.4;
  g.font = FONT.mono(11 * u);
  g.letterSpacing = `${3 * u}px`;
  g.fillStyle = ac();
  g.fillText('HORIZONTES · 07', cx, cy - 92 * u);
  g.letterSpacing = '0px';
  g.font = FONT.serif(118 * u);
  g.fillStyle = ink();
  g.fillText('Vida', cx, cy + 10 * u);
  g.font = FONT.italic(30 * u);
  g.fillStyle = ink(0.8);
  g.fillText('¿Qué hacemos con ella?', cx, cy + 62 * u);
  g.restore();
}
