// Relatórios: estatísticas do histórico, gráficos (tela e PDF) e geração do PDF com a identidade da Brincolar Games.
import { tiririPNG } from './perfis.js';

export const PISTA_NOME = { 1: 'R no fim da palavra', 2: 'R no meio da palavra', 3: 'Portais do R e do L', 4: 'R junto de outra consoante' };
export const PISTA_CURTA = { 1: 'R no fim', 2: 'R no meio', 3: 'R e L', 4: 'Encontros' };
export const NIVEL_NOME = { facil: 'Fácil', normal: 'Normal', dificil: 'Difícil' };
export const AVALIACAO_NOME = { gravacao: 'Com gravação', direta: 'Avaliação direta', livre: 'Sem análise', rapido: 'Exercício rápido', auto: 'Automática' };
export const MODO_NOME = { fono: 'Fonoaudiólogo', livre: 'Sem análise (uso em casa)', auto: 'Automático (em teste)', rapido: 'Exercício rápido (teste)' };
// notas: cores validadas para daltonismo (verde, amarelo, azul) sempre com rótulo
export const COR_NOTA = { 10: '#1f9d55', 5: '#e0a100', 2: '#2b6cd6' };
const ROXO = '#6541a8', TINTA = '#1b1025', TINTA2 = '#52514e', GRADE = '#ebe7f0';

const clinica = (p) => p.nota != null && ['gravacao', 'direta', 'auto'].includes(p.avaliacao);
const dia = (d) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
export const dataHora = (d) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const duracao = (s) => { const m = Math.round(s / 60); return m < 1 ? 'menos de 1 min' : m + ' min'; };
const fmt = (v, c = 1) => (v == null || isNaN(v) ? '–' : v.toFixed(c).replace('.', ','));

export function resumoSessao(s) {
  const ps = s.palavras || [], av = ps.filter(clinica), n = { 10: 0, 5: 0, 2: 0 };
  av.forEach((p) => (n[p.nota] = (n[p.nota] || 0) + 1));
  return { palavras: ps.length, avaliadas: av.length, notas: n, media: av.length ? av.reduce((a, p) => a + p.nota, 0) / av.length : null, treinos: ps.filter((p) => p.treino).length };
}

// ---------- períodos e agrupamentos ----------
const inicioDia = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const inicioSemana = (d) => { const x = inicioDia(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
export const PERIODOS = { semana: 'Semana', mes: 'Mês', inicio: 'Desde o início' };
export function periodo(av, tipo) {
  const todas = (av.sessoes || []).slice().sort((a, b) => a.data.localeCompare(b.data)), hoje = inicioDia(new Date());
  let de, baldes = [];
  if (tipo === 'semana') { de = new Date(hoje); de.setDate(de.getDate() - 6); for (let i = 0; i < 7; i++) { const a = new Date(de); a.setDate(a.getDate() + i); const b = new Date(a); b.setDate(b.getDate() + 1); baldes.push({ a, b, rot: a.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '') + ' ' + a.getDate() }); } }
  else if (tipo === 'mes') { de = new Date(hoje); de.setDate(de.getDate() - 29); for (let a = inicioSemana(de); a <= hoje; a = new Date(a.getTime() + 7 * 864e5)) baldes.push({ a, b: new Date(a.getTime() + 7 * 864e5), rot: dia(a) }); }
  else {
    de = todas.length ? inicioDia(todas[0].data) : hoje; const semanas = (hoje - inicioSemana(de)) / (7 * 864e5);
    if (semanas <= 16) for (let a = inicioSemana(de); a <= hoje; a = new Date(a.getTime() + 7 * 864e5)) baldes.push({ a, b: new Date(a.getTime() + 7 * 864e5), rot: dia(a) });
    else for (let a = new Date(de.getFullYear(), de.getMonth(), 1); a <= hoje; a = new Date(a.getFullYear(), a.getMonth() + 1, 1)) baldes.push({ a, b: new Date(a.getFullYear(), a.getMonth() + 1, 1), rot: a.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '') });
  }
  const sess = todas.filter((s) => new Date(s.data) >= de);
  for (const b of baldes) {
    const ss = sess.filter((s) => { const d = new Date(s.data); return d >= b.a && d < b.b; }), ps = ss.flatMap((s) => s.palavras || []), av = ps.filter(clinica);
    Object.assign(b, { partidas: ss.length, palavras: ps.length, minutos: Math.round(ss.reduce((a, s) => a + (s.duracao || 0), 0) / 60), n10: av.filter((p) => p.nota === 10).length, n5: av.filter((p) => p.nota === 5).length, n2: av.filter((p) => p.nota === 2).length, media: av.length ? av.reduce((a, p) => a + p.nota, 0) / av.length : null,
      auto: ps.filter((p) => p.auto && p.auto.nota != null && clinica(p)), });
    b.concord = b.auto.length ? b.auto.filter((p) => p.auto.nota === p.nota).length / b.auto.length * 100 : null;
  }
  const ps = sess.flatMap((s) => (s.palavras || []).map((p) => ({ ...p, pista: s.pista }))), aval = ps.filter(clinica);
  const porPista = [1, 2, 3, 4].map((k) => { const l = aval.filter((p) => String(p.pista) === String(k)); return { rot: PISTA_CURTA[k], n: l.length, media: l.length ? l.reduce((a, p) => a + p.nota, 0) / l.length : null }; });
  const pw = new Map(); for (const p of aval) { const x = pw.get(p.w) || { w: p.w, sil: p.sil, n: 0, soma: 0, tent: 0 }; x.n++; x.soma += p.nota; x.tent += p.tentativas || 0; pw.set(p.w, x); }
  const dificeis = [...pw.values()].map((x) => ({ ...x, media: x.soma / x.n })).filter((x) => x.media < 10).sort((a, b) => a.media - b.media || b.n - a.n).slice(0, 8);
  const comAuto = aval.filter((p) => p.auto && p.auto.nota != null);
  const ate = new Date(hoje); ate.setDate(ate.getDate());
  return { tipo, de, ate, baldes, sessoes: sess.slice().reverse(), porPista, dificeis,
    total: { partidas: sess.length, minutos: Math.round(sess.reduce((a, s) => a + (s.duracao || 0), 0) / 60), palavras: ps.length, avaliadas: aval.length, media: aval.length ? aval.reduce((a, p) => a + p.nota, 0) / aval.length : null, pct10: aval.length ? aval.filter((p) => p.nota === 10).length / aval.length * 100 : null, treinos: ps.filter((p) => p.treino).length, concord: comAuto.length ? comAuto.filter((p) => p.auto.nota === p.nota).length / comAuto.length * 100 : null, nAuto: comAuto.length } };
}
export function rotuloPeriodo(r) {
  if (r.tipo === 'inicio') return r.total.partidas ? `Desde o início (${r.de.toLocaleDateString('pt-BR')} a ${new Date().toLocaleDateString('pt-BR')})` : 'Desde o início';
  return `${r.tipo === 'semana' ? 'Últimos 7 dias' : 'Últimos 30 dias'} (${r.de.toLocaleDateString('pt-BR')} a ${new Date().toLocaleDateString('pt-BR')})`;
}

// ---------- gráficos (canvas, fundo claro; servem para a tela e para o PDF) ----------
export function graficos(r) {
  const b = r.baldes, rot = b.map((x) => x.rot), lista = [
    { id: 'media', titulo: 'Nota média', sub: 'Média das notas do fonoaudiólogo (2 a 10)', tipo: 'linha', rot, valores: b.map((x) => x.media), max: 10, fixo: true, formato: (v) => fmt(v) },
    { id: 'notas', titulo: 'Notas 10, 5 e 2', sub: 'Quantas falas receberam cada nota', tipo: 'pilha', rot, series: [b.map((x) => x.n10), b.map((x) => x.n5), b.map((x) => x.n2)], nomes: ['10', '5', '2'], cores: [COR_NOTA[10], COR_NOTA[5], COR_NOTA[2]] },
    { id: 'pista', titulo: 'Nota média por tipo de R', sub: 'Em qual posição do R está mais fácil ou difícil', tipo: 'barras', rot: r.porPista.map((x) => x.rot), valores: r.porPista.map((x) => x.media), max: 10, fixo: true, formato: (v) => fmt(v), extra: r.porPista.map((x) => (x.n ? x.n + ' falas' : 'sem dados')) },
    { id: 'palavras', titulo: 'Palavras praticadas', sub: 'Inclui as partidas sem análise (em casa)', tipo: 'barras', rot, valores: b.map((x) => x.palavras), formato: (v) => String(v) },
    { id: 'minutos', titulo: 'Minutos de jogo', sub: 'Tempo total das partidas', tipo: 'barras', rot, valores: b.map((x) => x.minutos), formato: (v) => String(v) },
  ];
  if (r.total.nAuto) lista.push({ id: 'concord', titulo: 'Concordância da análise automática', sub: '% de vezes em que o palpite foi igual à nota do fonoaudiólogo', tipo: 'linha', rot, valores: b.map((x) => x.concord), max: 100, fixo: true, formato: (v) => Math.round(v) + '%' });
  return lista;
}

const arred = (c, x, y, w, h, r) => { r = Math.max(0, Math.min(r, w / 2, h)); c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h); c.closePath(); };
const passoBom = (max) => { const alvo = max / 4, p = Math.pow(10, Math.floor(Math.log10(alvo || 1))), m = alvo / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; };
export function desenha(canvas, g, w, h, esc = 2) {
  canvas.width = Math.round(w * esc); canvas.height = Math.round(h * esc); const c = canvas.getContext('2d'); c.setTransform(esc, 0, 0, esc, 0, 0);
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
  const fonte = (p, peso = 600) => `${peso} ${p}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
  const n = g.rot.length, totais = g.tipo === 'pilha' ? g.rot.map((_, i) => g.series.reduce((a, s) => a + (s[i] || 0), 0)) : g.valores.map((v) => v || 0);
  let max = g.fixo ? g.max : Math.max(1, ...totais); const passo = g.fixo ? (g.max === 10 ? 2 : 25) : passoBom(max); if (!g.fixo) max = Math.ceil(max / passo) * passo;
  const mE = 30, mD = 8, mT = 14, mB = n > 8 ? 30 : 22, L = w - mE - mD, A = h - mT - mB, x0 = mE, y0 = mT;
  c.font = fonte(10); c.textAlign = 'right'; c.textBaseline = 'middle';
  for (let v = 0; v <= max + 1e-9; v += passo) { const y = y0 + A - (v / max) * A; c.fillStyle = GRADE; c.fillRect(x0, Math.round(y), L, 1); c.fillStyle = TINTA2; c.fillText(g.id === 'concord' ? v + '%' : String(v), x0 - 5, y); }
  const bw = L / n, regioes = [];
  c.textAlign = 'center'; c.textBaseline = 'top'; c.fillStyle = TINTA2; c.font = fonte(n > 8 ? 8.5 : 10);
  g.rot.forEach((r, i) => { const x = x0 + bw * (i + 0.5); if (n > 10 && i % 2) return; c.save(); if (n > 8) { c.translate(x, y0 + A + 5); c.rotate(-0.5); c.textAlign = 'right'; c.fillText(r, 0, 0); } else c.fillText(r, x, y0 + A + 6); c.restore(); });
  const Y = (v) => y0 + A - (v / max) * A;
  if (g.tipo === 'linha') {
    c.strokeStyle = ROXO; c.lineWidth = 2; c.lineJoin = 'round'; c.beginPath(); let dentro = false;
    g.valores.forEach((v, i) => { const x = x0 + bw * (i + 0.5); if (v == null) { dentro = false; return; } if (!dentro) c.moveTo(x, Y(v)); else c.lineTo(x, Y(v)); dentro = true; }); c.stroke();
    const vals = g.valores.map((v, i) => [v, i]).filter(([v]) => v != null), ult = vals.length ? vals[vals.length - 1][1] : -1;
    g.valores.forEach((v, i) => { const x = x0 + bw * (i + 0.5); regioes.push({ x0: x0 + bw * i, x1: x0 + bw * (i + 1), txt: `${g.rot[i]}: ${v == null ? 'sem notas' : g.formato(v)}` }); if (v == null) return;
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x, Y(v), 5.5, 0, 7); c.fill(); c.fillStyle = ROXO; c.beginPath(); c.arc(x, Y(v), 4, 0, 7); c.fill();
      if (i === ult || vals.length <= 7) { c.fillStyle = TINTA; c.font = fonte(10, 700); c.textBaseline = 'bottom'; c.fillText(g.formato(v), x, Y(v) - 7); } });
    if (!vals.length) { c.fillStyle = TINTA2; c.font = fonte(11); c.textBaseline = 'middle'; c.fillText('Sem notas neste período', x0 + L / 2, y0 + A / 2); }
  } else {
    const larg = Math.min(34, bw * 0.62);
    g.rot.forEach((_, i) => {
      const x = x0 + bw * (i + 0.5) - larg / 2;
      if (g.tipo === 'barras') { const v = g.valores[i]; regioes.push({ x0: x0 + bw * i, x1: x0 + bw * (i + 1), txt: `${g.rot[i]}: ${v == null ? 'sem dados' : g.formato(v)}${g.extra ? ' (' + g.extra[i] + ')' : ''}` }); if (v == null || v === 0) return;
        c.fillStyle = ROXO; arred(c, x, Y(v), larg, y0 + A - Y(v), 4); c.fill(); c.fillStyle = TINTA; c.font = fonte(10, 700); c.textBaseline = 'bottom'; c.fillText(g.formato(v), x + larg / 2, Y(v) - 3); }
      else { let base = 0; const partes = [];
        g.series.forEach((s, k) => { const v = s[i] || 0; if (!v) return; const yA = Y(base + v), yB = Y(base); c.fillStyle = g.cores[k]; const topo = g.series.slice(k + 1).every((ss) => !(ss[i] || 0)); if (topo) arred(c, x, yA, larg, yB - yA - (base ? 2 : 0), 4); else { c.beginPath(); c.rect(x, yA + 2, larg, yB - yA - 2 - (base ? 2 : 0)); } c.fill(); base += v; partes.push(`nota ${g.nomes[k]}: ${v}`); });
        regioes.push({ x0: x0 + bw * i, x1: x0 + bw * (i + 1), txt: `${g.rot[i]}: ${partes.join(' · ') || 'sem notas'}` });
        if (base) { c.fillStyle = TINTA; c.font = fonte(10, 700); c.textBaseline = 'bottom'; c.fillText(String(base), x + larg / 2, Y(base) - 3); } }
    });
  }
  c.fillStyle = '#c9c2d6'; c.fillRect(x0, y0 + A, L, 1);
  canvas._regioes = regioes; canvas._w = w; return canvas;
}
// dica ao passar o dedo ou o mouse sobre o gráfico
export function ligaDica(canvas, dica) {
  const mostra = (e) => { const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) * (canvas._w / r.width), g = (canvas._regioes || []).find((q) => x >= q.x0 && x < q.x1); if (!g) return esconde(); dica.textContent = g.txt; dica.hidden = false; const p = canvas.parentElement.getBoundingClientRect(); dica.style.left = Math.max(4, Math.min(p.width - dica.offsetWidth - 4, e.clientX - p.left - dica.offsetWidth / 2)) + 'px'; dica.style.top = (r.top - p.top + 4) + 'px'; };
  const esconde = () => { dica.hidden = true; };
  canvas.addEventListener('pointermove', mostra); canvas.addEventListener('pointerdown', mostra); canvas.addEventListener('pointerleave', esconde);
}

// ---------- PDF ----------
let jsPDFP = null;
function carregaJsPDF() { if (!jsPDFP) jsPDFP = new Promise((ok, erro) => { if (window.jspdf) return ok(window.jspdf.jsPDF); const s = document.createElement('script'); s.src = 'vendor/jspdf/jspdf.umd.min.js'; s.onload = () => ok(window.jspdf.jsPDF); s.onerror = () => { jsPDFP = null; erro(new Error('Não foi possível carregar o gerador de PDF.')); }; document.head.appendChild(s); }); return jsPDFP; }
let logoP = null;
const logo = () => (logoP = logoP || new Promise((ok) => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 300; c.getContext('2d').drawImage(im, 0, 0, 300, 300); ok(c.toDataURL('image/png')); }; im.onerror = () => ok(null); im.src = 'assets/img/logo_brincolar.png'; }));
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

class Doc {
  constructor(J, titulo, sub, logo) { this.d = new J({ unit: 'mm', format: 'a4' }); this.titulo = titulo; this.sub = sub; this.logo = logo; this.W = 210; this.H = 297; this.m = 14; this.cabecalho(true); }
  cor(h, tipo = 'fill') { const [r, g, b] = hex(h); if (tipo === 'fill') this.d.setFillColor(r, g, b); else if (tipo === 'draw') this.d.setDrawColor(r, g, b); else this.d.setTextColor(r, g, b); }
  txt(s, x, y, { t = 10, peso = 'normal', cor = TINTA, al = 'left', larg } = {}) { this.d.setFont('helvetica', peso); this.d.setFontSize(t); this.cor(cor, 'text'); const l = Array.isArray(s) ? s : larg ? this.d.splitTextToSize(String(s), larg) : String(s); this.d.text(l, x, y, { align: al, baseline: 'alphabetic' }); return Array.isArray(l) ? l.length : 1; }
  cabecalho(primeira) {
    const d = this.d, h = primeira ? 36 : 20;
    if (this.logo) d.addImage(this.logo, 'PNG', this.m - 2, primeira ? 6 : 3, primeira ? 28 : 15, primeira ? 28 : 15);
    const x = this.m + (primeira ? 30 : 16);
    this.txt(this.titulo, x, primeira ? 19 : 12, { t: primeira ? 19 : 12, peso: 'bold', cor: '#2a1458' });
    this.txt(this.sub, x, primeira ? 26 : 17, { t: primeira ? 10 : 8, cor: TINTA2 });
    this.cor('#ffd23f'); d.rect(0, h, this.W, 2.4, 'F'); this.cor('#e6007e'); d.rect(0, h, 46, 2.4, 'F'); this.cor('#39c6ff'); d.rect(this.W - 38, h, 38, 2.4, 'F');
    this.y = h + 9;
  }
  espaco(alt) { if (this.y + alt > this.H - 16) { this.d.addPage(); this.cabecalho(false); return true; } return false; }
  secao(t) { this.espaco(14); this.txt(t, this.m, this.y + 4, { t: 12.5, peso: 'bold', cor: '#2a1458' }); this.cor(ROXO); this.d.rect(this.m, this.y + 6.2, 12, 0.9, 'F'); this.y += 11; }
  ladrilhos(l) {
    this.espaco(24); const n = l.length, gap = 3, w = (this.W - 2 * this.m - gap * (n - 1)) / n;
    l.forEach(([rot, val, corV], i) => { const x = this.m + i * (w + gap); this.cor('#f4effb'); this.d.roundedRect(x, this.y, w, 20, 2.5, 2.5, 'F'); this.txt(val, x + w / 2, this.y + 10.5, { t: 15, peso: 'bold', cor: corV || '#2a1458', al: 'center' }); this.txt(rot, x + w / 2, this.y + 16.5, { t: 7.5, cor: TINTA2, al: 'center' }); });
    this.y += 25;
  }
  tabela(cols, linhas, { notaCol = -1 } = {}) {
    const larg = this.W - 2 * this.m, tot = cols.reduce((a, c) => a + c.w, 0), ws = cols.map((c) => (c.w / tot) * larg), h = 7;
    const cab = () => { this.cor('#2a1458'); this.d.rect(this.m, this.y, larg, h, 'F'); let x = this.m; cols.forEach((c, i) => { this.txt(c.t, x + (c.al === 'center' ? ws[i] / 2 : 2), this.y + 4.8, { t: 8, peso: 'bold', cor: '#ffffff', al: c.al || 'left' }); x += ws[i]; }); this.y += h; };
    this.espaco(h * 2); cab();
    linhas.forEach((l, k) => {
      if (this.espaco(h)) cab();
      if (k % 2) { this.cor('#f7f4fb'); this.d.rect(this.m, this.y, larg, h, 'F'); }
      let x = this.m;
      l.forEach((v, i) => {
        if (i === notaCol && COR_NOTA[v]) { this.cor(COR_NOTA[v]); this.d.roundedRect(x + ws[i] / 2 - 5, this.y + 1.2, 10, 4.6, 2.3, 2.3, 'F'); this.txt(String(v), x + ws[i] / 2, this.y + 4.8, { t: 8, peso: 'bold', cor: '#ffffff', al: 'center' }); }
        else this.txt(v == null ? '–' : String(v), x + (cols[i].al === 'center' ? ws[i] / 2 : 2), this.y + 4.8, { t: 8.5, peso: i === 0 ? 'bold' : 'normal', cor: TINTA, al: cols[i].al || 'left' });
        x += ws[i];
      });
      this.y += h;
    });
    this.y += 5;
  }
  rodapes() {
    const n = this.d.getNumberOfPages();
    for (let i = 1; i <= n; i++) { this.d.setPage(i); this.cor('#ebe7f0'); this.d.rect(this.m, this.H - 13, this.W - 2 * this.m, 0.3, 'F');
      this.txt('brincolargames.com.br', this.m, this.H - 8, { t: 8, peso: 'bold', cor: ROXO });
      this.txt('Tiriri, o Besourinho · registro de acompanhamento gerado pelo jogo', this.W / 2, this.H - 8, { t: 7, cor: TINTA2, al: 'center' });
      this.txt(`Página ${i} de ${n}`, this.W - this.m, this.H - 8, { t: 8, cor: TINTA2, al: 'right' }); }
  }
  async capa(corId, linha1, linha2) {
    this.espaco(32); this.cor('#f4effb'); this.d.roundedRect(this.m, this.y, this.W - 2 * this.m, 28, 4, 4, 'F');
    const img = await tiririPNG(corId, 240); if (img) this.d.addImage(img, 'PNG', this.m + 3, this.y + 1.5, 25, 25);
    const n = this.txt(linha1, this.m + 32, this.y + 11, { t: 13, peso: 'bold', cor: '#2a1458', larg: this.W - 2 * this.m - 36 });
    this.txt(linha2, this.m + 32, this.y + 11 + n * 5.6, { t: 9.5, cor: TINTA2, larg: this.W - 2 * this.m - 36 });
    this.y += 34;
  }
  info(pares) {
    this.espaco(8 * Math.ceil(pares.length / 2) + 4); const w = (this.W - 2 * this.m) / 2;
    let y = this.y;
    for (let i = 0; i < pares.length; i += 2) {
      let linhas = 1;
      pares.slice(i, i + 2).forEach(([r, v], k) => { const x = this.m + k * w; this.txt(r, x, y + 4, { t: 8, cor: TINTA2 }); linhas = Math.max(linhas, this.txt(v || '–', x + 34, y + 4, { t: 9.5, peso: 'bold', larg: w - 36 })); });
      y += 3.6 + linhas * 3.9;
    }
    this.y = y + 4;
  }
  blob() { this.rodapes(); return this.d.output('blob'); }
}

const nomeArq = (prefixo, apelido, data) => `${prefixo}_${(apelido || 'sem_apelido').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_')}_${new Date(data).toISOString().slice(0, 10)}.pdf`;

export async function pdfPartida(s, { apelido, obs, avatar }) {
  const J = await carregaJsPDF(), D = new Doc(J, 'Relatório da partida', 'Tiriri, o Besourinho · Pistas do R vibrante', await logo()), r = resumoSessao(s), nome = apelido || 'A criança';
  const pista = PISTA_NOME[s.pista] || s.pista;
  await D.capa(avatar ? avatar.cor : 'original', `${nome} praticou ${r.palavras} ${r.palavras === 1 ? 'palavra' : 'palavras'} na pista "${pista}"!`,
    s.vitoria ? `Chegou ao fim da pista com uma bola de papel de ${s.bola} pontos${r.treinos ? ` e fez ${r.treinos} ${r.treinos === 1 ? 'treino' : 'treinos'} com a voz da Dálete` : ''}.` : 'A bola de papel acabou antes da chegada desta vez, mas cada palavra praticada conta.');
  D.info([['Apelido', apelido || 'Não informado'], ['Data e hora', dataHora(s.data)], ['Pista', `${s.pista} · ${pista}`], ['Nível', NIVEL_NOME[s.nivel] || s.nivel], ['Duração', duracao(s.duracao)], ['Quem avaliou', MODO_NOME[s.modo] || s.modo], ...(avatar && avatar.idade ? [['Idade', avatar.idade + ' anos']] : []), ...(avatar && avatar.inicio ? [['Início do tratamento', new Date(avatar.inicio + 'T12:00').toLocaleDateString('pt-BR')]] : [])]);
  D.ladrilhos([['Palavras praticadas', String(r.palavras)], ['Nota média', fmt(r.media)], ['Notas 10', String(r.notas[10]), COR_NOTA[10]], ['Notas 5', String(r.notas[5]), '#a87700'], ['Notas 2', String(r.notas[2]), COR_NOTA[2]], ['Treinos', String(r.treinos)]]);
  D.secao('Palavras praticadas');
  if (s.palavras.length) D.tabela([{ t: 'Palavra', w: 26 }, { t: 'Sílaba alvo', w: 18 }, { t: 'Som', w: 10, al: 'center' }, { t: 'Nota', w: 12, al: 'center' }, { t: 'Como foi avaliada', w: 30 }, { t: 'Treino', w: 12, al: 'center' }, { t: 'Tentativas', w: 14, al: 'center' }],
    s.palavras.map((p) => [p.w, p.sil || '–', (p.som || 'r').toUpperCase(), p.nota, AVALIACAO_NOME[p.avaliacao] || p.avaliacao || '–', p.treino ? 'Sim' : 'Não', p.tentativas != null ? String(p.tentativas) : '–']), { notaCol: 3 });
  else { D.txt('Nenhuma palavra nova foi praticada nesta partida.', D.m, D.y + 4, { t: 9.5, cor: TINTA2 }); D.y += 10; }
  D.secao('Observações do fonoaudiólogo');
  const linhas = D.d.splitTextToSize(obs && obs.trim() ? obs.trim() : 'Sem observações.', D.W - 2 * D.m - 8), alt = Math.max(16, linhas.length * 4.6 + 8);
  D.espaco(alt); D.cor('#c9c2d6', 'draw'); D.d.setLineWidth(0.3); D.d.roundedRect(D.m, D.y, D.W - 2 * D.m, alt, 2.5, 2.5, 'S'); D.txt(linhas, D.m + 4, D.y + 6.5, { t: 9.5, cor: obs && obs.trim() ? TINTA : TINTA2 }); D.y += alt + 6;
  D.txt('Legenda das notas: 10 = perfeito · 5 = quase · 2 = ainda não. "Avaliação direta" = nota dada pela observação, sem gravação. Notas do "Exercício rápido" (modo de teste) não entram na nota média.', D.m, D.y, { t: 7.5, cor: TINTA2, larg: D.W - 2 * D.m });
  return { blob: D.blob(), nome: nomeArq('Relatorio_partida', apelido, s.data) };
}

export async function pdfPeriodo(av, tipo) {
  const r = periodo(av, tipo), J = await carregaJsPDF(), D = new Doc(J, 'Relatório de evolução', 'Tiriri, o Besourinho · ' + rotuloPeriodo(r), await logo()), t = r.total;
  await D.capa(av.cor, `${av.apelido}: ${t.partidas} ${t.partidas === 1 ? 'partida' : 'partidas'} e ${t.palavras} palavras praticadas`,
    t.partidas ? `Foram ${t.minutos} minutos de jogo${t.treinos ? ` e ${t.treinos} treinos com a voz da Dálete` : ''}. ${t.media != null ? `A nota média foi ${fmt(t.media)}.` : 'Nenhuma fala foi avaliada pelo fonoaudiólogo neste período.'}` : 'Ainda não há partidas neste período.');
  D.info([['Apelido', av.apelido], ['Período', rotuloPeriodo(r)], ['Idade', av.idade ? av.idade + ' anos' : ''], ['Início do tratamento', av.inicio ? new Date(av.inicio + 'T12:00').toLocaleDateString('pt-BR') : '']].filter(([, v]) => v));
  D.ladrilhos([['Partidas', String(t.partidas)], ['Minutos de jogo', String(t.minutos)], ['Palavras praticadas', String(t.palavras)], ['Nota média', fmt(t.media)], ['Notas 10', t.pct10 == null ? '–' : Math.round(t.pct10) + '%', COR_NOTA[10]]]);
  D.secao('Gráficos');
  const gs = graficos(r), cw = (D.W - 2 * D.m - 6) / 2, ch = 52;
  for (let i = 0; i < gs.length; i++) {
    const g = gs[i], col = i % 2; if (col === 0) D.espaco(ch + 16);
    const x = D.m + col * (cw + 6), y = D.y;
    D.txt(g.titulo, x, y + 3.5, { t: 9.5, peso: 'bold' }); D.txt(g.sub, x, y + 7.6, { t: 7, cor: TINTA2, larg: cw });
    if (g.tipo === 'pilha') g.nomes.forEach((nm, k) => { const lx = x + cw - 40 + k * 13; D.cor(g.cores[k]); D.d.roundedRect(lx, y + 0.8, 3, 3, 0.8, 0.8, 'F'); D.txt('nota ' + nm, lx + 4, y + 3.4, { t: 6.5, cor: TINTA2 }); });
    const cv = desenha(document.createElement('canvas'), g, cw * 4, ch * 4 - 4, 2); D.d.addImage(cv.toDataURL('image/png'), 'PNG', x, y + 10, cw, ch - 1);
    if (col === 1 || i === gs.length - 1) D.y += ch + 14;
  }
  D.secao('Palavras para trabalhar');
  if (r.dificeis.length) D.tabela([{ t: 'Palavra', w: 26 }, { t: 'Sílaba alvo', w: 18 }, { t: 'Vezes avaliada', w: 18, al: 'center' }, { t: 'Nota média', w: 16, al: 'center' }, { t: 'Tentativas', w: 16, al: 'center' }], r.dificeis.map((x) => [x.w, x.sil || '–', String(x.n), fmt(x.media), String(x.tent)]));
  else { D.txt(t.avaliadas ? 'Todas as palavras avaliadas tiveram nota 10 neste período.' : 'Sem notas do fonoaudiólogo neste período.', D.m, D.y + 4, { t: 9.5, cor: TINTA2 }); D.y += 10; }
  D.secao('Partidas do período');
  if (r.sessoes.length) D.tabela([{ t: 'Data', w: 22 }, { t: 'Pista', w: 26 }, { t: 'Nível', w: 12 }, { t: 'Avaliação', w: 22 }, { t: 'Palavras', w: 12, al: 'center' }, { t: 'Nota média', w: 14, al: 'center' }, { t: 'Resultado', w: 16 }],
    r.sessoes.map((s) => { const q = resumoSessao(s); return [dataHora(s.data), `${s.pista} · ${PISTA_CURTA[s.pista] || ''}`, NIVEL_NOME[s.nivel] || s.nivel, MODO_NOME[s.modo] ? MODO_NOME[s.modo].split(' (')[0] : s.modo, String(q.palavras), fmt(q.media), s.vitoria ? 'Chegou ao fim' : 'Bola acabou']; }));
  D.txt('As médias usam só as notas do fonoaudiólogo (com gravação ou avaliação direta). Partidas sem análise contam apenas para palavras praticadas e minutos.', D.m, D.y, { t: 7.5, cor: TINTA2, larg: D.W - 2 * D.m });
  return { blob: D.blob(), nome: nomeArq('Relatorio_evolucao_' + tipo, av.apelido, new Date()) };
}
