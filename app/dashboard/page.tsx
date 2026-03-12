"use client";

import { useEffect, useState, useRef, useCallback, memo, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Download,
  Upload,
  Pencil,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  Check,
  BarChart2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  getReports,
  getReportById,
  saveReport,
  renameReport,
  getSettings,
} from "@/lib/storage";
import { parseFileSync, enrichWithAI } from "@/lib/parser";
import { usePdfExport } from "@/lib/usePdfExport";
import type { ReportData } from "@/lib/types";

import PdfTemplate from "@/components/PdfTemplate";

/* format helpers */
function fmtShort(amount: number) {
  if (amount >= 1_000_000) return `R$\u00A0${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `R$\u00A0${(amount / 1_000).toFixed(1)}k`;

  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtFull(amount: number) {
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pctDelta(curr: number, prev: number) {
  if (!prev) return "–";
  const percentageDelta = ((curr - prev) / prev) * 100;
  return `${percentageDelta >= 0 ? "+" : ""}${percentageDelta.toFixed(1)}%`;
}

const INSIGHT_ICON_MAP = {
  positivo: { Icon: CheckCircle2, color: "var(--green)" },
  atencao: { Icon: AlertTriangle, color: "var(--amber)" },
  critico: { Icon: XCircle, color: "var(--red)" },
  sugestao: { Icon: Lightbulb, color: "var(--accent)" },
} as const;

/* card com valores */

const MetricCard = memo(function MetricCard({
  label,
  value,
  delta,
  positive,
  delay,
}: {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  delay: number;
}) {
  return (
    <div className="card fade-in" style={{ animationDelay: `${delay}ms` }}>
      <p className="text-xs mb-1.5 truncate" style={{ color: "var(--ink-3)" }}>
        {label}
      </p>
      <p className="metric-value mb-2 truncate">{value}</p>
      <div className="flex items-center gap-1">
        {positive ? (
          <TrendingUp
            size={11}
            style={{ color: "var(--green)", flexShrink: 0 }}
          />
        ) : (
          <TrendingDown
            size={11}
            style={{ color: "var(--red)", flexShrink: 0 }}
          />
        )}
        <span
          className="text-xs"
          style={{ color: positive ? "var(--green)" : "var(--red)" }}
        >
          {delta} vs anterior.
        </span>
      </div>
    </div>
  );
});

const ChartTooltip = memo(function ChartTooltip({
  active,
  payload,
  label,
}: any) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="card text-xs"
      style={{
        padding: "8px 12px",
        minWidth: 130,
        boxShadow: "0 4px 24px rgba(0,0,0,0.55)",
      }}
    >
      <p style={{ color: "var(--ink-3)", marginBottom: 2 }}>{label}</p>
      <p style={{ color: "var(--accent)", fontWeight: 600 }}>
        {fmtFull(payload[0].value)}
      </p>
    </div>
  );
});

const InsightCard = memo(function InsightCard({
  insight,
} : {
  insight: ReportData["insights"][0];
}) {
  const iconKey = (
    insight.tipo in INSIGHT_ICON_MAP ? insight.tipo : "sugestao"
  ) as keyof typeof INSIGHT_ICON_MAP;

  const { Icon, color } = INSIGHT_ICON_MAP[iconKey];

  return (
    <div className={`insight-${insight.tipo} rounded-xl p-3`}>
      <div className="flex gap-2">
        <Icon size={13} style={{ color, flexShrink: 0, marginTop: 1 }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
            <span
              className="text-xs font-semibold leading-tight"
              style={{ color }}
            >
              {insight.titulo}
            </span>
            {insight.metrica && (
              <span
                className="pill shrink-0"
                style={{ color, background: "rgba(0,0,0,0.3)" }}
              >
                {insight.metrica}
              </span>
            )}
          </div>
          <p
            className="text-xs leading-relaxed"
            style={{ color: "var(--ink-2)" }}
          >
            {insight.texto}
          </p>
        </div>
      </div>
    </div>
  );
});

const RenameModal = memo(function RenameModal({
  current,
  onConfirm,
  onClose,
} : {
  current: string;
  onConfirm: (newName: string) => void;
  onClose: () => void;
}) {
  const [val, setVal] = useState(current);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(formEvent) => formEvent.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
            Renomear relatório
          </p>
          <button className="btn-icon" onClick={onClose}>
            <X size={15} />
          </button>
        </div>
        <form
          onSubmit={(formEvent) => {
            formEvent.preventDefault();
            const trimmedName = val.trim();
            if (trimmedName) onConfirm(trimmedName);
          }}
          className="flex flex-col gap-3"
        >
          <input
            ref={inputRef}
            className="input"
            value={val}
            onChange={(inputEvent) => setVal(inputEvent.target.value)}
            placeholder="Nome do relatório"
            maxLength={80}
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="btn-secondary text-xs py-1.5"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary text-xs py-1.5">
              <Check size={13} /> Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

function Spinner() {
  return (
    <span
      className="w-3 h-3 rounded-full border-2 animate-spin inline-block shrink-0"
      style={{
        borderColor: "var(--border-2)",
        borderTopColor: "var(--accent)",
      }}
    />
  );
}

/* page */
export default function DashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [report, setReport] = useState<ReportData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [rename, setRename] = useState(false);
  const [toast, setToast] = useState<{msg: string; type: "ok" | "err" } | null>(null);
  const { exportPdf, exporting } = usePdfExport();

  const notify = useCallback((msg: string, type: "ok" | "err") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  /* enriquecimento da IA. o relatório já possui o aiSummary. */
  const enrich = useCallback(
    (loadedReport: ReportData) => {
      const { groqApiKey } = getSettings();
      setAiLoading(true);
      enrichWithAI(
        loadedReport,
        (updatedReport) => {
          saveReport(updatedReport);
          setReport(updatedReport);
          setAiLoading(false);
        },
        groqApiKey || undefined,
      ).catch((enrichError) => {
        console.error("[dashboard] enrich:", enrichError);
        setAiLoading(false);
        notify(
          "Erro ao processar insights da IA. Verifique sua GROQ_API_KEY.",
          "err",
        );
      });
    },
    [notify],
  );

  /* carrega relatório na alteração de montagem/parâmetro */
  useEffect(() => {
    const id = searchParams.get("id");
    let loadedReport: ReportData | null = id ? getReportById(id) : null;
    if (!loadedReport) loadedReport = getReports()[0] ?? null;
    if (!loadedReport) return;

    setReport(loadedReport);
    if (!loadedReport.aiAnalysis) enrich(loadedReport);
  }, [searchParams, enrich]);

  /* upload */
  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);

      try {
        const parsedReport = await parseFileSync(file, file.name);

        saveReport(parsedReport);
        setReport(parsedReport);

        router.push(`/dashboard?id=${parsedReport.id}`);

        enrich(parsedReport);
      } catch (uploadError: any) {
        notify(uploadError?.message ?? "Erro ao processar arquivo.", "err");
      } finally {
        setUploading(false);
      }
    }, [router, enrich, notify],
  );

  const handleRename = useCallback(
    (name: string) => {
      if (!report) return;
      renameReport(report.id, name);
      setReport((prev) => (prev ? { ...prev, name } : prev));
      setRename(false);
      notify("Renomeado.", "ok");
    }, [report, notify],
  );

  const handlePdf = useCallback(async () => {
    if (!report) return;
    const pdfFileName = `${report.name.replace(/[\s/\\:*?"<>|]/g, "-")}.pdf`;
    await exportPdf("pdf-export", pdfFileName);
  }, [report, exportPdf]);

  const cards = useMemo(() => {
    if (!report) return [];
    const { metrics } = report;
    return [
      {
        label: "Faturamento",
        value: fmtShort(metrics.faturamento),
        delta: pctDelta(metrics.faturamento, metrics.faturamentoAnterior),
        positive: metrics.faturamento >= metrics.faturamentoAnterior,
      },
      {
        label: "Ticket Médio",
        value: fmtShort(metrics.ticketMedio),
        delta: pctDelta(metrics.ticketMedio, metrics.ticketAnterior),
        positive: metrics.ticketMedio >= metrics.ticketAnterior,
      },
      {
        label: "Transações",
        value: metrics.clientesAtivos.toLocaleString("pt-BR"),
        delta: pctDelta(metrics.clientesAtivos, metrics.clientesAnterior),
        positive: metrics.clientesAtivos >= metrics.clientesAnterior,
      },
      {
        label: "Margem",
        value: `${metrics.margemLucro}%`,
        delta: pctDelta(metrics.margemLucro, metrics.margemAnterior),
        positive: metrics.margemLucro >= metrics.margemAnterior,
      },
    ];
  }, [report]);

  /* se estiver vazio */
  if (!report) {
    return (
      <div
        className="min-h-dvh flex flex-col"
        style={{ background: "var(--bg)" }}
      >
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{ background: "var(--accent-dim)" }}
          >
            <BarChart2 size={24} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <p
              className="font-semibold text-sm mb-1"
              style={{ color: "var(--ink)" }}
            >
              Nenhum relatório encontrado
            </p>
            <p className="text-xs" style={{ color: "var(--ink-3)" }}>
              Faça upload de uma planilha para começar
            </p>
          </div>
          <Link href="/" className="btn-primary">
            Fazer upload
          </Link>
        </div>
      </div>
    );
  }

  const {
    evolucaoFaturamento: evolution,
    despesasPorCategoria: despesas,
    insights,
    topProdutos,
    aiAnalysis,
  } = report;

  return (
    <div className="min-h-dvh" style={{ background: "var(--bg)" }}>
      <Navbar />

      <main className="max-w-5xl mx-auto px-3 sm:px-5 lg:px-6 py-4 sm:py-6 pb-24 space-y-4">
        {/* header */}
        <div className="flex flex-col gap-3 fade-in sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1
                className="font-bold text-base sm:text-lg truncate max-w-[min(420px,calc(100vw-6rem))]"
                style={{ color: "var(--ink)", letterSpacing: "-0.02em" }}
              >
                {report.name}
              </h1>
              <button
                className="btn-icon w-7 h-7 shrink-0"
                onClick={() => setRename(true)}
                title="Renomear"
              >
                <Pencil size={12} />
              </button>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>
              {report.fileName} ·{" "}
              {new Date(report.createdAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              className="btn-secondary"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Spinner /> : <Upload size={13} />}
              <span>{uploading ? "Processando…" : "Upload"}</span>
            </button>

            <button
              className="btn-primary"
              onClick={handlePdf}
              disabled={exporting}
            >
              {exporting ? (
                <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <Download size={13} />
              )}
              <span>{exporting ? "Gerando…" : "PDF"}</span>
            </button>

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(fileEvent) => {
                const selectedFile = fileEvent.target.files?.[0];
                if (selectedFile) handleUpload(selectedFile);
                fileEvent.target.value = "";
              }}
            />
          </div>
        </div>

        {/* "analise da IA" */}
        {(aiAnalysis || aiLoading) && (
          <div className="card card-accent fade-in flex items-start gap-3">
            <Lightbulb
              size={15}
              style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <p
                  className="text-xs font-semibold"
                  style={{ color: "var(--accent)" }}
                >
                  Análise da IA
                </p>
                {aiLoading && <Spinner />}
              </div>
              {aiLoading && !aiAnalysis ? (
                <div className="space-y-2">
                  <div
                    className="skeleton h-2.5 rounded"
                    style={{ width: "84%" }}
                  />
                  <div
                    className="skeleton h-2.5 rounded"
                    style={{ width: "60%" }}
                  />
                </div>
              ) : (
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--ink-2)" }}
                >
                  {aiAnalysis}
                </p>
              )}
            </div>
          </div>
        )}

        {/* metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map((card, index) => (
            <MetricCard key={card.label} {...card} delay={(index + 2) * 50} />
          ))}
        </div>

        {/* grafico de receita + top categorias */}
        <div
          className={`grid gap-3 ${topProdutos?.length ? "lg:grid-cols-3" : "grid-cols-1"}`}
        >
          <div
            className={`card fade-in ${topProdutos?.length ? "lg:col-span-2" : ""}`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="section-title mb-0">Evolução do Faturamento</p>
              <span className="text-xs" style={{ color: "var(--ink-3)" }}>
                {evolution.length} períodos
              </span>
            </div>
            <ResponsiveContainer width="100%" height={175}>
              <LineChart
                data={evolution}
                margin={{ top: 4, right: 4, left: -6, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 10, fill: "var(--ink-3)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--ink-3)" }}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                  tickFormatter={(tickValue: number) =>
                    tickValue >= 1000
                      ? `${(tickValue / 1000).toFixed(0)}k`
                      : String(tickValue)
                  }
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="valor"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--accent)", strokeWidth: 0 }}
                  activeDot={{
                    r: 5,
                    fill: "var(--accent)",
                    stroke: "var(--bg-card)",
                    strokeWidth: 2,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {topProdutos && topProdutos.length > 0 && (
            <div className="card fade-in">
              <p className="section-title">Top Categorias</p>
              
              <ResponsiveContainer width="100%" height={175}>
                <BarChart
                  data={topProdutos}
                  layout="vertical"
                  margin={{ top: 0, right: 4, left: -6, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    tick={{ fontSize: 10, fill: "var(--ink-3)" }}
                    axisLine={false}
                    tickLine={false}
                    width={74}
                    tickFormatter={(categoryLabel: string) =>
                      categoryLabel.length > 11
                        ? categoryLabel.slice(0, 11) + "…"
                        : categoryLabel
                    }
                  />
                  <Tooltip
                    formatter={(tickValue: number) => [
                      fmtFull(tickValue),
                      "Valor",
                    ]}
                  />
                  <Bar
                    dataKey="valor"
                    radius={[0, 5, 5, 0]}
                    fill="var(--accent)"
                    opacity={0.85}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── Expenses pie + Insights ────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="card fade-in">
            <p className="section-title">Despesas por Categoria</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={despesas}
                  dataKey="valor"
                  nameKey="nome"
                  cx="50%"
                  cy="50%"
                  outerRadius={68}
                  innerRadius={30}
                  paddingAngle={2}
                >
                  {despesas.map((category, index) => (
                    <Cell key={index} fill={category.cor} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(percentage) => [`${percentage}%`, "Part."]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2">
              {despesas.map((category, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 text-xs min-w-0"
                >
                  <span
                    className="w-2 h-2 rounded-sm shrink-0"
                    style={{ background: category.cor }}
                  />
                  <span className="truncate" style={{ color: "var(--ink-2)" }}>
                    {category.nome}
                  </span>
                  <span
                    className="ml-auto font-semibold shrink-0"
                    style={{ color: "var(--ink)" }}
                  >
                    {category.valor}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card fade-in">
            <div className="flex items-center gap-2 mb-3">
              <p className="section-title mb-0">Insights da IA</p>
              {aiLoading && <Spinner />}
            </div>

            {aiLoading && !insights.length ? (
              <div className="space-y-2.5">
                {[82, 68, 74].map((skeletonWidth, index) => (
                  <div
                    key={index}
                    className="rounded-xl p-3"
                    style={{ background: "var(--bg-2)" }}
                  >
                    <div
                      className="skeleton h-2 mb-2 rounded"
                      style={{ width: `${skeletonWidth}%` }}
                    />
                    <div
                      className="skeleton h-2 rounded"
                      style={{ width: "92%" }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="space-y-2.5 overflow-y-auto"
                style={{ maxHeight: 310 }}
              >
                {insights.map((insight, index) => (
                  <InsightCard
                    key={`${insight.titulo}-${index}`}
                    insight={insight}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Quick actions ──────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(
            [
              {
                Icon: Download,
                title: "Exportar PDF",
                desc: "Baixar relatório completo",
                action: handlePdf,
                busy: exporting,
                label: exporting ? "Gerando…" : "PDF",
              },
              {
                Icon: Upload,
                title: "Nova análise",
                desc: "Upload de outra planilha",
                action: () => fileRef.current?.click(),
                busy: uploading,
                label: uploading ? "Processando…" : "Upload",
              },
            ] as const
          ).map(({ Icon, title, desc, action, busy, label }) => (
            <button
              key={title}
              onClick={action}
              disabled={busy}
              className="card flex items-center gap-4 text-left w-full transition-colors"
              style={{ cursor: busy ? "not-allowed" : "pointer" }}
              onMouseEnter={(mouseEvent) =>
                !busy &&
                (mouseEvent.currentTarget.style.borderColor = "var(--border-2)")
              }
              onMouseLeave={(mouseEvent) =>
                (mouseEvent.currentTarget.style.borderColor = "var(--border)")
              }
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "var(--accent-dim)" }}
              >
                <Icon size={18} style={{ color: "var(--accent)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--ink)" }}
                >
                  {title}
                </p>
                <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                  {desc}
                </p>
              </div>
              <span
                className="pill shrink-0 font-medium"
                style={{
                  background: "var(--accent-dim)",
                  color: "var(--accent)",
                }}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      </main>

      {rename && (
        <RenameModal
          current={report.name}
          onConfirm={handleRename}
          onClose={() => setRename(false)}
        />
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* PdfTemplate sempre no DOM — nunca condicional, senão getElementById falha */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: -1,
          pointerEvents: "none",
          opacity: 0,
        }}
      >
        <PdfTemplate report={report} id="pdf-export" />
      </div>
    </div>
  );
}
