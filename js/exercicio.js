// Exercício de fala: pop-up da palavra, gravação com onda sonora, treino e nota.
// A nota é sempre do fonoaudiólogo (ou fixa no modo sem análise). No modo "Automático (em teste)" o detector
// mostra um palpite na hora da nota; o fono confere e decide.
import { Audio } from './audio.js';
import { silabaAlvo, vozPalavra, vozSilaba, slug } from './dados.js';
import { referencia, avalia, analisavel, MSG_ENCONTRO } from './analise.js';

const $ = (s) => document.querySelector(s);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const MSG = { 10: ['Incrível!', 'Perfeito!', 'Que R lindo!'], 5: ['Quase lá!', 'Muito bem, está chegando!', 'Boa! Só mais um pouquinho.'], 2: ['Boa tentativa!', 'Valeu o esforço!', 'Continue assim, você consegue!'], livre: ['Valeu o esforço!', 'Continue assim, você consegue!'] };
// arquivo de voz de cada mensagem (mesma ordem das listas acima)
const VOZ_MSG = { 10: ['fr_n10_a', 'fr_n10_b', 'fr_n10_c'], 5: ['fr_n5_a', 'fr_n5_b', 'fr_n5_c'], 2: ['fr_n2_a', 'fr_n2_b', 'fr_n2_c'], livre: ['fr_n2_b', 'fr_n2_c'] };
const sorteio = (l) => l[Math.floor(Math.random() * l.length)];
const NOTA_NOME = { 10: 'Perfeito', 5: 'Quase', 2: 'Ainda não' }, CONF_NOME = { alta: 'confiança alta', media: 'confiança média', baixa: 'confiança baixa' };

// modelo da Dálete (fala normal) de cada palavra, calculado uma vez
const REFS = new Map();
function refPalavra(p) {
  const k = slug(p.w); if (!REFS.has(k)) REFS.set(k, Audio.carregaVoz(vozPalavra(p, 'n')).then((b) => (b ? referencia(b.getChannelData(0), b.sampleRate, p) : null)).catch(() => null));
  return REFS.get(k);
}
const PONTOS_LIVRE = 5, PONTOS_TREINO = 5;

// vídeos da boquinha: um por sílaba (ra, re, pra...). Sem o vídeo exato, usa a mesma vogal com R ou L.
let BOCAS = new Set(), bocaPadrao = null;
fetch('assets/boca/lista.json').then((r) => r.json()).then((l) => (BOCAS = new Set(l))).catch(() => {});
function videoBoca(p) {
  const s = silabaAlvo(p).normalize('NFD').replace(/[\u0300-\u036f]/g, ''), m = s.match(/^([^aeiou]*)([aeiou])/); if (!m) return null;
  for (const k of [m[1] + m[2], (p.som === 'l' ? 'l' : 'r') + m[2], (p.som === 'l' ? 'l' : 'r') + 'a']) if (BOCAS.has(k)) return k;
  return null;
}
function mostraBoca(p) {
  const b = $('#exBoca'); if (bocaPadrao === null) bocaPadrao = b.innerHTML; const k = videoBoca(p);
  if (!k) { b.innerHTML = bocaPadrao; b.classList.remove('com-video'); return; }
  b.classList.add('com-video'); b.innerHTML = `<video autoplay loop muted playsinline aria-label="Boca falando ${k}"><source src="assets/boca/${k}.mp4" type="video/mp4"><source src="assets/boca/${k}.webm" type="video/webm"></video>`;
  const v = b.querySelector('video'); v.playbackRate = 0.85; v.play().catch(() => {});
}

export const Mic = {
  stream: null, an: null, estado: 'nao',  // nao | ok | negado | sem
  suportado: () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
  async liga() {
    if (!this.suportado()) { this.estado = 'sem'; return false; }
    try { this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      Audio.inicia(); const src = Audio.ctx.createMediaStreamSource(this.stream); this.src = src; this.an = Audio.ctx.createAnalyser(); this.an.fftSize = 1024; src.connect(this.an); this.estado = 'ok'; return true; }
    catch (e) { this.estado = 'negado'; return false; }
  },
  // captura o som cru (para o detector), independente do formato do MediaRecorder de cada navegador
  captura() {
    if (!this.src || !Audio.ctx.createScriptProcessor) return null;
    const sp = Audio.ctx.createScriptProcessor(4096, 1, 1), mudo = Audio.ctx.createGain(), partes = []; let ativo = false; mudo.gain.value = 0;
    sp.onaudioprocess = (e) => { if (ativo) partes.push(new Float32Array(e.inputBuffer.getChannelData(0))); };
    this.src.connect(sp); sp.connect(mudo); mudo.connect(Audio.ctx.destination);
    return { liga: () => (ativo = true), fim: () => { ativo = false; try { this.src.disconnect(sp); sp.disconnect(); mudo.disconnect(); } catch (e) {} const n = partes.reduce((a, x) => a + x.length, 0), y = new Float32Array(n); let o = 0; for (const x of partes) { y.set(x, o); o += x.length; } return { y, sr: Audio.ctx.sampleRate }; } };
  },
  nivel() { if (!this.an) return 0; const b = new Float32Array(this.an.fftSize); this.an.getFloatTimeDomainData(b); let s = 0; for (let i = 0; i < b.length; i++) s += b[i] * b[i]; return Math.sqrt(s / b.length); },
};

export const Exercicio = {
  cfg: null, token: 0,
  // abre o pop-up e devolve { pontos, nota, treino, modo }
  abre(p, cfg, desenhaFolha) {
    this.cfg = cfg; this.p = p; this.treinou = false; this.token++; this.tentativas = 0; this.gravou = false; this.palpite = null;
    if (cfg.avalia === 'auto' && !cfg.rapido && !cfg.semMic && analisavel(p)) refPalavra(p);
    const cv = $('#exFolha'); cv.getContext('2d').drawImage(desenhaFolha(p), 0, 0);
    $('#exPalavra').innerHTML = this.silabada(p) + `<button class="ouvir" id="exOuvirPal" aria-label="Ouvir a palavra">${ic('som')}</button>`; mostraBoca(p);
    $('#exOuvirPal').onclick = () => Audio.fala(vozPalavra(p, 'n'));
    Audio.fala(vozPalavra(p, 'n'), { atraso: 0.45 });
    $('#tExercicio').hidden = false; Audio.abafa(0);
    return new Promise((ok) => { this.ok = (res) => { Audio.calaVoz(); $('#tExercicio').hidden = true; Audio.abafa(1, 0.5); ok(res); }; cfg.rapido ? this.telaRapida() : cfg.semMic ? this.telaSemMicAvatar() : this.telaInicio(); });
  },
  silabada(p) { const ps = p.sil.split('-'); return ps.map((s) => (s === s.toUpperCase() && /[A-ZÀ-Ú]/.test(s) && ps.length > 1 ? `<u>${s.toLowerCase()}</u>` : s.toLowerCase())).join('<small>·</small>'); },
  poe(html) { const e = $('#exPasso'); e.innerHTML = html; const b = e.querySelector('[data-foco]') || e.querySelector('button'); if (b) b.focus({ preventScroll: true }); return e; },
  fono() { return this.cfg.avalia === 'fono' || this.cfg.avalia === 'auto'; },
  auto() { return this.cfg.avalia === 'auto'; },

  telaRapida() {
    if (this.fono()) { this.poe(`<p class="fraco">Exercício rápido: escolha a nota.</p>${this.htmlNotas()}`); this.ligaNotas(); }
    else { const e = this.poe('<div class="ex-botoes"><button class="btn grande pri" data-foco>Falei!</button></div>'); e.querySelector('button').onclick = () => this.fecha(PONTOS_LIVRE, null); }
  },
  // avatar marcado com "exercício sem microfone": treino e nota pela observação, sem gravar
  telaSemMicAvatar(aviso = '') {
    const e = this.poe(`${aviso ? `<div class="ex-aviso">${aviso}</div>` : ''}<div class="ex-botoes"><button class="btn grande azul" id="exTreino">${ic('ouvido')} Treino${this.treinou ? ' (feito)' : ''}</button></div>
      ${this.fono() ? `<p class="fraco" style="margin:0">Exercício sem microfone: dê a nota pela observação (teclas 1, 2 e 3).</p>${this.htmlNotas()}` : '<button class="btn grande pri" id="exFim" data-foco>Pronto!</button>'}`);
    e.querySelector('#exTreino').onclick = () => this.treino(0); this.voltaTreino = () => this.telaSemMicAvatar('Treino completo! Mais 5 pontos.');
    if (this.fono()) this.ligaNotas(); else e.querySelector('#exFim').onclick = () => this.fecha(PONTOS_LIVRE, null);
  },
  telaInicio(aviso = '') {
    this.voltaTreino = null;
    const semMic = Mic.estado !== 'ok';
    const e = this.poe(`${aviso ? `<div class="ex-aviso">${aviso}</div>` : ''}
      <div class="ex-botoes">
        <button class="btn grande pri ${semMic ? 'desligado' : ''}" id="exFalar" data-foco>${ic('mic')} Pronunciar</button>
        <button class="btn grande azul" id="exTreino">${ic('ouvido')} Treino${this.treinou ? ' (feito)' : ''}</button>
      </div>
      ${this.treinou ? '<button class="btn verde" id="exSeguir">Continuar a corrida</button>' : ''}
      ${semMic && this.fono() ? '<button class="link" id="exDireto">Sem microfone: dar a nota direto</button>' : ''}`);
    e.querySelector('#exFalar').onclick = () => (semMic ? this.telaSemMic() : this.grava());
    e.querySelector('#exTreino').onclick = () => this.treino(0);
    const s = e.querySelector('#exSeguir'); if (s) s.onclick = () => this.fecha(0, null);
    const d = e.querySelector('#exDireto'); if (d) d.onclick = () => this.telaNota(null);
  },
  telaSemMic() {
    const txt = Mic.estado === 'sem' ? 'Este navegador não permite usar o microfone.' : 'O microfone está desligado. Quer autorizar agora?'; Audio.fala('fr_microfone');
    const e = this.poe(`<div class="ex-aviso">${txt}</div><div class="ex-botoes">${Mic.estado === 'sem' ? '' : '<button class="btn pri" id="exAut" data-foco>Autorizar microfone</button>'}<button class="btn" id="exVolta">Voltar</button></div>`);
    const a = e.querySelector('#exAut'); if (a) a.onclick = async () => { const ok = await Mic.liga(); if (ok) this.grava(); else this.telaInicio('Não foi possível ligar o microfone. Confira a permissão no navegador.'); };
    e.querySelector('#exVolta').onclick = () => this.telaInicio();
  },

  async grava() {
    this.tentativas++; this.gravou = true;
    const tk = ++this.token, e = this.poe('<div class="ex-msg" id="exLeg">Prepare-se…</div><canvas class="ex-onda" id="exOnda" width="640" height="96"></canvas><div class="ex-tempo"><i id="exBarra"></i></div><button class="btn" id="exPara" hidden>Parar</button>');
    const cv = e.querySelector('#exOnda'), cx = cv.getContext('2d'), barra = e.querySelector('#exBarra'), niveis = [];
    let fase = 'prep', t0 = performance.now(), rec = null, partes = [], fim = false, falou = false, pico = 0;
    const PREP = 1500, GRAV = 3000;
    Audio.fala('fr_fale_palavra').then(() => (falou = true)); setTimeout(() => (falou = true), 3500);
    const termina = () => { fim = true; };
    e.querySelector('#exPara').onclick = termina;
    const cap = this.auto() ? Mic.captura() : null;
    try { if (window.MediaRecorder) { rec = new MediaRecorder(Mic.stream); rec.ondataavailable = (ev) => ev.data.size && partes.push(ev.data); } } catch (err) { rec = null; }
    await new Promise((ok) => {
      const laco = () => {
        if (tk !== this.token) return ok();
        const agora = performance.now(), dt = agora - t0;
        niveis.push(Mic.nivel()); if (niveis.length > 80) niveis.shift();
        cx.clearRect(0, 0, 640, 96); cx.fillStyle = fase === 'grav' ? '#ff5d73' : '#7d6aa8';
        niveis.forEach((v, i) => { const h = Math.max(4, Math.min(1, Math.sqrt(v) * 2.2) * 88); cx.fillRect(640 - (niveis.length - i) * 8, 48 - h / 2, 5, h); });
        if (fase === 'grav') pico = Math.max(pico, niveis[niveis.length - 1]);
        if (fase === 'prep') { barra.style.width = Math.min(100, (dt / PREP) * 100) + '%'; barra.style.background = '#7d6aa8'; if (dt >= PREP && falou) { fase = 'grav'; t0 = agora; e.querySelector('#exLeg').textContent = 'Fale agora!'; e.querySelector('#exPara').hidden = false; Audio.toca('gravar_on'); if (cap) cap.liga(); if (rec) try { rec.start(); } catch (err) { rec = null; } } }
        else { barra.style.background = ''; barra.style.width = (dt / GRAV) * 100 + '%'; if (dt >= GRAV || fim) return ok(); }
        requestAnimationFrame(laco);
      }; laco();
    });
    if (tk !== this.token) return;
    const cru = cap ? cap.fim() : null; this.ultimoSom = cru;
    Audio.toca('gravar_off'); let url = null;
    if (rec && rec.state !== 'inactive') { await new Promise((ok) => { rec.onstop = ok; rec.stop(); }); let blob = null; if (partes.length) { blob = new Blob(partes, { type: rec.mimeType }); url = URL.createObjectURL(blob); } this.ultimoBlob = blob; } else this.ultimoBlob = null;
    if (tk !== this.token) return;
    const mudo = pico < 0.012;
    if (this.auto() && !mudo) {
      if (!analisavel(this.p)) { this.palpite = { nota: null, motivo: MSG_ENCONTRO }; return this.telaNota(url, mudo); }
      this.poe('<div class="ex-msg">Analisando…</div>'); this.palpite = null;
      const ref = await refPalavra(this.p); if (tk !== this.token) return;
      await espera(30);
      // som para o detector: a gravação do MediaRecorder (feita fora da tela, sem falhas) ou, se não der para decodificar, a captura direta
      let som = null; if (this.ultimoBlob) try { const ab = await this.ultimoBlob.arrayBuffer(); const b = await new Promise((ok, erro) => Audio.ctx.decodeAudioData(ab, ok, erro)); som = { y: b.getChannelData(0), sr: b.sampleRate }; } catch (err) { som = null; }
      if (!som || som.y.length < som.sr * 0.5) som = cru; this.ultimoSom = som; if (tk !== this.token) return;
      try { this.palpite = !som || !som.y.length ? { nota: null, motivo: 'Este navegador não entregou o som para análise.' } : !ref ? { nota: null, motivo: 'Modelo da palavra indisponível.' } : avalia(som.y, som.sr, ref, this.p); }
      catch (err) { console.warn(err); this.palpite = { nota: null, motivo: 'Não foi possível analisar esta gravação.' }; }
      if (tk !== this.token) return;
    }
    this.telaNota(url, mudo);
  },
  htmlPalpite() {
    const g = this.palpite; if (!this.auto() || !g) return '';
    const sil = `<b class="ex-sil">${silabaAlvo(this.p)}</b>`;
    if (g.nota == null) return `<div class="ex-palpite sem"><span class="tag">Detector em teste</span><p>Sem palpite para ${sil}: ${g.motivo}</p></div>`;
    return `<div class="ex-palpite n${g.nota}"><span class="tag">Palpite do detector (em teste)</span><p><b class="nota">${g.nota}</b> ${NOTA_NOME[g.nota]} · ${CONF_NOME[g.confianca]}</p><p class="fraco">Sílaba ${sil}. ${g.motivo}</p></div>`;
  },
  htmlNotas(sug = null) { const f = (n) => (sug ? sug === n : n === 10) ? ' data-foco' : '', s = (n) => (sug === n ? ' sugerido' : '');
    return `<div class="ex-nota"><button class="btn verde${s(10)}" data-n="10"${f(10)}><b>10</b><span>Perfeito</span></button><button class="btn pri${s(5)}" data-n="5"${f(5)}><b>5</b><span>Quase</span></button><button class="btn azul${s(2)}" data-n="2"${f(2)}><b>2</b><span>Ainda não</span></button></div>`; },
  ligaNotas() { $('#exPasso').querySelectorAll('[data-n]').forEach((b) => (b.onclick = () => this.fecha(+b.dataset.n, +b.dataset.n))); },
  telaNota(url, mudo = false) {
    if (mudo) { Audio.fala('fr_nao_ouvi'); this.palpite = null; }
    const ouvir = url ? `<button class="btn" id="exOuvir">${ic('play')} Ouvir de novo</button>` : '';
    if (this.fono()) {
      const g = !mudo && this.palpite && this.palpite.nota != null ? this.palpite.nota : null;
      const e = this.poe(`${mudo ? '<div class="ex-aviso">Não ouvi. Vamos tentar de novo?</div>' : this.htmlPalpite()}<div class="ex-botoes">${ouvir}<button class="btn" id="exRefaz">${ic('mic')} Falar de novo</button></div><p class="fraco" style="margin:0">${g ? 'Confira e dê a sua nota' : 'Nota do fonoaudiólogo'} (teclas 1, 2 e 3):</p>${this.htmlNotas(g)}`);
      this.ligaNotas(); e.querySelector('#exRefaz').onclick = () => (Mic.estado === 'ok' ? this.grava() : this.telaInicio());
    } else {
      const e = this.poe(`${mudo ? '<div class="ex-aviso">Não ouvi. Vamos tentar de novo?</div>' : ''}<div class="ex-botoes">${ouvir}<button class="btn" id="exRefaz">${ic('mic')} Falar de novo</button><button class="btn grande pri" id="exFim" data-foco>Pronto!</button></div>`);
      e.querySelector('#exRefaz').onclick = () => this.grava(); e.querySelector('#exFim').onclick = () => this.fecha(PONTOS_LIVRE, null);
    }
    const o = $('#exOuvir'); if (o) { const a = new window.Audio(url); o.onclick = () => { Audio.calaVoz(); a.currentTime = 0; a.play(); }; }
  },

  treino(i) {
    const p = this.p, sil = silabaAlvo(p), passos = [['Sílaba', sil, vozSilaba(sil, 1)], ['Três vezes', `${sil}, ${sil}, ${sil}`, vozSilaba(sil, 3)], ['Devagar', null, vozPalavra(p, 's')], ['Palavra', p.w, vozPalavra(p, 'n')]];
    if (i >= passos.length) { this.treinou = true; Audio.toca('nota5'); Audio.fala(Math.random() < 0.5 ? 'fr_treino_a' : 'fr_treino_b'); return this.voltaTreino ? this.voltaTreino() : this.telaInicio('Treino completo! Mais 5 pontos. Agora é só pronunciar.'); }
    const [rot, txt, voz] = passos[i];
    const e = this.poe(`<div class="ex-passos">${passos.map((_, k) => `<i class="${k < i ? 'f' : k === i ? 'a' : ''}"></i>`).join('')}</div>
      <p class="fraco" style="margin:0">${rot}</p><div class="ex-palavra">${txt === null ? this.silabada(p) : txt}</div>
      <div class="ex-vez" id="exVez">${ic('som')} Escute</div>
      <div class="ex-botoes"><button class="btn" id="exSai">Voltar</button><button class="btn" id="exDeNovo">${ic('som')} Ouvir de novo</button><button class="btn grande pri" id="exProx" data-foco>${i === passos.length - 1 ? 'Concluir treino' : 'Próximo'}</button></div>`);
    const toca = async () => { const v = e.querySelector('#exVez'); v.className = 'ex-vez'; v.innerHTML = `${ic('som')} Escute`; const ok = await Audio.fala([voz]); if (!ok || !v.isConnected) return; v.className = 'ex-vez sua'; v.innerHTML = `${ic('mic')} Sua vez!`; Audio.fala('fr_sua_vez'); };
    toca(); e.querySelector('#exDeNovo').onclick = toca;
    e.querySelector('#exProx').onclick = () => { Audio.toca('ui_ok'); this.treino(i + 1); };
    e.querySelector('#exSai').onclick = () => { Audio.calaVoz(); this.voltaTreino ? this.telaSemMicAvatar() : this.telaInicio(); };
  },

  async fecha(pontos, nota) {
    this.token++; const total = pontos + (this.treinou ? PONTOS_TREINO : 0), chave = nota || (pontos ? 'livre' : null);
    if (chave) { Audio.toca(nota === 10 ? 'nota10' : nota === 2 ? 'nota2' : 'nota5'); const op = MSG[chave].map((m, k) => [m, VOZ_MSG[chave][k]]).filter(([m]) => this.p.som !== 'l' || !m.includes('R')), [m, voz] = sorteio(op);
      this.poe(`<div class="ex-msg">${m}</div><div class="ex-msg" style="color:#7ae582">+${total}</div>`); await Promise.all([espera(1150), Promise.race([Audio.fala(voz, { atraso: 0.25 }), espera(2600)])]); }
    const avaliacao = this.cfg.rapido ? 'rapido' : !this.fono() ? 'livre' : this.gravou ? 'gravacao' : 'direta';
    this.ok({ pontos: total, nota, treino: this.treinou, modo: this.cfg.rapido ? 'rapido' : this.cfg.avalia, avaliacao, tentativas: this.tentativas, sil: silabaAlvo(this.p), auto: this.auto() && this.palpite && this.palpite.nota != null && nota != null ? { nota: this.palpite.nota, confianca: this.palpite.confianca, classe: this.palpite.classe } : null });
  },
  tecla(k) { if ($('#tExercicio').hidden) return false; const m = { 1: 10, 2: 5, 3: 2 }[k]; const b = m && $('#exPasso').querySelector(`[data-n="${m}"]`); if (b) { b.click(); return true; } return false; },
};

const ICS = { som: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/>', mic: '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>', ouvido: '<path d="M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-5.5 1.6"/><path d="M10 10a2 2 0 0 1 4 0"/>', play: '<path d="M7 4l13 8-13 8z" fill="currentColor"/>' };
function ic(n) { return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICS[n]}</svg>`; }
