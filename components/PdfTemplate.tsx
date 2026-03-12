"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import type { ReportData } from "@/lib/types";

// Paleta profissional para impressão (fundo branco)
const THEME = {
  bg: "#ffffff",
  bgCard: "#f8f8fb",
  bgAccent: "#f0eeff",
  border: "#e2e2ee",
  ink: "#18181f",
  ink2: "#44445a",
  ink3: "#888899",
  accent: "#6b52f5",
  green: "#16a34a",
  greenBg: "#f0fdf4",
  greenBorder: "#bbf7d0",
  red: "#dc2626",
  redBg: "#fef2f2",
  redBorder: "#fecaca",
  amber: "#d97706",
  amberBg: "#fffbeb",
  amberBorder: "#fde68a",
  font: "'Inter', 'Segoe UI', system-ui, sans-serif",
};

const CHART_COLORS = [
  "#6b52f5",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
];

const INSIGHT_STYLE = {
  positivo: {
    border: THEME.greenBorder,
    bg: THEME.greenBg,
    label: THEME.green,
  },
  atencao: { border: THEME.amberBorder, bg: THEME.amberBg, label: THEME.amber },
  critico: { border: THEME.redBorder, bg: THEME.redBg, label: THEME.red },
  sugestao: { border: THEME.border, bg: THEME.bgAccent, label: THEME.accent },
} as const;

function formatCurrency(amount: number) {
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatPercentageDelta(current: number, previous: number) {
  if (!previous) return "0";
  return (((current - previous) / previous) * 100).toFixed(1);
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: THEME.ink3,
        margin: "0 0 10px",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}
    >
      {children}
    </p>
  );
}

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: THEME.bgCard,
        border: `1px solid ${THEME.border}`,
        borderRadius: 10,
        padding: "14px 16px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function MetricCard({
  label,
  value,
  change,
  positive,
}: {
  label: string;
  value: string;
  change: string;
  positive: boolean;
}) {
  return (
    <div
      style={{
        background: THEME.bg,
        border: `1px solid ${THEME.border}`,
        borderRadius: 10,
        padding: "12px 14px",
        flex: 1,
      }}
    >
      <p
        style={{
          fontSize: 9,
          color: THEME.ink3,
          margin: "0 0 4px",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: THEME.ink,
          margin: "0 0 4px",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </p>
      <p
        style={{
          fontSize: 9,
          color: positive ? THEME.green : THEME.red,
          fontWeight: 600,
          margin: 0,
        }}
      >
        {positive ? "▲ +" : "▼ "}
        {change}% vs anterior
      </p>
    </div>
  );
}

interface Props {
  report: ReportData;
  id?: string;
}

export default function PdfTemplate({ report, id = "pdf-template" }: Props) {
  const {
    metrics,
    evolucaoFaturamento,
    despesasPorCategoria,
    insights,
    topProdutos,
    aiAnalysis,
  } = report;

  // Largura de conteúdo do A4 (794px) menos padding (2 × 40px)
  const CONTENT_WIDTH = 714;

  const metricCards = [
    {
      label: "Faturamento",
      value: formatCurrency(metrics.faturamento),
      change: formatPercentageDelta(
        metrics.faturamento,
        metrics.faturamentoAnterior,
      ),
      positive: metrics.faturamento >= metrics.faturamentoAnterior,
    },
    {
      label: "Ticket Médio",
      value: formatCurrency(metrics.ticketMedio),
      change: formatPercentageDelta(
        metrics.ticketMedio,
        metrics.ticketAnterior,
      ),
      positive: metrics.ticketMedio >= metrics.ticketAnterior,
    },
    {
      label: "Transações",
      value: metrics.clientesAtivos.toLocaleString("pt-BR"),
      change: formatPercentageDelta(
        metrics.clientesAtivos,
        metrics.clientesAnterior,
      ),
      positive: metrics.clientesAtivos >= metrics.clientesAnterior,
    },
    {
      label: "Margem de Lucro",
      value: `${metrics.margemLucro}%`,
      change: formatPercentageDelta(
        metrics.margemLucro,
        metrics.margemAnterior,
      ),
      positive: metrics.margemLucro >= metrics.margemAnterior,
    },
  ];

  return (
    <div
      id={id}
      style={{
        width: 794,
        backgroundColor: THEME.bg,
        padding: "36px 40px 48px",
        boxSizing: "border-box",
        fontFamily: THEME.font,
        color: THEME.ink,
      }}
    >
      {/* ── Cabeçalho ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 22,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: THEME.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
                ▲
              </span>
            </div>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: THEME.ink,
                letterSpacing: "-0.01em",
              }}
            >
              Insights Dashboard
            </span>
          </div>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: THEME.ink,
              margin: "0 0 2px",
            }}
          >
            {report.name}
          </p>
          <p style={{ fontSize: 10, color: THEME.ink3, margin: 0 }}>
            {formatDate(report.createdAt)} · {report.fileName}
          </p>
        </div>
        <div
          style={{
            fontSize: 9,
            color: THEME.ink3,
            fontWeight: 500,
            background: THEME.bgCard,
            border: `1px solid ${THEME.border}`,
            borderRadius: 6,
            padding: "4px 10px",
            alignSelf: "flex-start",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Relatório Gerado
        </div>
      </div>

      <div style={{ height: 1, background: THEME.border, marginBottom: 18 }} />

      {/* ── Banner IA ── */}
      {aiAnalysis && (
        <div
          style={{
            background: THEME.bgAccent,
            border: `1px solid ${THEME.border}`,
            borderLeft: `3px solid ${THEME.accent}`,
            borderRadius: "0 10px 10px 0",
            padding: "10px 14px",
            marginBottom: 16,
            display: "flex",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>💡</span>
          <div>
            <p
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: THEME.accent,
                margin: "0 0 3px",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}
            >
              Análise da IA
            </p>
            <p
              style={{
                fontSize: 10,
                color: THEME.ink2,
                margin: 0,
                lineHeight: 1.65,
              }}
            >
              {aiAnalysis}
            </p>
          </div>
        </div>
      )}

      {/* ── Cards de métrica ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {metricCards.map((card, index) => (
          <MetricCard key={index} {...card} />
        ))}
      </div>

      {/* ── Gráfico de linha ── */}
      <Card style={{ marginBottom: 14 }}>
        <SectionTitle>Evolução do Faturamento</SectionTitle>
        <LineChart
          width={CONTENT_WIDTH - 32}
          height={155}
          data={evolucaoFaturamento}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={THEME.border}
            vertical={false}
          />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 9, fill: THEME.ink3 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: THEME.ink3 }}
            axisLine={false}
            tickLine={false}
            width={38}
            tickFormatter={(tickValue: number) =>
              tickValue >= 1000
                ? `${(tickValue / 1000).toFixed(0)}k`
                : String(tickValue)
            }
          />
          <Tooltip
            contentStyle={{
              background: THEME.bg,
              border: `1px solid ${THEME.border}`,
              borderRadius: 6,
              fontSize: 10,
            }}
            formatter={(tickValue: number) => [
              formatCurrency(tickValue),
              "Faturamento",
            ]}
          />
          <Line
            type="monotone"
            dataKey="valor"
            stroke={THEME.accent}
            strokeWidth={2}
            dot={{ r: 3, fill: THEME.accent, strokeWidth: 0 }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </Card>

      {/* ── Pizza + Top produtos ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: topProdutos?.length ? "1fr 1fr" : "1fr",
          gap: 14,
          marginBottom: 14,
        }}
      >
        <Card>
          <SectionTitle>Despesas por Categoria</SectionTitle>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <PieChart width={130} height={130}>
              <Pie
                data={despesasPorCategoria}
                dataKey="valor"
                nameKey="nome"
                cx="50%"
                cy="50%"
                outerRadius={58}
                innerRadius={28}
                paddingAngle={2}
              >
                {despesasPorCategoria.map((category, index) => (
                  <Cell
                    key={index}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: THEME.bg,
                  border: `1px solid ${THEME.border}`,
                  borderRadius: 6,
                  fontSize: 10,
                }}
                formatter={(percentage) => [`${percentage}%`, "Participação"]}
              />
            </PieChart>
            <div style={{ flex: 1 }}>
              {despesasPorCategoria.map((category, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 7,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      flexShrink: 0,
                      display: "inline-block",
                      background: CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  />
                  <span style={{ fontSize: 9, color: THEME.ink2, flex: 1 }}>
                    {category.nome}
                  </span>
                  <span
                    style={{ fontSize: 9, fontWeight: 700, color: THEME.ink }}
                  >
                    {category.valor}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {topProdutos && topProdutos.length > 0 && (
          <Card>
            <SectionTitle>Top Categorias</SectionTitle>
            <BarChart
              width={300}
              height={130}
              data={topProdutos}
              layout="vertical"
              margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="nome"
                tick={{ fontSize: 9, fill: THEME.ink3 }}
                axisLine={false}
                tickLine={false}
                width={70}
                tickFormatter={(categoryLabel: string) =>
                  categoryLabel.length > 10
                    ? categoryLabel.slice(0, 10) + "…"
                    : categoryLabel
                }
              />
              <Tooltip
                contentStyle={{
                  background: THEME.bg,
                  border: `1px solid ${THEME.border}`,
                  borderRadius: 6,
                  fontSize: 10,
                }}
                formatter={(tickValue: number) => [
                  formatCurrency(tickValue),
                  "Valor",
                ]}
              />
              <Bar
                dataKey="valor"
                radius={[0, 4, 4, 0]}
                fill={THEME.accent}
                opacity={0.85}
              />
            </BarChart>
          </Card>
        )}
      </div>

      {/* ── Insights ── */}
      <Card style={{ marginBottom: 24 }}>
        <SectionTitle>Insights da IA</SectionTitle>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {insights.map((insight, index) => {
            const insightStyle =
              INSIGHT_STYLE[insight.tipo] ?? INSIGHT_STYLE.sugestao;
            return (
              <div
                key={index}
                style={{
                  border: `1px solid ${insightStyle.border}`,
                  borderLeft: `3px solid ${insightStyle.label}`,
                  background: insightStyle.bg,
                  borderRadius: "0 8px 8px 0",
                  padding: "9px 12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 3,
                  }}
                >
                  <p
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: insightStyle.label,
                      margin: 0,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {insight.titulo}
                  </p>
                  {insight.metrica && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: insightStyle.label,
                        background: "rgba(0,0,0,0.06)",
                        borderRadius: 4,
                        padding: "1px 6px",
                      }}
                    >
                      {insight.metrica}
                    </span>
                  )}
                </div>
                <p
                  style={{
                    fontSize: 10,
                    color: THEME.ink2,
                    margin: 0,
                    lineHeight: 1.65,
                  }}
                >
                  {insight.texto}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Rodapé ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          paddingTop: 12,
          borderTop: `1px solid ${THEME.border}`,
        }}
      >
        <span style={{ fontSize: 9, color: THEME.ink3 }}>
          Insights Dashboard
        </span>
        <span style={{ fontSize: 9, color: THEME.ink3 }}>
          Gerado em {new Date(report.createdAt).toLocaleDateString("pt-BR")}
        </span>
      </div>
    </div>
  );
}
