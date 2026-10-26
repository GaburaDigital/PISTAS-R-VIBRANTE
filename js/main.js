// Telas, ajustes, controles e ligação entre o mundo 3D, o áudio e o exercício de fala.
import { Mundo, raioDe } from './mundo.js';
import { Audio } from './audio.js';
import { PISTAS, NIVEIS, geraFase, vozPalavra } from './dados.js';
import { Exercicio, Mic } from './exercicio.js';
import { Perfis, CORES, tiririSVG, baixa, compartilha, podeCompartilhar } from './perfis.js';
import { PERIODOS, periodo, graficos, desenha, ligaDica, resumoSessao, pdfPartida, pdfPeriodo, PISTA_NOME, PISTA_CURTA, NIVEL_NOME, MODO_NOME, AVALIACAO_NOME, COR_NOTA, dataHora, duracao, rotuloPeriodo } from './relatorio.js';

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
const PADRAO = { musica: true, efeitos: true, volMusica: 0.55, volEfeitos: 0.9, volVoz: 1, inclinar: false, sens: 1, avalia: 'fono', rapido: false, nome: '', qualidade: 'auto', reduz: false, fps: false, pista: '1', nivel: 'facil', intenso: false, zoom: false, retomada: false, cenGrande: false, semCenario: false };
let cfg = { ...PADRAO };
try { cfg = { ...PADRAO, ...JSON.parse(localStorage.getItem('pistasR.cfg') || '{}') }; } catch (e) {}
const rapidoUrl = new URLSearchParams(location.search).has('rapido'); // só para testes; não fica salvo
if (!localStorage.getItem('pistasR.cfg') && matchMedia('(prefers-reduced-motion: reduce)').matches) cfg.reduz = true;
const salva = () => { try { localStorage.setItem('pistasR.cfg', JSON.stringify(cfg)); } catch (e) {} };
const ehToque = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

// ---------- mundo ----------
const mundo = new Mundo($('#cena'), {
  onHud: pintaHud, onIcone: icone, onContagem: contagem, onAviso: aviso,
  onExercicio: async (p) => { const av = Perfis.ativo(); const res = await Exercicio.abre(p, { ...cfg, rapido: cfg.rapido || rapidoUrl, semMic: !!(av && av.semMic) }, (q) => mundo.canvasFolha(q)); mundo.fimExercicio(res); },
  onFim: fim,
});
window.__jogo = { mundo, cfg, Audio, Mic, Perfis, sessao: () => ultimaSessao, iniciar: (p, n, seed) => comeca(p, n, seed), incl: () => incl };
let pistaSel = PISTAS.find((p) => p.id === cfg.pista) || PISTAS[0], nivelSel = NIVEIS[cfg.nivel] || NIVEIS.facil;

function aplicaCfg() {
  Object.assign(Audio.cfg, { musica: cfg.musica, efeitos: cfg.efeitos, volMusica: cfg.volMusica, volEfeitos: cfg.volEfeitos, voz: cfg.volVoz > 0, volVoz: cfg.volVoz }); Audio.aplica();
  mundo.reduz = cfg.reduz; if (mundo.qualidade !== cfg.qualidade) mundo.defineQualidade(cfg.qualidade);
  mundo.opcoes({ intenso: cfg.intenso, zoom: cfg.zoom, retomada: cfg.retomada, cenario: cfg.semCenario ? 'nenhum' : cfg.cenGrande ? 'grande' : 'normal' });
  $('#bMusica').setAttribute('aria-pressed', String(cfg.musica)); $('#bEfeitos').setAttribute('aria-pressed', String(cfg.efeitos)); $('#fps').hidden = !cfg.fps;
  $('#aAvaliaTxt').textContent = cfg.avalia === 'fono' ? 'Só o fonoaudiólogo deve dar as notas.' : cfg.avalia === 'auto' ? 'O detector mostra um palpite; o fonoaudiólogo confere e dá a nota.' : 'A criança fala, se ouve e ganha 5 pontos por participar.';
  salva();
}

// ---------- telas ----------
const pilha = [];
const VOZ_TELA = { tPista: 'fr_escolha_pista', tNivel: 'fr_escolha_nivel', tPreparar: 'fr_preparar' };
function mostra(id) { $$('.tela').forEach((t) => { if (!['tAjustes', 'tAjuda', 'tPausa', 'tExercicio', 'tConfirma'].includes(t.id) || t.id === id) t.hidden = t.id !== id; }); if (id === 'tTitulo') pintaTitulo(); foca(id); if (VOZ_TELA[id]) Audio.fala(VOZ_TELA[id]); }
let focoAuto = false;
function foca(id) { const t = $('#' + id); if (!t) return; const b = t.querySelector('[data-foco]') || t.querySelector('.pri') || t.querySelector('button'); if (b) { focoAuto = true; b.focus({ preventScroll: true }); focoAuto = false; } }
function abre(id) { pilha.push(document.activeElement); $('#' + id).hidden = false; foca(id); if (id === 'tAjustes') preencheAjustes(); if (id === 'tAjuda') Audio.fala(['fr_ajuda1', 'fr_ajuda2', 'fr_ajuda3']); }
function fecha(id) { if (id === 'tAjuda') Audio.calaVoz(); $('#' + id).hidden = true; const a = pilha.pop(); if (a && a.focus) a.focus({ preventScroll: true }); }
const telaDeCima = () => ['tConfirma', 'tAjustes', 'tAjuda', 'tExercicio', 'tPausa', 'tRelatorio', 'tFim', 'tHistorico', 'tAvatarEdit', 'tAvatares', 'tPreparar', 'tNivel', 'tPista', 'tTitulo'].map((i) => $('#' + i)).find((t) => !t.hidden);

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
// a voz fala o nome da pista ou do nível quando o cartão recebe foco (teclado, joystick) ou o mouse passa por cima
const vozCartao = (b) => { if (!b) return; const n = b.dataset.pista ? 'fr_pista' + b.dataset.pista : 'fr_' + b.dataset.nivel, ag = performance.now(); if (n === vozCartao.n && ag - vozCartao.t < 1500) return; vozCartao.n = n; vozCartao.t = ag; Audio.fala(n); };
for (const id of ['#cartoesPista', '#cartoesNivel']) {
  $(id).addEventListener('focusin', (e) => { if (!focoAuto) vozCartao(e.target.closest('.cartao')); });
  $(id).addEventListener('pointerover', (e) => { if (e.pointerType === 'mouse') { const b = e.target.closest('.cartao'); if (b && b !== vozCartao.ult) { vozCartao.ult = b; vozCartao(b); } } });
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
  inicioPartida = Date.now();
  pistaSel = p; nivelSel = n; $$('.tela').forEach((t) => (t.hidden = true)); $('#hud').hidden = false; $('#bPausa').hidden = false; $('#hudTextos').innerHTML = ''; aviso(null);
  mundo.comeca(geraFase(p, n, seed), p, n); Audio.musica('pista'); ult = {}; pintaHud(mundo); if (document.activeElement) document.activeElement.blur();
}
function pausar(v) { if (v && !['correndo', 'contagem'].includes(mundo.estado)) return; mundo.pausa(v); if (v) { abre('tPausa'); Audio.abafa(0.35); } else { $('#tPausa').hidden = true; pilha.length = 0; Audio.abafa(1); } }
$('#bPausa').onclick = () => pausar(true); $('#pContinuar').onclick = () => pausar(false);
$('#pReiniciar').onclick = () => { Audio.abafa(1); comeca(); }; $('#pMenu').onclick = () => { Audio.abafa(1); vaiMenu(); };
$('#fDeNovo').onclick = () => comeca(); $('#fMenu').onclick = () => vaiMenu(); $('#fRelatorio').onclick = () => abreRelatorio(ultimaSessao, Perfis.ativo(), 'tFim');
document.addEventListener('visibilitychange', () => { if (document.hidden) pausar(true); });

function fim(r) {
  registraPartida(r);
  $('#hud').hidden = true; $('#bPausa').hidden = true;
  $('#fimTit').textContent = r.vitoria ? 'Você chegou!' : 'A bola acabou';
  $('#fimSub').textContent = r.vitoria ? 'Olha o tamanho da sua bola de papel!' : 'Não foi dessa vez. Vamos tentar de novo?';
  $('#fimPontos').textContent = r.vitoria ? r.pontos : '0';
  const b = $('#fimBola'); b.style.width = b.style.height = '40px'; const px = r.vitoria ? Math.round(60 + raioDe(r.pontos) * 90) : 26; setTimeout(() => (b.style.width = b.style.height = px + 'px'), 120);
  const max = 20 + r.total * 10, k = r.pontos / max, n = !r.vitoria ? 0 : k >= 0.75 ? 3 : k >= 0.45 ? 2 : 1;
  $('#fimMedalhas').innerHTML = [0, 1, 2].map((i) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3 6.5 7 .8-5.2 4.8 1.5 7L12 17.6 5.7 21l1.5-7L2 9.3l7-.8z" fill="${i < n ? '#ffd23f' : 'rgba(255,255,255,.18)'}" stroke="#1b1025" stroke-width="1.6" stroke-linejoin="round"/></svg>`).join('');
  $('#fimMedalhas').setAttribute('aria-label', `${n} de 3 medalhas`);
  $('#fimPalavras').innerHTML = r.palavras.map((p) => `<span class="${p.som}">${p.w}</span>`).join('') || '<i class="fraco">Nenhuma palavra praticada nesta corrida.</i>';
  $('#fDeNovo').textContent = r.vitoria ? 'Jogar de novo' : 'Tentar de novo'; mostra('tFim'); Audio.fala(r.vitoria ? 'fr_vitoria_b' : 'fr_derrota', { atraso: 0.3 });
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
function aviso(p) { const a = $('#hudAviso'); a.hidden = !p; if (p) Audio.fala(['fr_pegue', vozPalavra(p, 'n')]); if (p) a.innerHTML = `${hic('alvo')}<em class="${p.som}">${p.w.toUpperCase()}</em>`; }

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
function preencheAjustes() { pintaAjAvatar(); $('#aVolVoz').value = cfg.volVoz; $('#aVolMus').value = cfg.volMusica; $('#aVolSfx').value = cfg.volEfeitos; $('#aInclinar').checked = cfg.inclinar; $('#aSens').value = cfg.sens; $('#aAvalia').value = cfg.avalia; $('#aRapido').checked = cfg.rapido; $('#aQual').value = cfg.qualidade; $('#aReduz').checked = cfg.reduz; $('#aFps').checked = cfg.fps; $('#aIntenso').checked = cfg.intenso; $('#aZoom').checked = cfg.zoom; $('#aRetomada').checked = cfg.retomada; $('#aGrande').checked = cfg.cenGrande; $('#aSemCen').checked = cfg.semCenario; $('#aGrande').disabled = cfg.semCenario; }
let vozT;
$('#tAjustes').addEventListener('input', async (e) => {
  const t = e.target;
  if (t.id === 'aVolVoz') { cfg.volVoz = +t.value; }
  if (t.id === 'aVolMus') { cfg.volMusica = +t.value; cfg.musica = cfg.volMusica > 0; } if (t.id === 'aVolSfx') { cfg.volEfeitos = +t.value; cfg.efeitos = cfg.volEfeitos > 0; }
  if (t.id === 'aInclinar') { cfg.inclinar = t.checked && (await incl.liga()); t.checked = cfg.inclinar; }
  if (t.id === 'aSens') cfg.sens = +t.value; if (t.id === 'aAvalia') { if (t.value === 'auto' && cfg.avalia !== 'auto') { const antes = cfg.avalia; t.value = antes;
    confirma({ titulo: 'Análise automática em teste', texto: 'O detector ainda está em fase de teste e as medidas podem ser imprecisas. Ele mostra um palpite de nota na hora da avaliação, mas quem decide a nota é sempre o fonoaudiólogo. Funciona nas pistas 1, 2 e 3; encontros consonantais (pista 4) ainda não são analisados. Use em silêncio, com o aparelho a um palmo da boca.',
      botoes: [['Cancelar', 'btn', () => foca('tAjustes')], ['Usar em teste', 'btn pri', () => { cfg.avalia = 'auto'; $('#aAvalia').value = 'auto'; aplicaCfg(); foca('tAjustes'); }]] }); }
    else cfg.avalia = t.value; } if (t.id === 'aRapido') cfg.rapido = t.checked; 
  if (t.id === 'aIntenso') cfg.intenso = t.checked; if (t.id === 'aZoom') cfg.zoom = t.checked; if (t.id === 'aRetomada') cfg.retomada = t.checked; if (t.id === 'aGrande') cfg.cenGrande = t.checked; if (t.id === 'aSemCen') { cfg.semCenario = t.checked; $('#aGrande').disabled = t.checked; }
  if (t.id === 'aQual') cfg.qualidade = t.value; if (t.id === 'aReduz') cfg.reduz = t.checked; if (t.id === 'aFps') cfg.fps = t.checked;
  aplicaCfg(); if (t.id === 'aVolSfx') Audio.toca('coletar'); if (t.id === 'aVolVoz' && e.type === 'input') { clearTimeout(vozT); vozT = setTimeout(() => Audio.fala('fr_n10_a'), 250); }
});

// ---------- avatares ----------
let inicioPartida = Date.now(), ultimaSessao = null;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ehIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const instalado = () => matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone;

function pintaTitulo() {
  const av = Perfis.ativo(), b = $('#bAvatar');
  b.innerHTML = av ? `${tiririSVG(av.cor, 34)}<span>${esc(av.apelido)} · trocar</span>` : 'Entrar no avatar';
  b.setAttribute('aria-label', av ? `Avatar ${av.apelido}. Trocar de avatar` : 'Entrar no avatar');
}
$('#bAvatar').onclick = () => { pintaAvatares(); mostra('tAvatares'); };
function entraAvatar(av) {
  Perfis.entra(av.id); if (av.prefs) Object.assign(cfg, av.prefs);
  pistaSel = PISTAS.find((p) => p.id === cfg.pista) || pistaSel; nivelSel = NIVEIS[cfg.nivel] || nivelSel; cartoes(); aplicaCfg();
}
function pintaAvatares() {
  const l = Perfis.lista(), ativo = Perfis.ativo();
  $('#avInstala').hidden = !(ehIOS && !instalado() && l.length);
  $('#avInstala').innerHTML = '<b>Dica para iPhone e iPad:</b> toque em Compartilhar e depois em "Adicionar à Tela de Início". Assim o aparelho não apaga os avatares quando o jogo fica dias sem ser aberto.';
  $('#listaAvatares').innerHTML = (ativo ? `<div class="av-cartao" style="grid-column:1/-1;flex-direction:row;align-items:center;justify-content:space-between;flex-wrap:wrap"><span>Jogando como <b>${esc(ativo.apelido)}</b></span><button class="btn" data-av-sair>Sair do avatar</button></div>` : '') +
    (l.length ? l.map((a) => {
      const sub = [a.idade ? a.idade + ' anos' : '', a.ultimoJogo ? 'Último jogo: ' + new Date(a.ultimoJogo).toLocaleDateString('pt-BR') : 'Ainda não jogou', a.sessoes.length + (a.sessoes.length === 1 ? ' partida' : ' partidas')].filter(Boolean).join(' · ');
      return `<div class="av-cartao ${ativo && ativo.id === a.id ? 'ativo' : ''}"><div class="av-cab">${tiririSVG(a.cor, 72)}<div><b>${esc(a.apelido)}</b><small>${esc(sub)}</small></div></div>
        ${Perfis.precisaBackup(a) ? '<div class="av-backup">Faz mais de 7 dias sem baixar o registro. Vale guardar uma cópia.</div>' : ''}
        <div class="av-acoes"><button class="btn pri" data-av-jogar="${a.id}">Jogar</button><button class="btn" data-av-hist="${a.id}">Histórico</button><button class="btn" data-av-edit="${a.id}">Editar</button><button class="btn perigo" data-av-del="${a.id}" style="grid-column:1/-1">Excluir</button></div></div>`;
    }).join('') : '<div class="av-vazio">Nenhum avatar ainda. Crie um para guardar o histórico e os relatórios de cada criança.</div>');
}
$('#listaAvatares').onclick = (e) => {
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if ('avSair' in d) { Perfis.sai(); pintaAvatares(); foca('tAvatares'); return; }
  const av = Perfis.get(d.avJogar || d.avHist || d.avEdit || d.avDel); if (!av) return;
  if (d.avJogar) { entraAvatar(av); mostra('tPista'); }
  else if (d.avHist) abreHistorico(av);
  else if (d.avEdit) abreEdicao(av);
  else if (d.avDel) confirma({ titulo: `Excluir ${av.apelido}?`, texto: `O histórico de ${av.sessoes.length} ${av.sessoes.length === 1 ? 'partida' : 'partidas'} será apagado deste aparelho. Isso não pode ser desfeito.`,
    botoes: [['Baixar registro antes', 'btn', () => { const f = Perfis.arquivo(av.id); baixa(f.blob, f.nome); Perfis.marcaBackup(av.id); return false; }], ['Excluir', 'btn perigo-forte', () => { Perfis.exclui(av.id); pintaAvatares(); pintaTitulo(); }], ['Cancelar', 'btn pri', () => {}]] });
};
$('#avNovo').onclick = () => abreEdicao(null);
$('#avImportar').onclick = () => $('#avArquivo').click();
$('#avArquivo').onchange = async (e) => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try { const r = Perfis.importa(await f.text()); pintaAvatares(); confirma({ titulo: r.novo ? 'Avatar importado' : 'Registro atualizado', texto: r.novo ? `${r.apelido} foi adicionado com ${r.adicionadas} ${r.adicionadas === 1 ? 'partida' : 'partidas'}.` : `${r.adicionadas ? r.adicionadas + (r.adicionadas === 1 ? ' partida nova foi juntada' : ' partidas novas foram juntadas') : 'Nenhuma partida nova'} ao histórico de ${r.apelido}.`, botoes: [['Pronto', 'btn pri', () => {}]] }); }
  catch (err) { confirma({ titulo: 'Não foi possível importar', texto: err.message, botoes: [['Voltar', 'btn pri', () => {}]] }); }
};

// edição
let editando = null, corEd = 'original';
function abreEdicao(av) {
  editando = av; corEd = av ? av.cor : 'original';
  $('#edTitulo').textContent = av ? 'Editar avatar' : 'Novo avatar';
  $('#edApelido').value = av ? av.apelido : ''; $('#edIdade').value = av ? av.idade : ''; $('#edInicio').value = av ? av.inicio : ''; $('#edSemMic').checked = !!(av && av.semMic);
  $('#edAcoes').hidden = !av; $('#edCompartilhar').hidden = !podeCompartilhar();
  pintaCores(); mostra('tAvatarEdit'); $('#edApelido').focus();
}
function pintaCores() {
  $('#edImagem').innerHTML = tiririSVG(corEd, 96);
  $('#edCores').innerHTML = CORES.map((c) => `<button type="button" role="radio" aria-checked="${c.id === corEd}" aria-label="${c.nome}" data-cor="${c.id}" style="background:${c.casco}"></button>`).join('');
}
$('#edCores').onclick = (e) => { const b = e.target.closest('[data-cor]'); if (b) { corEd = b.dataset.cor; pintaCores(); $(`[data-cor="${corEd}"]`).focus(); } };
$('#edVoltar').onclick = () => { pintaAvatares(); mostra('tAvatares'); };
$('#edForm').onsubmit = (e) => {
  e.preventDefault(); const apelido = $('#edApelido').value.trim(); if (!apelido) { $('#edApelido').focus(); return; }
  const d = { apelido, idade: $('#edIdade').value, inicio: $('#edInicio').value, cor: corEd, semMic: $('#edSemMic').checked };
  if (editando) Perfis.atualiza(editando.id, d);
  else { const av = Perfis.cria({ ...d, prefs: null }); Perfis.salvaPrefs(av.id, cfg); entraAvatar(Perfis.get(av.id)); pintaAvatares(); mostra('tAvatares'); confirma({ titulo: `Olá, ${apelido}!`, texto: 'O avatar foi criado e já está ativo. As preferências atuais foram salvas nele; para mudar, use Ajustes e depois "Salvar preferências no avatar".', botoes: [['Jogar agora', 'btn pri', () => mostra('tPista')], ['Ajustes', 'btn', () => abre('tAjustes')]] }); return; }
  pintaAvatares(); pintaTitulo(); mostra('tAvatares');
};
const exportaAvatar = async (modo) => { const f = Perfis.arquivo(editando.id); const r = modo === 'compartilhar' ? await compartilha(f.blob, f.nome, `Registro do Tiriri: ${editando.apelido}`) : (baixa(f.blob, f.nome), 'baixado'); if (r !== 'cancelado') Perfis.marcaBackup(editando.id); };
$('#edBaixar').onclick = () => exportaAvatar('baixar'); $('#edCompartilhar').onclick = () => exportaAvatar('compartilhar');

// preferências no avatar (tela de ajustes)
function pintaAjAvatar() {
  const av = Perfis.ativo(), el = $('#ajAvatar'); el.hidden = !av; if (!av) return;
  el.innerHTML = `${tiririSVG(av.cor, 44)}<span>${esc(av.apelido)}<small>Volumes, cenários, efeitos e câmera podem ficar salvos neste avatar.</small></span><button class="btn" id="ajSalvaAv">Salvar preferências no avatar</button>`;
  $('#ajSalvaAv').onclick = () => { Perfis.salvaPrefs(av.id, cfg); $('#ajSalvaAv').textContent = 'Preferências salvas'; $('#ajSalvaAv').disabled = true; };
}

// confirmação (pop-up)
function confirma({ titulo, texto, botoes }) {
  $('#coTitulo').textContent = titulo; $('#coTexto').textContent = texto;
  $('#coBotoes').innerHTML = botoes.map(([r, c], i) => `<button class="${c}" data-i="${i}" ${c.includes('pri') ? 'data-foco' : ''}>${esc(r)}</button>`).join('');
  $('#coBotoes').onclick = (e) => { const b = e.target.closest('[data-i]'); if (!b) return; const r = botoes[+b.dataset.i][2](); if (r !== false) { $('#tConfirma').hidden = true; } };
  $('#tConfirma').hidden = false; foca('tConfirma');
}

// ---------- registro da partida ----------
function registraPartida(r) {
  const av = Perfis.ativo();
  ultimaSessao = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), data: new Date(inicioPartida).toISOString(), duracao: Math.round((Date.now() - inicioPartida) / 1000),
    pista: pistaSel.id, nivel: nivelSel.id, modo: cfg.rapido || rapidoUrl ? 'rapido' : cfg.avalia, vitoria: r.vitoria, bola: r.pontos, obs: '',
    palavras: r.palavras.map((p) => ({ w: p.w, som: p.som || 'r', sil: p.sil || '', nota: p.nota ?? null, avaliacao: p.avaliacao || 'direta', treino: !!p.treino, tentativas: p.tentativas || 0, pontos: p.pontos, auto: p.auto || null })) };
  if (av) Perfis.registraSessao(av.id, ultimaSessao);
}

// ---------- relatório da partida ----------
let relSessao = null, relAvatar = null, relVolta = 'tFim';
function abreRelatorio(s, av, volta) {
  if (!s) return; relSessao = s; relAvatar = av; relVolta = volta; const q = resumoSessao(s);
  $('#reApelido').value = av ? av.apelido : (s.apelido || ''); $('#reObs').value = s.obs || '';
  $('#reResumo').innerHTML = `<p class="fraco" style="text-align:left;margin:0 0 .5rem">${dataHora(s.data)} · Pista ${s.pista} (${PISTA_CURTA[s.pista]}) · ${NIVEL_NOME[s.nivel]} · ${duracao(s.duracao)} · ${MODO_NOME[s.modo] || s.modo}</p>
    <div class="ladrilhos"><div class="ladrilho"><b>${q.palavras}</b><span>Palavras</span></div><div class="ladrilho"><b>${q.media == null ? '–' : q.media.toFixed(1).replace('.', ',')}</b><span>Nota média</span></div><div class="ladrilho"><b>${q.treinos}</b><span>Treinos</span></div></div>
    <div class="re-palavras">${s.palavras.map((p) => `<span>${esc(p.w)}${p.nota != null ? `<i class="nota" style="background:${COR_NOTA[p.nota]}">${p.nota}</i>` : ''}</span>`).join('') || '<i class="fraco">Nenhuma palavra nova nesta partida.</i>'}</div>`;
  $('#reCompartilhar').hidden = !podeCompartilhar();
  mostra('tRelatorio');
}
function guardaObs() { relSessao.obs = $('#reObs').value; relSessao.apelido = $('#reApelido').value.trim(); if (relAvatar) Perfis.atualizaSessao(relAvatar.id, relSessao.id, { obs: relSessao.obs }); }
async function geraPartida(modo) {
  guardaObs(); const b = modo === 'compartilhar' ? $('#reCompartilhar') : $('#reBaixar'), t = b.textContent; b.textContent = 'Gerando…'; b.disabled = true;
  try { const f = await pdfPartida(relSessao, { apelido: relSessao.apelido, obs: relSessao.obs, avatar: relAvatar }); if (modo === 'compartilhar') await compartilha(f.blob, f.nome, 'Relatório da partida'); else baixa(f.blob, f.nome); }
  catch (e) { console.error(e); confirma({ titulo: 'Não foi possível gerar o PDF', texto: 'Confira a conexão com a internet na primeira vez e tente de novo.', botoes: [['Voltar', 'btn pri', () => {}]] }); }
  b.textContent = t; b.disabled = false;
}
$('#reBaixar').onclick = () => geraPartida('baixar'); $('#reCompartilhar').onclick = () => geraPartida('compartilhar');
$('#reVoltar').onclick = () => { guardaObs(); if (relVolta === 'tHistorico') abreHistorico(relAvatar, hiPeriodo); else mostra(relVolta); };

// ---------- histórico ----------
let hiAvatar = null, hiPeriodo = 'mes';
function abreHistorico(av, per = hiPeriodo) { hiAvatar = Perfis.get(av.id); hiPeriodo = per; mostra('tHistorico'); pintaHistorico(); }
$('#hiAbas').onclick = (e) => { const b = e.target.closest('[data-p]'); if (b) { hiPeriodo = b.dataset.p; pintaHistorico(); b.focus(); } };
$('#hiVoltar').onclick = () => { pintaAvatares(); mostra('tAvatares'); };
function pintaHistorico() {
  const av = hiAvatar, r = periodo(av, hiPeriodo), t = r.total, f1 = (v) => (v == null ? '–' : v.toFixed(1).replace('.', ','));
  $('#hiTopo').innerHTML = `${tiririSVG(av.cor, 64)}<div><h2>Histórico de ${esc(av.apelido)}</h2><small>${esc(rotuloPeriodo(r))}${av.inicio ? ' · início do tratamento: ' + new Date(av.inicio + 'T12:00').toLocaleDateString('pt-BR') : ''}</small></div>`;
  $$('#hiAbas .aba').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.p === hiPeriodo)));
  if (!t.partidas) { $('#hiCorpo').innerHTML = '<div class="vazio-hist">Ainda não há partidas neste período. Jogue com este avatar para ver a evolução aqui.</div>'; $('#hiBaixar').disabled = $('#hiCompartilhar').disabled = true; $('#hiCompartilhar').hidden = true; return; }
  $('#hiBaixar').disabled = $('#hiCompartilhar').disabled = false; $('#hiCompartilhar').hidden = !podeCompartilhar();
  const gs = graficos(r);
  $('#hiCorpo').innerHTML = `<div class="ladrilhos"><div class="ladrilho"><b>${t.partidas}</b><span>Partidas</span></div><div class="ladrilho"><b>${t.minutos}</b><span>Minutos de jogo</span></div><div class="ladrilho"><b>${t.palavras}</b><span>Palavras praticadas</span></div><div class="ladrilho"><b>${f1(t.media)}</b><span>Nota média</span></div><div class="ladrilho"><b>${t.pct10 == null ? '–' : Math.round(t.pct10) + '%'}</b><span>Notas 10</span></div></div>
    <div class="graficos">${gs.map((g, i) => `<div class="grafico"><h4>${g.titulo}</h4><p>${g.sub}</p>${g.tipo === 'pilha' ? `<div class="legenda">${g.nomes.map((n, k) => `<span><i style="background:${g.cores[k]}"></i>nota ${n}</span>`).join('')}</div>` : ''}<canvas data-g="${i}" role="img" aria-label="${esc(g.titulo)}"></canvas><div class="dica" hidden></div></div>`).join('')}</div>
    <h3>Palavras para trabalhar</h3>${r.dificeis.length ? `<div class="tabela-rolagem"><table class="hist-tab"><tr><th>Palavra</th><th>Sílaba alvo</th><th>Vezes avaliada</th><th>Nota média</th></tr>${r.dificeis.map((x) => `<tr><td><b>${esc(x.w)}</b></td><td>${esc(x.sil || '–')}</td><td>${x.n}</td><td>${f1(x.media)}</td></tr>`).join('')}</table></div>` : `<p class="fraco" style="text-align:left">${t.avaliadas ? 'Todas as palavras avaliadas tiveram nota 10.' : 'Sem notas do fonoaudiólogo neste período.'}</p>`}
    <h3>Partidas</h3><div class="tabela-rolagem"><table class="hist-tab"><tr><th>Data</th><th>Pista</th><th class="so-largo">Nível</th><th>Palavras</th><th>Nota média</th><th></th></tr>${r.sessoes.map((s) => { const q = resumoSessao(s); return `<tr><td>${new Date(s.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td><td>${s.pista} · ${PISTA_CURTA[s.pista]}</td><td class="so-largo">${NIVEL_NOME[s.nivel]}</td><td>${q.palavras}</td><td>${f1(q.media)}</td><td><button class="btn" data-sessao="${s.id}">Relatório</button></td></tr>`; }).join('')}</table></div>`;
  requestAnimationFrame(() => $$('#hiCorpo canvas[data-g]').forEach((cv) => { const w = cv.parentElement.clientWidth - 22; desenha(cv, gs[+cv.dataset.g], w, Math.max(170, Math.min(230, w * 0.55)), Math.min(3, window.devicePixelRatio || 1) * 1.5); ligaDica(cv, cv.nextElementSibling); }));
}
$('#hiCorpo').onclick = (e) => { const b = e.target.closest('[data-sessao]'); if (b) abreRelatorio(hiAvatar.sessoes.find((s) => s.id === b.dataset.sessao), hiAvatar, 'tHistorico'); };
async function geraPeriodo(modo) {
  const b = modo === 'compartilhar' ? $('#hiCompartilhar') : $('#hiBaixar'), t = b.textContent; b.textContent = 'Gerando…'; b.disabled = true;
  try { const f = await pdfPeriodo(hiAvatar, hiPeriodo); if (modo === 'compartilhar') await compartilha(f.blob, f.nome, `Relatório de ${hiAvatar.apelido}`); else baixa(f.blob, f.nome); }
  catch (e) { console.error(e); confirma({ titulo: 'Não foi possível gerar o PDF', texto: 'Tente de novo em instantes.', botoes: [['Voltar', 'btn pri', () => {}]] }); }
  b.textContent = t; b.disabled = false;
}
$('#hiBaixar').onclick = () => geraPeriodo('baixar'); $('#hiCompartilhar').onclick = () => geraPeriodo('compartilhar');
window.addEventListener('resize', () => { if (!$('#tHistorico').hidden) pintaHistorico(); });

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
  redimensiona(); { const av = Perfis.ativo(); if (av && av.prefs) Object.assign(cfg, av.prefs); pistaSel = PISTAS.find((p) => p.id === cfg.pista) || pistaSel; nivelSel = NIVEIS[cfg.nivel] || nivelSel; } cartoes();
  const inicio = performance.now(); let pronto = false;
  const carga = (async () => { let a = 0, b = 0; const pinta = () => ($('#progCarga').style.width = Math.round((a * 0.6 + b * 0.4) * 100) + '%'); await Promise.all([mundo.carrega((v) => { a = v; pinta(); }), Audio.carrega((v) => { b = v; pinta(); })]); pronto = true; })();
  carga.catch((e) => { console.error(e); $('#txtCarga').textContent = 'Não foi possível carregar o jogo. Recarregue a página.'; });
  await new Promise((r) => setTimeout(r, 3100)); $('#tAbertura').hidden = true;
  if (!pronto) { $('#tCarrega').hidden = false; await carga; }
  aplicaCfg(); $('#barra').hidden = false; requestAnimationFrame(laco); vaiMenu();
  // frases da Dálete: carregadas em segundo plano; o título é falado na primeira tela
  Audio.fala('fr_titulo', { atraso: 0.4 });
  Audio.preCarrega(['fr_escolha_pista', 'fr_pista1', 'fr_pista2', 'fr_pista3', 'fr_pista4', 'fr_escolha_nivel', 'fr_facil', 'fr_normal', 'fr_dificil', 'fr_preparar', 'fr_largada', 'fr_contagem', 'fr_continuar', 'fr_fale_palavra', 'fr_sua_vez', 'fr_cuidado', 'fr_pegue', 'fr_portal_r', 'fr_portal_l', 'fr_vitoria_a', 'fr_vitoria_b', 'fr_derrota', 'fr_nao_ouvi', 'fr_microfone', 'fr_treino_a', 'fr_treino_b', ...['10', '5', '2'].flatMap((n) => ['a', 'b', 'c'].map((l) => `fr_n${n}_${l}`)), 'fr_ajuda1', 'fr_ajuda2', 'fr_ajuda3']);
  console.info(`Tiriri, o Besourinho: carregado em ${Math.round(performance.now() - inicio)} ms`);
})();
