/**
 * Word Generator Facade (ID: A-08)
 *
 * Menggabungkan dan mengekspor seluruh generator dokumen Microsoft Word (.docx)
 * Altcycles secara modular dan backward-compatible.
 */

export * from "@/lib/docx/docx-styles";
export * from "@/lib/docx/docx-header-footer";
export * from "@/lib/docx/docx-standard-builder";
export * from "@/lib/docx/docx-spk-builder";

/**
 * Mengunduh Blob Microsoft Word (.docx) langsung di peramban pengguna.
 */
export function downloadWordBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".docx") ? fileName : `${fileName}.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
