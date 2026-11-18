import * as THREE from 'three';
import { Timeline, EASE } from './timeline';
import { enfocar, materia, materiaBuilder, type Nube } from '../src/engine/materia';
import { clamp, gauss, smoothstep } from '../src/engine/math';
import { FONT, ink, type Rotulo } from './placa';
import { SERIE, TU, V } from './comun';
import type { Escena, Frame, Instancia } from './tipos';

/**
 * Study for Abismo (not for Vida): its opening with the whole series (PASADA.md § 6.6). Mente ends
 * on two points; the white one, the voice that told you everything, leaves. Then, in your own
 * voice, written and erased like the thoughts at three in the morning, one line for each earlier
 * work, each with its image in that work's colour: the image shrinks into a point and stays up
 * there, a constellation of everything you saw. Then the question, and the fall begins.
 *
 * It lives here only because Vida's study page was already running; it touches nothing in Abismo.
 */

const FRASES = [
  'Vi que la Tierra cabe en un píxel.',
  'Que de todo el tiempo, me tocó un instante.',
  'Que lo que pienso se apaga conmigo.',
  'Que quizá hay otro yo, leyendo esto.',
  'Que una máquina puede escribirme esto.',
];
const PREGUNTA = '¿Y yo, qué soy en todo esto?';
const COLORES = [SERIE.espacio, SERIE.tiempo, SERIE.destino, SERIE.infinito, SERIE.mente];
/** Where each one stays, up in the dark, once it is a point. */
const ARRIBA = [V(-1.9, 1.35, -1.2), V(-0.95, 1.75, -1.6), V(0.05, 1.5, -1.0), V(1.0, 1.85, -1.8), V(1.95, 1.3, -1.3)];

/** Espacio: the pale blue dot, a speck in a band of scattered sunlight. */
function pixel(): Nube {
  const b = materiaBuilder(81);
  const r = b.r;
  const c = new THREE.Color();
  const a = 1.18;
  for (let i = 0; i < 2600; i++) {
    const t = (r() - 0.5) * 3.2;
    const w = gauss(r) * 0.07 * (1 + Math.abs(t) * 0.3);
    c.copy(SERIE.espacio).lerp(new THREE.Color(1, 0.85, 0.7), r() * 0.5);
    b.push(Math.cos(a) * t - Math.sin(a) * w * 2.2, Math.sin(a) * t + Math.cos(a) * w * 2.2, gauss(r) * 0.05, c, 0.009, 0.5);
  }
  for (let i = 0; i < 300; i++) b.push((r() - 0.5) * 3.4, (r() - 0.5) * 2.2, (r() - 0.5) * 0.5, new THREE.Color(0.9, 0.85, 0.8), 0.005, 0.12);
  // The dot itself.
  b.push(0.05, 0.12, 0, new THREE.Color(0.45, 0.62, 1.0), 0.05, 2.2);
  return materia(b.data());
}

/** Tiempo: the cone of time, narrow at the beginning, and one bright ring: your instant. */
function cono(): Nube {
  const b = materiaBuilder(82);
  const r = b.r;
  for (let i = 0; i < 3200; i++) {
    const y = r();
    const rad = 0.05 + 0.75 * Math.pow(y, 0.7);
    const a = r() * Math.PI * 2;
    const dentro = r() < 0.3 ? Math.sqrt(r()) : 1;
    b.push(Math.cos(a) * rad * dentro, 0.95 - y * 1.9, Math.sin(a) * rad * dentro * 0.4, SERIE.tiempo, 0.006, dentro < 1 ? 0.12 : 0.32);
  }
  const yi = 0.95 - 0.62 * 1.9;
  const ri = 0.05 + 0.75 * Math.pow(0.62, 0.7);
  for (let i = 0; i < 260; i++) {
    const a = (i / 260) * Math.PI * 2;
    b.push(Math.cos(a) * ri, yi, Math.sin(a) * ri * 0.4, new THREE.Color(0.85, 0.92, 1.0), 0.008, 1.0);
  }
  return materia(b.data());
}

/** Destino: a thought, and the wave it sends out, fading as it widens. */
function onda(): Nube {
  const b = materiaBuilder(83);
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < 420; i++) {
      const a = (i / 420) * Math.PI * 2;
      const rad = 0.35 + k * 0.38;
      b.push(Math.cos(a) * rad, Math.sin(a) * rad, 0, SERIE.destino, 0.006, 0.7 / (1 + k * 1.3));
    }
  }
  b.push(0, 0, 0, SERIE.destino, 0.04, 1.4);
  return materia(b.data());
}

/** Infinito: your double, far away: two bubbles, the same, each with its teal point. */
function doble(): Nube {
  const b = materiaBuilder(84);
  const r = b.r;
  for (const cx of [-0.85, 0.85]) {
    for (let i = 0; i < 900; i++) {
      const [x, y, z] = b.onSphere();
      b.push(cx + x * 0.5, y * 0.5, z * 0.5, SERIE.infinito, 0.006, 0.32);
    }
    for (let i = 0; i < 260; i++) {
      const [x, y, z] = b.onSphere();
      const q = 0.42 * Math.cbrt(r());
      b.push(cx + x * q, y * q, z * q, new THREE.Color(0.8, 0.82, 1.0), 0.005, 0.15);
    }
    b.push(cx, 0, 0, TU, 0.03, 1.4);
  }
  return materia(b.data());
}

/** Mente: words as stars, and the golden thread that writes a sentence through them. */
function hilo(): Nube {
  const b = materiaBuilder(85);
  const r = b.r;
  for (let i = 0; i < 900; i++) b.push((r() - 0.5) * 2.6, (r() - 0.5) * 1.6, (r() - 0.5) * 0.8, SERIE.mente, 0.006, 0.2 + 0.25 * r());
  const nudos: THREE.Vector3[] = [];
  for (let i = 0; i < 9; i++) nudos.push(V(-1.1 + i * 0.275, Math.sin(i * 1.7) * 0.35 + gauss(r) * 0.08, gauss(r) * 0.15));
  for (let i = 0; i < nudos.length - 1; i++) {
    for (let k = 0; k < 90; k++) {
      const t = k / 90;
      const p = nudos[i].clone().lerp(nudos[i + 1], t);
      b.push(p.x, p.y, p.z, SERIE.mente, 0.006, 0.9);
    }
    b.push(nudos[i].x, nudos[i].y, nudos[i].z, new THREE.Color(1, 0.92, 0.75), 0.02, 1.2);
  }
  return materia(b.data());
}

/** A thought, centred: written letter by letter (k 0 → 1), held, then erased (1.4 → 2). */
function pensamiento(g: CanvasRenderingContext2D, u: number, x: number, y: number, s: string, k: number, px = 32) {
  if (k <= 0 || k >= 2) return;
  const n = k < 1 ? Math.ceil(s.length * smoothstep(0, 1, k)) : Math.ceil(s.length * (1 - smoothstep(1.4, 2, k)));
  if (n <= 0) return;
  g.save();
  g.font = FONT.italic(px * u);
  g.textBaseline = 'middle';
  const full = g.measureText(s).width;
  const part = s.slice(0, n);
  g.shadowColor = 'rgba(0,0,0,0.9)';
  g.shadowBlur = 14 * u;
  g.fillStyle = ink(0.88);
  g.fillText(part, x - full / 2, y);
  if (k < 1 || k > 1.4) {
    const w = g.measureText(part).width;
    g.fillStyle = ink(0.7);
    g.fillRect(x - full / 2 + w + 3 * u, y - px * u * 0.42, Math.max(1, 1.3 * u), px * u * 0.84);
  }
  g.restore();
}

export const montaje: Escena = {
  id: 'montaje',
  nombre: 'Para Abismo: la serie entera',
  estilos: [
    { key: '1', nombre: 'Cinco estrellas', nota: 'Recomendada: el punto blanco se va; en la caída, cinco puntos de color, uno por obra anterior, pasan junto a la cámara sin rótulos y quedan arriba. Después, sola, la pregunta.' },
    { key: '2', nombre: 'Con texto', nota: 'Desaconsejada por la revisión (parece diapositivas y arma una sola causa): cinco pensamientos, uno por obra, cada uno con su imagen.' },
  ],
  montar(stage, estilo): Instancia {
    if (estilo === 0) return estrellas(stage);
    const root = stage.root;
    const { camera } = stage;
    stage.bloom.strength = 0.75;
    stage.bloom.radius = 0.7;
    stage.finish.uniforms.uVignette.value = 0.7;

    const cielo = new THREE.Group();
    root.add(cielo);
    const iconos = [pixel(), cono(), onda(), doble(), hilo()];
    const grupos = iconos.map((n) => {
      const g = new THREE.Group();
      g.add(n.points);
      cielo.add(g);
      return g;
    });
    // What each one becomes up there: a single point of its colour.
    const puntos = COLORES.map((c, i) => {
      const b = materiaBuilder(90 + i);
      b.push(0, 0, 0, c, 0.035, 1);
      const n = materia(b.data());
      n.u.uFuente.value = 1;
      cielo.add(n.points);
      return n;
    });

    const by = materiaBuilder(96);
    by.push(0, 0, 0, TU, 0.035, 1);
    const yo = materia(by.data());
    yo.u.uFuente.value = 1;
    root.add(yo.points);
    const bb = materiaBuilder(97);
    bb.push(0, 0, 0, new THREE.Color(1, 1, 1), 0.035, 1);
    const blanco = materia(bb.data());
    blanco.u.uFuente.value = 1;
    root.add(blanco.points);

    const tl = new Timeline();
    const vals: Record<string, number> = { ida: 0, pre: 0, caida: 0 };
    for (let i = 0; i < 5; i++) {
      vals[`v${i}`] = 0;
      vals[`f${i}`] = 0;
    }
    tl.set(vals);
    tl.label('dos').caption(5.0, 'Dos luces', 'La última vez que miraste, eran dos.');
    tl.wait(1.4);
    tl.to(3.6, { ida: 1 }, EASE.inOut);
    for (let i = 0; i < 5; i++) {
      tl.label(`f${i}`).caption(5.2, 'Todo lo que viste', '');
      tl.with(1.4, { [`v${i}`]: 1 });
      tl.with(3.4, { [`f${i}`]: 1.4 }, (t) => t);
      tl.wait(3.4);
      tl.with(1.8, { [`v${i}`]: 2, [`f${i}`]: 2 }, EASE.inOut);
      tl.wait(1.8);
    }
    tl.label('pregunta').caption(8.0, '¿Y yo?', '');
    tl.with(4.0, { pre: 1.4 }, (t) => t);
    tl.wait(4.0);
    tl.to(4.0, { caida: 1, pre: 2 }, EASE.inOut);
    const P = (i: number) => tl.at(`f${i}`);

    return {
      tl,
      escalera: false,
      cuenta: () => null,
      rotulo(p): Rotulo | null {
        const cp = tl.captionAt(p);
        return cp ? { capitulo: 'Apertura · Después de lo inmenso', name: cp.name, fact: cp.fact } : null;
      },
      placa(g, f) {
        for (let i = 0; i < 5; i++) pensamiento(g, f.u, f.W / 2, f.H * 0.8, FRASES[i], tl.get(`f${i}`, f.p));
        pensamiento(g, f.u, f.W / 2, f.H * 0.8, PREGUNTA, tl.get('pre', f.p), 36);
        // A faint index under the line: which work it is.
        for (let i = 0; i < 5; i++) {
          const k = tl.get(`f${i}`, f.p);
          if (k <= 0 || k >= 1.9) continue;
          g.save();
          g.globalAlpha = Math.min(1, k * 2) * (1 - smoothstep(1.4, 1.9, k)) * 0.55;
          g.font = FONT.mono(10 * f.u);
          g.letterSpacing = `${2 * f.u}px`;
          g.textAlign = 'center';
          g.fillStyle = `#${COLORES[i].getHexString()}`;
          g.fillText(['ESPACIO', 'TIEMPO', 'DESTINO', 'INFINITO', 'MENTE'][i], f.W / 2, f.H * 0.8 + 38 * f.u);
          g.restore();
        }
      },
      update(f: Frame) {
        const p = f.p;
        camera.near = 0.01;
        camera.far = 200;
        camera.fov = 40;
        const caida = tl.get('caida', p);
        camera.position.set(0, -caida * 1.2, 4.2);
        camera.up.set(0, 1, 0);
        camera.lookAt(0, 0.35 - caida * 0.6, 0);

        // The two points of Mente's end; the white one leaves, far and up, until it is gone.
        const ida = tl.get('ida', p);
        yo.points.position.set(-0.16 * (1 - ida), -0.9 - caida * 1.15, 0.6);
        blanco.points.position.set(0.16 + ida * 3.5, -0.9 + ida * 2.6, 0.6 - ida * 26);
        enfocar(yo, f.focal, f.dpr, f.time);
        yo.u.uMinPx.value = 4.5 * f.dpr;
        yo.u.uGain.value = 2.2;
        enfocar(blanco, f.focal, f.dpr, f.time);
        blanco.u.uMinPx.value = 4.5 * f.dpr * (1 - 0.6 * ida);
        blanco.u.uGain.value = 2.2 * (1 - smoothstep(0.55, 1, ida));

        // Each work: it comes up out of the dark in the middle (v 0 → 1), stays while its line is
        // written, then shrinks into a point and goes to its place up there (1 → 2).
        for (let i = 0; i < 5; i++) {
          const v = tl.get(`v${i}`, p);
          const g = grupos[i];
          const n = iconos[i];
          const sube = clamp(v - 1, 0, 1);
          g.visible = v > 0.001 && v < 1.999;
          const esc = (0.55 + 0.45 * smoothstep(0, 1, v)) * (1 - 0.985 * sube);
          g.scale.setScalar(esc);
          g.position.copy(V(0, 0.4, -0.4)).lerp(ARRIBA[i], sube);
          g.rotation.set(0, (p - P(i)) * 0.06, 0);
          enfocar(n, f.focal, f.dpr, f.time);
          n.u.uGain.value = (i === 0 ? 1.8 : 1.3) * smoothstep(0, 1, v) * (1 - 0.6 * sube);
          if (i === 2) {
            // The wave widens and thins while the line is written.
            const k = clamp(tl.get(`f${i}`, p), 0, 1.4);
            g.scale.setScalar(esc * (0.7 + 0.5 * k));
          }
          const pt = puntos[i];
          pt.points.position.copy(ARRIBA[i]);
          enfocar(pt, f.focal, f.dpr, f.time);
          pt.u.uMinPx.value = 3.2 * f.dpr;
          pt.u.uGain.value = 1.6 * smoothstep(0.6, 1, sube) * (v >= 1.999 ? 1 : 1);
          // Up there they recede as you begin to fall.
          pt.u.uGain.value *= 1 - 0.55 * caida;
        }
        cielo.position.y = caida * 0.8;
      },
      dispose() {},
    };
  },
};


/** Way 1, the recommended one: no words until the question; five stars of colour on the way down. */
function estrellas(stage: Parameters<Escena['montar']>[0]): Instancia {
  const root = stage.root;
  const { camera } = stage;
  stage.bloom.strength = 0.8;
  stage.bloom.radius = 0.7;
  stage.finish.uniforms.uVignette.value = 0.72;

  // Dust that falls past you, so the fall reads; faint and white.
  const bp = materiaBuilder(98);
  for (let i = 0; i < 3200; i++) bp.push((bp.r() - 0.5) * 9, 3 - bp.r() * 22, -0.5 - bp.r() * 7, new THREE.Color(0.8, 0.84, 0.95), 0.006, 0.18 + 0.2 * bp.r());
  const polvo = materia(bp.data());
  root.add(polvo.points);

  // One star per earlier work, placed along the way down; you pass them, and they stay above.
  const EN = [V(-0.9, -2.2, -2.2), V(0.75, -4.4, -2.6), V(-0.35, -6.6, -1.9), V(1.05, -8.8, -2.9), V(-0.95, -11.0, -2.4)];
  const stars = COLORES.map((c, i) => {
    const b = materiaBuilder(110 + i);
    b.push(0, 0, 0, c, 0.05, 1.6);
    for (let k = 0; k < 40; k++) {
      const [x, y, z] = b.onSphere();
      const q = 0.05 * Math.cbrt(b.r());
      b.push(x * q, y * q, z * q, c, 0.01, 0.5);
    }
    const n = materia(b.data());
    n.u.uFuente.value = 1;
    n.points.position.copy(EN[i]);
    root.add(n.points);
    return n;
  });

  const by = materiaBuilder(96);
  by.push(0, 0, 0, TU, 0.035, 1);
  const yo = materia(by.data());
  yo.u.uFuente.value = 1;
  root.add(yo.points);
  const bb = materiaBuilder(97);
  bb.push(0, 0, 0, new THREE.Color(1, 1, 1), 0.035, 1);
  const blanco = materia(bb.data());
  blanco.u.uFuente.value = 1;
  root.add(blanco.points);

  const tl = new Timeline();
  tl.set({ ida: 0, y: 0, mira: 0, pre: 0 });
  tl.label('dos').caption(5.0, 'Dos luces', 'La última vez que miraste, eran dos.');
  tl.wait(1.4);
  tl.to(3.6, { ida: 1 }, EASE.inOut);
  tl.label('cae').caption(14.0, 'Todo lo que viste', '');
  tl.to(12.0, { y: -12.5 }, EASE.sine);
  tl.to(2.0, { mira: 1 }, EASE.inOut);
  tl.label('pregunta').caption(8.0, '¿Y yo?', '');
  tl.with(4.0, { pre: 1.4 }, (t) => t);
  tl.to(8.0, { y: -14.5, mira: 0.6 });

  return {
    tl,
    escalera: false,
    cuenta: () => null,
    rotulo(p): Rotulo | null {
      const cp = tl.captionAt(p);
      return cp ? { capitulo: 'Apertura · Después de lo inmenso', name: cp.name, fact: cp.fact } : null;
    },
    placa(g, f) {
      pensamiento(g, f.u, f.W / 2, f.H * 0.8, PREGUNTA, tl.get('pre', f.p), 36);
    },
    update(f: Frame) {
      const p = f.p;
      camera.near = 0.01;
      camera.far = 200;
      camera.fov = 44;
      const y = tl.get('y', p);
      const mira = tl.get('mira', p);
      camera.position.set(0, y, 3.4);
      camera.up.set(0, 1, 0);
      // Falling, it looks a little down; at the end it looks back up at what it passed.
      camera.lookAt(0, y - 0.9 + mira * 3.2, 0);
      const ida = tl.get('ida', p);
      yo.points.position.set(-0.16 * (1 - ida), y - 0.85, 0.9);
      blanco.points.position.set(0.16 + ida * 3.5, -0.85 + ida * 2.6, 0.9 - ida * 26);
      enfocar(yo, f.focal, f.dpr, f.time);
      yo.u.uMinPx.value = 4.5 * f.dpr;
      yo.u.uGain.value = 2.2;
      enfocar(blanco, f.focal, f.dpr, f.time);
      blanco.u.uMinPx.value = 4.5 * f.dpr * (1 - 0.6 * ida);
      blanco.u.uGain.value = 2.2 * (1 - smoothstep(0.55, 1, ida));
      enfocar(polvo, f.focal, f.dpr, f.time);
      polvo.u.uGain.value = 0.9 * smoothstep(0.4, 1, ida);
      for (const n of stars) {
        enfocar(n, f.focal, f.dpr, f.time);
        n.u.uMinPx.value = 3.4 * f.dpr;
        n.u.uGain.value = 1.8 * smoothstep(0.5, 1, ida);
      }
    },
    dispose() {},
  };
}
