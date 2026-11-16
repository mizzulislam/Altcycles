let activePdfPrintUrl: string | null = null;

/**
 * Menampilkan pratinjau cetak / Save as PDF bawaan peramban (seperti halaman Siklus Akuntansi & Laporan Keuangan)
 * untuk seluruh dokumen PDF di semua portal sistem Altcycles.
 */
export function downloadPdfBytes(bytes: Uint8Array, fileName: string): void {
  const safeBytes = new Uint8Array(bytes.byteLength);
  safeBytes.set(bytes);
  const blob = new Blob([safeBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  if (activePdfPrintUrl) {
    URL.revokeObjectURL(activePdfPrintUrl);
  }
  activePdfPrintUrl = url;

  const existingFrame = document.getElementById(
    "altcycles-pdf-print-frame",
  ) as HTMLIFrameElement | null;
  if (existingFrame) {
    existingFrame.remove();
  }

  const cleanBaseName = fileName.replace(/\.pdf$/i, "").trim() || "Dokumen_Altcycles";
  const iframe = document.createElement("iframe");
  iframe.id = "altcycles-pdf-print-frame";
  iframe.title = cleanBaseName;
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "2px";
  iframe.style.height = "2px";
  iframe.style.border = "0";
  iframe.style.opacity = "0.01";
  iframe.style.pointerEvents = "none";
  iframe.style.zIndex = "-1";

  iframe.onload = () => {
    setTimeout(() => {
      const previousTitle = document.title;
      document.title = cleanBaseName;

      const restoreTitle = () => {
        document.title = previousTitle;
        window.removeEventListener("focus", restoreTitle);
      };
      window.addEventListener("focus", restoreTitle);

      try {
        const frameWin = iframe.contentWindow;
        if (frameWin) {
          frameWin.focus();
          frameWin.print();
          setTimeout(() => {
            if (document.title === cleanBaseName) {
              document.title = previousTitle;
            }
          }, 1500);
          return;
        }
      } catch {
        // Fallback apabila peramban tidak mengizinkan print dari iframe
      }

      document.title = previousTitle;
      window.removeEventListener("focus", restoreTitle);
      const fallbackWin = window.open(url, "_blank", "noopener,noreferrer");
      if (!fallbackWin) {
        const link = document.createElement("a");
        link.href = url;
        link.download = `${cleanBaseName}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    }, 120);
  };

  iframe.src = url;
  document.body.appendChild(iframe);
}
