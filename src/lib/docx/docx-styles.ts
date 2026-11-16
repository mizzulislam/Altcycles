import {
  AlignmentType,
  BorderStyle,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

// =============================================================================
// COLOR TOKENS (HEX FOR DOCX)
// =============================================================================

export const BRAND_HEX = "0B43C8";
export const BORDER_HEX = "D1D9E6";
export const BORDER_SUBTLE_HEX = "E2E8F0";
export const SUBTLE_BG_HEX = "F8FAFC";
export const SLATE_900 = "0F172A";
export const SLATE_600 = "475569";

// =============================================================================
// STYLED TABLE BUILDER
// =============================================================================

export function styledTable(
  headers: string[],
  widthsPct: number[],
  rows: string[][],
  alignments?: Array<(typeof AlignmentType)[keyof typeof AlignmentType]>,
): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map(
          (h, idx) =>
            new TableCell({
              width: { size: widthsPct[idx] ?? 25, type: WidthType.PERCENTAGE },
              shading: { fill: SUBTLE_BG_HEX, type: ShadingType.CLEAR },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 6, color: BORDER_HEX },
                bottom: { style: BorderStyle.SINGLE, size: 8, color: SLATE_600 },
                left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              },
              children: [
                new Paragraph({
                  alignment: alignments?.[idx] ?? AlignmentType.LEFT,
                  spacing: { before: 70, after: 70 },
                  children: [
                    new TextRun({
                      text: h,
                      bold: true,
                      size: 17,
                      color: SLATE_600,
                    }),
                  ],
                }),
              ],
            }),
        ),
      }),
      ...rows.map(
        (r) =>
          new TableRow({
            children: headers.map(
              (_, idx) =>
                new TableCell({
                  width: { size: widthsPct[idx] ?? 25, type: WidthType.PERCENTAGE },
                  borders: {
                    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_SUBTLE_HEX },
                    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  },
                  children: [
                    new Paragraph({
                      alignment: alignments?.[idx] ?? AlignmentType.LEFT,
                      spacing: { before: 60, after: 60 },
                      children: [
                        new TextRun({
                          text: r[idx] ?? "",
                          size: 17,
                          color: SLATE_900,
                        }),
                      ],
                    }),
                  ],
                }),
            ),
          }),
      ),
    ],
  });
}
