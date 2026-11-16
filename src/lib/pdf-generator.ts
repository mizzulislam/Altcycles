/**
 * Facade Hub untuk Mesin PDF Generator Altcycles.
 *
 * Menggabungkan seluruh domain sub-modul terstruktur di `src/lib/pdf/`:
 * - `pdf/pdf-types`: Tipe data & interface dokumen PDF terstandar
 * - `pdf/pdf-tokens`: Token tata letak, metrik font AFM, palet warna, dan pemetaan judul
 * - `pdf/pdf-download`: Helper download & pratinjau cetak peramban
 * - `pdf/specs/transaction-specs`: Builder spesifikasi PDF dokumen transaksi bisnis (Invoice, Kuitansi, PO, Payment Approval)
 * - `pdf/specs/accounting-specs`: Builder spesifikasi PDF dokumen siklus akuntansi & laporan keuangan
 * - `pdf/spk-charter-pdf`: Generator PDF khusus dokumen kontrak kerjasama SPK / Project Charter 10 pasal
 * - `pdf/pdf-engine`: Core PDF rendering engine & collision detector layout inspector
 */

export * from "./pdf/pdf-types";
export * from "./pdf/pdf-tokens";
export * from "./pdf/pdf-download";
export * from "./pdf/specs/transaction-specs";
export * from "./pdf/specs/accounting-specs";
export * from "./pdf/spk-charter-pdf";
export * from "./pdf/pdf-engine";
