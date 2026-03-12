"use client";

import { useState, useCallback } from "react";

/** Aguarda o browser completar paint e layout (dois rAF encadeados) */
function waitForPaint(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

export function usePdfExport() {
  const [exporting, setExporting] = useState(false);

  const exportPdf = useCallback(async (elementId: string, fileName: string) => {
    setExporting(true);
    try {
      const el = document.getElementById(elementId);
      if (!el) throw new Error(`Elemento #${elementId} não encontrado`);

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      // Garante que recharts e imagens terminaram de renderizar
      await waitForPaint();

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: el.offsetWidth,
        height: el.offsetHeight,
        windowWidth: el.offsetWidth,
        windowHeight: el.offsetHeight,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imageData = canvas.toDataURL("image/jpeg", 0.92);
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const totalPages = Math.ceil(imgHeight / pageHeight);

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(
          imageData,
          "JPEG",
          0,
          -(pageIndex * pageHeight),
          imgWidth,
          imgHeight,
        );
      }

      pdf.save(fileName);
    } catch (err) {
      console.error("[usePdfExport] Erro:", err);
    } finally {
      setExporting(false);
    }
  }, []);

  return { exportPdf, exporting };
}
