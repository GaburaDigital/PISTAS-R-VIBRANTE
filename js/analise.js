// Análise automática da fala (versão de teste).
// Compara a fala da criança com o modelo gravado pela Dálete:
//  1) palavra: alinha as duas falas (DTW sobre MFCC) para conferir se a forma da palavra bate e achar a sílaba alvo;
//  2) sílaba: no trecho do R, mede a "batida" do tepe (queda curta e funda de energia).
//     L costuma dar queda mais longa e rasa; omissão quase não tem queda.
// Não reconhece o significado da palavra: só compara com o modelo.
// Funciona igual no navegador e no Node (só usa Float32Array).

const SR = 16000, JAN = 400, PASSO = 160, NFFT = 512, NMEL = 26, NCEP = 13;

// ---------- utilidades de sinal ----------
export function reamostra(x, sr) {
  if (sr === SR) return Float32Array.from(x);
  const n = Math.floor((x.length * SR) / sr), y = new Float32Array(n), k = sr / SR;
  // média simples antes de reduzir (evita serrilhado grosseiro)
  const m = Math.max(1, Math.round(k));
  for (let i = 0; i < n; i++) { const c = i * k, a = Math.floor(c); let s = 0, q = 0; for (let j = a; j < a + m && j < x.length; j++) { s += x[j]; q++; } y[i] = q ? s / q : 0; }
  return y;
}
function passaAlta(x, fc = 120) { const r = Math.exp((-2 * Math.PI * fc) / SR), y = new Float32Array(x.length); let xa = 0, ya = 0; for (let i = 0; i < x.length; i++) { const v = x[i]; ya = r * (ya + v - xa); xa = v; y[i] = ya; } return y; }

// FFT real simples (radix-2)
const COS = new Float32Array(NFFT / 2), SIN = new Float32Array(NFFT / 2);
for (let i = 0; i < NFFT / 2; i++) { COS[i] = Math.cos((2 * Math.PI * i) / NFFT); SIN[i] = Math.sin((2 * Math.PI * i) / NFFT); }
const REV = new Uint16Array(NFFT); for (let i = 0, j = 0; i < NFFT; i++) { REV[i] = j; let b = NFFT >> 1; while (j & b) { j ^= b; b >>= 1; } j |= b; }
function espectro(re, im) {
  for (let i = 0; i < NFFT; i++) { const j = REV[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (let tam = 2; tam <= NFFT; tam <<= 1) { const meio = tam >> 1, p = NFFT / tam;
    for (let i = 0; i < NFFT; i += tam) for (let k = 0; k < meio; k++) { const c = COS[k * p], s = -SIN[k * p], a = i + k, b = a + meio, tr = re[b] * c - im[b] * s, ti = re[b] * s + im[b] * c; re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti; } }
}
const HANN = new Float32Array(JAN).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (JAN - 1)));
const mel = (f) => 2595 * Math.log10(1 + f / 700), imel = (m) => 700 * (10 ** (m / 2595) - 1);
const FILTROS = (() => { const lo = mel(80), hi = mel(7600), pts = Array.from({ length: NMEL + 2 }, (_, i) => imel(lo + ((hi - lo) * i) / (NMEL + 1))), bins = pts.map((f) => Math.floor(((NFFT + 1) * f) / SR));
  return Array.from({ length: NMEL }, (_, m) => { const a = bins[m], b = bins[m + 1], c = bins[m + 2], w = new Float32Array(NFFT / 2 + 1); for (let k = a; k < b; k++) w[k] = (k - a) / Math.max(1, b - a); for (let k = b; k < c; k++) w[k] = (c - k) / Math.max(1, c - b); return w; }); })();

// características por quadro (10 ms): energia (dB), energia de banda de vogal (dB) e MFCC
function quadros(x) {
  const n = Math.max(0, Math.floor((x.length - JAN) / PASSO) + 1), mfcc = [], E = new Float32Array(n), V = new Float32Array(n);
  const re = new Float32Array(NFFT), im = new Float32Array(NFFT), pot = new Float32Array(NFFT / 2 + 1), lm = new Float32Array(NMEL);
  const k300 = Math.round((300 * NFFT) / SR), k2500 = Math.round((2500 * NFFT) / SR);
  for (let f = 0; f < n; f++) {
    re.fill(0); im.fill(0); let s2 = 0; const o = f * PASSO;
    for (let i = 0; i < JAN; i++) { const v = x[o + i] - 0.97 * (i + o > 0 ? x[o + i - 1] : 0); re[i] = v * HANN[i]; s2 += x[o + i] * x[o + i]; }
    espectro(re, im); let sv = 0;
    for (let k = 0; k <= NFFT / 2; k++) { pot[k] = re[k] * re[k] + im[k] * im[k]; if (k >= k300 && k <= k2500) sv += pot[k]; }
    for (let m = 0; m < NMEL; m++) { let s = 0; const w = FILTROS[m]; for (let k = 0; k <= NFFT / 2; k++) s += w[k] * pot[k]; lm[m] = Math.log(s + 1e-10); }
    const c = new Float32Array(NCEP); for (let i = 0; i < NCEP; i++) { let s = 0; for (let m = 0; m < NMEL; m++) s += lm[m] * Math.cos((Math.PI * i * (m + 0.5)) / NMEL); c[i] = s; }
    mfcc.push(c); E[f] = 10 * Math.log10(s2 / JAN + 1e-10); V[f] = 10 * Math.log10(sv + 1e-10);
  }
  return { n, mfcc, E, V };
}
const suaviza = (a, r = 2) => a.map((_, i) => { let s = 0, q = 0; for (let j = Math.max(0, i - r); j <= Math.min(a.length - 1, i + r); j++) { s += a[j]; q++; } return s / q; });

// trecho com fala (corta silêncio do começo e do fim)
function trechoFala(Q) {
  const E = Q.E; if (!Q.n) return null; const ord = Float32Array.from(E).sort(), piso = ord[Math.floor(Q.n * 0.1)], topo = ord[Math.floor(Q.n * 0.98)];
  const lim = Math.max(piso + 9, topo - 32); let a = 0, b = Q.n - 1;
  while (a < Q.n && E[a] < lim) a++; while (b > a && E[b] < lim) b--;
  if (b - a < 15) return null; return { a: Math.max(0, a - 3), b: Math.min(Q.n - 1, b + 3), piso, topo };
}
// núcleos de vogal: picos da energia na banda 300-2500 Hz
function nucleos(V, a, b) {
  const s = suaviza(Array.from(V.slice(a, b + 1)), 3), pk = [];
  for (let i = 2; i < s.length - 2; i++) if (s[i] >= s[i - 1] && s[i] >= s[i + 1] && s[i] >= s[i - 2] && s[i] >= s[i + 2]) pk.push(i);
  // proeminência: o pico precisa sobressair 3 dB do vale até o pico vizinho mais alto
  const max = Math.max(...s), bons = pk.filter((i) => s[i] > max - 22).filter((i) => { let l = i, mn = s[i]; while (l > 0 && s[l - 1] <= s[i]) { l--; mn = Math.min(mn, s[l]); } let r = i, mr = s[i]; while (r < s.length - 1 && s[r + 1] <= s[i]) { r++; mr = Math.min(mr, s[r]); } return s[i] - Math.max(mn, mr) >= 3 || (l === 0 && r === s.length - 1); });
  const fin = []; for (const i of bons) { if (fin.length && i - fin[fin.length - 1] < 9) { if (s[i] > s[fin[fin.length - 1]]) fin[fin.length - 1] = i; } else fin.push(i); }
  return fin.map((i) => i + a);
}

// ---------- referência (modelo da Dálete), calculada uma vez por palavra ----------
export function silabas(p) { const ps = p.sil.split('-'); let alvo = ps.findIndex((s) => s === s.toUpperCase() && /[A-ZÀ-Ú]/.test(s)); if (alvo < 0) alvo = 0; return { n: ps.length, alvo, partes: ps }; }
export function referencia(x, sr, p) {
  const y = passaAlta(reamostra(x, sr)), Q = quadros(y), T = trechoFala(Q); if (!T) return null;
  const S = silabas(p), nuc = nucleos(Q.V, T.a, T.b);
  const nucs = nuc.length === S.n ? nuc : Array.from({ length: S.n }, (_, i) => Math.round(T.a + ((T.b - T.a) * (i + 0.5)) / S.n));
  // ponto da batida no modelo: a queda mais funda perto da fronteira esperada entre as sílabas
  const okN = nuc.length === S.n, sil = (T.b - T.a) / S.n;
  const zona = okN ? regiaoR(nuc, S.alvo, T) : { a: Math.max(T.a, Math.round(T.a + sil * (S.alvo - 0.6))), b: Math.min(T.b, Math.round(T.a + sil * (S.alvo + 0.5))) };
  const mb = medeBatida(y, zona.a, zona.b), ponto = mb ? mb.quadro : Math.round((zona.a + zona.b) / 2);
  return { Q, T, S, nucs, reg: zona, ponto, sil, mf: cmn(Q.mfcc.slice(T.a, T.b + 1)), sinal: y };
}
// o R (ou L) fica entre a vogal anterior e a vogal da sílaba alvo
function regiaoR(nucs, alvo, T) { return alvo > 0 ? { a: nucs[alvo - 1], b: nucs[alvo] } : { a: T.a, b: nucs[0] }; }
function cmn(l) { if (!l.length) return l; const m = new Float32Array(NCEP); l.forEach((c) => c.forEach((v, i) => (m[i] += v / l.length))); return l.map((c) => c.map((v, i) => v - m[i])); }

// ---------- alinhamento DTW ----------
function dtw(A, B) {
  const n = A.length, m = B.length, banda = Math.max(Math.abs(n - m) + 10, Math.round(Math.max(n, m) * 0.35)), INF = 1e18;
  const D = new Float64Array((n + 1) * (m + 1)).fill(INF), W = m + 1; D[0] = 0;
  const dist = (a, b) => { let s = 0; for (let i = 1; i < NCEP; i++) { const d = a[i] - b[i]; s += d * d; } return Math.sqrt(s); };
  for (let i = 1; i <= n; i++) { const jc = Math.round((i * m) / n); for (let j = Math.max(1, jc - banda); j <= Math.min(m, jc + banda); j++) { const c = dist(A[i - 1], B[j - 1]); D[i * W + j] = c + Math.min(D[(i - 1) * W + j], D[i * W + j - 1], D[(i - 1) * W + j - 1]); } }
  if (D[n * W + m] >= INF) return null;
  const cam = []; let i = n, j = m; while (i > 0 && j > 0) { cam.push([i - 1, j - 1]); const a = D[(i - 1) * W + j - 1], b = D[(i - 1) * W + j], c = D[i * W + j - 1]; if (a <= b && a <= c) { i--; j--; } else if (b < c) i--; else j--; }
  cam.reverse(); return { dist: D[n * W + m] / cam.length, cam };
}

// ---------- medida da batida (tepe) no trecho ----------
// contorno fino de energia (janela 8 ms, passo 2 ms)
function contorno(y, s0, s1) {
  const J = 128, P = 32, out = []; for (let o = s0; o + J <= s1; o += P) { let s = 0; for (let i = 0; i < J; i++) s += y[o + i] * y[o + i]; out.push(10 * Math.log10(s / J + 1e-10)); } return suaviza(out, 1);
}
export function medeBatida(y, a, b) {
  // a, b em quadros de 10 ms (centros das vogais). Mede a queda de energia mais funda entre elas.
  const s0 = Math.max(0, a * PASSO + JAN / 2), s1 = Math.min(y.length, b * PASSO + JAN / 2); if (s1 - s0 < 640) return null;
  const c = contorno(y, s0, s1); if (c.length < 8) return null;
  // só vale um vale de verdade, longe das bordas do trecho (borda = ainda dentro da vogal)
  const i0 = Math.max(1, Math.floor(c.length * 0.12)), i1 = Math.min(c.length - 2, Math.ceil(c.length * 0.88));
  let iMin = i0; for (let i = i0; i <= i1; i++) if (c[i] < c[iMin]) iMin = i;
  let mE = -1e9, mD = -1e9; for (let i = 0; i <= iMin; i++) mE = Math.max(mE, c[i]); for (let i = iMin; i < c.length; i++) mD = Math.max(mD, c[i]);
  const prof = Math.min(mE, mD) - c[iMin], meio = c[iMin] + prof / 2;
  let l = iMin, r = iMin; while (l > 0 && c[l - 1] < meio) l--; while (r < c.length - 1 && c[r + 1] < meio) r++;
  const larg = (r - l + 1) * 2; // ms
  // quedas secundárias (tepe repetido, como em "arara") não contam; medimos a principal
  const total = (c.length * 2), pos = (iMin * 2) / total, quadro = Math.round((s0 + iMin * 32 + 64 - JAN / 2) / PASSO);
  return { prof, larg, pos, ms: total, quadro, fundo: c[iMin] };
}

// ---------- classificação ----------
// parâmetros ajustados com as gravações da Dálete (calibração e palavras). Atualizados pelo script de medição.
export const PARAMS = {"classes":{"tepe":{"media":[15.119961465225751,3.4439249734144703],"dp":[5.533443857923894,0.5411308465833822],"prior":0.3333333333333333},"l":{"media":[6.328357820572884,4.34855453648026],"dp":[2.8044792569247736,0.9947852262347568],"prior":0.3333333333333333},"sem":{"media":[3.6724599058974725,2.9444567914230375],"dp":[3.4457970675427783,1.005128223346324],"prior":0.3333333333333333}},"distBoa":28.634,"distMax":32.929,"versao":"calib-2026-10-26","n":238};
const lg = (x) => Math.log(Math.max(1, x));
function vetor(m) { return [m.prof, lg(m.larg)]; }
export function probabilidades(m, P = PARAMS) {
  if (!P.classes) return null; const v = vetor(m), out = {}; let soma = 0;
  for (const [k, c] of Object.entries(P.classes)) { let lp = Math.log(c.prior); c.media.forEach((mu, i) => { const sd = c.dp[i]; lp += -0.5 * ((v[i] - mu) / sd) ** 2 - Math.log(sd); }); out[k] = lp; }
  const mx = Math.max(...Object.values(out)); for (const k in out) { out[k] = Math.exp(out[k] - mx); soma += out[k]; } for (const k in out) out[k] /= soma; return out;
}

// medidas de uma fala da criança em relação ao modelo (sem decidir a nota)
// encontros consonantais (pr, br, tr...) ficam para uma próxima etapa
export const MSG_ENCONTRO = 'Encontros consonantais (pr, br, tr...) ainda não são analisados; dê a nota de ouvido.';
export function analisavel(p) { const s = silabas(p); return !/^[^aeiou]*[bcdfgptv]r/i.test(s.partes[s.alvo].toLowerCase()); }
export function mede(x, sr, ref, p) {
  if (!analisavel(p)) return { erro: MSG_ENCONTRO };
  if (!ref) return { erro: 'Sem gravação de modelo para esta palavra.' };
  const y = passaAlta(reamostra(x, sr)), Q = quadros(y), T = trechoFala(Q);
  if (!T) return { erro: 'Não ouvi fala suficiente na gravação.' };
  // fala encostada no início ou no fim da gravação: provavelmente cortada (falou antes ou depois do tempo)
  { const E = Q.E, lim = Math.max(T.piso + 9, T.topo - 32); if (E[0] > lim || E[1] > lim || E[Q.n - 1] > lim || E[Q.n - 2] > lim) return { erro: 'A fala parece ter sido cortada no começo ou no fim da gravação; peça para falar de novo.', cortada: true }; }
  const dur = (T.b - T.a) / (ref.T.b - ref.T.a);
  if (dur < 0.35 || dur > 3.5) return { erro: dur < 0.35 ? 'A fala ficou muito curta em comparação com o modelo.' : 'A gravação tem fala longa demais (mais de uma palavra ou ruído).' };
  const A = cmn(Q.mfcc.slice(T.a, T.b + 1)), D = dtw(A, ref.mf); if (!D) return { erro: 'Não consegui alinhar com o modelo.' };
  // região do R: entre as vogais da própria criança (se a contagem de sílabas bater) ou em volta do ponto
  // correspondente à batida do modelo, achado pelo alinhamento
  const S = ref.S, nuc = nucleos(Q.V, T.a, T.b); let reg, via;
  if (nuc.length === S.n) { reg = regiaoR(nuc, S.alvo, T); via = 'silabas'; }
  else { // leva a zona do R do modelo (entre as vogais) para a fala da criança pelo caminho do alinhamento
    const mapa = (fr) => { const j0 = fr - ref.T.a; let s = 0, k = 0; for (const [i, j] of D.cam) if (j === j0) { s += i; k++; } return k ? Math.round(s / k) + T.a : null; };
    const ma = mapa(ref.reg.a), mb = mapa(ref.reg.b), mp = mapa(ref.ponto); if (mp == null) return { erro: 'Não encontrei a sílaba alvo na fala.' };
    const w = Math.max(6, Math.round(((T.b - T.a) / S.n) * 0.35));
    reg = { a: Math.max(T.a, Math.min(ma ?? mp - w, mp - w)), b: Math.min(T.b, Math.max(mb ?? mp + w, mp + w)) }; via = 'alinhamento'; }
  const m = medeBatida(y, reg.a, reg.b); if (!m) return { erro: 'Trecho do R curto demais para medir.' };
  // pausa entre sílabas (fala silabada): a energia cai até o silêncio por mais de 70 ms
  if (m.larg > 70 && m.fundo < T.piso + 8) return { erro: 'A palavra foi falada separando as sílabas; para analisar, peça a palavra inteira.', pausa: true };
  const t = (fr) => (fr * PASSO + JAN / 2) / SR;
  return { m, dist: D.dist, via, dur, trecho: [t(reg.a), t(reg.b)], fala: [t(T.a), t(T.b)] };
}

// avaliação completa: medidas + palpite de nota
export function avalia(x, sr, ref, p, P = PARAMS) {
  const r = mede(x, sr, ref, p); if (r.erro) return { nota: null, confianca: null, motivo: r.erro };
  const pr = probabilidades(r.m, P); if (!pr) return { nota: null, confianca: null, motivo: 'Detector ainda não calibrado.' };
  const alvoL = p.som === 'l', certo = alvoL ? pr.l + pr.sem : pr.tepe, errado = alvoL ? pr.tepe : pr.l + pr.sem;
  const palavraOk = r.dist <= P.distBoa, palavraLonge = r.dist > P.distMax;
  let nota, confianca;
  if (palavraLonge) { nota = 5; confianca = 'baixa'; }
  else if (certo >= 0.7) { nota = palavraOk ? 10 : 5; confianca = certo >= 0.85 && palavraOk && r.via === 'silabas' ? 'alta' : 'media'; }
  else if (errado >= 0.7) { nota = 2; confianca = errado >= 0.85 && r.via === 'silabas' ? 'alta' : 'media'; }
  else { nota = 5; confianca = 'baixa'; }
  const classe = pr.tepe >= pr.l && pr.tepe >= pr.sem ? 'tepe' : pr.l >= pr.sem ? 'l' : 'sem';
  const nomes = { tepe: 'R vibrante (batida da língua)', l: 'som de L', sem: 'R omitido' };
  if (alvoL && classe === 'sem') nomes.sem = 'som de L suave';
  const motivo = palavraLonge ? 'A fala ficou bem diferente do modelo; confira de ouvido.' : `Ouvi ${nomes[classe]}${palavraOk ? '' : '; a palavra parece incompleta ou diferente do modelo'}.`;
  return { nota, confianca, motivo, classe, prob: pr, ...r };
}
