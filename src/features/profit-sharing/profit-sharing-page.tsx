import * as React from "react";
import {
  CalculatorIcon,
  CoinsIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  PlusIcon,
  ReceiptTextIcon,
  RotateCcwIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { Button } from "@/components/ui/button";
import { TOOLBAR_BUTTON_CLASS } from "@/components/shared/toolbar-button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { Spinner } from "@/components/ui/empty";
import { SectionLoader } from "@/components/ui/loader";
import {
  Field,
  FieldDescription,
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
  resetProfitSharingData,
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
import { ProfitSharingSchemeDialog } from "./components/profit-sharing-scheme-dialog";
import { ProfitSharingTaxDialog } from "./components/profit-sharing-tax-dialog";
import type { DraftRecipient } from "./components/profit-sharing-types";

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
  const [resetConfirmOpen, setResetConfirmOpen] = React.useState(false);
  const [_resettingData, setResettingData] = React.useState(false);

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

  async function handleResetData() {
    if (!selectedProjectId) return;
    setResettingData(true);
    try {
      await resetProfitSharingData(selectedProjectId);
      setSchemes([]);
      setResult(null);
      setLines([]);
      toast.success(
        t(
          "profit_sharing:toast_reset_success",
          "Data skema dan simulasi draf bagi hasil berhasil direset.",
        ),
      );
      setResetConfirmOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal mereset data bagi hasil.",
      );
    } finally {
      setResettingData(false);
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
              <ActionTooltip content={t("profit_sharing:btn_open_scheme")}>
                <Button
                  type="button"
                  disabled={isFinalized}
                  onClick={openSchemeEditor}
                  className={TOOLBAR_BUTTON_CLASS}
                  aria-label={t("profit_sharing:btn_open_scheme")}
                >
                  <PlusIcon className="size-4 shrink-0" />
                  <span className="sr-only">{t("profit_sharing:btn_open_scheme")}</span>
                </Button>
              </ActionTooltip>
              <ActionTooltip content={t("profit_sharing:btn_run_simulation")}>
                <Button
                  type="button"
                  disabled={isFinalized || schemes.length === 0 || simulating}
                  onClick={() => void handleRunSimulation()}
                  className={TOOLBAR_BUTTON_CLASS}
                  aria-label={t("profit_sharing:btn_run_simulation")}
                >
                  {simulating ? (
                    <Spinner className="size-4 shrink-0" />
                  ) : (
                    <CalculatorIcon className="size-4 shrink-0" />
                  )}
                  <span className="sr-only">{t("profit_sharing:btn_run_simulation")}</span>
                </Button>
              </ActionTooltip>
              <ActionTooltip content={t("profit_sharing:btn_finalize")}>
                <Button
                  type="button"
                  disabled={isFinalized || schemes.length === 0}
                  onClick={() => setFinalizeConfirmOpen(true)}
                  className={TOOLBAR_BUTTON_CLASS}
                  aria-label={t("profit_sharing:btn_finalize")}
                >
                  <LockIcon className="size-4 shrink-0" />
                  <span className="sr-only">{t("profit_sharing:btn_finalize")}</span>
                </Button>
              </ActionTooltip>
              {result && (
                <ExportDownloadMenu
                  label={t("common:action.export_download")}
                  onExportExcel={handleExportExcel}
                  onExportPdf={handleExportPdf}
                  onExportCsv={handleExportCsv}
                  size="icon"
                  mobileFloating
                />
              )}
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
          <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden flex flex-col">
            <CardHeaderWithInfo
              title={t("profit_sharing:scheme_card_title")}
              description={t("profit_sharing:scheme_card_desc")}
              headerClassName="px-6 py-4 border-b border-border/70 min-h-[69px] flex items-center justify-between gap-3"
              controls={
                schemes.length > 0 ? (
                  <ActionTooltip content={t("profit_sharing:btn_reset_scheme", "Reset Skema & Simulasi")}>
                    <button
                      type="button"
                      disabled={isFinalized}
                      onClick={() => setResetConfirmOpen(true)}
                      className={cn(TOOLBAR_BUTTON_CLASS, "disabled:opacity-40 disabled:cursor-not-allowed")}
                      aria-label={t("profit_sharing:btn_reset_scheme", "Reset Skema & Simulasi")}
                    >
                      <RotateCcwIcon className="size-4 text-primary-foreground shrink-0" />
                      <span className="sr-only">{t("profit_sharing:btn_reset_scheme", "Reset Skema & Simulasi")}</span>
                    </button>
                  </ActionTooltip>
                ) : null
              }
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

          <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden flex flex-col">
            <CardHeaderWithInfo
              title={t("profit_sharing:result_card_title")}
              description={
                result?.finalized_at
                  ? t("profit_sharing:finalized_at_label", { date: formatDateTimeI18n(result.finalized_at, language) })
                  : t("profit_sharing:draft_simulation_desc")
              }
              headerClassName="px-6 py-4 border-b border-border/70 min-h-[69px] flex items-center justify-between gap-3"
              controls={
                result && lines.length > 0 ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <ActionTooltip content={t("profit_sharing:btn_tax_simulation", "Simulasi PPh 21")}>
                      <button
                        type="button"
                        onClick={() => setTaxModalOpen(true)}
                        className={TOOLBAR_BUTTON_CLASS}
                        aria-label={t("profit_sharing:btn_tax_simulation", "Simulasi PPh 21")}
                      >
                        <ReceiptTextIcon className="size-4 text-primary-foreground shrink-0" />
                        <span className="sr-only">{t("profit_sharing:btn_tax_simulation", "Simulasi PPh 21")}</span>
                      </button>
                    </ActionTooltip>
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
      <ProfitSharingSchemeDialog
        open={schemeOpen}
        onOpenChange={setSchemeOpen}
        draftRecipients={draftRecipients}
        setDraftRecipients={setDraftRecipients}
        profiles={profiles}
        savingScheme={savingScheme}
        onSaveScheme={handleSaveScheme}
      />

      {/* Dialog Simulasi Pajak PPh 21 */}
      <ProfitSharingTaxDialog
        open={taxModalOpen}
        onOpenChange={setTaxModalOpen}
        taxSimulationRows={taxSimulationRows}
        totalSimGross={totalSimGross}
        totalSimTax={totalSimTax}
        totalSimNet={totalSimNet}
      />

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

      {/* Konfirmasi Reset Skema & Hasil Simulasi */}
      <ConfirmActionDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title={t("profit_sharing:modals.reset_confirm_title", "Reset Skema & Hasil Simulasi")}
        description={t(
          "profit_sharing:modals.reset_confirm_desc",
          "Apakah Anda yakin ingin menghapus data skema dan hasil draf simulasi bagi hasil proyek ini? Data yang belum difinalisasi akan dihapus.",
        )}
        destructive
        confirmLabel={t("profit_sharing:modals.reset_confirm_btn", "Ya, Reset Data")}
        onConfirm={handleResetData}
      />
    </div>
  );
}

