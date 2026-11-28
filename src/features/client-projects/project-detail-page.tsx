import { useNavigate } from "react-router-dom";
import { ProjectDetailHeader } from "@/features/client-projects/components/project-detail-header";
import { EmptyState } from "@/components/ui/empty";
import { PageLoader } from "@/components/ui/loader";
import { ProjectDetailTabsContent } from "./components/project-detail-tabs-content";
import { ProjectDetailActionDialogs } from "./dialogs/project-detail-action-dialogs";
import { useProjectDetailState } from "./hooks/use-project-detail-state";

export function ProjectDetailPage() {
  const navigate = useNavigate();
  const state = useProjectDetailState();

  const {
    t,
    project,
    allProjects,
    customer,
    company,
    bundle,
    loading,
    activeTab,
    setActiveTab,
    deleteConfirm,
    setDeleteConfirm,
    executeDeleteRecords,
    msDialogOpen,
    setMsDialogOpen,
    draftMilestones,
    setDraftMilestones,
    savingMs,
    handleSaveMilestones,
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
    handleRecordProgress,
    maxProgressPct,
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
    handleCreateQuotation,
    rejectPoTarget,
    setRejectPoTarget,
    docDialogOpen,
    setDocDialogOpen,
    docType,
    setDocType,
    docTitle,
    setDocTitle,
    docSummary,
    setDocSummary,
    docSpkDraft,
    setDocSpkDraft,
    docSigned,
    setDocSigned,
    savingDoc,
    handleCreateDoc,
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
    handleCreateBakp,
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
    handleCreateUat,
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
    handleCreateBast,
    reload,
    verifyClientPurchaseOrder,
    viewModal,
    setViewModal,
    editRecord,
    setEditRecord,
    savingEditRecord,
    handleSaveEditRecord,
  } = state;

  if (loading) {
    return <PageLoader message={t("projects:loading_workspace")} />;
  }

  if (!project || !bundle) {
    return (
      <EmptyState
        title={t("projects:not_found_title")}
        description={t("projects:not_found_desc")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ProjectDetailHeader
        project={project}
        bundle={bundle}
        allProjects={allProjects}
        customer={customer ?? undefined}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSwitchProject={(nextId) => navigate(`/admin/proyek/${nextId}`)}
      />

      {/* Konten Tab Aktif */}
      <ProjectDetailTabsContent state={state} />

      {/* Seluruh Modal & Konfirmasi Dialog */}
      <ProjectDetailActionDialogs
        project={project}
        customer={customer}
        company={company}
        bundle={bundle}
        maxProgressPct={maxProgressPct}
        msDialogOpen={msDialogOpen}
        setMsDialogOpen={setMsDialogOpen}
        draftMilestones={draftMilestones}
        setDraftMilestones={setDraftMilestones}
        savingMs={savingMs}
        onSaveMilestones={handleSaveMilestones}
        progDialogOpen={progDialogOpen}
        setProgDialogOpen={setProgDialogOpen}
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
        savingProg={savingProg}
        onRecordProgress={handleRecordProgress}
        qtDialogOpen={qtDialogOpen}
        setQtDialogOpen={setQtDialogOpen}
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
        savingQt={savingQt}
        onCreateQuotation={handleCreateQuotation}
        docDialogOpen={docDialogOpen}
        setDocDialogOpen={setDocDialogOpen}
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
        savingDoc={savingDoc}
        onCreateDoc={handleCreateDoc}
        bakpDialogOpen={bakpDialogOpen}
        setBakpDialogOpen={setBakpDialogOpen}
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
        savingBakp={savingBakp}
        onCreateBakp={handleCreateBakp}
        uatDialogOpen={uatDialogOpen}
        setUatDialogOpen={setUatDialogOpen}
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
        savingUat={savingUat}
        onCreateUat={handleCreateUat}
        bastDialogOpen={bastDialogOpen}
        setBastDialogOpen={setBastDialogOpen}
        bastDate={bastDate}
        setBastDate={setBastDate}
        bastUatId={bastUatId}
        setBastUatId={setBastUatId}
        bastWarrantyDays={bastWarrantyDays}
        setBastWarrantyDays={setBastWarrantyDays}
        bastSigned={bastSigned}
        setBastSigned={setBastSigned}
        savingBast={savingBast}
        onCreateBast={handleCreateBast}
        rejectPoTarget={rejectPoTarget}
        setRejectPoTarget={setRejectPoTarget}
        onVerifyClientPo={verifyClientPurchaseOrder}
        viewModal={viewModal}
        setViewModal={setViewModal}
        editRecord={editRecord}
        setEditRecord={setEditRecord}
        savingEditRecord={savingEditRecord}
        onSaveEditRecord={handleSaveEditRecord}
        deleteConfirm={deleteConfirm}
        setDeleteConfirm={setDeleteConfirm}
        onExecuteDelete={executeDeleteRecords}
        reload={reload}
      />
    </div>
  );
}
