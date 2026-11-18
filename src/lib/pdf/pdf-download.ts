/**
 * Mengunduh berkas PDF biner secara langsung (Direct Download / Opsi B) ke perangkat pengguna.
 * Memastikan keaslian berkas biner PDF dan seluruh anotasi tautan interaktif (link medsos, dll.)
 * tetap utuh 100% tanpa di-strip atau di-flatten oleh mesin print driver peramban.
 */
export function downloadPdfBytes(bytes: Uint8Array, fileName: string): void {
  const safeBytes = new Uint8Array(bytes.byteLength);
  safeBytes.set(bytes);
  const blob = new Blob([safeBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const cleanBaseName = fileName.replace(/\.pdf$/i, "").trim() || "Dokumen_Altcycles";
  const finalFileName = `${cleanBaseName}.pdf`;

  const link = document.createElement("a");
  link.href = url;
  link.download = finalFileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 10000);
}
