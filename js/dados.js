// Conteúdo do jogo: pistas, bancos de palavras, níveis e gerador de fases.
const P = (s) => s.split(',').map((x) => { const [w, sil] = x.trim().split('|'); return { w, sil }; });

const B1 = P('pera|pe-RA,peru|pe-RU,siri|si-RI,touro|tou-RO,muro|mu-RO,cera|ce-RA,feira|fei-RA,ouro|ou-RO,arara|a-RA-RA,amora|a-mo-RA,cenoura|ce-nou-RA,tesoura|te-sou-RA,vassoura|vas-sou-RA,cadeira|ca-dei-RA,madeira|ma-dei-RA,mamadeira|ma-ma-dei-RA,bandeira|ban-dei-RA,xícara|xí-ca-RA,canguru|can-gu-RU,jacaré|ja-ca-RÉ,besouro|be-sou-RO,chuveiro|chu-vei-RO,banheiro|ba-nhei-RO,bombeiro|bom-bei-RO,dinheiro|di-nhei-RO,tubarão|tu-ba-RÃO');
const B2 = P('barata|ba-RA-ta,pirata|pi-RA-ta,girafa|gi-RA-fa,coruja|co-RU-ja,coroa|co-RO-a,sereia|se-REI-a,areia|a-REI-a,morango|mo-RAN-go,buraco|bu-RA-co,cereja|ce-RE-ja,parede|pa-RE-de,farinha|fa-RI-nha,xarope|xa-RO-pe,peruca|pe-RU-ca,aranha|a-RA-nha,piranha|pi-RA-nha,periquito|pe-RI-qui-to,parafuso|pa-RA-fu-so,mariposa|ma-RI-po-sa,garoto|ga-RO-to,furacão|fu-RA-cão,coração|co-RA-ção,carimbo|ca-RIM-bo,guaraná|gua-RA-ná,careca|ca-RÉ-ca,curativo|cu-RA-ti-vo,urubu|u-RU-bu');
const B3L = P('bola|bo-LA,bala|ba-LA,mala|ma-LA,vela|ve-LA,cola|co-LA,sala|sa-LA,mola|mo-LA,tela|te-LA,fila|fi-LA,vila|vi-LA,janela|ja-ne-LA,panela|pa-ne-LA,salada|sa-LA-da,galo|ga-LO,gelo|ge-LO,pulo|pu-LO,bolo|bo-LO,cavalo|ca-va-LO,balão|ba-LÃO,pilão|pi-LÃO');
const B3D = P('caracol|ca-RA-col,pirulito|pi-RU-li-to,amarelo|a-ma-RÉ-lo,coleira|co-lei-RA,geladeira|ge-la-dei-RA');
const PARES = [['barão|ba-RÃO', 'balão|ba-LÃO'], ['pirão|pi-RÃO', 'pilão|pi-LÃO'], ['cera|ce-RA', 'cela|ce-LA'], ['vara|va-RA', 'vala|va-LA'], ['caro|ca-RO', 'calo|ca-LO'], ['coro|co-RO', 'colo|co-LO'], ['sarada|sa-RA-da', 'salada|sa-LA-da'], ['puro|pu-RO', 'pulo|pu-LO'], ['cara|ca-RA', 'cala|ca-LA'], ['tora|to-RA', 'tola|to-LA']]
  .map(([r, l]) => ({ r: P(r)[0], l: P(l)[0] }));
const B4 = P('prato|PRA-to,presente|PRE-sen-te,princesa|PRIN-ce-sa,prego|PRÉ-go,praia|PRAI-a,primo|PRI-mo,braço|BRA-ço,bruxa|BRU-xa,brinco|BRIN-co,cobra|co-BRA,zebra|ze-BRA,cabra|ca-BRA,trem|TREM,três|TRÊS,trevo|TRE-vo,troféu|TRO-féu,trigo|TRI-go,quatro|qua-TRO,dragão|DRA-gão,pedra|pe-DRA,vidro|vi-DRO,quadro|qua-DRO,cravo|CRA-vo,cruz|CRUZ,creme|CRE-me,gruta|GRU-ta,grama|GRA-ma,tigre|ti-GRE,fruta|FRU-ta,frango|FRAN-go,cofre|co-FRE');

// Cores: a bola e as folhas são brancas, então pista, chão e céu nunca usam branco.
const TEMA_R = { pista: 0x4a2a8c, chao: 0x2f1a66, borda: '#ffd23f', ceuTopo: 0xff5d73, ceuBase: 0xffc857, enfeite: [0xff8fab, 0xff6d00, 0x9d4edd] };
const TEMA_L = { pista: 0x1746c2, chao: 0x0f2f8a, borda: '#ffe66d', ceuTopo: 0x7b2ff7, ceuBase: 0xff9ecd, enfeite: [0xffd23f, 0xff7b54, 0x4cc9f0] };

export const PISTAS = [
  { id: '1', nome: 'R no fim da palavra', exemplo: 'pera · muro · cadeira', tema: TEMA_R, banco: B1 },
  { id: '2', nome: 'R no meio da palavra', exemplo: 'barata · girafa · coruja',
    tema: { pista: 0x1b3fd1, chao: 0x12298f, borda: '#ff9f1c', ceuTopo: 0xff9f1c, ceuBase: 0xffe45e, enfeite: [0xff5d8f, 0x3a0ca3, 0xff7b00] }, banco: B2 },
  { id: '3', nome: 'Portais do R e do L', exemplo: 'barão ou balão?', tema: TEMA_R, temaL: TEMA_L, banco: B1.concat(B2), bancoL: B3L, bancoDois: B3D, pares: PARES, portais: true },
  { id: '4', nome: 'R junto de outra consoante', exemplo: 'prato · braço · trem',
    tema: { pista: 0x8f1d4f, chao: 0x5e1035, borda: '#ffd23f', ceuTopo: 0x00b4d8, ceuBase: 0xb8f2a0, enfeite: [0xff9f1c, 0x7209b7, 0xf72585] }, banco: B4 },
];

export const NIVEIS = {
  facil:   { id: 'facil', nome: 'Fácil', desc: '3 faixas, devagar e com poucos perigos', faixas: 3, vel: 6.2, palavras: 8, linhasPorPalavra: 7, espaco: 17,
             pesos: { repetida: 0.26, triturador: 0.10, fosforo: 0.07, estrela: 0.06, pocao: 0.10, turbo: 0.05 }, bloqueios: [1, 1], escudo: 9, rampa: 0.6 },
  normal:  { id: 'normal', nome: 'Normal', desc: '5 faixas e mais obstáculos', faixas: 5, vel: 8.2, palavras: 9, linhasPorPalavra: 8, espaco: 15,
             pesos: { repetida: 0.24, triturador: 0.15, fosforo: 0.11, estrela: 0.08, pocao: 0.07, turbo: 0.06 }, bloqueios: [2, 3], escudo: 7, rampa: 0.45 },
  dificil: { id: 'dificil', nome: 'Difícil', desc: 'Movimento livre, rápido e cheio de perigos', faixas: 0, vel: 10, palavras: 10, linhasPorPalavra: 9, espaco: 14,
             pesos: { repetida: 0.22, triturador: 0.19, fosforo: 0.15, estrela: 0.10, pocao: 0.05, turbo: 0.07 }, bloqueios: [2, 4], escudo: 5, rampa: 0.35 },
};

export const LARGURA = 6.4;
export const posFaixas = (n) => (n === 3 ? [-2, 0, 2] : [-2.4, -1.2, 0, 1.2, 2.4]);
export const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
// nomes dos arquivos de voz gravados no Estúdio (é vira eh, ó vira oh)
const sslug = (s) => slug(String(s).toLowerCase().replace(/é/g, 'eh').replace(/ó/g, 'oh'));
export const vozPalavra = (p, tipo = 'n') => `pal_${slug(p.w)}_${tipo}`;
export const vozSilaba = (s, vezes = 1) => `sil_${sslug(s)}_${vezes}`;
export const silabaAlvo = (p) => (p.sil.split('-').find((x) => x === x.toUpperCase() && /[A-ZÀ-Ú]/.test(x)) || p.sil).toLowerCase();

export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const embaralha = (l, r) => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const escolhe = (l, r) => l[Math.floor(r() * l.length)];

// Gera a fase: lista de itens ordenada por distância, perfil de altura e seções de som.
export function geraFase(pista, nivel, seed = Date.now()) {
  const r = rng(seed), xs = posFaixas(nivel.faixas || 5), itens = [], D = nivel.espaco;
  const N = nivel.palavras;
  // plano de seções (só a pista 3 alterna os sons)
  let secoes; // {som, palavras[]}
  if (pista.portais) {
    const nPares = nivel.id === 'facil' ? 2 : 3, resto = N - nPares, q = Math.ceil(resto / 4);
    const R = embaralha(pista.banco, r), L = embaralha(pista.bancoL, r), D2 = embaralha(pista.bancoDois, r);
    const pegaR = (n) => R.splice(0, n).map((p) => ({ ...p, som: 'r' })), pegaL = (n) => L.splice(0, n).map((p) => ({ ...p, som: 'l' }));
    const r2 = pegaR(Math.max(1, resto - 3 * q));
    if (nivel.id === 'dificil') r2.push({ ...D2[0], som: 'r' });
    secoes = [{ som: 'r', palavras: pegaR(q) }, { som: 'l', palavras: pegaL(q) }, { som: 'r', palavras: r2 }, { som: 'l', palavras: pegaL(q) },
      { som: 'r', pares: embaralha(pista.pares, r).slice(0, nPares) }];
  } else secoes = [{ som: 'r', palavras: embaralha(pista.banco, r).slice(0, N).map((p) => ({ ...p, som: 'r' })) }];

  let s = 46, linha = 0, ultimo = '', vistas = [];
  const faixaLivre = () => Math.floor(r() * xs.length);
  const poe = (tipo, ds, fx, extra = {}) => itens.push({ tipo, s: s + ds, x: xs[fx], fx, ...extra });
  // baralho de linhas: quantidades garantidas de cada mecânica, em ordem embaralhada
  const nPal = secoes.reduce((n, x) => n + (x.palavras ? x.palavras.length : 0), 0), vagas = nPal * (nivel.linhasPorPalavra - 2);
  const minimo = { repetida: 6, triturador: 3, fosforo: 3, estrela: 2, pocao: 2, turbo: 2 };
  let baralho = []; for (const k of Object.keys(nivel.pesos)) { const q = Math.max(minimo[k], Math.round(nivel.pesos[k] * vagas)); for (let i = 0; i < q; i++) baralho.push(k); }
  while (baralho.length < vagas) baralho.push('vazio'); baralho = embaralha(baralho, r).slice(0, vagas);
  const perigoso = (k) => k === 'triturador' || k === 'fosforo' || k === 'estrela';
  for (let i = 0; i < baralho.length; i++) {
    const ruim = (i < 3 && perigoso(baralho[i])) || (i > 0 && baralho[i] === 'triturador' && baralho[i - 1] === 'triturador' && nivel.id !== 'dificil') || (i === 0 && baralho[i] === 'repetida');
    if (ruim) { const j = baralho.findIndex((k, n) => n > i + 1 && !perigoso(k) && k !== 'repetida'); if (j > 0) [baralho[i], baralho[j]] = [baralho[j], baralho[i]]; }
  }
  let iB = 0, nTrit = 0; const sorteia = () => baralho[iB++] || 'vazio';
  const linhaDe = (tipo) => {
    if (tipo === 'repetida') {
      const p = escolhe(vistas, r), modo = r();
      if (modo < 0.4) { const f = faixaLivre(); for (let k = 0; k < 3; k++) poe('folha', k * 3.2 - 3.2, f, { p }); }
      else if (modo < 0.75) { const fs = embaralha(xs.map((_, i) => i), r).slice(0, 2); fs.forEach((f) => poe('folha', 0, f, { p: escolhe(vistas, r) })); }
      else poe('folha', 0, faixaLivre(), { p });
    } else if (tipo === 'triturador') {
      const [a, b] = nivel.bloqueios, n = Math.min(xs.length - 1, a + Math.floor(r() * (b - a + 1)));
      const fs = embaralha(xs.map((_, i) => i), r).slice(0, n);
      fs.forEach((f) => poe('triturador', 0, f));
      if (nTrit++ % 3 === 0 || r() < nivel.rampa * 0.6) poe('rampa', -5.2, fs[0]); // a 1ª, a 4ª, a 7ª... sempre têm rampa
    } else if (tipo === 'fosforo') {
      const n = 2 + Math.floor(r() * (xs.length === 3 ? 1 : 3)); let f = faixaLivre();
      for (let k = 0; k < n; k++) { poe('fosforo', k * 3.4 - 3, f); f = (f + 1 + Math.floor(r() * (xs.length - 1))) % xs.length; }
    } else if (tipo === 'estrela') poe('estrela', 0, faixaLivre());
    else if (tipo === 'pocao') poe('pocao', 0, faixaLivre());
    else if (tipo === 'turbo') poe('turbo', 0, faixaLivre());
    ultimo = tipo;
  };

  const marcas = []; // seções de som ao longo da pista
  secoes.forEach((sec, iSec) => {
    if (iSec > 0) { itens.push({ tipo: 'portal', s: s + 2, x: 0, som: sec.som }); marcas.push({ s: s + 2, som: sec.som }); s += D * 1.4; }
    else marcas.push({ s: 0, som: sec.som });
    if (sec.pares) {
      for (const par of sec.pares) {
        const alvoR = r() < 0.6, fs = embaralha(xs.map((_, i) => i), r).slice(0, 2);
        const alvo = { ...(alvoR ? par.r : par.l), som: alvoR ? 'r' : 'l' }, outro = { ...(alvoR ? par.l : par.r), som: alvoR ? 'l' : 'r' };
        itens.push({ tipo: 'aviso_par', s: s - D * 0.2, x: 0, alvo, outro });
        s += D * 1.6;
        poe('folha', 0, fs[0], { p: alvo, par: 'alvo', grupo: alvo.w });
        poe('folha', 0, fs[1], { p: outro, par: 'outro', grupo: alvo.w });
        s += D; linhaDe(r() < 0.5 ? 'pocao' : 'vazio'); s += D;
      }
      return;
    }
    sec.palavras.forEach((p) => {
      // primeira aparição da palavra
      poe('folha', 0, faixaLivre(), { p }); vistas.push(p); ultimo = 'nova'; s += D; linha++;
      for (let k = 1; k < nivel.linhasPorPalavra; k++) {
        // a palavra reaparece uma vez mais adiante, para quem não pegou a primeira
        if (k === 3) { poe('folha', 0, faixaLivre(), { p }); ultimo = 'nova'; } else linhaDe(sorteia());
        s += D; linha++;
      }
    });
  });
  const comprimento = s + 26;
  itens.push({ tipo: 'chegada', s: comprimento, x: 0 });
  itens.sort((a, b) => a.s - b.s);

  // perfil de altura: trechos planos, descidas, subidas e lombadas
  const pontos = [[0, 0]]; let ps = 70, h = 0;
  while (ps < comprimento - 60) {
    const t = r(), len = 34 + r() * 22; let dh = t < 0.42 ? -(2.6 + r() * 2.4) : t < 0.75 ? 2.2 + r() * 2 : 0;
    if (h + dh < -9) dh = Math.abs(dh); if (h + dh > 7) dh = -Math.abs(dh);
    if (dh === 0) { pontos.push([ps, h], [ps + len * 0.5, h + 2.2], [ps + len, h]); }
    else { pontos.push([ps, h], [ps + len, h + dh]); h += dh; }
    ps += len + 50 + r() * 70;
  }
  pontos.push([comprimento + 200, h]);
  const sm = (t) => t * t * (3 - 2 * t);
  const altura = (z) => { if (z <= 0) return 0; let i = 1; while (i < pontos.length - 1 && pontos[i][0] < z) i++; const [a, ha] = pontos[i - 1], [b, hb] = pontos[i]; if (b === a) return hb; return ha + (hb - ha) * sm(Math.max(0, Math.min(1, (z - a) / (b - a)))); };
  const inclina = (z) => (altura(z + 0.5) - altura(z - 0.5));
  return { itens, comprimento, altura, inclina, marcas, xs, palavrasNovas: secoes.flatMap((x) => x.palavras || x.pares.map((q) => q.r)), seed };
}
