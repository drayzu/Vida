import * as THREE from 'three';
import { Timeline } from './timeline';
import { clamp, damp, rng } from '../src/engine/math';
import { FONT, grupo, ink, type Cuenta, type Rotulo } from './placa';
import { SERIE, TIBIO } from './comun';
import type { Escena, Frame, Instancia } from './tipos';

/**
 * Study · «La vida simulada» (BRIEF v2, act IV). Phase 0.
 *
 * Something that moves, splits and chases with nothing but a few rules, running live on the GPU
 * (two textures that take turns). It is not an animation: every frame is computed from the one
 * before, and no two runs are the same. The scroll does not move it; it only turns the rules on,
 * brings the camera closer and asks the question.
 *
 * The rule of the flotadores study holds: black stays, colour is light. The points at rest are
 * warm white; colour enters when they start to move by themselves.
 *
 *  1 · Se persiguen: particle life. A few thousand points of five kinds; each kind is drawn to
 *      some kinds and flees from others (Ventrella's Clusters; Mohr's particle life).
 *  2 · Se dividen: reaction and diffusion (Gray and Scott). Spots that grow and split in two.
 *  3 · Se deslizan: SmoothLife (Rafler, 2011), the Game of Life made continuous. Things that glide.
 */

const S = 10;
const QUAD = /* glsl */ `void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const HASH = /* glsl */ `float h21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }`;

/** A pair of float textures that take turns, and a way to run a shader from one into the other. */
function gpu(renderer: THREE.WebGLRenderer, res: number, type: THREE.TextureDataType, filter: THREE.MagnificationTextureFilter) {
  const mk = () => new THREE.WebGLRenderTarget(res, res, { type, format: THREE.RGBAFormat, minFilter: filter, magFilter: filter, depthBuffer: false, stencilBuffer: false });
  let a = mk();
  let b = mk();
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  mesh.frustumCulled = false;
  scene.add(mesh);
  return {
    get tex() {
      return a.texture;
    },
    get rt() {
      return a;
    },
    /** Runs `mat` (its `tEstado` reads the current texture) into the other one, which becomes current. */
    paso(mat: THREE.ShaderMaterial) {
      mat.uniforms.tEstado.value = a.texture;
      mesh.material = mat;
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(b);
      renderer.render(scene, cam);
      renderer.setRenderTarget(prev);
      [a, b] = [b, a];
    },
    /** Draws `obj` over the current texture (after a `paso`), without clearing it. */
    sobre(obj: THREE.Object3D) {
      const prev = renderer.getRenderTarget();
      const ac = renderer.autoClear;
      renderer.autoClear = false;
      renderer.setRenderTarget(a);
      renderer.render(obj, cam);
      renderer.setRenderTarget(prev);
      renderer.autoClear = ac;
    },
    /** Draws `obj` into the current texture, from empty. */
    dibujar(obj: THREE.Object3D) {
      const prev = renderer.getRenderTarget();
      const alfa = renderer.getClearAlpha();
      renderer.setClearAlpha(0);
      renderer.setRenderTarget(a);
      renderer.clear();
      renderer.render(obj, cam);
      renderer.setRenderTarget(prev);
      renderer.setClearAlpha(alfa);
    },
    dispose() {
      a.dispose();
      b.dispose();
      mesh.geometry.dispose();
    },
  };
}

// ---------------------------------------------------------------- 1 · particle life

const K = 5;
const ESPECIE = /* glsl */ `
  ${HASH}
  int especie(ivec2 me) { return int(h21(vec2(me) + 0.5) * ${K}.0); }
`;

const VIDA_SIM = (n: number) => /* glsl */ `
  uniform sampler2D tEstado;
  uniform float uInit, uFuerza, uM[${K * K}];
  ${ESPECIE}
  const int N = ${n};
  const float RMAX = 0.07, BETA = 0.26, DT = 1.0 / 60.0;
  void main() {
    ivec2 me = ivec2(gl_FragCoord.xy);
    vec2 casa = ((vec2(me) + 0.5) / float(N) * 2.0 - 1.0) * 0.62;
    if (uInit > 0.5) { gl_FragColor = vec4(casa, 0.0, 0.0); return; }
    vec4 s = texelFetch(tEstado, me, 0);
    vec2 p = s.xy, v = s.zw;
    int sp = especie(me);
    vec2 acc = vec2(0.0);
    for (int y = 0; y < N; y++) {
      for (int x = 0; x < N; x++) {
        ivec2 o = ivec2(x, y);
        vec2 d = texelFetch(tEstado, o, 0).xy - p;
        float r2 = dot(d, d);
        if (r2 > RMAX * RMAX || r2 < 1e-10) continue;
        float r = sqrt(r2), q = r / RMAX;
        // Too close, every kind pushes away; farther, each kind pulls or pushes as the rule says.
        float f = q < BETA ? -1.6 * (BETA / max(q, 0.02) - 1.0) : uM[sp * ${K} + especie(o)] * (1.0 - abs(2.0 * q - 1.0 - BETA) / (1.0 - BETA));
        acc += d / r * f;
      }
    }
    acc *= 1.1 * uFuerza;
    // The dish: a soft wall.
    float R = length(p);
    if (R > 0.9) acc -= p / R * (R - 0.9) * 60.0;
    // Without the rules, every point goes back to its place in memory.
    acc += (casa - p) * 26.0 * (1.0 - uFuerza);
    v = v * mix(0.86, 0.75, uFuerza) + acc * DT;
    float sv = length(v);
    if (sv > 1.5) v *= 1.5 / sv;
    p += v * DT;
    gl_FragColor = vec4(p, v);
  }
`;

const VIDA_VERT = /* glsl */ `
  attribute vec2 aRef;
  uniform sampler2D tEstado;
  uniform float uS, uFocal, uMinPx, uColor, uGain, uRastro, uDens;
  uniform vec3 uPal[${K}];
  varying vec3 vEm;
  ${ESPECIE}
  void main() {
    ivec2 me = ivec2(aRef);
    vec4 s = texelFetch(tEstado, me, 0);
    float vel = length(s.zw);
    vec3 c = mix(vec3(1.0, 0.89, 0.8) * 0.5, uPal[especie(me)] * (0.42 + min(vel * 2.0, 0.6)), uColor);
    if (uDens > 0.5) {
      // Into the field the bodies are drawn from: a wide, soft mark of its own colour.
      gl_Position = vec4(s.xy / 1.05, 0.0, 1.0);
      gl_PointSize = uDens;
      vEm = uPal[especie(me)] * (0.55 + min(vel * 2.0, 0.7)) * uColor;
      return;
    }
    if (uRastro > 0.5) {
      gl_Position = vec4(s.xy / 1.05, 0.0, 1.0);
      gl_PointSize = uRastro;
      vEm = c * 0.06 * uColor * min(vel * 6.0, 1.0);
      return;
    }
    vec4 mv = modelViewMatrix * vec4(s.xy * uS, 0.0, 1.0);
    gl_Position = projectionMatrix * mv;
    float px = 0.0125 * uS * uFocal / max(-mv.z, 1e-4);
    gl_PointSize = clamp(px, uMinPx, 26.0);
    vEm = c * uGain * min(1.0, px * px / (uMinPx * uMinPx));
  }
`;
const PUNTO_FRAG = /* glsl */ `
  varying vec3 vEm;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    gl_FragColor = vec4(vEm * exp(-dot(c, c) * 14.0), 1.0);
  }
`;

const DENS_FRAG = /* glsl */ `
  uniform float uColor;
  varying vec3 vEm;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float f = exp(-dot(c, c) * 8.0);
    gl_FragColor = vec4(vEm * f, f * uColor);
  }
`;
/** Where enough points are together they share one rounded body: a bright membrane and a faint inside. */
const CUERPO_FRAG = /* glsl */ `
  uniform sampler2D tD;
  varying vec2 vUv;
  void main() {
    vec4 d = texture2D(tD, vUv);
    float a = d.a;
    vec3 c = d.rgb / max(a, 1e-3);
    float cuerpo = smoothstep(0.5, 0.72, a);
    float borde = cuerpo * (1.0 - smoothstep(0.72, 1.5, a));
    float dentro = smoothstep(1.2, 3.5, a);
    gl_FragColor = vec4(c * (0.09 * cuerpo + 0.8 * borde + 0.05 * dentro), 1.0);
  }
`;

/** The rule: how much each kind is drawn to each other kind (−1..1). Each kind likes its own. */
function regla(seed: number) {
  const r = rng(seed);
  const m: number[] = [];
  for (let i = 0; i < K; i++) for (let j = 0; j < K; j++) m.push(i === j ? 0.15 + 0.5 * r() : r() * 2 - 1);
  return m;
}

// ---------------------------------------------------------------- 2 · reaction and diffusion

const GS_SIM = (res: number) => /* glsl */ `
  uniform sampler2D tEstado;
  uniform float uInit, uF, uKk;
  uniform vec4 uBorra;
  ${HASH}
  void main() {
    vec2 px = vec2(1.0 / ${res}.0);
    vec2 uv = gl_FragCoord.xy * px;
    vec2 c = uv * 2.0 - 1.0;
    if (uInit > 0.5) {
      float v = 0.0;
      for (int i = 0; i < 5; i++) {
        vec2 o = (vec2(h21(vec2(float(i), 1.3)), h21(vec2(float(i), 7.9))) - 0.5) * 0.5;
        v = max(v, smoothstep(0.05, 0.02, length(c - o)));
      }
      gl_FragColor = vec4(1.0 - 0.5 * v, 0.3 * v, 0.0, 1.0);
      return;
    }
    vec4 t = texture2D(tEstado, uv);
    vec2 L = 0.2 * (texture2D(tEstado, uv + vec2(px.x, 0.0)).rg + texture2D(tEstado, uv - vec2(px.x, 0.0)).rg + texture2D(tEstado, uv + vec2(0.0, px.y)).rg + texture2D(tEstado, uv - vec2(0.0, px.y)).rg)
      + 0.05 * (texture2D(tEstado, uv + px).rg + texture2D(tEstado, uv - px).rg + texture2D(tEstado, uv + vec2(px.x, -px.y)).rg + texture2D(tEstado, uv + vec2(-px.x, px.y)).rg)
      - t.rg;
    float u = t.r, v = t.g, uvv = u * v * v;
    float nu = u + L.r - uvv + uF * (1.0 - u);
    float nv = v + 0.5 * L.g + uvv - (uF + uKk) * v;
    if (length(c) > 0.95 || (uBorra.z > 0.0 && length(c - uBorra.xy) < uBorra.z)) { nu = 1.0; nv = 0.0; }
    // b keeps a slow memory of v, so what is changing can be told from what is still.
    gl_FragColor = vec4(clamp(nu, 0.0, 1.0), clamp(nv, 0.0, 1.0), mix(t.b, v, 0.02), 1.0);
  }
`;

// ---------------------------------------------------------------- 3 · SmoothLife

const SL_SIM = (res: number) => /* glsl */ `
  uniform sampler2D tEstado;
  uniform float uInit, uSemilla;
  ${HASH}
  const float RA = 8.0, RI = 8.0 / 3.0;
  const float B1 = 0.278, B2 = 0.365, D1 = 0.267, D2 = 0.445, AN = 0.028, AM = 0.147;
  float s1(float x, float a, float al) { return 1.0 / (1.0 + exp(-(x - a) * 4.0 / al)); }
  float s2(float x, float a, float b) { return s1(x, a, AN) * (1.0 - s1(x, b, AN)); }
  float sm(float x, float y, float m) { float k = s1(m, 0.5, AM); return x * (1.0 - k) + y * k; }
  void main() {
    ivec2 me = ivec2(gl_FragCoord.xy);
    if (uInit > 0.5) {
      vec2 c = gl_FragCoord.xy / ${res}.0 * 2.0 - 1.0;
      float blob = step(0.56, h21(floor(gl_FragCoord.xy / 9.0) + uSemilla)) * step(length(c), 0.9);
      gl_FragColor = vec4(blob, 0.0, 0.0, 1.0);
      return;
    }
    float m = 0.0, n = 0.0, wm = 0.0, wn = 0.0;
    for (int dy = -9; dy <= 9; dy++) {
      for (int dx = -9; dx <= 9; dx++) {
        float r = length(vec2(float(dx), float(dy)));
        if (r > RA + 0.5) continue;
        float v = texelFetch(tEstado, (me + ivec2(dx, dy) + ${res}) % ${res}, 0).r;
        float ki = 1.0 - smoothstep(RI - 0.5, RI + 0.5, r);
        float ko = (1.0 - ki) * (1.0 - smoothstep(RA - 0.5, RA + 0.5, r));
        m += v * ki; wm += ki;
        n += v * ko; wn += ko;
      }
    }
    m /= wm; n /= wn;
    vec4 t = texelFetch(tEstado, me, 0);
    float s = s2(n, sm(B1, D1, m), sm(B2, D2, m));
    gl_FragColor = vec4(s, 0.0, mix(t.b, t.r, 0.08), 1.0);
  }
`;

/** A field shown as a lattice of points of light: still ones dim and cool, changing ones warm. */
const CAMPO_FRAG = /* glsl */ `
  uniform sampler2D tCampo;
  uniform float uPuntos, uEscala, uAct, uColor, uGain, uCanal;
  varying vec2 vUv;
  void main() {
    vec2 c = vUv * 2.0 - 1.0;
    float R = length(c);
    if (R > 1.0) discard;
    vec2 g = vUv * uPuntos;
    vec2 ci = floor(g) + 0.5;
    vec2 f = g - ci;
    vec4 t = texture2D(tCampo, ci / uPuntos);
    float val = mix(t.r, t.g, uCanal);
    float v = clamp(val * uEscala, 0.0, 1.0);
    float act = clamp(abs(val - t.b) * uAct, 0.0, 1.0);
    float punto = exp(-dot(f, f) * 11.0);
    vec3 tibio = vec3(1.0, 0.89, 0.8);
    vec3 quieto = mix(vec3(0.34, 0.3, 1.0), vec3(0.75, 0.42, 1.0), v);
    vec3 vivo = mix(vec3(1.0, 0.3, 0.5), vec3(1.0, 0.72, 0.38), act * act);
    vec3 col = mix(tibio * 0.5, mix(quieto * 0.5, vivo * 1.1, act), uColor) * v * (1.0 - smoothstep(0.88, 0.93, R));
    // The memory it lives in: a faint lattice.
    col += tibio * 0.022 * (1.0 - smoothstep(0.9, 0.97, R));
    gl_FragColor = vec4(col * punto * uGain, 1.0);
  }
`;

// ---------------------------------------------------------------- the scene

const UNA = 'Unos miles de puntos en la memoria de una máquina. Nadie los mueve.';
const SOLO = 'Nadie dibujó esto. Se está calculando ahora, mientras lo miras.';

export const simulada: Escena = {
  id: 'simulada',
  nombre: 'La vida simulada',
  estilos: [
    { key: '1', nombre: 'Se persiguen', nota: 'Cuatro mil puntos de cinco clases. Cada clase se acerca a unas y huye de otras: nada más. Con eso aparecen cosas que se mueven, se persiguen y se parten.' },
    { key: '2', nombre: 'Se dividen', nota: 'Dos sustancias que reaccionan y se difunden. De unas pocas manchas salen células que crecen y se parten en dos, sin parar.' },
    { key: '3', nombre: 'Se deslizan', nota: 'El Juego de la Vida hecho continuo. Cada punto mira a sus vecinos y decide. Aparecen cosas que se arrastran y chocan.' },
    { key: '4', nombre: 'Con cuerpo', nota: 'La manera 1, con las formas de la 3: los mismos puntos que se persiguen, pero los que van juntos comparten un cuerpo redondo, con su membrana.' },
  ],
  montar(stage, modo): Instancia {
    const { root, camera, renderer } = stage;
    const params = new URLSearchParams(location.search);
    const chico = !params.has('cap') && Math.min(innerWidth, innerHeight) < 600;

    const tl = new Timeline({ fuerza: 0, color: 0, d: 34, sigue: 0, duda: 0 });
    tl.caption(4, 'Una máquina', UNA);
    tl.wait(4);
    tl.caption(5.5, 'Unas pocas reglas', modo === 0 || modo === 3 ? 'Cada punto solo sabe a cuáles acercarse y de cuáles alejarse. Nada más.' : modo === 1 ? 'Dos sustancias: una alimenta a la otra, y las dos se esparcen. Nada más.' : 'Cada punto mira cuántos vecinos tiene encendidos, y se enciende o se apaga. Nada más.');
    tl.to(1.5, { fuerza: 1 });
    tl.with(3, { color: 1 });
    tl.to(4, { d: 30 });
    tl.caption(6, 'Solo', SOLO);
    tl.with(3, { sigue: 1 });
    tl.to(6, { d: 13 });
    tl.caption(5, '¿Está vivo?', 'No sabemos decir que no.');
    tl.with(1.5, { duda: 1 });
    tl.to(5, { d: modo === 1 || modo === 2 ? 11 : 10 });

    let pasos = 0;
    let puntos = 0;
    let avanzar: (f: Frame, fuerza: number, color: number) => void;
    let limpiar: () => void;
    /** Where the camera looks when it comes close (dish units). */
    const foco = new THREE.Vector2(0.12, 0.06);

    if (modo === 0 || modo === 3) {
      const cuerpo = modo === 3;
      const n = chico ? 48 : 64;
      puntos = n * n;
      const sim = gpu(renderer, n, THREE.FloatType, THREE.NearestFilter);
      const semilla = Number(params.get('semilla') ?? 4);
      const simMat = new THREE.ShaderMaterial({ vertexShader: QUAD, fragmentShader: VIDA_SIM(n), uniforms: { tEstado: { value: null }, uInit: { value: 1 }, uFuerza: { value: 0 }, uM: { value: regla(semilla) } } });
      sim.paso(simMat);
      simMat.uniforms.uInit.value = 0;

      const ref = new Float32Array(puntos * 2);
      for (let i = 0; i < puntos; i++) {
        ref[i * 2] = i % n;
        ref[i * 2 + 1] = Math.floor(i / n);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(puntos * 3), 3));
      geo.setAttribute('aRef', new THREE.BufferAttribute(ref, 2));
      const pal = [SERIE.espacio, SERIE.tiempo, SERIE.infinito, SERIE.mente, SERIE.abismo].map((c) => c.clone());
      const U = { tEstado: { value: sim.tex }, uS: { value: S }, uFocal: { value: 1000 }, uMinPx: { value: 1.6 }, uColor: { value: 0 }, uGain: { value: 1 }, uPal: { value: pal } };
      const mk = (rastro: number, dens = 0) =>
        new THREE.ShaderMaterial({
          vertexShader: VIDA_VERT,
          fragmentShader: dens ? DENS_FRAG : PUNTO_FRAG,
          uniforms: { ...U, uRastro: { value: rastro }, uDens: { value: dens } },
          transparent: true,
          depthTest: false,
          depthWrite: false,
          blending: THREE.CustomBlending,
          blendSrc: THREE.OneFactor,
          blendDst: THREE.OneFactor,
        });
      const pts = new THREE.Points(geo, mk(0));
      pts.frustumCulled = false;
      pts.renderOrder = 2;
      root.add(pts);

      // The wake: every point leaves a little light where it has been.
      const RR = chico ? 512 : 1024;
      const rastro = gpu(renderer, RR, THREE.HalfFloatType, THREE.LinearFilter);
      const fade = new THREE.ShaderMaterial({ vertexShader: QUAD, fragmentShader: /* glsl */ `uniform sampler2D tEstado; void main() { gl_FragColor = vec4(texture2D(tEstado, gl_FragCoord.xy / ${RR}.0).rgb * 0.94, 1.0); }`, uniforms: { tEstado: { value: null } } });
      const ptsR = new THREE.Points(geo, mk(RR / 400));
      ptsR.frustumCulled = false;
      const plano = new THREE.Mesh(
        new THREE.PlaneGeometry(2.1 * S, 2.1 * S),
        new THREE.ShaderMaterial({
          vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          fragmentShader: /* glsl */ `uniform sampler2D tR; varying vec2 vUv; void main() { gl_FragColor = vec4(texture2D(tR, vUv).rgb, 1.0); }`,
          uniforms: { tR: { value: rastro.tex } },
          transparent: true,
          depthTest: false,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      plano.renderOrder = 1;
      root.add(plano);

      // The bodies: every point leaves a soft mark in a field, and the field is drawn as rounded shapes.
      const dens = cuerpo ? gpu(renderer, RR, THREE.HalfFloatType, THREE.LinearFilter) : null;
      const ptsD = new THREE.Points(geo, mk(0, RR / 30));
      ptsD.frustumCulled = false;
      const piel = new THREE.Mesh(
        new THREE.PlaneGeometry(2.1 * S, 2.1 * S),
        new THREE.ShaderMaterial({
          vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          fragmentShader: CUERPO_FRAG,
          uniforms: { tD: { value: dens?.tex ?? null } },
          transparent: true,
          depthTest: false,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      piel.renderOrder = 0;
      if (cuerpo) root.add(piel);

      const buf = new Float32Array(puntos * 4);
      const G = 9;
      const cnt = new Float32Array(G * G);
      let celda = -1;
      avanzar = (f, fuerza, color) => {
        simMat.uniforms.uFuerza.value = fuerza;
        sim.paso(simMat);
        pasos++;
        U.tEstado.value = sim.tex;
        U.uFocal.value = f.focal;
        U.uMinPx.value = 1.7 * f.dpr;
        U.uColor.value = color;
        U.uGain.value = cuerpo ? 0.36 - 0.2 * color : 0.36;
        if (dens) dens.dibujar(ptsD);
        rastro.paso(fade);
        rastro.sobre(ptsR);
        (plano.material as THREE.ShaderMaterial).uniforms.tR.value = rastro.tex;
        // Every half second, look for where the most is going on, to bring the camera there.
        if (pasos % 30 === 1) {
          renderer.readRenderTargetPixels(sim.rt, 0, 0, n, n, buf);
          cnt.fill(0);
          for (let i = 0; i < puntos; i++) {
            const x = buf[i * 4];
            const y = buf[i * 4 + 1];
            if (Math.hypot(x, y) > 0.72) continue;
            const gx = clamp(Math.floor(((x + 1) / 2) * G), 0, G - 1);
            const gy = clamp(Math.floor(((y + 1) / 2) * G), 0, G - 1);
            cnt[gy * G + gx] += 1 + 6 * Math.hypot(buf[i * 4 + 2], buf[i * 4 + 3]);
          }
          let best = 0;
          for (let k = 0; k < G * G; k++) if (cnt[k] * (k === celda ? 1.6 : 1) > cnt[best] * (best === celda ? 1.6 : 1)) best = k;
          celda = best;
          foco.set((((best % G) + 0.5) / G) * 2 - 1, ((Math.floor(best / G) + 0.5) / G) * 2 - 1);
        }
      };
      limpiar = () => {
        sim.dispose();
        rastro.dispose();
        simMat.dispose();
        fade.dispose();
        ptsR.material.dispose();
        dens?.dispose();
        ptsD.material.dispose();
        if (!cuerpo) piel.geometry.dispose(), piel.material.dispose();
      };
    } else {
      const gs = modo === 1;
      const res = gs ? (chico ? 224 : 320) : chico ? 160 : 256;
      puntos = res * res;
      const sim = gpu(renderer, res, gs ? THREE.FloatType : THREE.HalfFloatType, THREE.NearestFilter);
      const simMat = new THREE.ShaderMaterial({
        vertexShader: QUAD,
        fragmentShader: gs ? GS_SIM(res) : SL_SIM(res),
        uniforms: { tEstado: { value: null }, uInit: { value: 1 }, uF: { value: 0.0367 }, uKk: { value: 0.0649 }, uBorra: { value: new THREE.Vector4(0, 0, 0, 0) }, uSemilla: { value: Number(params.get('semilla') ?? 3) } },
      });
      const sembrar = () => {
        simMat.uniforms.uInit.value = 1;
        sim.paso(simMat);
        simMat.uniforms.uInit.value = 0;
      };
      sembrar();
      const U = { tCampo: { value: sim.tex }, uPuntos: { value: gs ? 210 : 190 }, uEscala: { value: gs ? 3.2 : 1 }, uAct: { value: gs ? 30 : 0.9 }, uColor: { value: 0 }, uGain: { value: 1 }, uCanal: { value: gs ? 1 : 0 } };
      const plano = new THREE.Mesh(
        new THREE.PlaneGeometry(2 * S, 2 * S),
        new THREE.ShaderMaterial({
          vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          fragmentShader: CAMPO_FRAG,
          uniforms: U,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      root.add(plano);
      const r = rng(5);
      let sembrado = true;
      let cuadro = 0;
      avanzar = (_f, fuerza, color) => {
        if (fuerza < 0.02) {
          // Back at the start: the same seed, to run again.
          if (!sembrado) sembrar();
          sembrado = true;
          pasos = 0;
        } else {
          sembrado = false;
          cuadro++;
          if (gs) {
            for (let k = 0; k < 10; k++) {
              // Now and then a patch dies, and its neighbours divide into the room it leaves.
              const b = simMat.uniforms.uBorra.value as THREE.Vector4;
              if (k === 0 && pasos > 6000 && cuadro % 70 === 0) {
                const a = r() * Math.PI * 2;
                const d = 0.75 * Math.sqrt(r());
                b.set(Math.cos(a) * d, Math.sin(a) * d, 0.12 + 0.16 * r(), 0);
              } else b.z = 0;
              sim.paso(simMat);
              pasos++;
            }
          } else if (cuadro % 2 === 0) {
            sim.paso(simMat);
            pasos++;
          }
        }
        U.tCampo.value = sim.tex;
        U.uColor.value = color;
      };
      limpiar = () => {
        sim.dispose();
        simMat.dispose();
      };
    }

    const mira = new THREE.Vector2();
    let dudaA = 0;
    return {
      tl,
      escalera: false,
      cuenta(): Cuenta | null {
        return null;
      },
      rotulo(p): Rotulo | null {
        const cp = tl.captionAt(p);
        return cp ? { capitulo: 'IV · Un segundo', name: cp.name, fact: cp.fact } : null;
      },
      update(f: Frame) {
        const g = (k: string) => tl.get(k, f.p);
        stage.bloom.strength = 0.55;
        stage.bloom.radius = 0.6;
        stage.bloom.threshold = 0.18;
        dudaA = g('duda');

        const sigue = g('sigue');
        mira.x = damp(mira.x, foco.x * sigue * S, 1.2, f.dt);
        mira.y = damp(mira.y, foco.y * sigue * S, 1.2, f.dt);
        const D = g('d');
        camera.near = 0.05;
        camera.far = 500;
        camera.fov = 40;
        camera.position.set(mira.x, mira.y - D * 0.16, D);
        camera.up.set(0, 1, 0);
        camera.lookAt(mira.x, mira.y, 0);
        camera.updateMatrixWorld();
        f.focal = f.H / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

        avanzar(f, g('fuerza'), g('color'));
      },
      placa(g2, f) {
        const u = f.u;
        const x = 44 * u;
        g2.save();
        g2.textBaseline = 'alphabetic';
        g2.shadowColor = 'rgba(0,0,0,0.85)';
        g2.shadowBlur = 12 * u;
        if (dudaA > 0.01) {
          // The clock: nobody knows what its heartbeat is.
          g2.globalAlpha = dudaA;
          g2.font = FONT.serif(66 * u);
          g2.fillStyle = ink();
          g2.fillText('¿?', x, f.H - 86 * u);
          const w = g2.measureText('¿?').width;
          g2.font = FONT.serif(26 * u);
          g2.fillStyle = ink(0.6);
          g2.fillText('latidos', x + w + 12 * u, f.H - 88 * u);
          g2.globalAlpha = 1;
        }
        g2.font = FONT.mono(11 * u);
        g2.letterSpacing = `${0.9 * u}px`;
        g2.fillStyle = ink(0.78);
        g2.fillText(`EN VIVO · PASO ${grupo(pasos)} · ${grupo(puntos)} PUNTOS`, x, f.H - 52 * u);
        g2.restore();
      },
      dispose() {
        limpiar();
      },
    };
  },
};
