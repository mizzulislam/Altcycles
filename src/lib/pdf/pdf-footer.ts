import {
  type PDFDocument,
  type PDFFont,
  type PDFImage,
  PDFName,
  type PDFPage,
  PDFString,
} from "pdf-lib";
import { DEFAULT_SOCIAL_LINKS } from "@/lib/asset-utils";
import { getActiveLanguage } from "@/lib/i18n";
import type { CompanyProfileRow } from "@/types/database.types";
import { fitDimensions } from "./pdf-canvas-primitives";
import {
  BORDER_GRAY,
  BRAND_BLUE,
  PDF_LAYOUT_TOKENS,
  TEXT_LABEL,
  sanitizePdfText,
} from "./pdf-tokens";

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
