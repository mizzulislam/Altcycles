export type ChecklistItem = {
  id: string;
  label: string;
  passed: boolean;
  message?: string;
  required?: boolean;
};

export type DocumentValidationResult = {
  isValid: boolean;
  items: ChecklistItem[];
};

/**
 * Validasi checklist sebelum penerbitan Invoice Penagihan Klien (Standar Dokumen Altvira).
 */
export function validateInvoiceChecklist(params: {
  company: {
    company_name?: string;
    bank_account_number?: string;
    bank_name?: string;
  } | null;
  customer: { id?: string; name?: string } | null;
  clientPo: { id?: string; status?: string } | null;
  invoiceDate: string;
  dueDate: string;
  invoiceKind:
    | "down_payment"
    | "milestone"
    | "final_settlement"
    | "standard"
    | string;
  bakp?: { id?: string; status?: string } | null;
  bast?: { id?: string; status?: string } | null;
  subtotalAmount: number;
}): DocumentValidationResult {
  const items: ChecklistItem[] = [
    {
      id: "master_identity",
      label: "Identitas Penerbit & Rekening Bank Resmi",
      passed: Boolean(
        params.company?.company_name &&
          params.company?.bank_account_number &&
          params.company?.bank_name,
      ),
      message:
        "Profil perusahaan dan rekening bank penerimaan wajib terdaftar di master data.",
      required: true,
    },
    {
      id: "client_identity",
      label: "Identitas Klien Pemesan Terdaftar",
      passed: Boolean(params.customer?.id && params.customer?.name),
      message: "Klien pemesan wajib dipilih dari master pelanggan.",
      required: true,
    },
    {
      id: "parent_po",
      label: "Rujukan Nomor PO Klien Terverifikasi Admin",
      passed: Boolean(
        params.clientPo?.id && params.clientPo?.status === "verified",
      ),
      message:
        "PO Klien wajib dipilih dan telah diverifikasi Admin sebelum invoice terbit.",
      required: true,
    },
    {
      id: "supporting_doc",
      label:
        params.invoiceKind === "milestone"
          ? "Rujukan BAKP Disetujui Klien (Wajib untuk Termin)"
          : params.invoiceKind === "final_settlement"
            ? "Rujukan BAST Ditandatangani (Wajib untuk Pelunasan)"
            : "Rujukan Dokumen Pekerjaan / SPK Terkait",
      passed:
        params.invoiceKind === "milestone"
          ? Boolean(
              params.bakp?.id && params.bakp?.status === "approved_by_client",
            )
          : params.invoiceKind === "final_settlement"
            ? Boolean(params.bast?.id && params.bast?.status === "signed")
            : true,
      message:
        params.invoiceKind === "milestone"
          ? "Dokumen Berita Acara Kemajuan Pekerjaan (BAKP) wajib disetujui klien."
          : params.invoiceKind === "final_settlement"
            ? "Dokumen Berita Acara Serah Terima (BAST) wajib sudah ditandatangani para pihak."
            : undefined,
      required:
        params.invoiceKind === "milestone" ||
        params.invoiceKind === "final_settlement",
    },
    {
      id: "due_date",
      label: "Tanggal Jatuh Tempo Valid (≥ Tanggal Terbit, Rekomendasi +14 Hari)",
      passed: Boolean(
        params.invoiceDate &&
          params.dueDate &&
          params.dueDate >= params.invoiceDate,
      ),
      message:
        "Tanggal jatuh tempo tidak boleh lebih awal dari tanggal invoice.",
      required: true,
    },
    {
      id: "subtotal_amount",
      label: "Rincian Tagihan Bernilai Positif (> Rp 0)",
      passed: params.subtotalAmount > 0,
      message: "Nominal subtotal tagihan harus lebih besar dari Rp 0.",
      required: true,
    },
  ];

  return {
    isValid: items.every((it) => it.passed),
    items,
  };
}

/**
 * Validasi checklist sebelum pembuatan & penerbitan Purchase Order Vendor.
 */
export function validatePurchaseOrderChecklist(params: {
  vendor: { id?: string; name?: string } | null;
  poDate: string;
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
  exceedsBudget?: boolean;
  ackBudgetWarning?: boolean;
}): DocumentValidationResult {
  const items: ChecklistItem[] = [
    {
      id: "vendor_identity",
      label: "Vendor / Pemasok Terdaftar di Master Data",
      passed: Boolean(params.vendor?.id && params.vendor?.name),
      message: "Pilih vendor penyedia barang/jasa dari master data.",
      required: true,
    },
    {
      id: "po_date",
      label: "Tanggal Penerbitan PO Valid",
      passed: Boolean(params.poDate && params.poDate.trim().length > 0),
      message: "Tanggal penerbitan PO wajib diisi.",
      required: true,
    },
    {
      id: "po_items",
      label: "Rincian Item Lengkap (Deskripsi, Kuantitas > 0, & Harga Satuan)",
      passed:
        params.items.length > 0 &&
        params.items.every(
          (it) =>
            it.description.trim().length > 0 &&
            it.quantity > 0 &&
            it.unitPrice >= 0,
        ),
      message:
        "Minimal harus ada 1 item dengan deskripsi jelas, kuantitas ≥ 1, dan harga satuan.",
      required: true,
    },
    {
      id: "budget_check",
      label: "Kesesuaian Anggaran Proyek",
      passed: !params.exceedsBudget || Boolean(params.ackBudgetWarning),
      message:
        "Bila nilai PO melebihi anggaran, wajib mencentang konfirmasi persetujuan over-budget.",
      required: true,
    },
  ];

  return {
    isValid: items.every((it) => it.passed),
    items,
  };
}
