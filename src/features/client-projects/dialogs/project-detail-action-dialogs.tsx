import type { FormEvent } from "react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import type {
  ClientPurchaseOrderRow,
  CompanyProfileRow,
  CustomerRow,
  ProjectRow,
  SpkCharterContent,
  UatConclusion,
} from "@/types/database.types";
import type {
  DraftMilestone,
  EditableRecord,
  SectionKey,
  ViewDetailState,
} from "@/features/client-projects/components/project-detail-shared";
import type { ProjectWorkspaceBundle } from "@/lib/operations/client-projects";
import { MilestoneScheduleDialog } from "./milestone-schedule-dialog";
import { RecordProgressDialog } from "./record-progress-dialog";
import {
  CreateQuotationDialog,
  type QuotationDraftItem,
} from "./create-quotation-dialog";
import { CreateProjectDocDialog } from "./create-project-doc-dialog";
import { CreateBakpDialog } from "./create-bakp-dialog";
import {
  CreateUatDialog,
  type UatScenarioItem,
} from "./create-uat-dialog";
import { CreateBastDialog } from "./create-bast-dialog";
import { ViewDetailDialog } from "./view-detail-dialog";
import { EditRecordDialog } from "./edit-record-dialog";

export interface ProjectDetailActionDialogsProps {
  project: ProjectRow;
  customer: CustomerRow | null;
  company: CompanyProfileRow | null;
  bundle: ProjectWorkspaceBundle;
  maxProgressPct: number;
  msDialogOpen: boolean;
  setMsDialogOpen: (open: boolean) => void;
  draftMilestones: DraftMilestone[];
  setDraftMilestones: React.Dispatch<React.SetStateAction<DraftMilestone[]>>;
  savingMs: boolean;
  onSaveMilestones: (e: FormEvent) => Promise<void>;
  progDialogOpen: boolean;
  setProgDialogOpen: (open: boolean) => void;
  progressDate: string;
  setProgressDate: (val: string) => void;
  cumulativePct: number;
  setCumulativePct: (val: number) => void;
  useExactRevenueOverride: boolean;
  setUseExactRevenueOverride: (val: boolean) => void;
  exactRevenueOverride: number;
  setExactRevenueOverride: (val: number) => void;
  enableAutoReverse: boolean;
  setEnableAutoReverse: (val: boolean) => void;
  savingProg: boolean;
  onRecordProgress: (e: FormEvent) => Promise<void>;
  qtDialogOpen: boolean;
  setQtDialogOpen: (open: boolean) => void;
  qtDate: string;
  setQtDate: (val: string) => void;
  qtValidUntil: string;
  setQtValidUntil: (val: string) => void;
  qtWeeks: number;
  setQtWeeks: (val: number) => void;
  qtRevisions: number;
  setQtRevisions: (val: number) => void;
  qtNeedSummary: string;
  setQtNeedSummary: (val: string) => void;
  qtItems: QuotationDraftItem[];
  setQtItems: React.Dispatch<React.SetStateAction<QuotationDraftItem[]>>;
  savingQt: boolean;
  onCreateQuotation: (e: FormEvent) => Promise<void>;
  docDialogOpen: boolean;
  setDocDialogOpen: (open: boolean) => void;
  docType: "SOW" | "SPK";
  setDocType: (val: "SOW" | "SPK") => void;
  docTitle: string;
  setDocTitle: (val: string) => void;
  docSummary: string;
  setDocSummary: (val: string) => void;
  docSigned: boolean;
  setDocSigned: (val: boolean) => void;
  docSpkDraft: SpkCharterContent | null;
  setDocSpkDraft: (val: SpkCharterContent | null) => void;
  savingDoc: boolean;
  onCreateDoc: (e: FormEvent) => Promise<void>;
  bakpDialogOpen: boolean;
  setBakpDialogOpen: (open: boolean) => void;
  bakpDate: string;
  setBakpDate: (val: string) => void;
  bakpMilestoneId: string;
  setBakpMilestoneId: React.Dispatch<React.SetStateAction<string>>;
  bakpCumPct: number;
  setBakpCumPct: (val: number) => void;
  bakpBillable: number;
  setBakpBillable: (val: number) => void;
  bakpNotes: string;
  setBakpNotes: (val: string) => void;
  bakpApprovedNow: boolean;
  setBakpApprovedNow: (val: boolean) => void;
  savingBakp: boolean;
  onCreateBakp: (e: FormEvent) => Promise<void>;
  uatDialogOpen: boolean;
  setUatDialogOpen: (open: boolean) => void;
  uatDate: string;
  setUatDate: (val: string) => void;
  uatStagingUrl: string;
  setUatStagingUrl: (val: string) => void;
  uatClientTester: string;
  setUatClientTester: (val: string) => void;
  uatCompanion: string;
  setUatCompanion: (val: string) => void;
  uatConclusion: UatConclusion;
  setUatConclusion: (val: UatConclusion) => void;
  uatScenarios: UatScenarioItem[];
  setUatScenarios: React.Dispatch<React.SetStateAction<UatScenarioItem[]>>;
  savingUat: boolean;
  onCreateUat: (e: FormEvent) => Promise<void>;
  bastDialogOpen: boolean;
  setBastDialogOpen: (open: boolean) => void;
  bastDate: string;
  setBastDate: (val: string) => void;
  bastUatId: string;
  setBastUatId: React.Dispatch<React.SetStateAction<string>>;
  bastWarrantyDays: number;
  setBastWarrantyDays: (val: number) => void;
  bastSigned: boolean;
  setBastSigned: (val: boolean) => void;
  savingBast: boolean;
  onCreateBast: (e: FormEvent) => Promise<void>;
  rejectPoTarget: ClientPurchaseOrderRow | null;
  setRejectPoTarget: (po: ClientPurchaseOrderRow | null) => void;
  onVerifyClientPo: (args: {
    clientPoId: string;
    projectId: string;
    approve: boolean;
    rejectionNote?: string;
  }) => Promise<void>;
  viewModal: ViewDetailState | null;
  setViewModal: (val: ViewDetailState | null) => void;
  editRecord: EditableRecord | null;
  setEditRecord: React.Dispatch<React.SetStateAction<EditableRecord | null>>;
  savingEditRecord: boolean;
  onSaveEditRecord: (e: FormEvent) => Promise<void>;
  deleteConfirm: {
    section: SectionKey;
    ids: string[];
    label: string;
  } | null;
  setDeleteConfirm: React.Dispatch<
    React.SetStateAction<{
      section: SectionKey;
      ids: string[];
      label: string;
    } | null>
  >;
  onExecuteDelete: () => Promise<void>;
  reload: () => Promise<void>;
}

export function ProjectDetailActionDialogs(props: ProjectDetailActionDialogsProps) {
  const {
    project,
    customer,
    company,
    bundle,
    maxProgressPct,
    msDialogOpen,
    setMsDialogOpen,
    draftMilestones,
    setDraftMilestones,
    savingMs,
    onSaveMilestones,
    progDialogOpen,
    setProgDialogOpen,
    progressDate,
    setProgressDate,
    cumulativePct,
    setCumulativePct,
    useExactRevenueOverride,
    setUseExactRevenueOverride,
    exactRevenueOverride,
    setExactRevenueOverride,
    enableAutoReverse,
    setEnableAutoReverse,
    savingProg,
    onRecordProgress,
    qtDialogOpen,
    setQtDialogOpen,
    qtDate,
    setQtDate,
    qtValidUntil,
    setQtValidUntil,
    qtWeeks,
    setQtWeeks,
    qtRevisions,
    setQtRevisions,
    qtNeedSummary,
    setQtNeedSummary,
    qtItems,
    setQtItems,
    savingQt,
    onCreateQuotation,
    docDialogOpen,
    setDocDialogOpen,
    docType,
    setDocType,
    docTitle,
    setDocTitle,
    docSummary,
    setDocSummary,
    docSigned,
    setDocSigned,
    docSpkDraft,
    setDocSpkDraft,
    savingDoc,
    onCreateDoc,
    bakpDialogOpen,
    setBakpDialogOpen,
    bakpDate,
    setBakpDate,
    bakpMilestoneId,
    setBakpMilestoneId,
    bakpCumPct,
    setBakpCumPct,
    bakpBillable,
    setBakpBillable,
    bakpNotes,
    setBakpNotes,
    bakpApprovedNow,
    setBakpApprovedNow,
    savingBakp,
    onCreateBakp,
    uatDialogOpen,
    setUatDialogOpen,
    uatDate,
    setUatDate,
    uatStagingUrl,
    setUatStagingUrl,
    uatClientTester,
    setUatClientTester,
    uatCompanion,
    setUatCompanion,
    uatConclusion,
    setUatConclusion,
    uatScenarios,
    setUatScenarios,
    savingUat,
    onCreateUat,
    bastDialogOpen,
    setBastDialogOpen,
    bastDate,
    setBastDate,
    bastUatId,
    setBastUatId,
    bastWarrantyDays,
    setBastWarrantyDays,
    bastSigned,
    setBastSigned,
    savingBast,
    onCreateBast,
    rejectPoTarget,
    setRejectPoTarget,
    onVerifyClientPo,
    viewModal,
    setViewModal,
    editRecord,
    setEditRecord,
    savingEditRecord,
    onSaveEditRecord,
    deleteConfirm,
    setDeleteConfirm,
    onExecuteDelete,
    reload,
  } = props;

  return (
    <>
      {/* 1. Modal Dialog Susun Jadwal Termin */}
      <MilestoneScheduleDialog
        open={msDialogOpen}
        onOpenChange={setMsDialogOpen}
        contractValue={project.contract_value}
        draftMilestones={draftMilestones}
        setDraftMilestones={setDraftMilestones}
        saving={savingMs}
        onSave={onSaveMilestones}
      />

      {/* 2. Modal Dialog Catat Progres Penyelesaian */}
      <RecordProgressDialog
        open={progDialogOpen}
        onOpenChange={setProgDialogOpen}
        contractValue={project.contract_value}
        revenueMethod={project.revenue_method}
        maxProgressPct={maxProgressPct}
        progressDate={progressDate}
        setProgressDate={setProgressDate}
        cumulativePct={cumulativePct}
        setCumulativePct={setCumulativePct}
        useExactRevenueOverride={useExactRevenueOverride}
        setUseExactRevenueOverride={setUseExactRevenueOverride}
        exactRevenueOverride={exactRevenueOverride}
        setExactRevenueOverride={setExactRevenueOverride}
        enableAutoReverse={enableAutoReverse}
        setEnableAutoReverse={setEnableAutoReverse}
        saving={savingProg}
        onSave={onRecordProgress}
      />

      {/* 3. Modal Dialog Terbitkan Quotation */}
      <CreateQuotationDialog
        open={qtDialogOpen}
        onOpenChange={setQtDialogOpen}
        qtDate={qtDate}
        setQtDate={setQtDate}
        qtValidUntil={qtValidUntil}
        setQtValidUntil={setQtValidUntil}
        qtWeeks={qtWeeks}
        setQtWeeks={setQtWeeks}
        qtRevisions={qtRevisions}
        setQtRevisions={setQtRevisions}
        qtNeedSummary={qtNeedSummary}
        setQtNeedSummary={setQtNeedSummary}
        qtItems={qtItems}
        setQtItems={setQtItems}
        saving={savingQt}
        onSave={onCreateQuotation}
      />

      {/* 4. Modal Dialog Rekam Dokumen SoW atau SPK */}
      <CreateProjectDocDialog
        open={docDialogOpen}
        onOpenChange={setDocDialogOpen}
        project={project}
        customer={customer}
        company={company}
        bundle={bundle}
        docType={docType}
        setDocType={setDocType}
        docTitle={docTitle}
        setDocTitle={setDocTitle}
        docSummary={docSummary}
        setDocSummary={setDocSummary}
        docSigned={docSigned}
        setDocSigned={setDocSigned}
        docSpkDraft={docSpkDraft}
        setDocSpkDraft={setDocSpkDraft}
        saving={savingDoc}
        onSave={onCreateDoc}
      />

      {/* 5. Modal Dialog Buat BAKP */}
      <CreateBakpDialog
        open={bakpDialogOpen}
        onOpenChange={setBakpDialogOpen}
        milestones={bundle.milestones}
        bakpDate={bakpDate}
        setBakpDate={setBakpDate}
        bakpMilestoneId={bakpMilestoneId}
        setBakpMilestoneId={setBakpMilestoneId}
        bakpCumPct={bakpCumPct}
        setBakpCumPct={setBakpCumPct}
        bakpBillable={bakpBillable}
        setBakpBillable={setBakpBillable}
        bakpNotes={bakpNotes}
        setBakpNotes={setBakpNotes}
        bakpApprovedNow={bakpApprovedNow}
        setBakpApprovedNow={setBakpApprovedNow}
        saving={savingBakp}
        onSave={onCreateBakp}
      />

      {/* 6. Modal Dialog Catat UAT */}
      <CreateUatDialog
        open={uatDialogOpen}
        onOpenChange={setUatDialogOpen}
        uatDate={uatDate}
        setUatDate={setUatDate}
        uatStagingUrl={uatStagingUrl}
        setUatStagingUrl={setUatStagingUrl}
        uatClientTester={uatClientTester}
        setUatClientTester={setUatClientTester}
        uatCompanion={uatCompanion}
        setUatCompanion={setUatCompanion}
        uatConclusion={uatConclusion}
        setUatConclusion={setUatConclusion}
        uatScenarios={uatScenarios}
        setUatScenarios={setUatScenarios}
        saving={savingUat}
        onSave={onCreateUat}
      />

      {/* 7. Modal Dialog Terbitkan BAST */}
      <CreateBastDialog
        open={bastDialogOpen}
        onOpenChange={setBastDialogOpen}
        uatList={bundle.uatList}
        bastDate={bastDate}
        setBastDate={setBastDate}
        bastUatId={bastUatId}
        setBastUatId={setBastUatId}
        bastWarrantyDays={bastWarrantyDays}
        setBastWarrantyDays={setBastWarrantyDays}
        bastSigned={bastSigned}
        setBastSigned={setBastSigned}
        saving={savingBast}
        onSave={onCreateBast}
      />

      {/* 8. Konfirmasi Penolakan PO Klien */}
      <ConfirmActionDialog
        open={Boolean(rejectPoTarget)}
        onOpenChange={(open) => {
          if (!open) setRejectPoTarget(null);
        }}
        title={`Tolak PO Klien ${rejectPoTarget?.po_number ?? ""}?`}
        description="Tuliskan catatan ketidaksesuaian PO agar terdokumentasi."
        destructive
        requireReason
        reasonLabel="Catatan Penolakan PO Klien"
        confirmLabel="Tolak PO Klien"
        onConfirm={async (reason) => {
          if (!rejectPoTarget || !reason) return;
          await onVerifyClientPo({
            clientPoId: rejectPoTarget.id,
            projectId: project.id,
            approve: false,
            rejectionNote: reason,
          });
          toast.success(`PO Klien ${rejectPoTarget.po_number} ditolak.`);
          await reload();
        }}
      />

      {/* 9. Modal Lihat Rincian Data */}
      <ViewDetailDialog
        viewModal={viewModal}
        onClose={() => setViewModal(null)}
      />

      {/* 10. Modal Edit Data Baris (Aksi Mode Edit) */}
      <EditRecordDialog
        editRecord={editRecord}
        setEditRecord={setEditRecord}
        onClose={() => setEditRecord(null)}
        saving={savingEditRecord}
        onSave={onSaveEditRecord}
        project={project}
        customer={customer}
        company={company}
        milestones={bundle.milestones}
      />

      {/* 11. Konfirmasi Hapus Data / Hapus Pilihan (Aksi Mode Edit) */}
      <ConfirmActionDialog
        open={Boolean(deleteConfirm)}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
        title={
          deleteConfirm && deleteConfirm.ids.length > 1
            ? `Hapus ${deleteConfirm.ids.length} ${deleteConfirm.label}?`
            : `Hapus ${deleteConfirm?.label ?? "data ini"}?`
        }
        description={
          deleteConfirm?.section === "milestones" &&
          bundle.bakpList.some((b) => deleteConfirm.ids.includes(b.milestone_id))
            ? "Data yang dihapus tidak dapat dikembalikan. Dokumen BAKP yang terhubung dengan termin terpilih juga akan ikut dihapus."
            : deleteConfirm?.section === "uat" &&
                bundle.bastList.some((h) => deleteConfirm.ids.includes(h.uat_id))
              ? "Data yang dihapus tidak dapat dikembalikan. Dokumen BAST yang diterbitkan dari UAT ini juga akan ikut dihapus."
              : "Data yang dihapus tidak dapat dikembalikan."
        }
        destructive
        confirmLabel="Hapus Permanen"
        onConfirm={onExecuteDelete}
      />
    </>
  );
}
