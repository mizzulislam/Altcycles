import {
  AlignmentType,
  BorderStyle,
  Footer,
  ImageRun,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import {
  decodeImageBytes,
  getFooterSocialEntries,
  renderSocialIconPngBytes,
} from "@/lib/asset-utils";
import { formatDateTimeID } from "@/lib/formatters";
import { getActiveLanguage } from "@/lib/i18n";
import type { PdfDocumentSpec } from "@/lib/pdf-generator";
import type { CompanyProfileRow } from "@/types/database.types";
import {
  BRAND_HEX,
  BORDER_HEX,
  SLATE_600,
} from "@/lib/docx/docx-styles";

// =============================================================================
// IMAGE RUN BUILDER
// =============================================================================

export function buildImageRun(
  decoded: Awaited<ReturnType<typeof decodeImageBytes>>,
  width: number,
  height: number,
): ImageRun | null {
  if (!decoded) return null;
  return new ImageRun({
    type: decoded.format === "jpg" ? "jpg" : "png",
    data: decoded.bytes,
    transformation: { width, height },
  });
}

// =============================================================================
// SOCIAL MEDIA FOOTER BUILDER
// =============================================================================

export function buildSocialFooter(
  company: CompanyProfileRow,
  paraf?: {
    leftImg: Awaited<ReturnType<typeof decodeImageBytes>>;
    rightImg: Awaited<ReturnType<typeof decodeImageBytes>>;
  },
  spec?: PdfDocumentSpec,
): Footer {
  const isEn = (spec as any)?.lang === "en" || getActiveLanguage() === "en";
  const entries = getFooterSocialEntries(company);
  const children: Array<Paragraph | Table> = [];

  if (paraf) {
    const p1Img = buildImageRun(paraf.leftImg, 54, 24);
    const p2Img = buildImageRun(paraf.rightImg, 54, 24);
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: isEn ? "First Party Initials: " : "Paraf Pihak Pertama: ",
                        size: 16,
                        color: SLATE_600,
                      }),
                      ...(p1Img
                        ? [p1Img]
                        : [new TextRun({ text: "..................", size: 16, color: SLATE_600 })]),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({
                        text: isEn ? "Second Party Initials: " : "Paraf Pihak Kedua: ",
                        size: 16,
                        color: SLATE_600,
                      }),
                      ...(p2Img
                        ? [p2Img]
                        : [new TextRun({ text: "..................", size: 16, color: SLATE_600 })]),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    );
  }

  const docNumText = spec?.footerDocNumber ?? (spec?.docNumber ? ` | ${spec.docNumber}` : "");
  const socialRuns: Array<TextRun | ImageRun> = [
    new TextRun({
      text: `${company.company_name}${docNumText}    `,
      bold: true,
      size: 15,
      color: BRAND_HEX,
    }),
  ];

  if (entries.length > 0) {
    entries.forEach((entry, idx) => {
      const iconBytes = renderSocialIconPngBytes(entry.platform, "#0B43C8");
      if (idx > 0) {
        socialRuns.push(new TextRun({ text: "    ", size: 16, color: SLATE_600 }));
      }
      if (iconBytes) {
        socialRuns.push(
          new ImageRun({
            type: "png",
            data: iconBytes,
            transformation: { width: 11, height: 11 },
          }),
        );
        socialRuns.push(
          new TextRun({ text: ` ${entry.username}`, size: 16, color: SLATE_600 }),
        );
      } else {
        socialRuns.push(
          new TextRun({ text: entry.username, size: 16, color: SLATE_600 }),
        );
      }
    });
  } else {
    socialRuns.push(
      new TextRun({
        text: `${company.email}   •   ${company.phone}`,
        size: 16,
        color: SLATE_600,
      }),
    );
  }

  children.push(
    new Paragraph({
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, color: BORDER_HEX },
      },
      spacing: { before: 80, after: 30 },
      alignment: AlignmentType.CENTER,
      children: socialRuns,
    }),
  );

  if (!spec?.hideSystemFooter) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: isEn
              ? `Generated automatically by Altcycles Altvira Financial ERP • ${formatDateTimeID(new Date())}`
              : `Dibuat otomatis oleh Altcycles ERP Keuangan Altvira • ${formatDateTimeID(new Date())}`,
            size: 14,
            color: SLATE_600,
          }),
        ],
      }),
    );
  }

  return new Footer({ children });
}
