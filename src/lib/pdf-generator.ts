import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import {
  decodeImageBytes,
  getFooterSocialEntries,
  renderSocialIconPngBytes,
} from "@/lib/asset-utils";
import {
  formatDateID,
  formatRupiah,
  terbilangRupiah,
} from "@/lib/formatters";
import type {
  ClientPoItemJson,
  CompanyProfileRow,
  SpkCharterContent,
} from "@/types/database.types";

export interface PdfKeyValue {
  label: string;
  value: string;
}

export interface PdfTableColumn {
  header: string;
  widthRatio: number;
  align?: "left" | "right" | "center";
}

export interface PdfDocumentSpec {
  docTitle: string;
  docSubtitle?: string;
  docNumber: string;
  docDate: string;
  company: CompanyProfileRow;
  clientLogoUrl?: string | null;
  recipientTitle?: string;
  recipientLines?: string[];
  metaRows?: PdfKeyValue[];
  paragraphsBefore?: string[];
  tableColumns?: PdfTableColumn[];
  tableRows?: string[][];
  summaryRows?: PdfKeyValue[];
  terbilangAmount?: number;
  notes?: string[];
  closingNote?: string;
  leftSignatureLabel?: string;
  leftSignatureName?: string;
  leftSignatureImageUrl?: string | null;
  rightSignatureLabel?: string;
  rightSignatureName?: string;
  rightSignatureImageUrl?: string | null;
}

// Palet warna resmi Altcycles (senada dengan tema biru Altvira #0B43C8)
const BRAND_BLUE = rgb(0.043, 0.263, 0.784);
const BRAND_BLUE_SOFT = rgb(0.937, 0.961, 1.0);
const SLATE_900 = rgb(0.059, 0.09, 0.165);
const SLATE_700 = rgb(0.2, 0.255, 0.333);
const SLATE_500 = rgb(0.392, 0.455, 0.545);
const BORDER_SLATE = rgb(0.82, 0.855, 0.902);
const SURFACE_SUBTLE = rgb(0.973, 0.98, 0.988);

export function sanitizePdfText(text: string): string {
  // StandardFonts Helvetica menggunakan WinAnsiEncoding; normalkan karakter Unicode non-WinAnsi
  return text
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2022/g, "-")
    .replace(/\u2265/g, ">=")
    .replace(/\u2264/g, "<=")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
}

function wrapTextByWidth(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  const clean = sanitizePdfText(text);
  if (!clean.trim()) return [""];
  const rawParagraphs = clean.split(/\r?\n/);
  const result: string[] = [];

  for (const para of rawParagraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      result.push("");
      continue;
    }
    let current = words[0]!;
    for (let i = 1; i < words.length; i++) {
      const candidate = `${current} ${words[i]!}`;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        current = candidate;
      } else {
        result.push(current);
        current = words[i]!;
      }
    }
    result.push(current);
  }
  return result.length > 0 ? result : [""];
}

async function embedOptionalImage(
  pdfDoc: PDFDocument,
  source: string | null | undefined,
): Promise<PDFImage | null> {
  const decoded = await decodeImageBytes(source);
  if (!decoded) return null;
  try {
    return decoded.format === "png"
      ? await pdfDoc.embedPng(decoded.bytes)
      : await pdfDoc.embedJpg(decoded.bytes);
  } catch {
    return null;
  }
}

function fitDimensions(
  img: PDFImage,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
  return {
    width: Math.max(1, img.width * scale),
    height: Math.max(1, img.height * scale),
  };
}

/**
 * Menggambar footer standar seluruh halaman dokumen sistem:
 * garis pemisah tipis + ikon & username sosial media Altvira + nomor halaman.
 */
async function drawSocialMediaFooters(params: {
  pdfDoc: PDFDocument;
  pages: PDFPage[];
  company: CompanyProfileRow;
  fontRegular: PDFFont;
  fontBold: PDFFont;
  marginX: number;
  pageWidth: number;
  parafInfo?: {
    leftImage?: PDFImage | null;
    rightImage?: PDFImage | null;
    leftLabel?: string;
    rightLabel?: string;
  };
}) {
  const {
    pdfDoc,
    pages,
    company,
    fontRegular,
    fontBold,
    marginX,
    pageWidth,
    parafInfo,
  } = params;

  const entries = getFooterSocialEntries(company);
  const embeddedEntries = await Promise.all(
    entries.map(async (entry) => {
      const iconBytes = renderSocialIconPngBytes(entry.platform, "#0B43C8");
      let iconImg: PDFImage | null = null;
      if (iconBytes) {
        try {
          iconImg = await pdfDoc.embedPng(iconBytes);
        } catch {
          iconImg = null;
        }
      }
      return {
        username: sanitizePdfText(entry.username),
        iconImg,
      };
    }),
  );

  const fallbackText = sanitizePdfText(`${company.email}   |   ${company.phone}`);
  const total = pages.length;

  pages.forEach((p, idx) => {
    // Jika SPK menyertakan area paraf per halaman
    if (parafInfo) {
      const parafY = 46;
      p.drawText("Paraf Pihak Pertama:", {
        x: marginX,
        y: parafY,
        size: 7.5,
        font: fontRegular,
        color: SLATE_500,
      });
      if (parafInfo.leftImage) {
        const dims = fitDimensions(parafInfo.leftImage, 44, 22);
        p.drawImage(parafInfo.leftImage, {
          x: marginX + 82,
          y: parafY - 4,
          width: dims.width,
          height: dims.height,
        });
      } else {
        p.drawText("..................", {
          x: marginX + 82,
          y: parafY,
          size: 7.5,
          font: fontRegular,
          color: SLATE_500,
        });
      }

      const midX = pageWidth / 2 + 24;
      p.drawText("Paraf Pihak Kedua:", {
        x: midX,
        y: parafY,
        size: 7.5,
        font: fontRegular,
        color: SLATE_500,
      });
      if (parafInfo.rightImage) {
        const dims = fitDimensions(parafInfo.rightImage, 44, 22);
        p.drawImage(parafInfo.rightImage, {
          x: midX + 76,
          y: parafY - 4,
          width: dims.width,
          height: dims.height,
        });
      } else {
        p.drawText("..................", {
          x: midX + 76,
          y: parafY,
          size: 7.5,
          font: fontRegular,
          color: SLATE_500,
        });
      }
    }

    // Garis pemisah footer sosial media
    p.drawLine({
      start: { x: marginX, y: 34 },
      end: { x: pageWidth - marginX, y: 34 },
      thickness: 0.6,
      color: BORDER_SLATE,
    });

    const brandLabel = sanitizePdfText(company.company_name);
    p.drawText(brandLabel, {
      x: marginX,
      y: 22,
      size: 7.5,
      font: fontBold,
      color: BRAND_BLUE,
    });

    const pageStr = `Hal. ${idx + 1}/${total}`;
    const pageStrW = fontRegular.widthOfTextAtSize(pageStr, 7.5);
    p.drawText(pageStr, {
      x: pageWidth - marginX - pageStrW,
      y: 22,
      size: 7.5,
      font: fontRegular,
      color: SLATE_500,
    });

    // Gambar ikon sosial media + username tanpa teks nama platform di area tengah footer
    const minSocialX = marginX + fontBold.widthOfTextAtSize(brandLabel, 7.5) + 16;
    const maxSocialX = pageWidth - marginX - pageStrW - 14;
    if (embeddedEntries.length > 0) {
      const iconSize = 8.5;
      const itemGap = 11;
      const totalWidth = embeddedEntries.reduce((sum, item, i) => {
        const w =
          (item.iconImg ? iconSize + 3.5 : 0) +
          fontRegular.widthOfTextAtSize(item.username, 7.3);
        return sum + w + (i > 0 ? itemGap : 0);
      }, 0);
      let cursorX = Math.max(
        minSocialX,
        minSocialX + Math.max(0, (maxSocialX - minSocialX - totalWidth) / 2),
      );
      for (const item of embeddedEntries) {
        const itemW =
          (item.iconImg ? iconSize + 3.5 : 0) +
          fontRegular.widthOfTextAtSize(item.username, 7.3);
        if (cursorX + itemW > maxSocialX) break;
        if (item.iconImg) {
          p.drawImage(item.iconImg, {
            x: cursorX,
            y: 20.5,
            width: iconSize,
            height: iconSize,
          });
          cursorX += iconSize + 3.5;
        }
        p.drawText(item.username, {
          x: cursorX,
          y: 22,
          size: 7.3,
          font: fontRegular,
          color: SLATE_500,
        });
        cursorX += fontRegular.widthOfTextAtSize(item.username, 7.3) + itemGap;
      }
    } else {
      const fbW = fontRegular.widthOfTextAtSize(fallbackText, 7.5);
      p.drawText(fallbackText, {
        x: Math.max(minSocialX, (pageWidth - fbW) / 2),
        y: 22,
        size: 7.5,
        font: fontRegular,
        color: SLATE_500,
      });
    }
  });
}

/**
 * Menghasilkan berkas PDF A4 Bahasa Indonesia berstandar Kop Resmi Altvira (Lampiran A.0–A.8).
 * Mendukung Logo Altvira, Logo Klien opsional, TTD gambar, tabel multi-baris, dan Footer 3 Sosial Media.
 */
export async function generateDocumentPdf(
  spec: PdfDocumentSpec,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const [companyLogo, clientLogo, rightSigImg, leftSigImg] = await Promise.all([
    embedOptionalImage(pdfDoc, spec.company.logo_storage_path),
    embedOptionalImage(pdfDoc, spec.clientLogoUrl),
    embedOptionalImage(
      pdfDoc,
      spec.rightSignatureImageUrl !== undefined
        ? spec.rightSignatureImageUrl
        : spec.company.signer_signature_path,
    ),
    embedOptionalImage(pdfDoc, spec.leftSignatureImageUrl),
  ]);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const marginX = 44;
  const contentWidth = pageWidth - marginX * 2;
  const bottomSafeY = 62;

  const pages: PDFPage[] = [];
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  pages.push(page);
  let y = pageHeight - 40;

  const ensureSpace = (needed: number) => {
    if (y - needed < bottomSafeY) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      pages.push(page);
      y = pageHeight - 44;
    }
  };

  // 1. Kop Perusahaan dengan Logo Resmi & Aksen Biru Altvira
  const headerStartY = y;
  let logoOffsetX = marginX;
  let kopMinY = headerStartY - 36;

  if (companyLogo) {
    const dims = fitDimensions(companyLogo, 62, 38);
    page.drawImage(companyLogo, {
      x: marginX,
      y: headerStartY - dims.height + 10,
      width: dims.width,
      height: dims.height,
    });
    logoOffsetX = marginX + dims.width + 12;
    kopMinY = Math.min(kopMinY, headerStartY - dims.height + 6);
  }

  let rightHeaderReserve = 0;
  if (clientLogo) {
    const cDims = fitDimensions(clientLogo, 58, 36);
    page.drawImage(clientLogo, {
      x: pageWidth - marginX - cDims.width,
      y: headerStartY - cDims.height + 10,
      width: cDims.width,
      height: cDims.height,
    });
    rightHeaderReserve = cDims.width + 12;
  }

  page.drawText(sanitizePdfText(spec.company.company_name.toUpperCase()), {
    x: logoOffsetX,
    y: headerStartY,
    size: 13.5,
    font: fontBold,
    color: BRAND_BLUE,
  });

  page.drawText(sanitizePdfText(spec.company.legal_entity_name), {
    x: logoOffsetX,
    y: headerStartY - 13,
    size: 9,
    font: fontBold,
    color: SLATE_700,
  });

  const addrMaxW = contentWidth - (logoOffsetX - marginX) - rightHeaderReserve;
  const addrLines = wrapTextByWidth(
    `${spec.company.address} | Email: ${spec.company.email} | Telp: ${spec.company.phone}`,
    fontRegular,
    8,
    addrMaxW,
  );
  let addrY = headerStartY - 25;
  for (const aLine of addrLines) {
    page.drawText(aLine, {
      x: logoOffsetX,
      y: addrY,
      size: 8,
      font: fontRegular,
      color: SLATE_500,
    });
    addrY -= 10;
  }

  y = Math.min(kopMinY, addrY) - 4;
  page.drawLine({
    start: { x: marginX, y },
    end: { x: pageWidth - marginX, y },
    thickness: 1.5,
    color: BRAND_BLUE,
  });
  y -= 20;

  // 2. Judul Dokumen, Nomor, & Tanggal
  page.drawText(sanitizePdfText(spec.docTitle.toUpperCase()), {
    x: marginX,
    y,
    size: 12.5,
    font: fontBold,
    color: SLATE_900,
  });
  const dateText = sanitizePdfText(`Tanggal: ${formatDateID(spec.docDate)}`);
  const dateWidth = fontRegular.widthOfTextAtSize(dateText, 9);
  page.drawText(dateText, {
    x: pageWidth - marginX - dateWidth,
    y,
    size: 9,
    font: fontRegular,
    color: SLATE_700,
  });
  y -= 14;

  page.drawText(sanitizePdfText(`Nomor Dokumen: ${spec.docNumber}`), {
    x: marginX,
    y,
    size: 9,
    font: fontBold,
    color: BRAND_BLUE,
  });
  if (spec.docSubtitle) {
    const subClean = sanitizePdfText(spec.docSubtitle);
    const subW = fontRegular.widthOfTextAtSize(subClean, 9);
    page.drawText(subClean, {
      x: pageWidth - marginX - subW,
      y,
      size: 9,
      font: fontRegular,
      color: SLATE_500,
    });
  }
  y -= 18;

  // 3. Tujuan / Identitas Pihak Kedua & Metadata
  if (spec.recipientLines && spec.recipientLines.length > 0) {
    ensureSpace(22 + spec.recipientLines.length * 12);
    const boxLines: string[] = [];
    for (const rLine of spec.recipientLines) {
      boxLines.push(...wrapTextByWidth(rLine, fontRegular, 8.8, contentWidth - 20));
    }
    const boxHeight = 20 + boxLines.length * 11.5;
    page.drawRectangle({
      x: marginX,
      y: y - boxHeight + 10,
      width: contentWidth,
      height: boxHeight,
      color: SURFACE_SUBTLE,
      borderColor: BORDER_SLATE,
      borderWidth: 0.7,
    });

    page.drawText(sanitizePdfText(spec.recipientTitle ?? "Kepada Yth.:"), {
      x: marginX + 10,
      y: y - 4,
      size: 8.5,
      font: fontBold,
      color: BRAND_BLUE,
    });
    let rY = y - 16;
    boxLines.forEach((bLine, i) => {
      page.drawText(bLine, {
        x: marginX + 10,
        y: rY,
        size: 8.8,
        font: i === 0 ? fontBold : fontRegular,
        color: SLATE_900,
      });
      rY -= 11.5;
    });
    y = y - boxHeight - 4;
  }

  if (spec.metaRows && spec.metaRows.length > 0) {
    for (const meta of spec.metaRows) {
      const valLines = wrapTextByWidth(
        meta.value,
        fontRegular,
        8.8,
        contentWidth - 150,
      );
      ensureSpace(valLines.length * 12 + 4);
      page.drawText(sanitizePdfText(`${meta.label}:`), {
        x: marginX,
        y,
        size: 8.8,
        font: fontBold,
        color: SLATE_700,
      });
      valLines.forEach((vLine, lIdx) => {
        page.drawText(vLine, {
          x: marginX + 145,
          y: y - lIdx * 12,
          size: 8.8,
          font: fontRegular,
          color: SLATE_900,
        });
      });
      y -= Math.max(13, valLines.length * 12 + 2);
    }
    y -= 6;
  }

  // 4. Paragraf Pembuka / Klausul
  if (spec.paragraphsBefore && spec.paragraphsBefore.length > 0) {
    for (const para of spec.paragraphsBefore) {
      const wrapped = wrapTextByWidth(para, fontRegular, 9, contentWidth);
      ensureSpace(wrapped.length * 12 + 6);
      for (const line of wrapped) {
        page.drawText(line, {
          x: marginX,
          y,
          size: 9,
          font: fontRegular,
          color: SLATE_900,
        });
        y -= 12;
      }
      y -= 4;
    }
  }

  // 5. Tabel Rincian Item dengan Multi-line Text Wrapping
  if (
    spec.tableColumns &&
    spec.tableColumns.length > 0 &&
    spec.tableRows &&
    spec.tableRows.length > 0
  ) {
    const cols = spec.tableColumns;
    const totalRatio = cols.reduce((s, c) => s + c.widthRatio, 0) || 1;
    const colWidths = cols.map((c) => (c.widthRatio / totalRatio) * contentWidth);

    const drawTableHeader = () => {
      ensureSpace(24);
      page.drawRectangle({
        x: marginX,
        y: y - 6,
        width: contentWidth,
        height: 20,
        color: BRAND_BLUE_SOFT,
        borderColor: BORDER_SLATE,
        borderWidth: 0.6,
      });

      let colX = marginX;
      cols.forEach((col, idx) => {
        const w = colWidths[idx]!;
        const headerClean = sanitizePdfText(col.header);
        const textW = fontBold.widthOfTextAtSize(headerClean, 8.5);
        let drawX = colX + 6;
        if (col.align === "right") {
          drawX = colX + w - textW - 6;
        } else if (col.align === "center") {
          drawX = colX + (w - textW) / 2;
        }
        page.drawText(headerClean, {
          x: drawX,
          y,
          size: 8.5,
          font: fontBold,
          color: BRAND_BLUE,
        });
        colX += w;
      });
      y -= 20;
    };

    drawTableHeader();

    for (const row of spec.tableRows) {
      const wrappedCells = cols.map((_, idx) =>
        wrapTextByWidth(row[idx] ?? "", fontRegular, 8.5, colWidths[idx]! - 12),
      );
      const maxLines = Math.max(...wrappedCells.map((c) => c.length), 1);
      const rowHeight = maxLines * 11.5 + 7;

      if (y - rowHeight < bottomSafeY) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        pages.push(page);
        y = pageHeight - 44;
        drawTableHeader();
      }

      let cellX = marginX;
      cols.forEach((col, idx) => {
        const w = colWidths[idx]!;
        const lines = wrappedCells[idx] ?? [""];
        lines.forEach((l, lIdx) => {
          const textW = fontRegular.widthOfTextAtSize(l, 8.5);
          let drawX = cellX + 6;
          if (col.align === "right") {
            drawX = cellX + w - textW - 6;
          } else if (col.align === "center") {
            drawX = cellX + (w - textW) / 2;
          }
          page.drawText(l, {
            x: drawX,
            y: y - lIdx * 11.5,
            size: 8.5,
            font: fontRegular,
            color: SLATE_900,
          });
        });
        cellX += w;
      });

      const lineY = y - (maxLines - 1) * 11.5 - 6;
      page.drawLine({
        start: { x: marginX, y: lineY },
        end: { x: pageWidth - marginX, y: lineY },
        thickness: 0.4,
        color: BORDER_SLATE,
      });
      y = lineY - 12;
    }
    y -= 4;
  }

  // 6. Ringkasan Nilai & Terbilang
  if (spec.summaryRows && spec.summaryRows.length > 0) {
    for (const sumRow of spec.summaryRows) {
      ensureSpace(16);
      const labelClean = sanitizePdfText(sumRow.label);
      const valClean = sanitizePdfText(sumRow.value);
      const valW = fontBold.widthOfTextAtSize(valClean, 9.5);
      page.drawText(labelClean, {
        x: pageWidth - marginX - 230,
        y,
        size: 9,
        font: fontBold,
        color: SLATE_700,
      });
      page.drawText(valClean, {
        x: pageWidth - marginX - valW,
        y,
        size: 9.5,
        font: fontBold,
        color: BRAND_BLUE,
      });
      y -= 15;
    }
    y -= 4;
  }

  if (typeof spec.terbilangAmount === "number") {
    const terbilangText = `Terbilang: # ${terbilangRupiah(spec.terbilangAmount)} #`;
    const wrapped = wrapTextByWidth(terbilangText, fontBold, 8.8, contentWidth);
    ensureSpace(wrapped.length * 13 + 8);
    for (const line of wrapped) {
      page.drawText(line, {
        x: marginX,
        y,
        size: 8.8,
        font: fontBold,
        color: BRAND_BLUE,
      });
      y -= 13;
    }
    y -= 4;
  }

  // 7. Catatan Ketentuan / Non-PKP / Rekening Tujuan
  if (spec.notes && spec.notes.length > 0) {
    ensureSpace(24);
    page.drawText("Catatan & Ketentuan Pembayaran:", {
      x: marginX,
      y,
      size: 8.8,
      font: fontBold,
      color: SLATE_700,
    });
    y -= 12;
    for (const note of spec.notes) {
      const wrapped = wrapTextByWidth(`- ${note}`, fontRegular, 8.3, contentWidth);
      for (const l of wrapped) {
        ensureSpace(12);
        page.drawText(l, {
          x: marginX,
          y,
          size: 8.3,
          font: fontRegular,
          color: SLATE_500,
        });
        y -= 11.5;
      }
    }
    y -= 8;
  }

  // 8. Blok Tanda Tangan + Gambar TTD Digital
  if (spec.rightSignatureName || spec.leftSignatureName) {
    ensureSpace(98);
    y -= 6;
    const sigTopY = y;

    if (spec.leftSignatureName) {
      page.drawText(sanitizePdfText(spec.leftSignatureLabel ?? "Pihak Klien,"), {
        x: marginX,
        y: sigTopY,
        size: 8.8,
        font: fontRegular,
        color: SLATE_700,
      });
      if (leftSigImg) {
        const dims = fitDimensions(leftSigImg, 110, 42);
        page.drawImage(leftSigImg, {
          x: marginX,
          y: sigTopY - 48,
          width: dims.width,
          height: dims.height,
        });
      }
      page.drawText(sanitizePdfText(`(${spec.leftSignatureName})`), {
        x: marginX,
        y: sigTopY - 60,
        size: 8.8,
        font: fontBold,
        color: SLATE_900,
      });
    }

    const rightX = pageWidth - marginX - 185;
    page.drawText(
      sanitizePdfText(
        spec.rightSignatureLabel ?? `Hormat kami, ${spec.company.company_name}`,
      ),
      {
        x: rightX,
        y: sigTopY,
        size: 8.8,
        font: fontRegular,
        color: SLATE_700,
      },
    );
    if (rightSigImg) {
      const dims = fitDimensions(rightSigImg, 110, 42);
      page.drawImage(rightSigImg, {
        x: rightX,
        y: sigTopY - 48,
        width: dims.width,
        height: dims.height,
      });
    }
    page.drawText(
      sanitizePdfText(
        `(${spec.rightSignatureName ?? `${spec.company.signer_name} - ${spec.company.signer_title}`})`,
      ),
      {
        x: rightX,
        y: sigTopY - 60,
        size: 8.8,
        font: fontBold,
        color: SLATE_900,
      },
    );

    if (spec.closingNote) {
      const cClean = sanitizePdfText(spec.closingNote);
      const cW = fontBold.widthOfTextAtSize(cClean, 8.8);
      page.drawText(cClean, {
        x: (pageWidth - cW) / 2,
        y: sigTopY - 82,
        size: 8.8,
        font: fontBold,
        color: BRAND_BLUE,
      });
    }
  }

  // 9. Footer Ikon Sosial Media di Setiap Halaman
  await drawSocialMediaFooters({
    pdfDoc,
    pages,
    company: spec.company,
    fontRegular,
    fontBold,
    marginX,
    pageWidth,
  });

  return pdfDoc.save();
}

/**
 * Generator PDF Khusus SPK / Project Charter Altvira (PC-1126-01 Reference)
 * Memuat kop dua logo, identitas lengkap Pihak I & II, Pasal 1–10 beserta tabel Timeline,
 * Tim & Tata Kelola, Event, Pembiayaan, gambar TTD, paraf per halaman, & footer 3 sosial media.
 */
export async function generateSpkProjectCharterPdf(params: {
  docNumber: string;
  docDate: string;
  docTitle: string;
  company: CompanyProfileRow;
  content: SpkCharterContent;
}): Promise<Uint8Array> {
  const { docNumber, docDate, docTitle, company, content } = params;
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const [
    companyLogo,
    clientLogo,
    p1SigImg,
    p2SigImg,
    p1ParafImg,
    p2ParafImg,
  ] = await Promise.all([
    embedOptionalImage(pdfDoc, company.logo_storage_path),
    embedOptionalImage(pdfDoc, content.clientLogoDataUrl),
    embedOptionalImage(
      pdfDoc,
      content.partyOneSignatureUrl ?? company.signer_signature_path,
    ),
    embedOptionalImage(pdfDoc, content.partyTwoSignatureUrl),
    embedOptionalImage(
      pdfDoc,
      content.partyOneParafUrl ?? company.signer_paraf_path,
    ),
    embedOptionalImage(pdfDoc, content.partyTwoParafUrl),
  ]);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 42;
  const contentWidth = pageWidth - marginX * 2;
  const bottomSafeY = 74;

  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;

  const drawSpkHeader = (p: PDFPage) => {
    const topY = pageHeight - 30;
    const boxH = 44;
    const subH = 18;

    // Header Card Berbingkai Modern Senada Desain Altcycles
    p.drawRectangle({
      x: marginX,
      y: topY - boxH,
      width: contentWidth,
      height: boxH,
      color: SURFACE_SUBTLE,
      borderColor: BRAND_BLUE,
      borderWidth: 1,
    });

    // Kiri: Logo Altvira
    if (companyLogo) {
      const dims = fitDimensions(companyLogo, 84, 34);
      p.drawImage(companyLogo, {
        x: marginX + 8,
        y: topY - boxH + (boxH - dims.height) / 2,
        width: dims.width,
        height: dims.height,
      });
    } else {
      p.drawText(sanitizePdfText(company.company_name), {
        x: marginX + 10,
        y: topY - 25,
        size: 10,
        font: fontBold,
        color: BRAND_BLUE,
      });
    }

    // Tengah: Judul Kop
    const topBrand = sanitizePdfText(company.company_name.toUpperCase());
    const topBrandW = fontBold.widthOfTextAtSize(topBrand, 9);
    p.drawText(topBrand, {
      x: marginX + (contentWidth - topBrandW) / 2,
      y: topY - 17,
      size: 9,
      font: fontBold,
      color: BRAND_BLUE,
    });
    const subTitle = sanitizePdfText(
      content.headerSubtitle || "Project Charter / Surat Perjanjian Kerjasama",
    );
    const subTitleW = fontBold.widthOfTextAtSize(subTitle, 11);
    p.drawText(subTitle, {
      x: marginX + (contentWidth - subTitleW) / 2,
      y: topY - 33,
      size: 11,
      font: fontBold,
      color: SLATE_900,
    });

    // Kanan: Logo Klien
    if (clientLogo) {
      const cDims = fitDimensions(clientLogo, 84, 34);
      p.drawImage(clientLogo, {
        x: pageWidth - marginX - cDims.width - 8,
        y: topY - boxH + (boxH - cDims.height) / 2,
        width: cDims.width,
        height: cDims.height,
      });
    } else if (content.partyTwo?.company) {
      const cName = sanitizePdfText(content.partyTwo.company).slice(0, 22);
      const cW = fontBold.widthOfTextAtSize(cName, 8);
      p.drawText(cName, {
        x: pageWidth - marginX - cW - 10,
        y: topY - 25,
        size: 8,
        font: fontBold,
        color: SLATE_700,
      });
    }

    // Sub-bar Metadata (No Dokumen | Versi | Tanggal)
    p.drawRectangle({
      x: marginX,
      y: topY - boxH - subH,
      width: contentWidth,
      height: subH,
      color: BRAND_BLUE_SOFT,
      borderColor: BRAND_BLUE,
      borderWidth: 0.8,
    });

    const col3W = contentWidth / 3;
    p.drawText(sanitizePdfText(`No. Dokumen: ${docNumber}`), {
      x: marginX + 8,
      y: topY - boxH - 12,
      size: 8,
      font: fontBold,
      color: SLATE_900,
    });
    p.drawText(sanitizePdfText(`Versi: ${content.docVersion || "1.0"}`), {
      x: marginX + col3W + 8,
      y: topY - boxH - 12,
      size: 8,
      font: fontBold,
      color: SLATE_900,
    });
    p.drawText(
      sanitizePdfText(`Tanggal: ${formatDateID(content.signingDate || docDate)}`),
      {
        x: marginX + col3W * 2 + 8,
        y: topY - boxH - 12,
        size: 8,
        font: fontBold,
        color: SLATE_900,
      },
    );

    return topY - boxH - subH - 22;
  };

  const addNewPage = () => {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    pages.push(page);
    y = drawSpkHeader(page);
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < bottomSafeY) {
      addNewPage();
    }
  };

  const drawParagraph = (text: string, opts?: { bold?: boolean; size?: number; indent?: number; color?: ReturnType<typeof rgb> }) => {
    const size = opts?.size ?? 9;
    const font = opts?.bold ? fontBold : fontRegular;
    const indent = opts?.indent ?? 0;
    const color = opts?.color ?? SLATE_900;
    const lines = wrapTextByWidth(text, font, size, contentWidth - indent);
    ensureSpace(lines.length * (size + 3) + 4);
    for (const line of lines) {
      page.drawText(line, { x: marginX + indent, y, size, font, color });
      y -= size + 3;
    }
    y -= 3;
  };

  const drawPasalHeading = (pasalNo: string, heading: string) => {
    ensureSpace(34);
    y -= 4;
    const label1 = sanitizePdfText(pasalNo.toUpperCase());
    const label2 = sanitizePdfText(heading.toUpperCase());
    const w1 = fontBold.widthOfTextAtSize(label1, 9.5);
    const w2 = fontBold.widthOfTextAtSize(label2, 9.5);
    page.drawText(label1, {
      x: marginX + (contentWidth - w1) / 2,
      y,
      size: 9.5,
      font: fontBold,
      color: BRAND_BLUE,
    });
    y -= 12;
    page.drawText(label2, {
      x: marginX + (contentWidth - w2) / 2,
      y,
      size: 9.5,
      font: fontBold,
      color: SLATE_900,
    });
    y -= 14;
  };

  const drawTable = (headers: string[], widthRatios: number[], rows: string[][]) => {
    if (rows.length === 0) return;
    const totalR = widthRatios.reduce((a, b) => a + b, 0) || 1;
    const widths = widthRatios.map((r) => (r / totalR) * contentWidth);

    const drawHdr = () => {
      ensureSpace(22);
      page.drawRectangle({
        x: marginX,
        y: y - 5,
        width: contentWidth,
        height: 18,
        color: BRAND_BLUE,
      });
      let cx = marginX;
      headers.forEach((h, i) => {
        page.drawText(sanitizePdfText(h), {
          x: cx + 6,
          y,
          size: 8.3,
          font: fontBold,
          color: rgb(1, 1, 1),
        });
        cx += widths[i]!;
      });
      y -= 18;
    };

    drawHdr();

    for (const row of rows) {
      const wrappedCols = widths.map((w, i) =>
        wrapTextByWidth(row[i] ?? "", fontRegular, 8.2, w - 12),
      );
      const maxL = Math.max(...wrappedCols.map((c) => c.length), 1);
      const rH = maxL * 11 + 8;

      if (y - rH < bottomSafeY) {
        addNewPage();
        drawHdr();
      }

      let cx = marginX;
      widths.forEach((w, i) => {
        const lines = wrappedCols[i] ?? [""];
        lines.forEach((l, li) => {
          page.drawText(l, {
            x: cx + 6,
            y: y - li * 11,
            size: 8.2,
            font: i === 0 ? fontBold : fontRegular,
            color: SLATE_900,
          });
        });
        cx += w;
      });
      const bY = y - (maxL - 1) * 11 - 6;
      page.drawLine({
        start: { x: marginX, y: bY },
        end: { x: pageWidth - marginX, y: bY },
        thickness: 0.45,
        color: BORDER_SLATE,
      });
      y = bY - 12;
    }
    y -= 4;
  };

  addNewPage();

  // Judul Utama SPK
  const mainTitle = sanitizePdfText(docTitle.toUpperCase());
  const titleLines = wrapTextByWidth(mainTitle, fontBold, 12.5, contentWidth);
  for (const tl of titleLines) {
    const w = fontBold.widthOfTextAtSize(tl, 12.5);
    page.drawText(tl, {
      x: marginX + (contentWidth - w) / 2,
      y,
      size: 12.5,
      font: fontBold,
      color: SLATE_900,
    });
    y -= 15;
  }
  y -= 4;

  // Pembukaan
  drawParagraph(
    `Pada hari ini, tanggal ${formatDateID(content.signingDate || docDate)}, yang bertempat di ${content.signingCity || company.signing_city || "Bogor"}, kami yang bertanda tangan di bawah ini:`,
  );

  // Blok Identitas PIHAK PERTAMA & PIHAK KEDUA
  const drawPartyBlock = (
    heading: string,
    party: NonNullable<SpkCharterContent["partyOne"]>,
    roleLabel: string,
  ) => {
    const rows: PdfKeyValue[] = [
      { label: "Nama", value: party.name || "-" },
      { label: "Jabatan", value: party.title || "-" },
      { label: "Perusahaan", value: party.company || "-" },
      { label: "Alamat", value: party.address || "-" },
      { label: "Email", value: party.email || "-" },
      { label: "No. Telepon", value: party.phone || "-" },
    ];
    ensureSpace(115);
    page.drawText(sanitizePdfText(heading), {
      x: marginX,
      y,
      size: 9,
      font: fontBold,
      color: BRAND_BLUE,
    });
    y -= 13;
    for (const r of rows) {
      const valLines = wrapTextByWidth(r.value, fontRegular, 8.8, contentWidth - 110);
      ensureSpace(valLines.length * 11.5);
      page.drawText(sanitizePdfText(r.label), {
        x: marginX,
        y,
        size: 8.8,
        font: fontBold,
        color: SLATE_700,
      });
      page.drawText(":", {
        x: marginX + 88,
        y,
        size: 8.8,
        font: fontBold,
        color: SLATE_700,
      });
      valLines.forEach((vl, li) => {
        page.drawText(vl, {
          x: marginX + 98,
          y: y - li * 11.5,
          size: 8.8,
          font: fontRegular,
          color: SLATE_900,
        });
      });
      y -= Math.max(12.5, valLines.length * 11.5 + 1);
    }
    drawParagraph(
      `Dalam hal ini bertindak untuk dan atas nama ${party.company}, selanjutnya disebut sebagai ${roleLabel}.`,
    );
    y -= 2;
  };

  if (content.partyOne) {
    drawPartyBlock("PIHAK PERTAMA (PENYEDIA JASA)", content.partyOne, "PIHAK PERTAMA");
  }
  if (content.partyTwo) {
    drawPartyBlock("PIHAK KEDUA (CLIENT/CUSTOMER)", content.partyTwo, "PIHAK KEDUA");
  }

  // PASAL 1
  drawPasalHeading("PASAL 1", "MAKSUD DAN TUJUAN");
  drawParagraph(content.pasal1Tujuan || "-");

  // PASAL 2
  drawPasalHeading("PASAL 2", "RUANG LINGKUP PEKERJAAN");
  drawParagraph(
    `${content.partyOne?.company || company.company_name} (PIHAK PERTAMA) akan menyediakan layanan pekerjaan sesuai rincian berikut:`,
  );
  for (const grp of content.scopeGroups ?? []) {
    ensureSpace(28);
    drawParagraph(grp.category, { bold: true, size: 9, color: BRAND_BLUE });
    for (const item of grp.items) {
      drawParagraph(`- ${item}`, { indent: 12, size: 8.8 });
    }
  }
  if (content.outOfScope && content.outOfScope.length > 0) {
    ensureSpace(24);
    drawParagraph("Hal-hal yang tidak terlingkupi (Out of Scope):", { bold: true, size: 8.8 });
    content.outOfScope.forEach((oos, i) => {
      drawParagraph(`${i + 1}. ${oos}`, { indent: 12, size: 8.7 });
    });
  }

  // PASAL 3
  drawPasalHeading("PASAL 3", "JANGKA WAKTU & TIMELINE");
  if (content.pasal3Intro) drawParagraph(content.pasal3Intro);
  if (content.timelineRows && content.timelineRows.length > 0) {
    drawTable(
      ["Week / Tahap", "Aktivitas Utama", "Output / Deliverable"],
      [0.2, 0.44, 0.36],
      content.timelineRows.map((t) => [t.week, t.activities, t.output]),
    );
  }

  // PASAL 4
  drawPasalHeading("PASAL 4", "TIM & TATA KELOLA");
  if (content.teamRoles && content.teamRoles.length > 0) {
    drawParagraph("Struktur Tim Pelaksana (PIHAK PERTAMA):", { bold: true, size: 8.8 });
    drawTable(
      ["Peran", "Kapasitas", "Tanggung Jawab Utama"],
      [0.24, 0.16, 0.6],
      content.teamRoles.map((r) => [r.role, r.capacity, r.responsibility]),
    );
  }
  if (content.clientRoles && content.clientRoles.length > 0) {
    drawParagraph("Peran & Keterlibatan Klien (PIHAK KEDUA):", { bold: true, size: 8.8 });
    drawTable(
      ["Peran Klien", "Tanggung Jawab"],
      [0.3, 0.7],
      content.clientRoles.map((r) => [r.role, r.responsibility]),
    );
  }
  if (content.ceremonies && content.ceremonies.length > 0) {
    drawParagraph("Pelaksanaan Event / Ceremony Proyek:", { bold: true, size: 8.8 });
    drawTable(
      ["Sesi / Event", "Frekuensi", "Peserta", "Jadwal Pelaksanaan"],
      [0.28, 0.18, 0.3, 0.24],
      content.ceremonies.map((c) => [c.event, c.frequency, c.attendees, c.schedule]),
    );
  }

  // PASAL 5
  drawPasalHeading("PASAL 5", "PEMBIAYAAN & PEMBAYARAN");
  const totalCost = content.totalProjectCost ?? 0;
  drawParagraph(
    `1. Total biaya proyek adalah sebesar ${formatRupiah(totalCost)} (${terbilangRupiah(totalCost)}), dengan rincian:`,
    { bold: true, size: 9 },
  );
  for (const cd of content.costDetails ?? []) {
    drawParagraph(`- ${cd.label}: ${formatRupiah(cd.amount)}`, { indent: 12, size: 8.8 });
  }
  drawParagraph("2. Mekanisme Pembayaran:", { bold: true, size: 9 });
  for (const pt of content.paymentTermsText ?? []) {
    drawParagraph(`- ${pt}`, { indent: 12, size: 8.8 });
  }
  drawParagraph(
    `3. Rekening Tujuan Transfer Resmi PIHAK PERTAMA: ${company.bank_name} No. Rek ${company.bank_account_number} a.n. ${company.bank_account_holder}. Transfer selain ke rekening tersebut bukan menjadi tanggung jawab PIHAK PERTAMA.`,
    { indent: 12, size: 8.6, color: SLATE_700 },
  );

  // PASAL 6 - 10
  drawPasalHeading("PASAL 6", "KERAHASIAAN");
  drawParagraph(content.pasal6Kerahasiaan || "-");

  drawPasalHeading("PASAL 7", "HAK KEPEMILIKAN DAN INTELLECTUAL PROPERTY");
  (content.pasal7Haki ?? []).forEach((h, i) => {
    drawParagraph(`${i + 1}. ${h}`, { indent: 8 });
  });

  drawPasalHeading("PASAL 8", "FORCE MAJEURE");
  drawParagraph(content.pasal8ForceMajeure || "-");

  drawPasalHeading("PASAL 9", "PENYELESAIAN PERMASALAHAN");
  drawParagraph(content.pasal9Penyelesaian || "-");

  drawPasalHeading("PASAL 10", "LAIN-LAIN");
  drawParagraph(content.pasal10LainLain || "-");

  // PENUTUP & TANDA TANGAN
  ensureSpace(145);
  y -= 4;
  drawParagraph("PENUTUP", { bold: true, size: 9.5, color: BRAND_BLUE });
  drawParagraph(
    content.closingText ||
      "Demikian surat perjanjian kerja sama ini dibuat dan mempunyai kekuatan hukum yang sama bagi kedua belah pihak.",
  );
  drawParagraph(
    `${content.signingCity || company.signing_city || "Bogor"}, ${formatDateID(content.signingDate || docDate)}`,
    { bold: true },
  );

  y -= 6;
  const sigY = y;
  const p1X = marginX + 20;
  const p2X = pageWidth - marginX - 185;

  page.drawText("PIHAK PERTAMA", {
    x: p1X,
    y: sigY,
    size: 9,
    font: fontBold,
    color: BRAND_BLUE,
  });
  page.drawText(sanitizePdfText(content.partyOne?.company || company.company_name), {
    x: p1X,
    y: sigY - 12,
    size: 8.8,
    font: fontRegular,
    color: SLATE_700,
  });
  if (p1SigImg) {
    const d1 = fitDimensions(p1SigImg, 110, 44);
    page.drawImage(p1SigImg, {
      x: p1X,
      y: sigY - 62,
      width: d1.width,
      height: d1.height,
    });
  }
  page.drawText(sanitizePdfText(content.partyOne?.name || company.signer_name), {
    x: p1X,
    y: sigY - 74,
    size: 9,
    font: fontBold,
    color: SLATE_900,
  });
  page.drawText(sanitizePdfText(content.partyOne?.title || company.signer_title), {
    x: p1X,
    y: sigY - 85,
    size: 8.5,
    font: fontRegular,
    color: SLATE_500,
  });

  page.drawText("PIHAK KEDUA", {
    x: p2X,
    y: sigY,
    size: 9,
    font: fontBold,
    color: BRAND_BLUE,
  });
  page.drawText(sanitizePdfText(content.partyTwo?.company || "Pihak Klien"), {
    x: p2X,
    y: sigY - 12,
    size: 8.8,
    font: fontRegular,
    color: SLATE_700,
  });
  if (p2SigImg) {
    const d2 = fitDimensions(p2SigImg, 110, 44);
    page.drawImage(p2SigImg, {
      x: p2X,
      y: sigY - 62,
      width: d2.width,
      height: d2.height,
    });
  }
  page.drawText(sanitizePdfText(content.partyTwo?.name || "Perwakilan Klien"), {
    x: p2X,
    y: sigY - 74,
    size: 9,
    font: fontBold,
    color: SLATE_900,
  });
  page.drawText(sanitizePdfText(content.partyTwo?.title || "Direktur"), {
    x: p2X,
    y: sigY - 85,
    size: 8.5,
    font: fontRegular,
    color: SLATE_500,
  });

  // Footer tiap halaman: Paraf para pihak + Ikon Sosial Media + Hal X/Y
  await drawSocialMediaFooters({
    pdfDoc,
    pages,
    company,
    fontRegular,
    fontBold,
    marginX,
    pageWidth,
    parafInfo: {
      leftImage: p1ParafImg,
      rightImage: p2ParafImg,
    },
  });

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
 * Helper pembuat spesifikasi PDF/Word Invoice Penagihan sesuai PRD Lampiran A.5 + Referensi Altvira Invoice.
 */
export function buildInvoicePdfSpec(params: {
  company: CompanyProfileRow;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  customerName: string;
  customerPic?: string | null;
  customerTitle?: string | null;
  customerAddress: string;
  customerLogoUrl?: string | null;
  projectName: string;
  clientPoNumber: string;
  description: string;
  qty?: number;
  subtotal: number;
  ppnAmount: number;
  totalAmount: number;
}): PdfDocumentSpec {
  const nonPkpNote = params.company.pkp_enabled
    ? `PPN (${params.company.ppn_rate}%) telah diperhitungkan sebesar ${formatRupiah(params.ppnAmount)}.`
    : "Harga tidak dikenakan PPN karena Altvira Technology (PT Representasi Mitra Mandiri) belum dikukuhkan sebagai Pengusaha Kena Pajak (Non-PKP).";

  const picDisplay = params.customerPic
    ? `${params.customerPic}${params.customerTitle ? ` (${params.customerTitle})` : ""}`
    : null;

  return {
    docTitle: "INVOICE PENAGIHAN",
    docSubtitle: `Please pay by: ${formatDateID(params.dueDate)}`,
    docNumber: params.invoiceNumber,
    docDate: params.invoiceDate,
    company: params.company,
    clientLogoUrl: params.customerLogoUrl ?? null,
    recipientTitle: "Bill To / Ditagihkan Kepada:",
    recipientLines: [
      params.customerName,
      ...(picDisplay ? [picDisplay] : []),
      params.customerAddress || "-",
    ],
    metaRows: [
      { label: "Proyek", value: params.projectName },
      { label: "Referensi PO Klien", value: params.clientPoNumber },
      { label: "Please Pay By (Jatuh Tempo)", value: formatDateID(params.dueDate) },
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.08, align: "center" },
      { header: "Description", widthRatio: 0.54 },
      { header: "Qty", widthRatio: 0.1, align: "center" },
      { header: "Total (IDR)", widthRatio: 0.28, align: "right" },
    ],
    tableRows: [
      [
        "1",
        params.description,
        String(params.qty ?? 1),
        formatRupiah(params.subtotal),
      ],
    ],
    summaryRows: [
      { label: "Subtotal", value: formatRupiah(params.subtotal) },
      ...(params.company.pkp_enabled
        ? [{ label: "PPN", value: formatRupiah(params.ppnAmount) }]
        : []),
      { label: "Total Amount", value: formatRupiah(params.totalAmount) },
    ],
    terbilangAmount: params.totalAmount,
    notes: [
      `Payable to: ${params.company.bank_account_holder} | Account: ${params.company.bank_account_number} | Bank Name: ${params.company.bank_name}`,
      nonPkpNote,
      "Mohon cantumkan nomor invoice pada berita transfer pembayaran.",
    ],
    rightSignatureLabel: `Finance of ${params.company.company_name}`,
    rightSignatureName: `${params.company.signer_name} - ${params.company.signer_title}`,
    rightSignatureImageUrl: params.company.signer_signature_path ?? null,
    closingNote: "Thank You for Your Purchase",
  };
}

/**
 * Helper pembuat spesifikasi PDF/Word Kuitansi Bukti Pembayaran sesuai PRD Lampiran A.6.
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
      {
        label: "Untuk Pembayaran",
        value: `Pelunasan / Pembayaran Invoice ${params.invoiceNumber}`,
      },
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
    rightSignatureImageUrl: params.company.signer_signature_path ?? null,
  };
}

/**
 * Helper pembuat spesifikasi PDF resmi untuk Purchase Order (PO) Klien dari Portal Pembeli.
 */
export function buildClientPoPdfSpec(params: {
  company: CompanyProfileRow;
  poNumber: string;
  poDate: string;
  clientName: string;
  clientCompany?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  quotationReference?: string | null;
  statusLabel: string;
  projectLabel?: string | null;
  items: ClientPoItemJson[];
  poValue: number;
}): PdfDocumentSpec {
  const safeItems =
    params.items.length > 0
      ? params.items
      : [{ item: "Paket Pekerjaan / Layanan Sesuai Pengajuan PO", qty: 1, price: params.poValue }];

  const recipientLines = [
    params.clientName,
    params.clientCompany?.trim() || null,
    params.clientEmail?.trim() || null,
    params.clientPhone?.trim() || null,
  ].filter((line): line is string => Boolean(line));

  const metaRows: PdfKeyValue[] = [
    { label: "Nomor PO Klien", value: params.poNumber },
    { label: "Status Verifikasi", value: params.statusLabel },
    ...(params.quotationReference?.trim()
      ? [{ label: "Referensi Quotation", value: params.quotationReference.trim() }]
      : []),
    ...(params.projectLabel?.trim()
      ? [{ label: "Proyek Terkait", value: params.projectLabel.trim() }]
      : []),
  ];

  return {
    docTitle: "PURCHASE ORDER (PO) KLIEN",
    docSubtitle: "Dokumen Pengajuan Pesanan Resmi Pelanggan",
    docNumber: params.poNumber,
    docDate: params.poDate,
    company: params.company,
    recipientTitle: "Diajukan Oleh Klien:",
    recipientLines,
    metaRows,
    paragraphsBefore: [
      "Dokumen Purchase Order (PO) Klien ini diterbitkan secara resmi melalui Portal Pelanggan Altvira Technology sebagai bukti pengajuan pesanan pekerjaan atau layanan.",
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.08, align: "center" },
      { header: "Deskripsi Paket / Pekerjaan", widthRatio: 0.44 },
      { header: "Qty", widthRatio: 0.1, align: "center" },
      { header: "Harga Satuan", widthRatio: 0.18, align: "right" },
      { header: "Subtotal", widthRatio: 0.2, align: "right" },
    ],
    tableRows: safeItems.map((it, idx) => [
      String(idx + 1),
      it.item,
      it.qty.toLocaleString("id-ID"),
      formatRupiah(it.price),
      formatRupiah(Math.round(it.qty * it.price)),
    ]),
    summaryRows: [
      { label: "TOTAL NILAI PURCHASE ORDER", value: formatRupiah(params.poValue) },
    ],
    terbilangAmount: params.poValue,
    notes: [
      "Gunakan Kode Akses PO di atas pada Portal Pembeli untuk memantau progres pekerjaan dan mengunduh dokumen tagihan resmi.",
    ],
    rightSignatureLabel: `Diterima Oleh, ${params.company.company_name}`,
    rightSignatureName: `${params.company.signer_name} - ${params.company.signer_title}`,
    rightSignatureImageUrl: params.company.signer_signature_path ?? null,
  };
}
