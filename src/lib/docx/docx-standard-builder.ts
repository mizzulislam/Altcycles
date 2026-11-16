import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { decodeImageBytes } from "@/lib/asset-utils";
import { formatDocDateLong, terbilangRupiah } from "@/lib/formatters";
import type { PdfDocumentSpec } from "@/lib/pdf-generator";
import {
  BRAND_HEX,
  BORDER_HEX,
  SUBTLE_BG_HEX,
  SLATE_900,
  SLATE_600,
  styledTable,
} from "@/lib/docx/docx-styles";
import { buildImageRun, buildSocialFooter } from "@/lib/docx/docx-header-footer";

/**
 * Menghasilkan berkas Microsoft Word (.docx) dari spesifikasi dokumen standar Altcycles.
 */
export async function generateDocumentWord(spec: PdfDocumentSpec): Promise<Blob> {
  const [companyLogo, clientLogo, rightSig, leftSig, thirdSig] = await Promise.all([
    decodeImageBytes(spec.company.logo_storage_path),
    decodeImageBytes(spec.clientLogoUrl),
    decodeImageBytes(
      spec.rightSignatureImageUrl !== undefined
        ? spec.rightSignatureImageUrl
        : spec.company.signer_signature_path,
    ),
    decodeImageBytes(spec.leftSignatureImageUrl),
    decodeImageBytes(spec.thirdSignatureImageUrl),
  ]);

  const logoLeftRun = buildImageRun(companyLogo, 84, 42);
  const logoRightRun = buildImageRun(clientLogo, 84, 42);
  const npwpPart = spec.company.tax_id_number
    ? ` | NPWP: ${spec.company.tax_id_number}`
    : "";

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: BORDER_HEX },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [
      new TableRow({
        children: [
          ...(logoLeftRun
            ? [
                new TableCell({
                  width: { size: 18, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ children: [logoLeftRun] })],
                }),
              ]
            : []),
          new TableCell({
            width: {
              size: logoLeftRun && logoRightRun ? 64 : logoLeftRun || logoRightRun ? 82 : 100,
              type: WidthType.PERCENTAGE,
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: spec.company.company_name.toUpperCase(),
                    bold: true,
                    size: 26,
                    color: BRAND_HEX,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: spec.company.legal_entity_name,
                    bold: true,
                    size: 18,
                    color: SLATE_900,
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 100 },
                children: [
                  new TextRun({
                    text: `${spec.company.address} | Email: ${spec.company.email} | Telp: ${spec.company.phone}${npwpPart}`,
                    size: 16,
                    color: SLATE_600,
                  }),
                ],
              }),
            ],
          }),
          ...(logoRightRun
            ? [
                new TableCell({
                  width: { size: 18, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      children: [logoRightRun],
                    }),
                  ],
                }),
              ]
            : []),
        ],
      }),
    ],
  });

  const verStr = spec.docVersion
    ? ` (${typeof spec.docVersion === "number" ? `v${spec.docVersion}` : spec.docVersion})`
    : "";
  const badgeStr = spec.statusBadge ? `   •   STATUS: ${spec.statusBadge.text.toUpperCase()}` : "";

  const bodyChildren: Array<Paragraph | Table> = [
    headerTable,
    new Paragraph({
      spacing: { before: 220, after: 40 },
      children: [
        new TextRun({
          text: spec.docTitle.toUpperCase(),
          bold: true,
          size: 26,
          color: SLATE_900,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: `Nomor Dokumen: ${spec.docNumber}${verStr}   •   Tanggal: ${formatDocDateLong(spec.docDate)}${badgeStr}`,
          bold: true,
          size: 19,
          color: SLATE_900,
        }),
        ...(spec.docSubtitle
          ? [
              new TextRun({
                text: `   •   ${spec.docSubtitle}`,
                size: 19,
                color: SLATE_600,
              }),
            ]
          : []),
      ],
    }),
  ];

  if (spec.balanceDueBox) {
    bodyChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                shading: { fill: SUBTLE_BG_HEX, type: ShadingType.CLEAR },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_HEX },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_HEX },
                  left: { style: BorderStyle.SINGLE, size: 4, color: BORDER_HEX },
                  right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_HEX },
                },
                children: [
                  new Paragraph({
                    spacing: { before: 80, after: 60 },
                    children: [
                      new TextRun({
                        text: `${spec.balanceDueBox.label.toUpperCase()}:  `,
                        bold: true,
                        size: 17,
                        color: SLATE_600,
                      }),
                      new TextRun({
                        text: spec.balanceDueBox.amountText,
                        bold: true,
                        size: 24,
                        color: SLATE_900,
                      }),
                      ...(spec.balanceDueBox.dueDateText
                        ? [
                            new TextRun({
                              text: `   (${spec.balanceDueBox.dueDateText})`,
                              size: 16,
                              color: SLATE_600,
                            }),
                          ]
                        : []),
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

  const hasRecipient = Boolean(spec.recipientLines && spec.recipientLines.length > 0);
  const hasMeta = Boolean(spec.metaRows && spec.metaRows.length > 0);

  if (hasRecipient || hasMeta) {
    const leftCellChildren: Paragraph[] = [];
    if (hasRecipient) {
      leftCellChildren.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: (spec.recipientTitle ?? "DITERBITKAN UNTUK:").toUpperCase(),
              bold: true,
              size: 15,
              color: SLATE_600,
            }),
          ],
        }),
      );
      spec.recipientLines!.forEach((rl, idx) => {
        leftCellChildren.push(
          new Paragraph({
            spacing: { after: idx === spec.recipientLines!.length - 1 ? 40 : 20 },
            children: [
              new TextRun({
                text: rl,
                bold: idx === 0,
                size: idx === 0 ? 19 : 17,
                color: idx === 0 ? SLATE_900 : SLATE_600,
              }),
            ],
          }),
        );
      });
    }

    const rightCellChildren: Paragraph[] = [];
    if (hasMeta) {
      spec.metaRows!.forEach((m) => {
        rightCellChildren.push(
          new Paragraph({
            spacing: { after: 25 },
            children: [
              new TextRun({ text: `${m.label}: `, bold: true, size: 16, color: SLATE_600 }),
              new TextRun({ text: m.value, size: 17, color: SLATE_900 }),
            ],
          }),
        );
      });
    }

    bodyChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_HEX },
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
                children: leftCellChildren.length > 0 ? leftCellChildren : [new Paragraph({ children: [] })],
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: rightCellChildren.length > 0 ? rightCellChildren : [new Paragraph({ children: [] })],
              }),
            ],
          }),
        ],
      }),
    );
    bodyChildren.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
  }

  for (const p of spec.paragraphsBefore ?? []) {
    bodyChildren.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: p, size: 19, color: SLATE_900 })],
      }),
    );
  }

  if (
    spec.tableColumns &&
    spec.tableColumns.length > 0 &&
    spec.tableRows &&
    spec.tableRows.length > 0
  ) {
    const totalRatio = spec.tableColumns.reduce((s, c) => s + c.widthRatio, 0) || 1;
    bodyChildren.push(
      styledTable(
        spec.tableColumns.map((c) => c.header),
        spec.tableColumns.map((c) => Math.round((c.widthRatio / totalRatio) * 100)),
        spec.tableRows,
        spec.tableColumns.map((c) =>
          c.align === "right"
            ? AlignmentType.RIGHT
            : c.align === "center"
              ? AlignmentType.CENTER
              : AlignmentType.LEFT,
        ),
      ),
    );
    bodyChildren.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
  }

  for (const s of spec.summaryRows ?? []) {
    const isTotal =
      s.label.toUpperCase().includes("TOTAL") ||
      s.label.toUpperCase().includes("SISA");
    bodyChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 50 },
        children: [
          new TextRun({
            text: `${s.label}: `,
            bold: true,
            size: isTotal ? 20 : 18,
            color: isTotal ? SLATE_900 : SLATE_600,
          }),
          new TextRun({
            text: s.value,
            bold: true,
            size: isTotal ? 21 : 19,
            color: SLATE_900,
          }),
        ],
      }),
    );
  }

  if (typeof spec.terbilangAmount === "number") {
    bodyChildren.push(
      new Paragraph({
        spacing: { before: 80, after: 140 },
        children: [
          new TextRun({
            text: `Terbilang: # ${terbilangRupiah(spec.terbilangAmount)} #`,
            bold: true,
            size: 17,
            color: SLATE_600,
          }),
        ],
      }),
    );
  }

  if (spec.notes && spec.notes.length > 0) {
    const defaultNotesTitle =
      spec.docTitle.toUpperCase().includes("UAT")
        ? "Catatan Pengujian & Tindak Lanjut:"
        : spec.docTitle.toUpperCase().includes("SERAH TERIMA") || spec.docTitle.toUpperCase().includes("BAST")
          ? "Catatan & Ketentuan Serah Terima:"
          : spec.docTitle.toUpperCase().includes("KEMAJUAN") || spec.docTitle.toUpperCase().includes("BAKP")
            ? "Catatan Pemeriksaan Capaian:"
            : spec.docTitle.toUpperCase().includes("PENAWARAN") || spec.docTitle.toUpperCase().includes("QUOTATION")
              ? "Ketentuan Penawaran Harga:"
              : spec.docTitle.toUpperCase().includes("SPK") || spec.docTitle.toUpperCase().includes("KERJA")
                ? "Ketentuan Pelaksanaan Pekerjaan:"
                : "Catatan & Ketentuan Pembayaran:";
    const notesHeading = spec.notesTitle ?? defaultNotesTitle;

    bodyChildren.push(
      new Paragraph({
        spacing: { before: 80, after: 50 },
        children: [
          new TextRun({
            text: notesHeading,
            bold: true,
            size: 18,
            color: SLATE_900,
          }),
        ],
      }),
    );
    for (const n of spec.notes) {
      bodyChildren.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: `• ${n}`, size: 16, color: SLATE_600 })],
        }),
      );
    }
  }

  if (spec.rightSignatureName || spec.leftSignatureName || spec.thirdSignatureName) {
    const leftSigRun = buildImageRun(leftSig, 110, 44);
    const rightSigRun = buildImageRun(rightSig, 110, 44);
    const thirdSigRun = buildImageRun(thirdSig, 110, 44);
    bodyChildren.push(new Paragraph({ spacing: { before: 200 }, children: [] }));

    if (spec.thirdSignatureName) {
      // 3 Kolom Tanda Tangan (Dibuat, Disetujui, Diterima)
      bodyChildren.push(
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
                  width: { size: 33, type: WidthType.PERCENTAGE },
                  children: spec.leftSignatureName
                    ? [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: spec.leftSignatureLabel ?? "Dibuat Oleh,",
                              size: 17,
                              color: SLATE_600,
                            }),
                          ],
                        }),
                        new Paragraph({
                          spacing: { before: 80, after: 80 },
                          children: leftSigRun ? [leftSigRun] : [new TextRun({ text: "\n" })],
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `(${spec.leftSignatureName})`,
                              bold: true,
                              size: 17,
                              color: SLATE_900,
                            }),
                          ],
                        }),
                      ]
                    : [new Paragraph({ children: [] })],
                }),
                new TableCell({
                  width: { size: 34, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: spec.thirdSignatureLabel ?? "Disetujui Oleh,",
                          size: 17,
                          color: SLATE_600,
                        }),
                      ],
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 80, after: 80 },
                      children: thirdSigRun ? [thirdSigRun] : [new TextRun({ text: "\n" })],
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: `(${spec.thirdSignatureName})`,
                          bold: true,
                          size: 17,
                          color: SLATE_900,
                        }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 33, type: WidthType.PERCENTAGE },
                  children: spec.rightSignatureName
                    ? [
                        new Paragraph({
                          alignment: AlignmentType.RIGHT,
                          children: [
                            new TextRun({
                              text: spec.rightSignatureLabel ?? "Diterima Oleh,",
                              size: 17,
                              color: SLATE_600,
                            }),
                          ],
                        }),
                        new Paragraph({
                          alignment: AlignmentType.RIGHT,
                          spacing: { before: 80, after: 80 },
                          children: rightSigRun ? [rightSigRun] : [new TextRun({ text: "\n" })],
                        }),
                        new Paragraph({
                          alignment: AlignmentType.RIGHT,
                          children: [
                            new TextRun({
                              text: `(${spec.rightSignatureName})`,
                              bold: true,
                              size: 17,
                              color: SLATE_900,
                            }),
                          ],
                        }),
                      ]
                    : [new Paragraph({ children: [] })],
                }),
              ],
            }),
          ],
        }),
      );
    } else {
      // 2 Kolom Tanda Tangan Standar + Slot e-Meterai Opsional (Dashed Netral)
      const meteraiCell = spec.hasMeterai
        ? [
            new TableCell({
              width: { size: 24, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  border: {
                    top: { style: BorderStyle.DASHED, size: 6, color: BORDER_HEX },
                    bottom: { style: BorderStyle.DASHED, size: 6, color: BORDER_HEX },
                    left: { style: BorderStyle.DASHED, size: 6, color: BORDER_HEX },
                    right: { style: BorderStyle.DASHED, size: 6, color: BORDER_HEX },
                  },
                  spacing: { before: 60, after: 60 },
                  children: [
                    new TextRun({
                      text: "METERAI ELEKTRONIK\n",
                      bold: true,
                      size: 13,
                      color: SLATE_600,
                    }),
                    new TextRun({
                      text: "Rp 10.000\n",
                      bold: true,
                      size: 16,
                      color: SLATE_900,
                    }),
                    new TextRun({
                      text: spec.meteraiLabel ?? "TEMPAT E-METERAI",
                      size: 11,
                      color: SLATE_600,
                    }),
                  ],
                }),
              ],
            }),
          ]
        : [];

      const sideColWidth = spec.hasMeterai ? 38 : 50;

      bodyChildren.push(
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
                  width: { size: sideColWidth, type: WidthType.PERCENTAGE },
                  children: spec.leftSignatureName
                    ? [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: spec.leftSignatureLabel ?? "Pihak Klien,",
                              size: 18,
                              color: SLATE_600,
                            }),
                          ],
                        }),
                        new Paragraph({
                          spacing: { before: 80, after: 80 },
                          children: leftSigRun ? [leftSigRun] : [new TextRun({ text: "\n" })],
                        }),
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `(${spec.leftSignatureName})`,
                              bold: true,
                              size: 18,
                              color: SLATE_900,
                            }),
                          ],
                        }),
                      ]
                    : [new Paragraph({ children: [] })],
                }),
                ...meteraiCell,
                new TableCell({
                  width: { size: sideColWidth, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      children: [
                        new TextRun({
                          text:
                            spec.rightSignatureLabel ??
                            `Hormat kami, ${spec.company.company_name}`,
                          size: 18,
                          color: SLATE_600,
                        }),
                      ],
                    }),
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      spacing: { before: 80, after: 80 },
                      children: rightSigRun ? [rightSigRun] : [new TextRun({ text: "\n" })],
                    }),
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      children: [
                        new TextRun({
                          text: `(${spec.rightSignatureName ?? `${spec.company.signer_name} - ${spec.company.signer_title}`})`,
                          bold: true,
                          size: 18,
                          color: SLATE_900,
                        }),
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

    if (spec.closingNote) {
      bodyChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 160 },
          children: [
            new TextRun({
              text: spec.closingNote,
              bold: true,
              italics: true,
              size: 18,
              color: BRAND_HEX,
            }),
          ],
        }),
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 800, right: 850, bottom: 900, left: 850 },
          },
        },
        footers: {
          default: buildSocialFooter(spec.company, undefined, spec),
        },
        children: bodyChildren,
      },
    ],
  });

  return Packer.toBlob(doc);
}
