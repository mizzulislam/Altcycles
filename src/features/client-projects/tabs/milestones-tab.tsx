import { PlusIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
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
import { formatDateID, formatRupiah } from "@/lib/formatters";
import {
  MILESTONE_STATUS_META,
  RowEditActionButtons,
  SectionEditControls,
  type EditableRecord,
  type SectionKey,
  type ViewDetailState,
} from "../components/project-detail-shared";
import type { ProjectWorkspaceBundle } from "@/lib/operations/client-projects";

interface MilestonesTabProps {
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
  onExportMilestonesExcel: () => void | Promise<void>;
  onExportMilestonesPdf: () => void | Promise<void>;
  onExportMilestonesCsv: () => void | Promise<void>;
  openMilestonesEditor: () => void;
  openRecordProgressDialog: () => void;
}

export function MilestonesTab({
  bundle,
  isSectionEditing,
  getSelectedIds,
  setSectionEditing,
  toggleSelectAllRows,
  toggleRowSelection,
  setDeleteConfirm,
  setViewModal,
  setEditRecord,
  onExportMilestonesExcel,
  onExportMilestonesPdf,
  onExportMilestonesCsv,
  openMilestonesEditor,
  openRecordProgressDialog,
}: MilestonesTabProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Card 1A: Jadwal Termin Penagihan */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-base sm:text-lg font-bold">
              Jadwal Termin Penagihan (Total 100%)
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground leading-relaxed">
              Atur porsi dan jadwal termin penagihan hingga tepat 100%.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {bundle.milestones.length > 0 && (
              <ExportDownloadMenu
                label="Unduh / Ekspor"
                onExportExcel={onExportMilestonesExcel}
                onExportPdf={onExportMilestonesPdf}
                onExportCsv={onExportMilestonesCsv}
              />
            )}
            <SectionEditControls
              hasItems={bundle.milestones.length > 0}
              isEditing={isSectionEditing("milestones")}
              selectedCount={getSelectedIds("milestones").length}
              onStartEdit={() => setSectionEditing("milestones", true)}
              onCancelEdit={() => setSectionEditing("milestones", false)}
              onDeleteSelected={() =>
                setDeleteConfirm({
                  section: "milestones",
                  ids: getSelectedIds("milestones"),
                  label: "termin terpilih",
                })
              }
            />
            {(() => {
              const hasLockedMilestone = bundle.milestones.some(
                (m) =>
                  bundle.bakpList.some((b) => b.milestone_id === m.id) ||
                  bundle.invoices.some((inv) => inv.milestone_id === m.id),
              );
              const isResetDisabled =
                hasLockedMilestone && bundle.milestones.length > 0;
              return (
                <Button
                  type="button"
                  disabled={isResetDisabled}
                  title={
                    isResetDisabled
                      ? "Jadwal termin tidak dapat disusun ulang karena sebagian termin sudah dipakai di BAKP atau Invoice. Gunakan tombol Edit untuk mengubah rincian baris yang tersedia."
                      : bundle.milestones.length > 0
                        ? "Susun ulang seluruh struktur termin penagihan hingga tetap tepat 100%"
                        : "Susun jadwal termin penagihan hingga tepat 100%"
                  }
                  onClick={openMilestonesEditor}
                  className="shrink-0 h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  {bundle.milestones.length > 0 ? (
                    <RotateCcwIcon data-icon="inline-start" />
                  ) : (
                    <PlusIcon data-icon="inline-start" />
                  )}
                  {bundle.milestones.length > 0
                    ? "Atur Ulang Termin"
                    : "Susun Termin 100%"}
                </Button>
              );
            })()}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                {isSectionEditing("milestones") && (
                  <TableHead className="w-12 text-center align-middle px-3">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={
                          bundle.milestones.length > 0 &&
                          getSelectedIds("milestones").length === bundle.milestones.length
                        }
                        indeterminate={
                          getSelectedIds("milestones").length > 0 &&
                          getSelectedIds("milestones").length < bundle.milestones.length
                        }
                        onCheckedChange={(checked) =>
                          toggleSelectAllRows(
                            "milestones",
                            bundle.milestones.map((m) => m.id),
                            checked,
                          )
                        }
                        aria-label="Pilih semua termin"
                      />
                    </div>
                  </TableHead>
                )}
                <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap w-16">No.</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Nama Termin</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Porsi (%)</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap w-40">Nominal</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Kriteria Pencapaian</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Status</TableHead>
                {isSectionEditing("milestones") && (
                  <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap w-28">Aksi</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {bundle.milestones.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6 + (isSectionEditing("milestones") ? 2 : 0)} className="p-0">
                    <div className="py-10 px-6 bg-muted/10 border-t border-dashed border-border/70">
                      <EmptyState
                        title="Jadwal termin belum disusun"
                        description="Klik tombol Susun Termin 100% untuk menetapkan DP, termin progres, dan pelunasan."
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                bundle.milestones.map((m) => {
                  const msStatus = MILESTONE_STATUS_META[m.status] ?? {
                    label: m.status,
                    tone: "info" as SemanticTone,
                  };
                  const isChecked = getSelectedIds("milestones").includes(m.id);
                  return (
                    <TableRow key={m.id}>
                      {isSectionEditing("milestones") && (
                        <TableCell className="align-top text-center px-3 py-3.5">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              toggleRowSelection("milestones", m.id, checked)
                            }
                            className="mt-0.5"
                            aria-label={`Pilih ${m.name}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="pl-6 pr-3 py-3.5 text-center text-xs sm:text-sm leading-5 font-semibold whitespace-nowrap tabular-nums">
                        {m.sequence_no}
                      </TableCell>
                      <TableCell className="px-3 py-3.5 text-xs sm:text-sm leading-5 font-medium text-foreground">
                        {m.name}
                      </TableCell>
                      <TableCell className="px-3 py-3.5 text-center text-xs sm:text-sm leading-5 whitespace-nowrap tabular-nums">
                        {m.percentage}%
                      </TableCell>
                      <TableCell className="px-3 py-3.5 whitespace-nowrap">
                        <MonetaryCell amount={m.amount} />
                      </TableCell>
                      <TableCell className="px-3 py-3.5 text-xs sm:text-sm leading-5 text-muted-foreground">
                        {m.achievement_criteria ?? "-"}
                      </TableCell>
                      <TableCell className="px-3 py-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center min-h-5 -my-px">
                          <StatusBadge
                            tone={msStatus.tone}
                            label={msStatus.label}
                          />
                        </div>
                      </TableCell>
                      {isSectionEditing("milestones") && (
                        <TableCell className="pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                          <RowEditActionButtons
                            onView={() =>
                              setViewModal({
                                title: `Rincian ${m.name}`,
                                rows: [
                                  { label: "Urutan", value: `#${m.sequence_no}` },
                                  { label: "Nama Termin", value: m.name },
                                  { label: "Porsi Persentase", value: `${m.percentage}%` },
                                  { label: "Nominal Tagihan", value: formatRupiah(m.amount) },
                                  { label: "Kriteria Pencapaian", value: m.achievement_criteria ?? "-" },
                                  { label: "Status", value: msStatus.label },
                                ],
                              })
                            }
                            onEdit={() => setEditRecord({ section: "milestones", item: { ...m } })}
                            onDelete={() =>
                              setDeleteConfirm({
                                section: "milestones",
                                ids: [m.id],
                                label: m.name,
                              })
                            }
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Card 1B: Pengakuan Pendapatan & Persentase Penyelesaian */}
      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-base sm:text-lg font-bold">
              Pengakuan Pendapatan &amp; Persentase Penyelesaian Akhir Periode
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground leading-relaxed">
              Catat progres kumulatif akhir periode untuk pengakuan pendapatan otomatis.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <SectionEditControls
              hasItems={bundle.progressEntries.length > 0}
              isEditing={isSectionEditing("progress")}
              selectedCount={getSelectedIds("progress").length}
              onStartEdit={() => setSectionEditing("progress", true)}
              onCancelEdit={() => setSectionEditing("progress", false)}
              onDeleteSelected={() =>
                setDeleteConfirm({
                  section: "progress",
                  ids: getSelectedIds("progress"),
                  label: "catatan progres terpilih",
                })
              }
            />
            <Button
              type="button"
              onClick={openRecordProgressDialog}
              className="shrink-0 h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer"
            >
              <PlusIcon data-icon="inline-start" />
              Catat Progres Penyelesaian
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                {isSectionEditing("progress") && (
                  <TableHead className="w-12 text-center align-middle px-3">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={
                          bundle.progressEntries.length > 0 &&
                          getSelectedIds("progress").length === bundle.progressEntries.length
                        }
                        indeterminate={
                          getSelectedIds("progress").length > 0 &&
                          getSelectedIds("progress").length < bundle.progressEntries.length
                        }
                        onCheckedChange={(checked) =>
                          toggleSelectAllRows(
                            "progress",
                            bundle.progressEntries.map((p) => p.id),
                            checked,
                          )
                        }
                        aria-label="Pilih semua catatan progres"
                      />
                    </div>
                  </TableHead>
                )}
                <TableHead className="pl-6 pr-3 w-1/4 text-center font-semibold whitespace-nowrap">Tanggal Pengakuan</TableHead>
                <TableHead className="px-3 w-1/4 text-center font-semibold whitespace-nowrap">Progres Kumulatif</TableHead>
                <TableHead className="px-3 w-1/4 text-center font-semibold whitespace-nowrap">Pendapatan Periode Ini</TableHead>
                <TableHead className="px-3 w-1/4 text-center font-semibold whitespace-nowrap">Pendapatan Kumulatif</TableHead>
                {isSectionEditing("progress") && (
                  <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap w-28">Aksi</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {bundle.progressEntries.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4 + (isSectionEditing("progress") ? 2 : 0)} className="p-0">
                    <div className="py-10 px-6 bg-muted/10 border-t border-dashed border-border/70">
                      <EmptyState
                        title="Belum ada pencatatan progres penyelesaian"
                        description="Catat progres pada akhir periode buku untuk mengakui pendapatan akrual sesuai capaian proyek."
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                bundle.progressEntries.map((pe) => {
                  const isChecked = getSelectedIds("progress").includes(pe.id);
                  return (
                    <TableRow key={pe.id}>
                      {isSectionEditing("progress") && (
                        <TableCell className="align-top text-center px-3 py-3.5">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              toggleRowSelection("progress", pe.id, checked)
                            }
                            className="mt-0.5"
                            aria-label={`Pilih progres ${formatDateID(pe.progress_date)}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="pl-6 pr-3 py-3.5 text-center text-xs sm:text-sm leading-5 whitespace-nowrap">
                        {formatDateID(pe.progress_date)}
                      </TableCell>
                      <TableCell className="px-3 py-3.5 text-center text-xs sm:text-sm leading-5 font-semibold whitespace-nowrap tabular-nums">
                        {pe.cumulative_percentage}%
                      </TableCell>
                      <TableCell className="px-3 py-3.5 whitespace-nowrap">
                        <MonetaryCell
                          amount={pe.period_recognized_revenue}
                          className="max-w-[155px] mx-auto"
                        />
                      </TableCell>
                      <TableCell className="px-3 py-3.5 whitespace-nowrap">
                        <MonetaryCell
                          amount={pe.cumulative_recognized_revenue}
                          className="max-w-[155px] mx-auto font-normal"
                        />
                      </TableCell>
                      {isSectionEditing("progress") && (
                        <TableCell className="pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                          <RowEditActionButtons
                            onView={() =>
                              setViewModal({
                                title: "Rincian Pengakuan Pendapatan",
                                subtitle: `Tanggal ${formatDateID(pe.progress_date)}`,
                                rows: [
                                  { label: "Tanggal Pengakuan", value: formatDateID(pe.progress_date) },
                                  { label: "Progres Kumulatif", value: `${pe.cumulative_percentage}%` },
                                  { label: "Pendapatan Periode Ini", value: formatRupiah(pe.period_recognized_revenue) },
                                  { label: "Pendapatan Kumulatif", value: formatRupiah(pe.cumulative_recognized_revenue) },
                                ],
                              })
                            }
                            onEdit={() => setEditRecord({ section: "progress", item: { ...pe } })}
                            onDelete={() =>
                              setDeleteConfirm({
                                section: "progress",
                                ids: [pe.id],
                                label: `progres ${formatDateID(pe.progress_date)}`,
                              })
                            }
                          />
                        </TableCell>
                      )}
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
