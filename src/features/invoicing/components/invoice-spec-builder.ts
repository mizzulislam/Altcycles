import {
  buildInvoicePdfSpec,
  buildReceiptPdfSpec,
  type PdfDocumentSpec,
} from "@/lib/pdf-generator";
import type {
  CompanyProfileRow,
  CustomerRow,
  ProjectRow,
  ReceiptRow,
  SalesInvoiceRow,
} from "@/types/database.types";
import type { ProjectWorkspaceBundle } from "@/lib/operations-service";

export interface InvoiceSpecBuilderContext {
  company: CompanyProfileRow | null;
  bundle: ProjectWorkspaceBundle | null;
  customerMap: Map<string, CustomerRow>;
  projectMap: Map<string, ProjectRow>;
}

export function makeInvoiceSpec(
  inv: SalesInvoiceRow,
  ctx: InvoiceSpecBuilderContext,
): PdfDocumentSpec | null {
  const { company, bundle, customerMap, projectMap } = ctx;
  if (!company || !bundle) return null;

  const cust = customerMap.get(inv.customer_id);
  const prj = projectMap.get(inv.project_id);
  const cpo = bundle.clientPos.find((c) => c.id === inv.client_po_id);
  const ms = bundle.milestones.find((m) => m.id === inv.milestone_id);
  const bakp = bundle.bakpList.find((b) => b.id === inv.bakp_id);
  const bast = bundle.bastList.find((h) => h.id === inv.bast_id);
  const spk = bundle.documents.find(
    (d) => d.project_id === inv.project_id && d.doc_type === "SPK",
  );

  const projectMilestones = bundle.milestones.filter(
    (m) => m.project_id === inv.project_id,
  );
  const totalContractValue =
    projectMilestones.reduce((s, m) => s + m.amount, 0) ||
    prj?.contract_value ||
    cpo?.po_value ||
    inv.subtotal_amount;

  const projectInvoices = bundle.invoices.filter(
    (i) => i.project_id === inv.project_id,
  );
  const previousInvoices = projectInvoices.filter(
    (i) =>
      i.invoice_date < inv.invoice_date ||
      (i.invoice_date === inv.invoice_date &&
        i.invoice_number < inv.invoice_number),
  );
  const prevBilled = previousInvoices.reduce(
    (s, i) => s + i.subtotal_amount,
    0,
  );
  const remainingContract = Math.max(
    0,
    totalContractValue - (prevBilled + inv.subtotal_amount),
  );

  return buildInvoicePdfSpec({
    company,
    invoiceNumber: inv.invoice_number,
    invoiceDate: inv.invoice_date,
    dueDate: inv.due_date,
    customerName: cust?.company_name ?? cust?.name ?? "Klien",
    customerPic: cust?.contact_person,
    customerTitle: cust?.contact_title,
    customerAddress: cust?.address ?? "-",
    customerLogoUrl: cust?.logo_storage_path ?? null,
    projectName: prj ? `${prj.code} - ${prj.name}` : "Proyek",
    clientPoNumber: cpo?.po_number ?? "-",
    spkNumber: spk?.doc_number ?? null,
    bakpNumber: bakp?.bakp_number ?? null,
    bastNumber: bast?.bast_number ?? null,
    servicePeriod: ms
      ? /^termin\b/i.test(ms.name.trim())
        ? ms.name.trim()
        : `Termin: ${ms.name.trim()}`
      : undefined,
    description: ms
      ? `${ms.name} — Proyek ${prj?.name ?? ""}`
      : `Penagihan Proyek ${prj?.name ?? ""}`,
    qty: 1,
    unit: "Paket",
    subtotal: inv.subtotal_amount,
    ppnAmount: inv.ppn_amount,
    totalAmount: inv.total_amount,
    contractValue: totalContractValue,
    previousBilledAmount: prevBilled,
    remainingContractAmount: remainingContract,
    includePph23Estimate: Boolean(company.pph_enabled),
    docStatus: inv.doc_status,
    paymentStatus: inv.payment_status,
    balanceDue: inv.total_amount - inv.paid_amount,
  });
}

export function makeReceiptSpec(
  kw: ReceiptRow,
  ctx: InvoiceSpecBuilderContext,
): PdfDocumentSpec | null {
  const { company, bundle, projectMap } = ctx;
  if (!company || !bundle) return null;

  const inv = bundle.invoices.find((i) => i.id === kw.invoice_id);
  const prj = inv ? projectMap.get(inv.project_id) : undefined;
  const cpo = inv
    ? bundle.clientPos.find((c) => c.id === inv.client_po_id)
    : undefined;
  const ms = inv
    ? bundle.milestones.find((m) => m.id === inv.milestone_id)
    : undefined;

  return buildReceiptPdfSpec({
    company,
    receiptNumber: kw.receipt_number,
    receiptDate: kw.receipt_date,
    receivedFrom: kw.received_from,
    invoiceNumber: inv?.invoice_number ?? "-",
    projectName: prj ? `${prj.code} - ${prj.name}` : "Proyek Klien",
    clientPoNumber: cpo?.po_number ?? null,
    servicePeriod: ms
      ? /^termin\b/i.test(ms.name.trim())
        ? ms.name.trim()
        : `Termin: ${ms.name.trim()}`
      : null,
    paymentMethod: "Transfer Bank Resmi Altvira",
    amount: kw.amount,
    hasMeterai: kw.amount > 5_000_000,
  });
}
