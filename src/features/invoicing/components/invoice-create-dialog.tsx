import * as React from "react";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ModalFooterAction } from "@/components/patterns";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DocumentIssueChecklistCard } from "@/components/shared/document-issue-checklist";
import { cn } from "@/lib/utils";
import { formatDateI18n, formatRupiah, roundRupiah } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import {
  INVOICE_KIND_MAP,
  getLocalizedAccountName,
  getLocalizedInvoiceKind,
  getLocalizedMilestoneName,
} from "@/lib/glossary";
import type {
  AccountRow,
  ClientPurchaseOrderRow,
  CompanyProfileRow,
  HandoverReportRow,
  InvoiceKind,
  MilestoneRow,
  ProgressReportRow,
  ProjectRow,
} from "@/types/database.types";
import type { ChecklistItem } from "@/lib/document-checklist";

export const INVOICE_KIND_LABELS: Record<InvoiceKind, string> = {
  down_payment: INVOICE_KIND_MAP.down_payment.id,
  milestone: INVOICE_KIND_MAP.milestone.id,
  final_settlement: INVOICE_KIND_MAP.final_settlement.id,
};

export const INVOICE_KIND_LABELS_EN: Record<InvoiceKind, string> = {
  down_payment: INVOICE_KIND_MAP.down_payment.en,
  milestone: INVOICE_KIND_MAP.milestone.en,
  final_settlement: INVOICE_KIND_MAP.final_settlement.en,
};

export interface InvoiceCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectRow[];
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  invDate: string;
  setInvDate: (d: string) => void;
  dueDate: string;
  setDueDate: (d: string) => void;
  invoiceKind: InvoiceKind;
  setInvoiceKind: (k: InvoiceKind) => void;
  clientPoId: string;
  setClientPoId: (id: string) => void;
  projectVerifiedPos: ClientPurchaseOrderRow[];
  milestoneId: string;
  setMilestoneId: (id: string) => void;
  projectMilestones: MilestoneRow[];
  bakpId: string;
  setBakpId: (id: string) => void;
  projectApprovedBakps: ProgressReportRow[];
  bastId: string;
  setBastId: (id: string) => void;
  projectSignedBasts: HandoverReportRow[];
  subtotalAmount: number;
  setSubtotalAmount: (amount: number) => void;
  company: CompanyProfileRow | null;
  directCashAccountId: string;
  setDirectCashAccountId: (id: string) => void;
  cashAccounts: AccountRow[];
  notes: string;
  setNotes: (n: string) => void;
  invoiceChecklist: { items: ChecklistItem[]; isValid: boolean };
  issuing: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function InvoiceCreateDialog({
  open,
  onOpenChange,
  projects,
  selectedProjectId,
  setSelectedProjectId,
  invDate,
  setInvDate,
  dueDate,
  setDueDate,
  invoiceKind,
  setInvoiceKind,
  clientPoId,
  setClientPoId,
  projectVerifiedPos,
  milestoneId,
  setMilestoneId,
  projectMilestones,
  bakpId,
  setBakpId,
  projectApprovedBakps,
  bastId,
  setBastId,
  projectSignedBasts,
  subtotalAmount,
  setSubtotalAmount,
  company,
  directCashAccountId,
  setDirectCashAccountId,
  cashAccounts,
  notes,
  setNotes,
  invoiceChecklist,
  issuing,
  onSubmit,
}: InvoiceCreateDialogProps) {
  const { t, language } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("invoicing:modal_create.title", "Terbitkan Invoice Penagihan Klien")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="min-w-0">
          <FieldGroup className="gap-3.5">
            <Field>
              <FieldLabel required>{t("invoicing:modal_create.field_project", "Proyek Klien")}</FieldLabel>
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("invoicing:modal_create.field_project_placeholder", "Pilih proyek klien")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {projects.length === 0 ? (
                      <SelectItem value="__empty" disabled>
                        {t("invoicing:modal_create.no_projects", "Belum ada proyek klien aktif")}
                      </SelectItem>
                    ) : (
                      projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.code} — {p.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="inv-date" required>{t("invoicing:modal_create.field_invoice_date", "Tanggal Invoice")}</FieldLabel>
                <DatePicker
                  id="inv-date"
                  required
                  value={invDate}
                  onChange={(v) => {
                    setInvDate(v);
                    try {
                      const d = new Date(v);
                      if (!isNaN(d.getTime())) {
                        d.setDate(d.getDate() + 14);
                        setDueDate(d.toISOString().split("T")[0]!);
                      }
                    } catch {
                      // Abaikan parsing tanggal invalid
                    }
                  }}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="inv-due" required>{t("invoicing:modal_create.field_due_date", "Tanggal Jatuh Tempo")}</FieldLabel>
                <DatePicker
                  id="inv-due"
                  required
                  minDate={invDate}
                  value={dueDate}
                  onChange={setDueDate}
                />
              </Field>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field>
                <FieldLabel required>{t("invoicing:modal_create.field_billing_type", "Jenis Tagihan")}</FieldLabel>
                <Select
                  value={invoiceKind}
                  onValueChange={(v) => setInvoiceKind(v as InvoiceKind)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("invoicing:modal_create.field_billing_type", "Pilih jenis tagihan")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {(["down_payment", "milestone", "final_settlement"] as const).map((k) => (
                        <SelectItem key={k} value={k}>
                          {t(`invoicing:invoice_kind.${k}`, getLocalizedInvoiceKind(k, language))}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>{t("invoicing:modal_create.field_client_po", "Referensi PO Klien Terverifikasi")}</FieldLabel>
                <Select value={clientPoId} onValueChange={setClientPoId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("invoicing:modal_create.field_client_po_placeholder", "Pilih PO Klien")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {projectVerifiedPos.length === 0 ? (
                        <SelectItem value="__empty" disabled>
                          {t("invoicing:modal_create.no_verified_cpo", "Belum ada PO Klien terverifikasi untuk proyek ini")}
                        </SelectItem>
                      ) : (
                        projectVerifiedPos.map((cpo) => (
                          <SelectItem key={cpo.id} value={cpo.id}>
                            {cpo.po_number} ({formatRupiah(cpo.po_value)})
                          </SelectItem>
                        ))
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {projectVerifiedPos.length === 0 ? (
                  <FieldDescription className="text-amber-600 dark:text-amber-400">
                    {t("invoicing:modal_create.verify_cpo_hint", "Verifikasi PO klien di menu Dokumen & Termin Proyek terlebih dahulu.")}
                  </FieldDescription>
                ) : null}
              </Field>
            </div>

            <div
              className={cn(
                "grid gap-3.5",
                invoiceKind === "milestone" || invoiceKind === "final_settlement"
                  ? "sm:grid-cols-2"
                  : "grid-cols-1",
              )}
            >
              <Field>
                <FieldLabel>{t("invoicing:modal_create.field_milestone", "Termin Proyek")}</FieldLabel>
                <Select
                  value={milestoneId}
                  onValueChange={(id) => {
                    setMilestoneId(id);
                    const ms = projectMilestones.find((m) => m.id === id);
                    if (ms) setSubtotalAmount(ms.amount);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("invoicing:modal_create.field_milestone_placeholder", "Pilih termin proyek")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="none">{t("invoicing:modal_create.no_specific_milestone", "Tanpa Termin Spesifik")}</SelectItem>
                      {projectMilestones.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {getLocalizedMilestoneName(m.name, language)}: {formatRupiah(m.amount)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              {invoiceKind === "milestone" ? (
                <Field>
                  <FieldLabel>{t("invoicing:modal_create.field_bakp", "Dokumen BAKP Disetujui Klien")}</FieldLabel>
                  <Select value={bakpId} onValueChange={setBakpId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("invoicing:modal_create.field_bakp_placeholder", "Pilih BAKP")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">
                          {projectApprovedBakps.length === 0
                            ? t("invoicing:modal_create.no_bakp_approved", "Belum ada BAKP disetujui klien")
                            : t("invoicing:modal_create.field_bakp_placeholder", "Pilih Dokumen BAKP")}
                        </SelectItem>
                        {projectApprovedBakps.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.bakp_number} ({b.cumulative_percentage}%)
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}

              {invoiceKind === "final_settlement" ? (
                <Field>
                  <FieldLabel>{t("invoicing:modal_create.field_bast", "Dokumen BAST Ditandatangani")}</FieldLabel>
                  <Select value={bastId} onValueChange={setBastId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("invoicing:modal_create.field_bast_placeholder", "Pilih BAST")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">
                          {projectSignedBasts.length === 0
                            ? t("invoicing:modal_create.no_bast_signed", "Belum ada BAST ditandatangani")
                            : t("invoicing:modal_create.field_bast_placeholder", "Pilih Dokumen BAST")}
                        </SelectItem>
                        {projectSignedBasts.map((h) => (
                          <SelectItem key={h.id} value={h.id}>
                            {h.bast_number} ({formatDateI18n(h.bast_date, language)})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="inv-amt" required>
                  {t("invoicing:modal_create.field_subtotal", "Nominal Subtotal Tagihan (Rp Bulat)")}
                </FieldLabel>
                <NumberInput
                  id="inv-amt"
                  allowDecimal={false}
                  min={1}
                  required
                  value={subtotalAmount}
                  onValueChange={setSubtotalAmount}
                />
                {company?.pkp_enabled && subtotalAmount > 0 ? (
                  <FieldDescription>
                    PPN {company.ppn_rate}%:{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      {formatRupiah(
                        roundRupiah((roundRupiah(subtotalAmount) * company.ppn_rate) / 100),
                      )}
                    </span>{" "}
                    • Total:{" "}
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatRupiah(
                        roundRupiah(subtotalAmount) +
                          roundRupiah((roundRupiah(subtotalAmount) * company.ppn_rate) / 100),
                      )}
                    </span>
                  </FieldDescription>
                ) : null}
              </Field>
              <Field>
                <FieldLabel>{t("invoicing:modal_create.field_destination_account", "Mode Pencatatan Saat Terbit")}</FieldLabel>
                <Select
                  value={directCashAccountId}
                  onValueChange={setDirectCashAccountId}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="none">
                        {t("invoicing:modal_create.post_to_ar", "Catat ke Piutang Usaha terlebih dahulu")}
                      </SelectItem>
                      {cashAccounts.map((ca) => (
                        <SelectItem key={ca.id} value={ca.id}>
                          {t("invoicing:modal_create.paid_direct", "Dibayar Tunai/Transfer Langsung ke")}{" "}
                          {ca.code} — {getLocalizedAccountName(ca, language)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  {t("invoicing:modal_create.recog_mode_desc", "Mendukung pencatatan lewat Piutang Usaha maupun kas langsung.")}
                </FieldDescription>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="inv-notes">{t("invoicing:modal_create.field_notes", "Catatan Invoice")}</FieldLabel>
              <Textarea
                id="inv-notes"
                rows={2}
                className="min-h-[64px]"
                placeholder={t("invoicing:modal_create.notes_placeholder", "Opsional: keterangan penagihan, referensi kontrak, atau instruksi pembayaran...")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>

            <DocumentIssueChecklistCard items={invoiceChecklist.items} />

            <ModalFooterAction
              className="pt-1"
              onCancel={() => onOpenChange(false)}
              saving={issuing}
              disabled={issuing || !invoiceChecklist.isValid}
              cancelLabel={t("common:action.cancel", "Batal")}
              submitLabel={t("invoicing:modal_create.btn_submit", "Terbitkan Invoice & Posting Jurnal")}
            />
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
