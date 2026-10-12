// Exercício de fala: pop-up da palavra, gravação com onda sonora, treino e nota.
// Nesta etapa a nota é dada pelo adulto (ou é fixa no modo sem análise). O detector automático entra depois.
import { Audio } from './audio.js';
import { silabaAlvo } from './dados.js';

const $ = (s) => document.querySelector(s);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const MSG = { 10: ['Incrível!', 'Perfeito!', 'Que R lindo!'], 5: ['Quase lá!', 'Muito bem, está chegando!', 'Boa! Só mais um pouquinho.'], 2: ['Boa tentativa!', 'Valeu o esforço!', 'Continue assim, você consegue!'], livre: ['Muito bem!', 'Boa!', 'Isso aí!'] };
const sorteio = (l) => l[Math.floor(Math.random() * l.length)];
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
      Audio.inicia(); const src = Audio.ctx.createMediaStreamSource(this.stream); this.an = Audio.ctx.createAnalyser(); this.an.fftSize = 1024; src.connect(this.an); this.estado = 'ok'; return true; }
    catch (e) { this.estado = 'negado'; return false; }
  },
  nivel() { if (!this.an) return 0; const b = new Float32Array(this.an.fftSize); this.an.getFloatTimeDomainData(b); let s = 0; for (let i = 0; i < b.length; i++) s += b[i] * b[i]; return Math.sqrt(s / b.length); },
};

export const Exercicio = {
  cfg: null, token: 0,
  // abre o pop-up e devolve { pontos, nota, treino, modo }
  abre(p, cfg, desenhaFolha) {
    this.cfg = cfg; this.p = p; this.treinou = false; this.token++;
    const cv = $('#exFolha'); cv.getContext('2d').drawImage(desenhaFolha(p), 0, 0);
    $('#exPalavra').innerHTML = this.silabada(p); mostraBoca(p);
    $('#tExercicio').hidden = false; Audio.abafa(0);
    return new Promise((ok) => { this.ok = (res) => { $('#tExercicio').hidden = true; Audio.abafa(1, 0.5); ok(res); }; cfg.rapido ? this.telaRapida() : this.telaInicio(); });
  },
  silabada(p) { const ps = p.sil.split('-'); return ps.map((s) => (s === s.toUpperCase() && /[A-ZÀ-Ú]/.test(s) && ps.length > 1 ? `<u>${s.toLowerCase()}</u>` : s.toLowerCase())).join('<small>·</small>'); },
  poe(html) { const e = $('#exPasso'); e.innerHTML = html; const b = e.querySelector('[data-foco]') || e.querySelector('button'); if (b) b.focus({ preventScroll: true }); return e; },
  fono() { return this.cfg.avalia === 'fono'; },

  telaRapida() {
    if (this.fono()) { this.poe(`<p class="fraco">Exercício rápido: escolha a nota.</p>${this.htmlNotas()}`); this.ligaNotas(); }
    else { const e = this.poe('<div class="ex-botoes"><button class="btn grande pri" data-foco>Falei!</button></div>'); e.querySelector('button').onclick = () => this.fecha(PONTOS_LIVRE, null); }
  },
  telaInicio(aviso = '') {
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
    const txt = Mic.estado === 'sem' ? 'Este navegador não permite usar o microfone.' : 'O microfone está desligado. Quer autorizar agora?';
    const e = this.poe(`<div class="ex-aviso">${txt}</div><div class="ex-botoes">${Mic.estado === 'sem' ? '' : '<button class="btn pri" id="exAut" data-foco>Autorizar microfone</button>'}<button class="btn" id="exVolta">Voltar</button></div>`);
    const a = e.querySelector('#exAut'); if (a) a.onclick = async () => { const ok = await Mic.liga(); if (ok) this.grava(); else this.telaInicio('Não foi possível ligar o microfone. Confira a permissão no navegador.'); };
    e.querySelector('#exVolta').onclick = () => this.telaInicio();
  },

  async grava() {
    const tk = ++this.token, e = this.poe('<div class="ex-msg" id="exLeg">Prepare-se…</div><canvas class="ex-onda" id="exOnda" width="640" height="96"></canvas><div class="ex-tempo"><i id="exBarra"></i></div><button class="btn" id="exPara" hidden>Parar</button>');
    const cv = e.querySelector('#exOnda'), cx = cv.getContext('2d'), barra = e.querySelector('#exBarra'), niveis = [];
    let fase = 'prep', t0 = performance.now(), rec = null, partes = [], fim = false;
    const PREP = 1500, GRAV = 3000;
    const termina = () => { fim = true; };
    e.querySelector('#exPara').onclick = termina;
    try { if (window.MediaRecorder) { rec = new MediaRecorder(Mic.stream); rec.ondataavailable = (ev) => ev.data.size && partes.push(ev.data); } } catch (err) { rec = null; }
    await new Promise((ok) => {
      const laco = () => {
        if (tk !== this.token) return ok();
        const agora = performance.now(), dt = agora - t0;
        niveis.push(Mic.nivel()); if (niveis.length > 80) niveis.shift();
        cx.clearRect(0, 0, 640, 96); cx.fillStyle = fase === 'grav' ? '#ff5d73' : '#7d6aa8';
        niveis.forEach((v, i) => { const h = Math.max(4, Math.min(1, Math.sqrt(v) * 2.2) * 88); cx.fillRect(640 - (niveis.length - i) * 8, 48 - h / 2, 5, h); });
        if (fase === 'prep') { barra.style.width = (dt / PREP) * 100 + '%'; barra.style.background = '#7d6aa8'; if (dt >= PREP) { fase = 'grav'; t0 = agora; e.querySelector('#exLeg').textContent = 'Fale agora!'; e.querySelector('#exPara').hidden = false; Audio.toca('gravar_on'); if (rec) try { rec.start(); } catch (err) { rec = null; } } }
        else { barra.style.background = ''; barra.style.width = (dt / GRAV) * 100 + '%'; if (dt >= GRAV || fim) return ok(); }
        requestAnimationFrame(laco);
      }; laco();
    });
    if (tk !== this.token) return;
    Audio.toca('gravar_off'); let url = null;
    if (rec && rec.state !== 'inactive') { await new Promise((ok) => { rec.onstop = ok; rec.stop(); }); if (partes.length) url = URL.createObjectURL(new Blob(partes, { type: rec.mimeType })); }
    if (tk !== this.token) return;
    this.telaNota(url);
  },
  htmlNotas() { return `<div class="ex-nota"><button class="btn verde" data-n="10" data-foco><b>10</b><span>Perfeito</span></button><button class="btn pri" data-n="5"><b>5</b><span>Quase</span></button><button class="btn azul" data-n="2"><b>2</b><span>Ainda não</span></button></div>`; },
  ligaNotas() { $('#exPasso').querySelectorAll('[data-n]').forEach((b) => (b.onclick = () => this.fecha(+b.dataset.n, +b.dataset.n))); },
  telaNota(url) {
    const ouvir = url ? `<button class="btn" id="exOuvir">${ic('play')} Ouvir de novo</button>` : '';
    if (this.fono()) {
      const e = this.poe(`<div class="ex-botoes">${ouvir}<button class="btn" id="exRefaz">${ic('mic')} Falar de novo</button></div><p class="fraco" style="margin:0">Nota do fonoaudiólogo (teclas 1, 2 e 3):</p>${this.htmlNotas()}`);
      this.ligaNotas(); e.querySelector('#exRefaz').onclick = () => (Mic.estado === 'ok' ? this.grava() : this.telaInicio());
    } else {
      const e = this.poe(`<div class="ex-botoes">${ouvir}<button class="btn" id="exRefaz">${ic('mic')} Falar de novo</button><button class="btn grande pri" id="exFim" data-foco>Pronto!</button></div>`);
      e.querySelector('#exRefaz').onclick = () => this.grava(); e.querySelector('#exFim').onclick = () => this.fecha(PONTOS_LIVRE, null);
    }
    const o = $('#exOuvir'); if (o) { const a = new window.Audio(url); o.onclick = () => { a.currentTime = 0; a.play(); }; }
  },

  treino(i) {
    const p = this.p, sil = silabaAlvo(p), passos = [['Sílaba', sil], ['Três vezes', `${sil}, ${sil}, ${sil}`], ['Devagar', null], ['Palavra', p.w]];
    if (i >= passos.length) { this.treinou = true; Audio.toca('nota5'); return this.telaInicio('Treino completo! Mais 5 pontos. Agora é só pronunciar.'); }
    const [rot, txt] = passos[i];
    const e = this.poe(`<div class="ex-passos">${passos.map((_, k) => `<i class="${k < i ? 'f' : k === i ? 'a' : ''}"></i>`).join('')}</div>
      <p class="fraco" style="margin:0">${rot}</p><div class="ex-palavra">${txt === null ? this.silabada(p) : txt}</div>
      <p class="fraco" style="margin:0;font-size:.85rem">A voz da Dálete entra aqui. Por enquanto, o adulto fala o modelo e a criança repete.</p>
      <div class="ex-botoes"><button class="btn" id="exSai">Voltar</button><button class="btn grande pri" id="exProx" data-foco>${i === passos.length - 1 ? 'Concluir treino' : 'Próximo'}</button></div>`);
    e.querySelector('#exProx').onclick = () => { Audio.toca('ui_ok'); this.treino(i + 1); };
    e.querySelector('#exSai').onclick = () => this.telaInicio();
  },

  async fecha(pontos, nota) {
    this.token++; const total = pontos + (this.treinou ? PONTOS_TREINO : 0), chave = nota || (pontos ? 'livre' : null);
    if (chave) { Audio.toca(nota === 10 ? 'nota10' : nota === 2 ? 'nota2' : 'nota5'); this.poe(`<div class="ex-msg">${sorteio(MSG[chave].filter((m) => this.p.som !== 'l' || !m.includes('R')))}</div><div class="ex-msg" style="color:#7ae582">+${total}</div>`); await espera(1150); }
    this.ok({ pontos: total, nota, treino: this.treinou, modo: this.cfg.rapido ? 'rapido' : this.cfg.avalia });
  },
  tecla(k) { if ($('#tExercicio').hidden) return false; const m = { 1: 10, 2: 5, 3: 2 }[k]; const b = m && $('#exPasso').querySelector(`[data-n="${m}"]`); if (b) { b.click(); return true; } return false; },
};

const ICS = { mic: '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>', ouvido: '<path d="M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-5.5 1.6"/><path d="M10 10a2 2 0 0 1 4 0"/>', play: '<path d="M7 4l13 8-13 8z" fill="currentColor"/>' };
function ic(n) { return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICS[n]}</svg>`; }
