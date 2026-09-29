/**
 * Gestão da Loja de Limpeza — banco de dados no Google Planilhas
 *
 * Este código fica DENTRO da sua planilha (Extensões → Apps Script).
 * Ele recebe os lançamentos do app, grava cada um como uma linha na aba certa
 * e devolve os dados quando o app pede para atualizar.
 *
 * As abas são criadas sozinhas na primeira conexão:
 * Produtos, Clientes, Vendas, Itens_Venda, Pagamentos, Compras, Despesas,
 * Investimentos, Movimentacoes, Caixa e Config.
 *
 * Colunas como estoque_atual, margem, valor_aberto, situacao e total_pendente
 * são fórmulas: a própria planilha calcula e mantém atualizado.
 */

// 1) TROQUE a chave abaixo por uma senha só sua (letras e números, sem espaços).
//    Você vai digitar essa mesma chave no app, em Ajustes → Conectar ao Google Planilhas.
const CHAVE = 'TROQUE-ESTA-CHAVE';

const FORMATOS = {
  text: '@',
  int: '0',
  money: '"R$" #,##0.00',
  pct: '0.0%',
  date: 'dd/mm/yyyy',
  bool: null,
  calc: null
};

/** O app lê todos os dados, ou só confere se algo mudou (modo=versao, bem rápido). */
function doGet(e) {
  return responder(function () {
    const p = (e && e.parameter) || {};
    verificar(p.chave);
    if (p.modo === 'versao') return { ok: true, versao: versaoAtual() };
    return { ok: true, versao: versaoAtual(), planilha: SpreadsheetApp.getActiveSpreadsheet().getUrl(), dados: lerTudo() };
  });
}

/** Marca que houve mudança. O app percebe em poucos segundos e atualiza a tela. */
function marcarMudanca() {
  const v = String(Date.now());
  PropertiesService.getScriptProperties().setProperty('versao', v);
  return v;
}
function versaoAtual() {
  return PropertiesService.getScriptProperties().getProperty('versao') || '0';
}

/** Quando você edita a planilha à mão, o app também é avisado. */
function onEdit(e) {
  marcarMudanca();
}

/** O app envia alterações. */
function doPost(e) {
  return responder(function () {
    const corpo = JSON.parse(e.postData.contents);
    verificar(corpo.chave);
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const schema = corpo.schema || {};
      prepararAbas(schema);
      aplicar(corpo.ops || [], schema);
      SpreadsheetApp.flush();
      var versao = (corpo.ops || []).length ? marcarMudanca() : versaoAtual();
    } finally {
      lock.releaseLock();
    }
    return { ok: true, aplicadas: (corpo.ops || []).length, versao: versao };
  });
}

/** Rode esta função uma vez pelo editor para autorizar o acesso à planilha. */
function autorizar() {
  Logger.log('Planilha: ' + SpreadsheetApp.getActiveSpreadsheet().getName() + ' — acesso autorizado.');
}

// ---------------------------------------------------------------------------

function responder(fn) {
  let saida;
  try {
    saida = fn();
  } catch (err) {
    saida = { ok: false, erro: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(saida)).setMimeType(ContentService.MimeType.JSON);
}

function verificar(chave) {
  if (!CHAVE || CHAVE === 'TROQUE-ESTA-CHAVE') {
    throw new Error('Defina a CHAVE no código do Apps Script e publique uma nova versão.');
  }
  if (chave !== CHAVE) throw new Error('Chave de acesso inválida.');
}

/** Cria as abas e colunas que faltarem, sem mexer nas que já existem. */
function prepararAbas(schema) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(schema).forEach(function (nome) {
    const colunas = schema[nome];
    let aba = ss.getSheetByName(nome);
    if (!aba) aba = ss.insertSheet(nome);
    const ultimaCol = aba.getLastColumn();
    const atuais = ultimaCol ? aba.getRange(1, 1, 1, ultimaCol).getValues()[0].map(String) : [];
    const faltando = colunas.filter(function (c) { return atuais.indexOf(c[0]) < 0; });
    if (!faltando.length) return;
    const inicio = ultimaCol + 1;
    const precisa = inicio + faltando.length - 1;
    if (aba.getMaxColumns() < precisa) aba.insertColumnsAfter(aba.getMaxColumns(), precisa - aba.getMaxColumns());
    aba.getRange(1, inicio, 1, faltando.length).setValues([faltando.map(function (c) { return c[0]; })]);
    const linhas = Math.max(1, aba.getMaxRows() - 1);
    faltando.forEach(function (c, i) {
      const fmt = c[2] && c[1] === 'text' ? null : FORMATOS[c[1]];
      if (fmt) aba.getRange(2, inicio + i, linhas, 1).setNumberFormat(fmt);
      if (c[2]) aba.getRange(1, inicio + i).setBackground('#E7E3F4').setNote('Coluna calculada pela planilha. Não precisa preencher.');
    });
    aba.getRange(1, 1, 1, aba.getLastColumn()).setFontWeight('bold');
    aba.setFrozenRows(1);
  });
  // remove a aba vazia padrão, se sobrou
  ['Página1', 'Sheet1', 'Planilha1'].forEach(function (n) {
    const a = ss.getSheetByName(n);
    if (a && a.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(a);
  });
}

function aplicar(ops, schema) {
  const porAba = {};
  const ordem = [];
  ops.forEach(function (o) {
    if (!porAba[o.tab]) { porAba[o.tab] = []; ordem.push(o.tab); }
    porAba[o.tab].push(o);
  });
  ordem.forEach(function (aba) {
    const t = carregar(aba, schema[aba]);
    porAba[aba].forEach(function (o) { executar(t, o); });
    gravar(t);
  });
}

function carregar(nome, colunas) {
  const aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nome);
  if (!aba) throw new Error('Aba não encontrada: ' + nome);
  const uc = aba.getLastColumn(), ul = aba.getLastRow();
  const cab = aba.getRange(1, 1, 1, uc).getValues()[0].map(String);
  const linhas = ul > 1 ? aba.getRange(2, 1, ul - 1, uc).getValues() : [];
  const tipos = {}, formulas = {};
  (colunas || []).forEach(function (c) { tipos[c[0]] = c[1]; if (c[2]) formulas[c[0]] = c[2]; });
  const chave = colunas && colunas[0] ? colunas[0][0] : cab[0];
  const ic = cab.indexOf(chave);
  const indice = {};
  linhas.forEach(function (l, i) { indice[String(l[ic])] = i; });
  return { aba: aba, cab: cab, linhas: linhas, tipos: tipos, formulas: formulas, ic: ic, indice: indice };
}

function reindexar(t) {
  t.indice = {};
  t.linhas.forEach(function (l, i) { t.indice[String(l[t.ic])] = i; });
}

function executar(t, o) {
  if (o.op === 'upsert') {
    const i = t.indice[String(o.id)];
    if (i !== undefined) {
      t.linhas[i] = montar(t, o.row, t.linhas[i]);
    } else {
      t.linhas.push(montar(t, o.row, null));
      t.indice[String(o.id)] = t.linhas.length - 1;
    }
  } else if (o.op === 'delete') {
    const i = t.indice[String(o.id)];
    if (i !== undefined) { t.linhas.splice(i, 1); reindexar(t); }
  } else if (o.op === 'replaceWhere') {
    const c = t.cab.indexOf(o.col);
    t.linhas = t.linhas.filter(function (l) { return String(l[c]) !== String(o.val); });
    (o.rows || []).forEach(function (r) { t.linhas.push(montar(t, r, null)); });
    reindexar(t);
  } else if (o.op === 'replaceAll') {
    t.linhas = (o.rows || []).map(function (r) { return montar(t, r, null); });
    reindexar(t);
  }
}

/** Monta a linha na ordem das colunas da aba. Colunas extras criadas por você são preservadas. */
function montar(t, obj, antiga) {
  return t.cab.map(function (h, j) {
    if (t.formulas[h]) return '';
    if (Object.prototype.hasOwnProperty.call(obj, h)) return converter(obj[h], t.tipos[h]);
    return antiga ? antiga[j] : '';
  });
}

function converter(v, tipo) {
  if (v === null || v === undefined || v === '') return '';
  if (tipo === 'date') {
    const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : '';
  }
  if (tipo === 'money' || tipo === 'int' || tipo === 'pct') {
    const n = Number(v);
    return isNaN(n) ? '' : n;
  }
  if (tipo === 'bool') return v === true || v === 'true';
  return String(v);
}

function gravar(t) {
  const aba = t.aba, n = t.cab.length, ul = aba.getLastRow();
  if (ul > 1) aba.getRange(2, 1, ul - 1, n).clearContent();
  if (!t.linhas.length) return;
  const dados = t.linhas.map(function (l) {
    const r = l.slice(0, n);
    while (r.length < n) r.push('');
    return r;
  });
  aba.getRange(2, 1, dados.length, n).setValues(dados);
  Object.keys(t.formulas).forEach(function (h) {
    const j = t.cab.indexOf(h);
    if (j < 0) return;
    const fs = dados.map(function (_, i) { return [resolver(t.formulas[h], t, i + 2)]; });
    aba.getRange(2, j + 1, dados.length, 1).setFormulas(fs);
  });
}

const cacheCab = {};
function cabecalho(nome) {
  if (!cacheCab[nome]) {
    const aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nome);
    cacheCab[nome] = aba && aba.getLastColumn() ? aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(String) : [];
  }
  return cacheCab[nome];
}

/** Troca {coluna} pela célula da mesma linha e {Aba.coluna} pela coluna inteira da outra aba. */
function resolver(modelo, t, linha) {
  return modelo
    .replace(/\{([A-Za-z_]+)\.([a-z_]+)\}/g, function (_, aba, col) {
      const j = cabecalho(aba).indexOf(col);
      if (j < 0) return '""';
      const L = letra(j);
      return "'" + aba + "'!" + L + ':' + L;
    })
    .replace(/\{([a-z_]+)\}/g, function (_, col) {
      const j = t.cab.indexOf(col);
      return j < 0 ? '""' : letra(j) + linha;
    });
}

function letra(j) {
  let s = '';
  j += 1;
  while (j > 0) { const m = (j - 1) % 26; s = String.fromCharCode(65 + m) + s; j = Math.floor((j - 1) / 26); }
  return s;
}

function lerTudo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone();
  const saida = {};
  ss.getSheets().forEach(function (aba) {
    const uc = aba.getLastColumn(), ul = aba.getLastRow();
    if (!uc || !ul) return;
    const v = aba.getRange(1, 1, ul, uc).getValues();
    saida[aba.getName()] = {
      h: v[0].map(String),
      r: v.slice(1).map(function (l) {
        return l.map(function (x) { return x instanceof Date ? Utilities.formatDate(x, tz, 'yyyy-MM-dd') : x; });
      })
    };
  });
  return saida;
}
