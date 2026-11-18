import { CheckCircle2Icon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DocumentDownloadMenu } from "@/components/shared/document-download-menu";
import { EmptyState } from "@/components/ui/empty";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge, type SemanticTone } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateID, formatRupiah, formatDateI18n } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import {
  BAKP_STATUS_META,
  BAST_STATUS_META,
  RowEditActionButtons,
  SectionEditControls,
  UAT_CONCLUSION_META,
  getBakpStatusMeta,
  getUatConclusionMeta,
  getBastStatusMeta,
  type EditableRecord,
  type SectionKey,
  type ViewDetailState,
} from "../components/project-detail-shared";
import type {
  HandoverReportRow,
  ProgressReportRow,
  UatChecklistRow,
} from "@/types/database.types";
import type { ProjectWorkspaceBundle } from "@/lib/operations/client-projects";

interface AcceptanceDocsTabProps {
  bundle: ProjectWorkspaceBundle;
  isSectionEditing: (key: SectionKey) => boolean;
  getSelectedIds: (key: SectionKey) => string[];
  setSectionEditing: (key: SectionKey, enabled: boolean) => void;
  toggleSelectAllRows: (
    key: SectionKey,
    allIds: string[],
    checked: boolean | "indeterminate",
  ) => void;
  toggleRowSelection: (
    key: SectionKey,
    id: string,
    checked: boolean | "indeterminate",
  ) => void;
  setDeleteConfirm: (
    confirm: { section: SectionKey; ids: string[]; label: string } | null,
  ) => void;
  setViewModal: (modal: ViewDetailState | null) => void;
  setEditRecord: (record: EditableRecord | null) => void;
  openBakpDialog: () => void;
  openUatDialog: () => void;
  openBastDialog: () => void;
  onApproveBakpByClient: (id: string) => Promise<void>;
  onDownloadBakpPdf: (b: ProgressReportRow) => Promise<void>;
  onDownloadBakpWord: (b: ProgressReportRow) => Promise<void>;
  onDownloadUatPdf: (u: UatChecklistRow) => Promise<void>;
  onDownloadUatWord: (u: UatChecklistRow) => Promise<void>;
  onDownloadBastPdf: (h: HandoverReportRow) => Promise<void>;
  onDownloadBastWord: (h: HandoverReportRow) => Promise<void>;
}

export function AcceptanceDocsTab({
  bundle,
  isSectionEditing,
  getSelectedIds,
  setSectionEditing,
  toggleSelectAllRows,
  toggleRowSelection,
  setDeleteConfirm,
  setViewModal,
  setEditRecord,
  openBakpDialog,
  openUatDialog,
  openBastDialog,
  onApproveBakpByClient,
  onDownloadBakpPdf,
  onDownloadBakpWord,
  onDownloadUatPdf,
  onDownloadUatWord,
  onDownloadBastPdf,
  onDownloadBastWord,
}: AcceptanceDocsTabProps) {
  const { t, language } = useLanguage();

  return (
    <div className="flex flex-col gap-5">
      {/* Card 4A: BAKP */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-base sm:text-lg font-bold">
              {t("projects:acceptance.bakp_title")}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground leading-relaxed">
              {t("projects:acceptance.bakp_desc")}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <SectionEditControls
              hasItems={bundle.bakpList.length > 0}
              isEditing={isSectionEditing("bakp")}
              selectedCount={getSelectedIds("bakp").length}
              onStartEdit={() => setSectionEditing("bakp", true)}
              onCancelEdit={() => setSectionEditing("bakp", false)}
              onDeleteSelected={() =>
                setDeleteConfirm({
                  section: "bakp",
                  ids: getSelectedIds("bakp"),
                  label: t("projects:acceptance.select_all_bakp"),
                })
              }
            />
            <Button
              type="button"
              disabled={bundle.milestones.length === 0}
              title={
                bundle.milestones.length === 0
                  ? t("projects:acceptance.btn_bakp_disabled_title")
                  : t("projects:acceptance.btn_create_bakp")
              }
              onClick={openBakpDialog}
              className="shrink-0 h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer"
            >
              <PlusIcon data-icon="inline-start" />
              {t("projects:acceptance.btn_create_bakp")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                {isSectionEditing("bakp") && (
                  <TableHead className="w-12 text-center align-middle px-3">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={
                          bundle.bakpList.length > 0 &&
                          getSelectedIds("bakp").length === bundle.bakpList.length
                        }
                        indeterminate={
                          getSelectedIds("bakp").length > 0 &&
                          getSelectedIds("bakp").length < bundle.bakpList.length
                        }
                        onCheckedChange={(checked) =>
                          toggleSelectAllRows(
                            "bakp",
                            bundle.bakpList.map((b) => b.id),
                            checked,
                          )
                        }
                        aria-label={t("projects:acceptance.select_all_bakp")}
                      />
                    </div>
                  </TableHead>
                )}
                <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">{t("projects:acceptance.col_bakp_no")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("projects:acceptance.col_date")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("projects:acceptance.col_progress")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap w-40">{t("projects:acceptance.col_billing_value")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("projects:acceptance.col_status")}</TableHead>
                <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap w-28">{t("projects:acceptance.col_actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bundle.bakpList.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6 + (isSectionEditing("bakp") ? 1 : 0)} className="p-0">
                    <div className="py-10 px-6 bg-muted/10 border-t border-dashed border-border/70">
                      <EmptyState
                        title={t("projects:acceptance.empty_bakp_title")}
                        description={t("projects:acceptance.empty_bakp_desc")}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                bundle.bakpList.map((b) => {
                  const bakpStatus = getBakpStatusMeta(b.status, t);
                  const isChecked = getSelectedIds("bakp").includes(b.id);
                  return (
                    <TableRow key={b.id}>
                      {isSectionEditing("bakp") && (
                        <TableCell className="align-top text-center px-3 py-3.5">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              toggleRowSelection("bakp", b.id, checked)
                            }
                            className="mt-0.5"
                            aria-label={`Pilih ${b.bakp_number}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="pl-6 pr-3 py-3.5 text-center text-xs sm:text-sm leading-5 font-semibold whitespace-nowrap">
                        {b.bakp_number}
                      </TableCell>
                      <TableCell className="px-3 py-3.5 text-center text-xs sm:text-sm leading-5 whitespace-nowrap">
                        {formatDateI18n(b.bakp_date, language)}
                      </TableCell>
                      <TableCell className="px-3 py-3.5 text-center text-xs sm:text-sm leading-5 font-medium whitespace-nowrap tabular-nums">
                        {b.cumulative_percentage}%
                      </TableCell>
                      <TableCell className="px-3 py-3.5 whitespace-nowrap">
                        <MonetaryCell amount={b.billable_amount} />
                      </TableCell>
                      <TableCell className="px-3 py-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center min-h-5 -my-px">
                          <StatusBadge
                            tone={bakpStatus.tone}
                            label={bakpStatus.label}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                        {isSectionEditing("bakp") ? (
                          <RowEditActionButtons
                            onView={() =>
                              setViewModal({
                                title: `Rincian ${b.bakp_number}`,
                                rows: [
                                  { label: t("projects:acceptance.col_bakp_no"), value: b.bakp_number },
                                  { label: t("projects:acceptance.col_date"), value: formatDateI18n(b.bakp_date, language) },
                                  { label: t("projects:acceptance.col_progress"), value: `${b.cumulative_percentage}%` },
                                  { label: t("projects:acceptance.col_billing_value"), value: formatRupiah(b.billable_amount) },
                                  { label: language === "en" ? "Findings Notes" : "Catatan Pemeriksaan", value: b.findings_notes ?? "-" },
                                  { label: t("projects:acceptance.col_status"), value: bakpStatus.label },
                                ],
                                onDownloadPdf: () => void onDownloadBakpPdf(b),
                                onDownloadWord: () => void onDownloadBakpWord(b),
                              })
                            }
                            onEdit={() => setEditRecord({ section: "bakp", item: { ...b } })}
                            onDelete={() =>
                              setDeleteConfirm({
                                section: "bakp",
                                ids: [b.id],
                                label: b.bakp_number,
                              })
                            }
                          />
                        ) : (
                          <div className="flex justify-center items-center gap-1 -my-1.5">
                            {b.status !== "approved_by_client" ? (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                title={language === "en" ? "Approve BAKP by Client" : "Setujui BAKP oleh Klien"}
                                onClick={() => void onApproveBakpByClient(b.id)}
                                className="size-8 rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                              >
                                <CheckCircle2Icon className="size-4" />
                                <span className="sr-only">{language === "en" ? "Approve Client" : "Setujui Klien"}</span>
                              </Button>
                            ) : null}
                            <DocumentDownloadMenu
                              title={language === "en" ? "Download BAKP (PDF / Word)" : "Unduh BAKP (PDF / Word)"}
                              onDownloadPdf={() => onDownloadBakpPdf(b)}
                              onDownloadWord={() => onDownloadBakpWord(b)}
                            />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Card 4B: UAT */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-base sm:text-lg font-bold">
              {t("projects:acceptance.uat_title")}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground leading-relaxed">
              {t("projects:acceptance.uat_desc")}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <SectionEditControls
              hasItems={bundle.uatList.length > 0}
              isEditing={isSectionEditing("uat")}
              selectedCount={getSelectedIds("uat").length}
              onStartEdit={() => setSectionEditing("uat", true)}
              onCancelEdit={() => setSectionEditing("uat", false)}
              onDeleteSelected={() =>
                setDeleteConfirm({
                  section: "uat",
                  ids: getSelectedIds("uat"),
                  label: t("projects:acceptance.select_all_uat"),
                })
              }
            />
            <Button
              type="button"
              onClick={openUatDialog}
              className="shrink-0 h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer"
            >
              <PlusIcon data-icon="inline-start" />
              {t("projects:acceptance.btn_record_uat")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                {isSectionEditing("uat") && (
                  <TableHead className="w-12 text-center align-middle px-3">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={
                          bundle.uatList.length > 0 &&
                          getSelectedIds("uat").length === bundle.uatList.length
                        }
                        indeterminate={
                          getSelectedIds("uat").length > 0 &&
                          getSelectedIds("uat").length < bundle.uatList.length
                        }
                        onCheckedChange={(checked) =>
                          toggleSelectAllRows(
                            "uat",
                            bundle.uatList.map((u) => u.id),
                            checked,
                          )
                        }
                        aria-label={t("projects:acceptance.select_all_uat")}
                      />
                    </div>
                  </TableHead>
                )}
                <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">{t("projects:acceptance.col_uat_no")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("projects:acceptance.col_test_date")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("projects:acceptance.col_client_tester")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("projects:acceptance.col_conclusion")}</TableHead>
                <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap w-28">{t("projects:acceptance.col_actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bundle.uatList.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5 + (isSectionEditing("uat") ? 1 : 0)} className="p-0">
                    <div className="py-10 px-6 bg-muted/10 border-t border-dashed border-border/70">
                      <EmptyState
                        title={t("projects:acceptance.empty_uat_title")}
                        description={t("projects:acceptance.empty_uat_desc")}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                bundle.uatList.map((u) => {
                  const uatMeta = getUatConclusionMeta(u.conclusion, t);
                  const isChecked = getSelectedIds("uat").includes(u.id);
                  return (
                    <TableRow key={u.id}>
                      {isSectionEditing("uat") && (
                        <TableCell className="align-top text-center px-3 py-3.5">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              toggleRowSelection("uat", u.id, checked)
                            }
                            className="mt-0.5"
                            aria-label={`Pilih ${u.uat_number}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="pl-6 pr-3 py-3.5 text-center text-xs sm:text-sm leading-5 font-semibold whitespace-nowrap">
                        {u.uat_number}
                      </TableCell>
                      <TableCell className="px-3 py-3.5 text-center text-xs sm:text-sm leading-5 whitespace-nowrap">
                        {formatDateI18n(u.test_date, language)}
                      </TableCell>
                      <TableCell className="px-3 py-3.5 text-xs sm:text-sm leading-5 font-medium text-foreground">
                        {u.client_tester_name}
                      </TableCell>
                      <TableCell className="px-3 py-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center min-h-5 -my-px">
                          <StatusBadge
                            tone={uatMeta.tone}
                            label={uatMeta.label}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                        {isSectionEditing("uat") ? (
                          <RowEditActionButtons
                            onView={() =>
                              setViewModal({
                                title: `Rincian ${u.uat_number}`,
                                rows: [
                                  { label: t("projects:acceptance.col_uat_no"), value: u.uat_number },
                                  { label: t("projects:acceptance.col_test_date"), value: formatDateI18n(u.test_date, language) },
                                  { label: language === "en" ? "Testing Environment" : "Lingkungan Uji", value: u.staging_url ?? "-" },
                                  { label: t("projects:acceptance.col_client_tester"), value: u.client_tester_name },
                                  { label: language === "en" ? "Altvira Companion" : "Pendamping Altvira", value: u.altvira_companion_name },
                                  { label: t("projects:acceptance.col_conclusion"), value: uatMeta.label },
                                ],
                                onDownloadPdf: () => void onDownloadUatPdf(u),
                                onDownloadWord: () => void onDownloadUatWord(u),
                              })
                            }
                            onEdit={() => setEditRecord({ section: "uat", item: { ...u } })}
                            onDelete={() =>
                              setDeleteConfirm({
                                section: "uat",
                                ids: [u.id],
                                label: u.uat_number,
                              })
                            }
                          />
                        ) : (
                          <div className="flex justify-center items-center -my-1.5">
                            <DocumentDownloadMenu
                              title={language === "en" ? "Download UAT (PDF / Word)" : "Unduh UAT (PDF / Word)"}
                              onDownloadPdf={() => onDownloadUatPdf(u)}
                              onDownloadWord={() => onDownloadUatWord(u)}
                            />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Card 4C: BAST */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-base sm:text-lg font-bold">
              {language === "en" ? "Official Handover Certificate / BAST (Attachment A.8)" : "Berita Acara Serah Terima / BAST (Lampiran A.8)"}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground leading-relaxed">
              {language === "en" ? "Mandatory requirement for issuing Final Settlement Invoice." : "Syarat wajib penerbitan Invoice Pelunasan Akhir."}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <SectionEditControls
              hasItems={bundle.bastList.length > 0}
              isEditing={isSectionEditing("bast")}
              selectedCount={getSelectedIds("bast").length}
              onStartEdit={() => setSectionEditing("bast", true)}
              onCancelEdit={() => setSectionEditing("bast", false)}
              onDeleteSelected={() =>
                setDeleteConfirm({
                  section: "bast",
                  ids: getSelectedIds("bast"),
                  label: language === "en" ? "selected BAST documents" : "dokumen BAST terpilih",
                })
              }
            />
            <Button
              type="button"
              disabled={
                !bundle.uatList.some(
                  (u) =>
                    u.conclusion === "accepted" ||
                    u.conclusion === "accepted_with_notes",
                )
              }
              title={
                !bundle.uatList.some(
                  (u) =>
                    u.conclusion === "accepted" ||
                    u.conclusion === "accepted_with_notes",
                )
                  ? (language === "en" ? "Ensure UAT is Accepted to issue BAST (FR-PK8)" : "Pastikan UAT telah berstatus Diterima untuk menerbitkan BAST (FR-PK8)")
                  : (language === "en" ? "Issue BAST (Attachment A.8)" : "Terbitkan BAST (Lampiran A.8)")
              }
              onClick={openBastDialog}
              className="shrink-0 h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer"
            >
              <PlusIcon data-icon="inline-start" />
              {language === "en" ? "Issue BAST" : "Terbitkan BAST"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                {isSectionEditing("bast") && (
                  <TableHead className="w-12 text-center align-middle px-3">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={
                          bundle.bastList.length > 0 &&
                          getSelectedIds("bast").length === bundle.bastList.length
                        }
                        indeterminate={
                          getSelectedIds("bast").length > 0 &&
                          getSelectedIds("bast").length < bundle.bastList.length
                        }
                        onCheckedChange={(checked) =>
                          toggleSelectAllRows(
                            "bast",
                            bundle.bastList.map((h) => h.id),
                            checked,
                          )
                        }
                        aria-label={language === "en" ? "Select all BAST" : "Pilih semua BAST"}
                      />
                    </div>
                  </TableHead>
                )}
                <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">{language === "en" ? "BAST No." : "No. BAST"}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{language === "en" ? "Handover Date" : "Tanggal Serah Terima"}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{language === "en" ? "Warranty Period" : "Garansi Pemeliharaan"}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("projects:acceptance.col_status")}</TableHead>
                <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap w-28">{t("projects:acceptance.col_actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bundle.bastList.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5 + (isSectionEditing("bast") ? 1 : 0)} className="p-0">
                    <div className="py-10 px-6 bg-muted/10 border-t border-dashed border-border/70">
                      <EmptyState
                        title={language === "en" ? "No BAST Documents Yet" : "Belum ada BAST"}
                        description={language === "en" ? "Ensure UAT is Accepted to issue official handover certificate." : "Pastikan UAT telah berstatus Diterima untuk menerbitkan BAST."}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                bundle.bastList.map((h) => {
                  const bastStatus = getBastStatusMeta(h.status ?? "signed", t);
                  const isChecked = getSelectedIds("bast").includes(h.id);
                  return (
                    <TableRow key={h.id}>
                      {isSectionEditing("bast") && (
                        <TableCell className="align-top text-center px-3 py-3.5">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              toggleRowSelection("bast", h.id, checked)
                            }
                            className="mt-0.5"
                            aria-label={`Pilih ${h.bast_number}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="pl-6 pr-3 py-3.5 text-center text-xs sm:text-sm leading-5 font-semibold whitespace-nowrap">
                        {h.bast_number}
                      </TableCell>
                      <TableCell className="px-3 py-3.5 text-center text-xs sm:text-sm leading-5 whitespace-nowrap">
                        {formatDateI18n(h.handover_date, language)}
                      </TableCell>
                      <TableCell className="px-3 py-3.5 text-center text-xs sm:text-sm leading-5 font-medium whitespace-nowrap">
                        {h.warranty_period_months} {language === "en" ? "Months" : "Bulan"}
                      </TableCell>
                      <TableCell className="px-3 py-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center min-h-5 -my-px">
                          <StatusBadge
                            tone={bastStatus.tone}
                            label={bastStatus.label}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                        {isSectionEditing("bast") ? (
                          <RowEditActionButtons
                            onView={() =>
                              setViewModal({
                                title: `Rincian ${h.bast_number}`,
                                rows: [
                                  { label: language === "en" ? "BAST No." : "Nomor BAST", value: h.bast_number },
                                  { label: language === "en" ? "Handover Date" : "Tanggal Serah Terima", value: formatDateI18n(h.handover_date, language) },
                                  { label: language === "en" ? "Warranty Period" : "Masa Garansi", value: `${h.warranty_period_months} ${language === "en" ? "Months" : "Bulan"}` },
                                  { label: language === "en" ? "Project Deliverables" : "Pekerjaan Diserahterimakan", value: h.deliverables_summary ?? "-" },
                                  { label: t("projects:acceptance.col_status"), value: bastStatus.label },
                                ],
                                onDownloadPdf: () => void onDownloadBastPdf(h),
                                onDownloadWord: () => void onDownloadBastWord(h),
                              })
                            }
                            onEdit={() => setEditRecord({ section: "bast", item: { ...h } })}
                            onDelete={() =>
                              setDeleteConfirm({
                                section: "bast",
                                ids: [h.id],
                                label: h.bast_number,
                              })
                            }
                          />
                        ) : (
                          <div className="flex justify-center items-center -my-1.5">
                            <DocumentDownloadMenu
                              title={language === "en" ? "Download BAST (PDF / Word)" : "Unduh BAST (PDF / Word)"}
                              onDownloadPdf={() => onDownloadBastPdf(h)}
                              onDownloadWord={() => onDownloadBastWord(h)}
                            />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
                        {formatDateID(h.bast_date)}
                      </TableCell>
                      <TableCell className="px-3 py-3.5 text-center text-xs sm:text-sm leading-5 whitespace-nowrap tabular-nums">
                        {h.warranty_days} Hari
                      </TableCell>
                      <TableCell className="px-3 py-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center min-h-5 -my-px">
                          <StatusBadge
                            tone={bastStatus.tone}
                            label={bastStatus.label}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                        {isSectionEditing("bast") ? (
                          <RowEditActionButtons
                            onView={() =>
                              setViewModal({
                                title: `Rincian ${h.bast_number}`,
                                rows: [
                                  { label: "Nomor BAST", value: h.bast_number },
                                  { label: "Tanggal Serah Terima", value: formatDateID(h.bast_date) },
                                  { label: "Garansi Pemeliharaan", value: `${h.warranty_days} Hari` },
                                  { label: "Status", value: bastStatus.label },
                                ],
                                onDownloadPdf: () => void onDownloadBastPdf(h),
                                onDownloadWord: () => void onDownloadBastWord(h),
                              })
                            }
                            onEdit={() => setEditRecord({ section: "bast", item: { ...h } })}
                            onDelete={() =>
                              setDeleteConfirm({
                                section: "bast",
                                ids: [h.id],
                                label: h.bast_number,
                              })
                            }
                          />
                        ) : (
                          <div className="flex justify-center items-center -my-1.5">
                            <DocumentDownloadMenu
                              title="Unduh BAST (PDF / Word)"
                              onDownloadPdf={() => onDownloadBastPdf(h)}
                              onDownloadWord={() => onDownloadBastWord(h)}
                            />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
