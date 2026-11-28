import { downloadPdfBytes, generateDocumentPdf } from "@/lib/pdf-generator";
import { downloadWordBlob, generateDocumentWord } from "@/lib/word-generator";
import { recordExportLog } from "@/lib/operations-service";
import type {
  ReceiptRow,
  SalesInvoiceRow,
} from "@/types/database.types";
import {
  makeInvoiceSpec as buildInvoiceSpecHelper,
  makeReceiptSpec as buildReceiptSpecHelper,
  type InvoiceSpecBuilderContext,
} from "./invoice-spec-builder";

export async function handleDownloadInvoicePdf(
  inv: SalesInvoiceRow,
  specContext: InvoiceSpecBuilderContext,
) {
  const spec = buildInvoiceSpecHelper(inv, specContext);
  if (!spec) return;
  const bytes = await generateDocumentPdf(spec);
  downloadPdfBytes(bytes, `${inv.invoice_number.replace(/\//g, "_")}.pdf`);
  await recordExportLog("SALES_INVOICE", "PDF");
}

export async function handleDownloadInvoiceWord(
  inv: SalesInvoiceRow,
  specContext: InvoiceSpecBuilderContext,
) {
  const spec = buildInvoiceSpecHelper(inv, specContext);
  if (!spec) return;
  const blob = await generateDocumentWord(spec);
  downloadWordBlob(blob, `${inv.invoice_number.replace(/\//g, "_")}.docx`);
  await recordExportLog("SALES_INVOICE", "PDF");
}

export async function handleDownloadReceiptPdf(
  kw: ReceiptRow,
  specContext: InvoiceSpecBuilderContext,
) {
  const spec = buildReceiptSpecHelper(kw, specContext);
  if (!spec) return;
  const bytes = await generateDocumentPdf(spec);
  downloadPdfBytes(bytes, `${kw.receipt_number.replace(/\//g, "_")}.pdf`);
  await recordExportLog("RECEIPT_KUITANSI", "PDF");
}

export async function handleDownloadReceiptWord(
  kw: ReceiptRow,
  specContext: InvoiceSpecBuilderContext,
) {
  const spec = buildReceiptSpecHelper(kw, specContext);
  if (!spec) return;
  const blob = await generateDocumentWord(spec);
  downloadWordBlob(blob, `${kw.receipt_number.replace(/\//g, "_")}.docx`);
  await recordExportLog("RECEIPT_KUITANSI", "PDF");
}
