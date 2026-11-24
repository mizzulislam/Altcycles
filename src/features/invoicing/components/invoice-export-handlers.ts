import { toast } from "sonner";
import { downloadCsvFile } from "@/lib/csv-exporter";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { formatDateI18n, formatRupiah } from "@/lib/formatters";
import { recordExportLog } from "@/lib/operations-service";
import { downloadPdfBytes, generateDocumentPdf } from "@/lib/pdf-generator";
import type {
  CompanyProfileRow,
  CustomerRow,
  ProjectRow,
} from "@/types/database.types";
import type { ProjectWorkspaceBundle } from "@/lib/operations/client-projects";

interface InvoiceExportParams {
  bundle: ProjectWorkspaceBundle | null;
  company: CompanyProfileRow | null;
  projectMap: Map<string, ProjectRow>;
  customerMap: Map<string, CustomerRow>;
  totalInvoiced: number;
  totalOutstanding: number;
  language: "id" | "en";
  t: (key: string, optionsOrFallback?: Record<string, unknown> | string, fallback?: string) => string;
}

export async function exportInvoicesToExcel({
  bundle,
  projectMap,
  customerMap,
  language,
  t,
}: InvoiceExportParams): Promise<void> {
  if (!bundle) return;
  await downloadExcelSheet({
    fileName: t("invoicing:export.excel_filename"),
    sheetName: t("invoicing:export.excel_sheet"),
    columns: [
      { header: t("invoicing:export.col_invoice_no"), width: 22 },
      { header: t("invoicing:export.col_issue_date"), width: 14 },
      { header: t("invoicing:export.col_due_date"), width: 14 },
      { header: t("invoicing:export.col_project"), width: 22 },
      { header: t("invoicing:export.col_customer"), width: 26 },
      { header: t("invoicing:export.col_total_amount"), width: 18 },
      { header: t("invoicing:export.col_paid_amount"), width: 18 },
      { header: t("invoicing:export.col_outstanding"), width: 18 },
      { header: t("invoicing:export.col_payment_status"), width: 16 },
    ],
    rows: bundle.invoices.map((inv) => [
      inv.invoice_number,
      formatDateI18n(inv.invoice_date, language),
      formatDateI18n(inv.due_date, language),
      projectMap.get(inv.project_id)?.code ?? "-",
      customerMap.get(inv.customer_id)?.name ?? t("common:role.user"),
      inv.total_amount,
      inv.paid_amount,
      inv.total_amount - inv.paid_amount,
      t(
        `invoicing:status.${inv.payment_status === "partial" ? "partially_paid" : inv.payment_status}`,
        inv.payment_status,
      ),
    ]),
  });
  await recordExportLog("SALES_INVOICES", "EXCEL");
  toast.success(t("invoicing:export.toast_excel_success"));
}

export async function exportInvoicesToPdf({
  bundle,
  company,
  projectMap,
  customerMap,
  totalInvoiced,
  totalOutstanding,
  language,
  t,
}: InvoiceExportParams): Promise<void> {
  if (!bundle || !company) return;
  const bytes = await generateDocumentPdf({
    docTitle: t("invoicing:export.pdf_title"),
    docSubtitle: t("invoicing:export.pdf_subtitle", {
      invoiced: formatRupiah(totalInvoiced),
      outstanding: formatRupiah(totalOutstanding),
    }),
    docNumber: `INV-RPT/${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
    docDate: new Date().toISOString().slice(0, 10),
    company,
    orientation: "landscape",
    tableColumns: [
      { header: t("invoicing:export.col_invoice_no"), widthRatio: 0.15 },
      { header: t("invoicing:export.col_issue_date"), widthRatio: 0.12 },
      { header: t("invoicing:export.col_due_date"), widthRatio: 0.12 },
      { header: t("invoicing:table.col_project_client"), widthRatio: 0.24 },
      { header: t("invoicing:table.col_total_billing"), widthRatio: 0.14, align: "right" },
      { header: t("invoicing:export.col_outstanding"), widthRatio: 0.13, align: "right" },
      { header: t("invoicing:table.col_status"), widthRatio: 0.10 },
    ],
    tableRows: bundle.invoices.map((inv) => [
      inv.invoice_number,
      formatDateI18n(inv.invoice_date, language),
      formatDateI18n(inv.due_date, language),
      `${projectMap.get(inv.project_id)?.code ?? "-"} - ${customerMap.get(inv.customer_id)?.name ?? t("common:role.user")}`,
      formatRupiah(inv.total_amount),
      formatRupiah(inv.total_amount - inv.paid_amount),
      t(
        `invoicing:status.${inv.payment_status === "partial" ? "partially_paid" : inv.payment_status}`,
        inv.payment_status,
      ),
    ]),
    rightSignatureName: `${company.signer_name} - ${company.signer_title}`,
  });
  downloadPdfBytes(bytes, t("invoicing:export.pdf_filename"));
  await recordExportLog("SALES_INVOICES", "PDF");
}

export async function exportInvoicesToCsv({
  bundle,
  projectMap,
  customerMap,
  t,
}: InvoiceExportParams): Promise<void> {
  if (!bundle) return;
  downloadCsvFile(
    t("invoicing:export.csv_filename"),
    [
      t("invoicing:export.col_invoice_no"),
      t("invoicing:export.col_issue_date"),
      t("invoicing:export.col_due_date"),
      t("invoicing:export.col_project"),
      t("invoicing:export.col_customer"),
      t("invoicing:export.col_total_amount"),
      t("invoicing:export.col_paid_amount"),
      t("invoicing:export.col_outstanding"),
      t("invoicing:export.col_payment_status"),
    ],
    bundle.invoices.map((inv) => [
      inv.invoice_number,
      inv.invoice_date,
      inv.due_date,
      projectMap.get(inv.project_id)?.code ?? "-",
      customerMap.get(inv.customer_id)?.name ?? t("common:role.user"),
      inv.total_amount,
      inv.paid_amount,
      inv.total_amount - inv.paid_amount,
      t(
        `invoicing:status.${inv.payment_status === "partial" ? "partially_paid" : inv.payment_status}`,
        inv.payment_status,
      ),
    ]),
  );
  await recordExportLog("SALES_INVOICES", "CSV");
  toast.success(t("invoicing:export.toast_csv_success"));
}
