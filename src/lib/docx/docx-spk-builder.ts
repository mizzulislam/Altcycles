import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
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
import { formatDateID, formatRupiah, terbilangRupiah } from "@/lib/formatters";
import type { CompanyProfileRow, SpkCharterContent } from "@/types/database.types";
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
 * Menghasilkan berkas Microsoft Word (.docx) Khusus SPK / Project Charter Altvira
 * beserta header dua logo tiap halaman, Pasal 1–10, tabel operasional, TTD, paraf tiap halaman, & footer 3 sosial media.
 */
export async function generateSpkProjectCharterWord(params: {
  docNumber: string;
  docDate: string;
  docTitle: string;
  company: CompanyProfileRow;
  content: SpkCharterContent;
}): Promise<Blob> {
  const { docNumber, docDate, docTitle, company, content } = params;

  const [
    companyLogo,
    clientLogo,
    p1Sig,
    p2Sig,
    p1Paraf,
    p2Paraf,
  ] = await Promise.all([
    decodeImageBytes(company.logo_storage_path),
    decodeImageBytes(content.clientLogoDataUrl),
    decodeImageBytes(
      content.partyOneSignatureUrl ?? company.signer_signature_path,
    ),
    decodeImageBytes(content.partyTwoSignatureUrl),
    decodeImageBytes(content.partyOneParafUrl ?? company.signer_paraf_path),
    decodeImageBytes(content.partyTwoParafUrl),
  ]);

  const logoLeftRun = buildImageRun(companyLogo, 84, 38);
  const logoRightRun = buildImageRun(clientLogo, 84, 38);
  const p1SigRun = buildImageRun(p1Sig, 115, 45);
  const p2SigRun = buildImageRun(p2Sig, 115, 45);

  const runningHeader = new Header({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 24, type: WidthType.PERCENTAGE },
                shading: { fill: SUBTLE_BG_HEX, type: ShadingType.CLEAR },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_HEX },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_HEX },
                  left: { style: BorderStyle.SINGLE, size: 4, color: BORDER_HEX },
                  right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_HEX },
                },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: logoLeftRun
                      ? [logoLeftRun]
                      : [
                          new TextRun({
                            text: company.company_name,
                            bold: true,
                            size: 18,
                            color: SLATE_900,
                          }),
                        ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 52, type: WidthType.PERCENTAGE },
                shading: { fill: SUBTLE_BG_HEX, type: ShadingType.CLEAR },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_HEX },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_HEX },
                  left: { style: BorderStyle.SINGLE, size: 4, color: BORDER_HEX },
                  right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_HEX },
                },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: company.company_name.toUpperCase(),
                        bold: true,
                        size: 18,
                        color: SLATE_900,
                      }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text:
                          content.headerSubtitle ||
                          "Project Charter / Surat Perjanjian Kerjasama",
                        bold: true,
                        size: 20,
                        color: SLATE_900,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 24, type: WidthType.PERCENTAGE },
                shading: { fill: SUBTLE_BG_HEX, type: ShadingType.CLEAR },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_HEX },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_HEX },
                  left: { style: BorderStyle.SINGLE, size: 4, color: BORDER_HEX },
                  right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_HEX },
                },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: logoRightRun
                      ? [logoRightRun]
                      : [
                          new TextRun({
                            text: content.partyTwo?.company || "Klien",
                            bold: true,
                            size: 16,
                            color: SLATE_600,
                          }),
                        ],
                  }),
                ],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                columnSpan: 3,
                shading: { fill: SUBTLE_BG_HEX, type: ShadingType.CLEAR },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_HEX },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_HEX },
                  left: { style: BorderStyle.SINGLE, size: 4, color: BORDER_HEX },
                  right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_HEX },
                },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: `No. Dokumen: ${docNumber}   |   Versi: ${content.docVersion || "1.0"}   |   Tanggal: ${formatDateID(content.signingDate || docDate)}`,
                        bold: true,
                        size: 16,
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
    ],
  });

  const pasalHeader = (no: string, title: string) => [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 220, after: 20 },
      children: [new TextRun({ text: no, bold: true, size: 20, color: BRAND_HEX })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: title, bold: true, size: 20, color: SLATE_900 })],
    }),
  ];

  const partyRows = (
    heading: string,
    party: NonNullable<SpkCharterContent["partyOne"]>,
    alias: string,
  ): Paragraph[] => [
    new Paragraph({
      spacing: { before: 140, after: 60 },
      children: [new TextRun({ text: heading, bold: true, size: 19, color: BRAND_HEX })],
    }),
    ...[
      ["Nama", party.name],
      ["Jabatan", party.title],
      ["Perusahaan", party.company],
      ["Alamat", party.address],
      ["Email", party.email],
      ["No. Telepon", party.phone],
    ].map(
      ([lbl, val]) =>
        new Paragraph({
          spacing: { after: 30 },
          children: [
            new TextRun({ text: `${lbl}: `, bold: true, size: 18, color: SLATE_600 }),
            new TextRun({ text: val || "-", size: 18, color: SLATE_900 }),
          ],
        }),
    ),
    new Paragraph({
      spacing: { before: 40, after: 120 },
      children: [
        new TextRun({
          text: `Dalam hal ini bertindak untuk dan atas nama ${party.company}, selanjutnya disebut sebagai `,
          size: 18,
          color: SLATE_900,
        }),
        new TextRun({ text: `${alias}.`, bold: true, size: 18, color: SLATE_900 }),
      ],
    }),
  ];

  const children: Array<Paragraph | Table> = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 180 },
      children: [
        new TextRun({
          text: docTitle.toUpperCase(),
          bold: true,
          size: 26,
          color: SLATE_900,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: `Pada hari ini, tanggal ${formatDateID(content.signingDate || docDate)}, yang bertempat di ${content.signingCity || company.signing_city || "Bogor"}, kami yang bertanda tangan di bawah ini:`,
          size: 19,
          color: SLATE_900,
        }),
      ],
    }),
    ...(content.partyOne
      ? partyRows("PIHAK PERTAMA (PENYEDIA JASA)", content.partyOne, "PIHAK PERTAMA")
      : []),
    ...(content.partyTwo
      ? partyRows("PIHAK KEDUA (CLIENT/CUSTOMER)", content.partyTwo, "PIHAK KEDUA")
      : []),
    ...pasalHeader("PASAL 1", "MAKSUD DAN TUJUAN"),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: content.pasal1Tujuan || "-", size: 19, color: SLATE_900 }),
      ],
    }),
    ...pasalHeader("PASAL 2", "RUANG LINGKUP PEKERJAAN"),
    ...(content.scopeGroups ?? []).flatMap((grp) => [
      new Paragraph({
        spacing: { before: 80, after: 40 },
        children: [
          new TextRun({ text: grp.category, bold: true, size: 19, color: BRAND_HEX }),
        ],
      }),
      ...grp.items.map(
        (it) =>
          new Paragraph({
            spacing: { after: 30 },
            children: [new TextRun({ text: `• ${it}`, size: 18, color: SLATE_900 })],
          }),
      ),
    ]),
    ...((content.outOfScope ?? []).length > 0
      ? [
          new Paragraph({
            spacing: { before: 100, after: 40 },
            children: [
              new TextRun({
                text: "Hal-hal yang tidak terlingkupi (Out of Scope):",
                bold: true,
                size: 18,
                color: SLATE_900,
              }),
            ],
          }),
          ...(content.outOfScope ?? []).map(
            (oos, idx) =>
              new Paragraph({
                spacing: { after: 30 },
                children: [
                  new TextRun({ text: `${idx + 1}. ${oos}`, size: 18, color: SLATE_900 }),
                ],
              }),
          ),
        ]
      : []),
    ...pasalHeader("PASAL 3", "JANGKA WAKTU & TIMELINE"),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({ text: content.pasal3Intro || "-", size: 19, color: SLATE_900 }),
      ],
    }),
    ...((content.timelineRows ?? []).length > 0
      ? [
          styledTable(
            ["Week / Tahap", "Aktivitas Utama", "Output"],
            [20, 44, 36],
            (content.timelineRows ?? []).map((t) => [
              t.week,
              t.activities,
              t.output,
            ]),
          ),
        ]
      : []),
    ...pasalHeader("PASAL 4", "TIM & TATA KELOLA"),
    ...((content.teamRoles ?? []).length > 0
      ? [
          styledTable(
            ["Peran", "Kapasitas", "Tanggung Jawab Utama"],
            [24, 16, 60],
            (content.teamRoles ?? []).map((r) => [
              r.role,
              r.capacity,
              r.responsibility,
            ]),
          ),
          new Paragraph({ spacing: { after: 120 }, children: [] }),
        ]
      : []),
    ...((content.clientRoles ?? []).length > 0
      ? [
          styledTable(
            ["Peran Klien", "Tanggung Jawab"],
            [30, 70],
            (content.clientRoles ?? []).map((r) => [r.role, r.responsibility]),
          ),
          new Paragraph({ spacing: { after: 120 }, children: [] }),
        ]
      : []),
    ...((content.ceremonies ?? []).length > 0
      ? [
          styledTable(
            ["Sesi / Event", "Frekuensi", "Peserta", "Jadwal Pelaksanaan"],
            [28, 18, 30, 24],
            (content.ceremonies ?? []).map((c) => [
              c.event,
              c.frequency,
              c.attendees,
              c.schedule,
            ]),
          ),
        ]
      : []),
    ...pasalHeader("PASAL 5", "PEMBIAYAAN & PEMBAYARAN"),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: `1. Total biaya proyek adalah sebesar ${formatRupiah(content.totalProjectCost ?? 0)} (${terbilangRupiah(content.totalProjectCost ?? 0)}).`,
          bold: true,
          size: 19,
          color: SLATE_900,
        }),
      ],
    }),
    ...(content.costDetails ?? []).map(
      (cd) =>
        new Paragraph({
          spacing: { after: 30 },
          children: [
            new TextRun({
              text: `• ${cd.label}: ${formatRupiah(cd.amount)}`,
              size: 18,
              color: SLATE_900,
            }),
          ],
        }),
    ),
    new Paragraph({
      spacing: { before: 80, after: 40 },
      children: [
        new TextRun({
          text: "2. Mekanisme Pembayaran:",
          bold: true,
          size: 19,
          color: SLATE_900,
        }),
      ],
    }),
    ...(content.paymentTermsText ?? []).map(
      (pt) =>
        new Paragraph({
          spacing: { after: 30 },
          children: [new TextRun({ text: `• ${pt}`, size: 18, color: SLATE_900 })],
        }),
    ),
    new Paragraph({
      spacing: { before: 60, after: 100 },
      children: [
        new TextRun({
          text: `3. Rekening Tujuan Transfer Resmi PIHAK PERTAMA: ${company.bank_name} No. Rek ${company.bank_account_number} a.n. ${company.bank_account_holder}.`,
          size: 18,
          color: SLATE_600,
        }),
      ],
    }),
    ...pasalHeader("PASAL 6", "KERAHASIAAN"),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: content.pasal6Kerahasiaan || "-",
          size: 19,
          color: SLATE_900,
        }),
      ],
    }),
    ...pasalHeader("PASAL 7", "HAK KEPEMILIKAN DAN INTELLECTUAL PROPERTY"),
    ...(content.pasal7Haki ?? []).map(
      (h, idx) =>
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: `${idx + 1}. ${h}`, size: 19, color: SLATE_900 }),
          ],
        }),
    ),
    ...pasalHeader("PASAL 8", "FORCE MAJEURE"),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: content.pasal8ForceMajeure || "-",
          size: 19,
          color: SLATE_900,
        }),
      ],
    }),
    ...pasalHeader("PASAL 9", "PENYELESAIAN PERMASALAHAN"),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: content.pasal9Penyelesaian || "-",
          size: 19,
          color: SLATE_900,
        }),
      ],
    }),
    ...pasalHeader("PASAL 10", "LAIN-LAIN"),
    new Paragraph({
      spacing: { after: 140 },
      children: [
        new TextRun({
          text: content.pasal10LainLain || "-",
          size: 19,
          color: SLATE_900,
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 120, after: 60 },
      children: [new TextRun({ text: "PENUTUP", bold: true, size: 20, color: BRAND_HEX })],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text:
            content.closingText ||
            "Demikian surat perjanjian kerja sama ini dibuat dengan itikad baik dan mempunyai kekuatan hukum yang sama bagi kedua belah pihak.",
          size: 19,
          color: SLATE_900,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: `${content.signingCity || company.signing_city || "Bogor"}, ${formatDateID(content.signingDate || docDate)}`,
          bold: true,
          size: 19,
          color: SLATE_900,
        }),
      ],
    }),
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
              width: { size: 38, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: "PIHAK PERTAMA", bold: true, size: 18, color: BRAND_HEX }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: content.partyOne?.company || company.company_name,
                      size: 18,
                      color: SLATE_600,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 80, after: 80 },
                  children: p1SigRun ? [p1SigRun] : [new TextRun({ text: "\n" })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: content.partyOne?.name || company.signer_name,
                      bold: true,
                      size: 18,
                      color: SLATE_900,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: content.partyOne?.title || company.signer_title,
                      size: 17,
                      color: SLATE_600,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 24, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.DASHED, size: 6, color: BORDER_HEX },
                bottom: { style: BorderStyle.DASHED, size: 6, color: BORDER_HEX },
                left: { style: BorderStyle.DASHED, size: 6, color: BORDER_HEX },
                right: { style: BorderStyle.DASHED, size: 6, color: BORDER_HEX },
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 60, after: 40 },
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
                      text: "TEMPAT E-METERAI",
                      size: 11,
                      color: SLATE_600,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 38, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: "PIHAK KEDUA", bold: true, size: 18, color: BRAND_HEX }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: content.partyTwo?.company || "Pihak Klien",
                      size: 18,
                      color: SLATE_600,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 80, after: 80 },
                  children: p2SigRun ? [p2SigRun] : [new TextRun({ text: "\n" })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: content.partyTwo?.name || "Perwakilan Klien",
                      bold: true,
                      size: 18,
                      color: SLATE_900,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: content.partyTwo?.title || "Direktur",
                      size: 17,
                      color: SLATE_600,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1650, right: 850, bottom: 1150, left: 850, header: 450, footer: 450 },
          },
        },
        headers: {
          default: runningHeader,
        },
        footers: {
          default: buildSocialFooter(company, {
            leftImg: p1Paraf,
            rightImg: p2Paraf,
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}
