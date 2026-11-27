import * as React from "react";
import {
  CalculatorIcon,
  CoinsIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  PlusIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/empty";
import { SectionLoader } from "@/components/ui/loader";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableLoadingRow,
  TableRow,
} from "@/components/ui/table";
import { getCompanyProfile, listProfiles, listProjects } from "@/lib/data-service";
import { useLanguage } from "@/lib/i18n";
import { downloadCsvFile } from "@/lib/csv-exporter";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import {
  formatDateTimeI18n,
  formatNpwpDisplay,
  formatRupiah,
  maskBankAccountNumber,
  maskNpwp,
} from "@/lib/formatters";
import {
  getProfitSharingBundle,
  recordExportLog,
  runProjectProfitSharing,
  saveProfitSharingScheme,
} from "@/lib/operations-service";
import { downloadPdfBytes, generateDocumentPdf } from "@/lib/pdf-generator";
import { getPtkpInfo, simulatePph21NonEmployee } from "@/lib/tax-calculation";
import type {
  ProfileRow,
  ProfitSharingLineRow,
  ProfitSharingResultRow,
  ProfitSharingSchemeRow,
  ProjectRow,
} from "@/types/database.types";
import { PageHeader } from "@/components/shared/page-header";

interface DraftRecipient {
  recipientName: string;
  recipientUserId: string;
  percentage: number;
}

export function ProfitSharingPage() {
  const { t, language } = useLanguage();
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [profiles, setProfiles] = React.useState<ProfileRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = React.useState("");
  const [schemes, setSchemes] = React.useState<ProfitSharingSchemeRow[]>([]);
  const [result, setResult] = React.useState<ProfitSharingResultRow | null>(
    null,
  );
  const [lines, setLines] = React.useState<ProfitSharingLineRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [postingDate, setPostingDate] = React.useState(() =>
    new Date().toLocaleDateString("en-CA"),
  );
  const [useManualSharedCost, setUseManualSharedCost] = React.useState(false);
  const [manualSharedCost, setManualSharedCost] = React.useState(0);
  const [simulating, setSimulating] = React.useState(false);
  const [finalizeConfirmOpen, setFinalizeConfirmOpen] = React.useState(false);

  // Dialog Atur Skema Penerima 100% (BR-10)
  const [schemeOpen, setSchemeOpen] = React.useState(false);
  const [taxModalOpen, setTaxModalOpen] = React.useState(false);
  const [draftRecipients, setDraftRecipients] = React.useState<
    DraftRecipient[]
  >([]);
  const [savingScheme, setSavingScheme] = React.useState(false);
  const [revealedUserIds, setRevealedUserIds] = React.useState<Record<string, boolean>>({});

  const profileById = React.useMemo(
    () => new Map(profiles.map((p) => [p.id, p])),
    [profiles],
  );

  const taxSimulationRows = React.useMemo(() => {
    return lines.map((line) => {
      const member = line.recipient_user_id
        ? profileById.get(line.recipient_user_id)
        : undefined;
      const isCompany = !line.recipient_user_id || line.recipient_user_id === "none";
      const hasNpwp = Boolean(member?.npwp);
      const maritalStatus = member?.marital_status;
      const dependentsCount = member?.dependents_count;
      const ptkp = getPtkpInfo(maritalStatus, dependentsCount);

      if (isCompany) {
        return {
          id: line.id,
          name: line.recipient_name,
          ptkpCode: "-",
          hasNpwp: true,
          npwp: null,
          gross: line.share_amount,
          dpp: 0,
          tax: 0,
          net: line.share_amount,
          ratePct: 0,
          isCompany: true,
        };
      }

      const sim = simulatePph21NonEmployee(
        line.share_amount,
        hasNpwp,
        maritalStatus,
        dependentsCount,
      );

      return {
        id: line.id,
        name: line.recipient_name,
        ptkpCode: ptkp.code,
        hasNpwp,
        npwp: member?.npwp || null,
        gross: line.share_amount,
        dpp: sim.dpp,
        tax: sim.taxAmount,
        net: sim.netPayout,
        ratePct: sim.effectiveRatePct,
        isCompany: false,
      };
    });
  }, [lines, profileById]);

  const totalSimGross = React.useMemo(
    () => taxSimulationRows.reduce((acc, r) => acc + r.gross, 0),
    [taxSimulationRows],
  );
  const totalSimTax = React.useMemo(
    () => taxSimulationRows.reduce((acc, r) => acc + r.tax, 0),
    [taxSimulationRows],
  );
  const totalSimNet = React.useMemo(
    () => taxSimulationRows.reduce((acc, r) => acc + r.net, 0),
    [taxSimulationRows],
  );

  React.useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [prjRes, profs] = await Promise.all([
          listProjects(),
          listProfiles(),
        ]);
        const clientPrjs = prjRes.projects.filter(
          (p) => p.project_category === "client",
        );
        setProjects(clientPrjs);
        setProfiles(profs.filter((u) => u.is_active));
        if (clientPrjs[0]) {
          setSelectedProjectId(clientPrjs[0].id);
        }
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, []);

  const loadProjectSharing = React.useCallback(async () => {
    if (!selectedProjectId) return;
    try {
      const b = await getProfitSharingBundle(selectedProjectId);
      setSchemes(b.schemes);
      const res =
        b.results.find((r) => r.project_id === selectedProjectId) ?? null;
      setResult(res);
      setLines(
        res ? b.lines.filter((l) => l.result_id === res.id) : [],
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal memuat data bagi hasil proyek.",
      );
    }
  }, [selectedProjectId]);

  React.useEffect(() => {
    void loadProjectSharing();
  }, [loadProjectSharing]);

  const isFinalized = result?.status === "finalized";
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  function openSchemeEditor() {
    if (schemes.length > 0) {
      setDraftRecipients(
        schemes.map((s) => ({
          recipientName: s.recipient_name,
          recipientUserId: s.recipient_user_id ?? "none",
          percentage: s.percentage,
        })),
      );
    } else {
      const firstTeamUser = profiles.find((u) => u.role === "user");
      setDraftRecipients([
        {
          recipientName: "Kas Ditahan Perusahaan Altvira",
          recipientUserId: "none",
          percentage: 60,
        },
        {
          recipientName: firstTeamUser?.full_name ?? "Tim Pengembang Proyek",
          recipientUserId: firstTeamUser?.id ?? "none",
          percentage: 40,
        },
      ]);
    }
    setSchemeOpen(true);
  }

  const sumPct = Number(
    draftRecipients.reduce((s, r) => s + r.percentage, 0).toFixed(2),
  );

  async function handleSaveScheme(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProjectId) return;
    setSavingScheme(true);
    try {
      await saveProfitSharingScheme(
        selectedProjectId,
        draftRecipients.map((r) => ({
          recipientName: r.recipientName,
          recipientUserId:
            r.recipientUserId === "none" ? null : r.recipientUserId,
          percentage: r.percentage,
        })),
      );
      toast.success("Skema bagi hasil 100% berhasil disimpan.");
      setSchemeOpen(false);
      await loadProjectSharing();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan skema bagi hasil.",
      );
    } finally {
      setSavingScheme(false);
    }
  }

  async function handleRunSimulation() {
    if (!selectedProjectId) return;
    setSimulating(true);
    try {
      await runProjectProfitSharing({
        projectId: selectedProjectId,
        finalize: false,
        postingDate,
        manualSharedCost: useManualSharedCost ? manualSharedCost : null,
      });
      toast.success(
        "Simulasi draf bagi hasil selesai dihitung (belum memposting jurnal).",
      );
      await loadProjectSharing();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menjalankan simulasi.",
      );
    } finally {
      setSimulating(false);
    }
  }

  async function handleExportExcel() {
    if (!result || !selectedProject) return;
    await downloadExcelSheet({
      fileName: t("profit_sharing:export.excel_filename", { code: selectedProject.code }),
      sheetName: t("profit_sharing:export.excel_sheet"),
      columns: [
        { header: t("profit_sharing:export.excel_col_recipient"), width: 32 },
        { header: t("profit_sharing:export.excel_col_pct"), width: 16 },
        { header: t("profit_sharing:export.excel_col_amount"), width: 24 },
      ],
      rows: [
        [t("profit_sharing:export.recognized_revenue_label"), 0, result.recognized_revenue],
        [t("profit_sharing:export.direct_cost_label"), 0, -result.direct_cost],
        [t("profit_sharing:export.shared_cost_label"), 0, -result.allocated_shared_cost],
        [t("profit_sharing:export.gross_profit_label"), 100, result.gross_profit],
        ...lines.map((l) => [l.recipient_name, l.percentage, l.share_amount]),
      ],
    });
    await recordExportLog("PROFIT_SHARING", "EXCEL");
    toast.success(t("profit_sharing:export.toast_excel_success"));
  }

  async function handleExportPdf() {
    if (!result || !selectedProject) return;
    const comp = await getCompanyProfile();
    const tableRows: string[][] = [
      [
        t("profit_sharing:export.recognized_revenue_label"),
        "-",
        formatRupiah(result.recognized_revenue),
      ],
      [
        t("profit_sharing:export.direct_cost_label"),
        "-",
        `(${formatRupiah(result.direct_cost)})`,
      ],
      [
        t("profit_sharing:export.shared_cost_label"),
        "-",
        `(${formatRupiah(result.allocated_shared_cost)})`,
      ],
      [
        t("profit_sharing:export.gross_profit_label"),
        "100%",
        formatRupiah(result.gross_profit),
      ],
      ...lines.map((l) => [l.recipient_name, `${l.percentage}%`, formatRupiah(l.share_amount)]),
    ];
    const bytes = await generateDocumentPdf({
      docTitle: t("profit_sharing:export.pdf_title", { code: selectedProject.code }),
      docSubtitle: `${selectedProject.name} (${isFinalized ? t("profit_sharing:badge_finalized") : t("profit_sharing:badge_draft")})`,
      docNumber: `BH/${selectedProject.code}`,
      docDate: postingDate || new Date().toISOString().slice(0, 10),
      company: comp,
      tableColumns: [
        { header: t("profit_sharing:export.pdf_col_component"), widthRatio: 0.52 },
        { header: t("profit_sharing:export.pdf_col_portion"), widthRatio: 0.16, align: "right" },
        { header: t("profit_sharing:export.pdf_col_amount"), widthRatio: 0.32, align: "right" },
      ],
      tableRows,
      rightSignatureName: `${comp.signer_name} - ${comp.signer_title}`,
    });
    downloadPdfBytes(
      bytes,
      t("profit_sharing:export.pdf_filename", { code: selectedProject.code }),
    );
    await recordExportLog("PROFIT_SHARING", "PDF");
  }

  async function handleExportCsv() {
    if (!result || !selectedProject) return;
    downloadCsvFile(
      t("profit_sharing:export.csv_filename", { code: selectedProject.code }),
      [
        t("profit_sharing:export.csv_col_recipient"),
        t("profit_sharing:export.csv_col_pct"),
        t("profit_sharing:export.csv_col_amount"),
      ],
      [
        [
          t("profit_sharing:export.recognized_revenue_label"),
          0,
          result.recognized_revenue,
        ],
        [
          t("profit_sharing:export.direct_cost_label"),
          0,
          -result.direct_cost,
        ],
        [
          t("profit_sharing:export.shared_cost_label"),
          0,
          -result.allocated_shared_cost,
        ],
        [
          t("profit_sharing:export.gross_profit_label"),
          100,
          result.gross_profit,
        ],
        ...lines.map((l) => [l.recipient_name, l.percentage, l.share_amount]),
      ],
    );
    await recordExportLog("PROFIT_SHARING", "CSV");
    toast.success(t("profit_sharing:export.toast_csv_success"));
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("profit_sharing:page_title")}
        description={t("profit_sharing:page_desc")}
        mobileFloating={Boolean(result)}
        actions={
          result ? (
            <ExportDownloadMenu
              label={t("common:action.export_download")}
              onExportExcel={handleExportExcel}
              onExportPdf={handleExportPdf}
              onExportCsv={handleExportCsv}
              mobileFloating
            />
          ) : null
        }
      />

      <Card className="@container rounded-2xl border-border/80 bg-card shadow-2xs overflow-visible">
        <CardHeader className="p-5 sm:p-6 pb-5 border-b border-border/70">
          <div className="flex flex-col gap-4 @[720px]:flex-row @[720px]:items-end @[720px]:justify-between">
            <div className="w-full @[720px]:flex-1 @[720px]:min-w-0">
              <Field className="min-w-0">
                <FieldLabel className="text-xs font-semibold text-foreground">
                  {t("profit_sharing:select_client_project")}
                </FieldLabel>
                <Select
                  value={selectedProjectId}
                  onValueChange={setSelectedProjectId}
                >
                  <SelectTrigger className="w-full min-w-0 h-10 rounded-xl text-xs sm:text-sm gap-2">
                    <SelectValue placeholder={t("profit_sharing:select_project_placeholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.code}: {p.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="flex flex-wrap @[720px]:flex-nowrap items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isFinalized}
                onClick={openSchemeEditor}
                className="h-10 px-3 sm:px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer gap-1.5"
              >
                <PlusIcon className="size-3.5 shrink-0" />
                <span>{t("profit_sharing:btn_open_scheme")}</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isFinalized || schemes.length === 0 || simulating}
                onClick={() => void handleRunSimulation()}
                className="h-10 px-3 sm:px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer gap-1.5"
              >
                {simulating ? (
                  <Spinner className="size-3.5 shrink-0" />
                ) : (
                  <CalculatorIcon className="size-3.5 shrink-0" />
                )}
                <span>{t("profit_sharing:btn_run_simulation")}</span>
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isFinalized || schemes.length === 0}
                onClick={() => setFinalizeConfirmOpen(true)}
                className="h-10 px-3 sm:px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer gap-1.5 shadow-2xs"
              >
                <LockIcon className="size-3.5 shrink-0" />
                <span>{t("profit_sharing:btn_finalize")}</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          <Field>
            <FieldLabel htmlFor="ps-date" className="text-xs font-semibold text-foreground">
              {t("profit_sharing:field_posting_date")}
            </FieldLabel>
            <DatePicker
              id="ps-date"
              disabled={isFinalized}
              value={postingDate}
              onChange={setPostingDate}
            />
            <FieldDescription className="text-[11px] leading-relaxed">
              {t("profit_sharing:field_posting_date_desc")}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="ps-man" className="text-xs font-semibold text-foreground">
              {t("profit_sharing:field_override_shared_cost")}
            </FieldLabel>
            <div className="flex h-9 w-full items-center justify-between rounded-xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 shadow-xs">
              <span className="text-xs sm:text-sm font-medium text-foreground">
                {useManualSharedCost ? t("profit_sharing:override_active") : t("profit_sharing:override_auto")}
              </span>
              <Switch
                id="ps-man"
                disabled={isFinalized}
                checked={useManualSharedCost}
                onCheckedChange={setUseManualSharedCost}
              />
            </div>
            <FieldDescription className="text-[11px] leading-relaxed">
              {t("profit_sharing:field_override_desc")}
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="ps-man-val" className="text-xs font-semibold text-foreground">
              {t("profit_sharing:field_manual_shared_cost")}
            </FieldLabel>
            <NumberInput
              id="ps-man-val"
              allowDecimal={false}
              min={0}
              disabled={isFinalized || !useManualSharedCost}
              value={manualSharedCost}
              onValueChange={setManualSharedCost}
              className="h-9 rounded-xl"
            />
            <FieldDescription className="text-[11px] leading-relaxed">
              {t("profit_sharing:field_manual_shared_cost_desc")}
            </FieldDescription>
          </Field>
        </CardContent>
      </Card>

      {loading ? (
        <SectionLoader message={t("profit_sharing:loading")} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 items-stretch">
          <Card className="overflow-hidden flex flex-col">
            <CardHeaderWithInfo
              title={t("profit_sharing:scheme_card_title")}
              description={t("profit_sharing:scheme_card_desc")}
            />
            <CardContent className="p-0 flex-1 flex flex-col">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 text-center font-semibold">{t("profit_sharing:col_recipient_name")}</TableHead>
                    <TableHead className="pl-2 pr-6 max-sm:pl-1 max-sm:pr-3 text-center font-semibold w-32 max-sm:w-24">{t("profit_sharing:col_share_pct")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableLoadingRow
                      colSpan={2}
                      message={t("profit_sharing:loading", "Memuat skema bagi hasil...")}
                    />
                  ) : schemes.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={2} className="p-0">
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                          <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                            <UsersIcon className="size-6" />
                          </div>
                          <h3 className="text-sm font-semibold text-foreground">
                            {t("profit_sharing:scheme_empty_title")}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                            {t("profit_sharing:scheme_empty_desc")}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    schemes.map((s) => {
                      const member = s.recipient_user_id
                        ? profileById.get(s.recipient_user_id)
                        : undefined;
                      const isRevealed = Boolean(
                        s.recipient_user_id && revealedUserIds[s.recipient_user_id],
                      );
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 font-medium text-foreground">
                            <div>{s.recipient_name}</div>
                            {member ? (
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-normal text-muted-foreground">
                                {member.bank_name && member.bank_account_number ? (
                                  <span className="font-mono">
                                    {member.bank_name}:{" "}
                                    {isRevealed
                                      ? member.bank_account_number
                                      : maskBankAccountNumber(member.bank_account_number)}
                                    {member.bank_account_holder
                                      ? ` (${member.bank_account_holder})`
                                      : ""}
                                  </span>
                                ) : (
                                  <span>
                                    {t(
                                      "profit_sharing:recipient_bank_not_set",
                                      "Rekening belum diatur di profil",
                                    )}
                                  </span>
                                )}
                                {member.npwp ? (
                                  <span className="font-mono">
                                    NPWP:{" "}
                                    {isRevealed
                                      ? formatNpwpDisplay(member.npwp)
                                      : maskNpwp(member.npwp)}
                                  </span>
                                ) : null}
                                <span className="inline-flex items-center gap-1 font-semibold text-primary dark:text-sky-400">
                                  <span>PTKP: {getPtkpInfo(member.marital_status, member.dependents_count).code}</span>
                                </span>
                                {(member.bank_account_number || member.npwp) &&
                                s.recipient_user_id ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRevealedUserIds((prev) => ({
                                        ...prev,
                                        [s.recipient_user_id!]:
                                          !prev[s.recipient_user_id!],
                                      }))
                                    }
                                    aria-label={
                                      isRevealed
                                        ? t(
                                            "profit_sharing:hide_financial_data",
                                            "Sembunyikan data rekening",
                                          )
                                        : t(
                                            "profit_sharing:show_financial_data",
                                            "Lihat data rekening",
                                          )
                                    }
                                    className="inline-flex items-center justify-center rounded p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                                  >
                                    {isRevealed ? (
                                      <EyeOffIcon className="size-3" />
                                    ) : (
                                      <EyeIcon className="size-3" />
                                    )}
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell className="pl-2 pr-6 max-sm:pl-1 max-sm:pr-3 text-center font-semibold text-foreground tabular-nums">
                            {s.percentage}%
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="overflow-hidden flex flex-col">
            <CardHeaderWithInfo
              title={t("profit_sharing:result_card_title")}
              description={
                result?.finalized_at
                  ? t("profit_sharing:finalized_at_label", { date: formatDateTimeI18n(result.finalized_at, language) })
                  : t("profit_sharing:draft_simulation_desc")
              }
              headerClassName="px-6 py-4 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              controls={
                result ? (
                  <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setTaxModalOpen(true)}
                      className="h-8 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
                    >
                      <CalculatorIcon className="size-3.5 text-primary" />
                      <span>{t("profit_sharing:btn_tax_simulation", "Simulasi PPh 21")}</span>
                    </Button>
                    <StatusBadge
                      tone={isFinalized ? "success" : "warning"}
                      label={
                        isFinalized ? t("profit_sharing:badge_finalized") : t("profit_sharing:badge_draft")
                      }
                    />
                  </div>
                ) : null
              }
            />
            <CardContent className="p-0 flex-1 flex flex-col">
              {!result ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center bg-muted/10">
                  <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                    <CoinsIcon className="size-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {t("profit_sharing:result_empty_title")}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    {t("profit_sharing:result_empty_desc")}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-border/70">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="pl-6 pr-3 text-foreground">
                          {t("profit_sharing:comp_revenue")}
                        </TableCell>
                        <TableCell className="pl-3 pr-6 w-48 whitespace-nowrap">
                          <MonetaryCell amount={result.recognized_revenue} />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="pl-6 pr-3 text-foreground">
                          {t("profit_sharing:comp_direct_cost")}
                        </TableCell>
                        <TableCell className="pl-3 pr-6 w-48 whitespace-nowrap">
                          <MonetaryCell amount={-result.direct_cost} />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="pl-6 pr-3 text-foreground">
                          {t("profit_sharing:comp_shared_cost")}
                        </TableCell>
                        <TableCell className="pl-3 pr-6 w-48 whitespace-nowrap">
                          <MonetaryCell amount={-result.allocated_shared_cost} />
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-muted/40 font-bold border-t border-border/80">
                        <TableCell className="pl-6 pr-3 font-bold text-foreground">
                          {t("profit_sharing:comp_gross_profit")}
                        </TableCell>
                        <TableCell className="pl-3 pr-6 w-48 whitespace-nowrap">
                          <MonetaryCell
                            amount={result.gross_profit}
                            className="font-bold text-primary dark:text-sky-400"
                          />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableHead className="pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 text-center font-semibold">{t("profit_sharing:col_recipient")}</TableHead>
                        <TableHead className="px-3 max-sm:px-2 text-center font-semibold w-28 max-sm:w-20">{t("profit_sharing:col_percentage")}</TableHead>
                        <TableHead className="pl-3 pr-6 max-sm:pl-2 max-sm:pr-3 text-center font-semibold w-48 max-sm:w-36">{t("profit_sharing:col_share_entitlement")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 font-medium text-foreground">
                            {l.recipient_name}
                          </TableCell>
                          <TableCell className="px-3 max-sm:px-2 text-center tabular-nums text-foreground">
                            {l.percentage}%
                          </TableCell>
                          <TableCell className="pl-3 pr-6 max-sm:pl-2 max-sm:pr-3 whitespace-nowrap">
                            <MonetaryCell amount={l.share_amount} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog Atur Skema 100% */}
      <Dialog open={schemeOpen} onOpenChange={setSchemeOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("profit_sharing:modals.scheme_title")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveScheme} className="space-y-4">
            <FieldGroup>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/25 dark:bg-[var(--field-bg)] px-3.5 py-2.5">
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {t("profit_sharing:modals.scheme_hint")}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setDraftRecipients((prev) => [
                      ...prev,
                      {
                        recipientName: "",
                        recipientUserId: "none",
                        percentage: 0,
                      },
                    ])
                  }
                  className="h-8 px-3 rounded-xl text-xs font-semibold shrink-0 self-start sm:self-center cursor-pointer gap-1.5"
                >
                  <PlusIcon className="size-3.5" />
                  <span>{t("profit_sharing:modals.btn_add_recipient")}</span>
                </Button>
              </div>

              <div className="hidden sm:grid sm:grid-cols-12 gap-2.5 px-1 text-xs font-semibold text-muted-foreground">
                <div className="sm:col-span-5">{t("profit_sharing:modals.header_recipient_name")}</div>
                <div className="sm:col-span-4">{t("profit_sharing:modals.header_team_account")}</div>
                <div className="sm:col-span-3">{t("profit_sharing:modals.header_portion")}</div>
              </div>

              <div className="flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
                {draftRecipients.map((r, idx) => (
                  <div
                    key={idx}
                    className="grid items-center gap-2.5 sm:grid-cols-12"
                  >
                    <div className="sm:col-span-5">
                      <Input
                        required
                        placeholder={t("profit_sharing:modals.placeholder_recipient")}
                        value={r.recipientName}
                        onChange={(e) =>
                          setDraftRecipients((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, recipientName: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <Select
                        value={r.recipientUserId}
                        onValueChange={(uid) => {
                          const found = profiles.find((p) => p.id === uid);
                          setDraftRecipients((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? {
                                    ...x,
                                    recipientUserId: uid,
                                    recipientName:
                                      found && !x.recipientName
                                        ? found.full_name
                                        : x.recipientName,
                                  }
                                : x,
                            ),
                          );
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="none">
                              {t("profit_sharing:modals.company_internal_share")}
                            </SelectItem>
                            {profiles
                              .filter((p) => p.role === "user")
                              .map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.full_name}
                                </SelectItem>
                              ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-1.5 sm:col-span-3">
                      <NumberInput
                        allowDecimal
                        maxDecimals={2}
                        min={0.01}
                        max={100}
                        required
                        value={r.percentage}
                        onValueChange={(percentage) =>
                          setDraftRecipients((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, percentage } : x,
                            ),
                          )
                        }
                      />
                      {draftRecipients.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setDraftRecipients((prev) =>
                              prev.filter((_, i) => i !== idx),
                            )
                          }
                          className="shrink-0 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                          title={t("profit_sharing:modals.tooltip_delete_recipient")}
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/25 dark:bg-[var(--field-bg)] px-3.5 py-2.5 text-xs font-semibold">
                <span className="text-foreground">{t("profit_sharing:modals.total_portion_label", { pct: sumPct })}</span>
                <StatusBadge
                  tone={sumPct === 100 ? "success" : "destructive"}
                  label={sumPct === 100 ? t("profit_sharing:modals.badge_exact_100") : t("profit_sharing:modals.badge_must_be_100")}
                />
              </div>
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSchemeOpen(false)}
                >
                  {t("profit_sharing:modals.btn_cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={savingScheme || sumPct !== 100}
                >
                  {savingScheme ? <Spinner data-icon="inline-start" /> : null}
                  {t("profit_sharing:modals.btn_save_scheme")}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Simulasi Pajak PPh 21 */}
      <Dialog open={taxModalOpen} onOpenChange={setTaxModalOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {t("profit_sharing:tax_modal_title", "Simulasi Pajak PPh 21 Bagi Hasil")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground leading-relaxed">
              <p className="font-semibold text-foreground mb-1">
                {t("profit_sharing:tax_modal_rule_title", "Dasar Perhitungan PPh 21 Bukan Pegawai (PMK 168/2023):")}
              </p>
              <p>
                {t(
                  "profit_sharing:tax_modal_rule_desc",
                  "Dasar Pengenaan Pajak (DPP) dihitung 50% dari bruto, dikenakan Tarif Progresif Pasal 17 Ayat (1) Huruf a UU PPh berdasarkan status PTKP. Anggota tanpa NPWP dikenakan penalti tarif 20% lebih tinggi.",
                )}
              </p>
            </div>

            <div className="rounded-xl border border-border/80 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="pl-4 pr-2 text-center font-semibold">{t("profit_sharing:col_recipient", "Penerima")}</TableHead>
                    <TableHead className="px-2 text-center font-semibold">{t("profit_sharing:col_ptkp", "Status PTKP")}</TableHead>
                    <TableHead className="px-2 text-center font-semibold">{t("profit_sharing:col_gross", "Bruto")}</TableHead>
                    <TableHead className="px-2 text-center font-semibold">{t("profit_sharing:col_dpp", "DPP (50%)")}</TableHead>
                    <TableHead className="px-2 text-center font-semibold">{t("profit_sharing:col_pph21", "PPh 21")}</TableHead>
                    <TableHead className="pl-2 pr-4 text-center font-semibold">{t("profit_sharing:col_net", "Bagi Hasil Bersih")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxSimulationRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                        {t("profit_sharing:no_lines_to_simulate", "Belum ada hasil bagi hasil untuk disimulasikan.")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    taxSimulationRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="pl-4 pr-2 font-medium text-foreground">
                          <div>{row.name}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {row.isCompany
                              ? t("profit_sharing:modals.company_internal_share", "Bagian Kas Perusahaan")
                              : row.hasNpwp
                                ? `NPWP: ${maskNpwp(row.npwp!)}`
                                : t("profit_sharing:no_npwp_penalty", "Tanpa NPWP (+20%)")}
                          </div>
                        </TableCell>
                        <TableCell className="px-2 text-center text-xs">
                          {row.isCompany ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary dark:text-sky-400 font-semibold font-mono text-[11px]">
                              {row.ptkpCode}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-2 text-right font-mono text-xs tabular-nums">
                          {formatRupiah(row.gross)}
                        </TableCell>
                        <TableCell className="px-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
                          {formatRupiah(row.dpp)}
                        </TableCell>
                        <TableCell className="px-2 text-right font-mono text-xs tabular-nums text-destructive font-semibold">
                          {row.tax > 0 ? `- ${formatRupiah(row.tax)}` : "Rp 0"}
                        </TableCell>
                        <TableCell className="pl-2 pr-4 text-right font-mono text-xs tabular-nums text-primary dark:text-sky-400 font-bold">
                          {formatRupiah(row.net)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-muted/20 border border-border/80 text-xs font-semibold">
              <span className="text-muted-foreground">
                {t("profit_sharing:total_summary", "Total Estimasi Pemotongan:")}
              </span>
              <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums">
                <span>Bruto: {formatRupiah(totalSimGross)}</span>
                <span className="text-destructive">PPh 21: - {formatRupiah(totalSimTax)}</span>
                <span className="text-primary dark:text-sky-400 font-bold">Netto: {formatRupiah(totalSimNet)}</span>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTaxModalOpen(false)}
                className="rounded-xl text-xs"
              >
                {t("common:action.close", "Tutup")}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi Finalisasi & Kunci Permanen (BR-9) */}
      <ConfirmActionDialog
        open={finalizeConfirmOpen}
        onOpenChange={setFinalizeConfirmOpen}
        title={t("profit_sharing:modals.finalize_confirm_title")}
        description={t("profit_sharing:modals.finalize_confirm_desc")}
        destructive
        confirmLabel={t("profit_sharing:modals.finalize_confirm_btn")}
        onConfirm={async () => {
          await runProjectProfitSharing({
            projectId: selectedProjectId,
            finalize: true,
            postingDate,
            manualSharedCost: useManualSharedCost ? manualSharedCost : null,
          });
          toast.success(
            "Bagi hasil proyek telah difinalisasi, dikunci, dan diposting ke Buku Besar.",
          );
          await loadProjectSharing();
        }}
      />
    </div>
  );
}

