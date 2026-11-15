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
  formatDateTimeID,
  formatDocDateLong,
  formatDocEmpty,
  formatDocRupiah,
  formatRupiah,
  terbilangRupiah,
} from "@/lib/formatters";
import type {
  ClientPoItemJson,
  CompanyProfileRow,
  PaymentRequestStatus,
  SpkCharterContent,
} from "@/types/database.types";

export type DocStatusVariant =
  | "neutral"
  | "info"
  | "success"
  | "danger"
  | "warning";

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
  docVersion?: number | string;
  statusBadge?: {
    text: string;
    variant?: DocStatusVariant;
  };
  balanceDueBox?: {
    label: string;
    amountText: string;
    dueDateText?: string;
  };
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
  hasMeterai?: boolean;
  meteraiLabel?: string;
  leftSignatureLabel?: string;
  leftSignatureName?: string;
  leftSignatureImageUrl?: string | null;
  rightSignatureLabel?: string;
  rightSignatureName?: string;
  rightSignatureImageUrl?: string | null;
  thirdSignatureLabel?: string;
  thirdSignatureName?: string;
  thirdSignatureImageUrl?: string | null;
  footerDocNumber?: string;
  hideSystemFooter?: boolean;
}

// Palet warna resmi Altcycles (Clean Modern Corporate Standard - terinspirasi Figma & Atlassian)
const BRAND_BLUE = rgb(0.043, 0.263, 0.784);
const SLATE_900 = rgb(0.059, 0.09, 0.165);
const SLATE_700 = rgb(0.2, 0.255, 0.333);
const SLATE_600 = rgb(0.28, 0.34, 0.42);
const SLATE_500 = rgb(0.42, 0.48, 0.56);
const BORDER_SLATE = rgb(0.82, 0.855, 0.902);
const BORDER_SUBTLE = rgb(0.9, 0.925, 0.95);
const SURFACE_SUBTLE = rgb(0.985, 0.988, 0.995);
const SURFACE_CARD = rgb(0.995, 0.998, 1.0);

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
  docNumber?: string;
  hideSystemFooter?: boolean;
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
    docNumber,
    hideSystemFooter,
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

    // Garis pemisah footer sosial media & legal
    p.drawLine({
      start: { x: marginX, y: 34 },
      end: { x: pageWidth - marginX, y: 34 },
      thickness: 0.6,
      color: BORDER_SLATE,
    });

    const docNumPart = docNumber ? ` | ${docNumber}` : "";
    const brandLabel = sanitizePdfText(`${company.company_name}${docNumPart}`);
    p.drawText(brandLabel, {
      x: marginX,
      y: 22,
      size: 7.2,
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

    if (!hideSystemFooter) {
      const sysFoot = `Dibuat otomatis oleh Altcycles ERP Keuangan Altvira • ${formatDateTimeID(new Date())}`;
      const sysW = fontRegular.widthOfTextAtSize(sysFoot, 6.5);
      p.drawText(sysFoot, {
        x: (pageWidth - sysW) / 2,
        y: 11,
        size: 6.5,
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

  const [companyLogo, clientLogo, rightSigImg, leftSigImg, thirdSigImg] = await Promise.all([
    embedOptionalImage(pdfDoc, spec.company.logo_storage_path),
    embedOptionalImage(pdfDoc, spec.clientLogoUrl),
    embedOptionalImage(
      pdfDoc,
      spec.rightSignatureImageUrl !== undefined
        ? spec.rightSignatureImageUrl
        : spec.company.signer_signature_path,
    ),
    embedOptionalImage(pdfDoc, spec.leftSignatureImageUrl),
    embedOptionalImage(pdfDoc, spec.thirdSignatureImageUrl),
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
  const npwpPart = spec.company.tax_id_number
    ? ` | NPWP: ${spec.company.tax_id_number}`
    : "";
  const addrLines = wrapTextByWidth(
    `${spec.company.address} | Email: ${spec.company.email} | Telp: ${spec.company.phone}${npwpPart}`,
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

  y = Math.min(kopMinY, addrY) - 5;
  // Garis pemisah kop surat resmi - hairline netral modern
  page.drawLine({
    start: { x: marginX, y },
    end: { x: pageWidth - marginX, y },
    thickness: 0.65,
    color: BORDER_SLATE,
  });
  y -= 20;

  // Zona A. Judul Dokumen, Versi, Status Terstruktur (Monokrom), Nomor, & Tanggal
  page.drawText(sanitizePdfText(spec.docTitle.toUpperCase()), {
    x: marginX,
    y,
    size: 13,
    font: fontBold,
    color: SLATE_900,
  });

  if (spec.statusBadge) {
    const rawBadge = sanitizePdfText(spec.statusBadge.text.toUpperCase());
    const badgeText = rawBadge.startsWith("STATUS:") ? rawBadge : `STATUS: ${rawBadge}`;
    const badgeW = fontBold.widthOfTextAtSize(badgeText, 7.2) + 14;
    const badgeH = 15;
    const badgeX = pageWidth - marginX - badgeW;
    const badgeY = y - 3;

    // Desain status badge monokromatik netral & elegan (bebas dari tag warna-warni ala Figma / Atlassian)
    page.drawRectangle({
      x: badgeX,
      y: badgeY,
      width: badgeW,
      height: badgeH,
      color: SURFACE_SUBTLE,
      borderColor: BORDER_SLATE,
      borderWidth: 0.5,
    });
    page.drawText(badgeText, {
      x: badgeX + 7,
      y: badgeY + 4,
      size: 7.2,
      font: fontBold,
      color: SLATE_700,
    });
  } else if (spec.docDate && spec.docDate.trim()) {
    const dateText = sanitizePdfText(`Tanggal: ${formatDocDateLong(spec.docDate)}`);
    const dateWidth = fontRegular.widthOfTextAtSize(dateText, 8.8);
    page.drawText(dateText, {
      x: pageWidth - marginX - dateWidth,
      y,
      size: 8.8,
      font: fontRegular,
      color: SLATE_600,
    });
  }
  y -= 14;

  const hasDocNumber = Boolean(spec.docNumber && spec.docNumber.trim());
  if (hasDocNumber) {
    const verText = spec.docVersion
      ? ` (${typeof spec.docVersion === "number" ? `v${spec.docVersion}` : spec.docVersion})`
      : "";
    page.drawText(sanitizePdfText(`Nomor Dokumen: ${spec.docNumber}${verText}`), {
      x: marginX,
      y,
      size: 8.8,
      font: fontBold,
      color: SLATE_900,
    });
  }

  if (spec.statusBadge && spec.docDate && spec.docDate.trim()) {
    const dateText = sanitizePdfText(`Tanggal: ${formatDocDateLong(spec.docDate)}`);
    const dateWidth = fontRegular.widthOfTextAtSize(dateText, 8.8);
    page.drawText(dateText, {
      x: pageWidth - marginX - dateWidth,
      y,
      size: 8.8,
      font: fontRegular,
      color: SLATE_600,
    });
  } else if (spec.docSubtitle) {
    const subClean = sanitizePdfText(spec.docSubtitle);
    const subW = fontRegular.widthOfTextAtSize(subClean, 8.8);
    page.drawText(subClean, {
      x: hasDocNumber ? pageWidth - marginX - subW : marginX,
      y,
      size: 8.8,
      font: fontRegular,
      color: SLATE_500,
    });
  }
  y -= 18;

  // Zona C. Hero Typography Statement (Balance Due / Total Tagihan Bersih ala Figma)
  if (spec.balanceDueBox) {
    ensureSpace(44);
    const boxW = contentWidth;
    const boxH = 36;
    page.drawRectangle({
      x: marginX,
      y: y - boxH + 6,
      width: boxW,
      height: boxH,
      color: SURFACE_CARD,
      borderColor: BORDER_SLATE,
      borderWidth: 0.55,
    });

    page.drawText(sanitizePdfText(spec.balanceDueBox.label.toUpperCase()), {
      x: marginX + 12,
      y: y - 9,
      size: 7.2,
      font: fontBold,
      color: SLATE_500,
    });

    if (spec.balanceDueBox.dueDateText) {
      page.drawText(sanitizePdfText(spec.balanceDueBox.dueDateText), {
        x: marginX + 12,
        y: y - 22,
        size: 7.8,
        font: fontRegular,
        color: SLATE_700,
      });
    }

    const amtClean = sanitizePdfText(spec.balanceDueBox.amountText);
    const amtW = fontBold.widthOfTextAtSize(amtClean, 14);
    page.drawText(amtClean, {
      x: pageWidth - marginX - 12 - amtW,
      y: y - 17,
      size: 14,
      font: fontBold,
      color: SLATE_900,
    });

    y -= boxH + 10;
  }

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
      // Latar halus & garis hairline ganda pembatas header tabel ala Figma/Zoom
      page.drawRectangle({
        x: marginX,
        y: y - 6,
        width: contentWidth,
        height: 19,
        color: SURFACE_SUBTLE,
      });
      page.drawLine({
        start: { x: marginX, y: y + 13 },
        end: { x: pageWidth - marginX, y: y + 13 },
        thickness: 0.55,
        color: BORDER_SLATE,
      });
      page.drawLine({
        start: { x: marginX, y: y - 6 },
        end: { x: pageWidth - marginX, y: y - 6 },
        thickness: 0.75,
        color: SLATE_700,
      });

      let colX = marginX;
      cols.forEach((col, idx) => {
        const w = colWidths[idx]!;
        const headerClean = sanitizePdfText(col.header);
        const textW = fontBold.widthOfTextAtSize(headerClean, 8.2);
        let drawX = colX + 6;
        if (col.align === "right") {
          drawX = colX + w - textW - 6;
        } else if (col.align === "center") {
          drawX = colX + (w - textW) / 2;
        }
        page.drawText(headerClean, {
          x: drawX,
          y: y + 1,
          size: 8.2,
          font: fontBold,
          color: SLATE_700,
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
        thickness: 0.35,
        color: BORDER_SUBTLE,
      });
      y = lineY - 12;
    }
    y -= 4;
  }

  // 6. Ringkasan Nilai & Terbilang (Clean Monokrom)
  if (spec.summaryRows && spec.summaryRows.length > 0) {
    for (const sumRow of spec.summaryRows) {
      ensureSpace(16);
      const labelClean = sanitizePdfText(sumRow.label);
      const valClean = sanitizePdfText(sumRow.value);
      const isTotalRow =
        labelClean.toUpperCase().includes("TOTAL") ||
        labelClean.toUpperCase().includes("SISA");
      const valW = fontBold.widthOfTextAtSize(valClean, isTotalRow ? 9.8 : 9);

      if (isTotalRow) {
        page.drawLine({
          start: { x: pageWidth - marginX - 230, y: y + 9 },
          end: { x: pageWidth - marginX, y: y + 9 },
          thickness: 0.45,
          color: BORDER_SLATE,
        });
      }

      page.drawText(labelClean, {
        x: pageWidth - marginX - 230,
        y,
        size: isTotalRow ? 9.2 : 8.6,
        font: fontBold,
        color: isTotalRow ? SLATE_900 : SLATE_600,
      });
      page.drawText(valClean, {
        x: pageWidth - marginX - valW,
        y,
        size: isTotalRow ? 9.8 : 9,
        font: fontBold,
        color: SLATE_900,
      });
      y -= 15;
    }
    y -= 4;
  }

  if (typeof spec.terbilangAmount === "number") {
    const terbilangText = `Terbilang: # ${terbilangRupiah(spec.terbilangAmount)} #`;
    const wrapped = wrapTextByWidth(terbilangText, fontBold, 8.5, contentWidth);
    ensureSpace(wrapped.length * 13 + 8);
    for (const line of wrapped) {
      page.drawText(line, {
        x: marginX,
        y,
        size: 8.5,
        font: fontBold,
        color: SLATE_700,
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
      size: 8.5,
      font: fontBold,
      color: SLATE_700,
    });
    y -= 12;
    for (const note of spec.notes) {
      const wrapped = wrapTextByWidth(`- ${note}`, fontRegular, 8, contentWidth);
      for (const l of wrapped) {
        ensureSpace(12);
        page.drawText(l, {
          x: marginX,
          y,
          size: 8,
          font: fontRegular,
          color: SLATE_600,
        });
        y -= 11;
      }
    }
    y -= 8;
  }

  // Zona G. Blok Tanda Tangan, Slot e-Meterai, & Pengesahan
  if (spec.rightSignatureName || spec.leftSignatureName || spec.thirdSignatureName) {
    ensureSpace(104);
    y -= 6;
    const sigTopY = y;

    // Skenario 3 Kolom TTD (misal: PO Vendor -> Dibuat, Disetujui, Diterima)
    if (spec.thirdSignatureName) {
      const colW = (contentWidth - 24) / 3;
      const col1X = marginX;
      const col2X = marginX + colW + 12;
      const col3X = marginX + (colW + 12) * 2;

      // Kolom 1 (Kiri - Pembuat)
      if (spec.leftSignatureName) {
        page.drawText(sanitizePdfText(spec.leftSignatureLabel ?? "Dibuat Oleh,"), {
          x: col1X,
          y: sigTopY,
          size: 8.3,
          font: fontRegular,
          color: SLATE_700,
        });
        if (leftSigImg) {
          const dims = fitDimensions(leftSigImg, 80, 36);
          page.drawImage(leftSigImg, {
            x: col1X,
            y: sigTopY - 44,
            width: dims.width,
            height: dims.height,
          });
        }
        page.drawText(sanitizePdfText(`(${spec.leftSignatureName})`), {
          x: col1X,
          y: sigTopY - 56,
          size: 8.3,
          font: fontBold,
          color: SLATE_900,
        });
      }

      // Kolom 2 (Tengah - Penyetuju)
      page.drawText(sanitizePdfText(spec.thirdSignatureLabel ?? "Disetujui Oleh,"), {
        x: col2X,
        y: sigTopY,
        size: 8.3,
        font: fontRegular,
        color: SLATE_700,
      });
      if (thirdSigImg) {
        const dims = fitDimensions(thirdSigImg, 80, 36);
        page.drawImage(thirdSigImg, {
          x: col2X,
          y: sigTopY - 44,
          width: dims.width,
          height: dims.height,
        });
      }
      page.drawText(sanitizePdfText(`(${spec.thirdSignatureName})`), {
        x: col2X,
        y: sigTopY - 56,
        size: 8.3,
        font: fontBold,
        color: SLATE_900,
      });

      // Kolom 3 (Kanan - Penerima / Vendor)
      if (spec.rightSignatureName) {
        page.drawText(sanitizePdfText(spec.rightSignatureLabel ?? "Diterima Vendor,"), {
          x: col3X,
          y: sigTopY,
          size: 8.3,
          font: fontRegular,
          color: SLATE_700,
        });
        if (rightSigImg) {
          const dims = fitDimensions(rightSigImg, 80, 36);
          page.drawImage(rightSigImg, {
            x: col3X,
            y: sigTopY - 44,
            width: dims.width,
            height: dims.height,
          });
        }
        page.drawText(sanitizePdfText(`(${spec.rightSignatureName})`), {
          x: col3X,
          y: sigTopY - 56,
          size: 8.3,
          font: fontBold,
          color: SLATE_900,
        });
      }
    } else {
      // Skenario 2 Kolom TTD Standar (Pihak Klien & Altvira)
      if (spec.leftSignatureName) {
        page.drawText(sanitizePdfText(spec.leftSignatureLabel ?? "Pihak Klien,"), {
          x: marginX,
          y: sigTopY,
          size: 8.5,
          font: fontRegular,
          color: SLATE_600,
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
          size: 8.5,
          font: fontBold,
          color: SLATE_900,
        });
      }

      // Slot e-Meterai Rp10.000 jika dokumen memerlukan meterai (Kuitansi > 5jt / SPK)
      if (spec.hasMeterai) {
        const meteraiW = 84;
        const meteraiH = 48;
        const meteraiX = spec.leftSignatureName
          ? marginX + (contentWidth - meteraiW) / 2
          : pageWidth - marginX - 185 - meteraiW - 16;
        const meteraiY = sigTopY - 48;

        page.drawRectangle({
          x: meteraiX,
          y: meteraiY,
          width: meteraiW,
          height: meteraiH,
          color: SURFACE_CARD,
          borderColor: BORDER_SLATE,
          borderWidth: 0.6,
        });

        const mTitle = "METERAI ELEKTRONIK";
        const mW1 = fontBold.widthOfTextAtSize(mTitle, 6.5);
        page.drawText(mTitle, {
          x: meteraiX + (meteraiW - mW1) / 2,
          y: meteraiY + meteraiH - 13,
          size: 6.5,
          font: fontBold,
          color: SLATE_600,
        });

        const mNominal = "Rp 10.000";
        const mW2 = fontBold.widthOfTextAtSize(mNominal, 8);
        page.drawText(mNominal, {
          x: meteraiX + (meteraiW - mW2) / 2,
          y: meteraiY + meteraiH - 25,
          size: 8,
          font: fontBold,
          color: SLATE_900,
        });

        const mSub = sanitizePdfText(spec.meteraiLabel ?? "TEMPAT E-METERAI");
        const mW3 = fontRegular.widthOfTextAtSize(mSub, 5.5);
        page.drawText(mSub, {
          x: meteraiX + (meteraiW - mW3) / 2,
          y: meteraiY + 8,
          size: 5.5,
          font: fontRegular,
          color: SLATE_500,
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
          size: 8.5,
          font: fontRegular,
          color: SLATE_600,
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
          size: 8.5,
          font: fontBold,
          color: SLATE_900,
        },
      );
    }

    if (spec.closingNote) {
      const cClean = sanitizePdfText(spec.closingNote);
      const cW = fontBold.widthOfTextAtSize(cClean, 8.5);
      page.drawText(cClean, {
        x: (pageWidth - cW) / 2,
        y: sigTopY - 82,
        size: 8.5,
        font: fontBold,
        color: SLATE_600,
      });
    }
  }

  // Zona I. Footer Ikon Sosial Media & Legal di Setiap Halaman
  await drawSocialMediaFooters({
    pdfDoc,
    pages,
    company: spec.company,
    fontRegular,
    fontBold,
    marginX,
    pageWidth,
    docNumber: spec.footerDocNumber ?? (spec.docNumber ? spec.docNumber : undefined),
    hideSystemFooter: spec.hideSystemFooter,
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

    // Header Card Berbingkai Bersih & Proporsional Modern
    p.drawRectangle({
      x: marginX,
      y: topY - boxH,
      width: contentWidth,
      height: boxH,
      color: SURFACE_SUBTLE,
      borderColor: BORDER_SLATE,
      borderWidth: 0.6,
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
        color: SLATE_900,
      });
    }

    // Tengah: Judul Kop
    const topBrand = sanitizePdfText(company.company_name.toUpperCase());
    const topBrandW = fontBold.widthOfTextAtSize(topBrand, 8.8);
    p.drawText(topBrand, {
      x: marginX + (contentWidth - topBrandW) / 2,
      y: topY - 17,
      size: 8.8,
      font: fontBold,
      color: SLATE_900,
    });
    const subTitle = sanitizePdfText(
      content.headerSubtitle || "Project Charter / Surat Perjanjian Kerjasama",
    );
    const subTitleW = fontBold.widthOfTextAtSize(subTitle, 10.5);
    p.drawText(subTitle, {
      x: marginX + (contentWidth - subTitleW) / 2,
      y: topY - 33,
      size: 10.5,
      font: fontBold,
      color: SLATE_700,
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

    // Sub-bar Metadata (No Dokumen | Versi | Tanggal) - Hairline Bersih
    p.drawRectangle({
      x: marginX,
      y: topY - boxH - subH,
      width: contentWidth,
      height: subH,
      color: SURFACE_CARD,
      borderColor: BORDER_SLATE,
      borderWidth: 0.5,
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
      color: SLATE_700,
    });
    p.drawText(
      sanitizePdfText(`Tanggal: ${formatDateID(content.signingDate || docDate)}`),
      {
        x: marginX + col3W * 2 + 8,
        y: topY - boxH - 12,
        size: 8,
        font: fontBold,
        color: SLATE_700,
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
      // Header tabel SPK clean dengan garis hairline horizontal
      page.drawRectangle({
        x: marginX,
        y: y - 5,
        width: contentWidth,
        height: 18,
        color: SURFACE_SUBTLE,
      });
      page.drawLine({
        start: { x: marginX, y: y + 13 },
        end: { x: pageWidth - marginX, y: y + 13 },
        thickness: 0.55,
        color: BORDER_SLATE,
      });
      page.drawLine({
        start: { x: marginX, y: y - 5 },
        end: { x: pageWidth - marginX, y: y - 5 },
        thickness: 0.75,
        color: SLATE_700,
      });
      let cx = marginX;
      headers.forEach((h, i) => {
        page.drawText(sanitizePdfText(h), {
          x: cx + 6,
          y: y + 1,
          size: 8.2,
          font: fontBold,
          color: SLATE_700,
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
        thickness: 0.35,
        color: BORDER_SUBTLE,
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

  // Slot e-Meterai Rp10.000 di tengah antara kedua penandatangan SPK
  const spkMeteraiW = 84;
  const spkMeteraiH = 48;
  const spkMeteraiX = (pageWidth - spkMeteraiW) / 2;
  const spkMeteraiY = sigY - 58;

  page.drawRectangle({
    x: spkMeteraiX,
    y: spkMeteraiY,
    width: spkMeteraiW,
    height: spkMeteraiH,
    color: SURFACE_CARD,
    borderColor: BORDER_SLATE,
    borderWidth: 0.6,
  });

  const spkMTitle = "METERAI ELEKTRONIK";
  const spkMW1 = fontBold.widthOfTextAtSize(spkMTitle, 6.5);
  page.drawText(spkMTitle, {
    x: spkMeteraiX + (spkMeteraiW - spkMW1) / 2,
    y: spkMeteraiY + spkMeteraiH - 13,
    size: 6.5,
    font: fontBold,
    color: SLATE_600,
  });

  const spkMNominal = "Rp 10.000";
  const spkMW2 = fontBold.widthOfTextAtSize(spkMNominal, 8);
  page.drawText(spkMNominal, {
    x: spkMeteraiX + (spkMeteraiW - spkMW2) / 2,
    y: spkMeteraiY + spkMeteraiH - 25,
    size: 8,
    font: fontBold,
    color: SLATE_900,
  });

  const spkMSub = "TEMPAT E-METERAI";
  const spkMW3 = fontRegular.widthOfTextAtSize(spkMSub, 5.5);
  page.drawText(spkMSub, {
    x: spkMeteraiX + (spkMeteraiW - spkMW3) / 2,
    y: spkMeteraiY + 8,
    size: 5.5,
    font: fontRegular,
    color: SLATE_500,
  });

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
 * Helper pembuat spesifikasi PDF/Word Invoice Penagihan sesuai PRD Lampiran A.5 + Standar Dokumen Altvira.
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
  unit?: string;
  unitPrice?: number;
  subtotal: number;
  ppnAmount: number;
  totalAmount: number;
  spkNumber?: string | null;
  bakpNumber?: string | null;
  bastNumber?: string | null;
  servicePeriod?: string | null;
  items?: Array<{
    description: string;
    qty: number;
    unit?: string;
    unitPrice: number;
    duration?: string;
    subtotal: number;
  }>;
  contractValue?: number | null;
  previousBilledAmount?: number | null;
  remainingContractAmount?: number | null;
  includePph23Estimate?: boolean;
  paymentTermsText?: string | null;
  overdueClauseText?: string | null;
  docStatus?: "draft" | "issued" | "paid" | "cancelled" | string;
  paymentStatus?: "unpaid" | "partial" | "paid" | "cancelled" | string;
  balanceDue?: number;
  statusBadge?: {
    text: string;
    variant?: DocStatusVariant;
  };
}): PdfDocumentSpec {
  const nonPkpNote = params.company.pkp_enabled
    ? `PPN (${params.company.ppn_rate}%) telah diperhitungkan sebesar ${formatDocRupiah(params.ppnAmount)}.`
    : "Harga tidak dikenakan PPN karena Altvira Technology (PT Representasi Mitra Mandiri) belum dikukuhkan sebagai Pengusaha Kena Pajak (Non-PKP).";

  const picDisplay = params.customerPic
    ? `${params.customerPic}${params.customerTitle ? ` (${params.customerTitle})` : ""}`
    : null;

  const dueAmount =
    params.balanceDue !== undefined ? params.balanceDue : params.totalAmount;

  // Status badge logic
  const statusBadge =
    params.statusBadge ??
    (params.paymentStatus === "paid"
      ? { text: "LUNAS", variant: "success" as const }
      : params.docStatus === "cancelled"
        ? { text: "DIBATALKAN", variant: "danger" as const }
        : params.docStatus === "draft"
          ? { text: "DRAFT", variant: "neutral" as const }
          : { text: "TERBIT", variant: "info" as const });

  // Tabel rincian item: dukung multi-item dan single-item
  let tableColumns: PdfTableColumn[];
  let tableRows: string[][];

  if (params.items && params.items.length > 0) {
    const hasDuration = params.items.some((it) => Boolean(it.duration));
    if (hasDuration) {
      tableColumns = [
        { header: "No", widthRatio: 0.06, align: "center" },
        { header: "Deskripsi Layanan / Pekerjaan", widthRatio: 0.38 },
        { header: "Kuantitas", widthRatio: 0.14, align: "center" },
        { header: "Durasi", widthRatio: 0.12, align: "center" },
        { header: "Harga Satuan", widthRatio: 0.15, align: "right" },
        { header: "Subtotal (IDR)", widthRatio: 0.15, align: "right" },
      ];
      tableRows = params.items.map((it, idx) => [
        String(idx + 1),
        it.description,
        `${it.qty} ${it.unit ?? "Paket"}`,
        it.duration ?? formatDocEmpty(),
        formatDocRupiah(it.unitPrice),
        formatDocRupiah(it.subtotal),
      ]);
    } else {
      tableColumns = [
        { header: "No", widthRatio: 0.08, align: "center" },
        { header: "Deskripsi Layanan / Pekerjaan", widthRatio: 0.44 },
        { header: "Kuantitas", widthRatio: 0.16, align: "center" },
        { header: "Harga Satuan", widthRatio: 0.16, align: "right" },
        { header: "Subtotal (IDR)", widthRatio: 0.16, align: "right" },
      ];
      tableRows = params.items.map((it, idx) => [
        String(idx + 1),
        it.description,
        `${it.qty} ${it.unit ?? "Paket"}`,
        formatDocRupiah(it.unitPrice),
        formatDocRupiah(it.subtotal),
      ]);
    }
  } else {
    const qty = params.qty ?? 1;
    const unitPrice =
      params.unitPrice ?? Math.round(params.subtotal / Math.max(1, qty));
    tableColumns = [
      { header: "No", widthRatio: 0.08, align: "center" },
      { header: "Deskripsi Layanan / Pekerjaan", widthRatio: 0.44 },
      { header: "Kuantitas", widthRatio: 0.16, align: "center" },
      { header: "Harga Satuan", widthRatio: 0.16, align: "right" },
      { header: "Subtotal (IDR)", widthRatio: 0.16, align: "right" },
    ];
    tableRows = [
      [
        "1",
        params.description,
        `${qty} ${params.unit ?? "Paket"}`,
        formatDocRupiah(unitPrice),
        formatDocRupiah(params.subtotal),
      ],
    ];
  }

  // Akumulasi termin dan estimasi PPh 23
  const summaryRows: PdfKeyValue[] = [
    { label: "Subtotal Tagihan", value: formatDocRupiah(params.subtotal) },
    ...(params.company.pkp_enabled
      ? [
          {
            label: `PPN (${params.company.ppn_rate}%)`,
            value: formatDocRupiah(params.ppnAmount),
          },
        ]
      : []),
    { label: "Total Tagihan Invoice", value: formatDocRupiah(params.totalAmount) },
  ];

  if (params.contractValue && params.contractValue > 0) {
    const prevBilled = params.previousBilledAmount ?? 0;
    const remaining =
      params.remainingContractAmount !== undefined &&
      params.remainingContractAmount !== null
        ? params.remainingContractAmount
        : Math.max(0, params.contractValue - (prevBilled + params.subtotal));

    summaryRows.push(
      {
        label: "Total Nilai Kontrak Proyek",
        value: formatDocRupiah(params.contractValue),
      },
      {
        label: "Akumulasi Tagihan Sebelumnya",
        value: formatDocRupiah(prevBilled),
      },
      {
        label: "Tagihan Termin Berjalan",
        value: formatDocRupiah(params.subtotal),
      },
      {
        label: "Sisa Nilai Kontrak",
        value: formatDocRupiah(remaining),
      },
    );
  }

  if (params.includePph23Estimate) {
    const pph23Est = Math.round(params.subtotal * 0.02);
    const netEst = Math.max(0, params.totalAmount - pph23Est);
    summaryRows.push(
      {
        label: "Estimasi Potongan PPh 23 (2%)",
        value: formatDocRupiah(pph23Est),
      },
      {
        label: "Estimasi Kas Neto Diterima",
        value: formatDocRupiah(netEst),
      },
    );
  }

  return {
    docTitle: "INVOICE",
    docSubtitle: params.company.pkp_enabled
      ? undefined
      : "DOKUMEN TAGIHAN RESMI (NON-PKP)",
    docNumber: params.invoiceNumber,
    docDate: params.invoiceDate,
    statusBadge,
    balanceDueBox: {
      label:
        dueAmount === 0
          ? "STATUS TAGIHAN"
          : "TOTAL TAGIHAN JATUH TEMPO",
      amountText: dueAmount === 0 ? "LUNAS" : formatDocRupiah(dueAmount),
      dueDateText:
        dueAmount === 0
          ? "Lunas Sepenuhnya"
          : `Jatuh Tempo: ${formatDocDateLong(params.dueDate)}`,
    },
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
      ...(params.spkNumber
        ? [{ label: "Referensi SPK / Kontrak", value: params.spkNumber }]
        : []),
      ...(params.bakpNumber
        ? [{ label: "Referensi BAKP Acuan", value: params.bakpNumber }]
        : []),
      ...(params.bastNumber
        ? [{ label: "Referensi BAST Acuan", value: params.bastNumber }]
        : []),
      ...(params.servicePeriod
        ? [{ label: "Periode Layanan", value: params.servicePeriod }]
        : []),
      {
        label: "Tanggal Jatuh Tempo",
        value: formatDocDateLong(params.dueDate),
      },
    ],
    tableColumns,
    tableRows,
    summaryRows,
    terbilangAmount: params.totalAmount,
    notes: [
      `Instruksi Pembayaran: Bank ${params.company.bank_name} | No. Rek: ${params.company.bank_account_number} | a.n. ${params.company.bank_account_holder}.`,
      `Mohon cantumkan nomor invoice (${params.invoiceNumber}) pada berita transfer pembayaran bank.`,
      `Syarat Pembayaran: Jatuh tempo pembayaran pada tanggal ${formatDocDateLong(params.dueDate)}. ${params.paymentTermsText ?? ""}`.trim(),
      `Klausul Keterlambatan: ${params.overdueClauseText ?? "Keterlambatan pembayaran setelah tanggal jatuh tempo dapat mengakibatkan penangguhan sementara operasional layanan dan/atau penyesuaian jadwal pelaksanaan sesuai perjanjian kerja sama."}`,
      nonPkpNote,
      "Dokumen ini diterbitkan secara resmi melalui sistem komputerisasi Altcycles ERP Keuangan Altvira dan sah tanpa tanda tangan basah.",
    ],
    rightSignatureLabel: `Hormat kami, ${params.company.company_name}`,
    rightSignatureName: `${params.company.signer_name} - ${params.company.signer_title}`,
    rightSignatureImageUrl: params.company.signer_signature_path ?? null,
    footerDocNumber: params.invoiceNumber,
    closingNote: "Thank You for Your Business",
  };
}

/**
 * Helper pembuat spesifikasi PDF/Word Kuitansi Bukti Pembayaran sesuai PRD Lampiran A.6 + Standar Dokumen Altvira.
 */
export function buildReceiptPdfSpec(params: {
  company: CompanyProfileRow;
  receiptNumber: string;
  receiptDate: string;
  receivedFrom: string;
  invoiceNumber: string;
  projectName: string;
  amount: number;
  clientPoNumber?: string | null;
  servicePeriod?: string | null;
  paymentMethod?: string | null;
  hasMeterai?: boolean;
}): PdfDocumentSpec {
  const needsMeterai =
    params.hasMeterai !== undefined
      ? params.hasMeterai
      : params.amount > 5_000_000;

  return {
    docTitle: "KUITANSI",
    docSubtitle: "BUKTI PENERIMAAN PEMBAYARAN RESMI",
    docNumber: params.receiptNumber,
    docDate: params.receiptDate,
    statusBadge: {
      text: "LUNAS",
      variant: "success",
    },
    balanceDueBox: {
      label: "STATUS PEMBAYARAN: LUNAS",
      amountText: formatDocRupiah(params.amount),
      dueDateText: `Diterima Pada: ${formatDocDateLong(params.receiptDate)}`,
    },
    company: params.company,
    metaRows: [
      { label: "Telah Terima Dari", value: params.receivedFrom },
      {
        label: "Untuk Pembayaran",
        value: `Pelunasan / Pembayaran Invoice ${params.invoiceNumber}`,
      },
      { label: "Nama Proyek", value: params.projectName },
      ...(params.clientPoNumber
        ? [{ label: "Referensi PO Klien", value: params.clientPoNumber }]
        : []),
      ...(params.servicePeriod
        ? [{ label: "Periode Layanan", value: params.servicePeriod }]
        : []),
      ...(params.paymentMethod
        ? [{ label: "Metode / Rekening", value: params.paymentMethod }]
        : []),
      { label: "Jumlah Pembayaran", value: formatDocRupiah(params.amount) },
    ],
    terbilangAmount: params.amount,
    hasMeterai: needsMeterai,
    meteraiLabel: "TEMPAT E-METERAI Rp10.000",
    notes: [
      "Kuitansi ini merupakan bukti penerimaan pembayaran yang sah dan mengikat atas tagihan invoice terkait.",
      needsMeterai
        ? "Bea meterai Rp10.000 telah diperhitungkan sesuai UU No. 10 Tahun 2020 tentang Bea Meterai."
        : "Nilai pembayaran di bawah batas pengenaan bea meterai sesuai UU No. 10 Tahun 2020.",
      "Dokumen ini diterbitkan secara resmi melalui sistem komputerisasi Altcycles ERP Keuangan Altvira dan sah tanpa tanda tangan basah.",
    ],
    rightSignatureLabel: `Penerima, ${params.company.company_name}`,
    rightSignatureName: `${params.company.signer_name} - ${params.company.signer_title}`,
    rightSignatureImageUrl: params.company.signer_signature_path ?? null,
    footerDocNumber: params.receiptNumber,
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

/**
 * Helper pembuat spesifikasi PDF/Word Form Persetujuan Pembayaran & Pencairan Dana (Payment Approval)
 * Sesuai PRD Lampiran A & Standar Dokumen Altvira Butir 5.1–5.8.
 */
export function buildPaymentApprovalPdfSpec(params: {
  company: CompanyProfileRow;
  requestNumber: string;
  revisionNo?: number;
  requestDate: string;
  requesterName: string;
  requesterRole?: string;
  projectName?: string | null;
  expenseAccountName?: string | null;
  recipientName: string;
  recipientBankInfo?: string | null;
  purpose: string;
  amount: number;
  status: PaymentRequestStatus | string;
  statusLabel?: string;
  approverName?: string | null;
  approvedAt?: string | null;
  paidDate?: string | null;
  rejectionReason?: string | null;
  attachmentNames?: string[];
}): PdfDocumentSpec {
  const statusTone: DocStatusVariant =
    params.status === "paid"
      ? "success"
      : params.status === "approved"
        ? "info"
        : params.status === "rejected"
          ? "danger"
          : "warning";

  const statusText =
    params.status === "paid"
      ? "TELAH DICAIRKAN (PAID)"
      : params.status === "approved"
        ? "DISETUJUI (APPROVED)"
        : params.status === "rejected"
          ? "DITOLAK (REJECTED)"
          : "MENUNGGU PERSETUJUAN";

  return {
    docTitle: "FORM PERSETUJUAN PEMBAYARAN (PAYMENT APPROVAL)",
    docSubtitle:
      params.revisionNo && params.revisionNo > 0
        ? `LEMBAR VERIFIKASI & PENCAIRAN DANA BIAYA (REV.${params.revisionNo})`
        : "LEMBAR VERIFIKASI & PENCAIRAN DANA BIAYA",
    docNumber: params.requestNumber,
    docDate: params.requestDate,
    statusBadge: {
      text: statusText,
      variant: statusTone,
    },
    balanceDueBox: {
      label: "TOTAL NOMINAL PEMBAYARAN",
      amountText: formatDocRupiah(params.amount),
      dueDateText: params.paidDate
        ? `Telah Dicairkan: ${formatDocDateLong(params.paidDate)}`
        : `Diajukan Pada: ${formatDocDateLong(params.requestDate)}`,
    },
    company: params.company,
    recipientTitle: "Penerima Dana / Rekening Tujuan:",
    recipientLines: [
      params.recipientName,
      params.recipientBankInfo
        ? `Rekening / Bank: ${params.recipientBankInfo}`
        : "Rekening Tujuan: –",
    ],
    metaRows: [
      { label: "Nomor Form PA", value: params.requestNumber },
      { label: "Pemohon / Pengaju", value: params.requesterName },
      { label: "Proyek Terkait", value: params.projectName ?? "Operasional Umum" },
      { label: "Pos Akun Beban", value: params.expenseAccountName ?? "-" },
      { label: "Tanggal Pengajuan", value: formatDocDateLong(params.requestDate) },
      ...(params.approvedAt
        ? [{ label: "Disetujui Pada", value: formatDateTimeID(params.approvedAt) }]
        : []),
      ...(params.paidDate
        ? [{ label: "Tanggal Pencairan Kas", value: formatDocDateLong(params.paidDate) }]
        : []),
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.08, align: "center" },
      { header: "Deskripsi Keperluan Pembayaran", widthRatio: 0.62 },
      { header: "Nominal (IDR)", widthRatio: 0.3, align: "right" },
    ],
    tableRows: [["1", params.purpose, formatDocRupiah(params.amount)]],
    summaryRows: [
      { label: "TOTAL BIAYA DIAJUKAN", value: formatDocRupiah(params.amount) },
    ],
    terbilangAmount: params.amount,
    notes: [
      ...(params.rejectionReason
        ? [`Alasan Penolakan: ${params.rejectionReason}`]
        : []),
      ...(params.attachmentNames && params.attachmentNames.length > 0
        ? [`Dokumen Pendukung Terlampir: ${params.attachmentNames.join(", ")}`]
        : []),
      "Pengajuan pembayaran ini wajib diverifikasi dan disetujui Pejabat Keuangan sebelum pencairan kas atau transfer bank dilakukan.",
      "Dokumen ini diterbitkan secara resmi melalui sistem Altcycles ERP Keuangan Altvira dan sah tanpa tanda tangan basah.",
    ],
    leftSignatureLabel: "Diajukan Oleh (Pemohon),",
    leftSignatureName: params.requesterName,
    rightSignatureLabel: "Disetujui Oleh (Finance / Admin),",
    rightSignatureName:
      params.approverName ??
      `${params.company.signer_name} - ${params.company.signer_title}`,
    rightSignatureImageUrl: params.company.signer_signature_path ?? null,
    footerDocNumber: params.requestNumber,
  };
}
