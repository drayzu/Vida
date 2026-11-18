import { Timeline, EASE } from './timeline';
import { enfocar, materia } from '../src/engine/materia';
import { clamp, smoothstep } from '../src/engine/math';
import { grupo, type Cuenta, type Rotulo } from './placa';
import { SEGURO, V } from './comun';
import type { Escena, Frame, Instancia } from './tipos';
import { camara, reloj } from './hoy';
import { GAL, galaxia as estrellasDe, red } from './cosmos';

/**
 * Study · «Otro tiempo · la grande» (GUION-vienen, moment 19, second half).
 *
 * A mind the size of a galaxy: their network, white, strung between the stars. Nothing goes faster
 * than light, so one thought takes a hundred thousand years to cross it. The thought starts at
 * the edge and runs along the network like an impulse along a nerve; at 4 500 years (from the
 * pyramids to today) it has barely left. Then it crosses everything. The galaxy itself does not
 * turn: in a hundred thousand years it turns less than a sixth of a degree.
 *
 * Unit: one light-year.
 */

const POR_ANO = 66 * 60 * 24 * 365.25;

const RED_PRE = /* glsl */ `
  attribute float aD;
  uniform float uFrente, uAncho, uBase;
  ${SEGURO}
`;
const RED_MOVE = /* glsl */ `
  float dd = uFrente - aD;
  float onda = exp(-dd * dd / (uAncho * uAncho));
  float estela = step(0.0, dd) * exp(-dd / (uAncho * 7.0));
  em *= uBase * (1.0 - 0.5 * step(0.0, -dd)) + 4.0 * onda + 0.14 * estela;
  fuente = 1.0;
`;

const GAL_MOVE = /* glsl */ `
  fuente = aKind > ${GAL.POLVO - 0.5} ? 0.0 : 1.0;
  if (aKind < ${GAL.BULBO + 0.5}) em *= 0.55;
`;

export const galaxia: Escena = {
  id: 'galaxia',
  nombre: 'Un pensamiento',
  estilos: [{ key: '1', nombre: 'Otro tiempo · la grande', nota: 'Una mente del tamaño de una galaxia: su red blanca tendida entre las estrellas. Un pensamiento sale del borde y corre por la red como un impulso por un nervio. A los 4 500 años (de las pirámides a hoy) casi no ha salido. Tarda cien mil en cruzarla.' }],
  montar(stage): Instancia {
    const { root, camera } = stage;

    const est = materia(estrellasDe(1901, 240_000), { move: GAL_MOVE });
    const R = red(1902, 3600, 50_000, 70);
    const UR = { uFrente: { value: -1e4 }, uAncho: { value: 400 }, uBase: { value: 0.1 } };
    const net = materia(R.data, { pre: RED_PRE, move: RED_MOVE, uniforms: UR, extra: { aD: [R.aD, 1] } });
    for (const n of [est, net]) root.add(n.points);
    const F = V(...R.fuente);

    const tl = new Timeline({ luz: 0, red: 0, frente: 0, k: 1 });
    const billones = ((R.lejos * 1.04 * POR_ANO) / 1e12).toFixed(1).replace('.', ',');
    tl.set({ ld: 5.0, az: 1.35, el: 0.3 });
    tl.caption(9, 'Otra, inmensa', 'Otra quizá crezca hasta ocupar una galaxia entera: miles de millones de estrellas unidas por hilos suyos.');
    tl.with(2, { luz: 1 });
    tl.wait(1.5);
    tl.with(6, { red: 1 });
    tl.to(7.5, { ld: 4.95, el: 0.62, az: 0.75 });
    tl.label('pensamiento');
    tl.caption(9, 'Un pensamiento', 'Nada viaja más rápido que la luz. Un solo pensamiento suyo tardaría más de cien mil años en cruzarla.');
    tl.to(9, { ld: 4.05, k: 0.04, el: 0.62, az: 0.95, frente: 4500 }, EASE.inOut);
    tl.label('piramides');
    tl.caption(8, 'Las pirámides', 'Desde que se hicieron las pirámides hasta hoy, ese pensamiento apenas habría empezado.');
    tl.to(8, { ld: 3.95, az: 1.25, el: 0.55 });
    tl.label('cruza');
    tl.caption(12, 'Cien mil años', `Más de cien mil años: unos ${billones} billones de latidos tuyos.`);
    tl.to(12, { ld: 5.1, k: 1, el: 1.02, az: 0.1, frente: R.lejos * 1.04 }, EASE.inOut);
    tl.label('cabe');
    tl.caption(8, 'Una idea', 'Para ella, toda la historia humana cabe en el comienzo de una idea.');
    tl.to(8, { az: -0.25, el: 0.9, ld: 5.14 });

    const T = V();
    return {
      tl,
      escalera: false,
      cuenta(): Cuenta | null {
        return null;
      },
      rotulo(p): Rotulo | null {
        const cp = tl.captionAt(p);
        return cp ? { capitulo: 'III · Cómo vivirían', name: cp.name, fact: cp.fact } : null;
      },
      update(f: Frame) {
        const g = (k: string) => tl.get(k, f.p);
        const D = Math.pow(10, g('ld'));
        T.copy(F).lerp(V(0, 0, 0), g('k'));
        camara(camera, T, D, g('az'), g('el'));
        stage.bloom.strength = 0.6;
        stage.bloom.radius = 0.6;
        stage.bloom.threshold = 0.12;
        const luz = g('luz');

        enfocar(est, f.focal, f.dpr, f.time);
        est.u.uMinPx.value = 1.2 * f.dpr;
        est.u.uMaxPx.value = 5 * f.dpr;
        est.u.uGain.value = luz * (0.55 - 0.22 * g('red')) * (1 - 0.3 * smoothstep(0.6, 1.0, g('el')));
        est.u.uInk.value = luz * 0.8;

        enfocar(net, f.focal, f.dpr, f.time);
        net.u.uMinPx.value = 1.2 * f.dpr;
        net.u.uMaxPx.value = 6 * f.dpr;
        net.u.uGain.value = luz * g('red');
        const fr = g('frente');
        UR.uFrente.value = fr <= 0 ? -1e4 : fr;
        UR.uAncho.value = clamp(fr * 0.04, 180, 2400);
        UR.uBase.value = 0.4;
      },
      placa(g2, f) {
        const p = f.p;
        if (p < tl.at('pensamiento')) return;
        const anos = tl.get('frente', p);
        const a = smoothstep(tl.at('pensamiento'), tl.at('pensamiento') + 1.2, p);
        const n = anos * POR_ANO;
        const linea = anos < 4400 ? `${grupo(anos)} años` : anos < 4600 ? `${grupo(anos)} años · desde las pirámides` : `${grupo(anos)} años`;
        const cifra = n < 1e9 ? grupo(n) : n < 1e12 ? `${grupo(n / 1e9)} mil millones de` : `${(n / 1e12).toFixed(2).replace('.', ',')} billones de`;
        reloj(g2, f, a, cifra, 'latidos tuyos', linea);
      },
      dispose() {},
    };
  },
};
