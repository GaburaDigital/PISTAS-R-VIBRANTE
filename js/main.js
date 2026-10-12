// Telas, ajustes, controles e ligação entre o mundo 3D, o áudio e o exercício de fala.
import { Mundo, raioDe } from './mundo.js';
import { Audio } from './audio.js';
import { PISTAS, NIVEIS, geraFase } from './dados.js';
import { Exercicio, Mic } from './exercicio.js';

const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
const IC = {
  pausa: '<path d="M8 5v14M16 5v14"/>', telaCheia: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', telaSai: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>', nota: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  som: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16.5 9a4 4 0 0 1 0 6"/>', ajuda: '<path d="M9.2 9a3 3 0 1 1 4.3 2.7c-.9.5-1.5 1.1-1.5 2.3M12 17.5v.5"/>',
  esq: '<path d="M15 5l-7 7 7 7"/>', dir: '<path d="M9 5l7 7-7 7"/>', corte: '<path class="corte" d="M4 4l16 16"/>',
};
// ícones grandes do jogo: substituem as frases para quem ainda não lê
const ESC = '#1b1025';
const HIC = {
  estrela: `<path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6-4.9-4.6 6.6-.8z" fill="#39c6ff" stroke="${ESC}" stroke-width="1.6" stroke-linejoin="round"/>`,
  escudo: `<path d="M12 2.5l8 3v6c0 5-3.6 8.6-8 10-4.4-1.4-8-5-8-10v-6z" fill="#ff8ff0" stroke="${ESC}" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.5 12l2.5 2.5 4.5-5" fill="none" stroke="${ESC}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  turbo: `<path d="M13.5 2L5 13.5h6l-1.5 8.5L19 10.5h-6z" fill="#ffd23f" stroke="${ESC}" stroke-width="1.6" stroke-linejoin="round"/>`,
  super: `<path d="M9.5 2L2.5 12h5l-1.2 7.5L14 9h-5z" fill="#ffd23f" stroke="${ESC}" stroke-width="1.4" stroke-linejoin="round"/><path d="M17 4.5l-6 9h4.4l-1 7L21.5 11h-4.4z" fill="#39c6ff" stroke="${ESC}" stroke-width="1.4" stroke-linejoin="round"/>`,
  triturador: `<path d="M12 3l10 17H2z" fill="#ffd23f" stroke="${ESC}" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 9v5.5M12 17.2v.3" stroke="${ESC}" stroke-width="2.4" stroke-linecap="round"/>`,
  fogo: `<path d="M12 2.5c1 3.6 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.6 1.4-4 2.4-5.2.3 1.9 1.1 2.8 2 3.2C10.5 8.6 11 5.6 12 2.5z" fill="#ff7b00" stroke="${ESC}" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 13.5c1.2 1.3 2.2 2.2 2.2 3.6a2.2 2.2 0 0 1-4.4 0c0-1.2 1-2.3 2.2-3.6z" fill="#ffd23f"/>`,
  errado: `<circle cx="12" cy="12" r="9.5" fill="#ff5d73" stroke="${ESC}" stroke-width="1.6"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`,
  x2: `<circle cx="12" cy="12" r="9.5" fill="#39c6ff" stroke="${ESC}" stroke-width="1.6"/><text x="12" y="16" text-anchor="middle" font-size="10" font-weight="900" fill="${ESC}" font-family="system-ui,sans-serif">x2</text>`,
  R: `<circle cx="12" cy="12" r="9.5" fill="#e6007e" stroke="${ESC}" stroke-width="1.6"/><text x="12" y="16.6" text-anchor="middle" font-size="13" font-weight="900" fill="#fff" font-family="system-ui,sans-serif">R</text>`,
  L: `<rect x="2.5" y="2.5" width="19" height="19" rx="3" fill="#0a66ff" stroke="${ESC}" stroke-width="1.6"/><text x="12" y="16.6" text-anchor="middle" font-size="13" font-weight="900" fill="#fff" font-family="system-ui,sans-serif">L</text>`,
  ja: `<circle cx="12" cy="12" r="9.5" fill="#7ae582" stroke="${ESC}" stroke-width="1.6"/><path d="M9.5 7.5l7 4.5-7 4.5z" fill="${ESC}"/>`,
  alvo: `<circle cx="12" cy="12" r="9.5" fill="#fff" stroke="${ESC}" stroke-width="1.6"/><circle cx="12" cy="12" r="6" fill="#ff5d73"/><circle cx="12" cy="12" r="2.6" fill="#fff"/>`,
};
const hic = (n, cls = 'hic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${HIC[n]}</svg>`;
const ic = (n, extra = '') => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}${extra}</svg>`;

// ---------- ajustes ----------
const PADRAO = { musica: true, efeitos: true, volMusica: 0.55, volEfeitos: 0.9, inclinar: false, sens: 1, avalia: 'fono', rapido: false, nome: '', qualidade: 'auto', reduz: false, fps: false, pista: '1', nivel: 'facil', intenso: false, zoom: false, retomada: false, cenGrande: false, semCenario: false };
let cfg = { ...PADRAO };
try { cfg = { ...PADRAO, ...JSON.parse(localStorage.getItem('pistasR.cfg') || '{}') }; } catch (e) {}
const rapidoUrl = new URLSearchParams(location.search).has('rapido'); // só para testes; não fica salvo
if (!localStorage.getItem('pistasR.cfg') && matchMedia('(prefers-reduced-motion: reduce)').matches) cfg.reduz = true;
const salva = () => { try { localStorage.setItem('pistasR.cfg', JSON.stringify(cfg)); } catch (e) {} };
const ehToque = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

// ---------- mundo ----------
const mundo = new Mundo($('#cena'), {
  onHud: pintaHud, onIcone: icone, onContagem: contagem, onAviso: aviso,
  onExercicio: async (p) => { const res = await Exercicio.abre(p, { ...cfg, rapido: cfg.rapido || rapidoUrl }, (q) => mundo.canvasFolha(q)); mundo.fimExercicio(res); },
  onFim: fim,
});
window.__jogo = { mundo, cfg, Audio, Mic, iniciar: (p, n, seed) => comeca(p, n, seed), incl: () => incl };
let pistaSel = PISTAS.find((p) => p.id === cfg.pista) || PISTAS[0], nivelSel = NIVEIS[cfg.nivel] || NIVEIS.facil;

function aplicaCfg() {
  Object.assign(Audio.cfg, { musica: cfg.musica, efeitos: cfg.efeitos, volMusica: cfg.volMusica, volEfeitos: cfg.volEfeitos }); Audio.aplica();
  mundo.reduz = cfg.reduz; if (mundo.qualidade !== cfg.qualidade) mundo.defineQualidade(cfg.qualidade);
  mundo.opcoes({ intenso: cfg.intenso, zoom: cfg.zoom, retomada: cfg.retomada, cenario: cfg.semCenario ? 'nenhum' : cfg.cenGrande ? 'grande' : 'normal' });
  $('#bMusica').setAttribute('aria-pressed', String(cfg.musica)); $('#bEfeitos').setAttribute('aria-pressed', String(cfg.efeitos)); $('#fps').hidden = !cfg.fps;
  $('#aAvaliaTxt').textContent = cfg.avalia === 'fono' ? 'Só o fonoaudiólogo deve dar as notas.' : 'A criança fala, se ouve e ganha 5 pontos por participar.';
  salva();
}

// ---------- telas ----------
const pilha = [];
function mostra(id) { $$('.tela').forEach((t) => { if (!['tAjustes', 'tAjuda', 'tPausa', 'tExercicio'].includes(t.id) || t.id === id) t.hidden = t.id !== id; }); foca(id); }
function foca(id) { const t = $('#' + id); if (!t) return; const b = t.querySelector('[data-foco]') || t.querySelector('.pri') || t.querySelector('button'); if (b) b.focus({ preventScroll: true }); }
function abre(id) { pilha.push(document.activeElement); $('#' + id).hidden = false; foca(id); if (id === 'tAjustes') preencheAjustes(); }
function fecha(id) { $('#' + id).hidden = true; const a = pilha.pop(); if (a && a.focus) a.focus({ preventScroll: true }); }
const telaDeCima = () => ['tAjustes', 'tAjuda', 'tExercicio', 'tPausa', 'tFim', 'tPreparar', 'tNivel', 'tPista', 'tTitulo'].map((i) => $('#' + i)).find((t) => !t.hidden);

document.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (!b.classList.contains('zona')) Audio.toca('ui_ok', { vol: 0.6 });
  if (b.dataset.ir) { mostra(b.dataset.ir); if (b.dataset.ir === 'tTitulo') vaiMenu(false); }
  if (b.dataset.abre) abre(b.dataset.abre);
  if (b.hasAttribute('data-fecha')) { fecha(b.closest('.tela').id); aplicaCfg(); }
});

function cartoes() {
  const cores = ['#e6007e', '#1b3fd1', '#7b2ff7', '#d1495b'];
  $('#cartoesPista').innerHTML = PISTAS.map((p, i) => `<button class="cartao" data-pista="${p.id}" style="background:${cores[i]}" ${p.id === pistaSel.id ? 'data-foco' : ''}><span class="num">${p.id}</span><b>${p.nome}</b><span>${p.exemplo}</span></button>`).join('');
  const cn = { facil: '#2a9d8f', normal: '#f48c06', dificil: '#d00000' };
  $('#cartoesNivel').innerHTML = Object.values(NIVEIS).map((n, i) => `<button class="cartao" data-nivel="${n.id}" style="background:${cn[n.id]}" ${n.id === nivelSel.id ? 'data-foco' : ''}><span class="pts">${[0, 1, 2].map((k) => `<i class="${k > i ? 'v' : ''}"></i>`).join('')}</span><b>${n.nome}</b><span>${n.desc}</span></button>`).join('');
}
$('#cartoesPista').onclick = (e) => { const b = e.target.closest('[data-pista]'); if (!b) return; pistaSel = PISTAS.find((p) => p.id === b.dataset.pista); cfg.pista = pistaSel.id; salva(); cartoes(); mostra('tNivel'); };
$('#cartoesNivel').onclick = (e) => { const b = e.target.closest('[data-nivel]'); if (!b) return; nivelSel = NIVEIS[b.dataset.nivel]; cfg.nivel = nivelSel.id; salva(); cartoes(); preparar(); };

function preparar() {
  const precisaInc = ehToque && 'DeviceOrientationEvent' in window && !nivelSel.faixas; // inclinação só no nível Difícil
  $('#prepInclinar').hidden = !precisaInc; pintaPrep();
  if (Mic.estado === 'ok' && !precisaInc) return comeca(); // nada a preparar
  mostra('tPreparar');
}
function pintaPrep() {
  const m = $('#prepMic'), it = m.closest('.prep-item'); it.classList.toggle('ok', Mic.estado === 'ok');
  $('#prepMicTxt').textContent = { nao: 'Usado no exercício de fala. Sem ele, o botão de pronunciar fica desligado.', ok: 'Microfone ligado.', negado: 'Não autorizado. Dá para jogar sem ele e autorizar depois.', sem: 'Este navegador não permite usar o microfone.' }[Mic.estado];
  m.textContent = Mic.estado === 'ok' ? 'Ligado' : 'Ligar microfone'; m.disabled = Mic.estado === 'ok' || Mic.estado === 'sem';
  const i = $('#prepInc'); i.closest('.prep-item').classList.toggle('ok', cfg.inclinar && incl.ativo); i.textContent = cfg.inclinar && incl.ativo ? 'Ativado' : 'Ativar';
  $('#prepIncTxt').textContent = incl.falhou ? 'Este aparelho não liberou a inclinação. Use os botões na tela.' : cfg.inclinar && incl.ativo ? 'Incline o aparelho para mover. Os botões continuam funcionando.' : 'Opcional: mova o Tiriri inclinando o aparelho para os lados.';
}
$('#prepMic').onclick = async () => { await Mic.liga(); pintaPrep(); };
$('#prepInc').onclick = async () => { if (cfg.inclinar && incl.ativo) { cfg.inclinar = false; } else { cfg.inclinar = await incl.liga(); incl.falhou = !cfg.inclinar; } salva(); pintaPrep(); };
$('#prepJogar').onclick = () => comeca();

function vaiMenu(tela = true) { ['tPausa', 'tExercicio', 'tFim'].forEach((i) => ($('#' + i).hidden = true)); pilha.length = 0; Audio.abafa(1); mundo.menu(geraFase(PISTAS[0], NIVEIS.facil, 7), PISTAS[0], NIVEIS.facil); $('#hud').hidden = true; $('#bPausa').hidden = true; Audio.musica('menu'); aviso(null); if (tela) mostra('tTitulo'); }
function comeca(p = pistaSel, n = nivelSel, seed) {
  pistaSel = p; nivelSel = n; $$('.tela').forEach((t) => (t.hidden = true)); $('#hud').hidden = false; $('#bPausa').hidden = false; $('#hudTextos').innerHTML = ''; aviso(null);
  mundo.comeca(geraFase(p, n, seed), p, n); Audio.musica('pista'); ult = {}; pintaHud(mundo); if (document.activeElement) document.activeElement.blur();
}
function pausar(v) { if (v && !['correndo', 'contagem'].includes(mundo.estado)) return; mundo.pausa(v); if (v) { abre('tPausa'); Audio.abafa(0.35); } else { $('#tPausa').hidden = true; pilha.length = 0; Audio.abafa(1); } }
$('#bPausa').onclick = () => pausar(true); $('#pContinuar').onclick = () => pausar(false);
$('#pReiniciar').onclick = () => { Audio.abafa(1); comeca(); }; $('#pMenu').onclick = () => { Audio.abafa(1); vaiMenu(); };
$('#fDeNovo').onclick = () => comeca(); $('#fMenu').onclick = () => vaiMenu();
document.addEventListener('visibilitychange', () => { if (document.hidden) pausar(true); });

function fim(r) {
  $('#hud').hidden = true; $('#bPausa').hidden = true;
  $('#fimTit').textContent = r.vitoria ? 'Você chegou!' : 'A bola acabou';
  $('#fimSub').textContent = r.vitoria ? 'Olha o tamanho da sua bola de papel!' : 'Não foi dessa vez. Vamos tentar de novo?';
  $('#fimPontos').textContent = r.vitoria ? r.pontos : '0';
  const b = $('#fimBola'); b.style.width = b.style.height = '40px'; const px = r.vitoria ? Math.round(60 + raioDe(r.pontos) * 90) : 26; setTimeout(() => (b.style.width = b.style.height = px + 'px'), 120);
  const max = 20 + r.total * 10, k = r.pontos / max, n = !r.vitoria ? 0 : k >= 0.75 ? 3 : k >= 0.45 ? 2 : 1;
  $('#fimMedalhas').innerHTML = [0, 1, 2].map((i) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3 6.5 7 .8-5.2 4.8 1.5 7L12 17.6 5.7 21l1.5-7L2 9.3l7-.8z" fill="${i < n ? '#ffd23f' : 'rgba(255,255,255,.18)'}" stroke="#1b1025" stroke-width="1.6" stroke-linejoin="round"/></svg>`).join('');
  $('#fimMedalhas').setAttribute('aria-label', `${n} de 3 medalhas`);
  $('#fimPalavras').innerHTML = r.palavras.map((p) => `<span class="${p.som}">${p.w}</span>`).join('') || '<i class="fraco">Nenhuma palavra praticada nesta corrida.</i>';
  $('#fDeNovo').textContent = r.vitoria ? 'Jogar de novo' : 'Tentar de novo'; mostra('tFim');
}

// ---------- HUD ----------
let ult = {};
function pintaHud(m) {
  const p = Math.round(m.pontos), pr = Math.round((m.s / m.fase.comprimento) * 200) / 2;
  if (p !== ult.p) { ult.p = p; $('#hudPontos').textContent = p; const t = Math.round(34 + raioDe(p) * 60) + '%'; $('#hudBola').style.width = $('#hudBola').style.height = t; }
  if (pr !== ult.pr) { ult.pr = pr; $('#hudProg').style.width = Math.min(100, pr) + '%'; }
  const chave = `${Math.ceil(m.boost * 4)}|${Math.ceil(m.escT * 4)}|${Math.ceil(m.turbo * 4)}`;
  if (chave !== ult.ef) { ult.ef = chave; const c = (nome, cor, v, max) => (v > 0 ? `<div class="chip" style="color:${cor}">${nome}<i><b style="width:${Math.min(100, (v / max) * 100)}%"></b></i></div>` : '');
    $('#hudEfeitos').innerHTML = c(hic('estrela', 'cic'), '#39c6ff', m.boost, m.maxBoost) + c(hic('escudo', 'cic'), '#ff8ff0', m.escT, m.nivel.escudo) + c(hic(m.super > 0 ? 'super' : 'turbo', 'cic'), '#ffd23f', m.turbo, m.super > 0 ? 3.5 : 2.2); }
}
function texto(msg, tipo = '') { const c = $('#hudTextos'); while (c.children.length > 2) c.firstChild.remove(); const d = document.createElement('div'); d.className = tipo; d.textContent = msg; c.appendChild(d); setTimeout(() => d.remove(), 1500); }
function icone(nome, num, tipo = '') { const c = $('#hudTextos'); while (c.children.length > 2) c.firstChild.remove(); const d = document.createElement('div'); d.className = tipo; d.innerHTML = (nome ? hic(nome) : '') + (num ? `<b>${num}</b>` : ''); c.appendChild(d); setTimeout(() => d.remove(), 1500); }
function contagem(n) { const c = $('#hudCont'); c.hidden = false; if (n) c.textContent = n; else c.innerHTML = hic('ja', 'hic grande'); c.style.animation = 'none'; void c.offsetWidth; c.style.animation = ''; if (!n) setTimeout(() => (c.hidden = true), 700); }
function aviso(p) { const a = $('#hudAviso'); a.hidden = !p; if (p) a.innerHTML = `${hic('alvo')}<em class="${p.som}">${p.w.toUpperCase()}</em>`; }

// ---------- controles ----------
const seg = { e: false, d: false };
const livre = () => !mundo.nivel || !mundo.nivel.faixas;
function passo(d) { if (mundo.estado === 'correndo') mundo.entrada.passos += d; }
function atualizaDir() { mundo.entrada.dir = (seg.d ? 1 : 0) - (seg.e ? 1 : 0) || incl.dir; }
function aperta(lado, v) { if (v && !seg[lado]) passo(lado === 'e' ? -1 : 1); seg[lado] = v; $(lado === 'e' ? '#setaE' : '#setaD').classList.toggle('ativa', v); atualizaDir(); }
for (const [id, lado] of [['#zonaE', 'e'], ['#zonaD', 'd']]) {
  const z = $(id); z.addEventListener('pointerdown', (e) => { e.preventDefault(); z.setPointerCapture(e.pointerId); aperta(lado, true); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => z.addEventListener(ev, () => aperta(lado, false)));
  z.addEventListener('contextmenu', (e) => e.preventDefault());
}
if (ehToque) document.body.classList.add('toque');
$('#setaE').innerHTML = ic('esq'); $('#setaD').innerHTML = ic('dir');

// inclinação do aparelho
const incl = { ativo: false, dir: 0, armado: true,
  async liga() { try { if (typeof DeviceOrientationEvent === 'undefined') return false; if (typeof DeviceOrientationEvent.requestPermission === 'function') { if ((await DeviceOrientationEvent.requestPermission()) !== 'granted') return false; } if (!this.ativo) window.addEventListener('deviceorientation', (e) => this.le(e)); this.ativo = true; return true; } catch (e) { return false; } },
  le(e) {
    if (!cfg.inclinar || e.gamma == null || !livre()) { this.dir = 0; atualizaDir(); return; } // só no nível Difícil (movimento livre)
    const a = (screen.orientation && screen.orientation.angle) || window.orientation || 0, ang = (a === 90 ? e.beta : a === 270 || a === -90 ? -e.beta : e.gamma) * cfg.sens;
    if (livre()) this.dir = Math.max(-1, Math.min(1, Math.abs(ang) < 4 ? 0 : ang / 22));
    else { this.dir = 0; if (this.armado && Math.abs(ang) > 12) { passo(Math.sign(ang)); this.armado = false; } else if (Math.abs(ang) < 6) this.armado = true; }
    atualizaDir();
  } };

// teclado: jogo e menus (setas e espaço, para joysticks que imitam teclado)
function navega(d) {
  const t = telaDeCima(); if (!t) return; const l = [...t.querySelectorAll('button, input, select')].filter((x) => !x.disabled && x.offsetParent !== null); if (!l.length) return;
  let i = l.indexOf(document.activeElement); i = i < 0 ? 0 : (i + d + l.length) % l.length; l[i].focus(); Audio.toca('ui_mover', { vol: 0.6 });
}
document.addEventListener('keydown', (e) => {
  const k = e.key, alvo = e.target, campo = alvo.tagName === 'INPUT' && alvo.type === 'text';
  if (campo && k !== 'Escape' && k !== 'ArrowUp' && k !== 'ArrowDown') return;
  const jogando = ['correndo', 'contagem'].includes(mundo.estado) && !telaDeCima();
  if (jogando) {
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { if (!e.repeat) aperta('e', true); e.preventDefault(); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { if (!e.repeat) aperta('d', true); e.preventDefault(); }
    else if (k === 'Escape' || k === 'p' || k === 'P') pausar(true);
    else if (k === ' ') e.preventDefault();
    return;
  }
  if (Exercicio.tecla(k)) return e.preventDefault();
  const ajuste = alvo.tagName === 'SELECT' || (alvo.tagName === 'INPUT' && alvo.type === 'range');
  if (k === 'ArrowDown' || (k === 'ArrowRight' && !ajuste)) { navega(1); e.preventDefault(); }
  else if (k === 'ArrowUp' || (k === 'ArrowLeft' && !ajuste)) { navega(-1); e.preventDefault(); }
  else if (k === 'Enter' && alvo.tagName === 'INPUT' && alvo.type === 'checkbox') { alvo.click(); e.preventDefault(); }
  else if (k === 'Escape') { const t = telaDeCima(); if (!t) return; if (t.id === 'tPausa') pausar(false); else if (t.id === 'tAjustes' || t.id === 'tAjuda') { fecha(t.id); aplicaCfg(); } else { const v = t.querySelector('.rodape .btn:not(.pri)'); if (v && t.id !== 'tExercicio') v.click(); } }
});
document.addEventListener('keyup', (e) => { const k = e.key; if (k === 'ArrowLeft' || k === 'a' || k === 'A') aperta('e', false); if (k === 'ArrowRight' || k === 'd' || k === 'D') aperta('d', false); });

// ---------- barra e ajustes ----------
const fsOk = document.fullscreenEnabled || document.webkitFullscreenEnabled;
const emTela = () => document.fullscreenElement || document.webkitFullscreenElement;
function pintaTela() { const b = $('#bTela'); b.hidden = !fsOk; b.innerHTML = ic(emTela() ? 'telaSai' : 'telaCheia'); b.setAttribute('aria-label', emTela() ? 'Sair da tela cheia' : 'Tela cheia'); }
$('#bTela').onclick = () => { const d = document.documentElement; if (emTela()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); else (d.requestFullscreen || d.webkitRequestFullscreen).call(d); };
['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) => document.addEventListener(ev, () => { pintaTela(); setTimeout(redimensiona, 120); }));
pintaTela();
$('#bPausa').innerHTML = ic('pausa'); $('#bMusica').innerHTML = ic('nota', IC.corte); $('#bEfeitos').innerHTML = ic('som', IC.corte); $('#bAjuda').innerHTML = ic('ajuda');
$('#bMusica').onclick = () => { cfg.musica = !cfg.musica; aplicaCfg(); }; $('#bEfeitos').onclick = () => { cfg.efeitos = !cfg.efeitos; aplicaCfg(); };
$('#bAjuda').onclick = () => { if ($('#tAjuda').hidden) { if (['correndo', 'contagem'].includes(mundo.estado)) pausar(true); abre('tAjuda'); } };
function preencheAjustes() { $('#aVolMus').value = cfg.volMusica; $('#aVolSfx').value = cfg.volEfeitos; $('#aInclinar').checked = cfg.inclinar; $('#aSens').value = cfg.sens; $('#aAvalia').value = cfg.avalia; $('#aRapido').checked = cfg.rapido; $('#aNome').value = cfg.nome; $('#aQual').value = cfg.qualidade; $('#aReduz').checked = cfg.reduz; $('#aFps').checked = cfg.fps; $('#aIntenso').checked = cfg.intenso; $('#aZoom').checked = cfg.zoom; $('#aRetomada').checked = cfg.retomada; $('#aGrande').checked = cfg.cenGrande; $('#aSemCen').checked = cfg.semCenario; $('#aGrande').disabled = cfg.semCenario; }
$('#tAjustes').addEventListener('input', async (e) => {
  const t = e.target;
  if (t.id === 'aVolMus') { cfg.volMusica = +t.value; cfg.musica = cfg.volMusica > 0; } if (t.id === 'aVolSfx') { cfg.volEfeitos = +t.value; cfg.efeitos = cfg.volEfeitos > 0; }
  if (t.id === 'aInclinar') { cfg.inclinar = t.checked && (await incl.liga()); t.checked = cfg.inclinar; }
  if (t.id === 'aSens') cfg.sens = +t.value; if (t.id === 'aAvalia') cfg.avalia = t.value; if (t.id === 'aRapido') cfg.rapido = t.checked; if (t.id === 'aNome') cfg.nome = t.value.trim();
  if (t.id === 'aIntenso') cfg.intenso = t.checked; if (t.id === 'aZoom') cfg.zoom = t.checked; if (t.id === 'aRetomada') cfg.retomada = t.checked; if (t.id === 'aGrande') cfg.cenGrande = t.checked; if (t.id === 'aSemCen') { cfg.semCenario = t.checked; $('#aGrande').disabled = t.checked; }
  if (t.id === 'aQual') cfg.qualidade = t.value; if (t.id === 'aReduz') cfg.reduz = t.checked; if (t.id === 'aFps') cfg.fps = t.checked;
  aplicaCfg(); if (t.id === 'aVolSfx') Audio.toca('coletar');
});

// ---------- rolagem dos painéis: barra visível e aviso de que há mais conteúdo ----------
function marcaRolagem() { $$('.painel').forEach((p) => { const sobra = p.scrollHeight - p.clientHeight; p.classList.toggle('rola', sobra > 4); p.classList.toggle('mais', sobra > 4 && p.scrollTop < sobra - 4); }); }
document.addEventListener('scroll', (e) => { if (e.target.classList && e.target.classList.contains('painel')) marcaRolagem(); }, true);
new MutationObserver(() => requestAnimationFrame(marcaRolagem)).observe(document.body, { attributes: true, attributeFilter: ['hidden'], subtree: true, childList: true });
window.addEventListener('resize', marcaRolagem);

// ---------- laço e início ----------
function redimensiona() { mundo.redimensiona(window.innerWidth, window.innerHeight); }
window.addEventListener('resize', redimensiona); window.addEventListener('orientationchange', () => setTimeout(redimensiona, 250));
let tAnt = performance.now(), nF = 0;
function laco(agora) { requestAnimationFrame(laco); const dt = Math.min(0.05, (agora - tAnt) / 1000); tAnt = agora; mundo.quadro(dt); if (cfg.fps && ++nF % 30 === 0) $('#fps').textContent = `${Math.round(mundo.fps || 0)} qps · resolução ${mundo.dpr}x`; }

(async () => {
  redimensiona(); cartoes();
  const inicio = performance.now(); let pronto = false;
  const carga = (async () => { let a = 0, b = 0; const pinta = () => ($('#progCarga').style.width = Math.round((a * 0.6 + b * 0.4) * 100) + '%'); await Promise.all([mundo.carrega((v) => { a = v; pinta(); }), Audio.carrega((v) => { b = v; pinta(); })]); pronto = true; })();
  carga.catch((e) => { console.error(e); $('#txtCarga').textContent = 'Não foi possível carregar o jogo. Recarregue a página.'; });
  await new Promise((r) => setTimeout(r, 3100)); $('#tAbertura').hidden = true;
  if (!pronto) { $('#tCarrega').hidden = false; await carga; }
  aplicaCfg(); $('#barra').hidden = false; requestAnimationFrame(laco); vaiMenu();
  console.info(`Tiriri, o Besourinho: carregado em ${Math.round(performance.now() - inicio)} ms`);
})();
