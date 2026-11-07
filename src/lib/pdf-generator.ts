import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatDateID, formatRupiah, terbilangRupiah } from "@/lib/formatters";
import type { CompanyProfileRow } from "@/types/database.types";

export interface PdfKeyValue {
  label: string;
  value: string;
}

export interface PdfTableColumn {
  header: string;
  widthRatio: number;
  align?: "left" | "right";
}

export interface PdfDocumentSpec {
  docTitle: string;
  docSubtitle?: string;
  docNumber: string;
  docDate: string;
  company: CompanyProfileRow;
  recipientTitle?: string;
  recipientLines?: string[];
  metaRows?: PdfKeyValue[];
  paragraphsBefore?: string[];
  tableColumns?: PdfTableColumn[];
  tableRows?: string[][];
  summaryRows?: PdfKeyValue[];
  terbilangAmount?: number;
  notes?: string[];
  leftSignatureLabel?: string;
  leftSignatureName?: string;
  rightSignatureLabel?: string;
  rightSignatureName?: string;
}

function sanitizePdfText(text: string): string {
  // StandardFonts Helvetica menggunakan WinAnsiEncoding; normalkan karakter Unicode non-WinAnsi
  return text
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2265/g, ">=")
    .replace(/\u2264/g, "<=")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
}

function wrapText(
  text: string,
  maxChars: number,
): string[] {
  const clean = sanitizePdfText(text);
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = words[0]!;
  for (let i = 1; i < words.length; i++) {
    const word = words[i]!;
    if ((current + " " + word).length <= maxChars) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);
  return lines;
}

/**
 * Menghasilkan berkas PDF A4 Bahasa Indonesia berstandar Kop Resmi Altvira (Lampiran A.0–A.8).
 */
export async function generateDocumentPdf(
  spec: PdfDocumentSpec,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const marginX = 44;
  const contentWidth = pageWidth - marginX * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - 44;

  const ensureSpace = (needed: number) => {
    if (y - needed < 56) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - 44;
    }
  };

  // 1. Kop Perusahaan (Lampiran A.0)
  page.drawText(sanitizePdfText(spec.company.company_name.toUpperCase()), {
    x: marginX,
    y,
    size: 14,
    font: fontBold,
    color: rgb(0.08, 0.14, 0.28),
  });
  y -= 14;

  page.drawText(sanitizePdfText(spec.company.legal_entity_name), {
    x: marginX,
    y,
    size: 9.5,
    font: fontBold,
    color: rgb(0.25, 0.28, 0.34),
  });
  y -= 12;

  page.drawText(
    sanitizePdfText(
      `${spec.company.address} | Email: ${spec.company.email} | Telp: ${spec.company.phone}`,
    ),
    {
      x: marginX,
      y,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.35, 0.38, 0.42),
    },
  );
  y -= 10;

  page.drawLine({
    start: { x: marginX, y },
    end: { x: pageWidth - marginX, y },
    thickness: 1.2,
    color: rgb(0.12, 0.2, 0.38),
  });
  y -= 20;

  // 2. Judul Dokumen & Nomor
  page.drawText(sanitizePdfText(spec.docTitle.toUpperCase()), {
    x: marginX,
    y,
    size: 13,
    font: fontBold,
    color: rgb(0.08, 0.1, 0.14),
  });
  const dateText = `Tanggal: ${formatDateID(spec.docDate)}`;
  const dateWidth = fontRegular.widthOfTextAtSize(dateText, 9.5);
  page.drawText(dateText, {
    x: pageWidth - marginX - dateWidth,
    y,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.25, 0.28, 0.32),
  });
  y -= 14;

  page.drawText(sanitizePdfText(`Nomor Dokumen: ${spec.docNumber}`), {
    x: marginX,
    y,
    size: 9.5,
    font: fontBold,
    color: rgb(0.2, 0.25, 0.35),
  });
  if (spec.docSubtitle) {
    const subClean = sanitizePdfText(spec.docSubtitle);
    const subW = fontRegular.widthOfTextAtSize(subClean, 9);
    page.drawText(subClean, {
      x: pageWidth - marginX - subW,
      y,
      size: 9,
      font: fontRegular,
      color: rgb(0.35, 0.38, 0.42),
    });
  }
  y -= 18;

  // 3. Tujuan / Identitas Pihak Kedua & Metadata
  if (spec.recipientLines && spec.recipientLines.length > 0) {
    ensureSpace(16 + spec.recipientLines.length * 12);
    page.drawText(sanitizePdfText(spec.recipientTitle ?? "Kepada Yth.:"), {
      x: marginX,
      y,
      size: 9,
      font: fontBold,
      color: rgb(0.2, 0.22, 0.26),
    });
    y -= 12;
    for (const rLine of spec.recipientLines) {
      page.drawText(sanitizePdfText(rLine), {
        x: marginX,
        y,
        size: 9,
        font: fontRegular,
        color: rgb(0.15, 0.17, 0.2),
      });
      y -= 12;
    }
    y -= 6;
  }

  if (spec.metaRows && spec.metaRows.length > 0) {
    for (const meta of spec.metaRows) {
      ensureSpace(14);
      page.drawText(sanitizePdfText(`${meta.label}:`), {
        x: marginX,
        y,
        size: 9,
        font: fontBold,
        color: rgb(0.22, 0.24, 0.28),
      });
      page.drawText(sanitizePdfText(meta.value), {
        x: marginX + 145,
        y,
        size: 9,
        font: fontRegular,
        color: rgb(0.12, 0.14, 0.18),
      });
      y -= 13;
    }
    y -= 6;
  }

  // 4. Paragraf Pembuka / Klausul (mis. SPK / SoW)
  if (spec.paragraphsBefore && spec.paragraphsBefore.length > 0) {
    for (const para of spec.paragraphsBefore) {
      const wrapped = wrapText(para, 92);
      ensureSpace(wrapped.length * 12 + 6);
      for (const line of wrapped) {
        page.drawText(line, {
          x: marginX,
          y,
          size: 9,
          font: fontRegular,
          color: rgb(0.15, 0.17, 0.2),
        });
        y -= 12;
      }
      y -= 4;
    }
  }

  // 5. Tabel Rincian Item
  if (
    spec.tableColumns &&
    spec.tableColumns.length > 0 &&
    spec.tableRows &&
    spec.tableRows.length > 0
  ) {
    const cols = spec.tableColumns;
    const totalRatio = cols.reduce((s, c) => s + c.widthRatio, 0) || 1;
    const colWidths = cols.map((c) => (c.widthRatio / totalRatio) * contentWidth);

    ensureSpace(24);
    page.drawRectangle({
      x: marginX,
      y: y - 5,
      width: contentWidth,
      height: 18,
      color: rgb(0.92, 0.94, 0.97),
    });

    let colX = marginX;
    cols.forEach((col, idx) => {
      const w = colWidths[idx]!;
      const headerClean = sanitizePdfText(col.header);
      const textW = fontBold.widthOfTextAtSize(headerClean, 8.5);
      const drawX =
        col.align === "right" ? colX + w - textW - 6 : colX + 6;
      page.drawText(headerClean, {
        x: drawX,
        y,
        size: 8.5,
        font: fontBold,
        color: rgb(0.1, 0.14, 0.22),
      });
      colX += w;
    });
    y -= 18;

    for (const row of spec.tableRows) {
      ensureSpace(18);
      let cellX = marginX;
      cols.forEach((col, idx) => {
        const w = colWidths[idx]!;
        const rawVal = sanitizePdfText(row[idx] ?? "");
        const maxChars = Math.max(8, Math.floor(w / 4.8));
        const clipped =
          rawVal.length > maxChars ? `${rawVal.slice(0, maxChars - 2)}..` : rawVal;
        const textW = fontRegular.widthOfTextAtSize(clipped, 8.5);
        const drawX =
          col.align === "right" ? cellX + w - textW - 6 : cellX + 6;
        page.drawText(clipped, {
          x: drawX,
          y,
          size: 8.5,
          font: fontRegular,
          color: rgb(0.14, 0.16, 0.2),
        });
        cellX += w;
      });
      page.drawLine({
        start: { x: marginX, y: y - 4 },
        end: { x: pageWidth - marginX, y: y - 4 },
        thickness: 0.4,
        color: rgb(0.82, 0.85, 0.88),
      });
      y -= 16;
    }
    y -= 6;
  }

  // 6. Ringkasan Nilai & Terbilang
  if (spec.summaryRows && spec.summaryRows.length > 0) {
    for (const sumRow of spec.summaryRows) {
      ensureSpace(15);
      const labelClean = sanitizePdfText(sumRow.label);
      const valClean = sanitizePdfText(sumRow.value);
      const valW = fontBold.widthOfTextAtSize(valClean, 9.5);
      page.drawText(labelClean, {
        x: pageWidth - marginX - 230,
        y,
        size: 9,
        font: fontBold,
        color: rgb(0.2, 0.22, 0.26),
      });
      page.drawText(valClean, {
        x: pageWidth - marginX - valW,
        y,
        size: 9.5,
        font: fontBold,
        color: rgb(0.08, 0.12, 0.22),
      });
      y -= 14;
    }
    y -= 4;
  }

  if (typeof spec.terbilangAmount === "number") {
    ensureSpace(22);
    const terbilangText = `Terbilang: # ${terbilangRupiah(spec.terbilangAmount)} #`;
    const wrapped = wrapText(terbilangText, 88);
    for (const line of wrapped) {
      page.drawText(line, {
        x: marginX,
        y,
        size: 9,
        font: fontBold,
        color: rgb(0.14, 0.22, 0.36),
      });
      y -= 13;
    }
    y -= 4;
  }

  // 7. Catatan Ketentuan / Non-PKP / Rekening Tujuan
  if (spec.notes && spec.notes.length > 0) {
    ensureSpace(16 + spec.notes.length * 13);
    page.drawText("Catatan & Ketentuan:", {
      x: marginX,
      y,
      size: 9,
      font: fontBold,
      color: rgb(0.2, 0.22, 0.26),
    });
    y -= 12;
    for (const note of spec.notes) {
      const wrapped = wrapText(`- ${note}`, 92);
      for (const l of wrapped) {
        ensureSpace(12);
        page.drawText(l, {
          x: marginX,
          y,
          size: 8.5,
          font: fontRegular,
          color: rgb(0.28, 0.3, 0.34),
        });
        y -= 11;
      }
    }
    y -= 10;
  }

  // 8. Blok Tanda Tangan Basah / Manual (Lampiran A.0)
  if (spec.rightSignatureName || spec.leftSignatureName) {
    ensureSpace(85);
    y -= 8;
    if (spec.leftSignatureName) {
      page.drawText(sanitizePdfText(spec.leftSignatureLabel ?? "Pihak Klien,"), {
        x: marginX,
        y,
        size: 9,
        font: fontRegular,
      });
      page.drawText(sanitizePdfText(`(${spec.leftSignatureName})`), {
        x: marginX,
        y: y - 52,
        size: 9,
        font: fontBold,
      });
    }

    const rightX = pageWidth - marginX - 180;
    page.drawText(
      sanitizePdfText(
        spec.rightSignatureLabel ?? `Hormat kami, ${spec.company.company_name}`,
      ),
      {
        x: rightX,
        y,
        size: 9,
        font: fontRegular,
      },
    );
    page.drawText(
      sanitizePdfText(
        `(${spec.rightSignatureName ?? `${spec.company.signer_name} - ${spec.company.signer_title}`})`,
      ),
      {
        x: rightX,
        y: y - 52,
        size: 9,
        font: fontBold,
      },
    );
  }

  return pdfDoc.save();
}

/**
 * Mengunduh byte PDF langsung di peramban pengguna.
 */
export function downloadPdfBytes(bytes: Uint8Array, fileName: string): void {
  const safeBytes = new Uint8Array(bytes.byteLength);
  safeBytes.set(bytes);
  const blob = new Blob([safeBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Helper pembuat spesifikasi PDF Invoice Penagihan sesuai PRD Lampiran A.5 (termasuk status non-PKP).
 */
export function buildInvoicePdfSpec(params: {
  company: CompanyProfileRow;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  customerName: string;
  customerAddress: string;
  projectName: string;
  clientPoNumber: string;
  description: string;
  subtotal: number;
  ppnAmount: number;
  totalAmount: number;
}): PdfDocumentSpec {
  const nonPkpNote = params.company.pkp_enabled
    ? `PPN (${params.company.ppn_rate}%) telah diperhitungkan sebesar ${formatRupiah(params.ppnAmount)}.`
    : "Harga tidak dikenakan PPN karena Altvira Technology (PT Representasi Mitra Mandiri) belum dikukuhkan sebagai Pengusaha Kena Pajak (Non-PKP).";

  return {
    docTitle: "INVOICE PENAGIHAN",
    docSubtitle: `Jatuh Tempo: ${formatDateID(params.dueDate)}`,
    docNumber: params.invoiceNumber,
    docDate: params.invoiceDate,
    company: params.company,
    recipientTitle: "Ditagihkan Kepada:",
    recipientLines: [params.customerName, params.customerAddress || "-"],
    metaRows: [
      { label: "Proyek", value: params.projectName },
      { label: "Referensi PO Klien", value: params.clientPoNumber },
      { label: "Tanggal Jatuh Tempo", value: formatDateID(params.dueDate) },
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.1 },
      { header: "Uraian Tagihan Termin / Pekerjaan", widthRatio: 0.6 },
      { header: "Jumlah (IDR)", widthRatio: 0.3, align: "right" },
    ],
    tableRows: [["1", params.description, formatRupiah(params.subtotal)]],
    summaryRows: [
      { label: "Subtotal", value: formatRupiah(params.subtotal) },
      ...(params.company.pkp_enabled
        ? [{ label: "PPN", value: formatRupiah(params.ppnAmount) }]
        : []),
      { label: "TOTAL TAGIHAN", value: formatRupiah(params.totalAmount) },
    ],
    terbilangAmount: params.totalAmount,
    notes: [
      nonPkpNote,
      `Pembayaran ditransfer ke ${params.company.bank_name} No. Rek ${params.company.bank_account_number} a.n. ${params.company.bank_account_holder}.`,
      "Mohon cantumkan nomor invoice pada berita transfer pembayaran.",
    ],
    rightSignatureLabel: `Hormat kami, ${params.company.company_name}`,
    rightSignatureName: `${params.company.signer_name} - ${params.company.signer_title}`,
  };
}

/**
 * Helper pembuat spesifikasi PDF Kuitansi Bukti Pembayaran sesuai PRD Lampiran A.6.
 */
export function buildReceiptPdfSpec(params: {
  company: CompanyProfileRow;
  receiptNumber: string;
  receiptDate: string;
  receivedFrom: string;
  invoiceNumber: string;
  projectName: string;
  amount: number;
}): PdfDocumentSpec {
  return {
    docTitle: "KUITANSI BUKTI PEMBAYARAN",
    docNumber: params.receiptNumber,
    docDate: params.receiptDate,
    company: params.company,
    metaRows: [
      { label: "Telah Terima Dari", value: params.receivedFrom },
      { label: "Untuk Pembayaran", value: `Pelunasan / Pembayaran Invoice ${params.invoiceNumber}` },
      { label: "Nama Proyek", value: params.projectName },
      { label: "Jumlah Diterima", value: formatRupiah(params.amount) },
    ],
    terbilangAmount: params.amount,
    notes: [
      "Bea meterai dikenakan sesuai ketentuan peraturan perundang-undangan yang berlaku.",
      "Kuitansi ini sah diterbitkan setelah dana tercatat masuk ke rekening resmi perusahaan.",
    ],
    rightSignatureLabel: `Penerima, ${params.company.company_name}`,
    rightSignatureName: `${params.company.signer_name} - ${params.company.signer_title}`,
  };
}

