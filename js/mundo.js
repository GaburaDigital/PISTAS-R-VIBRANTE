// Mundo 3D e regras da corrida.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LARGURA, slug } from './dados.js';
import { Audio } from './audio.js';

const NOMES = ['besourinho', 'triturador', 'fosforo', 'estrela', 'pocao', 'portal_r', 'portal_l', 'rampa_salto', 'rampa_turbo', 'chegada'];
const MOD = {};
const IMGS = new Map();
const COR_SOM = { r: '#e6007e', l: '#0a66ff' };
const G = 20;
export const raioDe = (p) => Math.min(1.3, 0.36 + 0.052 * Math.sqrt(Math.max(p, 0)));
const lerp = (a, b, t) => a + (b - a) * t;
const limita = (v, a, b) => Math.max(a, Math.min(b, v));

// Junta as peças que não se movem em uma malha por material: menos desenhos por quadro.
function otimiza(m) {
  const anim = new Set();
  m.clips.forEach((c) => c.tracks.forEach((t) => anim.add(THREE.PropertyBinding.parseTrackName(t.name).nodeName)));
  m.cena.updateMatrixWorld(true);
  const animado = (o) => { for (let p = o; p; p = p.parent) if (anim.has(p.name) || anim.has(p.uuid)) return true; return false; };
  const grupos = new Map();
  m.cena.traverse((o) => { if (o.isMesh && !o.isSkinnedMesh && !o.children.length && !Array.isArray(o.material) && !animado(o)) { if (!grupos.has(o.material)) grupos.set(o.material, []); grupos.get(o.material).push(o); } });
  for (const [mat, lista] of grupos) {
    if (lista.length < 2) continue;
    try {
      const geos = lista.map((o) => { let g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); if (g.index) g = g.toNonIndexed(); return g; });
      const g = mergeGeometries(geos, false); if (!g) continue;
      m.cena.add(new THREE.Mesh(g, mat)); lista.forEach((o) => o.parent.remove(o));
    } catch (e) { /* mantém as peças separadas */ }
  }
}

function texCanvas(c, opts = {}) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; Object.assign(t, opts); return t; }

class Particulas {
  constructor(cena, n) {
    this.n = n; this.p = []; this.livre = 0; this.o = new THREE.Object3D();
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), n);
    this.mesh.frustumCulled = false; this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const z = new THREE.Matrix4().makeScale(0, 0, 0), c = new THREE.Color(1, 1, 1);
    for (let i = 0; i < n; i++) { this.p.push({ vida: 0 }); this.mesh.setMatrixAt(i, z); this.mesh.setColorAt(i, c); }
    cena.add(this.mesh);
  }
  emite(n, pos, o = {}) {
    const { cores = [0xffffff], esp = 1, vel = [0, 2, 0], rnd = 3, grav = 9, vida = 1, tam = [0.14, 0.05], giro = 8, fixo = null } = o, c = new THREE.Color();
    for (let k = 0; k < n; k++) {
      const i = this.livre; this.livre = (this.livre + 1) % this.n; const q = this.p[i];
      q.x = pos.x + (Math.random() - 0.5) * esp; q.y = pos.y + (Math.random() - 0.5) * esp; q.z = pos.z + (Math.random() - 0.5) * esp;
      q.vx = vel[0] + (Math.random() - 0.5) * rnd; q.vy = vel[1] + (Math.random() - 0.3) * rnd; q.vz = vel[2] + (Math.random() - 0.5) * rnd;
      q.g = grav; q.vida = q.max = vida * (0.6 + Math.random() * 0.7); q.w = tam[0] * (0.6 + Math.random() * 0.8); q.h = tam[1] * (0.6 + Math.random() * 0.8);
      q.rx = fixo ? fixo[0] : Math.random() * 6; q.ry = fixo ? fixo[1] : Math.random() * 6; q.rz = fixo ? fixo[2] : Math.random() * 6; q.gi = fixo ? 0 : giro * (Math.random() - 0.5) * 2;
      this.mesh.setColorAt(i, c.set(cores[Math.floor(Math.random() * cores.length)]));
    }
    this.mesh.instanceColor.needsUpdate = true;
  }
  atualiza(dt) {
    const o = this.o;
    for (let i = 0; i < this.n; i++) {
      const q = this.p[i]; if (q.vida <= 0) continue; q.vida -= dt;
      if (q.vida <= 0) { o.scale.set(0, 0, 0); o.updateMatrix(); this.mesh.setMatrixAt(i, o.matrix); continue; }
      q.vy -= q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.rx += q.gi * dt; q.rz += q.gi * 0.7 * dt;
      const k = Math.min(1, q.vida / q.max * 3);
      o.position.set(q.x, q.y, q.z); o.rotation.set(q.rx, q.ry, q.rz); o.scale.set(q.w * k, q.h * k, 1); o.updateMatrix(); this.mesh.setMatrixAt(i, o.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export class Mundo {
  constructor(canvas, cb) {
    this.cb = cb; this.canvas = canvas; this.reduz = false; this.qualidade = 'auto';
    const r = this.r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.dpr = Math.min(window.devicePixelRatio || 1, 2); r.setPixelRatio(this.dpr);
    this.cena = new THREE.Scene(); this.cena.fog = new THREE.Fog(0xffc857, 40, 125);
    this.cam = new THREE.PerspectiveCamera(58, 1, 0.1, 500); this.cam.position.set(0, 3, 6);
    this.cena.add(new THREE.HemisphereLight(0xffffff, 0x9a7fd1, 1.35));
    const sol = new THREE.DirectionalLight(0xffffff, 1.7); sol.position.set(3, 8, 6); this.cena.add(sol);
    this.ceu = new THREE.Mesh(new THREE.SphereGeometry(320, 20, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { topo: { value: new THREE.Color(0xff5d73) }, base: { value: new THREE.Color(0xffc857) } },
      vertexShader: 'varying float h; void main(){ h=normalize(position).y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 topo; uniform vec3 base; varying float h; void main(){ float t=smoothstep(-0.02,0.5,h); gl_FragColor=vec4(mix(base,topo,t),1.0); \n#include <colorspace_fragment>\n }' }));
    this.ceu.renderOrder = -10; this.cena.add(this.ceu);
    this.fx = new Particulas(this.cena, 420);
    this.pista = new THREE.Group(); this.cena.add(this.pista);
    this.objs = new THREE.Group(); this.cena.add(this.objs);
    this.estado = 'carregando'; this.t = 0; this.entrada = { dir: 0, passos: 0 };
    this.texFolhas = new Map(); this.tremor = 0; this.fov = 58; this.quadros = []; this.tema = null; this.temaAlvo = null;
    this._v = new THREE.Vector3(); this._alvo = new THREE.Vector3();
  }

  async carrega(prog) {
    const ld = new GLTFLoader(); let n = 0;
    await Promise.all(NOMES.map(async (nome) => { const g = await ld.loadAsync(`assets/modelos/${nome}.glb`); MOD[nome] = { cena: g.scene, clips: g.animations }; otimiza(MOD[nome]); prog && prog(++n / NOMES.length); }));
    try { const lista = await (await fetch('assets/palavras/lista.json')).json(); await Promise.all(lista.map((s) => new Promise((ok) => { const im = new Image(); im.onload = () => { IMGS.set(s, im); ok(); }; im.onerror = ok; im.src = `assets/palavras/${s}.png`; }))); } catch (e) { /* sem imagens ainda */ }
    this.criaPersonagens();
  }

  // ---------- personagens ----------
  criaPersonagens() {
    // bola de papel amassado
    const g = new THREE.IcosahedronGeometry(1, 4), p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const d = 1 + 0.07 * Math.sin(7 * v.x + 1.3) * Math.sin(6 * v.y + 2.1) + 0.05 * Math.sin(13 * v.z + 0.7) * Math.sin(9 * v.x) + 0.035 * Math.sin(21 * v.y + 4) * Math.sin(17 * v.z + 1); v.multiplyScalar(d); p.setXYZ(i, v.x, v.y, v.z); }
    g.computeVertexNormals();
    this.cvBola = document.createElement('canvas'); this.cvBola.width = 1024; this.cvBola.height = 512; this.texBola = texCanvas(this.cvBola);
    this.matBola = new THREE.MeshStandardMaterial({ map: this.texBola, flatShading: true, roughness: 0.95, metalness: 0, emissive: 0x000000 });
    this.bola = new THREE.Mesh(g, this.matBola); this.cena.add(this.bola);
    this.escudo = new THREE.Mesh(new THREE.SphereGeometry(1.32, 24, 16), new THREE.MeshBasicMaterial({ color: 0xff2bd6, transparent: true, opacity: 0.3, depthWrite: false }));
    const anel = new THREE.Mesh(new THREE.TorusGeometry(1.36, 0.045, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffe14d })); this.escudo.add(anel); this.anel = anel;
    this.escudo.visible = false; this.cena.add(this.escudo);
    const sm = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });
    this.sombraBola = new THREE.Mesh(new THREE.CircleGeometry(1, 20), sm); this.sombraBola.rotation.x = -Math.PI / 2; this.cena.add(this.sombraBola);
    this.sombraBes = new THREE.Mesh(new THREE.CircleGeometry(0.45, 16), sm); this.sombraBes.rotation.x = -Math.PI / 2; this.cena.add(this.sombraBes);
    // besourinho
    this.bes = new THREE.Group(); const m = MOD.besourinho.cena; m.rotation.y = Math.PI; m.scale.setScalar(0.82); this.bes.add(m); this.cena.add(this.bes);
    this.mixBes = new THREE.AnimationMixer(m); this.acoes = {};
    for (const c of MOD.besourinho.clips) this.acoes[c.name] = this.mixBes.clipAction(c);
    this.acaoAtual = null; this.anima('idle');
    this.limpaBola();
  }
  anima(nome, umaVez = false) {
    const a = this.acoes[nome]; if (!a || a === this.acaoAtual) return;
    a.reset(); a.setLoop(umaVez ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = umaVez; a.fadeIn(0.18).play();
    if (this.acaoAtual) this.acaoAtual.fadeOut(0.18); this.acaoAtual = a;
  }
  limpaBola() {
    const c = this.cvBola.getContext('2d'); c.fillStyle = '#fbfaf4'; c.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 90; i++) this.vinco(c);
    this.texBola.needsUpdate = true;
  }
  vinco(c) { c.strokeStyle = `rgba(120,110,140,${0.08 + Math.random() * 0.16})`; c.lineWidth = 1 + Math.random() * 2; c.beginPath(); let x = Math.random() * 1024, y = Math.random() * 512; c.moveTo(x, y); for (let k = 0; k < 3; k++) { x += (Math.random() - 0.5) * 160; y += (Math.random() - 0.5) * 120; c.lineTo(x, y); } c.stroke(); }
  carimba(p) {
    const c = this.cvBola.getContext('2d'), f = this.canvasFolha(p), x = 90 + Math.random() * 844, y = 110 + Math.random() * 290, s = 0.62 + Math.random() * 0.2;
    c.save(); c.translate(x, y); c.rotate((Math.random() - 0.5) * 1.6); c.scale(s * 1.25, s); c.globalAlpha = 0.93; c.drawImage(f, -128, -160); c.restore();
    c.save(); c.beginPath(); c.rect(x - 130, y - 130, 260, 260); c.clip(); for (let i = 0; i < 12; i++) this.vinco(c); c.restore();
    this.texBola.needsUpdate = true;
  }
  queima() {
    const c = this.cvBola.getContext('2d'), x = 80 + Math.random() * 860, y = 80 + Math.random() * 350, g = c.createRadialGradient(x, y, 4, x, y, 70);
    g.addColorStop(0, 'rgba(30,18,10,.95)'); g.addColorStop(0.5, 'rgba(120,60,10,.7)'); g.addColorStop(1, 'rgba(160,90,20,0)'); c.fillStyle = g; c.fillRect(x - 80, y - 80, 160, 160); this.texBola.needsUpdate = true;
  }

  // ---------- folhas ----------
  canvasFolha(p) {
    const ch = p.w + '|' + p.som; if (this.texFolhas.has(ch)) return this.texFolhas.get(ch).image;
    const c = document.createElement('canvas'); c.width = 256; c.height = 320; const x = c.getContext('2d'), cor = COR_SOM[p.som] || COR_SOM.r;
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 320); x.lineWidth = 16; x.strokeStyle = cor; x.strokeRect(8, 8, 240, 304);
    const im = IMGS.get(slug(p.w)), W = p.w.toUpperCase();
    const cabe = (txt, peso, max, larg) => { let t = max; do { x.font = `${peso} ${t}px ui-rounded, "Arial Rounded MT Bold", "Trebuchet MS", sans-serif`; t -= 2; } while (x.measureText(txt).width > larg && t > 12); };
    x.textAlign = 'center'; x.textBaseline = 'middle';
    if (im) { x.drawImage(im, 38, 26, 180, 180); x.fillStyle = '#2a1b3d'; cabe(W, 800, 46, 212); x.fillText(W, 128, 258); }
    else {
      x.fillStyle = cor + '22'; x.beginPath(); x.arc(128, 122, 84, 0, 7); x.fill();
      x.fillStyle = '#2a1b3d'; cabe(W, 800, 60, 208); x.fillText(W, 128, 124);
      const partes = p.sil.split('-'); cabe(partes.join(' · '), 700, 30, 208); let larg = x.measureText(partes.join(' · ')).width, px = 128 - larg / 2; x.textAlign = 'left';
      partes.forEach((s, i) => { const alvo = s === s.toUpperCase() && /[A-ZÀ-Ú]/.test(s) && partes.length > 1; const t = s.toLowerCase() + (i < partes.length - 1 ? ' · ' : ''); x.fillStyle = alvo ? cor : '#6a5b7d'; x.fillText(t, px, 250); if (alvo) { const w = x.measureText(s.toLowerCase()).width; x.fillRect(px, 268, w, 5); } px += x.measureText(t).width; });
    }
    // selo da letra: forma além da cor
    x.fillStyle = cor; x.beginPath(); if (p.som === 'l') x.rect(196, 20, 42, 42); else x.arc(217, 41, 22, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '800 30px ui-rounded, "Arial Rounded MT Bold", sans-serif'; x.fillText(p.som === 'l' ? 'L' : 'R', 217, 43);
    this.texFolhas.set(ch, texCanvas(c, { anisotropy: 4 })); return c;
  }
  criaFolha(p) {
    this.canvasFolha(p); const g = new THREE.PlaneGeometry(0.98, 1.22, 6, 1), pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, -0.18 * Math.pow(pos.getX(i) / 0.49, 2));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: this.texFolhas.get(p.w + '|' + p.som), side: THREE.DoubleSide }));
    const grp = new THREE.Group(); m.position.y = 0.95; m.rotation.x = -0.12; grp.add(m); grp.userData.folha = m; return grp;
  }

  // ---------- pista ----------
  faixa(larg, y0, altura, ini, fim, passo = 2) {
    const n = Math.ceil((fim - ini) / passo), pos = new Float32Array((n + 1) * 6), uv = new Float32Array((n + 1) * 4), idx = [];
    for (let i = 0; i <= n; i++) { const s = ini + i * passo, h = altura(s) + y0; pos.set([-larg / 2, h, -s, larg / 2, h, -s], i * 6); uv.set([0, s / 8, 1, s / 8], i * 4); if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  montaFase(fase, pista, nivel) {
    this.fase = fase; this.defPista = pista; this.nivel = nivel;
    this.pista.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map && o.userData.descarta) o.material.map.dispose(); });
    this.pista.clear(); this.objs.clear();
    const tema = this.tema = { ...pista.tema }; this.temaAlvo = null;
    const fim = fase.comprimento + 70, geo = this.faixa(LARGURA, 0, fase.altura, -30, fim);
    this.matPista = new THREE.MeshLambertMaterial({ color: tema.pista }); this.pista.add(new THREE.Mesh(geo, this.matPista));
    // marcações: bordas e divisórias de faixa
    const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d'); x.fillStyle = tema.borda; x.fillRect(0, 0, 12, 256); x.fillRect(244, 0, 12, 256);
    x.fillStyle = 'rgba(255,255,255,.34)'; const nf = nivel.faixas; if (nf) for (let k = 1; k < nf; k++) x.fillRect(Math.round(12 + (232 * k) / nf) - 3, 0, 6, 128);
    else for (let k = 0; k < 6; k++) { x.beginPath(); x.arc(32 + k * 38.4, 64, 4, 0, 7); x.fill(); }
    const tex = texCanvas(c, { wrapT: THREE.RepeatWrapping, anisotropy: this.r.capabilities.getMaxAnisotropy() });
    const marcas = new THREE.Mesh(this.faixa(LARGURA, 0.025, fase.altura, -30, fim), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })); marcas.userData.descarta = true; this.pista.add(marcas);
    this.matChao = new THREE.MeshLambertMaterial({ color: tema.chao }); this.pista.add(new THREE.Mesh(this.faixa(260, -0.55, fase.altura, -60, fim + 120, 6), this.matChao));
    // enfeites simples dos dois lados
    const n = Math.floor(fim / 7) * 2, bol = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshLambertMaterial(), n), con = new THREE.InstancedMesh(new THREE.ConeGeometry(0.8, 3, 7), new THREE.MeshLambertMaterial(), n);
    const o = new THREE.Object3D(), cor = new THREE.Color(); let sd = 12345 + fase.seed % 1000; const rd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    for (let i = 0; i < n; i++) {
      const s = -20 + (i >> 1) * 7 + rd() * 5, lado = i % 2 ? 1 : -1, h = fase.altura(s) - 0.55;
      let e = 0.7 + rd() * 1.9; o.position.set(lado * (LARGURA / 2 + 4.5 + e * 1.2 + rd() * 26), h + e * 0.55, -s); o.scale.set(e, e * (0.7 + rd() * 0.5), e); o.rotation.set(0, 0, 0); o.updateMatrix(); bol.setMatrixAt(i, o.matrix); bol.setColorAt(i, cor.set(tema.enfeite[Math.floor(rd() * tema.enfeite.length)]));
      e = 0.8 + rd() * 1.6; o.position.set(lado * (LARGURA / 2 + 5.5 + rd() * 34), h + e * 1.5, -s - 3); o.scale.set(e, e, e); o.updateMatrix(); con.setMatrixAt(i, o.matrix); con.setColorAt(i, cor.set(tema.enfeite[Math.floor(rd() * tema.enfeite.length)]));
    }
    this.pista.add(bol, con); this.enfeites = [bol, con];
    this.aplicaTema(tema);
    this.itens = fase.itens.map((d) => ({ ...d, obj: null, feito: false, criado: false })); this.iProx = 0; this.vivos = [];
  }
  aplicaTema(t) { this.matPista.color.set(t.pista); this.matChao.color.set(t.chao); this.ceu.material.uniforms.topo.value.set(t.ceuTopo); this.ceu.material.uniforms.base.value.set(t.ceuBase); this.cena.fog.color.set(t.ceuBase); }
  trocaTema(alvo) { this.temaDe = { pista: this.matPista.color.clone(), chao: this.matChao.color.clone(), topo: this.ceu.material.uniforms.topo.value.clone(), base: this.ceu.material.uniforms.base.value.clone() }; this.temaAlvo = { pista: new THREE.Color(alvo.pista), chao: new THREE.Color(alvo.chao), topo: new THREE.Color(alvo.ceuTopo), base: new THREE.Color(alvo.ceuBase), t: 0 }; }

  // ---------- objetos da pista ----------
  clona(nome, animIdle = true) {
    const m = MOD[nome], o = m.cena.clone(true), ud = o.userData = { nome };
    if (m.clips.length) { ud.mix = new THREE.AnimationMixer(o); ud.clips = {}; for (const c of m.clips) ud.clips[c.name] = ud.mix.clipAction(c); if (animIdle && ud.clips.idle) { ud.clips.idle.time = Math.random(); ud.clips.idle.play(); } }
    return o;
  }
  tocaClip(o, nome) { const ud = o.userData; if (!ud.clips || !ud.clips[nome]) return; if (ud.clips.idle) ud.clips.idle.fadeOut(0.1); const a = ud.clips[nome]; a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.play(); }
  placa() {
    if (!this.texPlaca) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.lineJoin = 'round'; x.beginPath(); x.moveTo(64, 10); x.lineTo(120, 112); x.lineTo(8, 112); x.closePath(); x.fillStyle = '#ffd23f'; x.fill(); x.lineWidth = 10; x.strokeStyle = '#1b1025'; x.stroke(); x.fillStyle = '#1b1025'; x.fillRect(57, 42, 14, 38); x.beginPath(); x.arc(64, 95, 8, 0, 7); x.fill(); this.texPlaca = texCanvas(c); }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texPlaca })); s.scale.set(0.8, 0.8, 1); return s;
  }
  halo(cor, y) {
    if (!this.texHalo) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 6, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.45, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); this.texHalo = texCanvas(c); }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texHalo, color: cor, transparent: true, depthWrite: false })); s.scale.set(1.15, 1.15, 1); s.position.set(0, y, -0.12); s.renderOrder = -1; return s;
  }
  criaObj(it) {
    const esc = this.nivel.faixas === 3 ? 1.4 : 1; let o;
    switch (it.tipo) {
      case 'folha': o = this.criaFolha(it.p); o.scale.setScalar(esc * 1.3); break;
      case 'triturador': { o = this.clona('triturador'); o.scale.setScalar(esc * 1.12); const p = this.placa(); p.position.y = 1.5; o.add(p); o.userData.placa = p; break; }
      case 'fosforo': o = this.clona('fosforo'); o.scale.setScalar(2.3); break;
      case 'estrela': o = this.clona('estrela'); o.scale.setScalar(1.9); o.add(this.halo(0x8fe9ff, 0.42)); break;
      case 'pocao': o = this.clona('pocao'); o.scale.setScalar(2.4); o.add(this.halo(0xffb3f5, 0.3)); break;
      case 'rampa': o = this.clona('rampa_salto'); o.scale.setScalar(esc); break;
      case 'turbo': o = this.clona('rampa_turbo'); o.scale.setScalar(esc); break;
      case 'portal': o = this.clona(it.som === 'l' ? 'portal_l' : 'portal_r'); o.scale.setScalar(1.04); break;
      case 'chegada': o = this.clona('chegada'); o.scale.setScalar(1.04); break;
      default: return null;
    }
    if (it.tipo === 'rampa' || it.tipo === 'turbo') { const g = new THREE.Group(); o.rotation.y = Math.PI; g.add(o); g.scale.copy(o.scale); o.scale.setScalar(1); g.userData = o.userData; o = g; } // modelos apontam para +Z; a corrida vai para -Z
    const h = this.fase.altura(it.s); o.position.set(it.x, h, -it.s); o.rotation.x = Math.atan(this.fase.inclina(it.s)); o.userData.fase = Math.random() * 6;
    this.objs.add(o); return o;
  }

  // ---------- estados ----------
  menu(fase, pista, nivel) { this.montaFase(fase, pista, nivel); this.zera(); this.estado = 'menu'; this.anima('idle'); }
  zera() {
    this.s = 0; this.x = 0; this.vel = 0; this.pontos = 20; this.pontosFala = 0; this.pulo = 0; this.vy = 0; this.boost = 0; this.turbo = 0; this.escT = 0; this.inv = 0; this.raio = raioDe(20); this.pop = 0; this.achata = 0;
    this.faixaAtual = this.fase.xs.length >> 1; this.feitas = new Set(); this.registro = []; this.tempo = 0; this.batidas = 0; this.rotBola = new THREE.Quaternion(); this.bola.visible = true; this.escudo.visible = false; this.entrada.passos = 0; this.limpaBola();
    this.som = 'r'; this.fimT = 0; this.cam.position.set(0, 3.2, 7); this.tremor = 0;
  }
  comeca(fase, pista, nivel) { this.montaFase(fase, pista, nivel); this.zera(); this.contagem(); }
  contagem() { this.estado = 'contagem'; this.contT = 0; this.contN = 4; this.anima('idle'); }
  pausa(v) { if (v && (this.estado === 'correndo' || this.estado === 'contagem')) { this.antes = this.estado; this.estado = 'pausa'; Audio.calaLacos(); } else if (!v && this.estado === 'pausa') { this.estado = this.antes === 'correndo' ? 'contagem' : this.antes; if (this.estado === 'contagem') { this.contT = 0; this.contN = 4; } } }

  // usado nos testes: salta para um ponto da pista
  teleporta(s, x = 0) { this.s = s; this.x = x; this.objs.clear(); this.vivos = []; let i = this.itens.findIndex((q) => q.s > s - 10); this.iProx = i < 0 ? this.itens.length : i; for (const it of this.itens) { it.obj = null; if (it.s > s) it.feito = false; } const k = this.fase.xs.indexOf(x); if (k >= 0) this.faixaAtual = k; this.snap = true; }

  fimExercicio(res) {
    const it = this.pendente; this.pendente = null; if (!it) return;
    this.feitas.add(it.p.w); this.registro.push({ w: it.p.w, som: it.p.som, ...res });
    this.ganha(res.pontos, it); this.pontosFala += res.pontos; this.contagem();
  }
  ganha(pts, it) { this.pontos += pts; if (it && it.obj) it.voa = 0.0001; this.cb.onTexto(`+${pts}`, 'bom'); }

  // ---------- quadro ----------
  quadro(dt, manual = false) {
    if (this.congela && !manual) return; this.t += dt; const e = this.estado, f = this.fase; if (!f || !this.bola) { this.r.render(this.cena, this.cam); return; }
    if (e === 'contagem') { this.contT -= dt; if (this.contT <= 0) { this.contN--; this.contT = 0.72; if (this.contN > 0) { this.cb.onContagem(this.contN); Audio.toca('bipe'); } else { this.cb.onContagem(0); Audio.toca('bipe', { tom: 1.5 }); this.estado = 'correndo'; this.anima('push_walk'); } } }
    if (e === 'correndo') this.corre(dt);
    else { Audio.laco('rolar', 0); Audio.laco('triturador_aviso', 0); }
    if (e === 'vitoria' || e === 'derrota') { this.fimT += dt; if (e === 'vitoria') { this.vel = Math.max(0, this.vel - dt * 9); this.s += this.vel * dt; this.gira(this.vel * dt, 0); if (Math.random() < dt * 14 && !this.reduz) this.confete(); } if (this.fimT > 2.7 && !this.avisou) { this.avisou = true; this.cb.onFim(this.resumo(e === 'vitoria')); } }
    this.spawn(); this.animaObjs(dt, e);
    // tema em transição (portais)
    if (this.temaAlvo) { const a = this.temaAlvo, d = this.temaDe; a.t = Math.min(1, a.t + dt * 1.6); this.matPista.color.lerpColors(d.pista, a.pista, a.t); this.matChao.color.lerpColors(d.chao, a.chao, a.t); this.ceu.material.uniforms.topo.value.lerpColors(d.topo, a.topo, a.t); this.ceu.material.uniforms.base.value.lerpColors(d.base, a.base, a.t); this.cena.fog.color.copy(this.ceu.material.uniforms.base.value); if (a.t >= 1) this.temaAlvo = null; }
    this.posiciona(dt, e); this.fx.atualiza(dt); this.mixBes.update(dt * (e === 'correndo' ? limita(this.vel / 7.5, 0.6, 2.2) : 1));
    if (!this.semRender) this.r.render(this.cena, this.cam); this.medeQuadro(dt);
  }

  corre(dt) {
    const f = this.fase, n = this.nivel, en = this.entrada; this.tempo += dt;
    // lateral
    const lim = LARGURA / 2 - 0.55, x0 = this.x;
    if (n.faixas) { while (en.passos) { const d = Math.sign(en.passos); en.passos -= d; const nv = limita(this.faixaAtual + d, 0, f.xs.length - 1); if (nv !== this.faixaAtual) { this.faixaAtual = nv; Audio.toca('ui_mover', { vol: 0.5, tom: 1.3 }); } } const alvo = f.xs[this.faixaAtual]; this.x += limita(alvo - this.x, -13 * dt, 13 * dt); }
    else { en.passos = 0; this.x = limita(this.x + en.dir * 7.2 * dt, -lim, lim); }
    // velocidade
    const incl = f.inclina(this.s), prog = this.s / f.comprimento;
    const alvoV = n.vel * (1 + 0.12 * prog) * limita(1 - incl * 1.7, 0.78, 1.25) * Math.min(1.7, (this.boost > 0 ? 1.45 : 1) * (this.turbo > 0 ? 1.4 : 1));
    this.vel += (alvoV - this.vel) * Math.min(1, dt * 2.6); const sAnt = this.s; this.s += this.vel * dt;
    // pulo
    if (this.pulo > 0 || this.vy > 0) { this.vy -= G * dt; this.pulo += this.vy * dt; if (this.pulo <= 0) { this.pulo = 0; this.vy = 0; this.achata = 1; Audio.toca('pouso'); this.fx.emite(this.reduz ? 4 : 12, this.bola.position.clone().setY(f.altura(this.s) + 0.1), { cores: [0xffffff, 0xffe9b0], vel: [0, 1.5, 0], rnd: 4, vida: 0.5, tam: [0.12, 0.12] }); this.tremor = Math.max(this.tremor, 0.2); } }
    this.gira(this.s - sAnt, this.x - x0);
    // temporizadores
    if (this.boost > 0) { this.boost -= dt; this.rastro(0x39c6ff); }
    if (this.turbo > 0) { this.turbo -= dt; this.rastro(0xffe14d); }
    if (this.escT > 0) { this.escT -= dt; if (this.escT <= 0) { this.escudo.visible = false; Audio.toca('escudo_off'); } }
    if (this.inv > 0) this.inv -= dt;
    // colisões
    const r = this.raio, rP = Math.min(r, 0.55), noChao = this.pulo < 0.55; let perto = 99;
    for (const it of this.vivos) {
      if (it.feito) continue; const ds = it.s - this.s;
      if (it.tipo === 'triturador' && ds > 0) perto = Math.min(perto, ds);
      if (ds < -2.5) { it.feito = true; if (it.par === 'alvo') this.cb.onAviso(null); continue; }
      if (it.tipo === 'aviso_par') { if (ds < 0) { it.feito = true; this.cb.onAviso(it.alvo); } continue; }
      if (it.tipo === 'portal') { if (ds < 0) { it.feito = true; this.passaPortal(it); } continue; }
      if (it.tipo === 'chegada') { if (ds < 0) { it.feito = true; this.vence(it); } continue; }
      const prof = it.tipo === 'folha' ? 0.5 + r * 0.5 : it.tipo === 'rampa' || it.tipo === 'turbo' ? 0.9 : 0.45 + rP * 0.6;
      if (it.s > this.s + prof || it.s < sAnt - prof) continue;
      const dx = Math.abs(this.x - it.x), esc = n.faixas === 3 ? 1.4 : 1;
      switch (it.tipo) {
        case 'folha': if (dx < 0.52 * esc + r * 0.62) this.pegaFolha(it); break;
        case 'triturador': if (noChao && dx < 0.56 * esc + rP * 0.55) this.bate(it); break;
        case 'fosforo': if (noChao && dx < 0.2 + rP * 0.8) this.bate(it); break;
        case 'estrela': if (dx < 0.5 + r * 0.6) { it.feito = true; this.boost = 4.5; Audio.toca('estrela'); this.tocaClip(it.obj, 'collect'); it.some = 0.6; this.cb.onTexto('Mais rápido!', 'azul'); this.brilho(it.obj.position, [0x39c6ff, 0xffffff, 0x0a66ff]); } break;
        case 'pocao': if (dx < 0.5 + r * 0.6) { it.feito = true; this.escT = n.escudo; this.escudo.visible = true; Audio.toca('escudo_on'); this.tocaClip(it.obj, 'collect'); it.some = 0.6; this.cb.onTexto('Campo de força!', 'rosa'); this.brilho(it.obj.position, [0xff2bd6, 0xffe14d]); } break;
        case 'rampa': if (this.pulo <= 0.01 && dx < 0.62 * esc) { it.feito = true; const T = limita(9.5 / this.vel, 0.75, 1.5); this.vy = G * T / 2; this.pulo = 0.02; Audio.toca('salto'); } break;
        case 'turbo': if (this.pulo <= 0.3 && dx < 0.62 * esc) { it.feito = true; this.turbo = 2.2; Audio.toca('estrela', { tom: 1.35 }); this.cb.onTexto('Turbo!', 'azul'); } break;
      }
      if (this.estado !== 'correndo') return;
    }
    Audio.laco('rolar', this.pulo > 0.1 ? 0 : limita(this.vel / 14, 0.15, 0.7), 0.75 + this.vel / 22);
    Audio.laco('triturador_aviso', perto < 34 ? Math.pow(1 - perto / 34, 1.5) * 0.65 : 0);
    this.cb.onHud(this);
  }
  gira(ds, dx) { const r = Math.max(this.raio, 0.3), q = new THREE.Quaternion(); q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -ds / r); this.rotBola.premultiply(q); q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -dx / r); this.rotBola.premultiply(q); }
  rastro(cor) { if (this.reduz || Math.random() > 0.6) return; this.fx.emite(1, { x: (Math.random() - 0.5) * 9, y: this.fase.altura(this.s) + 0.3 + Math.random() * 3, z: -this.s - 26 }, { cores: [cor, 0xffffff], esp: 0, vel: [0, 0, this.vel * 2.2], rnd: 0, grav: 0, vida: 0.7, tam: [0.05, 2.2], fixo: [Math.PI / 2, 0, 0] }); }
  brilho(p, cores) { this.fx.emite(this.reduz ? 8 : 26, p.clone().setY(p.y + 0.7), { cores, vel: [0, 3, -this.vel * 0.6], rnd: 6, grav: 6, vida: 0.7, tam: [0.16, 0.16] }); }
  confete() { this.fx.emite(10, { x: (Math.random() - 0.5) * 6, y: this.fase.altura(this.s) + 3.4, z: -this.s - 2 - Math.random() * 6 }, { cores: [0xff2bd6, 0xffe14d, 0x39c6ff, 0x7ae582, 0xff7b00], vel: [0, 2, 0], rnd: 5, grav: 5, vida: 1.8, tam: [0.2, 0.1] }); }

  pegaFolha(it) {
    it.feito = true;
    if (it.par === 'outro') { it.some = 0.5; this.cb.onTexto(`Essa é ${it.p.w.toUpperCase()}`, 'azul'); this.cb.onAviso(null); return; }
    if (it.par === 'alvo') this.cb.onAviso(null);
    if (this.feitas.has(it.p.w)) { this.ganha(2, it); Audio.toca('repetida'); return; }
    this.pendente = it; this.estado = 'exercicio'; this.anima('idle'); Audio.calaLacos(); Audio.toca('popup'); this.cb.onExercicio(it.p, it);
  }
  bate(it) {
    it.feito = true; const pos = it.obj.position.clone();
    if (this.escT > 0) { it.some = 0.25; Audio.toca('escudo_on', { tom: 1.7, vol: 0.7 }); this.brilho(pos, [0xff2bd6, 0xffffff]); this.tremor = 0.25; return; }
    if (this.inv > 0) return;
    this.batidas++; this.tocaClip(it.obj, 'hit');
    if (it.tipo === 'triturador') { this.pontos = this.pontos / 2; Audio.toca('triturador_hit'); this.fx.emite(this.reduz ? 18 : 70, pos.setY(pos.y + 0.8), { cores: [0xffffff, 0xf3efe4, 0xe6e0f0], vel: [0, 5, -this.vel * 0.5], rnd: 7, grav: 11, vida: 1.3, tam: [0.34, 0.05] }); this.tremor = 0.7; this.vel *= 0.5; this.inv = 1.7; this.cb.onTexto('Cuidado com o triturador!', 'alerta'); if (it.obj.userData.placa) it.obj.userData.placa.visible = false; }
    else { this.pontos -= 5; Audio.toca('fosforo'); this.queima(); this.fx.emite(this.reduz ? 10 : 34, pos.setY(pos.y + 0.9), { cores: [0xff7b00, 0xffd23f, 0xff3b1f], vel: [0, 4, -this.vel * 0.4], rnd: 5, grav: 4, vida: 0.7, tam: [0.09, 0.09] }); this.fx.emite(this.reduz ? 3 : 9, pos, { cores: [0x3a3340, 0x5a5060], vel: [0, 2.2, 0], rnd: 1.2, grav: -1.5, vida: 1.1, tam: [0.3, 0.3] }); this.tremor = 0.4; this.vel *= 0.75; this.inv = 1.2; this.cb.onTexto('Queimou uma folha', 'alerta'); }
    if (this.pontos < 5) this.perde();
  }
  passaPortal(it) { this.som = it.som; Audio.toca('portal'); this.tocaClip(it.obj, 'pass'); this.trocaTema(it.som === 'l' ? this.defPista.temaL : this.defPista.tema); this.cb.onPortal(it.som); if (!this.reduz) this.brilho(this.bola.position, it.som === 'l' ? [0x0a66ff, 0xffffff, 0x39c6ff] : [0xe6007e, 0xffffff, 0xff8fab]); }
  vence(it) { this.estado = 'vitoria'; this.fimT = 0; this.avisou = false; this.anima('idle'); this.tocaClip(it.obj, 'win'); Audio.calaLacos(); Audio.toca('vitoria'); this.cb.onAviso(null); for (let k = 0; k < 4; k++) this.confete(); }
  perde() { this.estado = 'derrota'; this.fimT = 0; this.avisou = false; this.bola.visible = false; this.escudo.visible = false; Audio.calaLacos(); Audio.toca('desfaz'); Audio.toca('derrota', { atraso: 0.55 }); this.anima('defeated', true); this.cb.onAviso(null);
    this.fx.emite(this.reduz ? 24 : 90, this.bola.position, { cores: [0xffffff, 0xf3efe4], vel: [0, 4, 0], rnd: 7, grav: 9, vida: 1.8, tam: [0.4, 0.3] }); this.tremor = 0.5; }
  resumo(vitoria) { return { vitoria, pontos: Math.round(this.pontos), raio: this.raio, palavras: this.registro, pontosFala: this.pontosFala, tempo: this.tempo, batidas: this.batidas, total: this.fase.palavrasNovas.length }; }

  spawn() {
    const lim = this.s + 100; while (this.iProx < this.itens.length && this.itens[this.iProx].s < lim) { const it = this.itens[this.iProx++]; it.obj = this.criaObj(it); this.vivos.push(it); }
    if (this.vivos.length && this.vivos[0].s < this.s - 14) { const it = this.vivos.shift(); if (it.obj) this.objs.remove(it.obj); it.obj = null; }
  }
  animaObjs(dt, e) {
    const t = this.t;
    for (const it of this.vivos) {
      const o = it.obj; if (!o) continue; if (o.userData.mix && it.s - this.s < 70) o.userData.mix.update(dt);
      if (it.tipo === 'folha' && !it.voa) { const m = o.userData.folha; m.position.y = 0.95 + Math.sin(t * 2.4 + o.userData.fase) * 0.1; m.rotation.y = Math.sin(t * 1.7 + o.userData.fase) * 0.28; }
      if (it.tipo === 'estrela' || it.tipo === 'pocao') o.position.y = this.fase.altura(it.s) + 0.25 + Math.sin(t * 3 + o.userData.fase) * 0.12;
      if (it.voa) { // a folha amassa e gruda na bola
        it.voa += dt; const k = Math.min(1, it.voa / 0.38); o.position.lerp(this.bola.position, k * 0.5); o.scale.setScalar(Math.max(0.02, (1 - k) * 1.1)); o.rotation.z += dt * 14; o.rotation.x += dt * 9;
        if (k >= 1) { this.objs.remove(o); it.obj = null; it.voa = 0; this.carimba(it.p); this.pop = 1; Audio.toca('coletar'); this.fx.emite(this.reduz ? 4 : 12, this.bola.position, { cores: [0xffffff, COR_SOM[it.p.som] || 0xffffff], vel: [0, 2.5, -this.vel * 0.5], rnd: 4, vida: 0.6, tam: [0.16, 0.08] }); }
      }
      if (it.some) { it.some -= dt; o.scale.multiplyScalar(Math.max(0, 1 - dt * 5)); o.position.y += dt * 2.5; if (it.some <= 0) { this.objs.remove(o); it.obj = null; it.some = 0; } }
    }
  }
  posiciona(dt, e) {
    const f = this.fase, alvoR = raioDe(this.pontos); this.raio = lerp(this.raio, alvoR, Math.min(1, dt * 5)); const r = this.raio;
    this.pop = Math.max(0, this.pop - dt * 4); this.achata = Math.max(0, this.achata - dt * 5);
    const hB = f.altura(this.s), wob = 1 + Math.sin(this.pop * Math.PI) * 0.16, ach = 1 - Math.sin(this.achata * Math.PI) * 0.22;
    this.bola.position.set(this.x, hB + r * 0.96 * ach + this.pulo, -this.s); this.bola.scale.set(r * wob / Math.sqrt(ach), r * wob * ach, r * wob / Math.sqrt(ach)); this.bola.quaternion.copy(this.rotBola);
    this.matBola.emissive.setRGB(this.inv > 0 ? 0.5 * (0.5 + 0.5 * Math.sin(this.t * 22)) : 0, 0, 0);
    if (this.escudo.visible) { const pisca = this.escT < 1.6 ? 0.5 + 0.5 * Math.sin(this.t * 16) : 1; this.escudo.position.copy(this.bola.position); this.escudo.scale.setScalar(r * (1 + Math.sin(this.t * 6) * 0.04)); this.escudo.material.opacity = 0.14 + 0.2 * pisca; this.anel.rotation.set(this.t * 1.7, this.t * 2.3, 0); this.anel.visible = pisca > 0.4; }
    this.sombraBola.position.set(this.x, hB + 0.04, -this.s); this.sombraBola.scale.setScalar(r * 0.95 / (1 + this.pulo * 0.5)); this.sombraBola.visible = this.bola.visible;
    const sB = this.s - r - 0.3, hBes = f.altura(sB), menu = e === 'menu';
    this.bes.position.set(this.x + (menu ? 0 : 0), hBes + (this.pulo > 0 ? Math.min(0.35, this.pulo * 0.3) : 0), -sB); this.bes.rotation.x = Math.atan(f.inclina(sB));
    this.bes.rotation.z = lerp(this.bes.rotation.z, limita((f.xs[this.faixaAtual] !== undefined && this.nivel.faixas ? f.xs[this.faixaAtual] - this.x : this.entrada.dir) * -0.25, -0.3, 0.3), Math.min(1, dt * 8));
    this.sombraBes.position.set(this.x, hBes + 0.04, -sB);
    // câmera
    const retrato = this.cam.aspect < 1, cam = this.cam;
    if (menu) { const a = Math.sin(this.t * 0.35) * 0.45; if (retrato) { this._alvo.set(1.2 + a, hBes + 2.2, -sB + 5.6); cam.position.lerp(this._alvo, Math.min(1, dt * 2)); cam.lookAt(0, hBes + 3.0, -this.s); } else { this._alvo.set(-1.2 + a, hBes + 1.35, -sB + 3.4); cam.position.lerp(this._alvo, Math.min(1, dt * 2)); cam.lookAt(-2.3, hBes + 0.9, -this.s - 2.2); } }
    else {
      const dist = (retrato ? 6.6 : 4.3) + r * 1.9, alt = (retrato ? 5.0 : 3.3) + r * 1.5, hC = f.altura(sB - 1);
      this._alvo.set(this.x * 0.55, hC + alt, -sB + dist); cam.position.lerp(this._alvo, this.snap ? 1 : 1 - Math.exp(-dt * 7)); this.snap = false;
      if (this.tremor > 0) { this.tremor = Math.max(0, this.tremor - dt * 1.6); if (!this.reduz) { cam.position.x += (Math.random() - 0.5) * this.tremor * 0.35; cam.position.y += (Math.random() - 0.5) * this.tremor * 0.35; } }
      cam.lookAt(this.x * 0.72, f.altura(this.s + 6) + 0.5 + r * 0.4, -this.s - 6);
    }
    const fovAlvo = (retrato ? 74 : 58) + (this.boost > 0 || this.turbo > 0 ? (this.reduz ? 3 : 9) : 0);
    if (Math.abs(fovAlvo - this.fov) > 0.05) { this.fov = lerp(this.fov, fovAlvo, Math.min(1, dt * 4)); cam.fov = this.fov; cam.updateProjectionMatrix(); }
    this.ceu.position.copy(cam.position);
  }

  redimensiona(w, h) { this.r.setSize(w, h, false); this.cam.aspect = w / h; this.fov = 0; this.cam.updateProjectionMatrix(); }
  defineQualidade(q) { this.qualidade = q; this.dpr = q === 'baixa' ? 1 : Math.min(window.devicePixelRatio || 1, q === 'alta' ? 2.5 : 2); this.r.setPixelRatio(this.dpr); this.redimensiona(this.canvas.clientWidth, this.canvas.clientHeight); }
  // qualidade automática: se os quadros ficarem lentos, reduz a resolução
  medeQuadro(dt) {
    this.quadros.push(dt); if (this.quadros.length < 90) return; const m = this.quadros.reduce((a, b) => a + b, 0) / this.quadros.length; this.quadros.length = 0; this.fps = 1 / m;
    if (this.qualidade === 'auto' && m > 1 / 34 && this.dpr > 1) { this.dpr = Math.max(1, this.dpr - 0.5); this.r.setPixelRatio(this.dpr); this.redimensiona(this.canvas.clientWidth, this.canvas.clientHeight); }
  }
}
