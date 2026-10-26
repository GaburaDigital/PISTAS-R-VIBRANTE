// Avatares: perfis das crianças guardados no navegador, com preferências e histórico de partidas.
// Tudo fica no aparelho. Para levar a outro aparelho: baixar ou compartilhar o registro e importar lá.

const CHAVE = 'tiriri.avatares', CHAVE_ATIVO = 'tiriri.ativo', VERSAO = 1;

// preferências que viajam com o avatar; as demais ("quem avalia", qualidade, inclinação) ficam no aparelho
export const PREFS_AVATAR = ['volMusica', 'volEfeitos', 'volVoz', 'musica', 'efeitos', 'reduz', 'intenso', 'zoom', 'retomada', 'cenGrande', 'semCenario', 'rapido', 'pista', 'nivel'];

// cor do casco do Tiriri na imagem do avatar (no jogo ele mantém o design original)
export const CORES = [
  { id: 'original', nome: 'Original', casco: '#1fa39a', borda: '#0f6e68' },
  { id: 'azul', nome: 'Azul', casco: '#2b7be0', borda: '#164f9c' },
  { id: 'rosa', nome: 'Rosa', casco: '#ff6fae', borda: '#c43c7c' },
  { id: 'roxo', nome: 'Roxo', casco: '#8d5ae0', borda: '#5b31a3' },
  { id: 'laranja', nome: 'Laranja', casco: '#ff8c2b', borda: '#c25a06' },
  { id: 'amarelo', nome: 'Amarelo', casco: '#ffc928', borda: '#b88a00' },
];
const cor = (id) => CORES.find((c) => c.id === id) || CORES[0];

export function tiririSVG(corId = 'original', tam = 96) {
  const c = cor(corId);
  return `<svg class="tiriri" width="${tam}" height="${tam}" viewBox="0 0 120 120" aria-hidden="true">
  <path d="M46 30 Q40 12 30 8" fill="none" stroke="#3f8f2a" stroke-width="4" stroke-linecap="round"/><circle cx="29" cy="8" r="6" fill="#5fbf3a" stroke="#2c6a1c" stroke-width="2.5"/>
  <path d="M74 30 Q80 12 90 8" fill="none" stroke="#3f8f2a" stroke-width="4" stroke-linecap="round"/><circle cx="91" cy="8" r="6" fill="#5fbf3a" stroke="#2c6a1c" stroke-width="2.5"/>
  <ellipse cx="60" cy="72" rx="47" ry="42" fill="${c.casco}" stroke="${c.borda}" stroke-width="4"/>
  <path d="M60 32 V112" stroke="${c.borda}" stroke-width="3" opacity=".45"/>
  <ellipse cx="60" cy="66" rx="36" ry="34" fill="#7ccf4a" stroke="#3f8f2a" stroke-width="3.5"/>
  <ellipse cx="60" cy="88" rx="24" ry="15" fill="#ff9cc4" stroke="#d1608f" stroke-width="2.5"/>
  <ellipse cx="47" cy="58" rx="6.5" ry="8" fill="#1b1025"/><ellipse cx="73" cy="58" rx="6.5" ry="8" fill="#1b1025"/>
  <circle cx="49" cy="55" r="2.3" fill="#fff"/><circle cx="75" cy="55" r="2.3" fill="#fff"/>
  <ellipse cx="38" cy="70" rx="6" ry="3.5" fill="#ff7aa8" opacity=".75"/><ellipse cx="82" cy="70" rx="6" ry="3.5" fill="#ff7aa8" opacity=".75"/>
  <path d="M52 71 Q60 78 68 71" fill="none" stroke="#1b1025" stroke-width="3" stroke-linecap="round"/>
</svg>`;
}
// versão em imagem (para o PDF)
export function tiririPNG(corId, tam = 240) {
  return new Promise((ok) => {
    const im = new Image(), svg = tiririSVG(corId, tam).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = tam; c.getContext('2d').drawImage(im, 0, 0, tam, tam); ok(c.toDataURL('image/png')); };
    im.onerror = () => ok(null); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const ler = () => { try { const l = JSON.parse(localStorage.getItem(CHAVE) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } };

export const Perfis = {
  _l: ler(),
  salvaTudo() { try { localStorage.setItem(CHAVE, JSON.stringify(this._l)); return true; } catch (e) { console.warn('Não foi possível salvar os avatares', e); return false; } },
  lista() { return this._l.slice().sort((a, b) => (b.ultimoJogo || b.criado).localeCompare(a.ultimoJogo || a.criado)); },
  get(id) { return this._l.find((a) => a.id === id) || null; },
  ativo() { let id = null; try { id = localStorage.getItem(CHAVE_ATIVO); } catch (e) {} return id ? this.get(id) : null; },
  entra(id) { try { localStorage.setItem(CHAVE_ATIVO, id); } catch (e) {} },
  sai() { try { localStorage.removeItem(CHAVE_ATIVO); } catch (e) {} },

  cria(d) {
    const agora = new Date().toISOString();
    const a = { id: novoId(), versao: VERSAO, apelido: d.apelido.trim(), idade: d.idade || '', inicio: d.inicio || '', cor: d.cor || 'original', semMic: !!d.semMic, prefs: d.prefs || null, criado: agora, atualizado: agora, ultimoBackup: null, ultimoJogo: null, sessoes: [] };
    this._l.push(a); this.salvaTudo(); return a;
  },
  atualiza(id, d) { const a = this.get(id); if (!a) return null; Object.assign(a, d, { atualizado: new Date().toISOString() }); this.salvaTudo(); return a; },
  exclui(id) { this._l = this._l.filter((a) => a.id !== id); try { if (localStorage.getItem(CHAVE_ATIVO) === id) this.sai(); } catch (e) {} this.salvaTudo(); },
  salvaPrefs(id, cfg) { const p = {}; for (const k of PREFS_AVATAR) if (k in cfg) p[k] = cfg[k]; return this.atualiza(id, { prefs: p }); },
  registraSessao(id, s) { const a = this.get(id); if (!a) return; a.sessoes.push(s); if (!a.ultimoJogo || s.data > a.ultimoJogo) a.ultimoJogo = s.data; this.atualiza(id, {}); },
  atualizaSessao(id, sid, d) { const a = this.get(id); const s = a && a.sessoes.find((x) => x.id === sid); if (s) { Object.assign(s, d); this.atualiza(id, {}); } },
  precisaBackup(a) { if (!a || !a.sessoes.length) return false; const ref = a.ultimoBackup || a.criado; return Date.now() - new Date(ref).getTime() > 7 * 864e5; },

  // registro em arquivo de texto (o compartilhamento do celular aceita texto; JSON puro nem sempre)
  arquivo(id) {
    const a = this.get(id); const dados = JSON.stringify({ app: 'tiriri-o-besourinho', tipo: 'avatar', versao: VERSAO, exportado: new Date().toISOString(), avatar: a });
    const nome = `Tiriri_${a.apelido.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
    return { nome, blob: new Blob([dados], { type: 'text/plain' }) };
  },
  marcaBackup(id) { this.atualiza(id, { ultimoBackup: new Date().toISOString() }); },
  // junta um registro importado: avatar novo é adicionado; avatar existente recebe as sessões que faltam
  importa(texto) {
    let j; try { j = JSON.parse(texto); } catch (e) { throw new Error('Este arquivo não é um registro do Tiriri.'); }
    if (!j || j.app !== 'tiriri-o-besourinho' || !j.avatar || !Array.isArray(j.avatar.sessoes)) throw new Error('Este arquivo não é um registro do Tiriri.');
    const vem = j.avatar, aqui = this.get(vem.id);
    if (!aqui) { this._l.push({ ...vem, ultimoBackup: vem.ultimoBackup || null }); this.salvaTudo(); return { novo: true, apelido: vem.apelido, adicionadas: vem.sessoes.length }; }
    const tem = new Set(aqui.sessoes.map((s) => s.id)), novas = vem.sessoes.filter((s) => !tem.has(s.id));
    aqui.sessoes.push(...novas); aqui.sessoes.sort((a, b) => a.data.localeCompare(b.data));
    if ((vem.atualizado || '') > (aqui.atualizado || '')) for (const k of ['apelido', 'idade', 'inicio', 'cor', 'semMic', 'prefs']) aqui[k] = vem[k];
    const ult = aqui.sessoes.length ? aqui.sessoes[aqui.sessoes.length - 1].data : aqui.ultimoJogo; aqui.ultimoJogo = ult;
    this.atualiza(aqui.id, {}); return { novo: false, apelido: aqui.apelido, adicionadas: novas.length };
  },
};

// salvar ou compartilhar um arquivo gerado pelo jogo
export function baixa(blob, nome) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 30000); }
export async function compartilha(blob, nome, titulo) {
  const f = new File([blob], nome, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title: titulo }); return 'compartilhado'; } catch (e) { if (e && e.name === 'AbortError') return 'cancelado'; } }
  baixa(blob, nome); return 'baixado';
}
export const podeCompartilhar = () => { try { return !!(navigator.canShare && navigator.canShare({ files: [new File(['x'], 'x.txt', { type: 'text/plain' })] })); } catch (e) { return false; } };
