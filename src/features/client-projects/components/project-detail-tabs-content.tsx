import { toast } from "sonner";
import { buildDefaultSpkContent } from "@/lib/spk-defaults";
import { MilestonesTab } from "../tabs/milestones-tab";
import { QuotationPoTab } from "../tabs/quotation-po-tab";
import { SowSpkTab } from "../tabs/sow-spk-tab";
import { AcceptanceDocsTab } from "../tabs/acceptance-docs-tab";
import type { useProjectDetailState } from "../hooks/use-project-detail-state";

export interface ProjectDetailTabsContentProps {
  state: ReturnType<typeof useProjectDetailState>;
}

export function ProjectDetailTabsContent({ state }: ProjectDetailTabsContentProps) {
  const {
    project,
    customer,
    company,
    bundle,
    activeTab,
    isSectionEditing,
    getSelectedIds,
    setSectionEditing,
    toggleRowSelection,
    toggleSelectAllRows,
    setViewModal,
    setEditRecord,
    setDeleteConfirm,
    handleExportMilestonesExcel,
    handleExportMilestonesPdf,
    handleExportMilestonesCsv,
    openMilestonesEditor,
    setCumulativePct,
    maxProgressPct,
    setProgDialogOpen,
    setQtDialogOpen,
    verifyClientPurchaseOrder,
    setRejectPoTarget,
    downloadQuotationPdf,
    downloadQuotationWord,
    setDocTitle,
    setDocSummary,
    setDocSpkDraft,
    setDocDialogOpen,
    downloadProjectDocPdf,
    downloadProjectDocWord,
    openBakpDialog,
    setUatDialogOpen,
    setBastDialogOpen,
    approveBakpByClient,
    downloadBakpPdf,
    downloadBakpWord,
    downloadUatPdf,
    downloadUatWord,
    downloadBastPdf,
    downloadBastWord,
    reload,
  } = state;

  if (!project || !bundle) return null;

  return (
    <>
      {activeTab === "termin" && (
        <MilestonesTab
          bundle={bundle}
          isSectionEditing={isSectionEditing}
          getSelectedIds={getSelectedIds}
          setSectionEditing={setSectionEditing}
          toggleSelectAllRows={toggleSelectAllRows}
          toggleRowSelection={toggleRowSelection}
          setDeleteConfirm={setDeleteConfirm}
          setViewModal={setViewModal}
          setEditRecord={setEditRecord}
          onExportMilestonesExcel={handleExportMilestonesExcel}
          onExportMilestonesPdf={handleExportMilestonesPdf}
          onExportMilestonesCsv={handleExportMilestonesCsv}
          openMilestonesEditor={openMilestonesEditor}
          openRecordProgressDialog={() => {
            setCumulativePct(maxProgressPct < 100 ? 100 : 100);
            setProgDialogOpen(true);
          }}
        />
      )}

      {activeTab === "quotation_po" && (
        <QuotationPoTab
          project={project}
          customer={customer}
          company={company}
          bundle={bundle}
          isSectionEditing={isSectionEditing}
          getSelectedIds={getSelectedIds}
          setSectionEditing={setSectionEditing}
          toggleSelectAllRows={toggleSelectAllRows}
          toggleRowSelection={toggleRowSelection}
          setDeleteConfirm={setDeleteConfirm}
          setViewModal={setViewModal}
          setEditRecord={setEditRecord}
          onOpenCreateQuotation={() => setQtDialogOpen(true)}
          onVerifyPo={async (cpo) => {
            await verifyClientPurchaseOrder({
              clientPoId: cpo.id,
              projectId: project.id,
              approve: true,
            });
            toast.success(
              `PO Klien ${cpo.po_number} diverifikasi dan ditautkan ke proyek ${project.code}.`,
            );
            await reload();
          }}
          onRejectPo={(cpo) => setRejectPoTarget(cpo)}
          onDownloadQuotationPdf={downloadQuotationPdf}
          onDownloadQuotationWord={downloadQuotationWord}
        />
      )}

      {activeTab === "sow_spk" && (
        <SowSpkTab
          project={project}
          customer={customer}
          company={company}
          bundle={bundle}
          isSectionEditing={isSectionEditing}
          getSelectedIds={getSelectedIds}
          setSectionEditing={setSectionEditing}
          toggleSelectAllRows={toggleSelectAllRows}
          toggleRowSelection={toggleRowSelection}
          setDeleteConfirm={setDeleteConfirm}
          setViewModal={setViewModal}
          setEditRecord={setEditRecord}
          onOpenCreateDoc={() => {
            setDocTitle("");
            setDocSummary("");
            if (company) {
              setDocSpkDraft(
                buildDefaultSpkContent({
                  project,
                  customer,
                  company,
                  milestones: bundle.milestones,
                }),
              );
            }
            setDocDialogOpen(true);
          }}
          onDownloadDocPdf={downloadProjectDocPdf}
          onDownloadDocWord={downloadProjectDocWord}
        />
      )}

      {activeTab === "bakp_uat_bast" && (
        <AcceptanceDocsTab
          bundle={bundle}
          isSectionEditing={isSectionEditing}
          getSelectedIds={getSelectedIds}
          setSectionEditing={setSectionEditing}
          toggleSelectAllRows={toggleSelectAllRows}
          toggleRowSelection={toggleRowSelection}
          setDeleteConfirm={setDeleteConfirm}
          setViewModal={setViewModal}
          setEditRecord={setEditRecord}
          openBakpDialog={openBakpDialog}
          openUatDialog={() => setUatDialogOpen(true)}
          openBastDialog={() => setBastDialogOpen(true)}
          onApproveBakpByClient={async (id) => {
            await approveBakpByClient(id);
            toast.success("BAKP ditandai disetujui klien.");
            await reload();
          }}
          onDownloadBakpPdf={downloadBakpPdf}
          onDownloadBakpWord={downloadBakpWord}
          onDownloadUatPdf={downloadUatPdf}
          onDownloadUatWord={downloadUatWord}
          onDownloadBastPdf={downloadBastPdf}
          onDownloadBastWord={downloadBastWord}
        />
      )}
    </>
  );
}
