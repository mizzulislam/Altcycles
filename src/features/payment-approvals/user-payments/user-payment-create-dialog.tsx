import * as React from "react";
import { toast } from "sonner";
import { ModalFooterAction } from "@/components/patterns";
import { ChartTypeSwitcher } from "@/components/shared/dashboard-charts";
import {
  GoogleDriveIcon,
  GoogleDrivePickerDialog,
  type GoogleDriveSelectResult,
} from "@/components/shared/google-drive-picker-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRupiah } from "@/lib/formatters";
import {
  createAndSubmitPaymentRequest,
  getProjectBudgetComparison,
} from "@/lib/operations-service";
import type {
  AccountRow,
  ProjectRow,
  PurchaseOrderRow,
} from "@/types/database.types";
import { getFriendlyExpenseCategory } from "./user-payments-types";

export interface UserPaymentCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectRow[];
  expenseAccounts: AccountRow[];
  myPos: PurchaseOrderRow[];
  onSuccess: () => Promise<void>;
  t: (key: string, params?: Record<string, unknown>) => string;
}

export function UserPaymentCreateDialog({
  open,
  onOpenChange,
  projects,
  expenseAccounts,
  myPos,
  onSuccess,
  t,
}: UserPaymentCreateDialogProps) {
  const [purpose, setPurpose] = React.useState("");
  const [recipientName, setRecipientName] = React.useState("");
  const [recipientBankInfo, setRecipientBankInfo] = React.useState("");
  const [amount, setAmount] = React.useState(0);
  const [projectId, setProjectId] = React.useState("");
  const [expenseAccountId, setExpenseAccountId] = React.useState("");
  const [poId, setPoId] = React.useState("none");
  const [proofSource, setProofSource] = React.useState<"local" | "gdrive">("local");
  const [proofFile, setProofFile] = React.useState<File | null>(null);
  const [gdriveProof, setGdriveProof] = React.useState<GoogleDriveSelectResult | null>(null);
  const [drivePickerOpen, setDrivePickerOpen] = React.useState(false);
  const [budgetRemaining, setBudgetRemaining] = React.useState<number | null>(null);
  const [ackWarning, setAckWarning] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Initialize defaults when lists become available
  React.useEffect(() => {
    if (!projectId && projects[0]) setProjectId(projects[0].id);
    if (!expenseAccountId && expenseAccounts[0]) setExpenseAccountId(expenseAccounts[0].id);
  }, [projects, expenseAccounts, projectId, expenseAccountId]);

  React.useEffect(() => {
    if (!projectId || !expenseAccountId || !open) {
      setBudgetRemaining(null);
      return;
    }
    void getProjectBudgetComparison(projectId)
      .then((rows) => {
        const match = rows.find((r) => r.account_id === expenseAccountId);
        setBudgetRemaining(match ? match.remaining_amount : null);
      })
      .catch(() => setBudgetRemaining(null));
  }, [projectId, expenseAccountId, open]);

  const exceedsBudget =
    budgetRemaining !== null && amount > budgetRemaining;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (proofSource === "local") {
      if (!proofFile) {
        toast.error("Wajib memilih berkas lampiran bukti tagihan/invoice (PDF/JPG/PNG).");
        return;
      }
      if (proofFile.size > 5 * 1024 * 1024) {
        toast.error("Ukuran berkas bukti maksimal 5 MB.");
        return;
      }
    } else {
      if (!gdriveProof) {
        toast.error("Wajib memilih berkas lampiran dari Google Drive.");
        return;
      }
    }

    if (exceedsBudget && !ackWarning) {
      toast.error("Centang konfirmasi peringatan anggaran terlebih dahulu.");
      return;
    }
    setSubmitting(true);
    try {
      const proofPayload =
        proofSource === "local" && proofFile
          ? {
              name: proofFile.name,
              mimeType: proofFile.type || "application/pdf",
              sizeBytes: proofFile.size,
              blob: proofFile,
            }
          : {
              name: gdriveProof!.customName || `Google_Drive_${gdriveProof!.fileId}.pdf`,
              mimeType: "application/pdf",
              sizeBytes: 1024,
              storagePathOverride: gdriveProof!.viewUrl,
            };

      const created = await createAndSubmitPaymentRequest({
        purpose,
        recipientName,
        recipientBankInfo,
        amount,
        projectId,
        expenseAccountId,
        poId: poId === "none" ? null : poId,
        proofFile: proofPayload,
        budgetWarningAcknowledged: ackWarning,
      });
      toast.success(
        t("approvals:submit_success", {
          number: created.request_number,
          defaultValue: `Pengajuan ${created.request_number} berhasil dikirim ke antrean Admin.`,
        }),
      );
      onOpenChange(false);
      setPurpose("");
      setRecipientName("");
      setRecipientBankInfo("");
      setAmount(0);
      setProofFile(null);
      setGdriveProof(null);
      setAckWarning(false);
      await onSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("approvals:submit_error", { defaultValue: "Gagal mengirim pengajuan." }),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("approvals:modals.create_title")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="min-w-0">
            <FieldGroup className="gap-3.5">
              <Field>
                <FieldLabel htmlFor="pa-purpose" required>{t("approvals:modals.field_purpose")}</FieldLabel>
                <Input
                  id="pa-purpose"
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder={t("approvals:modals.placeholder_purpose")}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="pa-rec" required>{t("approvals:modals.field_recipient_name")}</FieldLabel>
                  <Input
                    id="pa-rec"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="pa-bank" required>{t("approvals:modals.field_bank_info")}</FieldLabel>
                  <Input
                    id="pa-bank"
                    required
                    value={recipientBankInfo}
                    onChange={(e) => setRecipientBankInfo(e.target.value)}
                    placeholder={t("approvals:modals.placeholder_bank")}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel required>{t("approvals:modals.field_project")}</FieldLabel>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("approvals:modals.select_project_placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {projects.length === 0 ? (
                          <SelectItem value="__empty" disabled>
                            {t("approvals:modals.no_projects_assigned")}
                          </SelectItem>
                        ) : (
                          projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} ({p.code})
                            </SelectItem>
                          ))
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel required>{t("approvals:modals.field_expense_category")}</FieldLabel>
                  <Select
                    value={expenseAccountId}
                    onValueChange={setExpenseAccountId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("approvals:modals.placeholder_expense_category")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {expenseAccounts.length === 0 ? (
                          <SelectItem value="__empty" disabled>
                            {t("approvals:modals.no_expense_categories")}
                          </SelectItem>
                        ) : (
                          expenseAccounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {getFriendlyExpenseCategory(a, t as (k: string) => string).label}
                            </SelectItem>
                          ))
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {(() => {
                    const selectedAcc = expenseAccounts.find(
                      (a) => a.id === expenseAccountId,
                    );
                    if (!selectedAcc) return null;
                    return (
                      <FieldDescription>
                        {t("approvals:modals.example_prefix", {
                          hint: getFriendlyExpenseCategory(selectedAcc, t as (k: string) => string).hint,
                        })}
                      </FieldDescription>
                    );
                  })()}
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="pa-amt" required>{t("approvals:modals.field_amount")}</FieldLabel>
                  <NumberInput
                    id="pa-amt"
                    allowDecimal={false}
                    min={1}
                    required
                    value={amount}
                    onValueChange={setAmount}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t("approvals:modals.field_link_po")}</FieldLabel>
                  <Select value={poId} onValueChange={setPoId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">{t("approvals:modals.po_none")}</SelectItem>
                        {myPos.map((po) => (
                          <SelectItem key={po.id} value={po.id}>
                            {po.po_number} ({formatRupiah(po.total_amount)})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {exceedsBudget ? (
                <Alert variant="destructive">
                  <AlertTitle>{t("approvals:modals.budget_warning_title")}</AlertTitle>
                  <AlertDescription className="flex flex-col gap-2">
                    <span>
                      {t("approvals:modals.budget_warning_desc", {
                        amount: formatRupiah(amount),
                        budget: formatRupiah(budgetRemaining ?? 0),
                      })}
                    </span>
                    <div className="flex items-center gap-2.5 text-xs font-medium">
                      <Checkbox
                        id="ack-payment-budget-warning"
                        checked={ackWarning}
                        onCheckedChange={setAckWarning}
                      />
                      <label
                        htmlFor="ack-payment-budget-warning"
                        className="cursor-pointer select-none leading-relaxed"
                      >
                        {t("approvals:modals.budget_warning_ack")}
                      </label>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : null}

              <Field>
                <div className="flex items-center justify-between mb-1.5">
                  <FieldLabel required>{t("approvals:modals.field_attachments")}</FieldLabel>
                  <ChartTypeSwitcher
                    value={proofSource}
                    onChange={(val) => setProofSource(val as "local" | "gdrive")}
                    options={[
                      {
                        value: "local",
                        label: t("approvals:modals.proof_local"),
                        title: t("approvals:modals.proof_local"),
                      },
                      {
                        value: "gdrive",
                        label: t("approvals:modals.proof_gdrive"),
                        title: t("approvals:modals.proof_gdrive"),
                        icon: GoogleDriveIcon,
                      },
                    ]}
                  />
                </div>

                {proofSource === "local" ? (
                  <>
                    <Input
                      id="pa-file"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      required={proofSource === "local"}
                      onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                    />
                    <FieldDescription>
                      {t("approvals:modals.proof_local_hint")}
                    </FieldDescription>
                  </>
                ) : (
                  <div className="space-y-2">
                    {gdriveProof ? (
                      <div className="flex items-center justify-between p-3 rounded-xl border border-primary/35 dark:border-sky-500/40 bg-primary/5 dark:bg-sky-950/20 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <GoogleDriveIcon className="size-5 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {gdriveProof.customName || `Berkas_Drive_${gdriveProof.fileId}`}
                            </p>
                            <a
                              href={gdriveProof.viewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-primary hover:underline truncate block"
                            >
                              {t("approvals:modals.proof_gdrive_view")}
                            </a>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDrivePickerOpen(true)}
                          className="text-xs h-8 rounded-xl shrink-0"
                        >
                          {t("approvals:modals.proof_gdrive_change")}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDrivePickerOpen(true)}
                        className="w-full h-11 rounded-xl border-dashed border-2 border-primary/40 dark:border-sky-500/40 flex items-center justify-center gap-2 text-xs font-semibold hover:bg-primary/5 dark:hover:bg-sky-950/20 cursor-pointer"
                      >
                        <GoogleDriveIcon className="size-4" />
                        <span>{t("approvals:modals.proof_gdrive_btn")}</span>
                      </Button>
                    )}
                    <FieldDescription>
                      {t("approvals:modals.proof_gdrive_hint")}
                    </FieldDescription>
                  </div>
                )}
              </Field>

              <ModalFooterAction
                onCancel={() => onOpenChange(false)}
                saving={submitting}
                cancelLabel={t("approvals:modals.btn_cancel")}
                submitLabel={t("approvals:modals.btn_submit")}
              />
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <GoogleDrivePickerDialog
        open={drivePickerOpen}
        onOpenChange={setDrivePickerOpen}
        mode="document"
        onSelect={(res) => {
          setGdriveProof(res);
        }}
      />
    </>
  );
}
