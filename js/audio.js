// Áudio: efeitos, laços e música com Web Audio.
const SFX = ['coletar', 'repetida', 'rolar', 'desfaz', 'triturador_aviso', 'triturador_hit', 'fosforo', 'estrela', 'escudo_on', 'escudo_off', 'salto', 'pouso', 'portal',
  'ui_mover', 'ui_ok', 'popup', 'bipe', 'gravar_on', 'gravar_off', 'nota10', 'nota5', 'nota2', 'vitoria', 'derrota'];
const MUS = ['menu', 'pista'];

export const Audio = {
  ctx: null, bufs: {}, mestre: null, gSfx: null, gMus: null, gMusDuck: null, lacos: {}, musAtual: null, musNome: '',
  cfg: { musica: true, efeitos: true, volMusica: 0.55, volEfeitos: 0.9 },

  inicia() {
    if (this.ctx) return;
    const C = window.AudioContext || window.webkitAudioContext; this.ctx = new C();
    this.mestre = this.ctx.createGain(); this.mestre.connect(this.ctx.destination);
    this.gSfx = this.ctx.createGain(); this.gSfx.connect(this.mestre);
    this.gMus = this.ctx.createGain(); this.gMusDuck = this.ctx.createGain(); this.gMus.connect(this.gMusDuck); this.gMusDuck.connect(this.mestre);
    this.aplica();
    const destrava = () => { if (this.ctx.state !== 'running') this.ctx.resume(); };
    ['pointerdown', 'keydown', 'touchend'].forEach((e) => window.addEventListener(e, destrava, { passive: true }));
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.ctx.suspend(); else this.ctx.resume(); });
  },
  aplica() { if (!this.ctx) return; this.gSfx.gain.value = this.cfg.efeitos ? this.cfg.volEfeitos : 0; this.gMus.gain.value = this.cfg.musica ? this.cfg.volMusica : 0; },

  async carrega(prog) {
    this.inicia();
    const lista = SFX.map((n) => ['sfx_' + n, `assets/audio/sfx_${n}.wav`]).concat(MUS.map((n) => ['musica_' + n, `assets/audio/musica_${n}.mp3`]));
    let feitos = 0;
    await Promise.all(lista.map(async ([nome, url]) => {
      try { const ab = await (await fetch(url)).arrayBuffer(); this.bufs[nome] = await new Promise((ok, erro) => this.ctx.decodeAudioData(ab, ok, erro)); }
      catch (e) { console.warn('Áudio não carregado:', nome); }
      prog && prog(++feitos / lista.length);
    }));
  },

  toca(nome, { vol = 1, tom = 1, atraso = 0 } = {}) {
    const b = this.bufs['sfx_' + nome]; if (!b || !this.ctx || this.ctx.state !== 'running') return;
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain(); s.buffer = b; s.playbackRate.value = tom; g.gain.value = vol;
    s.connect(g); g.connect(this.gSfx); s.start(this.ctx.currentTime + atraso);
  },
  // laço contínuo com volume e tom controlados a cada quadro
  laco(nome, vol, tom = 1) {
    if (!this.ctx) return; let l = this.lacos[nome];
    if (!l) { const b = this.bufs['sfx_' + nome]; if (!b) return; const s = this.ctx.createBufferSource(), g = this.ctx.createGain(); s.buffer = b; s.loop = true; g.gain.value = 0; s.connect(g); g.connect(this.gSfx); s.start(); l = this.lacos[nome] = { s, g }; }
    const t = this.ctx.currentTime; l.g.gain.setTargetAtTime(vol, t, 0.08); l.s.playbackRate.setTargetAtTime(tom, t, 0.08);
  },
  calaLacos() { for (const k of Object.keys(this.lacos)) this.lacos[k].g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05); },

  musica(nome) {
    if (!this.ctx || this.musNome === nome) return; this.musNome = nome; const t = this.ctx.currentTime;
    if (this.musAtual) { const a = this.musAtual; a.g.gain.setTargetAtTime(0, t, 0.25); setTimeout(() => { try { a.s.stop(); } catch (e) {} }, 1500); this.musAtual = null; }
    const b = this.bufs['musica_' + nome]; if (!b) return;
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain(); s.buffer = b; s.loop = true; g.gain.value = 0; g.gain.setTargetAtTime(1, t, 0.4); s.connect(g); g.connect(this.gMus); s.start(); this.musAtual = { s, g };
  },
  // abaixa a música (exercício de fala: silêncio total para não entrar no microfone)
  abafa(v, tempo = 0.15) { if (this.ctx) this.gMusDuck.gain.setTargetAtTime(v, this.ctx.currentTime, tempo); },
};
