// Entende frases em português sobre vendas, dívidas e pagamentos — sem IA, sem custo.
(function (root) {
  const DIAS = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
  const MESES = { janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 };
  const NUM_PAL = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90, cem: 100, cento: 100, duzentos: 200, trezentos: 300, quatrocentos: 400, quinhentos: 500, seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900, mil: 1000 };

  const semAcento = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const iso = d => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
  const addDias = (base, n) => { const d = new Date(base + "T12:00:00"); d.setDate(d.getDate() + n); return iso(d); };

  // "cento e vinte" -> "120", "cinquenta reais" -> "50 reais"
  function numerosPorExtenso(t) {
    return t.replace(/\b((?:(?:um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cem|cento|duzentos|trezentos|quatrocentos|quinhentos|seiscentos|setecentos|oitocentos|novecentos|mil)(?:\s+e\s+|\s+)?)+)\b/gi, m => {
      const ws = m.trim().toLowerCase().split(/\s+/).filter(w => w !== "e");
      if (ws.length === 1 && (ws[0] === "um" || ws[0] === "uma")) return m; // "um chaveiro"
      let total = 0, cur = 0;
      for (const w of ws) { const v = NUM_PAL[w]; if (v == null) continue; if (v === 1000) { cur = (cur || 1) * 1000; total += cur; cur = 0; } else cur += v; }
      total += cur;
      return total ? total + " " : m;
    });
  }

  function lerValor(s) { s = s.replace(/\s/g, ""); if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", "."); else s = s.replace(/[.,](?=\d{3}\b)/g, ""); const n = parseFloat(s.replace(",", ".")); return isFinite(n) ? Math.round(n * 100) / 100 : 0; }

  // Datas: devolve {data, ini, fim} (posições no texto normalizado)
  function acharData(t, hoje) {
    const hd = new Date(hoje + "T12:00:00");
    let m;
    const testes = [
      [/\b(depois de amanha)\b/, () => addDias(hoje, 2)],
      [/\b(amanha)\b/, () => addDias(hoje, 1)],
      [/\b(hoje|agora|a vista)\b/, () => hoje],
      [/\bdaqui (?:a )?(\d+) dias?\b/, mm => addDias(hoje, +mm[1])],
      [/\bem (\d+) dias\b/, mm => addDias(hoje, +mm[1])],
      [/\bdaqui (?:a )?(?:uma|1) semana\b|\bsemana que vem\b|\bproxima semana\b/, () => addDias(hoje, 7)],
      [/\bdaqui (?:a )?(\d+) semanas\b/, mm => addDias(hoje, 7 * mm[1])],
      [/\bdaqui (?:a )?(?:um|1) mes\b|\bmes que vem\b|\bproximo mes\b/, () => { const d = new Date(hd); d.setMonth(d.getMonth() + 1); return iso(d); }],
      [/\bfim do mes\b|\bfinal do mes\b/, () => { const d = new Date(hd.getFullYear(), hd.getMonth() + 1, 0, 12); return iso(d); }],
      [/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/, mm => { let y = mm[3] ? +mm[3] : hd.getFullYear(); if (y < 100) y += 2000; let d = new Date(y, mm[2] - 1, +mm[1], 12); if (!mm[3] && iso(d) < hoje) d.setFullYear(y + 1); return iso(d); }],
      [/\bdia (\d{1,2}) de (janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/, mm => { let d = new Date(hd.getFullYear(), MESES[mm[2]] - 1, +mm[1], 12); if (iso(d) < hoje) d.setFullYear(d.getFullYear() + 1); return iso(d); }],
      [/\bdia (\d{1,2})\b/, mm => { let d = new Date(hd.getFullYear(), hd.getMonth(), +mm[1], 12); if (iso(d) < hoje) d = new Date(hd.getFullYear(), hd.getMonth() + 1, +mm[1], 12); return iso(d); }],
      [/\b(?:na |no |nessa |nesse |essa |esse |proxima |proximo |ate |ate a |ate o )?(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:-feira| feira)?(?: que vem)?\b/, mm => { const alvo = DIAS.indexOf(mm[1]); let n = (alvo - hd.getDay() + 7) % 7; if (n === 0) n = 7; return addDias(hoje, n); }],
    ];
    for (const [re, fn] of testes) { m = t.match(re); if (m) return { data: fn(m), ini: m.index, fim: m.index + m[0].length }; }
    return null;
  }

  function capitalizar(n) { return n.split(/\s+/).filter(Boolean).map(w => /^(da|de|do|dos|das|e)$/.test(w) ? w : w[0].toUpperCase() + w.slice(1)).join(" "); }

  function casarCliente(nome, clientes) {
    if (!nome) return null;
    const a = semAcento(nome.toLowerCase());
    let exato = clientes.find(c => semAcento(c.toLowerCase()) === a);
    if (exato) return exato;
    const cand = clientes.filter(c => { const b = semAcento(c.toLowerCase()); return b.startsWith(a + " ") || a.startsWith(b + " ") || b.split(" ")[0] === a.split(" ")[0]; });
    return cand.length === 1 ? cand[0] : null;
  }

  const PARADA = /^(o|a|os|as|um|uma|me|eu|que|pra|pro|para|de|do|da|dos|das|no|na|e|ja|so|tambem|hoje|ontem|aqui|ai|reais|real|r\$|conto|contos|pila|por|com|em|valor|total|deve|devendo|vence|vencimento|pagar|pagamento|resto|restante|fica|ficou|cliente|seu|sua|senhor|senhora|dona|seu)$/;

  // Nome: palavras antes do verbo, ou depois de "pra/pro/para/do/da/de" em "vendi... pro João"/"recebi da Ana"
  function extrairNome(original, norm, idxVerbo, depoisDe) {
    const ow = original.split(/\s+/), nw = norm.split(/\s+/);
    if (depoisDe) {
      const m = norm.match(depoisDe);
      if (m) {
        const pos = norm.slice(0, m.index + m[0].length).split(/\s+/).filter(Boolean).length;
        const out = [];
        for (let i = pos; i < nw.length && out.length < 3; i++) { const w = nw[i].replace(/[^a-zà-ÿ]/g, ""); if (!w || PARADA.test(w) || /\d/.test(nw[i])) break; out.push(ow[i].replace(/[^\p{L}]/gu, "")); }
        if (out.length) return capitalizar(out.join(" "));
      }
    }
    if (idxVerbo > 0) {
      const antes = norm.slice(0, idxVerbo).trim().split(/\s+/).filter(Boolean);
      const origAntes = ow.slice(0, antes.length);
      const out = [];
      for (let i = antes.length - 1; i >= 0 && out.length < 3; i--) {
        const w = antes[i].replace(/[^a-zà-ÿ]/g, "");
        if (!w) break;
        if (PARADA.test(w)) { if (out.length) break; else continue; }
        out.unshift(origAntes[i].replace(/[^\p{L}]/gu, ""));
      }
      if (out.length) return capitalizar(out.join(" "));
    }
    return "";
  }

  // números com posição; ignora datas e quantidades ("3 chaveiros")
  function numeros(t, dataPos) {
    const res = []; const re = /(r\$\s*)?(\d+(?:[.,]\d+)*)(\s*(?:reais|real|conto|contos|pila|r\$))?/g; let m;
    while ((m = re.exec(t))) {
      const ini = m.index, fim = ini + m[0].length;
      if (dataPos && ini >= dataPos.ini && ini < dataPos.fim) continue;
      const depois = t.slice(fim, fim + 12), antes = t.slice(Math.max(0, ini - 8), ini);
      if (/^\s*(dias?|semanas?|mes|meses|horas?)\b/.test(depois)) continue;
      if (/\/\s*$/.test(antes) || /^\s*\//.test(depois)) continue;
      const moeda = !!(m[1] || m[3]);
      const qtd = !moeda && /^\s+(?!reais|real|conto|pila|de entrada|no pix|em dinheiro|de sinal|adiantado|vence|dia|ate|para|pra|e\b|,)[a-z]/.test(depois) && !/(por|de|pagou|deu|deve|devendo|paguei|recebi|entrada|sinal|adiantou|mandou|transferiu|faltam?|resto)\s*$/.test(antes);
      res.push({ v: lerValor(m[2]), ini, fim, moeda, qtd, antes });
    }
    return res;
  }

  function forma(t) {
    if (/\bpix\b/.test(t)) return "Pix";
    if (/dinheiro|especie/.test(t)) return "Dinheiro";
    if (/cartao|credito|debito/.test(t)) return "Cartão";
    if (/boleto/.test(t)) return "Boleto";
    if (/transferencia|ted\b|doc\b/.test(t)) return "Transferência";
    return "";
  }

  function telefone(original) { const m = original.match(/(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}/); if (!m) return ""; const d = m[0].replace(/\D/g, ""); return d.length >= 10 ? m[0].trim() : ""; }


  // ---------- AGENDA
  function acharHora(t) {
    let m;
    if ((m = t.match(/\b(?:as |a |por volta das |umas )?(\d{1,2})\s*(?:h|:|horas?)\s*(\d{2})?\b(?:\s*(?:da|de) (manha|tarde|noite))?/))) {
      let h = +m[1], mi = m[2] ? +m[2] : 0;
      if (m[3] && (m[3] === "tarde" || m[3] === "noite") && h < 12) h += 12;
      if (h <= 23 && mi <= 59) return { hora: String(h).padStart(2, "0") + ":" + String(mi).padStart(2, "0"), ini: m.index, fim: m.index + m[0].length };
    }
    if ((m = t.match(/\bas (\d{1,2})(?:\s*(?:da|de) (manha|tarde|noite))?\b/))) {
      let h = +m[1]; if (m[2] && m[2] !== "manha" && h < 12) h += 12; else if (!m[2] && h >= 1 && h <= 6) h += 12;
      if (h <= 23) return { hora: String(h).padStart(2, "0") + ":00", ini: m.index, fim: m.index + m[0].length };
    }
    if ((m = t.match(/\b(meio[- ]dia)\b/))) return { hora: "12:00", ini: m.index, fim: m.index + m[0].length };
    if ((m = t.match(/\b(?:de |pela |a |na )?(manha|tarde|noite)\b/))) return { hora: { manha: "09:00", tarde: "14:00", noite: "19:00" }[m[1]], ini: m.index, fim: m.index + m[0].length, aprox: true };
    return null;
  }
  const RE_AGENDA_FORTE = /\b(agenda|agendar|agende|agendo|marca|marcar|marque|lembra|lembrar|lembre|lembrete|compromisso|reuniao|visita|anota na agenda|coloca na agenda|bota na agenda)\b/;
  const RE_AGENDA_FRACO = /\b(entrega|entregar|buscar|retirar|retirada|instalar|instalacao|medir|orcamento|ligar para|ligar pro|ligar pra|mandar|enviar|imprimir|terminar|finalizar|postar)\b/;
  function interpretarAgenda(original, t, origAlinhado, ctx) {
    const forte = RE_AGENDA_FORTE.test(t);
    const temDinheiro = /(\d+[.,]?\d*)\s*(reais|real|conto|pila)|r\$|\bdeve\b|\bdevendo\b|\bpagou\b|\bpaguei\b|\bvence\b|\bfiado\b/.test(t);
    const h = acharHora(t), d = acharData(t, ctx.hoje);
    if (!forte && !(RE_AGENDA_FRACO.test(t) && (h || d) && !temDinheiro)) return null;
    // tira data/hora e verbos de comando para formar o título
    let tt = t, oo = origAlinhado;
    const cortes = [h, d].filter(Boolean).sort((a, b) => b.ini - a.ini);
    for (const c of cortes) { tt = tt.slice(0, c.ini) + " ".repeat(c.fim - c.ini) + tt.slice(c.fim); oo = oo.slice(0, c.ini) + " ".repeat(c.fim - c.ini) + oo.slice(c.fim); }
    const pre = tt.match(/^\s*(?:(?:por favor|claude|assessor|ei|oi)[, ]+)*(?:(?:me )?(?:agenda|agendar|agende|marca|marcar|marque|anota na agenda|coloca na agenda|bota na agenda|anota|lembra|lembrar|lembre)(?:-me)?(?: de| que| para| pra| uma| um| a| o)*\s+|lembrete(?: de| para| pra)?\s+|tenho (?:que |de )?|preciso (?:que |de )?)/);
    let ini = pre ? pre[0].length : 0;
    let titulo = oo.slice(ini).replace(/\s+/g, " ").replace(/\s+(na|no|nessa|nesse|para|pra|pro|ate|as|a|de|do|da|em)\s*[,.!]?\s*$/i, "").replace(/^[,.\s]+|[,.\s]+$/g, "").trim();
    titulo = titulo.replace(/\s+(na|no|para|pra|pro|ate|as|em)\s*$/i, "").trim();
    if (titulo) titulo = titulo[0].toUpperCase() + titulo.slice(1);
    // cliente: "com o Pedro", "do Pedro", "pro Pedro", "da Ana"
    let cliente = "";
    const nomes = ctx.clientes || [];
    const mc = tt.match(/\b(?:com|pro|pra|para|do|da|de|ao|a|o|cliente)\s+(?:o |a |seu |dona |sr\.? |sra\.? )?([a-zà-ÿ]+(?: [a-zà-ÿ]+)?)/g);
    if (mc) {
      for (const frag of mc) {
        const nome = frag.replace(/^\S+\s+(?:o |a |seu |dona |sr\.? |sra\.? )?/, "").trim();
        const c = casarCliente(nome, nomes) || casarCliente(nome.split(" ")[0], nomes);
        if (c) { cliente = c; break; }
      }
      if (!cliente) {
        const pos = tt.search(/\b(?:com|pro|pra|para|cliente)\s+(?:o |a |seu |dona )?[a-z]/);
        if (pos >= 0) { const nm = extrairNome(oo, tt, -1, /\b(?:com|pro|pra|para|cliente)\s+(?:o |a |seu |dona )?/); if (nm && /^[A-ZÀ-Ý]/.test(oo.split(" ").find(w => semAcento(w.toLowerCase()) === semAcento(nm.split(" ")[0].toLowerCase())) || "")) cliente = nm; }
      }
    }
    return { tipo: "agenda", titulo: titulo || "Compromisso", cliente, data: d ? d.data : ctx.hoje, hora: h ? h.hora : "", horaAprox: !!(h && h.aprox), semData: !d };
  }

  function interpretar(texto, ctx) {
    const hoje = ctx.hoje, clientes = ctx.clientes || [];
    const tel = telefone(texto);
    let original = texto.trim().replace(/\s+/g, " ");
    if (tel) original = original.replace(tel, " ").replace(/\s+/g, " ").trim();
    let t = numerosPorExtenso(semAcento(original.toLowerCase())).replace(/\s+/g, " ").trim();
    const origAlinhado = numerosPorExtenso(original.replace(/\btr[êe]s\b/gi, "tres")).replace(/\s+/g, " ").trim(); // mesmo tamanho de palavras

    // PERGUNTAS DE AGENDA
    if (/\b(agenda|compromisso|compromissos|o que tenho|que tenho|tenho algo|tenho alguma coisa|meu dia|programado|agendado)\b/.test(t) && (/\?$/.test(t) || /^(qual|quais|o que|que|tenho|como|mostra|me mostra|minha|ver)\b/.test(t))) {
      const dq = acharData(t, hoje);
      if (/semana/.test(t)) return { tipo: "pergunta", sobre: "agenda_semana" };
      return { tipo: "pergunta", sobre: "agenda_dia", data: dq ? dq.data : hoje };
    }
    {
      const ag = interpretarAgenda(original, t, origAlinhado, ctx);
      if (ag && !/\?$/.test(t)) return ag;
    }

    // PERGUNTAS
    if (/\?$/.test(t) || /^(quem|quanto|quantos|qual|quais|como|tem alguem|lista|mostra|me mostra)\b/.test(t)) {
      if (/atras|vencid/.test(t)) return { tipo: "pergunta", sobre: "atrasados" };
      if (/hoje/.test(t)) return { tipo: "pergunta", sobre: "hoje" };
      if (/semana/.test(t)) return { tipo: "pergunta", sobre: "semana" };
      if (/mes/.test(t) && /receb|entrou|ganhei/.test(t)) return { tipo: "pergunta", sobre: "mes" };
      const m = t.match(/(?:quanto|o que) (?:o |a )?([a-z ]+?) (?:me )?deve/);
      if (m && !/^(e|ainda|tem|falta)$/.test(m[1].trim())) return { tipo: "pergunta", sobre: "cliente", cliente: casarCliente(m[1].trim(), clientes) || capitalizar(m[1].trim()) };
      return { tipo: "pergunta", sobre: "devendo" };
    }

    const dataPos = acharData(t, hoje);
    const nums = numeros(t, dataPos);
    const fpag = forma(t);

    // PAGAMENTO
    const rePag = /\b(me pagou|pagou|paguei|quitou|acertou|me deu|deu|transferiu|mandou|fez o pix|fez pix|depositou)\b/;
    const reRecebi = /\b(recebi)\b/;
    const reDivida = /\b(me deve|deve|esta devendo|ta devendo|ficou devendo|fica devendo|vai pagar|vai me pagar|fiado|vendi|encomendou|comprou|pegou|pediu|fechou|fiz|fiz um|fiz uns|fiz uma)\b/;
    const mPag = t.match(rePag), mRec = t.match(reRecebi), mDiv = t.match(reDivida);
    const ehPagamento = (mPag || mRec) && (!mDiv || (mPag && mPag.index < mDiv.index && !/\b(vendi|encomendou|comprou|pegou|pediu|fechou|fiz)\b/.test(t))) ;
    const temEntrada = /\b(entrada|sinal|adiantou|adiantado|ja pagou|pagou)\b/.test(t);

    if (ehPagamento && !(mDiv && /\b(vendi|encomendou|comprou|pegou|pediu|fechou|fiz|deve|devendo)\b/.test(t) && temEntrada)) {
      let nome = "";
      if (mRec) nome = extrairNome(origAlinhado, t, -1, /\brecebi(?: [\d.,]+(?: reais| real| conto| pila)?)?(?: (?:no|em) (?:pix|dinheiro|cartao))? (?:do |da |de |dos |das )/);
      if (!nome && mPag) nome = extrairNome(origAlinhado, t, mPag.index, null);
      const cli = casarCliente(nome, clientes) || nome;
      const quitou = /\b(quitou|acertou tudo|pagou tudo|pagou o resto|pagou o restante|tudo)\b/.test(t);
      const v = nums.find(n => !n.qtd) || null;
      return { tipo: "pagamento", cliente: cli, clienteNovo: !!nome && !casarCliente(nome, clientes), valor: v ? v.v : 0, quitar: quitou && !v, data: dataPos && dataPos.data <= hoje ? dataPos.data : hoje, forma: fpag };
    }

    // DÍVIDA / VENDA
    if (mDiv || nums.length) {
      let nome = "";
      const idx = mDiv ? mDiv.index : -1;
      if (/\b(vendi|fiz|fiz um|fiz uns|fiz uma)\b/.test(t)) nome = extrairNome(origAlinhado, t, -1, /\b(?:pra|pro|para a|para o|para|ao|a)\s/);
      if (!nome && idx > 0) nome = extrairNome(origAlinhado, t, idx, null);
      if (!nome) nome = extrairNome(origAlinhado, t, -1, /\b(?:cliente|pra|pro|para)\s/);
      const cli = casarCliente(nome, clientes) || nome;

      // valor total e entrada
      let entrada = 0, total = 0;
      const ent = nums.find(n => /(pagou|deu|entrada|sinal|adiantou|ja pagou|paguei|mandou)\s*(r\$\s*)?$/.test(t.slice(Math.max(0, n.ini - 14), n.ini)) || /^\s*(reais\s*)?(de entrada|de sinal|adiantado)/.test(t.slice(n.fim, n.fim + 16)));
      if (ent) entrada = ent.v;
      const cands = nums.filter(n => n !== ent && !n.qtd);
      const restoN = cands.find(n => /(resto|restante|falta|faltam|faltando)\s*(de\s*)?(r\$\s*)?$/.test(t.slice(Math.max(0, n.ini - 14), n.ini)));
      const totalN = cands.find(n => /(por|total|valor|deve|devendo|de)\s*(r\$\s*)?$/.test(t.slice(Math.max(0, n.ini - 10), n.ini)) && n !== restoN) || cands.find(n => n.moeda && n !== restoN) || cands.find(n => n !== restoN);
      if (totalN) total = totalN.v;
      if (restoN && !totalN) total = restoN.v + entrada;
      if (restoN && totalN && entrada === 0) entrada = Math.max(0, total - restoN.v);

      // descrição: depois de "do/da/de" (após o valor) ou entre verbo e "por"
      let desc = "";
      const ow = origAlinhado.split(" "), nw = t.split(" ");
      const palavraEm = pos => t.slice(0, pos).split(" ").filter(Boolean).length;
      let iniDesc = -1;
      const md = t.match(/\b(?:\d[\d.,]*\s*(?:reais|real|conto|pila)?\s+)(?:do|da|de|dos|das|pelo|pela|pelos|pelas|referente a|referente ao)\s+(?!entrada|sinal)/);
      if (md) iniDesc = palavraEm(md.index + md[0].length);
      else { const mv = t.match(/\b(encomendou|comprou|pegou|pediu|vendi|fechou|fiz)\s+(?:um |uma |uns |umas )?/); if (mv) iniDesc = palavraEm(mv.index + mv[0].length); }
      if (iniDesc >= 0) {
        const out = [];
        for (let i = iniDesc; i < nw.length; i++) {
          const w = nw[i];
          if (/^(por|vence|vencimento|pra|pro|para|ate|pagou|deu|com|e|o|resto|restante|no|na|dia|r\$|,)$/.test(w.replace(/,$/, "")) && out.length) break;
          if (/,$/.test(w)) { out.push(ow[i].replace(/,$/, "")); break; }
          if (/^\d/.test(w) && out.length && !/^\d+$/.test(w)) break;
          if (/^\d[\d.,]*$/.test(w) && totalN && t.indexOf(w) === totalN.ini) break;
          out.push(ow[i]);
          if (out.length >= 8) break;
        }
        desc = out.join(" ").replace(/^(do|da|de)\s+/i, "").trim();
        if (/^(pra|pro|para)$/i.test(desc)) desc = "";
      }
      if (!desc) { const q = nums.find(n => n.qtd); if (q) { const i = palavraEm(q.ini); desc = ow.slice(i, i + 3).join(" ").replace(/[,.]$/, ""); } }
      return { tipo: "divida", cliente: cli, clienteNovo: !!nome && !casarCliente(nome, clientes), valor: total, recebido: Math.min(entrada, total || entrada), vencimento: dataPos ? dataPos.data : "", descricao: desc, forma: fpag || "Pix", telefone: tel };
    }

    return { tipo: "desconhecido" };
  }

  root.Interpretador = { interpretar, acharData, acharHora, addDias, iso };
  if (typeof module !== "undefined") module.exports = root.Interpretador;
})(typeof window !== "undefined" ? window : globalThis);
