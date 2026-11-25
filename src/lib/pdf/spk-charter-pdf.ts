import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
} from "pdf-lib";
import { formatDateID, formatRupiah, terbilangRupiah } from "@/lib/formatters";
import type { CompanyProfileRow, SpkCharterContent } from "@/types/database.types";
import type { PdfKeyValue } from "./pdf-types";
import {
  BORDER_SLATE,
  BORDER_SUBTLE,
  BRAND_BLUE,
  SLATE_500,
  SLATE_600,
  SLATE_700,
  SLATE_900,
  SURFACE_CARD,
  SURFACE_SUBTLE,
  sanitizePdfText,
} from "./pdf-tokens";
import {
  drawSocialMediaFooters,
  embedOptionalImage,
  fitDimensions,
  wrapTextByWidth,
} from "./pdf-engine";
import { resolveDocumentSigner } from "./document-signer-config";


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

  const resolvedP1SigUrl = resolveDocumentSigner({
    docType: "SPK",
    slot: "left",
    company,
    signerName: content.partyOne?.name || company.signer_name,
    signerJobTitle: content.partyOne?.title || company.signer_title,
  }).signatureImageUrl;

  const resolvedP2SigUrl = resolveDocumentSigner({
    docType: "SPK",
    slot: "right",
    customerSignatureUrl: content.partyTwoSignatureUrl ?? null,
  }).signatureImageUrl;

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
      resolvedP1SigUrl ?? content.partyOneSignatureUrl ?? company.signer_signature_path,
    ),
    embedOptionalImage(pdfDoc, resolvedP2SigUrl),
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
        lines.forEach((l: string, li: number) => {
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
      valLines.forEach((vl: string, li: number) => {
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
  ensureSpace(178);
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
  const p1X = marginX + 12;
  const p2X = pageWidth - marginX - 185;
  const lineY = sigY - 76;
  const nameY = lineY - 13;
  const titleY = nameY - 12;

  // Slot e-Meterai Rp10.000 proporsional 20 x 20 mm (56.7 x 56.7 pt)
  const spkMeteraiW = 56.7;
  const spkMeteraiH = 56.7;
  const spkMeteraiX = (pageWidth - spkMeteraiW) / 2;
  const spkMeteraiY = lineY + 9.5;

  page.drawRectangle({
    x: spkMeteraiX,
    y: spkMeteraiY,
    width: spkMeteraiW,
    height: spkMeteraiH,
    color: SURFACE_CARD,
    borderColor: BORDER_SLATE,
    borderWidth: 0.75,
  });

  const spkPadR = 5;
  const spkPadB = 5;
  const spkRightX = spkMeteraiX + spkMeteraiW - spkPadR;

  // 2. Teks "ELEKTRONIK" di atas 10000 (size 6.5 pt bold)
  const spkElText = "ELEKTRONIK";
  const spkElSize = 6.5;
  const spkElW = fontBold.widthOfTextAtSize(spkElText, spkElSize);

  // 1. Teks "10000" paling bawah: besarin font hingga lebarnya sama persis sepanjang teks ELEKTRONIK di atasnya
  const spkValUnitW = fontBold.widthOfTextAtSize("10000", 1);
  const spkValSize = spkElW / spkValUnitW;
  const spkValText = "10000";
  const spkValW = fontBold.widthOfTextAtSize(spkValText, spkValSize);
  const spkValY = spkMeteraiY + spkPadB;
  page.drawText(spkValText, {
    x: spkRightX - spkValW,
    y: spkValY,
    size: spkValSize,
    font: fontBold,
    color: SLATE_900,
  });

  // Render teks "ELEKTRONIK" di atas 10000
  const spkElY = spkValY + spkValSize + 1.5;
  page.drawText(spkElText, {
    x: spkRightX - spkElW,
    y: spkElY,
    size: spkElSize,
    font: fontBold,
    color: SLATE_600,
  });

  // 3. Teks "MATERAI" di atas ELEKTRONIK (size 6.5 pt bold, align bottom right)
  const spkMatText = "MATERAI";
  const spkMatSize = 6.5;
  const spkMatW = fontBold.widthOfTextAtSize(spkMatText, spkMatSize);
  const spkMatY = spkElY + spkElSize + 1.5;
  page.drawText(spkMatText, {
    x: spkRightX - spkMatW,
    y: spkMatY,
    size: spkMatSize,
    font: fontBold,
    color: SLATE_600,
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
    size: 8.5,
    font: fontRegular,
    color: SLATE_700,
  });
  if (p1SigImg) {
    const d1 = fitDimensions(p1SigImg, 115, 52);
    page.drawImage(p1SigImg, {
      x: p1X,
      y: lineY + 6,
      width: d1.width,
      height: d1.height,
    });
  }
  page.drawLine({
    start: { x: p1X, y: lineY },
    end: { x: p1X + 160, y: lineY },
    thickness: 0.6,
    color: BORDER_SLATE,
  });
  page.drawText(sanitizePdfText(content.partyOne?.name || company.signer_name), {
    x: p1X,
    y: nameY,
    size: 9.5,
    font: fontBold,
    color: SLATE_900,
  });
  page.drawText(sanitizePdfText(content.partyOne?.title || company.signer_title), {
    x: p1X,
    y: titleY,
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
    size: 8.5,
    font: fontRegular,
    color: SLATE_700,
  });
  if (p2SigImg) {
    const d2 = fitDimensions(p2SigImg, 115, 52);
    page.drawImage(p2SigImg, {
      x: p2X,
      y: lineY + 6,
      width: d2.width,
      height: d2.height,
    });
  }
  page.drawLine({
    start: { x: p2X, y: lineY },
    end: { x: p2X + 160, y: lineY },
    thickness: 0.6,
    color: BORDER_SLATE,
  });
  page.drawText(sanitizePdfText(content.partyTwo?.name || "Perwakilan Klien"), {
    x: p2X,
    y: nameY,
    size: 9.5,
    font: fontBold,
    color: SLATE_900,
  });
  page.drawText(sanitizePdfText(content.partyTwo?.title || "Direktur"), {
    x: p2X,
    y: titleY,
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
    docNumber,
    parafInfo: {
      leftImage: p1ParafImg,
      rightImage: p2ParafImg,
    },
  });

  return pdfDoc.save();
}
