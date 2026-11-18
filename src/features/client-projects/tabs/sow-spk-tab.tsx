import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
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
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { extractSpkCharterContent } from "@/lib/spk-defaults";
import {
  RowEditActionButtons,
  SectionEditControls,
  type EditableRecord,
  type SectionKey,
  type ViewDetailState,
} from "../components/project-detail-shared";
import type {
  CompanyProfileRow,
  CustomerRow,
  ProjectDocumentRow,
  ProjectRow,
} from "@/types/database.types";
import type { ProjectWorkspaceBundle } from "@/lib/operations/client-projects";

interface SowSpkTabProps {
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
  onOpenCreateDoc: () => void;
  onDownloadDocPdf: (doc: ProjectDocumentRow) => Promise<void>;
  onDownloadDocWord: (doc: ProjectDocumentRow) => Promise<void>;
}

export function SowSpkTab({
  project,
  customer,
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
  onOpenCreateDoc,
  onDownloadDocPdf,
  onDownloadDocWord,
}: SowSpkTabProps) {
  const { t, language } = useLanguage();

  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
      <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 min-w-0">
          <CardTitle>
            {t("projects:sow_spk.card_title")}
          </CardTitle>
          <CardDescription>
            {t("projects:sow_spk.card_desc")}
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <SectionEditControls
            hasItems={bundle.documents.length > 0}
            isEditing={isSectionEditing("documents")}
            selectedCount={getSelectedIds("documents").length}
            onStartEdit={() => setSectionEditing("documents", true)}
            onCancelEdit={() => setSectionEditing("documents", false)}
            onDeleteSelected={() =>
              setDeleteConfirm({
                section: "documents",
                ids: getSelectedIds("documents"),
                label: t("projects:sow_spk.select_all"),
              })
            }
          />
          <Button
            type="button"
            onClick={onOpenCreateDoc}
            className="shrink-0 h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer"
          >
            <PlusIcon data-icon="inline-start" />
            {t("projects:sow_spk.btn_create")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              {isSectionEditing("documents") && (
                <TableHead className="w-12 text-center align-middle px-3">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={
                        bundle.documents.length > 0 &&
                        getSelectedIds("documents").length === bundle.documents.length
                      }
                      indeterminate={
                        getSelectedIds("documents").length > 0 &&
                        getSelectedIds("documents").length < bundle.documents.length
                      }
                      onCheckedChange={(checked) =>
                        toggleSelectAllRows(
                          "documents",
                          bundle.documents.map((d) => d.id),
                          checked,
                        )
                      }
                      aria-label={t("projects:sow_spk.select_all")}
                    />
                  </div>
                </TableHead>
              )}
              <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">{t("projects:sow_spk.col_type")}</TableHead>
              <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("projects:sow_spk.col_doc_number")}</TableHead>
              <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("projects:sow_spk.col_title")}</TableHead>
              <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("projects:sow_spk.col_signature_status")}</TableHead>
              <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap w-28">{t("projects:sow_spk.col_actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bundle.documents.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5 + (isSectionEditing("documents") ? 1 : 0)} className="p-0">
                  <div className="py-10 px-6 bg-muted/10 border-t border-dashed border-border/70">
                    <EmptyState
                      title={t("projects:sow_spk.empty_title")}
                      description={t("projects:sow_spk.empty_desc")}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              bundle.documents.map((d) => {
                const isChecked = getSelectedIds("documents").includes(d.id);
                const contentObj = d.content_json as Record<string, unknown> | null;
                const signatureLabel = d.is_signed ? t("projects:status.signed") : t("projects:status.draft");
                return (
                  <TableRow key={d.id}>
                    {isSectionEditing("documents") && (
                      <TableCell className="align-top text-center px-3 py-3.5">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            toggleRowSelection("documents", d.id, checked)
                          }
                          className="mt-0.5"
                          aria-label={`Pilih ${d.doc_number}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="pl-6 pr-3 py-3.5 text-center whitespace-nowrap">
                      <div className="inline-flex items-center min-h-5 -my-px">
                        <StatusBadge tone="info" label={d.doc_type} />
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3.5 text-center text-xs sm:text-sm leading-5 font-semibold whitespace-nowrap">
                      {d.doc_number}
                    </TableCell>
                    <TableCell className="px-3 py-3.5 text-xs sm:text-sm leading-5 font-medium text-foreground">
                      {d.title}
                    </TableCell>
                    <TableCell className="px-3 py-3.5 text-center whitespace-nowrap">
                      <div className="inline-flex items-center min-h-5 -my-px">
                        <StatusBadge
                          tone={d.is_signed ? "success" : "warning"}
                          label={signatureLabel}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                      {isSectionEditing("documents") ? (
                        <RowEditActionButtons
                          onView={() =>
                            setViewModal({
                              title: `Rincian ${d.doc_number}`,
                              subtitle: d.title,
                              rows: [
                                { label: t("projects:sow_spk.col_type"), value: d.doc_type },
                                { label: t("projects:sow_spk.col_doc_number"), value: d.doc_number },
                                { label: t("projects:sow_spk.col_title"), value: d.title },
                                { label: t("projects:sow_spk.col_signature_status"), value: signatureLabel },
                                { label: language === "en" ? "Scope Summary" : "Ringkasan Ruang Lingkup", value: String(contentObj?.summary ?? "-") },
                              ],
                              onDownloadPdf: () => void onDownloadDocPdf(d),
                              onDownloadWord: () => void onDownloadDocWord(d),
                            })
                          }
                          onEdit={() => {
                            const enrichedContent =
                              d.doc_type === "SPK" && company
                                ? extractSpkCharterContent(
                                    d.content_json as Record<string, unknown> | null,
                                    { project, customer, company, milestones: bundle.milestones },
                                  )
                                : d.content_json;
                            setEditRecord({
                              section: "documents",
                              item: {
                                ...d,
                                content_json: enrichedContent as ProjectDocumentRow["content_json"],
                              },
                            });
                          }}
                          onDelete={() =>
                            setDeleteConfirm({
                              section: "documents",
                              ids: [d.id],
                              label: d.doc_number,
                            })
                          }
                        />
                      ) : (
                        <div className="flex justify-center items-center -my-1.5">
                          <DocumentDownloadMenu
                            title={language === "en" ? `Download ${d.doc_type} (PDF / Word)` : `Unduh ${d.doc_type} (PDF / Word)`}
                            onDownloadPdf={() => onDownloadDocPdf(d)}
                            onDownloadWord={() => onDownloadDocWord(d)}
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
  );
}
