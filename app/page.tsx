"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Upload,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { parseFileSync } from "../lib/parser";
import { saveReport } from "../lib/storage";

export default function HomePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const process = useCallback(
    async (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!["xlsx", "xls", "csv"].includes(ext)) {
        setError("Formato não suportado. Use .xlsx, .xls ou .csv");
        return;
      }
      setError("");
      setLoading(true);
      try {
        const r = await parseFileSync(file, file.name);
        saveReport(r);
        router.push(`/dashboard?id=${r.id}`);
      } catch (e: any) {
        setError(e?.message ?? "Erro ao processar o arquivo.");
        setLoading(false);
      }
    },
    [router],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) process(f);
    },
    [process],
  );

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: "var(--bg)" }}
    >
      {/* hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:py-14">
        <div className="text-center mb-8 max-w-md fade-in">
          <h1
            className="text-2xl sm:text-3xl font-bold mb-3"
            style={{
              color: "var(--ink)",
              letterSpacing: "-0.025em",
              lineHeight: 1.25,
            }}
          >
            Convertemos planilhas confusas
            <span style={{ color: "var(--accent)" }}> em decisões</span>
          </h1>
          <p
            className="text-sm sm:text-base leading-relaxed"
            style={{ color: "var(--ink-3)" }}
          >
            Upload de Excel ou CSV → dashboard com IA, gráficos e recomendações.
          </p>
        </div>

        {/* drop zone */}
        <div
          className="w-full max-w-sm rounded-2xl cursor-pointer transition-all fade-in delay-1"
          style={{
            border: `2px dashed ${dragging ? "var(--accent)" : "var(--border-2)"}`,
            background: dragging ? "var(--accent-dim)" : "var(--bg-card)",
            boxShadow: dragging
              ? "0 0 28px var(--accent-glow)"
              : "var(--shadow)",
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !loading && fileRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-4 py-10 px-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all"
              style={{
                background: "var(--accent-dim)",
                boxShadow:
                  loading || dragging ? "0 0 20px var(--accent-glow)" : "none",
              }}
            >
              {loading ? (
                <span
                  className="w-6 h-6 rounded-full border-2 animate-spin"
                  style={{
                    borderColor: "var(--accent-dim)",
                    borderTopColor: "var(--accent)",
                  }}
                />
              ) : (
                <Upload size={22} style={{ color: "var(--accent)" }} />
              )}
            </div>

            {loading ? (
              <p
                className="text-sm font-medium"
                style={{ color: "var(--accent)" }}
              >
                Processando planilha…
              </p>
            ) : (
              <>
                <div className="text-center">
                  <p
                    className="text-sm font-semibold mb-1"
                    style={{ color: "var(--ink)" }}
                  >
                    Arraste o arquivo aqui
                  </p>
                  <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                    ou clique para selecionar
                  </p>
                </div>
                <button type="button" className="btn-primary px-6 text-sm">
                  Selecionar arquivo
                </button>
              </>
            )}
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) process(file);
          }}
        />

        {error && (
          <p
            className="mt-3 text-xs text-center px-4"
            style={{ color: "var(--red)" }}
          >
            {error}
          </p>
        )}

        {/* formatos de arquivo */}
        <div
          className="flex items-center gap-4 mt-5 text-xs fade-in delay-2"
          style={{ color: "var(--ink-3)" }}
        >
        <span className="flex items-center gap-1">
            <FileSpreadsheet size={12} />
            .xlsx
          </span>

          <span className="flex items-center gap-1">
            <FileSpreadsheet size={12} />
            .xls
          </span>

          <span className="flex items-center gap-1">
            <FileSpreadsheet size={12} />
            .csv
          </span>
        </div>
      </main>
    </div>
  );
}
