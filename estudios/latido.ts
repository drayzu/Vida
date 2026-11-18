import * as THREE from 'three';
import { Timeline, EASE } from './timeline';
import { pantalla } from '../src/engine/pantalla';
import { enfocar, materia, materiaBuilder } from '../src/engine/materia';
import { clamp, lerp, rng } from '../src/engine/math';
import { ANTES, TOTAL, hora, horaDe, oscuro, titulo, type Cuenta, type Rotulo } from './placa';
import { SEGURO, SERIE, TIBIO, TU, V, ease, lubdub } from './comun';
import type { Escena, Frame, Instancia } from './tipos';

/**
 * Study · the first heartbeat (the opening of Vida, GUION.md moments 1–6, and the first two of act
 * I). Two warm points find each other and become one; the cell divides into two, four … thirty-two
 * (the same matter, reordered); in the middle of it a teal flash, then another: the point that
 * breathed through the six earlier works starts beating here. Around everything, very large and
 * very faint, another heart beats slower. Then the light you are born into fills the frame, the
 * title comes in dark ink, as in Tiempo, and the light lowers onto a plain at dawn: from down there
 * the people are columns of light in the colours of the series, and five of them come close.
 *
 * The first three heartbeats are written on the scroll (one … two … three), so the moment is the
 * reader's; after that the heart beats by itself, in ambient time.
 */

const CENTRO = V(0, 0, -3);
const HOJAS = 32;
const POR_HOJA = 120;
const R5 = 0.16;
const SUELO = -0.32;
const TU_EN = V(0, SUELO + 0.03, -4.5);

const FONDO = /* glsl */ `
  uniform float uEnv, uLuz, uAlba;
  uniform vec3 uMel;
  ${SEGURO}
  void main() {
    vec3 d = normalize(vDir);
    vec3 c = vec3(0.0);
    // The other heart: a warm presence all around, seen from inside, slower than yours.
    float ang = acos(clamp(-d.z, -1.0, 1.0));
    float otro = lubdub(uTime, 66.0);
    float glow = exp(-ang * ang * 2.4);
    float tela = 0.7 + 0.6 * fbm(d.xy * 2.6 + vec2(uTime * 0.018, -uTime * 0.013));
    c += vec3(1.0, 0.4, 0.2) * (0.03 + 0.06 * glow) * tela * (0.7 + 0.45 * otro) * uEnv;
    // Dawn over the plain.
    if (uAlba > 0.0) {
      vec3 cielo;
      float y = d.y;
      if (y > 0.0) {
        float h = pw(1.0 - clamp(y / 0.45, 0.0, 1.0), 2.4);
        cielo = mix(vec3(0.008, 0.011, 0.032), vec3(0.17, 0.085, 0.065), h);
        cielo += vec3(0.14, 0.07, 0.04) * pw(1.0 - clamp(y / 0.03, 0.0, 1.0), 3.0);
        // The sun about to come up, low on the left.
        vec2 s = vec2(d.x + 0.45, y + 0.012);
        cielo += vec3(1.0, 0.64, 0.42) * exp(-dot(s, s) * 300.0) * 0.55;
      } else {
        float h = pw(1.0 - clamp(-y / 0.22, 0.0, 1.0), 5.0);
        cielo = mix(vec3(0.004, 0.0035, 0.004), vec3(0.06, 0.03, 0.02), h);
      }
      c = mix(c, cielo, uAlba);
    }
    // The light you are born into fills everything.
    c = mix(c, uMel * 1.55, uLuz);
    gl_FragColor = vec4(c, 1.0);
  }
`;

/** Thirty-two cell centres packed in a ball, and for each the centre of its ancestor at every level. */
function morula(seed: number) {
  const r = rng(seed);
  const R = 0.62;
  const pts: THREE.Vector3[] = [];
  while (pts.length < HOJAS) {
    const v = V(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1);
    if (v.lengthSq() <= 1) pts.push(v.multiplyScalar(R - R5));
  }
  const d = V();
  for (let it = 0; it < 90; it++) {
    for (let i = 0; i < HOJAS; i++)
      for (let j = i + 1; j < HOJAS; j++) {
        d.subVectors(pts[j], pts[i]);
        const L = d.length();
        const min = 2 * R5 * 0.97;
        if (L < min && L > 1e-6) {
          d.multiplyScalar(((min - L) / L) * 0.5);
          pts[i].sub(d);
          pts[j].add(d);
        }
      }
    for (const p of pts) if (p.length() > R - R5 * 0.7) p.setLength(R - R5 * 0.7);
  }
  // Split the set in halves along its longest spread, five times: each half is a daughter cell.
  const anc: THREE.Vector3[][] = pts.map(() => []);
  const partir = (idx: number[], L: number) => {
    const c = V();
    for (const i of idx) c.add(pts[i]);
    c.multiplyScalar(1 / idx.length);
    for (const i of idx) anc[i][L] = c.clone();
    if (L === 5) return;
    const M = [0, 0, 0, 0, 0, 0];
    for (const i of idx) {
      const x = pts[i].x - c.x;
      const y = pts[i].y - c.y;
      const z = pts[i].z - c.z;
      M[0] += x * x;
      M[1] += x * y;
      M[2] += x * z;
      M[3] += y * y;
      M[4] += y * z;
      M[5] += z * z;
    }
    const ax = V(1, 0.6, 0.3).normalize();
    for (let k = 0; k < 24; k++) {
      ax.set(M[0] * ax.x + M[1] * ax.y + M[2] * ax.z, M[1] * ax.x + M[3] * ax.y + M[4] * ax.z, M[2] * ax.x + M[4] * ax.y + M[5] * ax.z);
      if (ax.lengthSq() < 1e-12) ax.set(1, 0, 0);
      ax.normalize();
    }
    const orden = [...idx].sort((a, b) => pts[a].clone().sub(c).dot(ax) - pts[b].clone().sub(c).dot(ax));
    partir(orden.slice(0, orden.length / 2), L + 1);
    partir(orden.slice(orden.length / 2), L + 1);
  };
  partir([...Array(HOJAS).keys()], 0);
  return anc;
}

export const latido: Escena = {
  id: 'latido',
  nombre: 'El primer latido',
  estilos: [{ key: '1', nombre: 'Borrador', nota: 'Apertura de Vida y comienzo del acto I: dos, la división, el primer latido, el otro corazón, la luz, la llanura al amanecer y las cinco luces cerca.' }],
  montar(stage): Instancia {
    const root = stage.root;
    const { camera } = stage;

    const fondo = pantalla(FONDO, { uEnv: { value: 0 }, uLuz: { value: 0 }, uAlba: { value: 0 }, uMel: { value: new THREE.Color('#ffc4a3') } });
    root.add(fondo.mesh);

    // ------------------------------------------------ the embryo (everything until birth)
    const embrion = new THREE.Group();
    embrion.position.copy(CENTRO);
    root.add(embrion);

    const anc = morula(7);
    const rad = (L: number) => R5 * Math.pow(2, (5 - L) / 3);
    const nCel = HOJAS * (POR_HOJA + 1);
    const hoja = new Int32Array(nCel);
    const dir = new Float32Array(nCel * 3);
    const rf = new Float32Array(nCel);
    const bc = materiaBuilder(11);
    let k = 0;
    for (let i = 0; i < HOJAS; i++) {
      for (let j = 0; j <= POR_HOJA; j++) {
        hoja[k] = i;
        if (j === POR_HOJA) {
          // The nucleus.
          dir.set([0, 0, 0], k * 3);
          rf[k] = 0;
          bc.push(0, 0, 0, TIBIO, 0.028, 0.45);
        } else {
          const [x, y, z] = bc.onSphere();
          dir.set([x, y, z], k * 3);
          const dentro = bc.r() < 0.14;
          rf[k] = dentro ? 0.85 * Math.cbrt(bc.r()) : 0.9 + 0.1 * bc.r();
          bc.push(0, 0, 0, TIBIO, 0.009, dentro ? 0.1 : 0.27);
        }
        k++;
      }
    }
    const celulas = materia(bc.data(), {
      pre: /* glsl */ `uniform float uLat; uniform vec3 uTuC;`,
      move: /* glsl */ `
        float w = exp(-dot(p, p) * 6.0);
        em = em * (1.0 + uLat * 1.8 * w) + uTuC * uLat * 0.5 * w;
      `,
      uniforms: { uLat: { value: 0 }, uTuC: { value: TU.clone() } },
    });
    embrion.add(celulas.points);
    const posCel = celulas.points.geometry.attributes.position as THREE.BufferAttribute;

    // The two warm points (neither you nor the other: the beginning).
    const bg = materiaBuilder(12);
    for (let s = 0; s < 2; s++) {
      bg.push(0, 0, 0, TIBIO, 0.03, 1.2);
      // One is a sphere, the other a point twenty times smaller.
      for (let j = 0; j < 46; j++) {
        const [x, y, z] = bg.onSphere();
        const q = (s === 0 ? 0.13 : 0.012) * Math.cbrt(bg.r());
        bg.push(x * q, y * q, z * q, TIBIO, 0.008, 0.35);
      }
    }
    const gametos = materia(bg.data());
    gametos.u.uFuente.value = 1;
    embrion.add(gametos.points);
    const posGam = gametos.points.geometry.attributes.position as THREE.BufferAttribute;
    const baseGam = Float32Array.from(posGam.array as Float32Array);

    // Your heart: the point of the series.
    const bh = materiaBuilder(13);
    bh.push(0, 0, 0, TU, 0.07, 1);
    for (let j = 0; j < 90; j++) {
      const [x, y, z] = bh.onSphere();
      const q = 0.07 * Math.cbrt(bh.r());
      bh.push(x * q, y * q, z * q, TU, 0.012, 0.45);
    }
    const corazon = materia(bh.data());
    corazon.u.uFuente.value = 1;
    embrion.add(corazon.points);

    // The ring each of the first three beats sends out (the same wave as the voice, later).
    const anillo = new THREE.Group();
    anillo.position.copy(CENTRO);
    root.add(anillo);
    const ba = materiaBuilder(14);
    for (let j = 0; j < 220; j++) {
      const a = (j / 220) * Math.PI * 2;
      ba.push(Math.cos(a), Math.sin(a), 0, TU, 0.006, 0.6);
    }
    const onda = materia(ba.data());
    onda.u.uFuente.value = 1;
    anillo.add(onda.points);

    // ------------------------------------------------ the plain at dawn
    const llanura = new THREE.Group();
    root.add(llanura);
    const bs = materiaBuilder(21);
    for (let i = 0; i < 11000; i++) {
      const z = -1.7 - 170 * Math.pow(bs.r(), 2.2);
      const x = (bs.r() * 2 - 1) * (6 + Math.abs(z) * 0.9);
      bs.push(x, SUELO, z, new THREE.Color(0.62, 0.55, 0.5), 0.011, 0.3);
    }
    const suelo = materia(bs.data(), {
      pre: /* glsl */ `uniform vec3 uTuPos; uniform float uTuLuz;`,
      move: /* glsl */ `
        vec3 q = p - uTuPos;
        em += vec3(0.45, 1.0, 0.85) * uTuLuz * 0.9 * exp(-dot(q, q) * 3.0);
      `,
      uniforms: { uTuPos: { value: TU_EN.clone() }, uTuLuz: { value: 0 } },
    });
    suelo.u.uFog.value = 38;
    suelo.u.uFogNear.value = 3;
    suelo.u.uMaxPx.value = 4;
    llanura.add(suelo.points);

    // Five people, seen from the height of a child: columns of light that go up out of the frame.
    // Each carries the colour of one of the other works. Later they come down to your height.
    // Everyone is warm white: the only colour in the world is yours (GUION borrador 2).
    const COLORES = [TIBIO, TIBIO, TIBIO, TIBIO, TIBIO];
    const BASES = [V(-1.5, SUELO, -5.6), V(1.25, SUELO, -4.9), V(-0.55, SUELO, -8.2), V(2.6, SUELO, -7.4), V(-2.9, SUELO, -7.0)];
    const ANG = [36, 108, 180, 252, 324].map((a) => THREE.MathUtils.degToRad(a));
    const ANILLO = ANG.map((a) => V(TU_EN.x + Math.sin(a) * 1.15, SUELO + 0.3, TU_EN.z + Math.cos(a) * 1.15));
    const POR_COL = 1500;
    const bcol = materiaBuilder(22);
    const colOff = new Float32Array(5 * POR_COL * 3);
    const orbOff = new Float32Array(5 * POR_COL * 3);
    for (let c = 0; c < 5; c++) {
      for (let j = 0; j < POR_COL; j++) {
        const i = c * POR_COL + j;
        const a = bcol.r() * Math.PI * 2;
        const q = 0.085 * Math.sqrt(bcol.r());
        const y = 4.2 * Math.pow(bcol.r(), 1.15);
        colOff.set([Math.cos(a) * q, y, Math.sin(a) * q], i * 3);
        const [ox, oy, oz] = bcol.onSphere();
        const s = 0.075 * Math.cbrt(bcol.r());
        orbOff.set([ox * s, oy * s, oz * s], i * 3);
        bcol.push(0, 0, 0, COLORES[c], 0.015, 0.42 + 0.3 * Math.exp(-y * 0.6));
      }
    }
    const columnas = materia(bcol.data());
    llanura.add(columnas.points);
    const posCol = columnas.points.geometry.attributes.position as THREE.BufferAttribute;

    // You, on the ground: the same point, now beating at a newborn's pace.
    const bt = materiaBuilder(23);
    bt.push(TU_EN.x, TU_EN.y, TU_EN.z, TU, 0.06, 1);
    for (let j = 0; j < 60; j++) {
      const [x, y, z] = bt.onSphere();
      const q = 0.05 * Math.cbrt(bt.r());
      bt.push(TU_EN.x + x * q, TU_EN.y + Math.abs(y) * q, TU_EN.z + z * q, TU, 0.012, 0.45);
    }
    const tuSuelo = materia(bt.data());
    tuSuelo.u.uFuente.value = 1;
    llanura.add(tuSuelo.points);

    // ------------------------------------------------ the choreography
    const tl = new Timeline();
    tl.set({ ini: 0, dos: 0, div: 0, env: 0, ritmo: 0, luz: 0, alba: 0, tit: 0, cam: 0, cols: 0, cerca: 0, zc: 0.9 });

    tl.label('dos').caption(6.4, 'Dos', 'Todo lo que eres empezó con dos.');
    tl.to(0.9, { ini: 1 });
    tl.to(4.6, { dos: 1 }, EASE.sine);
    tl.wait(0.9);

    tl.label('div').caption(8.0, 'Una, dos, cuatro', 'Una célula se parte en dos. Y otra vez. Y otra.');
    for (let L = 1; L <= 5; L++) {
      tl.to(1.05, { div: L }, EASE.inOut);
      tl.wait(0.3);
    }
    tl.wait(1.25);

    tl.label('todavia').caption(5.0, 'Todavía no', 'Todavía no estás aquí.');
    tl.to(3.2, { env: 0.55 });
    tl.wait(1.8);

    tl.label('latido').caption(10.5, 'El primer latido', 'Tres semanas después, algo empieza a latir. Todavía no tienes cara. Ya tienes corazón.');
    const P1 = tl.at('latido') + 2.2;
    const P2 = P1 + 2.4;
    const P3 = P2 + 1.5;
    const GOLPES = [P1, P2, P3];
    tl.with(10.5, { zc: -0.35 });
    tl.wait(7.2);
    tl.to(3.3, { ritmo: 1 });

    tl.label('otro').caption(7.5, 'Otro corazón', 'Antes de ver nada, oíste otro corazón.');
    tl.to(3.0, { env: 1 });
    tl.wait(4.5);
    const FIN_OTRO = tl.at('otro') + 7.5;

    tl.label('luz').caption(12.5, 'Se hace la luz', 'Y un día, la luz.');
    tl.to(3.2, { luz: 1 }, EASE.in);
    tl.label('pico');
    tl.to(1.4, { tit: 1 });
    tl.wait(2.6);
    tl.to(1.2, { tit: 0 });
    tl.to(3.6, { luz: 0, alba: 1 });
    tl.wait(0.5);
    const PICO = tl.at('pico');

    tl.label('abajo').caption(7.0, 'Desde abajo', 'Mides cincuenta centímetros. Todo lo demás es enorme.');
    tl.to(4.2, { cam: 1, cols: 1 });
    tl.wait(2.8);

    tl.label('cerca').caption(7.0, 'Cerca', 'Unas pocas luces se quedan cerca. Casi siempre las mismas.');
    tl.to(4.6, { cerca: 1 });
    tl.wait(2.4);
    const FIN = tl.length;

    /** Heartbeats so far, and the weeks or the age, as the clock reads them at progress p. */
    function latidos(p: number) {
      if (p < P3 + 0.3) return { n: GOLPES.filter((g) => p >= g).length, sem: 3, años: -1 };
      if (p < FIN_OTRO) {
        const s = clamp((p - (P3 + 0.3)) / (FIN_OTRO - (P3 + 0.3)), 0, 1);
        return { n: 3 * Math.pow(2.4e6 / 3, s), sem: Math.round(3 + 16 * s), años: -1 };
      }
      if (p < PICO) {
        const s = clamp((p - FIN_OTRO) / (PICO - FIN_OTRO), 0, 1);
        return { n: 2.4e6 * Math.pow(ANTES / 2.4e6, s), sem: Math.round(19 + 19 * s), años: -1 };
      }
      const años = clamp((p - tl.at('abajo')) / (FIN - tl.at('abajo')), 0, 1) * 2.5;
      return { n: ANTES + años * 6.3e7, sem: 0, años };
    }

    return {
      tl,
      cuenta(p): Cuenta | null {
        const a = ease(P1 - 0.35, P1, p);
        if (a <= 0) return null;
        const { n, sem, años } = latidos(p);
        const h = hora(horaDe(n));
        let linea: string;
        if (años < 0) linea = sem >= 17 && sem <= 21 ? `mitad del embarazo  ·  ${h}` : `${sem} semanas  ·  ${h}`;
        else {
          const edad = años < 1 ? `${Math.max(0, Math.round(años * 12))} meses` : `${Math.floor(años)} año${Math.floor(años) === 1 ? '' : 's'}`;
          linea = `${edad}  ·  ${h}`;
        }
        return { latidos: Math.max(1, n), linea, vida: n / TOTAL, a: a * (1 - 0.85 * tl.get('tit', p)) };
      },
      rotulo(p): Rotulo | null {
        if (tl.get('tit', p) > 0.3) return null;
        const cp = tl.captionAt(p);
        if (!cp) return null;
        return { capitulo: p < tl.at('abajo') ? 'Apertura · Dos' : 'I · Todo es gigante', name: cp.name, fact: cp.fact };
      },
      placa(g, f) {
        titulo(g, f.u, f.W, f.H, tl.get('tit', f.p));
      },
      update(f: Frame) {
        const p = f.p;
        const luz = tl.get('luz', p);
        const alba = tl.get('alba', p);
        const env = tl.get('env', p);
        oscuro(ease(0.35, 0.8, luz));
        const plano = p >= PICO;
        stage.bloom.strength = (plano ? 0.55 : 0.62) * (1 - 0.85 * luz);
        stage.bloom.threshold = 0.1;
        fondo.u.uEnv.value = env * (1 - luz);
        fondo.u.uLuz.value = luz;
        fondo.u.uAlba.value = alba;

        embrion.visible = !plano;
        anillo.visible = !plano;
        llanura.visible = plano;
        camera.near = 0.01;
        camera.far = 400;
        camera.fov = 40;

        if (!plano) {
          camera.position.set(0, 0, tl.get('zc', p));
          camera.up.set(0, 1, 0);
          camera.lookAt(CENTRO);
          embrion.rotation.set(0.25, 0.4 + f.time * 0.035, 0);

          // The two points, along gentle curves, until they touch.
          const dos = tl.get('dos', p);
          const s = EASE.sine(clamp(dos, 0, 1));
          const pa = posGam.array as Float32Array;
          const n1 = 47;
          for (let side = 0; side < 2; side++) {
            const sx = side === 0 ? -1.25 : 1.2;
            const sy = side === 0 ? 0.2 : -0.16;
            const cx = lerp(sx, side === 0 ? -0.012 : 0.012, s);
            const cy = lerp(sy, 0, s) + Math.sin(Math.PI * s) * (side === 0 ? 0.22 : -0.2);
            const cz = Math.sin(Math.PI * s) * (side === 0 ? 0.15 : -0.15);
            for (let j = 0; j < n1; j++) {
              const o = (side * n1 + j) * 3;
              pa[o] = baseGam[o] + cx;
              pa[o + 1] = baseGam[o + 1] + cy;
              pa[o + 2] = baseGam[o + 2] + cz;
            }
          }
          posGam.needsUpdate = true;
          const toque = Math.exp(-Math.pow((dos - 0.965) / 0.03, 2));
          enfocar(gametos, f.focal, f.dpr, f.time);
          gametos.u.uMinPx.value = 2.6 * f.dpr;
          gametos.u.uGain.value = 1.4 * tl.get('ini', p) * (1 - ease(0.93, 1.0, dos)) + 1.2 * toque;

          // The cells: the same matter, reordered at each division.
          const x = clamp(tl.get('div', p), 0, 5);
          const L = Math.min(4, Math.floor(x));
          const t = x - L;
          const ra = rad(L);
          const rb = rad(L + 1);
          const r = lerp(ra, rb, t);
          const pc = posCel.array as Float32Array;
          for (let q = 0; q < nCel; q++) {
            const a = anc[hoja[q]][L];
            const b = anc[hoja[q]][L + 1];
            const k3 = q * 3;
            const rr = r * rf[q];
            // A cell pinches before it splits: its two halves pull apart along their axis.
            pc[k3] = lerp(a.x, b.x, t) + dir[k3] * rr;
            pc[k3 + 1] = lerp(a.y, b.y, t) + dir[k3 + 1] * rr;
            pc[k3 + 2] = lerp(a.z, b.z, t) + dir[k3 + 2] * rr;
          }
          posCel.needsUpdate = true;

          // The heartbeat: the first three on the scroll, then by itself.
          let golpe = 0;
          for (const g of GOLPES) golpe = Math.max(golpe, Math.exp(-Math.pow((p - g) / 0.16, 2)));
          const ritmo = tl.get('ritmo', p);
          const lat = Math.max(golpe, ritmo * lubdub(f.time, 128));
          const vivo = ease(P1 - 0.25, P1, p);
          enfocar(celulas, f.focal, f.dpr, f.time);
          celulas.u.uGain.value = (0.8 * ease(0.86, 1.0, tl.get('dos', p)) * (1 - 0.5 * vivo) + 1.0 * toque) * (1 - luz);
          celulas.u.uLat.value = lat * vivo;
          enfocar(corazon, f.focal, f.dpr, f.time);
          corazon.u.uMinPx.value = 4 * f.dpr;
          corazon.u.uGain.value = vivo * (0.45 + 4.2 * lat) * (1 - luz);

          // The ring of each of the first three.
          let edad = -1;
          for (const g of GOLPES) if (p >= g && p - g < 1.0) edad = p - g;
          enfocar(onda, f.focal, f.dpr, f.time);
          onda.u.uMinPx.value = 1.2 * f.dpr;
          if (edad >= 0) {
            anillo.scale.setScalar(0.06 + 1.5 * edad);
            onda.u.uGain.value = 1.4 * Math.pow(1 - edad, 2) * (1 - luz);
          } else onda.u.uGain.value = 0;
          anillo.lookAt(camera.position);
        } else {
          // The plain: born at dawn, the camera low; then lower, looking up; then up, to see the five.
          const cam = tl.get('cam', p);
          const cerca = EASE.inOut(clamp(tl.get('cerca', p), 0, 1));
          const pos = V(0, -0.05, 0).lerp(V(0, -0.27, 0.45), cam).lerp(V(0, 1.05, 1.4), cerca);
          const at = V(0, -0.13, -6).lerp(V(0, 0.42, -6), cam).lerp(V(0, -0.22, -4.5), cerca);
          camera.position.copy(pos);
          camera.up.set(0, 1, 0);
          camera.lookAt(at);

          const pa = posCol.array as Float32Array;
          for (let c = 0; c < 5; c++) {
            for (let j = 0; j < POR_COL; j++) {
              const o = (c * POR_COL + j) * 3;
              const cx = BASES[c].x + colOff[o];
              const cy = BASES[c].y + colOff[o + 1];
              const cz = BASES[c].z + colOff[o + 2];
              pa[o] = lerp(cx, ANILLO[c].x + orbOff[o], cerca);
              pa[o + 1] = lerp(cy, ANILLO[c].y + orbOff[o + 1], cerca);
              pa[o + 2] = lerp(cz, ANILLO[c].z + orbOff[o + 2], cerca);
            }
          }
          posCol.needsUpdate = true;
          enfocar(columnas, f.focal, f.dpr, f.time);
          columnas.u.uGain.value = 1.15 * tl.get('cols', p) * (1 + 0.6 * cerca);

          const lat = lubdub(f.time, 118);
          enfocar(suelo, f.focal, f.dpr, f.time);
          suelo.u.uGain.value = 0.9 * alba;
          suelo.u.uMaxPx.value = 4 * f.dpr;
          suelo.u.uTuLuz.value = alba * (0.35 + 0.9 * lat);
          enfocar(tuSuelo, f.focal, f.dpr, f.time);
          tuSuelo.u.uMinPx.value = 5 * f.dpr;
          tuSuelo.u.uGain.value = alba * (1.3 + 3.2 * lat);
        }
      },
      dispose() {},
    };
  },
};
