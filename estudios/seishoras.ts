import * as THREE from 'three';
import { Timeline, EASE } from './timeline';
import { enfocar, materia, materiaBuilder } from '../src/engine/materia';
import { clamp, gauss, smoothstep } from '../src/engine/math';
import { FONT, ink, type Rotulo } from './placa';
import { SEGURO, SERIE, V } from './comun';
import type { Escena, Frame, Instancia } from './tipos';

/**
 * Study for Destino (not for Vida): «La eternidad en seis horas» as the most explosive frame of the
 * outer half (PASADA.md § 6.3), readable without words. One star; out of it, all at once, thousands
 * of threads in every direction; the camera rides one, and galaxies stream past like stars; then
 * it pulls back and the sphere of threads reaches the cosmic web, and every galaxy it touches turns
 * our colour. Only the number, large: six hours.
 *
 * It lives here only because Vida's study page was already running; it touches nothing in Destino.
 */

const HILOS = 1700;
const POR_HILO = 46;
const GALAXIAS = 2200;
const VERDE = SERIE.destino;

export const seishoras: Escena = {
  id: 'seishoras',
  nombre: 'Para Destino: seis horas',
  estilos: [{ key: '1', nombre: 'Borrador', nota: 'Una estrella; de ella salen todos los hilos a la vez; la cámara va en uno; al alejarse, la esfera de hilos toca la red de galaxias y cada galaxia que toca se vuelve verde agua.' }],
  montar(stage): Instancia {
    const root = stage.root;
    const { camera } = stage;
    stage.bloom.strength = 0.85;
    stage.bloom.radius = 0.7;
    stage.bloom.threshold = 0.1;
    stage.finish.uniforms.uVignette.value = 0.65;

    // The cosmic web: galaxies clustered in knots and along threads between them.
    const bg = materiaBuilder(61);
    const r = bg.r;
    const nudos: THREE.Vector3[] = [];
    for (let i = 0; i < 90; i++) {
      const [x, y, z] = bg.onSphere();
      const rad = 10 + 85 * Math.pow(r(), 0.8);
      nudos.push(V(x * rad, y * rad * 0.8, z * rad));
    }
    const col = new THREE.Color();
    for (let i = 0; i < GALAXIAS; i++) {
      let p: THREE.Vector3;
      if (r() < 0.55) {
        const n = nudos[Math.floor(r() * nudos.length)];
        p = n.clone().add(V(gauss(r) * 2.2, gauss(r) * 2.2, gauss(r) * 2.2));
      } else {
        const a = nudos[Math.floor(r() * nudos.length)];
        let b = nudos[0];
        let best = 1e9;
        for (const m of nudos) {
          const d = m.distanceTo(a);
          if (d > 1 && d < best) {
            best = d;
            b = m;
          }
        }
        p = a.clone().lerp(b, r()).add(V(gauss(r) * 1.0, gauss(r) * 1.0, gauss(r) * 1.0));
      }
      // Each galaxy: a small tilted disc of points, warm in the middle.
      const ax = V(gauss(r), gauss(r), gauss(r)).normalize();
      const u1 = V(1, 0, 0).cross(ax).normalize();
      const u2 = ax.clone().cross(u1);
      const tam = 0.25 + 0.35 * r();
      for (let k = 0; k < 12; k++) {
        const t = Math.sqrt(r()) * tam;
        const ang = r() * Math.PI * 2;
        const q = p.clone().addScaledVector(u1, Math.cos(ang) * t).addScaledVector(u2, Math.sin(ang) * t);
        col.setRGB(0.78, 0.82, 1.0).lerp(new THREE.Color(1.0, 0.85, 0.65), k < 3 ? 0.8 : r() * 0.3);
        bg.push(q.x, q.y, q.z, col, 0.15, k < 3 ? 1.3 : 0.65);
      }
    }
    const galaxias = materia(bg.data(), {
      pre: /* glsl */ `uniform float uL; uniform vec3 uVerde; ${SEGURO}`,
      move: /* glsl */ `
        // Reached: once the sphere of threads passes it, the galaxy is ours.
        float rg = length(p);
        float alc = smoothstep(rg + 1.5, rg - 1.5, uL);
        em = mix(em, uVerde * 1.25, alc * 0.85);
      `,
      uniforms: { uL: { value: 0 }, uVerde: { value: VERDE.clone() } },
    });
    galaxias.u.uFog.value = 260;
    root.add(galaxias.points);

    // The threads: a unit direction per thread (position) and how far along it each point is.
    const bh = materiaBuilder(62);
    const frac: number[] = [];
    const DIR0 = V(0.32, 0.12, -0.94).normalize();
    for (let i = 0; i < HILOS; i++) {
      const d = i === 0 ? [DIR0.x, DIR0.y, DIR0.z] : bh.onSphere();
      for (let k = 0; k < POR_HILO; k++) {
        const f = k / (POR_HILO - 1);
        bh.push(d[0], d[1], d[2], VERDE, k === POR_HILO - 1 ? 0.04 : 0.02, 1);
        frac.push(f);
      }
    }
    const hilos = materia(bh.data(), {
      pre: /* glsl */ `attribute float aF; uniform float uL; ${SEGURO}`,
      move: /* glsl */ `
        p = position * (aF * uL);
        // Bright at the head, a faint thread behind it.
        em *= 0.08 + 1.6 * pw(aF, 10.0);
      `,
      uniforms: { uL: { value: 0 } },
      extra: { aF: [new Float32Array(frac), 1] },
    });
    hilos.u.uFuente.value = 0.6;
    root.add(hilos.points);

    // The star they leave from.
    const bs = materiaBuilder(63);
    bs.push(0, 0, 0, new THREE.Color(1.0, 0.92, 0.8), 0.25, 2.2);
    for (let i = 0; i < 400; i++) {
      const [x, y, z] = bs.onSphere();
      const q = 0.18 * Math.cbrt(bs.r());
      bs.push(x * q, y * q, z * q, new THREE.Color(1.0, 0.85, 0.65), 0.03, 0.5);
    }
    const estrella = materia(bs.data());
    estrella.u.uFuente.value = 1;
    root.add(estrella.points);

    const tl = new Timeline();
    tl.set({ L: 0, lejos: 6, monta: 0, todas: 0, cifra: 0, brillo: 1 });
    tl.label('estrella').caption(4.0, 'Una estrella', 'Su luz, toda junta, alcanza para esto.');
    tl.wait(4.0);
    tl.label('salen').caption(7.0, 'La eternidad en seis horas', 'O hacia afuera: con la luz de una estrella, en seis horas salen sondas a todas las galaxias alcanzables.');
    tl.with(1.4, { cifra: 1 });
    tl.to(6.0, { L: 9, lejos: 13 }, EASE.out);
    tl.wait(1.0);
    tl.label('monta').caption(9.0, 'Una de ellas', 'Vamos en una.');
    tl.to(2.4, { monta: 1 }, EASE.inOut);
    tl.to(6.6, { L: 52 }, EASE.linear);
    tl.label('todas').caption(9.0, 'Todas a la vez', 'Y todas las demás, al mismo tiempo.');
    tl.to(3.4, { monta: 0, todas: 1 }, EASE.inOut);
    tl.to(5.6, { L: 74, brillo: 0.7 });
    const MONTA = tl.at('monta');

    const pos = V();
    const mira = V();
    const up = V(0, 1, 0);
    return {
      tl,
      escalera: false,
      cuenta: () => null,
      rotulo(p): Rotulo | null {
        const cp = tl.captionAt(p);
        return cp ? { capitulo: 'VII · El cosmos', name: cp.name, fact: cp.fact } : null;
      },
      placa(g, f) {
        const a = tl.get('cifra', f.p);
        if (a <= 0.01) return;
        g.save();
        g.globalAlpha = a;
        g.textBaseline = 'alphabetic';
        g.shadowColor = 'rgba(0,0,0,0.85)';
        g.shadowBlur = 12 * f.u;
        g.font = FONT.serif(66 * f.u);
        g.fillStyle = ink();
        g.fillText('6 horas', 44 * f.u, f.H - 86 * f.u);
        g.font = FONT.mono(11 * f.u);
        g.letterSpacing = `${0.9 * f.u}px`;
        g.fillStyle = ink(0.78);
        g.fillText('A TODAS LAS GALAXIAS ALCANZABLES', 44 * f.u, f.H - 52 * f.u);
        g.restore();
      },
      update(f: Frame) {
        const p = f.p;
        camera.near = 0.01;
        camera.far = 2000;
        const L = tl.get('L', p);
        const monta = tl.get('monta', p);
        const todas = tl.get('todas', p);
        const lejos = tl.get('lejos', p);
        // Outside: a slow turn round the star. Riding: just behind the head of the first thread.
        // All of them: far back, the whole sphere against the web.
        const ang = 0.35 + p * 0.025;
        const afuera = V(Math.sin(ang) * lejos, lejos * 0.25, Math.cos(ang) * lejos);
        const enHilo = DIR0.clone().multiplyScalar(Math.max(0.5, L - 1.4)).add(V(0, 0.22, 0.12));
        const lejano = V(Math.sin(ang) * 250, 85, Math.cos(ang) * 250);
        pos.copy(afuera).lerp(enHilo, monta).lerp(lejano, todas);
        mira.set(0, 0, 0).lerp(DIR0.clone().multiplyScalar(L + 30), monta).lerp(V(0, 0, 0), todas);
        camera.position.copy(pos);
        camera.up.copy(up);
        camera.lookAt(mira);
        camera.fov = 44 + 18 * monta * (1 - todas);
        enfocar(galaxias, f.focal, f.dpr, f.time);
        galaxias.u.uL.value = L;
        galaxias.u.uGain.value = 1.7;
        enfocar(hilos, f.focal, f.dpr, f.time);
        hilos.u.uL.value = L;
        hilos.u.uGain.value = 1.2 * tl.get('brillo', p) * smoothstep(0, 0.4, L);
        hilos.u.uMaxPx.value = 10 * f.dpr;
        enfocar(estrella, f.focal, f.dpr, f.time);
        estrella.u.uMinPx.value = 6 * f.dpr;
        estrella.u.uGain.value = 1.5 * (1 - 0.6 * clamp((p - MONTA) / 4, 0, 1));
      },
      dispose() {},
    };
  },
};
