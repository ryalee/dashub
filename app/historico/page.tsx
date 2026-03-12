"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Clock, 
  Download, 
  SortAsc, 
  CalendarDays, 
  FileText,
  Search, 
  Trash2, 
  Pencil, 
  Check, 
  X, 
  BarChart2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import PdfTemplate from "@/components/PdfTemplate";
import { getReports, deleteReport, renameReport } from "@/lib/storage";
import { usePdfExport } from "@/lib/usePdfExport";
import type { ReportData } from "@/lib/types";

export default function HistoricoPage() {
  const router = useRouter();
  const [reports, setReports]     = useState<ReportData[]>([]);
  const [sort, setSort]           = useState<"data"|"nome">("data");
  const [searchQuery, setSearchQuery] = useState("");
  const [exportingId, setExportingId] = useState<string|null>(null);
  const [renamingId, setRenamingId]   = useState<string|null>(null);
  const [renameVal, setRenameVal]     = useState("");
  const { exportPdf } = usePdfExport();

  useEffect(() => { 
    setReports(getReports()); 
  }, []);

  const filtered = reports
    .filter(report =>
      report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.fileName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((itemA, itemB) =>
      sort === "data"
        ? new Date(itemB.createdAt).getTime() - new Date(itemA.createdAt).getTime()
        : itemA.name.localeCompare(itemB.name)
    );

  const fmtDate = (iso: string) => {
    const parsedDate = new Date(iso);
    return parsedDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
      + " · " + parsedDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const handleExport = useCallback(async (mouseEvent: React.MouseEvent, reportItem: ReportData) => {
    mouseEvent.stopPropagation();

    setExportingId(reportItem.id);

    await new Promise(res => setTimeout(res, 80));
    await exportPdf(`pdf-h-${reportItem.id}`, `${reportItem.name.replace(/[\s/\\]/g, "-")}.pdf`);

    setExportingId(null);
  }, [exportPdf]);

  const handleDelete = useCallback((mouseEvent: React.MouseEvent, id: string) => {
    mouseEvent.stopPropagation();
    if (confirm("Remover este relatório?")) {
      deleteReport(id);
      setReports(getReports());
    }
  }, []);

  const startRename = useCallback((mouseEvent: React.MouseEvent, reportItem: ReportData) => {
    mouseEvent.stopPropagation();
    setRenamingId(reportItem.id);
    setRenameVal(reportItem.name);
  }, []);

  const confirmRename = useCallback((mouseEvent: React.MouseEvent, id: string) => {
    mouseEvent.stopPropagation();
    const trimmedName = renameVal.trim();

    if (trimmedName) { 
      renameReport(id, trimmedName); 
      setReports(getReports()); 
    }

    setRenamingId(null);
  }, [renameVal]);

  const cancelRename = useCallback((mouseEvent: React.MouseEvent) => {
    mouseEvent.stopPropagation(); setRenamingId(null);
  }, []);

  return (
    <div className="min-h-dvh" style={{ background: "var(--bg)" }}>
      <Navbar />
      <main className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-16 space-y-4">

        {/* header */}
        <div className="fade-in">
          <h1 className="font-bold text-base sm:text-lg" style={{ color: "var(--ink)", letterSpacing: "-0.02em" }}>
            Histórico
          </h1>

          <p className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>
            {reports.length} relatório{reports.length !== 1 ? "s" : ""} salvos
          </p>
        </div>

        {/* busca + filtro */}
        <div className="flex flex-col xs:flex-row gap-2 fade-in delay-1">
          <label 
            className="flex flex-1 items-center gap-2 px-3 py-2 rounded-lg min-w-0"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <Search size={13} style={{ color: "var(--ink-3)", flexShrink: 0 }} />

            <input 
              value={searchQuery} 
              onChange={inputEvent => setSearchQuery(inputEvent.target.value)} 
              placeholder="Buscar…"
              className="flex-1 bg-transparent outline-none text-sm min-w-0"
              style={{ color: "var(--ink)", fontFamily: "inherit" }} 
            />

            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{ color: "var(--ink-3)" }}>
                <X size={13} />
              </button>
            )}
          </label>
          <div className="flex gap-1.5 shrink-0">
            {(["data", "nome"] as const).map(sortOption => (
              <button key={sortOption} onClick={() => setSort(sortOption)}
                className={`flex-1 xs:flex-none flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all
                  ${sort === sortOption ? "btn-primary" : "btn-secondary"}`}>
                {sortOption === "data" ? <CalendarDays size={12} /> : <SortAsc size={12} />}
                {sortOption === "data" ? "Data" : "Nome"}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="card text-center py-14 fade-in delay-1">
              <BarChart2 size={28} style={{ color: "var(--ink-4)", margin: "0 auto 10px" }} />
              <p className="text-sm font-medium" style={{ color: "var(--ink-2)" }}>
                {searchQuery ? "Nenhum resultado" : "Nenhum relatório ainda"}
              </p>
              {!searchQuery && (
                <button onClick={() => router.push("/")} className="btn-primary text-xs mt-4 mx-auto">
                  Fazer upload
                </button>
              )}
            </div>
          )}

          {filtered.map((reportItem, index) => (
            <div key={reportItem.id}>
              <div
                className="card transition-colors cursor-pointer fade-in"
                style={{ animationDelay: `${index * 40 + 60}ms` }}
                onClick={() => renamingId !== reportItem.id && router.push(`/dashboard?id=${reportItem.id}`)}
                onMouseEnter={mouseEvent => (mouseEvent.currentTarget.style.borderColor = "var(--border-2)")}
                onMouseLeave={mouseEvent => (mouseEvent.currentTarget.style.borderColor = "var(--border)")}
              >
                <div className="flex items-center gap-3">
                  <FileText size={15} style={{ color: "var(--ink-3)", flexShrink: 0 }} />

                  {/* Name — inline edit */}
                  <div className="flex-1 min-w-0">
                    {renamingId === reportItem.id ? (
                      <div className="flex items-center gap-1.5" onClick={mouseEvent => mouseEvent.stopPropagation()}>
                        <input autoFocus className="input text-sm py-1 px-2 flex-1 min-w-0"
                          value={renameVal} onChange={inputEvent => setRenameVal(inputEvent.target.value)}
                          onKeyDown={keyEvent => {
                            if (keyEvent.key === "Enter")  confirmRename(keyEvent as any, reportItem.id);
                            if (keyEvent.key === "Escape") cancelRename(keyEvent as any);
                          }} />
                        <button onClick={mouseEvent => confirmRename(mouseEvent, reportItem.id)} className="btn-icon w-7 h-7"
                          style={{ color: "var(--green)", background: "var(--green-dim)" }}>
                          <Check size={13} />
                        </button>
                        <button onClick={cancelRename} className="btn-icon w-7 h-7">
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm font-medium truncate" style={{ color: "var(--ink)" }}>{reportItem.name}</p>
                    )}
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock size={10} style={{ color: "var(--ink-4)", flexShrink: 0 }} />
                      <p className="text-xs truncate" style={{ color: "var(--ink-3)" }}>{fmtDate(reportItem.createdAt)}</p>
                    </div>
                  </div>

                  {/* ações */}
                  {renamingId !== reportItem.id && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button className="btn-icon w-7 h-7" onClick={mouseEvent => startRename(mouseEvent, reportItem)} title="Renomear">
                        <Pencil size={13} />
                      </button>

                      <button
                        onClick={mouseEvent => handleExport(mouseEvent, reportItem)} disabled={exportingId === reportItem.id}
                        className="btn-primary text-xs py-1 px-2 disabled:opacity-40">
                        {exportingId === reportItem.id
                          ? <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          : <Download size={12} />
                        }

                        <span className="hidden sm:inline">{exportingId === reportItem.id ? "…" : "PDF"}</span>
                      </button>

                      <button 
                        className="btn-icon w-7 h-7" 
                        onClick={mouseEvent => handleDelete(mouseEvent, reportItem.id)} 
                        title="Remover"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* template pdf oculto */}
              <div aria-hidden style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -1, pointerEvents: "none" }}>
                <PdfTemplate report={reportItem} id={`pdf-h-${reportItem.id}`} />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
