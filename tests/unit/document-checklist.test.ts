import { describe, expect, it } from "vitest";
import {
  validateInvoiceChecklist,
  validatePurchaseOrderChecklist,
} from "@/lib/document-checklist";

describe("Checklist Validasi Dokumen Sebelum Terbit (Langkah 7)", () => {
  const validCompany = {
    company_name: "Altvira Technology",
    bank_account_number: "1234567890",
    bank_name: "Bank BCA",
  };

  const validCustomer = {
    id: "cust-001",
    name: "PT Mitra Sejahtera",
  };

  const validClientPo = {
    id: "cpo-001",
    status: "verified",
  };

  it("menolak penerbitan invoice bila identitas perusahaan / rekening belum lengkap", () => {
    const res = validateInvoiceChecklist({
      company: null,
      customer: validCustomer,
      clientPo: validClientPo,
      invoiceDate: "2026-11-01",
      dueDate: "2026-11-15",
      invoiceKind: "down_payment",
      subtotalAmount: 10_000_000,
    });
    expect(res.isValid).toBe(false);
    expect(res.items.find((i) => i.id === "master_identity")?.passed).toBe(false);
  });

  it("menolak penerbitan invoice bila PO Klien induk belum diverifikasi Admin", () => {
    const res = validateInvoiceChecklist({
      company: validCompany,
      customer: validCustomer,
      clientPo: { id: "cpo-002", status: "pending" },
      invoiceDate: "2026-11-01",
      dueDate: "2026-11-15",
      invoiceKind: "down_payment",
      subtotalAmount: 10_000_000,
    });
    expect(res.isValid).toBe(false);
    expect(res.items.find((i) => i.id === "parent_po")?.passed).toBe(false);
  });

  it("menolak invoice termin bila dokumen BAKP belum disetujui klien", () => {
    const res = validateInvoiceChecklist({
      company: validCompany,
      customer: validCustomer,
      clientPo: validClientPo,
      invoiceDate: "2026-11-01",
      dueDate: "2026-11-15",
      invoiceKind: "milestone",
      bakp: { id: "bakp-001", status: "draft" },
      subtotalAmount: 20_000_000,
    });
    expect(res.isValid).toBe(false);
    expect(res.items.find((i) => i.id === "supporting_doc")?.passed).toBe(false);
  });

  it("menolak invoice bila tanggal jatuh tempo lebih awal dari tanggal terbit", () => {
    const res = validateInvoiceChecklist({
      company: validCompany,
      customer: validCustomer,
      clientPo: validClientPo,
      invoiceDate: "2026-11-15",
      dueDate: "2026-11-01",
      invoiceKind: "down_payment",
      subtotalAmount: 10_000_000,
    });
    expect(res.isValid).toBe(false);
    expect(res.items.find((i) => i.id === "due_date")?.passed).toBe(false);
  });

  it("menolak invoice bila subtotal tagihan bernilai 0 atau negatif", () => {
    const res = validateInvoiceChecklist({
      company: validCompany,
      customer: validCustomer,
      clientPo: validClientPo,
      invoiceDate: "2026-11-01",
      dueDate: "2026-11-15",
      invoiceKind: "down_payment",
      subtotalAmount: 0,
    });
    expect(res.isValid).toBe(false);
    expect(res.items.find((i) => i.id === "subtotal_amount")?.passed).toBe(false);
  });

  it("meloloskan invoice bila seluruh 6 butir checklist terpenuhi", () => {
    const res = validateInvoiceChecklist({
      company: validCompany,
      customer: validCustomer,
      clientPo: validClientPo,
      invoiceDate: "2026-11-01",
      dueDate: "2026-11-15",
      invoiceKind: "down_payment",
      subtotalAmount: 15_000_000,
    });
    expect(res.isValid).toBe(true);
    expect(res.items.every((i) => i.passed)).toBe(true);
  });

  it("memvalidasi checklist PO Vendor (vendor, item kuantitas & harga satuan, over-budget)", () => {
    // 1. Tanpa vendor
    const resNoVendor = validatePurchaseOrderChecklist({
      vendor: null,
      poDate: "2026-11-01",
      items: [{ description: "Hosting", quantity: 1, unitPrice: 1_000_000 }],
    });
    expect(resNoVendor.isValid).toBe(false);

    // 2. Tanpa item atau kuantitas 0
    const resBadItems = validatePurchaseOrderChecklist({
      vendor: { id: "ven-001", name: "PT Cloud Hosting" },
      poDate: "2026-11-01",
      items: [{ description: "Hosting", quantity: 0, unitPrice: 1_000_000 }],
    });
    expect(resBadItems.isValid).toBe(false);

    // 3. Over-budget tanpa konfirmasi
    const resOverBudget = validatePurchaseOrderChecklist({
      vendor: { id: "ven-001", name: "PT Cloud Hosting" },
      poDate: "2026-11-01",
      items: [{ description: "Server", quantity: 1, unitPrice: 50_000_000 }],
      exceedsBudget: true,
      ackBudgetWarning: false,
    });
    expect(resOverBudget.isValid).toBe(false);

    // 4. Lolos bila over-budget telah dikonfirmasi
    const resValid = validatePurchaseOrderChecklist({
      vendor: { id: "ven-001", name: "PT Cloud Hosting" },
      poDate: "2026-11-01",
      items: [{ description: "Server", quantity: 1, unitPrice: 50_000_000 }],
      exceedsBudget: true,
      ackBudgetWarning: true,
    });
    expect(resValid.isValid).toBe(true);
  });
});
