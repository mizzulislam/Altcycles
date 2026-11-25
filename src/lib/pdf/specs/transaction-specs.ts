import {
  formatDateTimeID,
  formatDocDateLong,
  formatDocEmpty,
  formatDocRupiah,
  hasAnyDecimalCurrency,
  terbilangRupiah,
} from "@/lib/formatters";
import { getActiveLanguage } from "@/lib/i18n";
import type {
  ClientPoItemJson,
  CompanyProfileRow,
  PaymentRequestStatus,
  ProfileRow,
} from "@/types/database.types";
import { resolveDocumentSigner } from "../document-signer-config";
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
  lang?: "id" | "en";
}): PdfDocumentSpec {
  const lang = params.lang ?? getActiveLanguage();
  const isEn = lang === "en";

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
      ? { text: isEn ? "PAID" : "LUNAS", variant: "success" as const }
      : params.docStatus === "cancelled"
        ? { text: isEn ? "CANCELLED" : "DIBATALKAN", variant: "danger" as const }
        : params.docStatus === "draft"
          ? { text: "DRAFT", variant: "neutral" as const }
          : { text: isEn ? "ISSUED" : "TERBIT", variant: "info" as const });

  // Tabel rincian item: dukung multi-item dan single-item
  let tableColumns: PdfTableColumn[];
  let tableRows: string[][];

  if (params.items && params.items.length > 0) {
    const hasDuration = params.items.some((it) => Boolean(it.duration));
    if (hasDuration) {
      tableColumns = [
        { header: "No", widthRatio: 0.06, align: "center" },
        { header: isEn ? "Description" : "Deskripsi", widthRatio: 0.34 },
        { header: "Qty", widthRatio: 0.11, align: "center" },
        { header: isEn ? "Duration" : "Durasi", widthRatio: 0.11, align: "center" },
        { header: isEn ? "Unit Price" : "Harga Satuan", widthRatio: 0.19, align: "right" },
        { header: "Subtotal (IDR)", widthRatio: 0.19, align: "right" },
      ];
      tableRows = params.items.map((it, idx) => [
        String(idx + 1),
        it.description,
        `${it.qty} ${it.unit ?? (isEn ? "Package" : "Paket")}`,
        it.duration ?? formatDocEmpty(),
        fmtRp(it.unitPrice),
        fmtRp(it.subtotal),
      ]);
    } else {
      tableColumns = [
        { header: "No", widthRatio: 0.07, align: "center" },
        { header: isEn ? "Description" : "Deskripsi", widthRatio: 0.43 },
        { header: "Qty", widthRatio: 0.12, align: "center" },
        { header: isEn ? "Unit Price" : "Harga Satuan", widthRatio: 0.19, align: "right" },
        { header: "Subtotal (IDR)", widthRatio: 0.19, align: "right" },
      ];
      tableRows = params.items.map((it, idx) => [
        String(idx + 1),
        it.description,
        `${it.qty} ${it.unit ?? (isEn ? "Package" : "Paket")}`,
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
      { header: isEn ? "Description" : "Deskripsi", widthRatio: 0.43 },
      { header: "Qty", widthRatio: 0.12, align: "center" },
      { header: isEn ? "Unit Price" : "Harga Satuan", widthRatio: 0.19, align: "right" },
      { header: "Subtotal (IDR)", widthRatio: 0.19, align: "right" },
    ];
    tableRows = [
      [
        "1",
        params.description,
        `${qty} ${params.unit ?? (isEn ? "Package" : "Paket")}`,
        fmtRp(unitPrice),
        fmtRp(params.subtotal),
      ],
    ];
  }

  // Akumulasi termin dan estimasi PPh 23
  const summaryRows: PdfKeyValue[] = [
    { label: isEn ? "Subtotal Billed" : "Subtotal Tagihan", value: fmtRp(params.subtotal) },
    ...(params.company.pkp_enabled
      ? [
          {
            label: isEn ? `VAT (${params.company.ppn_rate}%)` : `PPN (${params.company.ppn_rate}%)`,
            value: fmtRp(params.ppnAmount),
          },
        ]
      : []),
    { label: isEn ? "Total Invoice Amount" : "Total Tagihan Invoice", value: fmtRp(params.totalAmount) },
  ];

  if (params.contractValue && params.contractValue > 0) {
    summaryRows.push(
      {
        label: isEn ? "Total Contract Value" : "Total Nilai Kontrak Proyek",
        value: fmtRp(params.contractValue),
      },
      {
        label: isEn ? "Previous Invoiced Total" : "Akumulasi Tagihan Sebelumnya",
        value: fmtRp(prevBilledVal),
      },
      {
        label: isEn ? "Current Milestone Billed" : "Tagihan Termin Berjalan",
        value: fmtRp(params.subtotal),
      },
      {
        label: isEn ? "Remaining Contract Value" : "Sisa Nilai Kontrak",
        value: fmtRp(remainingContractVal),
      },
    );
  }

  if (params.includePph23Estimate) {
    summaryRows.push(
      {
        label: isEn ? "Estimated WHT Art. 23 (2%)" : "Estimasi Potongan PPh 23 (2%)",
        value: fmtRp(pph23EstVal),
      },
      {
        label: isEn ? "Estimated Net Cash Received" : "Estimasi Kas Neto Diterima",
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
      : isEn
        ? "OFFICIAL BILLING DOCUMENT (NON-VAT)"
        : "DOKUMEN TAGIHAN RESMI (NON-PKP)",
    docNumber: params.invoiceNumber,
    docDate: params.invoiceDate,
    statusBadge,
    balanceDueBox: {
      label:
        dueAmount === 0
          ? isEn
            ? "BILLING STATUS"
            : "STATUS TAGIHAN"
          : isEn
            ? "TOTAL BALANCE DUE"
            : "TOTAL TAGIHAN JATUH TEMPO",
      amountText: dueAmount === 0 ? (isEn ? "PAID" : "LUNAS") : fmtRp(dueAmount),
      dueDateText:
        dueAmount === 0
          ? isEn
            ? "Fully Settled"
            : "Lunas Sepenuhnya"
          : isEn
            ? `Due Date: ${formatDocDateLong(params.dueDate, "en")}`
            : `Jatuh Tempo: ${formatDocDateLong(params.dueDate)}`,
    },
    company: params.company,
    clientLogoUrl: params.customerLogoUrl ?? null,
    recipientTitle: isEn ? "Billed To" : "Ditagihkan Kepada",
    recipientLines: [
      params.customerName,
      ...(picDisplay ? [picDisplay] : []),
      params.customerAddress || "-",
    ],
    metaRows: [
      {
        label: isEn ? "Issue Date" : "Tanggal Terbit",
        value: formatDocDateLong(params.invoiceDate, lang),
      },
      {
        label: isEn ? "Due Date" : "Tanggal Jatuh Tempo",
        value: formatDocDateLong(params.dueDate, lang),
      },
      { label: isEn ? "Project" : "Proyek", value: params.projectName },
      { label: isEn ? "Client PO Reference" : "Referensi PO Klien", value: params.clientPoNumber },
      ...(params.spkNumber
        ? [{ label: isEn ? "Contract / SPK Ref" : "Referensi SPK / Kontrak", value: params.spkNumber }]
        : []),
      ...(params.bakpNumber
        ? [{ label: isEn ? "BAKP Milestone Ref" : "Referensi BAKP Acuan", value: params.bakpNumber }]
        : []),
      ...(params.bastNumber
        ? [{ label: isEn ? "BAST Handover Ref" : "Referensi BAST Acuan", value: params.bastNumber }]
        : []),
      ...(normalizedServicePeriod
        ? [{ label: isEn ? "Service Period" : "Periode Layanan", value: normalizedServicePeriod }]
        : []),
    ],
    tableColumns,
    tableRows,
    summaryRows,
    terbilangAmount: params.totalAmount,
    notes: isEn
      ? [
          "Payment shall be made via bank transfer to the account above on or before the due date.",
          `Late Payment Clause: ${params.overdueClauseText ?? "Late payment after the due date may result in temporary suspension of services and/or project schedule adjustment in accordance with the agreement."}`,
          "Payment confirmation to finance +62 878-0256-8095 or altvira.tech@gmail.com",
        ]
      : [
          "Pembayaran dilakukan via transfer ke rekening di atas paling lambat pada tanggal jatuh tempo.",
          `Klausul Keterlambatan: ${params.overdueClauseText ?? "Keterlambatan pembayaran setelah tanggal jatuh tempo dapat mengakibatkan penangguhan sementara operasional layanan dan/atau penyesuaian jadwal pelaksanaan sesuai perjanjian kerja sama."}`,
          "Konfirmasi pembayaran ke finance +62 878-0256-8095 atau altvira.tech@gmail.com",
        ],
    notesTitle: isEn ? "Payment Terms" : "Ketentuan Pembayaran",
    paymentDetail: {
      terbilangText: terbilangRupiah(params.totalAmount, lang),
      bankName: cleanBankName,
      accountNumber: params.company.bank_account_number || "-",
      accountHolder: params.company.bank_account_holder || "-",
      transferNews: params.invoiceNumber,
      isPaid: params.paymentStatus === "paid" || dueAmount === 0,
      swiftCode: (params.company as { swift_code?: string | null }).swift_code || null,
    },
    documentNotes: (params as { documentNotes?: string | null }).documentNotes ?? null,
    rightSignatureLabel: isEn
      ? `Sincerely, ${params.company.company_name}`
      : `Hormat kami, ${params.company.company_name}`,
    rightSignatureName: `${params.company.signer_name} - ${params.company.signer_title}`,
    rightSignatureImageUrl: resolveDocumentSigner({
      docType: "INV",
      slot: "right",
      company: params.company,
      signerName: params.company.signer_name,
      signerJobTitle: params.company.signer_title,
    }).signatureImageUrl,
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
  lang?: "id" | "en";
}): PdfDocumentSpec {
  const lang = params.lang ?? getActiveLanguage();
  const isEn = lang === "en";

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
    docTitle: isEn ? "RECEIPT" : "KUITANSI",
    docSubtitle: isEn ? "OFFICIAL PAYMENT RECEIPT" : "BUKTI PENERIMAAN PEMBAYARAN RESMI",
    docNumber: params.receiptNumber,
    docDate: params.receiptDate,
    statusBadge: {
      text: isEn ? "PAID" : "LUNAS",
      variant: "success",
    },
    balanceDueBox: {
      label: isEn ? "PAYMENT STATUS: PAID" : "STATUS PEMBAYARAN: LUNAS",
      amountText: fmtAmount,
      dueDateText: isEn
        ? `Received On: ${formatDocDateLong(params.receiptDate, "en")}`
        : `Diterima Pada: ${formatDocDateLong(params.receiptDate)}`,
    },
    company: params.company,
    metaRows: [
      {
        label: isEn ? "Receipt Date" : "Tanggal Terima",
        value: formatDocDateLong(params.receiptDate, lang),
      },
      {
        label: isEn ? "Received From" : "Telah Terima Dari",
        value: params.receivedFrom,
      },
      {
        label: isEn ? "Payment For" : "Untuk Pembayaran",
        value: isEn
          ? `Settlement / Payment for Invoice ${params.invoiceNumber}`
          : `Pelunasan / Pembayaran Invoice ${params.invoiceNumber}`,
      },
      {
        label: isEn ? "Project Name" : "Nama Proyek",
        value: params.projectName,
      },
      ...(params.clientPoNumber
        ? [{ label: isEn ? "Client PO Reference" : "Referensi PO Klien", value: params.clientPoNumber }]
        : []),
      ...(normalizedServicePeriod
        ? [{ label: isEn ? "Service Period" : "Periode Layanan", value: normalizedServicePeriod }]
        : []),
      ...(params.paymentMethod
        ? [{ label: isEn ? "Method / Account" : "Metode / Rekening", value: params.paymentMethod }]
        : []),
      {
        label: isEn ? "Payment Amount" : "Jumlah Pembayaran",
        value: fmtAmount,
      },
    ],
    summaryRows: [{ label: isEn ? "Amount Received" : "Jumlah Diterima", value: fmtAmount }],
    terbilangAmount: params.amount,
    hasMeterai: needsMeterai,
    meteraiLabel: isEn ? "E-METERAI Rp10,000 SLOT" : "TEMPAT E-METERAI Rp10.000",
    appreciationBarText: isEn
      ? `Thank you for choosing Altvira, ${params.receivedFrom}`
      : `Terima kasih telah memilih Altvira, ${params.receivedFrom}`,
    notes: isEn
      ? [
          "This official receipt is valid and binding evidence of payment received for the referenced invoice.",
          needsMeterai
            ? "Stamp duty Rp10,000 included in accordance with Law No. 10 of 2020 on Stamp Duty."
            : "Payment amount is below stamp duty threshold in accordance with Law No. 10 of 2020.",
        ]
      : [
          "Kuitansi ini merupakan bukti penerimaan pembayaran yang sah dan mengikat atas tagihan invoice terkait.",
          needsMeterai
            ? "Bea meterai Rp10.000 telah diperhitungkan sesuai UU No. 10 Tahun 2020 tentang Bea Meterai."
            : "Nilai pembayaran di bawah batas pengenaan bea meterai sesuai UU No. 10 Tahun 2020.",
        ],
    rightSignatureLabel: isEn
      ? `Received By, ${params.company.company_name}`
      : `Penerima, ${params.company.company_name}`,
    rightSignatureName: `${params.company.signer_name} - ${params.company.signer_title}`,
    rightSignatureImageUrl: resolveDocumentSigner({
      docType: "KW",
      slot: "right",
      company: params.company,
      signerName: params.company.signer_name,
      signerJobTitle: params.company.signer_title,
    }).signatureImageUrl,
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
  lang?: "id" | "en";
}): PdfDocumentSpec {
  const lang = params.lang ?? getActiveLanguage();
  const isEn = lang === "en";

  const defaultItemDesc = isEn
    ? "Package / Service as per PO submission"
    : "Paket Pekerjaan / Layanan Sesuai Pengajuan PO";

  const safeItems =
    params.items.length > 0
      ? params.items
      : [{ item: defaultItemDesc, qty: 1, price: params.poValue }];

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
    /terverifikasi|disetujui|sah|verified|approved/i.test(statusUpper)
      ? { text: isEn ? "VERIFIED" : "TERVERIFIKASI", variant: "success" }
      : /tolak|batal|rejected|cancelled/i.test(statusUpper)
        ? { text: isEn ? "REJECTED" : "DITOLAK", variant: "danger" }
        : { text: isEn ? (statusUpper === "DIAJUKAN" ? "SUBMITTED" : statusUpper) : (statusUpper || "DIAJUKAN"), variant: "info" };

  const metaRows: PdfKeyValue[] = [
    {
      label: isEn ? "PO Date" : "Tanggal PO",
      value: formatDocDateLong(params.poDate, lang),
    },
    {
      label: isEn ? "Client PO Number" : "Nomor PO Klien",
      value: params.poNumber,
    },
    ...(params.quotationReference?.trim()
      ? [{ label: isEn ? "Quotation Reference" : "Referensi Quotation", value: params.quotationReference.trim() }]
      : []),
    ...(params.projectLabel?.trim()
      ? [{ label: isEn ? "Related Project" : "Proyek Terkait", value: params.projectLabel.trim() }]
      : []),
    {
      label: isEn ? "Verification Status" : "Status Verifikasi",
      value: isEn
        ? /terverifikasi|disetujui|sah/i.test(params.statusLabel)
          ? "Verified"
          : /tolak|batal/i.test(params.statusLabel)
            ? "Rejected"
            : "Submitted"
        : params.statusLabel,
    },
  ];

  return {
    docTitle: isEn ? "CLIENT PURCHASE ORDER" : "PURCHASE ORDER (PO) KLIEN",
    docSubtitle: isEn
      ? "Official Client Purchase Order Document"
      : "Dokumen Pengajuan Pesanan Resmi Pelanggan",
    docNumber: params.poNumber,
    docDate: params.poDate,
    statusBadge,
    company: params.company,
    recipientTitle: isEn ? "Submitted By Client" : "Diajukan Oleh Klien",
    recipientLines,
    metaRows,
    paragraphsBefore: [
      isEn
        ? "This Client Purchase Order is officially issued through Altvira Technology Customer Portal as an order submission for services or deliverables."
        : "Dokumen Purchase Order (PO) Klien ini diterbitkan secara resmi melalui Portal Pelanggan Altvira Technology sebagai bukti pengajuan pesanan pekerjaan atau layanan.",
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.07, align: "center" },
      { header: isEn ? "Scope Description" : "Deskripsi Pekerjaan", widthRatio: 0.43 },
      { header: "Qty", widthRatio: 0.12, align: "center" },
      { header: isEn ? "Unit Price" : "Harga Satuan", widthRatio: 0.19, align: "right" },
      { header: "Subtotal (IDR)", widthRatio: 0.19, align: "right" },
    ],
    tableRows: safeItems.map((it, idx) => [
      String(idx + 1),
      it.item,
      it.qty.toLocaleString(isEn ? "en-US" : "id-ID"),
      fmtRp(it.price),
      fmtRp(it.qty * it.price),
    ]),
    summaryRows: [
      {
        label: isEn ? "Total Purchase Order Value" : "Total Nilai Purchase Order",
        value: fmtRp(params.poValue),
      },
    ],
    terbilangAmount: params.poValue,
    notes: [
      isEn
        ? "Use the PO Access Code above on the Customer Portal to monitor project progress and download official invoices."
        : "Gunakan Kode Akses PO di atas pada Portal Pembeli untuk memantau progres pekerjaan dan mengunduh dokumen tagihan resmi.",
    ],
    leftSignatureLabel: isEn ? "Submitted By (Client)," : "Diajukan Oleh (Klien),",
    leftSignatureName: `${params.clientName} - ${params.clientCompany?.trim() || (isEn ? "Client Party" : "Pihak Klien")}`,
    rightSignatureLabel: isEn
      ? `Accepted By, ${params.company.company_name}`
      : `Diterima Oleh, ${params.company.company_name}`,
    rightSignatureName: `${params.company.signer_name} - ${params.company.signer_title}`,
    rightSignatureImageUrl: resolveDocumentSigner({
      docType: "CLIENT_PO",
      slot: "right",
      company: params.company,
      signerName: params.company.signer_name,
      signerJobTitle: params.company.signer_title,
    }).signatureImageUrl,
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
  requesterId?: string | null;
  requesterName: string;
  requesterRole?: string;
  requesterSignatureUrl?: string | null;
  projectName?: string | null;
  expenseAccountName?: string | null;
  recipientName: string;
  recipientBankInfo?: string | null;
  purpose: string;
  amount: number;
  status: PaymentRequestStatus | string;
  statusLabel?: string;
  approverId?: string | null;
  approverName?: string | null;
  approverSignatureUrl?: string | null;
  approvedAt?: string | null;
  paidDate?: string | null;
  rejectionReason?: string | null;
  attachmentNames?: string[];
  profiles?: ProfileRow[];
  lang?: "id" | "en";
}): PdfDocumentSpec {
  const lang = params.lang ?? getActiveLanguage();
  const isEn = lang === "en";

  const statusTone: DocStatusVariant =
    params.status === "paid"
      ? "success"
      : params.status === "approved"
        ? "info"
        : params.status === "rejected"
          ? "danger"
          : "warning";

  const statusText = isEn
    ? params.status === "paid"
      ? "DISBURSED (PAID)"
      : params.status === "approved"
        ? "APPROVED"
        : params.status === "rejected"
          ? "REJECTED"
          : "PENDING APPROVAL"
    : params.status === "paid"
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
    docTitle: isEn
      ? "PAYMENT APPROVAL"
      : "FORM PERSETUJUAN PEMBAYARAN (PAYMENT APPROVAL)",
    docSubtitle: isEn
      ? params.revisionNo && params.revisionNo > 0
        ? `DISBURSEMENT & VERIFICATION SHEET (REV.${params.revisionNo})`
        : "DISBURSEMENT & VERIFICATION SHEET"
      : params.revisionNo && params.revisionNo > 0
        ? `LEMBAR VERIFIKASI & PENCAIRAN DANA BIAYA (REV.${params.revisionNo})`
        : "LEMBAR VERIFIKASI & PENCAIRAN DANA BIAYA",
    docNumber: params.requestNumber,
    docDate: params.requestDate,
    statusBadge: {
      text: statusText,
      variant: statusTone,
    },
    balanceDueBox: {
      label: isEn ? "TOTAL PAYMENT AMOUNT" : "TOTAL NOMINAL PEMBAYARAN",
      amountText: fmtAmount,
      dueDateText: params.paidDate
        ? isEn
          ? `Disbursed On: ${formatDocDateLong(params.paidDate, "en")}`
          : `Telah Dicairkan: ${formatDocDateLong(params.paidDate)}`
        : isEn
          ? `Submitted On: ${formatDocDateLong(params.requestDate, "en")}`
          : `Diajukan Pada: ${formatDocDateLong(params.requestDate)}`,
    },
    company: params.company,
    recipientTitle: isEn
      ? "Payee / Destination Account"
      : "Penerima Dana / Rekening Tujuan",
    recipientLines: [
      params.recipientName,
      params.recipientBankInfo
        ? isEn
          ? `Account / Bank: ${params.recipientBankInfo}`
          : `Rekening / Bank: ${params.recipientBankInfo}`
        : isEn
          ? "Destination Account: –"
          : "Rekening Tujuan: –",
    ],
    metaRows: [
      {
        label: isEn ? "Submission Date" : "Tanggal Pengajuan",
        value: formatDocDateLong(params.requestDate, lang),
      },
      {
        label: isEn ? "PA Form Number" : "Nomor Form PA",
        value: params.requestNumber,
      },
      {
        label: isEn ? "Requester / Submitter" : "Pemohon / Pengaju",
        value: params.requesterName,
      },
      {
        label: isEn ? "Related Project" : "Proyek Terkait",
        value: params.projectName ?? (isEn ? "General Operations" : "Operasional Umum"),
      },
      {
        label: isEn ? "Expense Account" : "Pos Akun Beban",
        value: params.expenseAccountName ?? "-",
      },
      ...(params.approvedAt
        ? [
            {
              label: isEn ? "Approved On" : "Disetujui Pada",
              value: formatDateTimeID(params.approvedAt),
            },
          ]
        : []),
      ...(params.paidDate
        ? [
            {
              label: isEn ? "Disbursement Date" : "Tanggal Pencairan Kas",
              value: formatDocDateLong(params.paidDate, lang),
            },
          ]
        : []),
    ],
    tableColumns: [
      { header: "No", widthRatio: 0.08, align: "center" },
      {
        header: isEn ? "Payment Purpose Description" : "Deskripsi Keperluan Pembayaran",
        widthRatio: 0.62,
      },
      { header: "Nominal (IDR)", widthRatio: 0.3, align: "right" },
    ],
    tableRows: [["1", params.purpose, fmtAmount]],
    summaryRows: [
      {
        label: isEn ? "Total Amount Requested" : "Total Biaya Diajukan",
        value: fmtAmount,
      },
    ],
    terbilangAmount: params.amount,
    notes: [
      ...(params.rejectionReason
        ? [
            isEn
              ? `Rejection Reason: ${params.rejectionReason}`
              : `Alasan Penolakan: ${params.rejectionReason}`,
          ]
        : []),
      ...(params.attachmentNames && params.attachmentNames.length > 0
        ? [
            isEn
              ? `Attached Supporting Documents: ${params.attachmentNames.join(", ")}`
              : `Dokumen Pendukung Terlampir: ${params.attachmentNames.join(", ")}`,
          ]
        : []),
      isEn
        ? "This payment request must be verified and approved by authorized Financial Officer prior to cash disbursement or bank transfer."
        : "Pengajuan pembayaran ini wajib diverifikasi dan disetujui Pejabat Keuangan sebelum pencairan kas atau transfer bank dilakukan.",
    ],
    leftSignatureLabel: isEn
      ? "Submitted By (Requester),"
      : "Diajukan Oleh (Pemohon),",
    leftSignatureName: leftSigDisplay,
    leftSignatureImageUrl: resolveDocumentSigner({
      docType: "PA",
      slot: "left",
      company: params.company,
      profiles: params.profiles,
      signerUserId: params.requesterId,
      signerName: params.requesterName,
      signerJobTitle: params.requesterRole,
      explicitSignatureUrl: params.requesterSignatureUrl,
    }).signatureImageUrl,
    rightSignatureLabel: isEn
      ? "Approved By (Finance / Admin),"
      : "Disetujui Oleh (Finance / Admin),",
    rightSignatureName:
      params.approverName ??
      `${params.company.signer_name} - ${params.company.signer_title}`,
    rightSignatureImageUrl: resolveDocumentSigner({
      docType: "PA",
      slot: "right",
      company: params.company,
      profiles: params.profiles,
      signerUserId: params.approverId,
      signerName: params.approverName ?? params.company.signer_name,
      signerJobTitle: params.company.signer_title,
      explicitSignatureUrl: params.approverSignatureUrl,
    }).signatureImageUrl,
    footerDocNumber: params.requestNumber,
    refDocNumber: "-",
    docStatus: params.status,
  };
}
