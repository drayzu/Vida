import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './style.css';
import * as THREE from 'three';
import { clamp, damp } from '../src/engine/math';
import { FONDOS } from '../src/engine/pantalla';
import { createStage, liberar } from './stage';
import { acento, cuenta, escalera, marca, oscuro } from './placa';
import { MELOCOTON } from './comun';
import type { Escena, Frame, Instancia } from './tipos';
import { latido } from './latido';
import { color } from './color';
import { montaje } from './montaje';
import { seishoras } from './seishoras';
import { flotadores } from './flotadores';
import { simulada } from './simulada';
import { mundos } from './mundos';
import { testigos } from './testigos';
import { color2 } from './color2';
import { perdida } from './perdida';
import { azul } from './azul';
import { cruza } from './cruza';
import { dentro } from './dentro';
import { frio } from './frio';
import { tu } from './tu';
import { sale } from './sale';
import { supo } from './supo';
import { duelo } from './duelo';
import { rastro } from './rastro';
import { nace } from './nace';
import { lejos } from './lejos';
import { fuera } from './fuera';
import { volver } from './volver';
import { cierre } from './cierre';
import { OBRA } from './obra';
import { hoy, capa, vuelta } from './hoy';
import { patron } from './patron';
import { galaxia } from './galaxia';
import { vacio } from './vacio';
import { otro } from './otro';
import { juntos } from './juntos';
import { siente } from './siente';

/**
 * Vida's phase-0 studies (`color` is plan v2, 14 Nov 2026; the rest are from plan v1). Copied from Abismo's study page. The page scroll
 * is time; nothing else moves the camera.
 *
 * URL: ?m=latido &s=1..3 (the way) &p=beat (start there) &ver=beat (freeze) &cap=1600x900 (render
 * at that size, for captures) &clean. `?obra` plays the whole work in the script's order (`obra.ts`):
 * A plays, the left and right arrows change scene, up and down change the speed; `?obra=7` starts at the 7th. `?debug` leaves `estudio` in the console:
 * `estudio.hoja('docs/estudios/x.jpg', [beats], cols, width)` saves a contact sheet.
 */

const ESCENAS: Escena[] = [hoy, capa, patron, juntos, otro, galaxia, siente, vacio, vuelta, cierre, volver, fuera, lejos, nace, rastro, duelo, supo, sale, tu, frio, dentro, cruza, azul, perdida, color2, testigos, mundos, simulada, flotadores, color, latido, montaje, seishoras];
const PX_PER_BEAT = 520;

const params = new URLSearchParams(location.search);
const capMatch = /^(\d+)x(\d+)$/.exec(params.get('cap') ?? '');
const fixed = capMatch ? { w: Number(capMatch[1]), h: Number(capMatch[2]) } : null;
if (fixed) document.body.classList.add('is-cap');
if (params.has('clean')) document.body.classList.add('is-clean');

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
const plate = document.querySelector<HTMLCanvasElement>('#placa')!;
const g = plate.getContext('2d')!;
const stage = createStage(canvas, fixed);
const spacer = document.querySelector<HTMLElement>('#spacer')!;
const momentos = document.querySelector<HTMLElement>('#momentos')!;
const estilos = document.querySelector<HTMLElement>('#estilos')!;
const blurb = document.querySelector<HTMLElement>('#blurb')!;

let escena = ESCENAS.find((e) => e.id === params.get('m')) ?? ESCENAS[0];
let estilo = clamp(Number(params.get('s') ?? 1) - 1, 0, escena.estilos.length - 1);
let inst: Instancia | null = null;

/** The whole work: which stretch of `OBRA` is on (-1: a study alone). */
let tramo = params.has('obra') ? clamp(Number(params.get('obra') || 1) - 1, 0, OBRA.length - 1) : -1;
const enObra = () => tramo >= 0;
if (enObra()) document.body.classList.add('is-obra');
/** How long each study is, in beats (measured; each stretch is corrected when it is mounted). */
const LARGO: Record<string, number> = { hoy: 55.5, capa: 51, lejos: 37.9, patron: 50, simulada: 20.5, sale: 42, cruza: 38, juntos: 42, nace: 51.5, mundos: 17, flotadores: 24, otro: 57, galaxia: 46, siente: 38, frio: 56, vacio: 52, azul: 32, vuelta: 46 };
const largos: number[] = OBRA.map((o) => Math.min(o.a ?? Infinity, LARGO[o.id] ?? 30) - (o.de ?? 0));
/** Beats per second when it plays by itself. */
let ritmo = enObra() ? 0.75 : 0.45;
/** A black veil over the cut between two scenes (1: black). */
let velo = 0;
const desde = () => (enObra() ? (OBRA[tramo].de ?? 0) : 0);
const hasta = () => (enObra() ? Math.min(OBRA[tramo].a ?? Infinity, inst?.tl.length ?? 0) : (inst?.tl.length ?? 0));

function tabs() {
  if (enObra()) {
    const t = OBRA[tramo];
    momentos.replaceChildren(
      ...OBRA.map((o, i) => {
        const b = document.createElement('button');
        b.className = `tab tab-n${i === tramo ? ' is-on' : ''}${o.ojo ? ' is-ojo' : ''}`;
        b.textContent = o.n;
        b.title = `${o.parte} · ${o.nombre}${o.ojo ? ` (${o.ojo})` : ''}`;
        b.addEventListener('click', () => irA(i));
        return b;
      }),
    );
    const salir = document.createElement('button');
    salir.className = 'tab';
    salir.textContent = 'Salir: ver los estudios sueltos';
    salir.addEventListener('click', () => {
      const url = new URL(location.href);
      url.searchParams.delete('obra');
      location.href = url.href;
    });
    estilos.replaceChildren(salir);
    blurb.textContent = `${t.parte} · ${t.n} · ${t.nombre}${t.ojo ? ` — ${t.ojo}` : ''}`;
    return;
  }
  const entera = document.createElement('button');
  entera.className = 'tab is-obra-tab';
  entera.textContent = '▶ La obra entera';
  entera.addEventListener('click', () => {
    const url = new URL(location.href);
    url.searchParams.set('obra', '1');
    location.href = url.href;
  });
  momentos.replaceChildren(
    entera,
    ...ESCENAS.map((e) => {
      const b = document.createElement('button');
      b.className = `tab${e === escena ? ' is-on' : ''}`;
      b.textContent = e.nombre;
      b.addEventListener('click', () => montar(e, 0, 0));
      return b;
    }),
  );
  estilos.replaceChildren(
    ...(escena.estilos.length > 1
      ? escena.estilos.map((s, i) => {
          const b = document.createElement('button');
          b.className = `tab${i === estilo ? ' is-on' : ''}`;
          b.innerHTML = `<span class="tab-k">${s.key}</span>${s.nombre}`;
          b.addEventListener('click', () => montar(escena, i, p));
          return b;
        })
      : []),
  );
  blurb.textContent = escena.estilos[estilo].nota;
}

let p = 0;
let target = 0;
let autoplay = false;
let frozen: number | null = params.has('ver') ? Number(params.get('ver')) : null;

function montar(e: Escena, s: number, at: number) {
  if (inst) inst.dispose();
  for (const c of [...stage.root.children]) liberar(c);
  FONDOS.length = 0;
  stage.reset();
  stage.camera.near = 1e-6;
  stage.camera.far = 1e6;
  escena = e;
  estilo = clamp(s, 0, e.estilos.length - 1);
  acento(MELOCOTON);
  oscuro(0);
  inst = e.montar(stage, estilo, params.has('viaje'));
  spacer.style.height = `${inst.tl.length * PX_PER_BEAT + innerHeight}px`;
  p = target = clamp(at, 0, inst.tl.length);
  scrollTo(0, p * PX_PER_BEAT);
  const url = new URL(location.href);
  if (enObra()) {
    url.searchParams.set('obra', String(tramo + 1));
    url.searchParams.delete('m');
    url.searchParams.delete('s');
    largos[tramo] = hasta() - desde();
  } else {
    url.searchParams.set('m', e.id);
    url.searchParams.set('s', String(estilo + 1));
  }
  history.replaceState(null, '', url);
  tabs();
}

/** The whole work: mounts its `i`-th stretch at its first beat. */
function irA(i: number) {
  tramo = clamp(i, 0, OBRA.length - 1);
  const t = OBRA[tramo];
  velo = 1;
  montar(ESCENAS.find((e) => e.id === t.id)!, t.estilo ?? 0, t.de ?? 0);
}

if (enObra()) irA(tramo);
else montar(escena, estilo, params.has('p') ? Number(params.get('p')) : 0);

addEventListener('scroll', () => {
  if (!inst) return;
  target = clamp(scrollY / PX_PER_BEAT, desde(), hasta());
});
addEventListener('wheel', () => (autoplay = false), { passive: true });
addEventListener('keydown', (ev) => {
  if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
  const k = ev.key.toLowerCase();
  if (k === 'a') autoplay = !autoplay;
  if (enObra()) {
    if (k === 'arrowright' || k === 'arrowleft') {
      ev.preventDefault();
      irA(tramo + (k === 'arrowright' ? 1 : -1));
    } else if (k === 'arrowup' || k === 'arrowdown') {
      ev.preventDefault();
      ritmo = clamp(ritmo * (k === 'arrowup' ? 1.25 : 0.8), 0.2, 3);
    }
    return;
  }
  const n = Number(k);
  if (n >= 1 && n <= escena.estilos.length) montar(escena, n - 1, p);
});

const mouse = new THREE.Vector2();
const mouseTarget = new THREE.Vector2();
addEventListener('pointermove', (ev) => mouseTarget.set((ev.clientX / innerWidth) * 2 - 1, -((ev.clientY / innerHeight) * 2 - 1)));
const calm = matchMedia('(prefers-reduced-motion: reduce)');

/** One frame at progress `at` (beats), ambient time `now` (ms), step `dt` (s). */
function step(now: number, dt: number, at: number) {
  if (!inst) return;
  const { camera } = stage;
  const W = stage.W;
  const H = stage.H;
  const f: Frame = { time: calm.matches ? 0 : now / 1000, dt, p: at, W, H, u: H / 860, dpr: stage.dpr, focal: 1, camera };
  f.focal = H / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  inst.update(f);
  if (!fixed && !calm.matches) {
    mouse.x = damp(mouse.x, mouseTarget.x, 3, dt);
    mouse.y = damp(mouse.y, mouseTarget.y, 3, dt);
    camera.rotateY(-mouse.x * 0.012);
    camera.rotateX(mouse.y * 0.009);
  }
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  f.focal = H / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  for (const s of FONDOS) {
    s.seguir(camera);
    s.u.uTime.value = f.time;
    (s.u.uRes.value as THREE.Vector2).set(W, H);
  }
  stage.render(f.time);

  if (plate.width !== W || plate.height !== H) {
    plate.width = W;
    plate.height = H;
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, H);
  const u = f.u;
  marca(g, u, `estudio · ${escena.nombre}`, 'fase 0 · borrador para Diego');
  inst.placa?.(g, f);
  const c = inst.cuenta(at);
  cuenta(g, u, H, c, inst.rotulo(at));
  if (c && inst.escalera !== false) escalera(g, u, W, H, c.vida, c.a ?? 1);
  // How far along the study the scroll is (not in captures).
  if (!fixed) {
    g.fillStyle = 'rgba(236,231,219,0.16)';
    g.fillRect(0, H - 3 * u, W, 3 * u);
    g.fillStyle = 'rgba(255,196,163,0.9)';
    const antes = enObra() ? largos.slice(0, tramo).reduce((a, b) => a + b, 0) : 0;
    const total = enObra() ? largos.reduce((a, b) => a + b, 0) : inst.tl.length;
    g.fillRect(0, H - 3 * u, (W * (antes + at - desde())) / total, 3 * u);
  }
  // The cut between two scenes of the whole work: through black.
  const negro = Math.max(velo, enObra() && autoplay && tramo < OBRA.length - 1 ? clamp((at - (hasta() - 0.5)) / 0.5, 0, 1) : 0);
  if (negro > 0.003) {
    g.fillStyle = `rgba(0,0,0,${negro})`;
    g.fillRect(0, 0, W, H);
  }
  velo = Math.max(0, velo - dt / 0.7);
}

let last = performance.now();
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  avanzar(dt);
  step(now, dt, p);
  requestAnimationFrame(frame);
}

/** Moves the progress on by `dt` seconds: by itself if it is playing, and towards where the scroll is. */
function avanzar(dt: number) {
  if (inst) {
    if (autoplay) {
      const fin = hasta();
      const next = Math.min(fin, target + dt * ritmo);
      scrollTo(0, next * PX_PER_BEAT);
      target = next;
      if (next >= fin) {
        if (enObra() && tramo < OBRA.length - 1) irA(tramo + 1);
        else autoplay = false;
      }
    }
    p = frozen ?? damp(p, target, 4.2, dt);
  }
}
requestAnimationFrame(frame);

// ---------------------------------------------------------------- captures (?debug)

async function save(path: string, c: HTMLCanvasElement, q = 0.9) {
  const blob = await new Promise<Blob>((res) => c.toBlob((b) => res(b!), 'image/jpeg', q));
  await fetch(`/__guardar?f=${encodeURIComponent(path)}`, { method: 'POST', body: blob });
}

/** Renders one frame at beat `b` into a 2D canvas (film + plate), after `warm` simulated frames. */
function shot(b: number, warm = 40, t0 = performance.now()) {
  for (let k = 0; k < warm; k++) step(t0 + k * 16.7, 1 / 60, b);
  const out = document.createElement('canvas');
  out.width = stage.W;
  out.height = stage.H;
  const o = out.getContext('2d')!;
  o.drawImage(canvas, 0, 0);
  o.drawImage(plate, 0, 0);
  return out;
}

function rotular(o: CanvasRenderingContext2D, x: number, y: number, text: string, scale: number) {
  o.save();
  o.font = `500 ${Math.round(13 * scale)}px "Geist Mono Variable"`;
  o.letterSpacing = `${1.2 * scale}px`;
  const w = o.measureText(text).width;
  o.fillStyle = 'rgba(0,0,0,0.62)';
  o.fillRect(x + 8 * scale, y + 8 * scale, w + 16 * scale, 24 * scale);
  o.fillStyle = '#ece7db';
  o.textBaseline = 'middle';
  o.fillText(text, x + 16 * scale, y + 20.5 * scale);
  o.restore();
}

const api = {
  stage,
  get inst() {
    return inst;
  },
  get length() {
    return inst?.tl.length ?? 0;
  },
  seek(b: number | null) {
    frozen = b;
  },
  /** The whole work: mounts its `i`-th stretch (from 0) and says what it is. */
  tramo(i: number) {
    irA(i);
    velo = 0;
    return { ...OBRA[tramo], de: desde(), a: hasta() };
  },
  get tramos() {
    return OBRA.length;
  },
  /** Plays by itself for `seg` seconds without waiting for them (the pane may be hidden): where it ends. */
  reproducir(seg: number) {
    autoplay = true;
    const t0 = performance.now();
    for (let k = 0; k < seg * 30; k++) {
      avanzar(1 / 30);
      step(t0 + k * 33.3, 1 / 30, p);
    }
    autoplay = false;
    return { tramo: tramo + 1, p: +p.toFixed(2), velo: +velo.toFixed(2) };
  },
  /** The whole work on one sheet: `n` frames of each stretch, in order, one row per stretch. */
  async obra(path: string, n = 4, tw = 400) {
    await document.fonts.ready;
    const was = frozen;
    const th = Math.round((tw * stage.H) / stage.W);
    const out = document.createElement('canvas');
    out.width = n * tw;
    out.height = OBRA.length * th;
    const o = out.getContext('2d')!;
    const info: [string, number][] = [];
    for (let i = 0; i < OBRA.length; i++) {
      irA(i);
      velo = 0;
      await inst?.listo;
      const de = desde();
      const a = hasta();
      info.push([OBRA[i].n, +(a - de).toFixed(1)]);
      for (let k = 0; k < n; k++) {
        const b = de + ((k + 0.6) / n) * (a - de);
        frozen = b;
        o.drawImage(shot(b, 40), k * tw, i * th, tw, th);
      }
      rotular(o, 0, i * th, `${OBRA[i].n} · ${OBRA[i].nombre}`, tw / 520);
    }
    frozen = was;
    await save(path, out, 0.85);
    return info;
  },
  /**
   * A contact sheet at these beats. `t0` fixes the ambient time of each shot (ms), so a heartbeat
   * can be caught on its stroke: pass an array the same length as `beats`, or nothing.
   */
  async hoja(path: string, beats: number[], cols = 4, tw = 640, t0?: number[]) {
    await inst?.listo;
    await document.fonts.ready;
    const was = frozen;
    const th = Math.round((tw * stage.H) / stage.W);
    const out = document.createElement('canvas');
    out.width = cols * tw;
    out.height = Math.ceil(beats.length / cols) * th;
    const o = out.getContext('2d')!;
    for (const [k, b] of beats.entries()) {
      frozen = b;
      const x = (k % cols) * tw;
      const y = Math.floor(k / cols) * th;
      o.drawImage(shot(b, 40, t0?.[k]), x, y, tw, th);
      rotular(o, x, y, b.toFixed(2), tw / 640);
    }
    frozen = was;
    await save(path, out, 0.88);
    return [out.width, out.height];
  },
  /** Runs `n` frames at beat `b` without drawing them out: for studies that compute themselves live. */
  correr(b: number, n: number) {
    const t0 = performance.now();
    for (let k = 0; k < n; k++) step(t0 + k * 16.7, 1 / 60, b);
  },
  /** One full-size frame. */
  async cuadro(path: string, b: number, t0?: number) {
    await document.fonts.ready;
    const was = frozen;
    frozen = b;
    const out = shot(b, 40, t0);
    frozen = was;
    await save(path, out, 0.92);
    return [out.width, out.height];
  },
};
if (params.has('debug')) Object.assign(window, { estudio: api });
