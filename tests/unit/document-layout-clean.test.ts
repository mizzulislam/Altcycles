import { describe, expect, it } from "vitest";
import {
  buildInvoicePdfSpec,
  buildReceiptPdfSpec,
  generateDocumentPdf,
  generateSpkProjectCharterPdf,
} from "@/lib/pdf-generator";
import {
  generateDocumentWord,
  generateSpkProjectCharterWord,
} from "@/lib/word-generator";
import type { CompanyProfileRow, SpkCharterContent } from "@/types/database.types";

const mockCompany: CompanyProfileRow = {
  id: 1,
  company_name: "Altvira Technology",
  legal_entity_name: "PT Representasi Mitra Mandiri",
  email: "finance@altvira.com",
  phone: "0812-3456-7890",
  address: "Jl. Merdeka No. 10, Jakarta Selatan",
  tax_id_number: "01.234.567.8-901.000",
  bank_name: "Bank Central Asia (BCA)",
  bank_account_number: "1234567890",
  bank_account_holder: "PT Representasi Mitra Mandiri",
  signer_name: "Ahmad Faiz",
  signer_title: "Direktur Utama",
  signing_city: "Jakarta",
  pkp_enabled: false,
  ppn_rate: 11,
  pph_enabled: false,
  logo_storage_path: null,
  signer_signature_path: null,
  signer_paraf_path: null,
  updated_by: "user-1",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("Dokumen Layout Baru (Clean Modern Standard ala Figma/Atlassian)", () => {
  it("menghasilkan berkas PDF Invoice dengan layout monokromatik bersih", async () => {
    const spec = buildInvoicePdfSpec({
      company: mockCompany,
      invoiceNumber: "INV/ALT/2026/11/001",
      invoiceDate: "2026-11-01",
      dueDate: "2026-11-15",
      customerName: "PT Satu Dental Indonesia",
      customerAddress: "CBD C10, Jl. Pluit Selatan Raya No.1, Jakarta",
      projectName: "Pengembangan Portal Pasien",
      clientPoNumber: "PO-SDI-2026-099",
      description: "Pekerjaan Pengembangan Modul Integrasi Pembayaran Termin 1 (50%)",
      qty: 1,
      unit: "Paket",
      unitPrice: 20000000,
      subtotal: 20000000,
      ppnAmount: 0,
      totalAmount: 20000000,
    });

    const pdfBytes = await generateDocumentPdf(spec);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });

  it("menghasilkan berkas Word (.docx) Invoice yang selaras", async () => {
    const spec = buildInvoicePdfSpec({
      company: mockCompany,
      invoiceNumber: "INV/ALT/2026/11/001",
      invoiceDate: "2026-11-01",
      dueDate: "2026-11-15",
      customerName: "PT Satu Dental Indonesia",
      customerAddress: "CBD C10, Jl. Pluit Selatan Raya No.1, Jakarta",
      projectName: "Pengembangan Portal Pasien",
      clientPoNumber: "PO-SDI-2026-099",
      description: "Pekerjaan Pengembangan Modul Integrasi Pembayaran Termin 1 (50%)",
      qty: 1,
      unit: "Paket",
      unitPrice: 20000000,
      subtotal: 20000000,
      ppnAmount: 0,
      totalAmount: 20000000,
    });

    const wordBlob = await generateDocumentWord(spec);
    expect(wordBlob).toBeInstanceOf(Blob);
    expect(wordBlob.size).toBeGreaterThan(1000);
  });

  it("menghasilkan berkas PDF Kuitansi Pembayaran dengan slot e-Meterai clean", async () => {
    const spec = buildReceiptPdfSpec({
      company: mockCompany,
      receiptNumber: "KW/ALT/2026/11/001",
      receiptDate: "2026-11-05",
      receivedFrom: "PT Satu Dental Indonesia",
      invoiceNumber: "INV/ALT/2026/11/001",
      projectName: "Pengembangan Portal Pasien",
      amount: 20000000,
      hasMeterai: true,
    });

    const pdfBytes = await generateDocumentPdf(spec);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });

  it("menghasilkan berkas SPK / Project Charter PDF & Word dengan layout proporsional baru", async () => {
    const spkContent: SpkCharterContent = {
      headerSubtitle: "Project Charter / Surat Perjanjian Kerjasama",
      docVersion: "1.0",
      signingDate: "2026-11-01",
      signingCity: "Jakarta",
      partyOne: {
        name: "Ahmad Faiz",
        title: "Direktur Utama",
        company: "PT Representasi Mitra Mandiri",
        address: "Jl. Merdeka No. 10, Jakarta",
        email: "faiz@altvira.com",
        phone: "0812-3456-7890",
      },
      partyTwo: {
        name: "Budi Santoso",
        title: "VP of Engineering",
        company: "PT Satu Dental Indonesia",
        address: "CBD C10, Pluit, Jakarta",
        email: "budi@satudental.com",
        phone: "0811-9876-5432",
      },
      pasal1Tujuan: "Maksud dan tujuan kerja sama ini adalah implementasi sistem manajemen pasien terintegrasi.",
      scopeGroups: [
        {
          category: "Frontend & Backend Development",
          items: ["Integrasi API Pembayaran", "Manajemen Pasien", "Laporan Operasional"],
        },
      ],
      totalProjectCost: 50000000,
    };

    const pdfBytes = await generateSpkProjectCharterPdf({
      docNumber: "SPK/ALT/2026/11/001",
      docDate: "2026-11-01",
      docTitle: "SURAT PERJANJIAN KERJA SAMA",
      company: mockCompany,
      content: spkContent,
    });
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);

    const wordBlob = await generateSpkProjectCharterWord({
      docNumber: "SPK/ALT/2026/11/001",
      docDate: "2026-11-01",
      docTitle: "SURAT PERJANJIAN KERJA SAMA",
      company: mockCompany,
      content: spkContent,
    });
    expect(wordBlob).toBeInstanceOf(Blob);
    expect(wordBlob.size).toBeGreaterThan(1000);
  });
});
