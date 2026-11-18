import * as THREE from 'three';
import { Timeline, EASE, type Ease } from './timeline';
import { enfocar, materia, materiaBuilder, type Nube } from '../src/engine/materia';
import { smoothstep } from '../src/engine/math';
import { FONT, ink, type Cuenta, type Rotulo } from './placa';
import { TIBIO, V } from './comun';
import type { Escena, Frame, Instancia } from './tipos';
import mapaUrl from './texturas/2k_earth_daymap.jpg';
import nubesUrl from './texturas/2k_earth_clouds.jpg';

/**
 * Study · «Un planeta azul» (GUION-v2, moments 34–36). Phase 0.
 *
 * The second study that is not after wonder. The far, cold future: no stars left. Spheres wait in
 * the dark like seeds, drawn dotted (the series' line for what is speculative). Each beats once
 * every thousand years. The camera goes into one: inside, small and in full colour, a copy of the
 * Earth. Nobody asked them to keep it. Then the camera leaves, and the blue point stays inside
 * its sphere, among the others.
 *
 * The colour rule from the other side again: the only colour in the act is the living planet.
 */

const RH = 10; // the sphere we enter
const RT = 1.5; // the Earth inside it
const TIERRA_N = 300_000;
const NUBES_N = 110_000;

function esferas() {
  const b = materiaBuilder(502);
  const r = b.r;
  const c = new THREE.Color(TIBIO.r, TIBIO.g, TIBIO.b);
  // The one we enter: dashed parallels and meridians, so it reads as a sphere and not as a cloud.
  const paso = 0.034;
  for (let lat = -75; lat <= 75; lat += 15) {
    const y = RH * Math.sin((lat * Math.PI) / 180);
    const rad = RH * Math.cos((lat * Math.PI) / 180);
    const n = Math.round((2 * Math.PI * rad) / paso);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      if ((a * 30) / Math.PI - Math.floor((a * 30) / Math.PI) > 0.55) continue;
      b.push(Math.cos(a) * rad, y, Math.sin(a) * rad, c, 0.034, 0.55, { kind: 0 });
    }
  }
  for (let m = 0; m < 12; m++) {
    const lon = (m / 12) * Math.PI * 2;
    const n = Math.round((Math.PI * RH) / paso);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      if (t * 30 - Math.floor(t * 30) > 0.55) continue;
      const la = (t - 0.5) * Math.PI * 0.92;
      b.push(Math.cos(la) * Math.cos(lon) * RH, Math.sin(la) * RH, Math.cos(la) * Math.sin(lon) * RH, c, 0.034, 0.4, { kind: 0 });
    }
  }
  // The others: three dashed circles each, far apart. Each has its own moment to beat.
  const e1 = V();
  const e2 = V();
  const e3 = V();
  for (let k = 0; k < 240; k++) {
    const d = 95 * Math.pow(13, r());
    const [dx, dy, dz] = b.onSphere();
    const cx = dx * d;
    const cy = dy * d * 0.6;
    const cz = dz * d;
    // Keep the camera's way in clear.
    if (cz > -20 && Math.hypot(cx, cy) < 34) continue;
    const R = 5 + 7 * r();
    const fase = r();
    const size = Math.max(0.05, d * 0.0021);
    // An equator and two meridians on one axis: a small globe, like the one we enter.
    const [ax, ay, az] = b.onSphere();
    e1.set(ax, ay, az);
    e2.set(az, ax, -ay).cross(e1).normalize();
    e3.crossVectors(e1, e2);
    for (const [p, q] of [[e2, e3], [e1, e2], [e1, e3]]) {
      for (let i = 0; i < 96; i++) {
        if (i % 4 > 1) continue;
        const a = (i / 96) * Math.PI * 2;
        const ca = Math.cos(a) * R;
        const sa = Math.sin(a) * R;
        b.push(cx + p.x * ca + q.x * sa, cy + p.y * ca + q.y * sa, cz + p.z * ca + q.z * sa, c, size, 0.5, { kind: 1, delay: fase });
      }
    }
  }
  return b.data();
}

const ESFERAS_MOVE = /* glsl */ `
  if (aKind < 0.5) {
    // One beat: a wave of light crosses the sphere from pole to pole.
    float yy = p.y / ${RH.toFixed(1)} * 0.5 + 0.5;
    float fl = exp(-pow((yy - uPulso) / 0.1, 2.0));
    em *= 0.5 + 4.5 * fl;
  } else {
    float fl = exp(-pow((uOnda - aDelay) / 0.01, 2.0));
    em *= 0.55 + 6.0 * fl;
    fuente = 0.65;
  }
`;

function pixeles(url: string) {
  return new Promise<{ d: Uint8ClampedArray; w: number; h: number }>((res, rej) => {
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

/** The Earth as points: the sea is blue light, what is alive on land is the brightest thing. */
async function tierra() {
  const [mapa, nubes] = await Promise.all([pixeles(mapaUrl), pixeles(nubesUrl)]);
  const b = materiaBuilder(503);
  const r = b.r;
  const c = new THREE.Color();
  const en = (m: typeof mapa, x: number, y: number, z: number) => {
    const u = Math.atan2(-z, x) / (2 * Math.PI) + 0.5;
    const v = 0.5 - Math.asin(y) / Math.PI;
    const i = (Math.min(m.h - 1, Math.floor(v * m.h)) * m.w + Math.min(m.w - 1, Math.floor(u * m.w))) * 4;
    return [m.d[i] / 255, m.d[i + 1] / 255, m.d[i + 2] / 255] as const;
  };
  const GA = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < TIERRA_N; i++) {
    const y = 1 - (2 * (i + 0.5)) / TIERRA_N;
    const s = Math.sqrt(1 - y * y);
    const x = Math.cos(GA * i) * s;
    const z = Math.sin(GA * i) * s;
    const [pr, pg, pb] = en(mapa, x, y, z);
    const suma = pr + pg + pb;
    let luz = 1;
    if (Math.min(pr, pg, pb) > 0.62) {
      c.setRGB(1.0, 0.93, 0.86);
      luz = 0.55;
    } else if (pb > pr * 1.25 && pb >= pg * 0.9) {
      c.setRGB(0.05 + 0.5 * pg, 0.22 + 0.9 * pg, 1.0);
      luz = 0.26 + 0.4 * pb;
    } else if (pg >= pr * 0.97) {
      c.setRGB(0.25 + pr, 0.75 + 1.2 * pg, 0.2 + 0.6 * pb);
      luz = 0.6 + 0.9 * suma;
    } else {
      c.setRGB(1.0, 0.72, 0.42);
      luz = 0.22 + 0.4 * suma;
    }
    b.push(x * RT, y * RT, z * RT, c, 0.0125, luz, { kind: 0 });
  }
  c.setRGB(1, 0.97, 0.93);
  for (let i = 0; i < NUBES_N; i++) {
    const [x, y, z] = b.onSphere();
    const n = en(nubes, x, y, z)[0];
    if (n < 0.4 + 0.3 * r()) continue;
    b.push(x * RT * 1.012, y * RT * 1.012, z * RT * 1.012, c, 0.013, 0.16 + 0.22 * n, { kind: 1 });
  }
  return b.data();
}

const TIERRA_MOVE = /* glsl */ `
  float ga = uGiro * (aKind > 0.5 ? 1.12 : 1.0);
  float cg = cos(ga), sg = sin(ga);
  p = vec3(cg * p.x + sg * p.z, p.y, -sg * p.x + cg * p.z);
  // The axis leans, as it does.
  p = vec3(0.917 * p.x - 0.398 * p.y, 0.398 * p.x + 0.917 * p.y, p.z);
  vec3 n = normalize(p);
  float dia = smoothstep(-0.3, 0.75, dot(n, uSol));
  em *= 0.07 + 0.93 * dia;
  // A thin blue edge: the air.
  vec3 vp = (modelViewMatrix * vec4(p, 1.0)).xyz;
  float limbo = pow(1.0 - max(dot(normalize(normalMatrix * n), normalize(-vp)), 0.0), 3.0);
  em += vec3(0.1, 0.34, 1.0) * limbo * 0.3 * (0.15 + 0.85 * dia);
`;

export const azul: Escena = {
  id: 'azul',
  nombre: 'Un planeta azul',
  estilos: [{ key: '1', nombre: 'Los que esperan · Un planeta azul', nota: 'El futuro lejano y frío, sin estrellas. Esferas punteadas que esperan como semillas y laten una vez cada mil años. Adentro de una, lo único con color: una copia de la Tierra.' }],
  montar(stage): Instancia {
    const { root, camera } = stage;

    const U = { uPulso: { value: -1 }, uOnda: { value: 0 } };
    const seres = materia(esferas(), { pre: /* glsl */ `uniform float uPulso, uOnda;`, move: ESFERAS_MOVE, uniforms: U });
    root.add(seres.points);

    const UT = { uGiro: { value: 0 }, uSol: { value: V(0.75, 0.35, 0.56).normalize() } };
    let planeta: Nube | null = null;
    let vivo = true;
    const listo = tierra().then((data) => {
      if (!vivo) return;
      planeta = materia(data, { pre: /* glsl */ `uniform float uGiro; uniform vec3 uSol;`, move: TIERRA_MOVE, uniforms: UT });
      root.add(planeta.points);
    });

    const tl = new Timeline({ tierra: 0, pulso: -0.3, luz: 0 });
    const cam = (dur: number, p: THREE.Vector3, t: THREE.Vector3, e: Ease | null = null) => tl.to(dur, { px: p.x, py: p.y, pz: p.z, tx: t.x, ty: t.y, tz: t.z }, e);
    const O = V(0, 0, 0);
    tl.set({ px: 34, py: 14, pz: 230, tx: 0, ty: 0, tz: 0 });
    tl.caption(7, 'Quizá esperan', 'Quizá algunos esperan.');
    tl.with(2, { luz: 1 });
    cam(7, V(15, 5, 64), O);
    tl.caption(7, 'Mil años', 'Laten una vez cada mil años.');
    cam(2, V(10, 3.6, 40), O);
    tl.with(4, { pulso: 1.3 }, EASE.linear);
    cam(5, V(7, 2.6, 27), O);
    tl.caption(9, 'Un planeta azul', 'Guardan una copia de un planeta azul.');
    tl.with(0.001, { pulso: -0.3 }, EASE.linear);
    cam(2.5, V(3.6, 1.4, 12), V(-0.3, 0, 0));
    tl.with(2.5, { tierra: 1 });
    cam(3, V(2.0, 0.8, 6.6), V(-1.0, -0.1, 0));
    // Quiet: it turns, and nothing else happens.
    cam(3.5, V(1.2, 0.7, 6.4), V(-1.0, -0.1, 0));
    tl.caption(9, 'Nadie se lo pidió', 'Nadie les pidió que la guardaran.');
    cam(3, V(-1, 1.2, 10.5), V(-0.4, 0, 0));
    cam(6, V(-22, 9, 80), O);
    tl.wait(-4);
    tl.with(4, { pulso: 1.3 }, EASE.linear);
    tl.wait(4);

    return {
      tl,
      listo,
      escalera: false,
      cuenta(): Cuenta | null {
        return null;
      },
      rotulo(p): Rotulo | null {
        const cp = tl.captionAt(p);
        return cp ? { capitulo: 'VI · Los que esperan', name: cp.name, fact: cp.fact } : null;
      },
      update(f: Frame) {
        const g = (k: string) => tl.get(k, f.p);
        camera.near = 0.02;
        camera.far = 5000;
        camera.fov = 40;
        camera.position.set(g('px'), g('py'), g('pz'));
        camera.up.set(0, 1, 0);
        camera.lookAt(g('tx'), g('ty'), g('tz'));
        camera.updateMatrixWorld();
        stage.bloom.strength = 0.28;
        stage.bloom.radius = 0.55;
        stage.bloom.threshold = 0.22;
        const t = g('tierra');
        const luz = g('luz');
        U.uPulso.value = g('pulso');
        U.uOnda.value = f.p / tl.length;
        enfocar(seres, f.focal, f.dpr, f.time);
        seres.u.uMinPx.value = 1.4 * f.dpr;
        seres.u.uMaxPx.value = 5 * f.dpr;
        seres.u.uGain.value = luz * 0.9;
        // The planet hides what is behind it, its own far side included.
        const centro = V(0, 0, 0).applyMatrix4(camera.matrixWorldInverse);
        seres.u.uOcc.value.set(centro.x, centro.y, centro.z, t > 0.02 ? RT * 0.98 : 0);
        if (planeta) {
          enfocar(planeta, f.focal, f.dpr, f.time);
          planeta.u.uMinPx.value = 1.3 * f.dpr;
          planeta.u.uMaxPx.value = 7 * f.dpr;
          planeta.u.uGain.value = t * luz * 0.6;
          planeta.u.uOcc.value.set(centro.x, centro.y, centro.z, RT * 0.985);
          UT.uGiro.value = 0.6 + f.time * 0.035 + f.p * 0.05;
        }
      },
      placa(g2, f) {
        // The clock: how long one of their heartbeats lasts.
        const a = tl.get('luz', f.p) * smoothstep(5.5, 7.5, f.p);
        const u = f.u;
        const x = 44 * u;
        g2.save();
        g2.textBaseline = 'alphabetic';
        g2.shadowColor = 'rgba(0,0,0,0.85)';
        g2.shadowBlur = 12 * u;
        g2.globalAlpha = a;
        g2.font = FONT.serif(66 * u);
        g2.fillStyle = ink();
        g2.fillText('1 000 años', x, f.H - 86 * u);
        const w = g2.measureText('1 000 años').width;
        g2.font = FONT.serif(26 * u);
        g2.fillStyle = ink(0.6);
        g2.fillText('un latido', x + w + 12 * u, f.H - 88 * u);
        g2.font = FONT.mono(11 * u);
        g2.letterSpacing = `${0.9 * u}px`;
        g2.fillStyle = ink(0.78);
        g2.fillText(tl.get('tierra', f.p) > 0.5 ? 'ADENTRO DE UNA · LO ÚNICO CON COLOR' : 'LOS QUE ESPERAN · PUNTEADO: LO POSIBLE', x, f.H - 52 * u);
        g2.restore();
      },
      dispose() {
        vivo = false;
      },
    };
  },
};
