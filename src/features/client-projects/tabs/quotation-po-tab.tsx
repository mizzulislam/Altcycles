import { CheckCircle2Icon, PlusIcon, XCircleIcon } from "lucide-react";
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
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRupiah, formatDateI18n } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import {
  buildClientPoPdfSpec,
  downloadPdfBytes,
  generateDocumentPdf,
} from "@/lib/pdf-generator";
import {
  downloadWordBlob,
  generateDocumentWord,
} from "@/lib/word-generator";
import { recordExportLog } from "@/lib/operations-service";
import {
  RowEditActionButtons,
  SectionEditControls,
  getQuotationStatusMeta,
  getCpoStatusMeta,
  type EditableRecord,
  type SectionKey,
  type ViewDetailState,
} from "../components/project-detail-shared";
import type {
  ClientPurchaseOrderRow,
  CompanyProfileRow,
  CustomerRow,
  ProjectRow,
  QuotationRow,
} from "@/types/database.types";
import type { ProjectWorkspaceBundle } from "@/lib/operations/client-projects";

interface QuotationPoTabProps {
  project: ProjectRow;
  customer: CustomerRow | null;
  company: CompanyProfileRow | null;
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
  onOpenCreateQuotation: () => void;
  onVerifyPo: (cpo: ClientPurchaseOrderRow) => Promise<void>;
  onRejectPo: (cpo: ClientPurchaseOrderRow) => void;
  onDownloadQuotationPdf: (q: QuotationRow) => Promise<void>;
  onDownloadQuotationWord: (q: QuotationRow) => Promise<void>;
}

export function QuotationPoTab({
  project,
  customer: _customer,
  company,
  bundle,
  isSectionEditing,
  getSelectedIds,
  setSectionEditing,
  toggleSelectAllRows,
  toggleRowSelection,
  setDeleteConfirm,
  setViewModal,
  setEditRecord,
  onOpenCreateQuotation,
  onVerifyPo,
  onRejectPo,
  onDownloadQuotationPdf,
  onDownloadQuotationWord,
}: QuotationPoTabProps) {
  const { t, language } = useLanguage();

  return (
    <div className="flex flex-col gap-5">
      {/* Kartu 1: Quotation */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-base sm:text-lg font-bold">{t("projects:quotations.card_title")}</CardTitle>
            <CardDescription className="text-xs text-muted-foreground leading-relaxed">
              {t("projects:quotations.card_desc")}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <SectionEditControls
              hasItems={bundle.quotations.length > 0}
              isEditing={isSectionEditing("quotations")}
              selectedCount={getSelectedIds("quotations").length}
              onStartEdit={() => setSectionEditing("quotations", true)}
              onCancelEdit={() => setSectionEditing("quotations", false)}
              onDeleteSelected={() =>
                setDeleteConfirm({
                  section: "quotations",
                  ids: getSelectedIds("quotations"),
                  label: t("projects:quotations.select_all"),
                })
              }
            />
            <Button
              type="button"
              onClick={onOpenCreateQuotation}
              className="shrink-0 h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer"
            >
              <PlusIcon data-icon="inline-start" />
              {t("projects:quotations.btn_create")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                {isSectionEditing("quotations") && (
                  <TableHead className="w-12 text-center align-middle px-3">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={
                          bundle.quotations.length > 0 &&
                          getSelectedIds("quotations").length === bundle.quotations.length
                        }
                        indeterminate={
                          getSelectedIds("quotations").length > 0 &&
                          getSelectedIds("quotations").length < bundle.quotations.length
                        }
                        onCheckedChange={(checked) =>
                          toggleSelectAllRows(
                            "quotations",
                            bundle.quotations.map((q) => q.id),
                            checked,
                          )
                        }
                        aria-label={t("projects:quotations.select_all")}
                      />
                    </div>
                  </TableHead>
                )}
                <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">{t("projects:quotations.col_number")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("projects:quotations.col_date_valid")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap w-44">{t("projects:quotations.col_amount")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("projects:quotations.col_status")}</TableHead>
                <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap w-28">{t("projects:quotations.col_actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bundle.quotations.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5 + (isSectionEditing("quotations") ? 1 : 0)} className="p-0">
                    <div className="py-10 px-6 bg-muted/10 border-t border-dashed border-border/70">
                      <EmptyState
                        title={t("projects:quotations.empty_title")}
                        description={t("projects:quotations.empty_desc")}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                bundle.quotations.map((q) => {
                  const qtStatus = getQuotationStatusMeta(q.status, t);
                  const isChecked = getSelectedIds("quotations").includes(q.id);
                  return (
                    <TableRow key={q.id}>
                      {isSectionEditing("quotations") && (
                        <TableCell className="align-top text-center px-3 py-3.5">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              toggleRowSelection("quotations", q.id, checked)
                            }
                            className="mt-0.5"
                            aria-label={`Pilih ${q.quotation_number}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="pl-6 pr-3 py-3.5 text-center text-xs sm:text-sm leading-5 font-semibold whitespace-nowrap">
                        {q.quotation_number}
                      </TableCell>
                      <TableCell className="px-3 py-3.5 text-center text-xs sm:text-sm leading-5 whitespace-nowrap">
                        {formatDateI18n(q.quotation_date, language)} ({language === "en" ? "until" : "s.d."}{" "}
                        {formatDateI18n(q.valid_until, language)})
                      </TableCell>
                      <TableCell className="px-3 py-3.5 whitespace-nowrap">
                        <MonetaryCell amount={q.total_amount} />
                      </TableCell>
                      <TableCell className="px-3 py-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center min-h-5 -my-px">
                          <StatusBadge tone={qtStatus.tone} label={qtStatus.label} />
                        </div>
                      </TableCell>
                      <TableCell className="pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                        {isSectionEditing("quotations") ? (
                          <RowEditActionButtons
                            onView={() =>
                              setViewModal({
                                title: `Rincian ${q.quotation_number}`,
                                subtitle: q.project_title,
                                rows: [
                                  { label: t("projects:quotations.col_number"), value: q.quotation_number },
                                  { label: language === "en" ? "Issued Date" : "Tanggal Terbit", value: formatDateI18n(q.quotation_date, language) },
                                  { label: language === "en" ? "Validity Period" : "Masa Berlaku", value: formatDateI18n(q.valid_until, language) },
                                  { label: language === "en" ? "Estimated Duration" : "Estimasi Durasi", value: `${q.estimated_weeks} ${language === "en" ? "Weeks" : "Minggu"}` },
                                  { label: language === "en" ? "Revision Limit" : "Batas Revisi", value: `${q.revision_limit}x` },
                                  { label: t("projects:quotations.col_amount"), value: formatRupiah(q.total_amount) },
                                  { label: language === "en" ? "Needs Summary" : "Ringkasan Kebutuhan", value: q.client_need_summary ?? "-" },
                                  { label: t("projects:quotations.col_status"), value: qtStatus.label },
                                ],
                                onDownloadPdf: () => void onDownloadQuotationPdf(q),
                                onDownloadWord: () => void onDownloadQuotationWord(q),
                              })
                            }
                            onEdit={() => setEditRecord({ section: "quotations", item: { ...q } })}
                            onDelete={() =>
                              setDeleteConfirm({
                                section: "quotations",
                                ids: [q.id],
                                label: q.quotation_number,
                              })
                            }
                          />
                        ) : (
                          <div className="flex justify-center items-center -my-1.5">
                            <DocumentDownloadMenu
                              title={language === "en" ? "Download Quotation (PDF / Word)" : "Unduh Quotation (PDF / Word)"}
                              onDownloadPdf={() => onDownloadQuotationPdf(q)}
                              onDownloadWord={() => onDownloadQuotationWord(q)}
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

      {/* Kartu 2: PO Klien */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-base sm:text-lg font-bold">
              {t("projects:client_po.card_title")}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground leading-relaxed">
              {t("projects:client_po.card_desc")}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <SectionEditControls
              hasItems={bundle.clientPos.length > 0}
              isEditing={isSectionEditing("clientPos")}
              selectedCount={getSelectedIds("clientPos").length}
              onStartEdit={() => setSectionEditing("clientPos", true)}
              onCancelEdit={() => setSectionEditing("clientPos", false)}
              onDeleteSelected={() =>
                setDeleteConfirm({
                  section: "clientPos",
                  ids: getSelectedIds("clientPos"),
                  label: t("projects:client_po.select_all"),
                })
              }
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                {isSectionEditing("clientPos") && (
                  <TableHead className="w-12 text-center align-middle px-3">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={
                          bundle.clientPos.length > 0 &&
                          getSelectedIds("clientPos").length === bundle.clientPos.length
                        }
                        indeterminate={
                          getSelectedIds("clientPos").length > 0 &&
                          getSelectedIds("clientPos").length < bundle.clientPos.length
                        }
                        onCheckedChange={(checked) =>
                          toggleSelectAllRows(
                            "clientPos",
                            bundle.clientPos.map((c) => c.id),
                            checked,
                          )
                        }
                        aria-label={t("projects:client_po.select_all")}
                      />
                    </div>
                  </TableHead>
                )}
                <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">{t("projects:client_po.col_access_code")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("projects:client_po.col_client_name")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("projects:client_po.col_company")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap w-40">{t("projects:client_po.col_amount")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("projects:client_po.col_verification_status")}</TableHead>
                <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap w-28">{t("projects:client_po.col_actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bundle.clientPos.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6 + (isSectionEditing("clientPos") ? 1 : 0)} className="p-0">
                    <div className="py-10 px-6 bg-muted/10 border-t border-dashed border-border/70">
                      <EmptyState
                        title={t("projects:client_po.empty_title")}
                        description={t("projects:client_po.empty_desc")}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                bundle.clientPos.map((cpo) => {
                  const cpoStatus = getCpoStatusMeta(cpo.status, t);
                  const isChecked = getSelectedIds("clientPos").includes(cpo.id);
                  return (
                    <TableRow key={cpo.id}>
                      {isSectionEditing("clientPos") && (
                        <TableCell className="align-top text-center px-3 py-3.5">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              toggleRowSelection("clientPos", cpo.id, checked)
                            }
                            className="mt-0.5"
                            aria-label={`Pilih ${cpo.po_number}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="align-top pl-6 pr-3 py-3.5 text-center text-xs sm:text-sm leading-5 font-semibold whitespace-nowrap">
                        {cpo.po_number}
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 text-xs sm:text-sm leading-5 font-medium text-foreground">
                        {cpo.client_name}
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 text-xs sm:text-sm leading-5 text-muted-foreground">
                        {cpo.client_company || "-"}
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 whitespace-nowrap">
                        <MonetaryCell amount={cpo.po_value} />
                      </TableCell>
                      <TableCell className="align-top px-3 py-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center min-h-5 -my-px">
                          <StatusBadge
                            tone={cpoStatus.tone}
                            label={cpoStatus.label}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="align-top pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                        {isSectionEditing("clientPos") ? (
                          <RowEditActionButtons
                            onView={() =>
                              setViewModal({
                                title: `Rincian PO Klien ${cpo.po_number}`,
                                rows: [
                                  { label: t("projects:client_po.col_access_code"), value: cpo.po_number },
                                  { label: t("projects:client_po.col_client_name"), value: cpo.client_name },
                                  { label: t("projects:client_po.col_company"), value: cpo.client_company ?? "-" },
                                  { label: "Email Klien", value: cpo.client_email },
                                  { label: t("projects:client_po.col_amount"), value: formatRupiah(cpo.po_value) },
                                  { label: t("projects:client_po.col_verification_status"), value: cpoStatus.label },
                                ],
                              })
                            }
                            onEdit={() => setEditRecord({ section: "clientPos", item: { ...cpo } })}
                            onDelete={() =>
                              setDeleteConfirm({
                                section: "clientPos",
                                ids: [cpo.id],
                                label: cpo.po_number,
                              })
                            }
                          />
                        ) : cpo.status === "pending_verification" ? (
                          <div className="flex justify-center items-center gap-1 -my-1.5">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              title={language === "en" ? "Verify into This Project" : "Verifikasi ke Proyek Ini"}
                              onClick={() => void onVerifyPo(cpo)}
                              className="size-8 rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                            >
                              <CheckCircle2Icon className="size-4" />
                              <span className="sr-only">{language === "en" ? "Verify into This Project" : "Verifikasi ke Proyek Ini"}</span>
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              title={language === "en" ? "Reject Client PO" : "Tolak PO Klien"}
                              onClick={() => onRejectPo(cpo)}
                              className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                            >
                              <XCircleIcon className="size-4" />
                              <span className="sr-only">{language === "en" ? "Reject" : "Tolak"}</span>
                            </Button>
                          </div>
                        ) : cpo.status === "verified" ? (
                          <div className="flex justify-center items-center -my-1.5">
                            <DocumentDownloadMenu
                              title={language === "en" ? "Download Client Purchase Order (PDF / Word)" : "Unduh Purchase Order Klien (PDF / Word)"}
                              onDownloadPdf={async () => {
                                if (!company) return;
                                const spec = buildClientPoPdfSpec({
                                  company,
                                  poNumber: cpo.po_number,
                                  poDate: cpo.created_at.slice(0, 10),
                                  clientName: cpo.client_name,
                                  clientCompany: cpo.client_company,
                                  clientEmail: cpo.client_email,
                                  clientPhone: cpo.client_phone,
                                  quotationReference: cpo.quotation_reference,
                                  statusLabel: cpoStatus.label,
                                  projectLabel: project
                                    ? `${project.code} - ${project.name}`
                                    : null,
                                  items: Array.isArray(cpo.items_json)
                                    ? cpo.items_json
                                    : [],
                                  poValue: cpo.po_value,
                                });
                                const bytes = await generateDocumentPdf(spec);
                                downloadPdfBytes(
                                  bytes,
                                  `PO_Klien_${cpo.po_number.replace(/[^A-Za-z0-9_-]/g, "_")}.pdf`,
                                );
                                await recordExportLog("CLIENT_PO", "PDF");
                              }}
                              onDownloadWord={async () => {
                                if (!company) return;
                                const spec = buildClientPoPdfSpec({
                                  company,
                                  poNumber: cpo.po_number,
                                  poDate: cpo.created_at.slice(0, 10),
                                  clientName: cpo.client_name,
                                  clientCompany: cpo.client_company,
                                  clientEmail: cpo.client_email,
                                  clientPhone: cpo.client_phone,
                                  quotationReference: cpo.quotation_reference,
                                  statusLabel: cpoStatus.label,
                                  projectLabel: project
                                    ? `${project.code} - ${project.name}`
                                    : null,
                                  items: Array.isArray(cpo.items_json)
                                    ? cpo.items_json
                                    : [],
                                  poValue: cpo.po_value,
                                });
                                const blob = await generateDocumentWord(spec);
                                downloadWordBlob(
                                  blob,
                                  `PO_Klien_${cpo.po_number.replace(/[^A-Za-z0-9_-]/g, "_")}.docx`,
                                );
                                await recordExportLog("CLIENT_PO", "EXCEL");
                              }}
                            />
                          </div>
                        ) : (
                          <span className="text-xs sm:text-sm leading-5 text-muted-foreground">
                            -
                          </span>
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
