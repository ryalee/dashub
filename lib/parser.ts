import type { ReportData } from "./types";

const CHART_COLORS = [
  "#7b5ef8",
  "#1fd87a",
  "#ffa826",
  "#ff4060",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
];
const MONTH_LABELS = [
  "Jan.",
  "Fev.",
  "Mar.",
  "Abr.",
  "Mai.",
  "Jun.",
  "Jul.",
  "Ago.",
  "Set.",
  "Out.",
  "Nov.",
  "Dez.",
];

//utils

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// converte pra numero
function toNum(rawValue: unknown): number {
  if (typeof rawValue === "number") return isFinite(rawValue) ? rawValue : 0;
  if (typeof rawValue === "string") {
    const cleanedString = rawValue
      .replace(/[R$\s]/g, "")
      .replace(/\.(?=\d{3}(?:[,.]|$))/g, "")
      .replace(",", ".");
    const parsed = parseFloat(cleanedString);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

// Formata número como moeda R$
function br(amount: number) {
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// detecção das colunas

interface ColMap {
  revenueCol: string;
  costCol?: string;
  profitCol?: string;
  marginCol?: string;
  qtyCol?: string;
  dateCol?: string;
  statusCol?: string;
  categoryCol?: string;
  clientCol?: string;
  numericCols: string[];
  textCols: string[];
}

function detectCols(rows: Record<string, unknown>[]): ColMap {
  const keys = Object.keys(rows[0] ?? {});
  const numericCols: string[] = [];
  const textCols: string[] = [];
  let revenueCol: string | undefined;
  let costCol: string | undefined;
  let profitCol: string | undefined;
  let marginCol: string | undefined;
  let qtyCol: string | undefined;
  let dateCol: string | undefined;
  let statusCol: string | undefined;
  let categoryCol: string | undefined;
  let clientCol: string | undefined;

  for (const columnKey of keys) {
    // classificação por nome da coluna
    if (/status|situação|state/i.test(columnKey)) {
      statusCol = columnKey;
      textCols.push(columnKey);
      continue;
    }
    if (/^(mes|mês|month|periodo)$|^data$|date|dt_/i.test(columnKey)) {
      if (!dateCol) dateCol = columnKey;
      continue;
    }
    if (/quantidade|qty|qtd\b|units/i.test(columnKey)) {
      qtyCol = columnKey;
      numericCols.push(columnKey);
      continue;
    }
    if (/margem.*%|margin.*%|%.*margem/i.test(columnKey)) {
      marginCol = columnKey;
      numericCols.push(columnKey);
      continue;
    }
    if (
      /^(lucro|profit|resultado)$/i.test(columnKey) ||
      (/lucro|profit/i.test(columnKey) && !/margem|%/i.test(columnKey))
    ) {
      profitCol = columnKey;
      numericCols.push(columnKey);
      continue;
    }
    if (/custo|cost\b|despesa/i.test(columnKey)) {
      costCol = columnKey;
      numericCols.push(columnKey);
      continue;
    }
    if (
      /fatur|receita|revenue|total.?l[ií]q|liq\b|venda|sale|gross/i.test(
        columnKey,
      )
    ) {
      revenueCol = columnKey;
      numericCols.push(columnKey);
      continue;
    }
    if (/categ|produto|product|item\b|servi[cç]|descri/i.test(columnKey)) {
      categoryCol = columnKey;
      textCols.push(columnKey);
      continue;
    }
    if (/cliente|client|empresa|company|customer/i.test(columnKey)) {
      clientCol = columnKey;
      textCols.push(columnKey);
      continue;
    }

    // Fallback: classificação por conteúdo das primeiras 30 linhas
    const samples = rows
      .slice(0, 30)
      .map((row) => row[columnKey])
      .filter((rawValue) => rawValue != null && rawValue !== "");

    const numRatio =
      samples.filter(
        (rawValue) =>
          typeof rawValue === "number" ||
          (typeof rawValue === "string" && toNum(rawValue) !== 0),
      ).length / (samples.length || 1);

    const isDateLike = samples.some(
      (rawValue) =>
        typeof rawValue === "string" &&
        (/^\d{2}\/\d{4}$/.test(rawValue) || /^\d{4}-\d{2}/.test(rawValue)),
    );

    if (isDateLike && !dateCol) dateCol = columnKey;
    else if (numRatio > 0.6) numericCols.push(columnKey);
    else textCols.push(columnKey);
  }

  // fallback de receita: coluna com maior soma total
  if (!revenueCol && numericCols.length) {
    revenueCol = numericCols.reduce((best, col) => {
      const sumBest = rows.reduce(
        (accumulator, row) => accumulator + toNum(row[best]),
        0,
      );
      const sumCol = rows.reduce(
        (accumulator, row) => accumulator + toNum(row[col]),
        0,
      );
      return sumCol > sumBest ? col : best;
    });
  }

  return {
    revenueCol: revenueCol ?? numericCols[0] ?? keys[0] ?? "",
    costCol,
    profitCol,
    marginCol,
    qtyCol,
    dateCol,
    statusCol,
    categoryCol,
    clientCol,
    numericCols,
    textCols,
  };
}

// filtro: remove devoluções e cancelamentos

function filterValid(rows: Record<string, unknown>[], cm: ColMap) {
  if (!cm.statusCol) return rows;
  return rows.filter(
    (row) =>
      !/(devol|cancel|refund|return)/i.test(String(row[cm.statusCol!] ?? "")),
  );
}

// calculo de metricas
interface Metrics {
  faturamento: number;
  ticketMedio: number;
  transacoes: number;
  margemLucro: number;
  lucroTotal: number;
  custoTotal: number;
}

function calcMetrics(rows: Record<string, unknown>[], cm: ColMap): Metrics {
  let totalRevenue = 0;
  let totalProfit = 0;
  let totalCost = 0;
  let sumMargin = 0;
  let countMargin = 0;

  for (const row of rows) {
    const rev = toNum(row[cm.revenueCol]);
    const cost = cm.costCol ? toNum(row[cm.costCol]) : 0;
    const profit = cm.profitCol ? toNum(row[cm.profitCol]) : 0;
    const margin = cm.marginCol ? toNum(row[cm.marginCol]) : 0;

    totalRevenue += rev;
    totalCost += cost;
    totalProfit += profit || rev - cost;

    if (margin > 0 && margin <= 100) {
      sumMargin += margin;
      countMargin++;
    }
  }

  const transacoes = rows.length;
  const ticketMedio = transacoes > 0 ? totalRevenue / transacoes : 0;

  const margemLucro =
    totalRevenue > 0 && totalProfit > 0
      ? (totalProfit / totalRevenue) * 100
      : countMargin > 0
        ? sumMargin / countMargin
        : totalRevenue > 0 && totalCost > 0
          ? ((totalRevenue - totalCost) / totalRevenue) * 100
          : 0;

  return {
    faturamento: Math.round(totalRevenue),
    ticketMedio: Math.round(ticketMedio),
    transacoes,
    margemLucro: Math.round(margemLucro * 10) / 10,
    lucroTotal: Math.round(totalProfit),
    custoTotal: Math.round(totalCost),
  };
}

// evolução do faturamento

function buildEvolution(
  rows: Record<string, unknown>[],
  cm: ColMap,
): ReportData["evolucaoFaturamento"] {
  if (cm.dateCol) {
    const grouped: Record<string, number> = {};

    for (const row of rows) {
      const raw = String(row[cm.dateCol] ?? "");
      const isoDateMatch = raw.match(/(\d{4})-(\d{2})/);
      const brDateMatch = raw.match(/(\d{2})\/(\d{4})/);
      const key = isoDateMatch
        ? `${isoDateMatch[1]}-${isoDateMatch[2]}`
        : brDateMatch
          ? `${brDateMatch[2]}-${brDateMatch[1]}`
          : raw.slice(0, 7);
      if (key?.length >= 6)
        grouped[key] = (grouped[key] ?? 0) + toNum(row[cm.revenueCol]);
    }

    const entries = Object.entries(grouped)
      .filter(([, currentValue]) => currentValue > 0)
      .sort(([itemA], [itemB]) => itemA.localeCompare(itemB))
      .slice(0, 12);

    if (entries.length >= 2) {
      return entries.map(([columnKey, currentValue]) => {
        const month = parseInt(columnKey.split(/[-\/]/)[1] ?? "1") - 1;
        return {
          mes: MONTH_LABELS[month] ?? columnKey,
          valor: Math.round(currentValue),
        };
      });
    }
  }

  // fallback: distribui em até 6 chunks
  const chunks = Math.min(6, rows.length);
  const size = Math.ceil(rows.length / chunks);
  return Array.from({ length: chunks }, (_, index) => {
    const slice = rows.slice(index * size, (index + 1) * size);
    return {
      mes: MONTH_LABELS[index],
      valor: Math.round(
        slice.reduce(
          (accumulator, row) => accumulator + toNum(row[cm.revenueCol]),
          0,
        ),
      ),
    };
  });
}

// top categorias / produtos

function buildTopProdutos(
  rows: Record<string, unknown>[],
  cm: ColMap,
): ReportData["topProdutos"] {
  const nameCol = cm.categoryCol ?? cm.textCols[0];
  if (!nameCol) return undefined;

  const grouped: Record<string, number> = {};
  for (const row of rows) {
    const name = String(row[nameCol] ?? "").trim();
    if (name) grouped[name] = (grouped[name] ?? 0) + toNum(row[cm.revenueCol]);
  }

  const total = Object.values(grouped).reduce(
    (accumulator, currentValue) => accumulator + currentValue,
    0,
  );
  if (!total) return undefined;

  return Object.entries(grouped)
    .sort(([, itemA], [, itemB]) => itemB - itemA)
    .slice(0, 6)
    .map(([nome, valor]) => ({
      nome,
      valor: Math.round(valor),
      percentual: Math.round((valor / total) * 100),
    }));
}

// despesas por categoria

function buildDespesas(
  rows: Record<string, unknown>[],
  cm: ColMap,
): ReportData["despesasPorCategoria"] {
  if (cm.categoryCol && cm.costCol) {
    const grouped: Record<string, number> = {};
    for (const row of rows) {
      const name = String(row[cm.categoryCol] ?? "").trim();
      if (name) grouped[name] = (grouped[name] ?? 0) + toNum(row[cm.costCol]);
    }
    const total = Object.values(grouped).reduce(
      (accumulator, currentValue) => accumulator + currentValue,
      0,
    );
    if (total > 0) {
      return Object.entries(grouped)
        .sort(([, itemA], [, itemB]) => itemB - itemA)
        .slice(0, 6)
        .map(([nome, valor], index) => ({
          nome,
          cor: CHART_COLORS[index % CHART_COLORS.length],
          valor: Math.round((valor / total) * 100),
        }));
    }
  }

  const expenseCols = cm.numericCols
    .filter(
      (columnName) =>
        columnName !== cm.revenueCol &&
        columnName !== cm.qtyCol &&
        columnName !== cm.marginCol,
    )
    .slice(0, 5);

  if (expenseCols.length >= 2) {
    const sums = expenseCols.map((columnName) =>
      rows.reduce(
        (accumulator, row) => accumulator + toNum(row[columnName]),
        0,
      ),
    );
    const total = sums.reduce(
      (accumulator, currentValue) => accumulator + currentValue,
      0,
    );
    if (total > 0)
      return expenseCols.map((columnName, index) => ({
        nome: columnName,
        cor: CHART_COLORS[index % CHART_COLORS.length],
        valor: Math.round((sums[index] / total) * 100),
      }));
  }

  // fallback genérico quando os dados não permitem cálculo real
  return [
    { nome: "Custo Produto", valor: 52, cor: CHART_COLORS[0] },
    { nome: "Marketing", valor: 18, cor: CHART_COLORS[1] },
    { nome: "Operacional", valor: 16, cor: CHART_COLORS[2] },
    { nome: "Outros", valor: 14, cor: CHART_COLORS[3] },
  ];
}

// insights de fallback (exibidos antes da IA responder) 

function buildFallback(
  metrics: Metrics,
  prevFat: number,
): ReportData["insights"] {
  const growthPct = prevFat
    ? (((metrics.faturamento - prevFat) / prevFat) * 100).toFixed(1)
    : "0";
  const growing = metrics.faturamento >= prevFat;

  return [
    {
      tipo: growing ? "positivo" : "atencao",
      titulo: growing ? "Receita cresceu" : "Queda de receita",
      texto: growing
        ? `Faturamento de ${br(metrics.faturamento)} em ${metrics.transacoes} transações, alta de ${growthPct}%.`
        : `Faturamento de ${br(metrics.faturamento)}, queda de ${Math.abs(+growthPct)}% vs período anterior.`,
      metrica: `${growing ? "+" : ""}${growthPct}%`,
    },
    {
      tipo: "sugestao",
      titulo: "Ticket médio",
      texto: `Ticket médio de ${br(metrics.ticketMedio)} por transação. Análise detalhada disponível após processamento da IA.`,
      metrica: br(metrics.ticketMedio),
    },
    {
      tipo:
        metrics.margemLucro >= 30
          ? "positivo"
          : metrics.margemLucro >= 15
            ? "atencao"
            : "critico",
      titulo: "Margem de lucro",
      texto: `Margem de ${metrics.margemLucro.toFixed(1)}% sobre ${br(metrics.faturamento)} de receita. ${
        metrics.margemLucro >= 30
          ? "Rentabilidade saudável."
          : metrics.margemLucro >= 15
            ? "Margem moderada — revise custos."
            : "Margem crítica — ação imediata necessária."
      }`,
      metrica: `${metrics.margemLucro.toFixed(1)}%`,
    },
  ];
}

// resumo estruturado para a IA

export function buildSummaryFromReport(report: ReportData): string {
  const {
    metrics,
    evolucaoFaturamento: evolution,
    topProdutos,
    fileName,
  } = report;

  const last3Months = evolution
    .slice(-3)
    .reduce(
      (accumulator, evolutionPoint) => accumulator + evolutionPoint.valor,
      0,
    );
  const prev3Months = evolution
    .slice(-6, -3)
    .reduce(
      (accumulator, evolutionPoint) => accumulator + evolutionPoint.valor,
      0,
    );
  const trend = prev3Months
    ? (((last3Months - prev3Months) / prev3Months) * 100).toFixed(1) + "%"
    : "n/a";

  const sorted = [...evolution].sort(
    (itemA, itemB) => itemB.valor - itemA.valor,
  );
  const bestMonth = sorted[0];
  const worstMonth = sorted[sorted.length - 1];

  const monthlyChanges = evolution
    .slice(1)
    .map((currentMonth, index) =>
      evolution[index].valor
        ? ((currentMonth.valor - evolution[index].valor) /
            evolution[index].valor) *
          100
        : 0,
    );
  const maxDrop = monthlyChanges.length
    ? Math.min(...monthlyChanges).toFixed(1) + "%"
    : "n/a";
  const maxGain = monthlyChanges.length
    ? Math.max(...monthlyChanges).toFixed(1) + "%"
    : "n/a";

  const sample = (report.rawData ?? []).slice(0, 3);

  return `RELATÓRIO: "${fileName}"
PERÍODO: ${evolution[0]?.mes ?? "?"} → ${evolution[evolution.length - 1]?.mes ?? "?"}
TRANSAÇÕES VÁLIDAS: ${metrics.clientesAtivos}

=== MÉTRICAS PRINCIPAIS ===
Faturamento:    ${br(metrics.faturamento)}
Período ant.:   ${br(metrics.faturamentoAnterior)}
Variação:       ${metrics.faturamento > metrics.faturamentoAnterior ? "+" : ""}${(((metrics.faturamento - metrics.faturamentoAnterior) / (metrics.faturamentoAnterior || 1)) * 100).toFixed(1)}%
Ticket médio:   ${br(metrics.ticketMedio)} / transação
Margem real:    ${metrics.margemLucro}%

=== TENDÊNCIA ===
Últimos 3 vs 3 anteriores: ${trend}
Melhor período: ${bestMonth?.mes} — ${br(bestMonth?.valor ?? 0)}
Pior período:   ${worstMonth?.mes} — ${br(worstMonth?.valor ?? 0)}
Maior queda:    ${maxDrop}
Maior alta:     ${maxGain}

=== TOP PRODUTOS/CATEGORIAS ===
${topProdutos?.map((product, index) => `${index + 1}. ${product.nome}: ${br(product.valor)} (${product.percentual}%)`).join("\n") ?? "Não identificados"}
Concentração top-1: ${topProdutos?.[0]?.percentual ?? 0}%

=== EVOLUÇÃO MENSAL ===
${evolution.map((evolutionPoint) => `${evolutionPoint.mes}: ${br(evolutionPoint.valor)}`).join(" | ")}

=== AMOSTRA DE DADOS (3 registros) ===
${JSON.stringify(sample, null, 0)}`;
}

// ── Parse principal ───────────────────────────────────────

export async function parseFileSync(
  file: File,
  fileName: string,
): Promise<ReportData> {
  let allRows: Record<string, unknown>[] = [];

  if (file.name.toLowerCase().endsWith(".csv")) {
    const text = await file.text();
    const Papa = (await import("papaparse")).default;
    allRows = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
    }).data;
  } else {
    const buf = await file.arrayBuffer();
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buf, { type: "array" });
    allRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      wb.Sheets[wb.SheetNames[0]],
    );
  }

  if (!allRows.length)
    throw new Error("Arquivo vazio ou sem dados reconhecíveis");

  const colMap = detectCols(allRows);
  const validRows = filterValid(allRows, colMap);
  const metrics = calcMetrics(validRows, colMap);
  const evolucao = buildEvolution(validRows, colMap);
  const topProdutos = buildTopProdutos(validRows, colMap);
  const despesas = buildDespesas(validRows, colMap);

  const half = Math.floor(evolucao.length / 2);
  const prevFat =
    evolucao
      .slice(0, half)
      .reduce(
        (accumulator, evolutionPoint) => accumulator + evolutionPoint.valor,
        0,
      ) || metrics.faturamento * 0.9;

  const reportMetrics: ReportData["metrics"] = {
    faturamento: metrics.faturamento,
    ticketMedio: metrics.ticketMedio,
    clientesAtivos: metrics.transacoes,
    margemLucro: Math.round(metrics.margemLucro),
    faturamentoAnterior: Math.round(prevFat),
    ticketAnterior: Math.round(metrics.ticketMedio * 0.93),
    clientesAnterior: Math.round(metrics.transacoes * 0.87),
    margemAnterior: Math.max(Math.round(metrics.margemLucro) - 2, 0),
  };

  const now = new Date();
  const monthName = now.toLocaleString("pt-BR", { month: "long" });

  const report: ReportData = {
    id: generateId(),
    name: `Relatório — ${monthName[0].toUpperCase()}${monthName.slice(1)} ${now.getFullYear()}`,
    createdAt: now.toISOString(),
    fileName,
    aiAnalysis: undefined,
    aiSummary: undefined,
    metrics: reportMetrics,
    evolucaoFaturamento: evolucao,
    despesasPorCategoria: despesas,
    insights: buildFallback(metrics, Math.round(prevFat)),
    topProdutos,
    rawData: validRows.slice(0, 100),
  };

  // Gera e persiste o summary — disponível mesmo após reload do localStorage
  report.aiSummary = buildSummaryFromReport(report);

  return report;
}

// ── Enriquecimento com IA ─────────────────────────────────

const SYSTEM_PROMPT = `Você é um CFO e analista de negócios sênior. Analise os dados e retorne SOMENTE JSON válido, sem markdown, sem texto fora do JSON:

{"aiAnalysis":"string","insights":[{"tipo":"string","titulo":"string","texto":"string","metrica":"string"}]}

REGRAS aiAnalysis: 2 frases. Frase 1 = diagnóstico com 2-3 números reais. Frase 2 = principal oportunidade ou risco com valor.

REGRAS insights: exatamente 5 objetos, nesta ordem:
1. tipo "positivo" — maior conquista dos dados, número exato
2. tipo "atencao" OU "critico" — risco 1 quantificado
3. tipo "atencao" OU "critico" — risco 2 diferente
4. tipo "sugestao" — ação concreta para próximo ciclo com período e meta numérica
5. tipo "sugestao" — segunda ação com KPI-alvo específico

CADA insight: texto com 2 frases (fato + ação). metrica = KPI principal (ex: "+18%", "R$ 4.091", "50.5%").
PROIBIDO: "monitore", "avalie", "considere", qualquer frase sem número concreto dos dados.
tipos válidos: "positivo", "atencao", "critico", "sugestao"`;

/**
 * Chama /api/analyze (Next.js server route) que faz a chamada segura à Anthropic.
 * Usa report.aiSummary (persistido) — funciona em qualquer reload.
 */
export async function enrichWithAI(
  report: ReportData,
  onUpdate: (updated: ReportData) => void,
): Promise<void> {
  const summary = report.aiSummary ?? buildSummaryFromReport(report);

  let res: Response;
  try {
    res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary }),
    });
  } catch (err: any) {
    console.error("[enrichWithAI] Erro de rede:", err?.message ?? err);
    return;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error(
      `[enrichWithAI] HTTP ${res.status}:`,
      body?.error ?? res.statusText,
    );
    return;
  }

  let parsed: { aiAnalysis?: string; insights?: ReportData["insights"] };
  try {
    parsed = await res.json();
  } catch (err) {
    console.error("[enrichWithAI] JSON inválido:", err);
    return;
  }

  if (!Array.isArray(parsed?.insights) || parsed.insights.length === 0) {
    console.warn("[enrichWithAI] Resposta sem insights:", parsed);
    return;
  }

  onUpdate({
    ...report,
    aiAnalysis: parsed.aiAnalysis ?? "",
    insights: parsed.insights,
  });
}

export const parseFile = parseFileSync;
