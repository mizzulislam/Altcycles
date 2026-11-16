import {
  formatDateTimeID,
  formatDocDateLong,
  formatDocEmpty,
  formatDocRupiah,
  hasAnyDecimalCurrency,
  terbilangRupiah,
} from "@/lib/formatters";
import type {
  ClientPoItemJson,
  CompanyProfileRow,
  PaymentRequestStatus,
} from "@/types/database.types";
import type {
  DocStatusVariant,
  PdfDocumentSpec,
  PdfKeyValue,
  PdfTableColumn,
} from "../pdf-types";

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
  const pph23EstVal = params.includePph23Estimate
    ? Math.round(params.subtotal * 0.02)
    : 0;
  const netEstVal = params.includePph23Estimate
    ? Math.max(0, params.totalAmount - pph23EstVal)
    : 0;
  const prevBilledVal = params.previousBilledAmount ?? 0;
  const remainingContractVal =
    params.contractValue && params.contractValue > 0
      ? params.remainingContractAmount !== undefined &&
        params.remainingContractAmount !== null
        ? params.remainingContractAmount
        : Math.max(0, params.contractValue - (prevBilledVal + params.subtotal))
      : 0;

  const itemValues =
    params.items && params.items.length > 0
      ? params.items.flatMap((it) => [it.unitPrice, it.subtotal])
      : [
          params.unitPrice ??
            Math.round(params.subtotal / Math.max(1, params.qty ?? 1)),
          params.subtotal,
        ];

  const forceTwoDecimals = hasAnyDecimalCurrency([
    ...itemValues,
    params.subtotal,
    params.ppnAmount,
    params.totalAmount,
    params.contractValue,
    prevBilledVal,
    remainingContractVal,
    pph23EstVal,
    netEstVal,
    params.balanceDue,
  ]);

  const fmtRp = (val: number) => formatDocRupiah(val, forceTwoDecimals);

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
        { header: "Deskripsi", widthRatio: 0.34 },
        { header: "Qty", widthRatio: 0.11, align: "center" },
        { header: "Durasi", widthRatio: 0.11, align: "center" },
        { header: "Harga Satuan", widthRatio: 0.19, align: "right" },
        { header: "Subtotal (IDR)", widthRatio: 0.19, align: "right" },
      ];
      tableRows = params.items.map((it, idx) => [
        String(idx + 1),
        it.description,
        `${it.qty} ${it.unit ?? "Paket"}`,
        it.duration ?? formatDocEmpty(),
        fmtRp(it.unitPrice),
        fmtRp(it.subtotal),
      ]);
    } else {
      tableColumns = [
        { header: "No", widthRatio: 0.07, align: "center" },
        { header: "Deskripsi", widthRatio: 0.43 },
        { header: "Qty", widthRatio: 0.12, align: "center" },
        { header: "Harga Satuan", widthRatio: 0.19, align: "right" },
        { header: "Subtotal (IDR)", widthRatio: 0.19, align: "right" },
      ];
      tableRows = params.items.map((it, idx) => [
        String(idx + 1),
        it.description,
        `${it.qty} ${it.unit ?? "Paket"}`,
        fmtRp(it.unitPrice),
        fmtRp(it.subtotal),
      ]);
    }
  } else {
    const qty = params.qty ?? 1;
    const unitPrice =
      params.unitPrice ?? Math.round(params.subtotal / Math.max(1, qty));
    tableColumns = [
      { header: "No", widthRatio: 0.07, align: "center" },
      { header: "Deskripsi", widthRatio: 0.43 },
      { header: "Qty", widthRatio: 0.12, align: "center" },
      { header: "Harga Satuan", widthRatio: 0.19, align: "right" },
      { header: "Subtotal (IDR)", widthRatio: 0.19, align: "right" },
    ];
    tableRows = [
      [
        "1",
        params.description,
        `${qty} ${params.unit ?? "Paket"}`,
        fmtRp(unitPrice),
        fmtRp(params.subtotal),
      ],
    ];
  }

  // Akumulasi termin dan estimasi PPh 23
  const summaryRows: PdfKeyValue[] = [
    { label: "Subtotal Tagihan", value: fmtRp(params.subtotal) },
    ...(params.company.pkp_enabled
      ? [
          {
            label: `PPN (${params.company.ppn_rate}%)`,
            value: fmtRp(params.ppnAmount),
          },
        ]
      : []),
    { label: "Total Tagihan Invoice", value: fmtRp(params.totalAmount) },
  ];

  if (params.contractValue && params.contractValue > 0) {
    summaryRows.push(
      {
        label: "Total Nilai Kontrak Proyek",
        value: fmtRp(params.contractValue),
      },
      {
        label: "Akumulasi Tagihan Sebelumnya",
        value: fmtRp(prevBilledVal),
      },
      {
        label: "Tagihan Termin Berjalan",
        value: fmtRp(params.subtotal),
      },
      {
        label: "Sisa Nilai Kontrak",
        value: fmtRp(remainingContractVal),
      },
    );
  }

  if (params.includePph23Estimate) {
    summaryRows.push(
      {
        label: "Estimasi Potongan PPh 23 (2%)",
        value: fmtRp(pph23EstVal),
      },
      {
        label: "Estimasi Kas Neto Diterima",
        value: fmtRp(netEstVal),
      },
    );
  }

  const normalizedServicePeriod = params.servicePeriod
    ? params.servicePeriod.replace(/^Termin:\s*(Termin\b)/i, "$1")
    : null;

  const rawBankName = (params.company.bank_name || "").trim().replace(/^bank\s+/i, "");
  const cleanBankName = rawBankName ? `Bank ${rawBankName}` : "-";

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
      amountText: dueAmount === 0 ? "LUNAS" : fmtRp(dueAmount),
      dueDateText:
        dueAmount === 0
          ? "Lunas Sepenuhnya"
          : `Jatuh Tempo: ${formatDocDateLong(params.dueDate)}`,
    },
    company: params.company,
    clientLogoUrl: params.customerLogoUrl ?? null,
    recipientTitle: "Ditagihkan Kepada",
    recipientLines: [
      params.customerName,
      ...(picDisplay ? [picDisplay] : []),
      params.customerAddress || "-",
    ],
    metaRows: [
      {
        label: "Tanggal Terbit",
        value: formatDocDateLong(params.invoiceDate),
      },
      {
        label: "Tanggal Jatuh Tempo",
        value: formatDocDateLong(params.dueDate),
      },
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
      ...(normalizedServicePeriod
        ? [{ label: "Periode Layanan", value: normalizedServicePeriod }]
        : []),
    ],
    tableColumns,
    tableRows,
    summaryRows,
    terbilangAmount: params.totalAmount,
    notes: [
      "Pembayaran dilakukan via transfer ke rekening di atas paling lambat pada tanggal jatuh tempo.",
      `Klausul Keterlambatan: ${params.overdueClauseText ?? "Keterlambatan pembayaran setelah tanggal jatuh tempo dapat mengakibatkan penangguhan sementara operasional layanan dan/atau penyesuaian jadwal pelaksanaan sesuai perjanjian kerja sama."}`,
      "Konfirmasi pembayaran ke finance +62 878-0256-8095 atau altvira.tech@gmail.com",
    ],
    notesTitle: "Ketentuan Pembayaran",
    paymentDetail: {
      terbilangText: terbilangRupiah(params.totalAmount),
      bankName: cleanBankName,
      accountNumber: params.company.bank_account_number || "-",
      accountHolder: params.company.bank_account_holder || "-",
      transferNews: params.invoiceNumber,
      isPaid: params.paymentStatus === "paid" || dueAmount === 0,
      swiftCode: (params.company as any).swift_code || null,
    },
    documentNotes: (params as any).documentNotes ?? null,
    rightSignatureLabel: `Hormat kami, ${params.company.company_name}`,
    rightSignatureName: `${params.company.signer_name} - ${params.company.signer_title}`,
    rightSignatureImageUrl: params.company.signer_signature_path ?? null,
    footerDocNumber: params.invoiceNumber,
    refDocNumber:
      params.bakpNumber ||
      params.clientPoNumber ||
      params.spkNumber ||
      "-",
    docStatus: params.docStatus,
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

  const forceTwoDecimals = hasAnyDecimalCurrency([params.amount]);
  const fmtAmount = formatDocRupiah(params.amount, forceTwoDecimals);
  const normalizedServicePeriod = params.servicePeriod
    ? params.servicePeriod.replace(/^Termin:\s*(Termin\b)/i, "$1")
    : null;

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
      amountText: fmtAmount,
      dueDateText: `Diterima Pada: ${formatDocDateLong(params.receiptDate)}`,
    },
    company: params.company,
    metaRows: [
      { label: "Tanggal Terima", value: formatDocDateLong(params.receiptDate) },
      { label: "Telah Terima Dari", value: params.receivedFrom },
      {
        label: "Untuk Pembayaran",
        value: `Pelunasan / Pembayaran Invoice ${params.invoiceNumber}`,
      },
      { label: "Nama Proyek", value: params.projectName },
      ...(params.clientPoNumber
        ? [{ label: "Referensi PO Klien", value: params.clientPoNumber }]
        : []),
      ...(normalizedServicePeriod
        ? [{ label: "Periode Layanan", value: normalizedServicePeriod }]
        : []),
      ...(params.paymentMethod
        ? [{ label: "Metode / Rekening", value: params.paymentMethod }]
        : []),
      { label: "Jumlah Pembayaran", value: fmtAmount },
    ],
    summaryRows: [{ label: "Jumlah Diterima", value: fmtAmount }],
    terbilangAmount: params.amount,
    hasMeterai: needsMeterai,
    meteraiLabel: "TEMPAT E-METERAI Rp10.000",
    appreciationBarText: `Terima kasih telah memilih Altvira, ${params.receivedFrom}`,
    notes: [
      "Kuitansi ini merupakan bukti penerimaan pembayaran yang sah dan mengikat atas tagihan invoice terkait.",
      needsMeterai
        ? "Bea meterai Rp10.000 telah diperhitungkan sesuai UU No. 10 Tahun 2020 tentang Bea Meterai."
        : "Nilai pembayaran di bawah batas pengenaan bea meterai sesuai UU No. 10 Tahun 2020.",
    ],
    rightSignatureLabel: `Penerima, ${params.company.company_name}`,
    rightSignatureName: `${params.company.signer_name} - ${params.company.signer_title}`,
    rightSignatureImageUrl: params.company.signer_signature_path ?? null,
    footerDocNumber: params.receiptNumber,
    refDocNumber: params.invoiceNumber || "-",
    docStatus: "paid",
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

  const forceTwoDecimals = hasAnyDecimalCurrency([
    params.poValue,
    ...safeItems.flatMap((it) => [it.price, it.qty * it.price]),
  ]);
  const fmtRp = (val: number) => formatDocRupiah(val, forceTwoDecimals);

  const recipientLines = [
    params.clientCompany?.trim() || params.clientName,
    ...(params.clientCompany?.trim() && params.clientCompany.trim() !== params.clientName
      ? [params.clientName]
      : []),
    params.clientEmail?.trim() || null,
    params.clientPhone?.trim() || null,
  ].filter((line): line is string => Boolean(line));

  const statusUpper = params.statusLabel.toUpperCase();
  const statusBadge: { text: string; variant: DocStatusVariant } =
    /terverifikasi|disetujui|sah/i.test(statusUpper)
      ? { text: "TERVERIFIKASI", variant: "success" }
      : /tolak|batal/i.test(statusUpper)
        ? { text: "DITOLAK", variant: "danger" }
        : { text: statusUpper || "DIAJUKAN", variant: "info" };

  const metaRows: PdfKeyValue[] = [
    { label: "Tanggal PO", value: formatDocDateLong(params.poDate) },
    { label: "Nomor PO Klien", value: params.poNumber },
    ...(params.quotationReference?.trim()
      ? [{ label: "Referensi Quotation", value: params.quotationReference.trim() }]
      : []),
    ...(params.projectLabel?.trim()
      ? [{ label: "Proyek Terkait", value: params.projectLabel.trim() }]
      : []),
    { label: "Status Verifikasi", value: params.statusLabel },
  ];

  return {
    docTitle: "PURCHASE ORDER (PO) KLIEN",
    docSubtitle: "Dokumen Pengajuan Pesanan Resmi Pelanggan",
    docNumber: params.poNumber,
    docDate: params.poDate,
    statusBadge,
    company: params.company,
    recipientTitle: "Diajukan Oleh Klien",
    recipientLines,
    metaRows,
    paragraphsBefore: [
      "Dokumen Purchase Order (PO) Klien ini diterbitkan secara resmi melalui Portal Pelanggan Altvira Technology sebagai bukti pengajuan pesanan pekerjaan atau layanan.",
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.07, align: "center" },
      { header: "Deskripsi Paket / Pekerjaan", widthRatio: 0.43 },
      { header: "Qty", widthRatio: 0.12, align: "center" },
      { header: "Harga Satuan", widthRatio: 0.19, align: "right" },
      { header: "Subtotal (IDR)", widthRatio: 0.19, align: "right" },
    ],
    tableRows: safeItems.map((it, idx) => [
      String(idx + 1),
      it.item,
      it.qty.toLocaleString("id-ID"),
      fmtRp(it.price),
      fmtRp(it.qty * it.price),
    ]),
    summaryRows: [
      { label: "Total Nilai Purchase Order", value: fmtRp(params.poValue) },
    ],
    terbilangAmount: params.poValue,
    notes: [
      "Gunakan Kode Akses PO di atas pada Portal Pembeli untuk memantau progres pekerjaan dan mengunduh dokumen tagihan resmi.",
    ],
    leftSignatureLabel: "Diajukan Oleh (Klien),",
    leftSignatureName: `${params.clientName} - ${params.clientCompany?.trim() || "Pihak Klien"}`,
    rightSignatureLabel: `Diterima Oleh, ${params.company.company_name}`,
    rightSignatureName: `${params.company.signer_name} - ${params.company.signer_title}`,
    rightSignatureImageUrl: params.company.signer_signature_path ?? null,
    footerDocNumber: params.poNumber,
    refDocNumber: params.quotationReference || "-",
    docStatus: params.statusLabel,
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

  const forceTwoDecimals = hasAnyDecimalCurrency([params.amount]);
  const fmtAmount = formatDocRupiah(params.amount, forceTwoDecimals);
  const leftSigDisplay = params.requesterRole
    ? `${params.requesterName} - ${params.requesterRole}`
    : params.requesterName;

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
      amountText: fmtAmount,
      dueDateText: params.paidDate
        ? `Telah Dicairkan: ${formatDocDateLong(params.paidDate)}`
        : `Diajukan Pada: ${formatDocDateLong(params.requestDate)}`,
    },
    company: params.company,
    recipientTitle: "Penerima Dana / Rekening Tujuan",
    recipientLines: [
      params.recipientName,
      params.recipientBankInfo
        ? `Rekening / Bank: ${params.recipientBankInfo}`
        : "Rekening Tujuan: –",
    ],
    metaRows: [
      { label: "Tanggal Pengajuan", value: formatDocDateLong(params.requestDate) },
      { label: "Nomor Form PA", value: params.requestNumber },
      { label: "Pemohon / Pengaju", value: params.requesterName },
      { label: "Proyek Terkait", value: params.projectName ?? "Operasional Umum" },
      { label: "Pos Akun Beban", value: params.expenseAccountName ?? "-" },
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
    tableRows: [["1", params.purpose, fmtAmount]],
    summaryRows: [
      { label: "Total Biaya Diajukan", value: fmtAmount },
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
    ],
    leftSignatureLabel: "Diajukan Oleh (Pemohon),",
    leftSignatureName: leftSigDisplay,
    rightSignatureLabel: "Disetujui Oleh (Finance / Admin),",
    rightSignatureName:
      params.approverName ??
      `${params.company.signer_name} - ${params.company.signer_title}`,
    rightSignatureImageUrl: params.company.signer_signature_path ?? null,
    footerDocNumber: params.requestNumber,
    refDocNumber: "-",
    docStatus: params.status,
  };
}
