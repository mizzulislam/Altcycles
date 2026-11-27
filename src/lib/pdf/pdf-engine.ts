import {
  degrees,
  PDFDocument,
  PDFName,
  PDFString,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import {
  decodeImageBytes,
  DEFAULT_SOCIAL_LINKS,
} from "@/lib/asset-utils";
import {
  getAltviraIconBytes,
  getAltviraWordmarkBytes,
} from "@/lib/brand-assets";
import {
  formatDocDateLong,
  formatDocEmpty,
  terbilangRupiah,
} from "@/lib/formatters";
import { getActiveLanguage } from "@/lib/i18n";
import type { CompanyProfileRow } from "@/types/database.types";
import type {
  PdfCollisionIssue,
  PdfDocumentSpec,
  PdfHeaderAlignmentMetrics,
  PdfKeyValue,
  PdfLayoutInspectionResult,
  PdfMarginIssue,
  PdfTextBox,
} from "./pdf-types";
import {
  BORDER_GRAY,
  BRAND_BLUE,
  BRAND_IMAGE_METRICS,
  CHIP_BG,
  HEADER_COMMON_FONT_SIZE,
  PDF_LAYOUT_TOKENS,
  TEXT_DARK,
  TEXT_LABEL,
  TEXT_MUTED,
  getTableColumnsConfig,
  resolveDocTitleConfig,
  sanitizePdfText,
  stripCurrencySymbol,
} from "./pdf-tokens";
import {
  isAccountingCycleOrFinancialReport,
  isRowUppercase,
  normalizeSpecCurrencyDecimals,
  wrapTextByWidth,
} from "./pdf-text-utils";

export { wrapTextByWidth };

export async function embedOptionalImage(
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

export function fitDimensions(
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
 * Menggambar mark logo vektor default Altvira (simbol gelombang A-V setinggi ~14 mm)
 * apabila logo_storage_path belum diunggah di database.
 */
function drawDefaultAltviraMark(page: PDFPage, x: number, topY: number) {
  // Kotak mark: lebar 38 pt, tinggi 34 pt (topY hingga topY - 34)
  const baseY = topY - 30;
  // Kaki kiri 'A' (Biru Altvira)
  page.drawLine({
    start: { x: x + 2, y: baseY + 4 },
    end: { x: x + 13, y: topY - 2 },
    thickness: 3.4,
    color: BRAND_BLUE,
  });
  // Kaki tengah miring dari puncak 'A' ke lembah 'V' (Biru Altvira)
  page.drawLine({
    start: { x: x + 13, y: topY - 2 },
    end: { x: x + 23, y: baseY + 2 },
    thickness: 3.4,
    color: BRAND_BLUE,
  });
  // Palang 'A'
  page.drawLine({
    start: { x: x + 6, y: baseY + 13 },
    end: { x: x + 16, y: baseY + 13 },
    thickness: 2.6,
    color: BRAND_BLUE,
  });
  // Kaki kanan 'V' naik ke kanan atas (Gelap #1f2937)
  page.drawLine({
    start: { x: x + 23, y: baseY + 2 },
    end: { x: x + 35, y: topY - 6 },
    thickness: 3.4,
    color: TEXT_DARK,
  });
}

/**
 * Komponen Bersama: Footer (Zona I) di setiap halaman dokumen.
 * Menempati margin bawah 20 mm (garis tipis di y=40, teks di y=27).
 */
export async function drawSocialMediaFooters(params: {
  pdfDoc: PDFDocument;
  pages: PDFPage[];
  company: CompanyProfileRow;
  fontRegular: PDFFont;
  fontBold?: PDFFont;
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
  recordBox?: (pageIndex: number, x: number, y: number, w: number, h: number, text: string, zone: string) => void;
}) {
  const {
    pages,
    company,
    fontRegular,
    marginX,
    pageWidth,
    hideSystemFooter,
    parafInfo,
    recordBox,
  } = params;

  const total = pages.length;
  const lineY = PDF_LAYOUT_TOKENS.footerLineY;
  const textY = PDF_LAYOUT_TOKENS.footerTextY;
  const fontSize = PDF_LAYOUT_TOKENS.fontSizes.footer;
  const isEnFooter = getActiveLanguage() === "en";

  pages.forEach((p, idx) => {
    // Jika SPK menyertakan area paraf per halaman
    if (parafInfo) {
      const parafY = 64;
      p.drawText(isEnFooter ? "First Party Initials:" : "Paraf Pihak Pertama:", {
        x: marginX,
        y: parafY,
        size: 7.5,
        font: fontRegular,
        color: TEXT_LABEL,
      });
      if (parafInfo.leftImage) {
        const dims = fitDimensions(parafInfo.leftImage, 44, 20);
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
          color: TEXT_LABEL,
        });
      }

      const midX = pageWidth / 2 + 24;
      p.drawText(isEnFooter ? "Second Party Initials:" : "Paraf Pihak Kedua:", {
        x: midX,
        y: parafY,
        size: 7.5,
        font: fontRegular,
        color: TEXT_LABEL,
      });
      if (parafInfo.rightImage) {
        const dims = fitDimensions(parafInfo.rightImage, 44, 20);
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
          color: TEXT_LABEL,
        });
      }
    }

    // Garis pemisah tipis footer (0.5 pt #e5e7eb)
    p.drawLine({
      start: { x: marginX, y: lineY },
      end: { x: pageWidth - marginX, y: lineY },
      thickness: 0.5,
      color: BORDER_GRAY,
    });

    // 3 ikon medsos di sebelah kiri teks Altvira Technology (dapat diklik membuka profil)
    const rawSocials = (company.social_links_json || []).filter(
      (s) => s && s.platform && (s.username?.trim() || s.url?.trim()),
    );
    const activeSocials = (
      rawSocials.length > 0 ? rawSocials : DEFAULT_SOCIAL_LINKS
    ).slice(0, 3);

    const iconSize = 8.5;
    const iconGap = 4;
    // Penyelarasan optik vertikal sempurna:
    // Font Helvetica ukuran 8 pt memiliki cap-height 5.74 pt pada baseline textY.
    // Titik tengah optik huruf kapital teks berada di textY + 2.87 pt.
    // Ikon SVG 24x24 memiliki konten visual di rentang y = 2..22 (tinggi 20 unit).
    // Dengan scale iconSize / 24, titik tengah visual ikon berada di anchor Y - (iconSize / 2).
    // Maka iconTopY = textY + 2.87 + (iconSize / 2) = textY + 7.12 pt agar titik tengahnya sejajar tepat.
    const iconTopY = textY + 7.12;
    const iconBottomY = textY - 1.38;
    let curIconX = marginX;

    for (const soc of activeSocials) {
      const pKey = soc.platform.toLowerCase();
      let iconPath = "M 4 2 L 20 2 Q 22 2 22 4 L 22 20 Q 22 22 20 22 L 4 22 Q 2 22 2 20 L 2 4 Q 2 2 4 2 Z";
      if (pKey.includes("instagram")) {
        iconPath = "M 4 2 L 20 2 Q 22 2 22 4 L 22 20 Q 22 22 20 22 L 4 22 Q 2 22 2 20 L 2 4 Q 2 2 4 2 Z M 12 8 A 4 4 0 1 0 12 16 A 4 4 0 1 0 12 8 Z";
      } else if (pKey.includes("linkedin")) {
        iconPath = "M 4 2 L 20 2 Q 22 2 22 4 L 22 20 Q 22 22 20 22 L 4 22 Q 2 22 2 20 L 2 4 Q 2 2 4 2 Z M 7 10 L 7 17 M 7 6.5 L 7 7.5 M 11 17 L 11 11 Q 11 9 14 9 Q 17 9 17 12 L 17 17";
      } else if (pKey.includes("tiktok")) {
        iconPath = "M 9 12 A 4 4 0 1 0 13 16 L 13 4 Q 14 8 18 8";
      } else if (pKey.includes("x") || pKey.includes("twitter")) {
        iconPath = "M 4 4 L 20 20 M 20 4 L 4 20";
      } else {
        iconPath = "M 12 2 A 10 10 0 1 0 12 22 A 10 10 0 1 0 12 2 Z M 2 12 L 22 12";
      }

      p.drawSvgPath(iconPath, {
        x: curIconX,
        y: iconTopY,
        scale: iconSize / 24,
        borderColor: BRAND_BLUE,
        borderWidth: 0.8,
      });

      let targetUrl =
        soc.url?.trim() ||
        (pKey.includes("instagram")
          ? `https://instagram.com/${soc.username.replace(/^@/, "").trim()}`
          : pKey.includes("linkedin")
            ? `https://linkedin.com/company/${soc.username.replace(/^@/, "").trim()}`
            : pKey.includes("tiktok")
              ? `https://tiktok.com/@${soc.username.replace(/^@/, "").trim()}`
              : `https://${soc.username.replace(/^@/, "").trim()}`);

      if (targetUrl && !/^https?:\/\//i.test(targetUrl)) {
        targetUrl = `https://${targetUrl}`;
      }

      if (targetUrl) {
        // Area klik responsif dengan padding 3 pt di sekeliling ikon
        const clickPad = 3;
        const linkAnnot = p.doc.context.obj({
          Type: "Annot",
          Subtype: "Link",
          Rect: [
            curIconX - clickPad,
            iconBottomY - clickPad,
            curIconX + iconSize + clickPad,
            iconTopY + clickPad,
          ],
          Border: [0, 0, 0],
          F: 4,
          H: PDFName.of("I"),
          A: {
            Type: "Action",
            S: "URI",
            URI: PDFString.of(targetUrl),
          },
        });
        p.node.addAnnot(p.doc.context.register(linkAnnot));
      }

      curIconX += iconSize + iconGap;
    }

    const companyNameX = curIconX + 4;
    const companyNameText = sanitizePdfText(company.company_name || "Altvira Technology");
    const companyNameW = fontRegular.widthOfTextAtSize(companyNameText, fontSize);
    p.drawText(companyNameText, {
      x: companyNameX,
      y: textY,
      size: fontSize,
      font: fontRegular,
      color: TEXT_LABEL,
    });
    recordBox?.(idx, companyNameX, textY, companyNameW, fontSize, companyNameText, "I-footer");

    const rightText = isEnFooter
      ? `Page ${idx + 1} / ${total}`
      : `Hal. ${idx + 1} / ${total}`;
    const rightW = fontRegular.widthOfTextAtSize(rightText, fontSize);
    const rightX = pageWidth - marginX - rightW;
    p.drawText(rightText, {
      x: rightX,
      y: textY,
      size: fontSize,
      font: fontRegular,
      color: TEXT_LABEL,
    });
    recordBox?.(idx, rightX, textY, rightW, fontSize, rightText, "I-footer");

    if (!hideSystemFooter) {
      const centerText = isEnFooter
        ? "This document was generated automatically by Altcycles"
        : "Dokumen ini dibuat otomatis oleh Altcycles";
      const centerFontSize = 7.5;
      const centerW = fontRegular.widthOfTextAtSize(centerText, centerFontSize);
      const centerX = (pageWidth - centerW) / 2;
      if (centerX > companyNameX + companyNameW + 12 && centerX + centerW < rightX - 12) {
        p.drawText(centerText, {
          x: centerX,
          y: textY,
          size: centerFontSize,
          font: fontRegular,
          color: TEXT_LABEL,
        });
        recordBox?.(idx, centerX, textY, centerW, centerFontSize, centerText, "I-footer");
      }
    }
  });
}

/**
 * Menggambar kotak berbingkai sudut membulat dengan SVG path.
 */
function drawRoundedRect(
  page: PDFPage,
  x: number,
  topY: number,
  width: number,
  height: number,
  radius: number,
  options?: {
    borderColor?: RGB;
    borderWidth?: number;
    color?: RGB;
  },
) {
  if (radius <= 0) {
    page.drawRectangle({
      x,
      y: topY - height,
      width,
      height,
      borderColor: options?.borderColor,
      borderWidth: options?.borderWidth,
      color: options?.color,
    });
    return;
  }
  const r = Math.min(radius, width / 2, height / 2);
  const w = width;
  const h = height;
  const d = `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
  page.drawSvgPath(d, {
    x,
    y: topY,
    borderColor: options?.borderColor,
    borderWidth: options?.borderWidth,
    color: options?.color,
  });
}

/**
 * Mesin internal pembuat PDF beserta perekam kotak batas (bounding box) setiap elemen teks
 * untuk verifikasi anti-tabrakan dan anti-keluar-margin.
 */
async function renderDocumentPdfInternal(
  rawSpec: PdfDocumentSpec,
): Promise<{
  pdfBytes: Uint8Array;
  pageCount: number;
  textBoxes: PdfTextBox[];
  headerAlignment: PdfHeaderAlignmentMetrics;
}> {
  const spec = normalizeSpecCurrencyDecimals(rawSpec);
  const isEnPdf =
    spec.language === "en" ||
    (spec as { lang?: string }).lang === "en" ||
    (!spec.language && getActiveLanguage() === "en");
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const [
    companyLogo,
    rightSigImg,
    leftSigImg,
    thirdSigImg,
    altviraIconBytes,
    altviraWordmarkBytes,
  ] = await Promise.all([
    embedOptionalImage(pdfDoc, spec.company.logo_storage_path),
    embedOptionalImage(
      pdfDoc,
      spec.rightSignatureImageUrl !== undefined
        ? spec.rightSignatureImageUrl
        : spec.company.signer_signature_path,
    ),
    embedOptionalImage(pdfDoc, spec.leftSignatureImageUrl),
    embedOptionalImage(pdfDoc, spec.thirdSignatureImageUrl),
    getAltviraIconBytes(),
    getAltviraWordmarkBytes(),
  ]);

  const [altviraIconImg, altviraWordmarkImg] = await Promise.all([
    altviraIconBytes ? pdfDoc.embedPng(altviraIconBytes).catch(() => null) : Promise.resolve(null),
    altviraWordmarkBytes ? pdfDoc.embedPng(altviraWordmarkBytes).catch(() => null) : Promise.resolve(null),
  ]);

  const isLandscape = spec.orientation === "landscape";
  const pageWidth = isLandscape
    ? PDF_LAYOUT_TOKENS.pageHeight
    : PDF_LAYOUT_TOKENS.pageWidth; // 841.89 pt (Landscape) vs 595.28 pt (Portrait)
  const pageHeight = isLandscape
    ? PDF_LAYOUT_TOKENS.pageWidth
    : PDF_LAYOUT_TOKENS.pageHeight; // 595.28 pt (Landscape) vs 841.89 pt (Portrait)
  const { marginX, marginTop, bottomSafeY } = PDF_LAYOUT_TOKENS;
  const contentWidth = pageWidth - marginX * 2;

  const pages: PDFPage[] = [];
  const textBoxes: PdfTextBox[] = [];

  const drawWatermarkOnPage = (targetPage: PDFPage) => {
    const statusStr = (spec.docStatus || spec.statusBadge?.text || "").toLowerCase();
    const isDraft = statusStr.includes("draft");
    const isCancelled = statusStr.includes("batal") || statusStr.includes("cancel");

    if (!isDraft && !isCancelled && !spec.watermarkText) return;

    const wmText = spec.watermarkText || (isDraft ? "DRAFT" : "BATAL");
    const wmSize = 68;
    const wmW = fontBold.widthOfTextAtSize(wmText, wmSize);
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;
    const rad = 32 * (Math.PI / 180);

    targetPage.drawText(wmText, {
      x: centerX - (wmW / 2) * Math.cos(rad),
      y: centerY - (wmW / 2) * Math.sin(rad),
      size: wmSize,
      font: fontBold,
      color: rgb(0.5, 0.5, 0.5),
      opacity: 0.11,
      rotate: degrees(32),
    });
  };

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  drawWatermarkOnPage(page);
  pages.push(page);
  let pageIndex = 0;
  let y = pageHeight - marginTop; // 796.54 pt

  const recordBox = (
    pIdx: number,
    x: number,
    baselineY: number,
    w: number,
    size: number,
    text: string,
    zone: string,
  ) => {
    if (!text.trim()) return;
    textBoxes.push({
      pageIndex: pIdx,
      x,
      y: baselineY,
      width: w,
      height: size,
      text,
      zone,
    });
  };

  const drawTrackedText = (
    text: string,
    opts: {
      x: number;
      y: number;
      size: number;
      font: PDFFont;
      color: RGB;
    },
    zone: string,
  ) => {
    const clean = sanitizePdfText(text);
    if (!clean) return;
    page.drawText(clean, opts);
    const w = opts.font.widthOfTextAtSize(clean, opts.size);
    recordBox(pageIndex, opts.x, opts.y, w, opts.size, clean, zone);
  };

  // ==========================================================================
  // KOMPONEN 1: HEADER (ZONA A) — Format Global Standard
  // - Kolom kiri (maks 235 pt): Ikon Altvira (~15 mm) + Wordmark Altvira (proporsional),
  //   disusun 1 garis tengah horizontal dengan Judul Dokumen di kolom kanan.
  //   Di bawahnya: Nama Badan Usaha (8.5 pt bold), Alamat (maks 2 baris),
  //   Email : ..., Telp. : ..., dan NPWP : ...
  // - Kolom kanan (maks 248 pt): Judul Dokumen (22 pt bold, disingkat bila panjang),
  //   No : {nomor} sejajar baseline Telp., dan Ref : {induk} sejajar baseline NPWP.
  //   SEMUA chip status di bawah nomor dokumen dihapus total.
  // - Baris abu selebar penuh konten di bawah garis header jika judul panjang.
  // ==========================================================================
  const docTitleConfig = resolveDocTitleConfig(spec.docTitle);
  let headerAlignment: PdfHeaderAlignmentMetrics = {
    legalNameBaselineY: 0,
    noBaselineY: 0,
    addrLine1BaselineY: 0,
    refBaselineY: 0,
    iconInkHeight: 0,
    wordmarkInkHeight: 0,
    deltaNoVsLegalName: 0,
    deltaRefVsAddr1: 0,
    deltaIconVsWordmarkInk: 0,
  };

  const drawDocumentHeader = () => {
    const headerTopY = y;
    const leftColMaxW = 235;
    const rightEdgeX = pageWidth - marginX;

    // Target tinggi tinta ikon & wordmark Altvira (diperbesar lagi sesuai arahan)
    const iconInkHeight = 36; // Ikon logo (~36 pt)
    const wordmarkInkHeight = 22; // Wordmark (~22 pt)

    // Perhitungan dimensi aset berdasarkan rasio asli dan bounding box tinta
    const iconInkH = BRAND_IMAGE_METRICS.icon.inkHeight; // 731 px
    const iconFileW_raw = BRAND_IMAGE_METRICS.icon.fileWidth; // 1024 px
    const iconScale = iconInkHeight / iconInkH;
    const iconH = iconInkHeight; // 28 pt
    const iconW = iconFileW_raw * iconScale; // ~39.22 pt (rasio asli 1024:731)

    const wmInkH = BRAND_IMAGE_METRICS.wordmark.inkHeight; // 203 px
    const wmFileH_raw = BRAND_IMAGE_METRICS.wordmark.fileHeight; // 208 px
    const wmFileW_raw = BRAND_IMAGE_METRICS.wordmark.fileWidth; // 1024 px
    const wmBottomPad_raw = BRAND_IMAGE_METRICS.wordmark.inkBottomPad; // 5 px

    const wmScale = wordmarkInkHeight / wmInkH;
    const wmH = wmFileH_raw * wmScale; // ~17.42 pt
    const wmW = wmFileW_raw * wmScale; // ~85.75 pt
    const wmBottomPad = wmBottomPad_raw * wmScale; // ~0.42 pt

    // Common Center Y untuk ikon, wordmark, dan judul dokumen di kolom kanan
    const headerCenterY = headerTopY - 17;
    const iconY = headerCenterY - iconH / 2;
    const wmY = headerCenterY - wmH / 2 - wmBottomPad / 2;
    const brandInkBottomY = Math.min(iconY, wmY);

    const iconX = marginX;

    if (altviraIconImg) {
      page.drawImage(altviraIconImg, {
        x: iconX,
        y: iconY,
        width: iconW,
        height: iconH,
      });
    } else if (companyLogo) {
      const dims = fitDimensions(companyLogo, 52, 28);
      page.drawImage(companyLogo, {
        x: iconX,
        y: headerCenterY - dims.height / 2,
        width: dims.width,
        height: dims.height,
      });
    } else {
      drawDefaultAltviraMark(page, iconX, headerCenterY + 14);
    }

    // 2. Wordmark Altvira (posisi sejajar vertikal di tengah dengan ikon)
    const wmX = iconX + iconW + 8; // jarak ikon ke wordmark 8 pt


    if (altviraWordmarkImg) {
      page.drawImage(altviraWordmarkImg, {
        x: wmX,
        y: wmY,
        width: wmW,
        height: wmH,
      });
    } else {
      drawTrackedText(
        "Altvira Technology",
        {
          x: wmX,
          y: headerCenterY - 4,
          size: 14,
          font: fontBold,
          color: BRAND_BLUE,
        },
        "A-header-left",
      );
    }

    // 3. Judul Dokumen di kolom kanan (rata kanan, berpusat di garis tengah headerCenterY)
    const titleText = sanitizePdfText(docTitleConfig.headerTitle.toUpperCase());
    const titleSize = 22;
    const titleCapCenterOffset = 7.5;
    const titleBaselineY = headerCenterY - titleCapCenterOffset;
    const titleW = fontBold.widthOfTextAtSize(titleText, titleSize);
    const titleX = rightEdgeX - titleW;

    drawTrackedText(
      titleText,
      {
        x: titleX,
        y: titleBaselineY,
        size: titleSize,
        font: fontBold,
        color: TEXT_DARK,
      },
      "A-header-right-title",
    );

    // 4. Blok Kontak Kiri di bawah brand
    // Jarak dari batas bawah brand ink ke baris pertama nama badan usaha (diberi spasi lebih lega sesuai arahan)
    const brandToContactGap = 16;
    const legalNameBaselineY = brandInkBottomY - brandToContactGap;
    const contactSize = HEADER_COMMON_FONT_SIZE; // 8 pt (konstanta bersama untuk blok kiri & No/Ref kanan)
    const contactLineH = 10;
    let leftCursorY = legalNameBaselineY;

    // 4a. Nama Badan Usaha (8 pt fontBold)
    const legalNameClean = sanitizePdfText(
      spec.company.legal_entity_name || "PT Representasi Mitra Mandiri",
    );
    drawTrackedText(
      legalNameClean,
      {
        x: marginX,
        y: legalNameBaselineY,
        size: contactSize,
        font: fontBold,
        color: TEXT_DARK,
      },
      "A-header-legal-name",
    );
    leftCursorY -= 11;

    // 4b. Alamat (wrap maks 2 baris, 8 pt fontRegular)
    const rawAddrLines = wrapTextByWidth(
      spec.company.address,
      fontRegular,
      contactSize,
      leftColMaxW,
    );
    const addrLines = rawAddrLines.slice(0, 2);
    const addrLine1BaselineY = leftCursorY;
    if (addrLines[0]) {
      drawTrackedText(
        addrLines[0],
        {
          x: marginX,
          y: addrLine1BaselineY,
          size: contactSize,
          font: fontRegular,
          color: TEXT_DARK,
        },
        "A-header-addr-1",
      );
      leftCursorY -= contactLineH;
    }
    if (addrLines[1]) {
      drawTrackedText(
        addrLines[1],
        {
          x: marginX,
          y: leftCursorY,
          size: contactSize,
          font: fontRegular,
          color: TEXT_DARK,
        },
        "A-header-contact",
      );
      leftCursorY -= contactLineH;
    }

    // 4c. Email
    const emailVal = spec.company.email
      ? `Email : ${spec.company.email}`
      : "Email : -";
    drawTrackedText(
      emailVal,
      {
        x: marginX,
        y: leftCursorY,
        size: contactSize,
        font: fontRegular,
        color: TEXT_DARK,
      },
      "A-header-contact",
    );
    leftCursorY -= contactLineH;

    // 4d. Telepon
    const phoneVal = spec.company.phone
      ? `Telp. : ${spec.company.phone}`
      : "Telp. : -";
    drawTrackedText(
      phoneVal,
      {
        x: marginX,
        y: leftCursorY,
        size: contactSize,
        font: fontRegular,
        color: TEXT_DARK,
      },
      "A-header-contact",
    );
    leftCursorY -= contactLineH;

    // 4e. NPWP
    const npwpBaselineY = leftCursorY;
    const npwpVal = spec.company.tax_id_number?.trim()
      ? `NPWP : ${spec.company.tax_id_number.trim()}`
      : "NPWP : -";
    drawTrackedText(
      npwpVal,
      {
        x: marginX,
        y: npwpBaselineY,
        size: contactSize,
        font: fontRegular,
        color: TEXT_DARK,
      },
      "A-header-contact",
    );
    leftCursorY -= contactLineH;

    // 5. Blok No & Ref di Kanan (sejajar baseline dengan Nama Badan Usaha & Baris Pertama Alamat)
    const verSuffix = spec.docVersion
      ? ` · ${typeof spec.docVersion === "number" ? `v${spec.docVersion}` : spec.docVersion}`
      : "";
    const noClean = spec.docNumber?.trim()
      ? `${spec.docNumber.trim()}${verSuffix}`
      : "-";
    const noStr = `No : ${noClean}`;
    const refClean = spec.refDocNumber?.trim() ? spec.refDocNumber.trim() : "-";
    const refStr = `Ref : ${refClean}`;

    const noBaselineY = legalNameBaselineY;
    const refBaselineY = addrLine1BaselineY;

    const noW = fontRegular.widthOfTextAtSize(noStr, contactSize);
    const refW = fontRegular.widthOfTextAtSize(refStr, contactSize);
    const maxBlockW = Math.max(noW, refW);
    const noRefStartX = rightEdgeX - maxBlockW;

    drawTrackedText(
      noStr,
      {
        x: noRefStartX,
        y: noBaselineY,
        size: contactSize,
        font: fontRegular,
        color: TEXT_DARK,
      },
      "A-header-right-no",
    );

    drawTrackedText(
      refStr,
      {
        x: noRefStartX,
        y: refBaselineY,
        size: contactSize,
        font: fontRegular,
        color: TEXT_DARK,
      },
      "A-header-right-ref",
    );

    // Simpan metrik penjajaran header untuk automated alignment verifier
    headerAlignment = {
      legalNameBaselineY,
      noBaselineY,
      addrLine1BaselineY,
      refBaselineY,
      iconInkHeight,
      wordmarkInkHeight,
      deltaNoVsLegalName: Math.abs(noBaselineY - legalNameBaselineY),
      deltaRefVsAddr1: Math.abs(refBaselineY - addrLine1BaselineY),
      deltaIconVsWordmarkInk: Math.abs(iconInkHeight - wordmarkInkHeight),
    };

    // 6. Garis pemisah horizontal di bawah header (0.75 pt #e5e7eb)
    const separatorLineY = npwpBaselineY - 7;
    page.drawLine({
      start: { x: marginX, y: separatorLineY },
      end: { x: rightEdgeX, y: separatorLineY },
      thickness: 0.75,
      color: BORDER_GRAY,
    });

    // 7. Baris Abu Judul Lengkap (rata tengah / middle di baris abu)
    if (docTitleConfig.fullTitleBar) {
      const barTopMargin = 6;
      const cleanTitle = sanitizePdfText(docTitleConfig.fullTitleBar);
      const titleFontSize = 9.5;
      const maxTitleW = contentWidth - 24;
      const titleLines = wrapTextByWidth(cleanTitle, fontBold, titleFontSize, maxTitleW);
      const barHeight = Math.max(22, titleLines.length * 12 + 10);
      const barY = separatorLineY - barTopMargin - barHeight;

      page.drawRectangle({
        x: marginX,
        y: barY,
        width: contentWidth,
        height: barHeight,
        color: CHIP_BG,
      });

      titleLines.forEach((tLine, tIdx) => {
        const textW = fontBold.widthOfTextAtSize(tLine, titleFontSize);
        const textX = marginX + (contentWidth - textW) / 2;
        const lineY =
          titleLines.length === 1
            ? barY + (barHeight - titleFontSize) / 2 + 1
            : barY + barHeight - 13 - tIdx * 12;

        drawTrackedText(
          tLine,
          {
            x: textX,
            y: lineY,
            size: titleFontSize,
            font: fontBold,
            color: TEXT_DARK,
          },
          "A-header-fulltitle-bar",
        );
      });

      y = barY - 15;
    } else {
      y = separatorLineY - 15;
    }
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < bottomSafeY) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      drawWatermarkOnPage(page);
      pages.push(page);
      pageIndex = pages.length - 1;
      y = pageHeight - marginTop;
      drawDocumentHeader();
    }
  };

  // Gambar Header pada halaman pertama
  drawDocumentHeader();

  // Baris Abu Apresiasi Kuitansi ("Terima kasih telah memilih Altvira, {nama klien}")
  const clientNameVal =
    spec.appreciationBarText ||
    (spec.docTitle.toUpperCase().includes("KUITANSI")
      ? spec.metaRows?.find((m) => /telah\s+terima\s+dari/i.test(m.label))?.value
      : null);
  const appreciationText = clientNameVal
    ? clientNameVal.startsWith("Terima kasih")
      ? clientNameVal
      : `Terima kasih telah memilih Altvira, ${clientNameVal}`
    : null;

  if (appreciationText) {
    const cleanAppText = sanitizePdfText(appreciationText);
    const maxBarW = contentWidth - 24;
    const appFontSize = 9.5;
    const appLines = wrapTextByWidth(cleanAppText, fontBold, appFontSize, maxBarW);
    const barHeight = Math.max(22, appLines.length * 12 + 10);
    // Spasi before baris apresiasi kuitansi sama besar dengan spasi judul lengkap dokumen (Poin 1: 6 pt dari garis header)
    const barTopMargin = 6;
    const safeBarY = y + 15 - barTopMargin - barHeight;

    page.drawRectangle({
      x: marginX,
      y: safeBarY,
      width: contentWidth,
      height: barHeight,
      color: CHIP_BG,
    });

    appLines.forEach((line, lIdx) => {
      const textW = fontBold.widthOfTextAtSize(line, appFontSize);
      const textX = marginX + (contentWidth - textW) / 2;
      const lineBaselineY =
        appLines.length === 1
          ? safeBarY + (barHeight - appFontSize) / 2 + 1
          : safeBarY + barHeight - 13 - lIdx * 12;

      drawTrackedText(
        line,
        {
          x: textX,
          y: lineBaselineY,
          size: appFontSize,
          font: fontBold,
          color: TEXT_DARK,
        },
        "A-receipt-appreciation-bar",
      );
    });

    y = safeBarY - 15;
  }

  // ==========================================================================
  // KOMPONEN 2: BLOK PIHAK & PASANGAN LABEL : NILAI (ZONA B)
  // - Tanggal dokumen otomatis dimasukkan ke awal metaRows bila belum ada.
  // - Grid tiga kolom untuk pasangan label : nilai:
  //   Label (34-40 mm / 96.4-113.4 pt, atau adaptif/wrap 2 baris) | Titik dua (3.5 mm / 10 pt) | Nilai (sisa lebar, wrap).
  // ==========================================================================
  const effectiveMetaRows: PdfKeyValue[] = [];
  const rawMeta = spec.metaRows ?? [];

  // Pastikan tanggal dokumen ada di Zona B
  if (spec.docDate && spec.docDate.trim()) {
    const isEn = (spec.language ?? getActiveLanguage()) === "en";
    const formattedDocDate = formatDocDateLong(spec.docDate, isEn ? "en" : "id");
    const alreadyHasDocDate = rawMeta.some(
      (m) =>
        /tanggal\s*(terbit|dokumen|invoice|kuitansi|po|uji|pengujian|evaluasi|serah\s*terima|pengajuan)|document\s*date|issue\s*date/i.test(
          m.label,
        ) || m.value === formattedDocDate,
    );
    if (!alreadyHasDocDate) {
      effectiveMetaRows.push({
        label: isEn ? "Document Date" : "Tanggal Dokumen",
        value: formattedDocDate,
      });
    }
  }

  // Salin & bersihkan duplikasi kecil seperti "Termin: Termin 1"
  for (const m of rawMeta) {
    const cleanedVal = m.value.replace(/^Termin:\s*(Termin\b)/i, "$1");
    effectiveMetaRows.push({
      label: m.label.replace(/\s*:\s*$/, "").trim(),
      value: cleanedVal,
    });
  }

  // Jika docSubtitle memuat "Masa Berlaku s.d. ..." (misal pada Quotation) dan belum ada di metaRows, masukkan ke Zona B
  if (spec.docSubtitle && /masa\s+berlaku|berlaku\s+s\.?d\.?/i.test(spec.docSubtitle)) {
    const hasValidUntilMeta = effectiveMetaRows.some((m) =>
      /masa\s+berlaku|berlaku\s+s\.?d\.?/i.test(m.label),
    );
    if (!hasValidUntilMeta) {
      const cleanedValidUntil = spec.docSubtitle
        .replace(/^(masa\s+berlaku\s*(s\.?d\.?)?|berlaku\s*s\.?d\.?)\s*:?\s*/i, "")
        .trim();
      if (cleanedValidUntil) {
        effectiveMetaRows.splice(Math.min(1, effectiveMetaRows.length), 0, {
          label: "Masa Berlaku s.d.",
          value: cleanedValidUntil,
        });
      }
    }
  }

  const hasRecipient = Boolean(spec.recipientLines && spec.recipientLines.length > 0);
  const hasMeta = effectiveMetaRows.length > 0;

  if (hasRecipient || hasMeta) {
    const labelFontSize = PDF_LAYOUT_TOKENS.fontSizes.label; // 9.5 pt (patokan seragam)
    const valFontSize = PDF_LAYOUT_TOKENS.fontSizes.body; // 9.5 pt (patokan seragam)
    const rowLineH = 12.2;
    const rowGap = 2.5;

    if (hasRecipient && hasMeta) {
      // Tata Letak 2 Kolom: Kiri = Penerima, Kanan = Grid Label : Nilai (digeser & dipersempit ke kanan)
      const rightColW = 245; // Blok kanan dipersempit dan menempel ke sisi kanan
      const rightColX = pageWidth - marginX - rightColW; // Mulai di ~300.6 pt
      const colGutter = 16;
      const leftColW = rightColX - marginX - colGutter; // ~233.6 pt

      // Siapkan baris kolom kiri
      const rawRecipientTitle = (spec.recipientTitle ?? "Kepada Yth.")
        .replace(/Bill To\s*\/\s*/i, "")
        .replace(/\s*:\s*$/, "");
      const leftPrepared: Array<{
        lines: string[];
        font: PDFFont;
        size: number;
        color: RGB;
        gapAfter: number;
      }> = [
        {
          lines: [sanitizePdfText(rawRecipientTitle)],
          font: fontBold,
          size: labelFontSize,
          color: TEXT_LABEL,
          gapAfter: 3,
        },
      ];

      spec.recipientLines!.forEach((rLine, idx) => {
        const isFirst = idx === 0;
        const rFont = isFirst ? fontBold : fontRegular;
        const rSize = isFirst ? 10 : valFontSize; // Nama klien tetap 10 pt bold, alamat 9.5 pt
        const rColor = TEXT_DARK; // Nama klien maupun alamat klien di blok kiri berseragam warna TEXT_DARK
        const wrapped = wrapTextByWidth(rLine, rFont, rSize, leftColW);
        leftPrepared.push({
          lines: wrapped,
          font: rFont,
          size: rSize,
          color: rColor,
          gapAfter: isFirst ? 2.5 : 1.5,
        });
      });

      // Hitung lebar kolom label adaptif (fontBold selaras dengan Ditagihkan Kepada)
      const minLabelW = 98; // ~34.5 mm
      const maxLabelW = 114;
      const colonColW = 8;
      const longestSingleLineLabel = Math.max(
        ...effectiveMetaRows.map((m) =>
          fontBold.widthOfTextAtSize(sanitizePdfText(m.label), labelFontSize),
        ),
        minLabelW,
      );
      const labelColW = Math.min(maxLabelW, Math.ceil(longestSingleLineLabel) + 4);
      const valColW = rightColW - labelColW - colonColW;

      const isBoldMetaValue = (label: string): boolean => {
        const norm = label.trim().toLowerCase();
        return (
          norm.includes("status pengesahan") ||
          norm.includes("status verifikasi") ||
          norm.includes("hasil pengujian") ||
          norm.includes("disetujui pada")
        );
      };

      const rightPrepared = effectiveMetaRows.map((m) => {
        const valFont = isBoldMetaValue(m.label) ? fontBold : fontRegular;
        const labelLines = wrapTextByWidth(
          m.label,
          fontBold,
          labelFontSize,
          labelColW,
        );
        const valueLines = wrapTextByWidth(
          m.value || formatDocEmpty(),
          valFont,
          valFontSize,
          valColW,
        );
        const lineCount = Math.max(labelLines.length, valueLines.length, 1);
        return { labelLines, valueLines, lineCount, valFont };
      });

      const leftTotalH = leftPrepared.reduce(
        (sum, item) => sum + item.lines.length * 12.2 + item.gapAfter,
        0,
      );
      const rightTotalH = rightPrepared.reduce(
        (sum, item) => sum + item.lineCount * rowLineH + rowGap,
        0,
      );
      const sectionH = Math.max(leftTotalH, rightTotalH);
      ensureSpace(sectionH + 20);

      const sectionTopY = y;

      // Gambar Kolom Kiri (Penerima)
      let curLeftY = sectionTopY;
      for (const item of leftPrepared) {
        for (const line of item.lines) {
          drawTrackedText(
            line,
            {
              x: marginX,
              y: curLeftY,
              size: item.size,
              font: item.font,
              color: item.color,
            },
            "B-recipient",
          );
          curLeftY -= 12.2;
        }
        curLeftY -= item.gapAfter;
      }

      // Gambar Kolom Kanan (Grid 3 Kolom: Label | : | Nilai)
      let curRightY = sectionTopY;
      const colonX = rightColX + labelColW + 2;
      const valX = rightColX + labelColW + colonColW;

      for (const row of rightPrepared) {
        row.labelLines.forEach((lLine, lIdx) => {
          drawTrackedText(
            lLine,
            {
              x: rightColX,
              y: curRightY - lIdx * rowLineH,
              size: labelFontSize,
              font: fontBold,
              color: TEXT_LABEL,
            },
            "B-meta-label",
          );
        });

        drawTrackedText(
          ":",
          {
            x: colonX,
            y: curRightY,
            size: labelFontSize,
            font: fontBold,
            color: TEXT_LABEL,
          },
          "B-meta-colon",
        );

        row.valueLines.forEach((vLine, vIdx) => {
          drawTrackedText(
            vLine,
            {
              x: valX,
              y: curRightY - vIdx * rowLineH,
              size: valFontSize,
              font: row.valFont,
              color: TEXT_DARK,
            },
            "B-meta-value",
          );
        });

        curRightY -= row.lineCount * rowLineH + rowGap;
      }

      y = Math.min(curLeftY, curRightY) - 4;
    } else if (hasMeta) {
      // Hanya Metadata (misal Kuitansi): Grid 3 Kolom penuh selebar contentWidth
      const minLabelW = 102; // ~36 mm
      const maxLabelW = 128; // ~45 mm
      const colonColW = 12;
      const longestLabel = Math.max(
        ...effectiveMetaRows.map((m) =>
          fontBold.widthOfTextAtSize(sanitizePdfText(m.label), labelFontSize),
        ),
        minLabelW,
      );
      const labelColW = Math.min(maxLabelW, Math.ceil(longestLabel) + 6);
      const valColW = contentWidth - labelColW - colonColW;
      const colonX = marginX + labelColW + 2;
      const valX = marginX + labelColW + colonColW;

      const isBoldMetaValue = (label: string): boolean => {
        const norm = label.trim().toLowerCase();
        return (
          norm.includes("status pengesahan") ||
          norm.includes("status verifikasi") ||
          norm.includes("hasil pengujian") ||
          norm.includes("disetujui pada")
        );
      };

      const prepared = effectiveMetaRows.map((m) => {
        const valFont = isBoldMetaValue(m.label) ? fontBold : fontRegular;
        const labelLines = wrapTextByWidth(
          m.label,
          fontBold,
          labelFontSize,
          labelColW,
        );
        const valueLines = wrapTextByWidth(
          m.value || formatDocEmpty(),
          valFont,
          valFontSize,
          valColW,
        );
        const lineCount = Math.max(labelLines.length, valueLines.length, 1);
        return { labelLines, valueLines, lineCount, valFont };
      });

      const totalH = prepared.reduce(
        (sum, r) => sum + r.lineCount * rowLineH + rowGap,
        0,
      );
      ensureSpace(totalH + 20);

      for (const row of prepared) {
        row.labelLines.forEach((lLine, lIdx) => {
          drawTrackedText(
            lLine,
            {
              x: marginX,
              y: y - lIdx * rowLineH,
              size: labelFontSize,
              font: fontBold,
              color: TEXT_LABEL,
            },
            "B-meta-label",
          );
        });
        drawTrackedText(
          ":",
          {
            x: colonX,
            y,
            size: labelFontSize,
            font: fontBold,
            color: TEXT_LABEL,
          },
          "B-meta-colon",
        );
        row.valueLines.forEach((vLine, vIdx) => {
          drawTrackedText(
            vLine,
            {
              x: valX,
              y: y - vIdx * rowLineH,
              size: valFontSize,
              font: row.valFont,
              color: TEXT_DARK,
            },
            "B-meta-value",
          );
        });
        y -= row.lineCount * rowLineH + rowGap;
      }
      y -= 14;
    } else if (hasRecipient) {
      // Hanya Penerima
      const rawRecipientTitle = (spec.recipientTitle ?? "Kepada Yth.").replace(
        /\s*:\s*$/,
        "",
      );
      ensureSpace(48);
      drawTrackedText(
        rawRecipientTitle,
        {
          x: marginX,
          y,
          size: labelFontSize,
          font: fontBold,
          color: TEXT_LABEL,
        },
        "B-recipient",
      );
      y -= 14;
      spec.recipientLines!.forEach((rLine, idx) => {
        const isFirst = idx === 0;
        const rFont = isFirst ? fontBold : fontRegular;
        const rSize = isFirst ? 10 : valFontSize;
        const wrapped = wrapTextByWidth(rLine, rFont, rSize, contentWidth);
        for (const wLine of wrapped) {
          drawTrackedText(
            wLine,
            {
              x: marginX,
              y,
              size: rSize,
              font: rFont,
              color: TEXT_DARK,
            },
            "B-recipient",
          );
          y -= 13;
        }
      });
      y -= 14;
    }

    // Garis pemisah tipis di bawah Zona B
    page.drawLine({
      start: { x: marginX, y },
      end: { x: pageWidth - marginX, y },
      thickness: 0.5,
      color: BORDER_GRAY,
    });
    // Spasi before tabel disamakan dengan spasi before tabel invoice (12 pt)
    y -= 12;
  }

  // ==========================================================================
  // KOMPONEN 3: PARAGRAF PEMBUKA / NARASI
  // Isi 9.5 pt, line-height 1.45 (~13.8 pt)
  // ==========================================================================
  if (spec.paragraphsBefore && spec.paragraphsBefore.length > 0) {
    const bodySize = PDF_LAYOUT_TOKENS.fontSizes.body; // 9.5 pt
    const bodyLineH = PDF_LAYOUT_TOKENS.lineHeights.body; // 13.8 pt
    const hasTableBelow = Boolean(
      spec.tableColumns &&
      spec.tableColumns.length > 0 &&
      spec.tableRows &&
      spec.tableRows.length > 0,
    );

    spec.paragraphsBefore.forEach((para, pIdx) => {
      const wrapped = wrapTextByWidth(para, fontRegular, bodySize, contentWidth);
      ensureSpace(wrapped.length * bodyLineH + 8);
      for (const line of wrapped) {
        drawTrackedText(
          line,
          {
            x: marginX,
            y,
            size: bodySize,
            font: fontRegular,
            color: TEXT_DARK,
          },
          "C-paragraph",
        );
        y -= bodyLineH;
      }
      const isLastPara = pIdx === spec.paragraphsBefore!.length - 1;
      // Jika di bawahnya ada tabel, spasi after paragraf terakhir adalah 0 sesuai arahan pengguna
      if (!isLastPara) {
        y -= 14;
      } else if (!hasTableBelow) {
        y -= 6;
      }
    });
  }

  // ==========================================================================
  // KOMPONEN 3B: BANNER STATUS (JIKA ADA, MISAL NERACA SALDO)
  // ==========================================================================
  if (spec.bannerBox) {
    const bannerH = 24;
    ensureSpace(bannerH + 10);
    const isSuccess = spec.bannerBox.variant !== "warning" && spec.bannerBox.variant !== "info";
    const bgCol = isSuccess ? rgb(0.92, 0.98, 0.95) : rgb(0.93, 0.96, 1.0);
    const borderCol = isSuccess ? rgb(0.65, 0.90, 0.75) : rgb(0.70, 0.82, 0.98);
    const textCol = isSuccess ? rgb(0.04, 0.45, 0.27) : rgb(0.07, 0.32, 0.65);

    page.drawRectangle({
      x: marginX,
      y: y - bannerH,
      width: contentWidth,
      height: bannerH,
      color: bgCol,
      borderColor: borderCol,
      borderWidth: 0.75,
    });

    drawTrackedText(
      sanitizePdfText(spec.bannerBox.text),
      {
        x: marginX + 10,
        y: y - bannerH + 7,
        size: 9,
        font: fontBold,
        color: textCol,
      },
      "C-banner-box",
    );
    y -= bannerH + 12;
  }

  // ==========================================================================
  // KOMPONEN 4: TABEL RINCIAN (ZONA D)
  // - Header tabel tinggi 28 pt, teks 9.5 pt tebal, latar #f3f4f6.
  // - Hanya garis horizontal tipis antar baris (#e5e7eb), padding vertikal 6 pt.
  // - Header tabel berulang tiap halaman; satu baris tidak terpotong antar halaman.
  // ==========================================================================
  let tableSummaryRenderedInTable = false;

  if (spec.sections && spec.sections.length > 0) {
    tableSummaryRenderedInTable = true;
    const tableSpacing = 12;
    const headerH = 26;
    const headerFontSize = PDF_LAYOUT_TOKENS.fontSizes.tableHeader; // 9.5 pt
    const cellFontSize = PDF_LAYOUT_TOKENS.fontSizes.body; // 9.5 pt
    const cellLineH = 13;
    const cellPadY = 5;

    for (const [secIdx, sec] of spec.sections.entries()) {
      if (sec.pageBreakBefore && secIdx > 0) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        pages.push(page);
        pageIndex = pages.length - 1;
        y = pageHeight - marginTop;
        drawDocumentHeader();
      }

      // Cegah kartu akun terpisah dari tabelnya di batas halaman (Bug c)
      const hasSub = Boolean(sec.subtitle);
      const cardH = sec.title ? (hasSub ? 36 : 24) : 0;
      const minNeededSpace = cardH + headerH + 28;
      if (y - minNeededSpace < bottomSafeY) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        pages.push(page);
        pageIndex = pages.length - 1;
        y = pageHeight - marginTop;
        drawDocumentHeader();
      }

      // Render Kartu Akun / Header Seksi jika ada
      if (sec.title) {
        const cardTopY = y;
        const cardBottomY = cardTopY - cardH;
        page.drawRectangle({
          x: marginX,
          y: cardBottomY,
          width: contentWidth,
          height: cardH,
          color: CHIP_BG,
          borderColor: BORDER_GRAY,
          borderWidth: 0.75,
        });

        if (hasSub) {
          // Dua baris (Judul Akun & Subtitle): posisi vertikal seimbang sempurna (align center)
          drawTrackedText(
            sanitizePdfText(sec.title),
            {
              x: marginX + 10,
              y: cardTopY - 14,
              size: 9.5,
              font: fontBold,
              color: TEXT_DARK,
            },
            "D-sec-title",
          );

          drawTrackedText(
            sanitizePdfText(sec.subtitle!),
            {
              x: marginX + 10,
              y: cardTopY - 26,
              size: 8,
              font: fontRegular,
              color: TEXT_LABEL,
            },
            "D-sec-sub",
          );
        } else {
          // Satu baris: teks di tengah vertikal kotak (align center)
          drawTrackedText(
            sanitizePdfText(sec.title),
            {
              x: marginX + 10,
              y: cardBottomY + (cardH - 9.5) / 2 + 1,
              size: 9.5,
              font: fontBold,
              color: TEXT_DARK,
            },
            "D-sec-title",
          );
        }

        if (sec.badge) {
          const badgeText = sanitizePdfText(sec.badge);
          const badgeW = fontBold.widthOfTextAtSize(badgeText, 10.5);
          const badgeLabel = isEnPdf ? "Ending Balance" : "Saldo Akhir";
          drawTrackedText(
            badgeLabel,
            {
              x: pageWidth - marginX - 10 - fontRegular.widthOfTextAtSize(badgeLabel, 7.5),
              y: cardTopY - 14,
              size: 7.5,
              font: fontRegular,
              color: TEXT_LABEL,
            },
            "D-sec-badge-lbl",
          );
          drawTrackedText(
            badgeText,
            {
              x: pageWidth - marginX - 10 - badgeW,
              y: cardTopY - 26,
              size: 10.5,
              font: fontBold,
              color: BRAND_BLUE,
            },
            "D-sec-badge-val",
          );
        }

        y = cardBottomY - 6;
      }

      // Render Tabel untuk seksi ini
      const cols = sec.tableColumns;
      const totalRatio = cols.reduce((s, c) => s + c.widthRatio, 0) || 1;
      const colWidths = cols.map((c) => (c.widthRatio / totalRatio) * contentWidth);

      const drawSectionTableHeader = () => {
        const headerTopY = y;
        const rectBottomY = headerTopY - headerH;
        page.drawRectangle({
          x: marginX,
          y: rectBottomY,
          width: contentWidth,
          height: headerH,
          color: CHIP_BG,
        });
        page.drawLine({
          start: { x: marginX, y: headerTopY },
          end: { x: pageWidth - marginX, y: headerTopY },
          thickness: 0.75,
          color: BORDER_GRAY,
        });
        page.drawLine({
          start: { x: marginX, y: rectBottomY },
          end: { x: pageWidth - marginX, y: rectBottomY },
          thickness: 0.75,
          color: BORDER_GRAY,
        });

        let colX = marginX;
        const textBaselineY = rectBottomY + (headerH - headerFontSize) / 2 + 1;
        cols.forEach((col, idx) => {
          const w = colWidths[idx]!;
          const headerClean = sanitizePdfText(col.header);

          // Semua header kolom memakai ukuran dan bobot yang sama seragam tanpa penyusutan font
          const size = headerFontSize;
          const textW = fontBold.widthOfTextAtSize(headerClean, size);

          const hAlign = col.headerAlign ?? col.align;
          let drawX = colX + 4;
          if (hAlign === "right") {
            drawX = Math.max(colX + 4, colX + w - textW - 4);
          } else if (hAlign === "center") {
            drawX = Math.max(colX + 4, colX + (w - textW) / 2);
          }
          drawTrackedText(
            headerClean,
            {
              x: drawX,
              y: textBaselineY,
              size,
              font: fontBold,
              color: TEXT_DARK,
            },
            "D-sec-th",
          );
          colX += w;
        });

        y = rectBottomY - cellPadY - 9;
      };

      drawSectionTableHeader();

      if (sec.tableRows.length === 0) {
        const emptyH = 24;
        const emptyTopY = y + cellPadY + 9;
        const emptyBottomY = emptyTopY - emptyH;
        const emptyText = isEnPdf
          ? "No transactions for this account in the selected period"
          : "Tidak ada transaksi pada akun ini dalam periode yang dipilih";
        const emptyTextW = fontRegular.widthOfTextAtSize(emptyText, cellFontSize);
        drawTrackedText(
          emptyText,
          {
            x: marginX + (contentWidth - emptyTextW) / 2,
            y: emptyBottomY + (emptyH - cellFontSize) / 2,
            size: cellFontSize,
            font: fontRegular,
            color: TEXT_LABEL,
          },
          "D-sec-empty",
        );
        page.drawLine({
          start: { x: marginX, y: emptyBottomY },
          end: { x: pageWidth - marginX, y: emptyBottomY },
          thickness: 0.4,
          color: BORDER_GRAY,
        });
        y = emptyBottomY - tableSpacing;
      } else {
        let lastRowBottomLineY = y;
        const isLedgerDoc = /BUKU BESAR|GENERAL LEDGER/i.test(spec.docTitle ?? "");
        const isAccountingDoc = isAccountingCycleOrFinancialReport(spec.docTitle);
        for (const row of sec.tableRows) {
          const isBoldRow = isAccountingDoc && !isLedgerDoc && isRowUppercase(row);
          const rowFont = isBoldRow ? fontBold : fontRegular;
          const colWrappedLines: string[][] = row.map((cellText, colIdx) => {
            const w = colWidths[colIdx]! - 16;
            return wrapTextByWidth(cellText || "-", rowFont, cellFontSize, Math.max(w, 20));
          });
          const maxLines = Math.max(...colWrappedLines.map((lines) => lines.length), 1);
          const rowContentH = maxLines * cellLineH;
          const rowTotalH = rowContentH + cellPadY * 2;

          if (y - rowTotalH < bottomSafeY) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            pages.push(page);
            pageIndex = pages.length - 1;
            y = pageHeight - marginTop;
            drawDocumentHeader();
            drawSectionTableHeader();
          }

          const rowTopY = y + cellPadY + 9;
          const rowBottomY = rowTopY - rowTotalH;

          let colX = marginX;
          cols.forEach((col, cIdx) => {
            const w = colWidths[cIdx]!;
            const lines = colWrappedLines[cIdx] || ["-"];
            lines.forEach((lineText, lIdx) => {
              const lineClean = sanitizePdfText(lineText);
              const textW = rowFont.widthOfTextAtSize(lineClean, cellFontSize);
              let drawX = colX + 8;
              if (col.align === "right") {
                drawX = Math.max(colX + 8, colX + w - textW - 8);
              } else if (col.align === "center") {
                drawX = Math.max(colX + 8, colX + (w - textW) / 2);
              }
              const lineY = rowTopY - cellPadY - 9 - lIdx * cellLineH;
              drawTrackedText(
                lineClean,
                {
                  x: drawX,
                  y: lineY,
                  size: cellFontSize,
                  font: rowFont,
                  color: TEXT_DARK,
                },
                "D-sec-cell",
              );
            });
            colX += w;
          });

          page.drawLine({
            start: { x: marginX, y: rowBottomY },
            end: { x: pageWidth - marginX, y: rowBottomY },
            thickness: 0.4,
            color: BORDER_GRAY,
          });

          y = rowBottomY - cellPadY - 9;
          lastRowBottomLineY = rowBottomY;
        }

        y = lastRowBottomLineY - tableSpacing;
      }

      // Spasi antar blok akun di Buku Besar (Bug c)
      y -= 6;
    }
  } else if (
    spec.tableColumns &&
    spec.tableColumns.length > 0 &&
    spec.tableRows !== undefined
  ) {
    const specRecord = spec as { language?: string; lang?: string };
    const isEn = Boolean(
      specRecord.language?.startsWith("en") ||
        specRecord.lang === "en" ||
        getActiveLanguage() === "en",
    );
    const stdCols = getTableColumnsConfig(spec.docTitle, isEn);
    const rawCols = stdCols && stdCols.length === spec.tableColumns.length ? stdCols : spec.tableColumns;
    const cols = rawCols.map((col) => ({
      ...col,
      header: col.header.replace(/\s*\/\s*/g, " "),
    }));
    const totalRatio = cols.reduce((s, c) => s + c.widthRatio, 0) || 1;
    const colWidths = cols.map((c) => (c.widthRatio / totalRatio) * contentWidth);
    // Spasi before & after tabel disamakan dengan tabel invoice (12 pt)
    const tableSpacing = 12;
    const headerH = 28;
    const headerFontSize = PDF_LAYOUT_TOKENS.fontSizes.tableHeader; // 9.5 pt
    const cellFontSize = PDF_LAYOUT_TOKENS.fontSizes.body; // 9.5 pt
    const cellLineH = 13;
    const cellPadY = 6;
    const docUpper = spec.docTitle.toUpperCase();
    const isJournal =
      docUpper.includes("JURNAL") ||
      docUpper.includes("JOURNAL") ||
      docUpper.includes("GENERAL JOURNAL") ||
      docUpper.includes("ADJUSTING") ||
      docUpper.includes("CLOSING");

    const drawTableHeader = () => {
      const headerTopY = y;
      const rectBottomY = headerTopY - headerH;
      page.drawRectangle({
        x: marginX,
        y: rectBottomY,
        width: contentWidth,
        height: headerH,
        color: CHIP_BG,
      });
      page.drawLine({
        start: { x: marginX, y: headerTopY },
        end: { x: pageWidth - marginX, y: headerTopY },
        thickness: 0.75,
        color: BORDER_GRAY,
      });
      page.drawLine({
        start: { x: marginX, y: rectBottomY },
        end: { x: pageWidth - marginX, y: rectBottomY },
        thickness: 0.75,
        color: BORDER_GRAY,
      });

      let colX = marginX;
      const textBaselineY = rectBottomY + (headerH - headerFontSize) / 2 + 1;
      cols.forEach((col, idx) => {
        const w = colWidths[idx]!;
        const headerClean = sanitizePdfText(col.header);

        // Semua header kolom memakai ukuran dan bobot yang sama seragam tanpa penyusutan font
        const size = headerFontSize;
        const textW = fontBold.widthOfTextAtSize(headerClean, size);

        const hAlign = col.headerAlign ?? (isJournal ? "center" : col.align);
        let drawX = colX + 4;
        if (hAlign === "right") {
          drawX = Math.max(colX + 4, colX + w - textW - 4);
        } else if (hAlign === "center") {
          drawX = colX + (w - textW) / 2;
        }
        drawTrackedText(
          headerClean,
          {
            x: drawX,
            y: textBaselineY,
            size,
            font: fontBold,
            color: TEXT_DARK,
          },
          "D-table-header",
        );
        colX += w;
      });

      y = rectBottomY - cellPadY - 9;
    };

    // Deteksi apakah dokumen memiliki baris total yang harus menjadi baris terakhir tabel (Poin 2 - 7)
    const isQuotation = docUpper.includes("QUOTATION") || docUpper.includes("PENAWARAN");
    const isClientPo =
      docUpper.includes("PURCHASE ORDER") &&
      (docUpper.includes("KLIEN") || Boolean((spec as { isClientPo?: boolean }).isClientPo) || Boolean(spec.clientLogoUrl));
    const isVendorPo =
      docUpper.includes("PURCHASE ORDER") && (docUpper.includes("VENDOR") || !isClientPo);
    const isPaymentApproval =
      docUpper.includes("PAYMENT APPROVAL") || docUpper.includes("PERSETUJUAN PEMBAYARAN");
    const isJtpp = docUpper.includes("JTPP") || docUpper.includes("JADWAL TERMIN");

    let tableSummaryTargetColIdx = -1;
    let tableSummaryLabel = "";
    let tableSummaryValue = "";

    if (spec.summaryRows && spec.summaryRows.length > 0) {
      if (isQuotation) {
        // Poin 2 & 3: "Total Penawaran Harga" / "Total Nilai Termin" pada Quotation -> kolom "Biaya (IDR)"
        const found =
          spec.summaryRows.find(
            (s) =>
              /total\s+penawaran\s+harga/i.test(s.label) ||
              /total\s+nilai\s+termin/i.test(s.label),
          ) ?? spec.summaryRows[0];
        if (found) {
          tableSummaryLabel = found.label;
          tableSummaryValue = found.value;
          tableSummaryTargetColIdx = cols.findIndex((c) => /biaya/i.test(c.header));
          if (tableSummaryTargetColIdx === -1) tableSummaryTargetColIdx = cols.length - 1;
        }
      } else if (isClientPo) {
        // Poin 4: "Total Nilai Purchase Order" pada PO Klien -> kolom "Subtotal (IDR)"
        const found =
          spec.summaryRows.find(
            (s) =>
              /total\s+nilai\s+purchase\s+order/i.test(s.label) ||
              /total\s+nilai\s+po/i.test(s.label) ||
              /total/i.test(s.label),
          ) ?? spec.summaryRows[0];
        if (found) {
          tableSummaryLabel = "Total Nilai Purchase Order";
          tableSummaryValue = found.value;
          tableSummaryTargetColIdx = cols.findIndex((c) => /subtotal/i.test(c.header));
          if (tableSummaryTargetColIdx === -1) tableSummaryTargetColIdx = cols.length - 1;
        }
      } else if (isVendorPo) {
        // Poin 5: "Total Nilai PO" pada PO Vendor -> kolom "Subtotal (IDR)"
        const found =
          spec.summaryRows.find(
            (s) => /total\s+nilai\s+po/i.test(s.label) || /total/i.test(s.label),
          ) ?? spec.summaryRows[0];
        if (found) {
          tableSummaryLabel = "Total Nilai PO";
          tableSummaryValue = found.value;
          tableSummaryTargetColIdx = cols.findIndex((c) => /subtotal/i.test(c.header));
          if (tableSummaryTargetColIdx === -1) tableSummaryTargetColIdx = cols.length - 1;
        }
      } else if (isPaymentApproval) {
        // Poin 6: "Total Biaya Diajukan" pada Payment Approval -> kolom "Nominal (IDR)"
        const found =
          spec.summaryRows.find(
            (s) => /total\s+biaya\s+diajukan/i.test(s.label) || /total/i.test(s.label),
          ) ?? spec.summaryRows[0];
        if (found) {
          tableSummaryLabel = "Total Biaya Diajukan";
          tableSummaryValue = found.value;
          tableSummaryTargetColIdx = cols.findIndex((c) => /nominal/i.test(c.header));
          if (tableSummaryTargetColIdx === -1) tableSummaryTargetColIdx = cols.length - 1;
        }
      } else if (isJtpp) {
        // Poin 7: "Total Nilai Termin" pada JTPP -> kolom "Nominal (IDR)"
        const found =
          spec.summaryRows.find(
            (s) => /total\s+nilai\s+termin/i.test(s.label) || /total/i.test(s.label),
          ) ?? spec.summaryRows[0];
        if (found) {
          tableSummaryLabel = "Total Nilai Termin";
          tableSummaryValue = found.value;
          tableSummaryTargetColIdx = cols.findIndex((c) => /nominal/i.test(c.header));
          if (tableSummaryTargetColIdx === -1) tableSummaryTargetColIdx = cols.length - 1;
        }
      }
    }

    tableSummaryRenderedInTable = false;

    // Pastikan ruang cukup untuk header tabel + minimal 1 baris pertama
    ensureSpace(headerH + 36);
    drawTableHeader();

    let lastRowBottomLineY = y;

    if (spec.tableRows.length === 0) {
      const emptyH = 26;
      const emptyTopY = y + cellPadY + 9;
      const emptyBottomY = emptyTopY - emptyH;
      const emptyText = isEn
        ? "No transactions in this period"
        : "Tidak ada transaksi pada periode ini";
      const emptyTextW = fontRegular.widthOfTextAtSize(emptyText, cellFontSize);
      drawTrackedText(
        emptyText,
        {
          x: marginX + (contentWidth - emptyTextW) / 2,
          y: emptyBottomY + (emptyH - cellFontSize) / 2,
          size: cellFontSize,
          font: fontRegular,
          color: TEXT_LABEL,
        },
        "D-table-empty",
      );
      page.drawLine({
        start: { x: marginX, y: emptyBottomY },
        end: { x: pageWidth - marginX, y: emptyBottomY },
        thickness: 0.4,
        color: BORDER_GRAY,
      });
      lastRowBottomLineY = emptyBottomY;
      y = emptyBottomY - tableSpacing;
    } else {
      const isJournal =
        docUpper.includes("JURNAL") ||
        docUpper.includes("GENERAL JOURNAL") ||
        docUpper.includes("ADJUSTING") ||
        docUpper.includes("CLOSING");
      const isAccountingDoc = isAccountingCycleOrFinancialReport(spec.docTitle);
      for (let rIdx = 0; rIdx < spec.tableRows.length; rIdx++) {
        const row = spec.tableRows[rIdx]!;
        const isBoldRow = isAccountingDoc && isRowUppercase(row);
        const rowFont = isBoldRow ? fontBold : fontRegular;

        const wrappedCells = cols.map((col, idx) => {
          const rawCell = row[idx] ?? "";
          const cleanCell = col.align === "right" ? stripCurrencySymbol(rawCell) : rawCell;
          return wrapTextByWidth(
            cleanCell,
            rowFont,
            cellFontSize,
            colWidths[idx]! - 16,
          );
        });
        const maxLines = Math.max(...wrappedCells.map((c) => c.length), 1);
        const rowContentH = (maxLines - 1) * cellLineH + cellFontSize;
        const totalRowH = rowContentH + cellPadY * 2;

        // Jika baris tidak muat di halaman ini, buat halaman baru dan ulangi Header Dokumen + Header Tabel
        if (y - rowContentH - cellPadY < bottomSafeY) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          pages.push(page);
          pageIndex = pages.length - 1;
          y = pageHeight - marginTop;
          drawDocumentHeader();
          drawTableHeader();
        }

        let cellX = marginX;
        cols.forEach((col, idx) => {
          const w = colWidths[idx]!;
          const rawCell = row[idx] ?? "";
          const lines = wrappedCells[idx] ?? [""];
          lines.forEach((l, lIdx) => {
            const cleanL = sanitizePdfText(l);
            const textW = rowFont.widthOfTextAtSize(cleanL, cellFontSize);
            let drawX = cellX + 8;
            if (col.align === "right") {
              drawX = Math.max(cellX + 8, cellX + w - textW - 8);
            } else if (col.align === "center") {
              drawX = Math.max(cellX + 8, cellX + (w - textW) / 2);
            }
            const isSecondaryLine =
              lIdx > 0 &&
              (rawCell.includes("\n") || /bank|rekening|account|pic|kontak|contact/i.test(col.header));
            const isJournalMemo =
              isJournal &&
              rawCell.trim().startsWith("(") &&
              (rawCell.trim().endsWith(")") || row[3] === "" || row[4] === "");
            drawTrackedText(
              cleanL,
              {
                x: drawX,
                y: y - lIdx * cellLineH,
                size: cellFontSize,
                font: isJournalMemo ? fontOblique : rowFont,
                color: isJournalMemo ? BRAND_BLUE : (isSecondaryLine ? TEXT_MUTED : TEXT_DARK),
              },
              "D-table-cell",
            );
          });
          cellX += w;
        });

        const nextRow = spec.tableRows[rIdx + 1];
        const isInsideJournalTx =
          isJournal &&
          nextRow &&
          nextRow[0] === "" &&
          !nextRow[1]?.toUpperCase().includes("TOTAL");

        if (!isInsideJournalTx) {
          const bottomLineY = y - (maxLines - 1) * cellLineH - cellPadY;
          page.drawLine({
            start: { x: marginX, y: bottomLineY },
            end: { x: pageWidth - marginX, y: bottomLineY },
            thickness: 0.5,
            color: BORDER_GRAY,
          });

          lastRowBottomLineY = bottomLineY;
          y = bottomLineY - cellPadY - 9;
        } else {
          // Di dalam transaksi jurnal yang sama: jarak antar-baris rapat tanpa garis pemisah
          y = y - (maxLines - 1) * cellLineH - cellLineH - 1;
        }
        void totalRowH;
      }
    }

    // Baris Total pada baris terakhir tabel (Poin 4: Menyatu utuh tanpa gap dengan baris di atasnya)
    if (tableSummaryTargetColIdx !== -1 && tableSummaryLabel && tableSummaryValue) {
      tableSummaryRenderedInTable = true;
      const summaryRowH = 22;
      if (y - summaryRowH < bottomSafeY) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        pages.push(page);
        pageIndex = pages.length - 1;
        y = pageHeight - marginTop;
        drawDocumentHeader();
        drawTableHeader();
        lastRowBottomLineY = y + cellPadY + 9;
      }

      // Baris total menyatu tepat di bawah baris data terakhir tanpa gap pemisah
      const rectTopY = lastRowBottomLineY;
      const rectBottomY = rectTopY - summaryRowH;
      page.drawRectangle({
        x: marginX,
        y: rectBottomY,
        width: contentWidth,
        height: summaryRowH,
        color: CHIP_BG,
      });

      // Garis penutup bawah tabel
      page.drawLine({
        start: { x: marginX, y: rectBottomY },
        end: { x: pageWidth - marginX, y: rectBottomY },
        thickness: 0.75,
        color: BORDER_GRAY,
      });

      // Kolom 0: Label (align center vertikal terhadap baris total)
      const cleanSummLbl = sanitizePdfText(tableSummaryLabel);
      drawTrackedText(
        cleanSummLbl,
        {
          x: marginX + 8,
          y: rectBottomY + (summaryRowH - cellFontSize) / 2 + 1,
          size: cellFontSize,
          font: fontBold,
          color: TEXT_DARK,
        },
        "D-table-total-label",
      );

      // Kolom target: Nilai (tanpa simbol Rp, align center vertikal terhadap baris total)
      let targetColX = marginX;
      for (let i = 0; i < tableSummaryTargetColIdx; i++) {
        targetColX += colWidths[i]!;
      }
      const targetColW = colWidths[tableSummaryTargetColIdx]!;
      const cleanSummVal = sanitizePdfText(stripCurrencySymbol(tableSummaryValue));
      const valW = fontBold.widthOfTextAtSize(cleanSummVal, cellFontSize);
      drawTrackedText(
        cleanSummVal,
        {
          x: targetColX + targetColW - valW - 8,
          y: rectBottomY + (summaryRowH - cellFontSize) / 2 + 1,
          size: cellFontSize,
          font: fontBold,
          color: TEXT_DARK,
        },
        "D-table-total-value",
      );

      // Spasi after tabel sama dengan spasi before tabel (Poin 3: 10 pt)
      y = rectBottomY - tableSpacing;
    } else {
      // Spasi after tabel sama dengan spasi before tabel (Poin 3: 10 pt)
      y = lastRowBottomLineY - tableSpacing;
    }
  }

  // ==========================================================================
  // KOMPONEN 5: BLOK TOTAL & TERBILANG (ZONA E)
  // - Blok selebar 45% di kanan: label kiri, nilai kanan, garis di atas baris total,
  //   baris total tebal & lebih besar.
  // - Terbilang ditulis di bawahnya (tanpa "# ... #" pada Invoice, Quotation, PO;
  //   dipertahankan pada Kuitansi sesuai Keputusan K-02).
  // ==========================================================================
  const hasSummary = Boolean(spec.summaryRows && spec.summaryRows.length > 0);
  const hasTerbilang = typeof spec.terbilangAmount === "number";
  const isInvoiceDoc =
    spec.docTitle.toUpperCase().includes("INVOICE") || Boolean(spec.paymentDetail);

  if (isInvoiceDoc && (hasSummary || Boolean(spec.paymentDetail))) {
    const totalBlockW = 215;
    const totalBlockX = pageWidth - marginX - totalBlockW;
    const rightEdgeX = pageWidth - marginX;
    const gap = 12;
    const keteranganX = marginX;
    const keteranganW = totalBlockX - marginX - gap;

    const allSummaryRows = spec.summaryRows ?? [];
    const summaryFontSize = 9.5;
    const rowPitch = 15.5;
    const summaryBlockH = Math.max(allSummaryRows.length * rowPitch + 4, 60);

    ensureSpace(summaryBlockH + (spec.paymentDetail ? 75 : 0) + 15);

    const blockTopY = y;
    const blockBottomY = blockTopY - summaryBlockH;

    // 1. Kotak Keterangan di sebelah kiri blok total (tinggi sejajar dengan blok total, sudut kaku/sharp 0)
    drawRoundedRect(
      page,
      keteranganX,
      blockTopY,
      keteranganW,
      summaryBlockH,
      0,
      { borderWidth: 0.5, borderColor: BORDER_GRAY },
    );
    drawTrackedText(
      "Keterangan",
      {
        x: keteranganX + 10,
        y: blockTopY - 13,
        size: 9.5,
        font: fontBold,
        color: TEXT_DARK,
      },
      "E-keterangan-title",
    );

    if (spec.documentNotes && spec.documentNotes.trim()) {
      const noteLines = wrapTextByWidth(
        spec.documentNotes.trim(),
        fontRegular,
        9.5,
        keteranganW - 20,
      );
      noteLines.slice(0, 4).forEach((nLine, nIdx) => {
        drawTrackedText(
          nLine,
          {
            x: keteranganX + 10,
            y: blockTopY - 26 - nIdx * 12.5,
            size: 9.5,
            font: fontRegular,
            color: TEXT_DARK,
          },
          "E-keterangan-content",
        );
      });
    }

    // 2. Blok Subtotal dan Total di sebelah kanan (label tebal seragam, nilai hitam seragam)
    let curSummaryY = blockTopY - 11;
    allSummaryRows.forEach((row) => {
      const isGrandTotal =
        /^total\s+tagihan\s+invoice/i.test(row.label.trim()) ||
        (/^total\b/i.test(row.label.trim()) && !/kontrak/i.test(row.label));
      const rowFont = isGrandTotal ? fontBold : fontRegular;
      const labelFont = fontBold;
      const labelColor = isGrandTotal ? TEXT_DARK : TEXT_LABEL;

      const cleanLabel = sanitizePdfText(row.label);
      const cleanVal = sanitizePdfText(stripCurrencySymbol(row.value));
      const valW = rowFont.widthOfTextAtSize(cleanVal, summaryFontSize);

      drawTrackedText(
        cleanLabel,
        {
          x: totalBlockX,
          y: curSummaryY,
          size: summaryFontSize,
          font: labelFont,
          color: labelColor,
        },
        "E-total-label",
      );
      drawTrackedText(
        cleanVal,
        {
          x: rightEdgeX - valW,
          y: curSummaryY,
          size: summaryFontSize,
          font: rowFont,
          color: TEXT_DARK,
        },
        "E-total-value",
      );

      // Garis tipis pemisah yang sama di bawah tiap baris
      const lineY = curSummaryY - 4;
      page.drawLine({
        start: { x: totalBlockX, y: lineY },
        end: { x: rightEdgeX, y: lineY },
        thickness: 0.4,
        color: BORDER_GRAY,
      });

      curSummaryY -= rowPitch;
    });

    y = blockBottomY - 10;

    // 3. Kotak Detail Pembayaran (Payment Detail)
    if (spec.paymentDetail) {
      const pd = spec.paymentDetail;
      const pdBoxW = contentWidth;
      const pdBoxH = 76;
      ensureSpace(pdBoxH + 15);
      const pdBoxTopY = y;
      const pdBoxBottomY = pdBoxTopY - pdBoxH;

      drawRoundedRect(
        page,
        marginX,
        pdBoxTopY,
        pdBoxW,
        pdBoxH,
        0,
        { borderWidth: 0.5, borderColor: BORDER_GRAY },
      );

      // Header Detail Pembayaran
      drawTrackedText(
        isEnPdf ? "Payment Details" : "Detail Pembayaran",
        {
          x: marginX + 10,
          y: pdBoxTopY - 12,
          size: 9.5,
          font: fontBold,
          color: TEXT_DARK,
        },
        "E-pd-title",
      );

      // Garis pemisah di bawah judul
      const pdDividerY = pdBoxTopY - 18;
      page.drawLine({
        start: { x: marginX + 8, y: pdDividerY },
        end: { x: rightEdgeX - 8, y: pdDividerY },
        thickness: 0.4,
        color: BORDER_GRAY,
      });

      // Kolom Kanan Info Bank sejajar dengan posisi teks blok subtotal (totalBlockX)
      const rightColX = totalBlockX;
      const rightColTopY = pdDividerY - 11;
      const bLabelW = 82;

      // Kolom Kiri: Terbilang (Nilai wajib UPPERCASE / KAPITAL semua, warna hitam TEXT_DARK)
      const leftColX = marginX + 10;
      const leftColW = rightColX - leftColX - 16;
      const leftColTopY = pdDividerY - 11;
      drawTrackedText(
        isEnPdf ? "Amount in Words" : "Terbilang",
        {
          x: leftColX,
          y: leftColTopY,
          size: 9.5,
          font: fontBold,
          color: TEXT_LABEL,
        },
        "E-pd-terbilang-lbl",
      );
      const terbilangUpper = sanitizePdfText(pd.terbilangText.toUpperCase());
      const tLines = wrapTextByWidth(terbilangUpper, fontRegular, 9.5, leftColW);
      tLines.slice(0, 3).forEach((tLine, tIdx) => {
        drawTrackedText(
          tLine,
          {
            x: leftColX,
            y: leftColTopY - 12 - tIdx * 11.5,
            size: 9.5,
            font: fontRegular,
            color: TEXT_DARK,
          },
          "E-pd-terbilang-val",
        );
      });

      const bankItems: Array<{ label: string; value: string }> = [
        { label: isEnPdf ? "Bank Name" : "Nama Bank", value: pd.bankName },
        { label: isEnPdf ? "Account Number" : "Nomor Rekening", value: pd.accountNumber },
        { label: isEnPdf ? "Account Holder" : "Atas Nama", value: pd.accountHolder },
        { label: isEnPdf ? "Transfer Reference" : "Berita Transfer", value: pd.transferNews },
      ];
      if (pd.isPaid) {
        bankItems.push({ label: isEnPdf ? "Status" : "Status", value: isEnPdf ? "PAID" : "LUNAS" });
      }
      if (pd.swiftCode) {
        bankItems.push({ label: "Swift Code", value: pd.swiftCode });
      }

      let bCursorY = rightColTopY;
      bankItems.slice(0, 4).forEach((bItem) => {
        drawTrackedText(
          bItem.label,
          {
            x: rightColX,
            y: bCursorY,
            size: 9.5,
            font: fontBold,
            color: TEXT_LABEL,
          },
          "E-pd-bank-lbl",
        );
        drawTrackedText(
          ":",
          {
            x: rightColX + bLabelW,
            y: bCursorY,
            size: 9.5,
            font: fontBold,
            color: TEXT_LABEL,
          },
          "E-pd-bank-colon",
        );
        drawTrackedText(
          bItem.value,
          {
            x: rightColX + bLabelW + 6,
            y: bCursorY,
            size: 9.5,
            font: fontRegular,
            color: TEXT_DARK,
          },
          "E-pd-bank-val",
        );
        bCursorY -= 12;
      });

      // Jarak lega ke blok seksi berikutnya agar tidak menabrak kotak
      y = pdBoxBottomY - 14;
    }
  } else if (hasSummary || hasTerbilang) {
    const totalBlockW = Math.round(contentWidth * 0.45); // ~222 pt
    const totalBlockX = pageWidth - marginX - totalBlockW;
    const rightEdgeX = pageWidth - marginX;

    // Pisahkan baris perhitungan tagihan utama vs baris informasi kontrak tambahan
    const isContractInfoRow = (label: string) =>
      /kontrak|sebelumnya|berjalan|estimasi/i.test(label) &&
      !/^total\s+(nilai\s+purchase\s+order|nilai\s+po|penawaran|biaya|nilai\s+termin|tagihan)/i.test(
        label.trim(),
      );

    const primaryRows = (spec.summaryRows ?? []).filter(
      (r) => !isContractInfoRow(r.label),
    );
    const secondaryRows = (spec.summaryRows ?? []).filter((r) =>
      isContractInfoRow(r.label),
    );

    const isReceiptDoc =
      spec.docTitle.toUpperCase().includes("KUITANSI") ||
      spec.docTitle.toUpperCase().includes("RECEIPT");

    if (isReceiptDoc) {
      // Kuitansi: "Jumlah Diterima" dan "Terbilang" dibungkus dalam SATU KOTAK ABU selebar konten, rata tengah, tanpa garis hitam di atasnya, tanpa "# ... #"
      const receiptAmountVal = sanitizePdfText(
        stripCurrencySymbol(primaryRows[0]?.value ?? ""),
      );
      const rawTerbilang = spec.terbilangAmount
        ? terbilangRupiah(spec.terbilangAmount, isEnPdf ? "en" : "id").toUpperCase()
        : "";

      const boxW = contentWidth;
      const terbStr = isEnPdf
        ? `In words : ${rawTerbilang}`
        : `Terbilang : ${rawTerbilang}`;
      const terbSize = 8.5;
      const maxTerbW = boxW - 24;
      const terbLines = wrapTextByWidth(terbStr, fontBold, terbSize, maxTerbW);
      const amtStr = isEnPdf
        ? `Amount Received : ${receiptAmountVal}`
        : `Jumlah Diterima : ${receiptAmountVal}`;
      const amtSize = 11;
      const interLineGap = 6;
      const contentH = amtSize + interLineGap + terbLines.length * 12;
      const boxH = Math.max(50, contentH + 16);
      ensureSpace(boxH + 20);

      const boxTopY = y;
      const boxBottomY = boxTopY - boxH;

      page.drawRectangle({
        x: marginX,
        y: boxBottomY,
        width: boxW,
        height: boxH,
        color: CHIP_BG,
      });

      // Baris 1: "Jumlah Diterima : {nominal}" (align center vertikal & horizontal terhadap box)
      const topPad = (boxH - contentH) / 2;
      const amtY = boxTopY - topPad - amtSize + 1;
      const amtW = fontBold.widthOfTextAtSize(amtStr, amtSize);
      const amtX = marginX + (boxW - amtW) / 2;
      drawTrackedText(
        amtStr,
        {
          x: amtX,
          y: amtY,
          size: amtSize,
          font: fontBold,
          color: TEXT_DARK,
        },
        "E-receipt-amount",
      );

      // Baris Terbilang (align center horizontal di bawah Jumlah Diterima)
      terbLines.forEach((tLine, tIdx) => {
        const tw = fontBold.widthOfTextAtSize(tLine, terbSize);
        const tx = marginX + (boxW - tw) / 2;
        drawTrackedText(
          tLine,
          {
            x: tx,
            y: amtY - 14 - tIdx * 12,
            size: terbSize,
            font: fontBold,
            color: TEXT_DARK,
          },
          "E-receipt-terbilang",
        );
      });

      y = boxBottomY - 16;
    } else if (tableSummaryRenderedInTable) {
      // Total sudah menjadi baris terakhir tabel (Poin 2 - 7); hanya render Terbilang bila ada
      const terbilangStr = hasTerbilang
        ? isEnPdf
          ? `In words: ${terbilangRupiah(spec.terbilangAmount!, "en").toUpperCase()}`
          : `Terbilang: ${terbilangRupiah(spec.terbilangAmount!).toUpperCase()}`
        : null;
      const terbilangLines = terbilangStr
        ? wrapTextByWidth(terbilangStr, fontBold, 9.5, contentWidth)
        : [];

      if (terbilangLines.length > 0) {
        ensureSpace(terbilangLines.length * 13 + 16);
        // Teks Terbilang tidak lagi mepet dengan tabel (spasi after tabel sama dengan invoice: visual 12.5 pt)
        y -= 8;
        for (const tLine of terbilangLines) {
          drawTrackedText(
            tLine,
            {
              x: marginX,
              y,
              size: 9.5,
              font: fontBold,
              color: TEXT_DARK,
            },
            "E-terbilang",
          );
          y -= 13;
        }
        y -= 10;
      }
    } else {
      const terbilangStr = hasTerbilang
        ? isEnPdf
          ? `In words: ${terbilangRupiah(spec.terbilangAmount!, "en").toUpperCase()}`
          : `Terbilang: ${terbilangRupiah(spec.terbilangAmount!).toUpperCase()}`
        : null;
      const terbilangLines = terbilangStr
        ? wrapTextByWidth(terbilangStr, fontBold, 9.5, contentWidth)
        : [];

      const neededH =
        primaryRows.length * 18 +
        (secondaryRows.length > 0 ? secondaryRows.length * 14 + 12 : 0) +
        (terbilangLines.length > 0 ? terbilangLines.length * 13 + 12 : 0) +
        8;
      ensureSpace(neededH);

      // Render baris perhitungan utama
      primaryRows.forEach((row, idx) => {
        const isGrandTotal =
          idx === primaryRows.length - 1 ||
          /^total\b/i.test(row.label.trim());

        if (isGrandTotal) {
          page.drawLine({
            start: { x: totalBlockX, y: y + 11 },
            end: { x: rightEdgeX, y: y + 11 },
            thickness: 0.75,
            color: TEXT_DARK,
          });
          y -= 2;
        }

        const rowFont = isGrandTotal ? fontBold : fontRegular;
        const labelSize = 9.5;
        const valSize = 9.5;
        const labelColor = isGrandTotal ? TEXT_DARK : TEXT_LABEL;

        const cleanLabel = sanitizePdfText(row.label);
        const cleanVal = sanitizePdfText(stripCurrencySymbol(row.value));
        const valW = rowFont.widthOfTextAtSize(cleanVal, valSize);

        drawTrackedText(
          cleanLabel,
          {
            x: totalBlockX,
            y,
            size: labelSize,
            font: rowFont,
            color: labelColor,
          },
          "E-total-label",
        );
        drawTrackedText(
          cleanVal,
          {
            x: rightEdgeX - valW,
            y,
            size: valSize,
            font: rowFont,
            color: TEXT_DARK,
          },
          "E-total-value",
        );

        y -= isGrandTotal ? 17 : 15;
      });

      // Render baris informasi progres kontrak (bila ada)
      if (secondaryRows.length > 0) {
        y -= 2;
        page.drawLine({
          start: { x: totalBlockX, y: y + 9 },
          end: { x: rightEdgeX, y: y + 9 },
          thickness: 0.4,
          color: BORDER_GRAY,
        });
        for (const sRow of secondaryRows) {
          const cleanLabel = sanitizePdfText(sRow.label);
          const cleanVal = sanitizePdfText(stripCurrencySymbol(sRow.value));
          const valW = fontRegular.widthOfTextAtSize(cleanVal, 9.5);
          drawTrackedText(
            cleanLabel,
            {
              x: totalBlockX,
              y,
              size: 9.5,
              font: fontRegular,
              color: TEXT_LABEL,
            },
            "E-contract-label",
          );
          drawTrackedText(
            cleanVal,
            {
              x: rightEdgeX - valW,
              y,
              size: 9.5,
              font: fontRegular,
              color: TEXT_DARK,
            },
            "E-contract-value",
          );
          y -= 13.5;
        }
      }

      // Render kalimat Terbilang
      if (terbilangLines.length > 0) {
        y -= 14;
        for (const tLine of terbilangLines) {
          drawTrackedText(
            tLine,
            {
              x: marginX,
              y,
              size: 9.5,
              font: fontBold,
              color: TEXT_DARK,
            },
            "E-terbilang",
          );
          y -= 13;
        }
      }

      y -= 10;
    }
  }

  // ==========================================================================
  // KOMPONEN 6: DAFTAR BULLET / CATATAN (ZONA F)
  // - Dua kolom: marker (lebar tetap 12 pt) | teks (hanging indent sejajar huruf pertama).
  // - Jarak antar item 3.5 pt; teks tidak melewati margin kanan.
  // ==========================================================================
  const rawNotes = (spec.notes ?? []).filter(
    (n) =>
      !/tanpa\s+tanda\s+tangan\s+basah/i.test(n) &&
      !/sistem\s+komputerisasi/i.test(n),
  );
  if (rawNotes.length > 0) {
    const defaultNotesTitle = isEnPdf
      ? spec.docTitle.toUpperCase().includes("UAT")
        ? "Testing Notes & Follow-up"
        : spec.docTitle.toUpperCase().includes("BAST")
          ? "Handover Terms & Conditions"
          : spec.docTitle.toUpperCase().includes("BAKP")
            ? "Progress Assessment Notes"
            : spec.docTitle.toUpperCase().includes("QUOTATION")
              ? "Price Quotation Terms"
              : spec.docTitle.toUpperCase().includes("SPK") ||
                  spec.docTitle.toUpperCase().includes("SOW")
                ? "Scope & Execution Terms"
                : spec.docTitle.toUpperCase().includes("INVOICE") ||
                    spec.docTitle.toUpperCase().includes("TAGIHAN")
                  ? "Payment Terms"
                  : "Notes & Terms"
      : spec.docTitle.toUpperCase().includes("UAT")
        ? "Catatan Pengujian & Tindak Lanjut"
        : spec.docTitle.toUpperCase().includes("BAST")
          ? "Catatan & Ketentuan Serah Terima"
          : spec.docTitle.toUpperCase().includes("BAKP")
            ? "Catatan Pemeriksaan Capaian"
            : spec.docTitle.toUpperCase().includes("QUOTATION")
              ? "Ketentuan Penawaran Harga"
              : spec.docTitle.toUpperCase().includes("SPK") ||
                  spec.docTitle.toUpperCase().includes("SOW")
                ? "Ketentuan Pelaksanaan Pekerjaan"
                : spec.docTitle.toUpperCase().includes("INVOICE") ||
                    spec.docTitle.toUpperCase().includes("TAGIHAN")
                  ? "Ketentuan Pembayaran"
                  : "Catatan & Ketentuan";
    const notesHeading = (spec.notesTitle ?? defaultNotesTitle).replace(
      /\s*:\s*$/,
      "",
    );

    const markerColW = 12;
    const noteTextMaxW = contentWidth - markerColW;
    const noteSize = PDF_LAYOUT_TOKENS.fontSizes.note; // 9.5 pt (patokan seragam)
    const noteLineH = 12.2; // proporsional untuk 9.5 pt
    const itemGap = 2;

    ensureSpace(28);
    // Jika langsung mengikuti tabel (seperti BAKP, UAT, BAST), sesuaikan spasi after tabel agar judul catatan tidak mepet tabel
    if (!isInvoiceDoc && !hasSummary && !hasTerbilang) {
      y -= 8;
    }
    drawTrackedText(
      notesHeading,
      {
        x: marginX,
        y,
        size: 9.5,
        font: fontBold,
        color: TEXT_DARK,
      },
      "F-notes-heading",
    );
    const notesHeadingAfterGap = isInvoiceDoc ? 12 : 16;
    y -= notesHeadingAfterGap;

    for (const rawNote of rawNotes) {
      // Bersihkan marker bawaan bila string sudah diawali "• " atau "- "
      const strippedNote = rawNote.replace(/^[•\-*]\s+/, "").trim();
      const wrappedLines = wrapTextByWidth(
        strippedNote,
        fontRegular,
        noteSize,
        noteTextMaxW,
      );
      ensureSpace(wrappedLines.length * noteLineH + itemGap);

      wrappedLines.forEach((line, lineIdx) => {
        if (lineIdx === 0) {
          drawTrackedText(
            "\u2022",
            {
              x: marginX,
              y,
              size: noteSize,
              font: fontBold,
              color: TEXT_LABEL,
            },
            "F-bullet-marker",
          );
        }
        drawTrackedText(
          line,
          {
            x: marginX + markerColW,
            y,
            size: noteSize,
            font: fontRegular,
            color: TEXT_DARK,
          },
          "F-bullet-text",
        );
        y -= noteLineH;
      });
      y -= itemGap;
    }

    y -= 8;
  }

  // ==========================================================================
  // KOMPONEN 7: BLOK PENGESAHAN & SLOT E-METERAI (ZONA G)
  // - Dua kolom sejajar dengan lebar sama (atau 3 kolom untuk PO Vendor).
  // - Ruang tanda tangan minimal 62 pt (atau 99 pt bila ada Slot e-Meterai 25x35 mm = 71x99 pt).
  // - Urutan mengalir (flow): Label -> Ruang TTD / e-Meterai -> Garis tipis -> Nama tebal -> Jabatan 8.5 pt abu.
  // - Blok pengesahan tidak terbelah antar halaman.
  // ==========================================================================
  if (
    spec.rightSignatureName ||
    spec.leftSignatureName ||
    spec.thirdSignatureName
  ) {
    const meteraiW = 56.7; // 20 mm
    const meteraiH = 56.7; // 20 mm
    const hasSigImg = Boolean(rightSigImg || leftSigImg || thirdSigImg);
    const defaultSigSpace = hasSigImg ? 58 : 46;
    const sigSpaceH = spec.hasMeterai ? meteraiH + 8 : (spec.minSignatureSpace || defaultSigSpace);
    // Blok Altvira (kanan) memiliki 2 baris teks judul (Baris 1: pembuka, Baris 2: "Altvira Technology"),
    // sehingga membutuhkan alokasi 24 pt sebelum ruang tanda tangan.
    const totalSigBlockH =
      24 + sigSpaceH + 26 + (spec.closingNote ? 24 : 0);

    // Pastikan seluruh blok pengesahan utuh pada satu halaman
    ensureSpace(totalSigBlockH);

    y -= 14;
    const sigTopY = y;
    // Baseline garis tanda tangan diturunkan 24 pt dari sigTopY agar sejajar sempurna
    // antara kolom kiri (1 baris) dan kolom kanan (2 baris: pembuka + Altvira Technology).
    const lineY = sigTopY - 24 - sigSpaceH;
    const nameY = lineY - 13;
    const titleY = nameY - 12;

    const splitSigner = (raw?: string): { name: string; title: string } => {
      if (!raw) return { name: "", title: "" };
      const trimmed = raw.trim();
      const cleaned =
        trimmed.startsWith("(") && trimmed.endsWith(")")
          ? trimmed.slice(1, -1).trim()
          : trimmed;
      const dashParts = cleaned.split(/\s+-\s+/);
      if (dashParts.length > 1) {
        return {
          name: dashParts[0]?.trim() ?? cleaned,
          title: dashParts.slice(1).join(" - ").trim(),
        };
      }
      const parenMatch = cleaned.match(/^(.+?)\s*\(([^)]+)\)$/);
      if (parenMatch) {
        return {
          name: parenMatch[1]!.trim(),
          title: parenMatch[2]!.trim(),
        };
      }
      return { name: cleaned, title: "" };
    };

    const parseRightOpening = (raw?: string): string => {
      if (!raw || !raw.trim()) return "Hormat kami,";
      const trimmed = raw.trim();
      if (trimmed.includes(",")) {
        const first = trimmed.split(",")[0]?.trim();
        if (first) return `${first},`;
      }
      if (/pelaksana/i.test(trimmed)) return "Pelaksana,";
      if (/penerima/i.test(trimmed)) return "Penerima,";
      if (/dikeluarkan\s+oleh/i.test(trimmed)) return "Dikeluarkan Oleh,";
      if (/diterima\s+oleh/i.test(trimmed)) return "Diterima Oleh,";
      if (/hormat\s+kami/i.test(trimmed)) return "Hormat kami,";
      return trimmed.endsWith(",") ? trimmed : `${trimmed},`;
    };

    if (spec.thirdSignatureName) {
      // Skenario 3 Kolom Sejajar (Dibuat, Disetujui, Diterima)
      const colGap = 20;
      const colW = (contentWidth - colGap * 2) / 3;
      const cols = [
        {
          x: marginX,
          label: spec.leftSignatureLabel ?? "Dibuat Oleh,",
          signer: splitSigner(spec.leftSignatureName),
          img: leftSigImg,
          defaultTitle: "Staff Pengadaan",
        },
        {
          x: marginX + colW + colGap,
          label: spec.thirdSignatureLabel ?? "Disetujui Oleh,",
          signer: splitSigner(spec.thirdSignatureName),
          img: thirdSigImg,
          defaultTitle: "Pejabat Penyetuju",
        },
        {
          x: marginX + (colW + colGap) * 2,
          label: spec.rightSignatureLabel ?? "Diterima Oleh,",
          signer: splitSigner(spec.rightSignatureName),
          img: rightSigImg,
          defaultTitle: "Perwakilan Vendor",
        },
      ];

      for (const c of cols) {
        if (!c.signer.name) continue;
        const labelLines = wrapTextByWidth(c.label, fontRegular, 8.5, colW);
        labelLines.forEach((ll, idx) => {
          drawTrackedText(
            ll,
            {
              x: c.x,
              y: sigTopY - idx * 11.5,
              size: 8.5,
              font: fontRegular,
              color: TEXT_LABEL,
            },
            "G-sig-label",
          );
        });

        if (c.img) {
          const dims = fitDimensions(c.img, colW - 16, sigSpaceH - 12);
          page.drawImage(c.img, {
            x: c.x,
            y: lineY + 6,
            width: dims.width,
            height: dims.height,
          });
        }

        page.drawLine({
          start: { x: c.x, y: lineY },
          end: { x: c.x + Math.min(colW - 8, 140), y: lineY },
          thickness: 0.6,
          color: BORDER_GRAY,
        });

        const nameLines = wrapTextByWidth(c.signer.name, fontBold, 9.5, colW);
        drawTrackedText(
          nameLines[0]!,
          {
            x: c.x,
            y: nameY,
            size: 9.5,
            font: fontBold,
            color: TEXT_DARK,
          },
          "G-sig-name",
        );

        const roleText = c.signer.title || c.defaultTitle;
        if (roleText) {
          const roleLines = wrapTextByWidth(roleText, fontRegular, 8.5, colW);
          drawTrackedText(
            roleLines[0]!,
            {
              x: c.x,
              y: titleY,
              size: 8.5,
              font: fontRegular,
              color: TEXT_LABEL,
            },
            "G-sig-title",
          );
        }
      }
      y = titleY - 14;
    } else {
      // Skenario 2 Kolom: Kolom kiri menempel ke margin kiri, kolom kanan digeser hingga menyentuh margin kanan
      const colLeftX = marginX;
      const rightEdgeX = pageWidth - marginX;
      const sigLineWidth = 176;
      const colRightX = rightEdgeX - sigLineWidth;

      // Kolom Kiri (Pihak Kedua / Klien)
      if (spec.leftSignatureName) {
        const leftSigner = splitSigner(spec.leftSignatureName);
        drawTrackedText(
          spec.leftSignatureLabel ?? "Pihak Klien,",
          {
            x: colLeftX,
            y: sigTopY,
            size: 8.5,
            font: fontRegular,
            color: TEXT_LABEL,
          },
          "G-sig-left-label",
        );

        if (leftSigImg) {
          const dims = fitDimensions(leftSigImg, 120, 52);
          page.drawImage(leftSigImg, {
            x: colLeftX,
            y: lineY + 6,
            width: dims.width,
            height: dims.height,
          });
        }

        page.drawLine({
          start: { x: colLeftX, y: lineY },
          end: { x: colLeftX + 168, y: lineY },
          thickness: 0.6,
          color: BORDER_GRAY,
        });

        drawTrackedText(
          leftSigner.name,
          {
            x: colLeftX,
            y: nameY,
            size: 9.5,
            font: fontBold,
            color: TEXT_DARK,
          },
          "G-sig-left-name",
        );

        const defaultLeftRole = /pemohon|pengaju/i.test(
          spec.leftSignatureLabel ?? "",
        )
          ? "Pemohon / Pengaju"
          : /penguji/i.test(spec.leftSignatureLabel ?? "")
            ? "Penguji Pihak Klien"
            : "Perwakilan Klien";
        const leftRole = leftSigner.title || defaultLeftRole;
        drawTrackedText(
          leftRole,
          {
            x: colLeftX,
            y: titleY,
            size: 8.5,
            font: fontRegular,
            color: TEXT_LABEL,
          },
          "G-sig-left-title",
        );
      }

      // Kolom Kanan (Pihak Pertama / Altvira) + Slot e-Meterai 25x35 mm di atas nama penandatangan
      if (spec.rightSignatureName) {
        const rightSigner = splitSigner(spec.rightSignatureName);
        const openingText = parseRightOpening(spec.rightSignatureLabel);

        // Baris 1: Kata pembuka
        drawTrackedText(
          openingText,
          {
            x: colRightX,
            y: sigTopY,
            size: 8.5,
            font: fontRegular,
            color: TEXT_LABEL,
          },
          "G-sig-right-label",
        );

        // Baris 2: "Altvira Technology" tebal (ukuran 9.5 pt sama dengan nama penandatangan)
        drawTrackedText(
          "Altvira Technology",
          {
            x: colRightX,
            y: sigTopY - 12,
            size: 9.5,
            font: fontBold,
            color: TEXT_DARK,
          },
          "G-sig-right-company",
        );

        let sigImgOffsetX = colRightX;

        if (spec.hasMeterai) {
          // Kotak e-Meterai 20x20 mm (56.7 x 56.7 pt)
          // Ujung kanan kotak sejajar ujung kiri garis tipis tanda tangan (colRightX)
          // Geser sedikit ke atas (lineY + 9.5 pt) agar posisinya align center dari area kosong tempat menaruh tanda tangan
          const mBoxX = colRightX - meteraiW;
          const mBoxY = lineY + 9.5;
          page.drawRectangle({
            x: mBoxX,
            y: mBoxY,
            width: meteraiW,
            height: meteraiH,
            color: CHIP_BG,
            borderColor: BORDER_GRAY,
            borderWidth: 0.75,
          });

          const mPadR = 5;
          const mPadB = 5;
          const mRightX = mBoxX + meteraiW - mPadR;

          // 2. Teks "ELEKTRONIK" di atas 10000 (size 6.5 pt bold)
          const mElText = "ELEKTRONIK";
          const mElSize = 6.5;
          const mElW = fontBold.widthOfTextAtSize(mElText, mElSize);

          // 1. Teks "10000" paling bawah: besarin font hingga lebarnya sama persis sepanjang teks ELEKTRONIK di atasnya
          const valUnitW = fontBold.widthOfTextAtSize("10000", 1);
          const mValSize = mElW / valUnitW;
          const mValText = "10000";
          const mValW = fontBold.widthOfTextAtSize(mValText, mValSize);
          const mValY = mBoxY + mPadB;
          drawTrackedText(
            mValText,
            {
              x: mRightX - mValW,
              y: mValY,
              size: mValSize,
              font: fontBold,
              color: TEXT_DARK,
            },
            "G-meterai-val",
          );

          // Render teks "ELEKTRONIK" di atas teks 10000
          const mElY = mValY + mValSize + 1.5;
          drawTrackedText(
            mElText,
            {
              x: mRightX - mElW,
              y: mElY,
              size: mElSize,
              font: fontBold,
              color: TEXT_LABEL,
            },
            "G-meterai-el",
          );

          // 3. Teks "MATERAI" di atas ELEKTRONIK (size 6.5 pt bold, align bottom right)
          const mMatText = "MATERAI";
          const mMatSize = 6.5;
          const mMatW = fontBold.widthOfTextAtSize(mMatText, mMatSize);
          const mMatY = mElY + mElSize + 1.5;
          drawTrackedText(
            mMatText,
            {
              x: mRightX - mMatW,
              y: mMatY,
              size: mMatSize,
              font: fontBold,
              color: TEXT_LABEL,
            },
            "G-meterai-mat",
          );

          sigImgOffsetX = colRightX;
        }

        if (rightSigImg) {
          const dims = fitDimensions(rightSigImg, 115, 52);
          page.drawImage(rightSigImg, {
            x: sigImgOffsetX,
            y: lineY + 6,
            width: dims.width,
            height: dims.height,
          });
        }

        page.drawLine({
          start: { x: colRightX, y: lineY },
          end: { x: rightEdgeX, y: lineY },
          thickness: 0.6,
          color: BORDER_GRAY,
        });

        drawTrackedText(
          rightSigner.name,
          {
            x: colRightX,
            y: nameY,
            size: 9.5,
            font: fontBold,
            color: TEXT_DARK,
          },
          "G-sig-right-name",
        );

        const rightRole =
          rightSigner.title || spec.company.signer_title || "Pejabat Berwenang";
        drawTrackedText(
          rightRole,
          {
            x: colRightX,
            y: titleY,
            size: 8.5,
            font: fontRegular,
            color: TEXT_LABEL,
          },
          "G-sig-right-title",
        );
      }

      y = titleY - 14;
    }

    // Jika ada closingNote, ditempatkan mengalir di bawah blok pengesahan dengan jarak 24 pt
    if (spec.closingNote && spec.closingNote.trim()) {
      y -= 10; // ditambah 14 pt di atas = 24 pt dari baris jabatan
      const cClean = sanitizePdfText(spec.closingNote.trim());
      const cW = fontBold.widthOfTextAtSize(cClean, 8.5);
      drawTrackedText(
        cClean,
        {
          x: (pageWidth - cW) / 2,
          y,
          size: 8.5,
          font: fontBold,
          color: TEXT_LABEL,
        },
        "G-closing-note",
      );
      y -= 14;
    }
  }

  // ==========================================================================
  // KOMPONEN 7B: HALAMAN KHUSUS LAMPIRAN GRAFIK (JIKA TERSEDIA)
  // ==========================================================================
  if (spec.chartAttachments && spec.chartAttachments.length > 0) {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    pages.push(page);
    pageIndex = pages.length - 1;
    y = pageHeight - marginTop;
    drawDocumentHeader();

    const isEn = Boolean(
      spec.language?.startsWith("en") || getActiveLanguage() === "en",
    );
    const lampiranH = 34;
    const lampiranTopY = y;
    const lampiranBottomY = lampiranTopY - lampiranH;

    page.drawRectangle({
      x: marginX,
      y: lampiranBottomY,
      width: contentWidth,
      height: lampiranH,
      color: CHIP_BG,
      borderColor: BORDER_GRAY,
      borderWidth: 0.75,
    });

    const lampiranTitle = isEn
      ? "ATTACHMENT: FINANCIAL DASHBOARD CHARTS & VISUALIZATIONS"
      : "LAMPIRAN: VISUALISASI GRAFIK DASBOR KEUANGAN";
    const lampiranSub = isEn
      ? "Visual representation of financial trends, revenue & expense breakdown, AR aging, and transaction activity"
      : "Visualisasi grafik tren kinerja keuangan bulanan, komposisi pendapatan & beban, serta sebaran umur piutang";

    drawTrackedText(
      lampiranTitle,
      {
        x: marginX + 10,
        y: lampiranTopY - 14,
        size: 9.5,
        font: fontBold,
        color: TEXT_DARK,
      },
      "D-lampiran-title",
    );

    drawTrackedText(
      lampiranSub,
      {
        x: marginX + 10,
        y: lampiranTopY - 26,
        size: 8,
        font: fontRegular,
        color: TEXT_LABEL,
      },
      "D-lampiran-sub",
    );

    y = lampiranBottomY - 12;

    const chartGapX = 14;
    const chartGapY = 12;
    const chartW = (contentWidth - chartGapX) / 2;
    const chartH = 168;

    for (let i = 0; i < spec.chartAttachments.length; i++) {
      const chart = spec.chartAttachments[i]!;
      const row = Math.floor(i / 2);
      const col = i % 2;

      const chartX = marginX + col * (chartW + chartGapX);
      const chartY = y - (row + 1) * chartH - row * chartGapY;

      // Draw container frame
      page.drawRectangle({
        x: chartX,
        y: chartY,
        width: chartW,
        height: chartH,
        color: rgb(1, 1, 1),
        borderColor: BORDER_GRAY,
        borderWidth: 0.75,
      });

      // Embed & draw chart image
      try {
        const embeddedImg = await pdfDoc.embedPng(chart.imageBytes);
        page.drawImage(embeddedImg, {
          x: chartX + 1,
          y: chartY + 1,
          width: chartW - 2,
          height: chartH - 2,
        });
      } catch (err) {
        drawTrackedText(
          chart.title,
          {
            x: chartX + 10,
            y: chartY + chartH - 20,
            size: 9,
            font: fontBold,
            color: TEXT_DARK,
          },
          "D-chart-fallback-title",
        );
      }
    }
  }

  // ==========================================================================
  // KOMPONEN 8: FOOTER (ZONA I) DI SETIAP HALAMAN
  // ==========================================================================
  await drawSocialMediaFooters({
    pdfDoc,
    pages,
    company: spec.company,
    fontRegular,
    fontBold,
    marginX,
    pageWidth,
    docNumber:
      spec.footerDocNumber ?? (spec.docNumber ? spec.docNumber : undefined),
    hideSystemFooter: spec.hideSystemFooter,
    recordBox,
  });

  const pdfBytes = await pdfDoc.save();
  return {
    pdfBytes,
    pageCount: pages.length,
    textBoxes,
    headerAlignment,
  };
}

/**
 * Menghasilkan berkas PDF A4 Bahasa Indonesia dengan komponen bersama terstandar.
 */
export async function generateDocumentPdf(
  spec: PdfDocumentSpec,
): Promise<Uint8Array> {
  const { pdfBytes } = await renderDocumentPdfInternal(spec);
  return pdfBytes;
}

/**
 * Pemeriksa otomatis tata letak PDF:
 * Membandingkan kotak batas (bounding box) seluruh elemen teks per halaman
 * dan melaporkan bila ada dua elemen teks beririsan atau teks melewati batas margin.
 */
export async function inspectPdfDocumentLayout(
  spec: PdfDocumentSpec,
): Promise<PdfLayoutInspectionResult> {
  const { pdfBytes, pageCount, textBoxes, headerAlignment } =
    await renderDocumentPdfInternal(spec);
  const collisions: PdfCollisionIssue[] = [];
  const marginViolations: PdfMarginIssue[] = [];

  const isLandscape = spec.orientation === "landscape";
  const pageWidth = isLandscape
    ? PDF_LAYOUT_TOKENS.pageHeight
    : PDF_LAYOUT_TOKENS.pageWidth;
  const pageHeight = isLandscape
    ? PDF_LAYOUT_TOKENS.pageWidth
    : PDF_LAYOUT_TOKENS.pageHeight;
  const { marginX } = PDF_LAYOUT_TOKENS;
  const minX = marginX - 1.5;
  const maxX = pageWidth - marginX + 1.5;
  const minY = 20;
  const maxY = pageHeight - 20;

  for (const box of textBoxes) {
    if (box.x < minX) {
      marginViolations.push({
        pageIndex: box.pageIndex,
        box,
        reason: `Lewat margin kiri: x=${box.x.toFixed(1)} < ${marginX.toFixed(1)}`,
      });
    }
    if (box.x + box.width > maxX) {
      marginViolations.push({
        pageIndex: box.pageIndex,
        box,
        reason: `Lewat margin kanan: x+w=${(box.x + box.width).toFixed(1)} > ${(pageWidth - marginX).toFixed(1)}`,
      });
    }
    if (box.y < minY || box.y + box.height > maxY) {
      marginViolations.push({
        pageIndex: box.pageIndex,
        box,
        reason: `Lewat batas vertikal halaman: y=${box.y.toFixed(1)}`,
      });
    }
  }

  for (let p = 0; p < pageCount; p++) {
    const pageBoxes = textBoxes.filter((b) => b.pageIndex === p);
    for (let i = 0; i < pageBoxes.length; i++) {
      for (let j = i + 1; j < pageBoxes.length; j++) {
        const a = pageBoxes[i]!;
        const b = pageBoxes[j]!;

        const aLeft = a.x;
        const aRight = a.x + a.width;
        const aBottom = a.y - a.height * 0.15;
        const aTop = a.y + a.height * 0.78;

        const bLeft = b.x;
        const bRight = b.x + b.width;
        const bBottom = b.y - b.height * 0.15;
        const bTop = b.y + b.height * 0.78;

        const overlapX = Math.min(aRight, bRight) - Math.max(aLeft, bLeft);
        const overlapY = Math.min(aTop, bTop) - Math.max(aBottom, bBottom);

        if (overlapX > 1.2 && overlapY > 1.2) {
          collisions.push({
            pageIndex: p,
            boxA: a,
            boxB: b,
            overlapX,
            overlapY,
          });
        }
      }
    }
  }

  return {
    pdfBytes,
    pageCount,
    textBoxes,
    collisions,
    marginViolations,
    headerAlignment,
  };
}