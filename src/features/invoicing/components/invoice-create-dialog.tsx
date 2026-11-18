import * as React from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Spinner } from "@/components/ui/empty";
import { Textarea } from "@/components/ui/textarea";
import { DocumentIssueChecklistCard } from "@/components/shared/document-issue-checklist";
import { cn } from "@/lib/utils";
import { formatDateID, formatRupiah, roundRupiah } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
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
  down_payment: "Uang Muka (DP)",
  milestone: "Termin Progres (Wajib BAKP)",
  final_settlement: "Pelunasan Akhir (Wajib BAST)",
};

export const INVOICE_KIND_LABELS_EN: Record<InvoiceKind, string> = {
  down_payment: "Down Payment (DP)",
  milestone: "Progress Milestone (Requires BAKP)",
  final_settlement: "Final Settlement (Requires BAST)",
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
  const { language } = useLanguage();
  const isEn = language === "en";
  const kindLabels = isEn ? INVOICE_KIND_LABELS_EN : INVOICE_KIND_LABELS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEn ? "Issue Client Sales Invoice" : "Terbitkan Invoice Penagihan Klien"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="min-w-0">
          <FieldGroup className="gap-3.5">
            <Field>
              <FieldLabel required>{isEn ? "Client Project" : "Proyek Klien"}</FieldLabel>
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isEn ? "Select client project" : "Pilih proyek klien"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {projects.length === 0 ? (
                      <SelectItem value="__empty" disabled>
                        {isEn ? "No active client projects" : "Belum ada proyek klien aktif"}
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
                <FieldLabel htmlFor="inv-date" required>{isEn ? "Invoice Date" : "Tanggal Invoice"}</FieldLabel>
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
                    } catch {}
                  }}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="inv-due" required>{isEn ? "Due Date" : "Tanggal Jatuh Tempo"}</FieldLabel>
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
                <FieldLabel required>{isEn ? "Billing Kind" : "Jenis Tagihan"}</FieldLabel>
                <Select
                  value={invoiceKind}
                  onValueChange={(v) => setInvoiceKind(v as InvoiceKind)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isEn ? "Select billing kind" : "Pilih jenis tagihan"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {Object.entries(kindLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>{isEn ? "Verified Client PO Reference" : "Referensi PO Klien Terverifikasi"}</FieldLabel>
                <Select value={clientPoId} onValueChange={setClientPoId}>
                  <SelectTrigger>
                    <SelectValue placeholder={isEn ? "Select Client PO" : "Pilih PO Klien"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {projectVerifiedPos.length === 0 ? (
                        <SelectItem value="__empty" disabled>
                          {isEn ? "No verified Client PO for this project" : "Belum ada PO Klien terverifikasi untuk proyek ini"}
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
                    {isEn ? "Verify client PO in Project Documents & Milestones first." : "Verifikasi PO klien di menu Dokumen & Termin Proyek terlebih dahulu."}
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
                <FieldLabel>{isEn ? "Project Milestone" : "Termin Proyek"}</FieldLabel>
                <Select
                  value={milestoneId}
                  onValueChange={(id) => {
                    setMilestoneId(id);
                    const ms = projectMilestones.find((m) => m.id === id);
                    if (ms) setSubtotalAmount(ms.amount);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isEn ? "Select milestone" : "Pilih termin proyek"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="none">{isEn ? "No Specific Milestone" : "Tanpa Termin Spesifik"}</SelectItem>
                      {projectMilestones.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}: {formatRupiah(m.amount)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              {invoiceKind === "milestone" ? (
                <Field>
                  <FieldLabel>{isEn ? "Client-Approved BAKP Document" : "Dokumen BAKP Disetujui Klien"}</FieldLabel>
                  <Select value={bakpId} onValueChange={setBakpId}>
                    <SelectTrigger>
                      <SelectValue placeholder={isEn ? "Select BAKP" : "Pilih BAKP"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">
                          {projectApprovedBakps.length === 0
                            ? (isEn ? "No approved BAKP yet" : "Belum ada BAKP disetujui klien")
                            : (isEn ? "Select BAKP Document" : "Pilih Dokumen BAKP")}
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
                  <FieldLabel>{isEn ? "Signed BAST Document" : "Dokumen BAST Ditandatangani"}</FieldLabel>
                  <Select value={bastId} onValueChange={setBastId}>
                    <SelectTrigger>
                      <SelectValue placeholder={isEn ? "Select BAST" : "Pilih BAST"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">
                          {projectSignedBasts.length === 0
                            ? (isEn ? "No signed BAST yet" : "Belum ada BAST ditandatangani")
                            : (isEn ? "Select BAST Document" : "Pilih Dokumen BAST")}
                        </SelectItem>
                        {projectSignedBasts.map((h) => (
                          <SelectItem key={h.id} value={h.id}>
                            {h.bast_number} ({formatDateID(h.bast_date)})
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
                  {isEn ? "Subtotal Billing Amount (IDR Rounded)" : "Nominal Subtotal Tagihan (Rp Bulat)"}
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
                    {isEn ? "VAT / PPN" : "PPN"} {company.ppn_rate}%:{" "}
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
                <FieldLabel>{isEn ? "Accounting Recognition Mode" : "Mode Pencatatan Saat Terbit"}</FieldLabel>
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
                        {isEn ? "Post to Accounts Receivable first" : "Catat ke Piutang Usaha terlebih dahulu"}
                      </SelectItem>
                      {cashAccounts.map((ca) => (
                        <SelectItem key={ca.id} value={ca.id}>
                          {isEn ? "Paid in cash/transfer directly to " : "Dibayar Tunai/Transfer Langsung ke "}
                          {ca.code} — {ca.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  {isEn
                    ? "Supports recording through Accounts Receivable or direct cash settlement."
                    : "Mendukung pencatatan lewat Piutang Usaha maupun kas langsung."}
                </FieldDescription>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="inv-notes">{isEn ? "Invoice Notes" : "Catatan Invoice"}</FieldLabel>
              <Textarea
                id="inv-notes"
                rows={2}
                className="min-h-[64px]"
                placeholder={isEn ? "Optional: billing notes, contract reference, or payment instructions..." : "Opsional: keterangan penagihan, referensi kontrak, atau instruksi pembayaran..."}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>

            <DocumentIssueChecklistCard items={invoiceChecklist.items} />

            <DialogFooter className="pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {isEn ? "Cancel" : "Batal"}
              </Button>
              <Button
                type="submit"
                disabled={issuing || !invoiceChecklist.isValid}
              >
                {issuing ? <Spinner data-icon="inline-start" /> : null}
                {isEn ? "Issue Invoice & Post Journal" : "Terbitkan Invoice & Posting Jurnal"}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
