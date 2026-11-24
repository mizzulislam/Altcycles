import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import {
  type DraftMilestone,
  type EditableRecord,
  type SectionKey,
  type ViewDetailState,
} from "@/features/client-projects/components/project-detail-shared";
import {
  ProjectDetailHeader,
  type ProjectDetailTabId,
} from "@/features/client-projects/components/project-detail-header";
import { EmptyState, Spinner } from "@/components/ui/empty";
import { PageLoader } from "@/components/ui/loader";
import { roundRupiah } from "@/lib/formatters";
import {
  getCompanyProfile,
  listCustomers,
  listProjects,
} from "@/lib/data-service";
import {
  approveBakpByClient,
  createBakpReport,
  createBastHandover,
  createProjectDocument,
  createQuotation,
  createUatChecklist,
  deleteBakpReports,
  deleteBastHandovers,
  deleteClientPurchaseOrders,
  deleteProjectDocuments,
  deleteProjectMilestones,
  deleteProjectProgressEntries,
  deleteQuotations,
  deleteUatChecklists,
  getProjectWorkspace,
  recordPeriodProjectCompletion,
  saveProjectMilestonesSchedule,
  updateBakpReport,
  updateBastHandover,
  updateClientPurchaseOrder,
  updateProjectDocument,
  updateProjectMilestone,
  updateProjectProgressEntry,
  updateQuotation,
  updateUatChecklist,
  verifyClientPurchaseOrder,
  type ProjectWorkspaceBundle,
} from "@/lib/operations/client-projects";
import type {
  ClientPurchaseOrderRow,
  CompanyProfileRow,
  CustomerRow,
  HandoverReportRow,
  ProgressReportRow,
  ProjectDocumentRow,
  ProjectRow,
  QuotationRow,
  SpkCharterContent,
  UatChecklistRow,
  UatConclusion,
} from "@/types/database.types";
import { buildDefaultSpkContent } from "@/lib/spk-defaults";

// Sub-komponen modular & helpers yang diekstrak
import {
  downloadBakpPdf as downloadBakpPdfHelper,
  downloadBakpWord as downloadBakpWordHelper,
  downloadBastPdf as downloadBastPdfHelper,
  downloadBastWord as downloadBastWordHelper,
  downloadProjectDocPdf as downloadProjectDocPdfHelper,
  downloadProjectDocWord as downloadProjectDocWordHelper,
  downloadQuotationPdf as downloadQuotationPdfHelper,
  downloadQuotationWord as downloadQuotationWordHelper,
  downloadUatPdf as downloadUatPdfHelper,
  downloadUatWord as downloadUatWordHelper,
  type ProjectDocContext,
} from "./project-specs-builder";
import {
  exportMilestonesToCsv,
  exportMilestonesToExcel,
  exportMilestonesToPdf,
  type ProjectMilestonesExportData,
} from "./components/project-milestones-export";
import { MilestoneScheduleDialog } from "./dialogs/milestone-schedule-dialog";
import { RecordProgressDialog } from "./dialogs/record-progress-dialog";
import {
  CreateQuotationDialog,
  type QuotationDraftItem,
} from "./dialogs/create-quotation-dialog";
import { CreateProjectDocDialog } from "./dialogs/create-project-doc-dialog";
import { CreateBakpDialog } from "./dialogs/create-bakp-dialog";
import {
  CreateUatDialog,
  type UatScenarioItem,
} from "./dialogs/create-uat-dialog";
import { CreateBastDialog } from "./dialogs/create-bast-dialog";
import { ViewDetailDialog } from "./dialogs/view-detail-dialog";
import { EditRecordDialog } from "./dialogs/edit-record-dialog";
import { MilestonesTab } from "./tabs/milestones-tab";
import { QuotationPoTab } from "./tabs/quotation-po-tab";
import { SowSpkTab } from "./tabs/sow-spk-tab";
import { AcceptanceDocsTab } from "./tabs/acceptance-docs-tab";

export function ProjectDetailPage() {
  const { t } = useLanguage();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = React.useState<ProjectRow | null>(null);
  const [allProjects, setAllProjects] = React.useState<ProjectRow[]>([]);
  const [customer, setCustomer] = React.useState<CustomerRow | null>(null);
  const [company, setCompany] = React.useState<CompanyProfileRow | null>(null);
  const [bundle, setBundle] = React.useState<ProjectWorkspaceBundle | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<ProjectDetailTabId>("termin");
  const [editModes, setEditModes] = React.useState<Partial<Record<SectionKey, boolean>>>({});
  const [selectedIdsBySection, setSelectedIdsBySection] = React.useState<
    Partial<Record<SectionKey, string[]>>
  >({});
  const [viewModal, setViewModal] = React.useState<ViewDetailState | null>(null);
  const [editRecord, setEditRecord] = React.useState<EditableRecord | null>(null);
  const [savingEditRecord, setSavingEditRecord] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState<{
    section: SectionKey;
    ids: string[];
    label: string;
  } | null>(null);

  // 1. Dialog Jadwal Termin (BR-17 = 100%)
  const [msDialogOpen, setMsDialogOpen] = React.useState(false);
  const [draftMilestones, setDraftMilestones] = React.useState<DraftMilestone[]>([]);
  const [savingMs, setSavingMs] = React.useState(false);

  // 2. Dialog Progres Penyelesaian Periode (Progress Billing / Deferral / Akrual)
  const [progDialogOpen, setProgDialogOpen] = React.useState(false);
  const [progressDate, setProgressDate] = React.useState("2026-12-31");
  const [cumulativePct, setCumulativePct] = React.useState(66.67);
  const [useExactRevenueOverride, setUseExactRevenueOverride] = React.useState(false);
  const [exactRevenueOverride, setExactRevenueOverride] = React.useState(80_000_000);
  const [enableAutoReverse, setEnableAutoReverse] = React.useState(false);
  const [savingProg, setSavingProg] = React.useState(false);

  // 3. Dialog Quotation (Lampiran A.1)
  const [qtDialogOpen, setQtDialogOpen] = React.useState(false);
  const [qtDate, setQtDate] = React.useState("2026-11-01");
  const [qtValidUntil, setQtValidUntil] = React.useState("2026-11-15");
  const [qtNeedSummary, setQtNeedSummary] = React.useState("");
  const [qtWeeks, setQtWeeks] = React.useState(12);
  const [qtRevisions, setQtRevisions] = React.useState(2);
  const [qtItems, setQtItems] = React.useState<QuotationDraftItem[]>([
    {
      featureName: "Pengembangan Modul Inti & Integrasi",
      description: "Arsitektur web aplikasi sesuai ruang lingkup",
      costAmount: 120_000_000,
    },
  ]);
  const [savingQt, setSavingQt] = React.useState(false);

  // 4. Penolakan PO Klien
  const [rejectPoTarget, setRejectPoTarget] = React.useState<ClientPurchaseOrderRow | null>(null);

  // 5. Dialog SoW / SPK (Lampiran A.2 & A.3)
  const [docDialogOpen, setDocDialogOpen] = React.useState(false);
  const [docType, setDocType] = React.useState<"SOW" | "SPK">("SOW");
  const [docTitle, setDocTitle] = React.useState("");
  const [docSummary, setDocSummary] = React.useState("");
  const [docSpkDraft, setDocSpkDraft] = React.useState<SpkCharterContent | null>(null);
  const [docSigned, setDocSigned] = React.useState(true);
  const [savingDoc, setSavingDoc] = React.useState(false);

  // 6. Dialog BAKP (Lampiran A.4)
  const [bakpDialogOpen, setBakpDialogOpen] = React.useState(false);
  const [bakpDate, setBakpDate] = React.useState("2026-12-01");
  const [bakpMilestoneId, setBakpMilestoneId] = React.useState("");
  const [bakpCumPct, setBakpCumPct] = React.useState(62.5);
  const [bakpBillable, setBakpBillable] = React.useState(45_000_000);
  const [bakpNotes, setBakpNotes] = React.useState("");
  const [bakpApprovedNow, setBakpApprovedNow] = React.useState(true);
  const [savingBakp, setSavingBakp] = React.useState(false);

  // 7. Dialog UAT Checklist (Lampiran A.7)
  const [uatDialogOpen, setUatDialogOpen] = React.useState(false);
  const [uatDate, setUatDate] = React.useState("2027-01-25");
  const [uatStagingUrl, setUatStagingUrl] = React.useState("https://staging.altvira.id");
  const [uatClientTester, setUatClientTester] = React.useState("");
  const [uatCompanion, setUatCompanion] = React.useState("");
  const [uatConclusion, setUatConclusion] = React.useState<UatConclusion>("accepted");
  const [uatScenarios, setUatScenarios] = React.useState<UatScenarioItem[]>([
    {
      featureName: "Otentikasi & Hak Akses",
      testScenario: "Pengujian alur masuk dan otorisasi peran pengguna",
      result: "pass",
    },
    {
      featureName: "Transaksi Utama & Laporan",
      testScenario: "Validasi perhitungan dan unduh dokumen PDF",
      result: "pass",
    },
  ]);
  const [savingUat, setSavingUat] = React.useState(false);

  // 8. Dialog BAST (wajib UAT diterima)
  const [bastDialogOpen, setBastDialogOpen] = React.useState(false);
  const [bastDate, setBastDate] = React.useState("2027-01-30");
  const [bastUatId, setBastUatId] = React.useState("");
  const [bastWarrantyDays, setBastWarrantyDays] = React.useState(30);
  const [bastSigned, setBastSigned] = React.useState(true);
  const [savingBast, setSavingBast] = React.useState(false);

  const reload = React.useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [prjRes, csts, comp, ws] = await Promise.all([
        listProjects(),
        listCustomers(),
        getCompanyProfile(),
        getProjectWorkspace(projectId),
      ]);
      const found = prjRes.projects.find((p) => p.id === projectId) ?? null;
      setAllProjects(prjRes.projects);
      setProject(found);
      setCustomer(
        found?.customer_id
          ? (csts.find((c) => c.id === found.customer_id) ?? null)
          : null,
      );
      setCompany(comp);
      setBundle(ws);

      setBakpMilestoneId((prev) => {
        const stillValid = ws.milestones.find((m) => m.id === prev);
        if (stillValid) return stillValid.id;
        return ws.milestones[0]?.id ?? "";
      });
      const passedUat = ws.uatList.find(
        (u) =>
          u.conclusion === "accepted" || u.conclusion === "accepted_with_notes",
      );
      setBastUatId((prev) => {
        const stillValid = ws.uatList.find(
          (u) =>
            u.id === prev &&
            (u.conclusion === "accepted" ||
              u.conclusion === "accepted_with_notes"),
        );
        if (stillValid) return stillValid.id;
        return passedUat?.id ?? "";
      });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal memuat ruang kerja dokumen proyek.",
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  function openMilestonesEditor() {
    if (!project || !bundle) return;
    if (bundle.milestones.length > 0) {
      setDraftMilestones(
        bundle.milestones.map((m) => ({
          name: m.name,
          isDownPayment: m.is_down_payment,
          isFinalSettlement: m.is_final_settlement,
          percentage: m.percentage,
          amount: m.amount,
          achievementCriteria: m.achievement_criteria ?? "",
        })),
      );
    } else {
      const val = project.contract_value;
      setDraftMilestones([
        {
          name: "Termin 1 (Uang Muka / DP)",
          isDownPayment: true,
          isFinalSettlement: false,
          percentage: 25,
          amount: roundRupiah(val * 0.25),
          achievementCriteria: "Penandatanganan SPK & Verifikasi PO Klien",
        },
        {
          name: "Termin 2 (Progres Pengembangan)",
          isDownPayment: false,
          isFinalSettlement: false,
          percentage: 37.5,
          amount: roundRupiah(val * 0.375),
          achievementCriteria: "Persetujuan BAKP Modul Inti",
        },
        {
          name: "Termin 3 (Pelunasan Akhir)",
          isDownPayment: false,
          isFinalSettlement: true,
          percentage: 37.5,
          amount: val - roundRupiah(val * 0.25) - roundRupiah(val * 0.375),
          achievementCriteria: "UAT Diterima & BAST Ditandatangani",
        },
      ]);
    }
    setMsDialogOpen(true);
  }

  async function handleSaveMilestones(e: React.FormEvent) {
    e.preventDefault();
    if (!project) return;
    setSavingMs(true);
    try {
      await saveProjectMilestonesSchedule(project.id, draftMilestones);
      toast.success("Jadwal termin 100% berhasil disimpan.");
      setMsDialogOpen(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan termin.",
      );
    } finally {
      setSavingMs(false);
    }
  }

  async function handleRecordProgress(e: React.FormEvent) {
    e.preventDefault();
    if (!project) return;
    setSavingProg(true);
    try {
      await recordPeriodProjectCompletion({
        projectId: project.id,
        progressDate,
        cumulativePct,
        cumulativeRevenueOverride: useExactRevenueOverride
          ? roundRupiah(exactRevenueOverride)
          : null,
        enableAutoReverse:
          project.revenue_method === "two_term_accrual"
            ? enableAutoReverse
            : false,
      });
      toast.success(
        "Progres penyelesaian proyek dan jurnal pengakuan pendapatan berhasil diposting.",
      );
      setProgDialogOpen(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal mencatat progres penyelesaian.",
      );
    } finally {
      setSavingProg(false);
    }
  }

  async function handleCreateQuotation(e: React.FormEvent) {
    e.preventDefault();
    if (!project || !project.customer_id) {
      toast.error("Pastikan pelanggan telah dipilih pada Master Proyek.");
      return;
    }
    setSavingQt(true);
    try {
      await createQuotation({
        quotationDate: qtDate,
        validUntil: qtValidUntil,
        customerId: project.customer_id,
        projectId: project.id,
        projectTitle: project.name,
        clientNeedSummary: qtNeedSummary,
        estimatedWeeks: qtWeeks,
        revisionLimit: qtRevisions,
        items: qtItems,
      });
      toast.success("Quotation penawaran harga berhasil diterbitkan.");
      setQtDialogOpen(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menerbitkan Quotation.",
      );
    } finally {
      setSavingQt(false);
    }
  }

  async function handleCreateDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!project) return;
    setSavingDoc(true);
    try {
      await createProjectDocument({
        projectId: project.id,
        docType,
        title: docTitle || `${docType}: ${project.name}`,
        summary: docSummary,
        isSigned: docSigned,
        contentJson:
          docType === "SPK" && docSpkDraft
            ? (docSpkDraft as unknown as Record<string, unknown>)
            : undefined,
      });
      toast.success(`Dokumen ${docType} berhasil direkam.`);
      setDocDialogOpen(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan dokumen proyek.",
      );
    } finally {
      setSavingDoc(false);
    }
  }

  function openBakpDialog() {
    if (!bundle) return;
    const targetMs =
      bundle.milestones.find((m) => m.id === bakpMilestoneId) ??
      bundle.milestones[0];
    if (targetMs) {
      setBakpMilestoneId(targetMs.id);
      setBakpBillable(targetMs.amount);
    } else {
      setBakpMilestoneId("");
      setBakpBillable(0);
    }
    setBakpDialogOpen(true);
  }

  async function handleCreateBakp(e: React.FormEvent) {
    e.preventDefault();
    if (!project) return;
    const validMilestone = bundle?.milestones.find(
      (m) => m.id === bakpMilestoneId,
    );
    if (!validMilestone) {
      toast.error(
        "Termin terkait belum tersedia atau tidak valid. Susun jadwal termin pada tab Termin & Progres terlebih dahulu.",
      );
      return;
    }
    setSavingBakp(true);
    try {
      await createBakpReport({
        bakpDate,
        projectId: project.id,
        milestoneId: validMilestone.id,
        cumulativePercentage: bakpCumPct,
        billableAmount: roundRupiah(bakpBillable),
        findingsNotes: bakpNotes,
        approveImmediately: bakpApprovedNow,
      });
      toast.success("Berita Acara Kemajuan Pekerjaan (BAKP) berhasil dibuat.");
      setBakpDialogOpen(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat BAKP.");
    } finally {
      setSavingBakp(false);
    }
  }

  async function handleCreateUat(e: React.FormEvent) {
    e.preventDefault();
    if (!project) return;
    setSavingUat(true);
    try {
      await createUatChecklist({
        testDate: uatDate,
        projectId: project.id,
        stagingUrl: uatStagingUrl,
        clientTesterName: uatClientTester,
        altviraCompanionName: uatCompanion,
        conclusion: uatConclusion,
        scenarios: uatScenarios,
      });
      toast.success("Checklist UAT berhasil disimpan.");
      setUatDialogOpen(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan UAT.");
    } finally {
      setSavingUat(false);
    }
  }

  async function handleCreateBast(e: React.FormEvent) {
    e.preventDefault();
    if (!project || !bastUatId) return;
    setSavingBast(true);
    try {
      await createBastHandover({
        bastDate,
        projectId: project.id,
        uatId: bastUatId,
        warrantyDays: bastWarrantyDays,
        isSigned: bastSigned,
      });
      toast.success("Berita Acara Serah Terima (BAST) berhasil diterbitkan.");
      setBastDialogOpen(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menerbitkan BAST.",
      );
    } finally {
      setSavingBast(false);
    }
  }

  // Wrapper fungsi download dokumen via project-specs-builder
  const docCtx: ProjectDocContext = { project, customer, company, bundle };

  const downloadQuotationPdf = async (q: QuotationRow) => {
    await downloadQuotationPdfHelper(q, docCtx);
  };
  const downloadQuotationWord = async (q: QuotationRow) => {
    await downloadQuotationWordHelper(q, docCtx);
  };
  const downloadProjectDocPdf = async (doc: ProjectDocumentRow) => {
    await downloadProjectDocPdfHelper(doc, docCtx);
  };
  const downloadProjectDocWord = async (doc: ProjectDocumentRow) => {
    await downloadProjectDocWordHelper(doc, docCtx);
  };
  const downloadBakpPdf = async (bakp: ProgressReportRow) => {
    await downloadBakpPdfHelper(bakp, docCtx);
  };
  const downloadBakpWord = async (bakp: ProgressReportRow) => {
    await downloadBakpWordHelper(bakp, docCtx);
  };
  const downloadUatPdf = async (uat: UatChecklistRow) => {
    await downloadUatPdfHelper(uat, docCtx);
  };
  const downloadUatWord = async (uat: UatChecklistRow) => {
    await downloadUatWordHelper(uat, docCtx);
  };
  const downloadBastPdf = async (bast: HandoverReportRow) => {
    await downloadBastPdfHelper(bast, docCtx);
  };
  const downloadBastWord = async (bast: HandoverReportRow) => {
    await downloadBastWordHelper(bast, docCtx);
  };

  // Wrapper fungsi ekspor milestones via project-milestones-export
  const milestonesExportData: ProjectMilestonesExportData = {
    project,
    customer,
    company,
    bundle,
  };

  const handleExportMilestonesExcel = async () => {
    await exportMilestonesToExcel(milestonesExportData);
  };
  const handleExportMilestonesPdf = async () => {
    await exportMilestonesToPdf(milestonesExportData);
  };
  const handleExportMilestonesCsv = async () => {
    await exportMilestonesToCsv(milestonesExportData);
  };

  const isSectionEditing = (key: SectionKey) => Boolean(editModes[key]);
  const getSelectedIds = (key: SectionKey) => selectedIdsBySection[key] ?? [];

  function setSectionEditing(key: SectionKey, enabled: boolean) {
    setEditModes((prev) => ({ ...prev, [key]: enabled }));
    if (!enabled) {
      setSelectedIdsBySection((prev) => ({ ...prev, [key]: [] }));
    }
  }

  function toggleRowSelection(
    key: SectionKey,
    id: string,
    checked: boolean | "indeterminate",
  ) {
    setSelectedIdsBySection((prev) => {
      const current = prev[key] ?? [];
      const isSelected = checked === true;
      const next = isSelected
        ? current.includes(id)
          ? current
          : [...current, id]
        : current.filter((x) => x !== id);
      return { ...prev, [key]: next };
    });
  }

  function toggleSelectAllRows(
    key: SectionKey,
    allIds: string[],
    checked: boolean | "indeterminate",
  ) {
    setSelectedIdsBySection((prev) => ({
      ...prev,
      [key]: checked === true ? [...allIds] : [],
    }));
  }

  async function handleSaveEditRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!editRecord) return;
    setSavingEditRecord(true);
    try {
      if (editRecord.section === "milestones") {
        await updateProjectMilestone(editRecord.item.id, {
          name: editRecord.item.name,
          percentage: editRecord.item.percentage,
          amount: editRecord.item.amount,
          achievementCriteria: editRecord.item.achievement_criteria ?? "",
          status: editRecord.item.status,
        });
        toast.success("Termin penagihan diperbarui.");
      } else if (editRecord.section === "progress") {
        await updateProjectProgressEntry(editRecord.item.id, {
          progressDate: editRecord.item.progress_date,
          cumulativePercentage: editRecord.item.cumulative_percentage,
          cumulativeRecognizedRevenue: editRecord.item.cumulative_recognized_revenue,
          periodRecognizedRevenue: editRecord.item.period_recognized_revenue,
        });
        toast.success("Catatan progres penyelesaian diperbarui.");
      } else if (editRecord.section === "quotations") {
        await updateQuotation(editRecord.item.id, {
          quotationDate: editRecord.item.quotation_date,
          validUntil: editRecord.item.valid_until,
          projectTitle: editRecord.item.project_title,
          clientNeedSummary: editRecord.item.client_need_summary ?? "",
          estimatedWeeks: editRecord.item.estimated_weeks,
          revisionLimit: editRecord.item.revision_limit,
          totalAmount: editRecord.item.total_amount,
          status: editRecord.item.status,
        });
        toast.success(`Quotation ${editRecord.item.quotation_number} diperbarui.`);
      } else if (editRecord.section === "clientPos") {
        await updateClientPurchaseOrder(editRecord.item.id, {
          clientName: editRecord.item.client_name,
          clientCompany: editRecord.item.client_company ?? "",
          clientEmail: editRecord.item.client_email,
          poValue: editRecord.item.po_value,
          status: editRecord.item.status,
        });
        toast.success(`PO Klien ${editRecord.item.po_number} diperbarui.`);
      } else if (editRecord.section === "documents") {
        const contentObj = editRecord.item.content_json as Record<string, unknown> | null;
        await updateProjectDocument(editRecord.item.id, {
          docType: editRecord.item.doc_type === "SPK" ? "SPK" : "SOW",
          title: editRecord.item.title,
          summary: String(contentObj?.summary ?? ""),
          isSigned: editRecord.item.is_signed,
          contentJson: contentObj ?? undefined,
        });
        toast.success(`Dokumen ${editRecord.item.doc_number} diperbarui.`);
      } else if (editRecord.section === "bakp") {
        await updateBakpReport(editRecord.item.id, {
          bakpDate: editRecord.item.bakp_date,
          cumulativePercentage: editRecord.item.cumulative_percentage,
          billableAmount: editRecord.item.billable_amount,
          findingsNotes: editRecord.item.findings_notes ?? "",
          status: editRecord.item.status,
        });
        toast.success(`BAKP ${editRecord.item.bakp_number} diperbarui.`);
      } else if (editRecord.section === "uat") {
        await updateUatChecklist(editRecord.item.id, {
          testDate: editRecord.item.test_date,
          stagingUrl: editRecord.item.staging_url ?? "",
          clientTesterName: editRecord.item.client_tester_name,
          altviraCompanionName: editRecord.item.altvira_companion_name,
          conclusion: editRecord.item.conclusion,
        });
        toast.success(`Checklist UAT ${editRecord.item.uat_number} diperbarui.`);
      } else if (editRecord.section === "bast") {
        await updateBastHandover(editRecord.item.id, {
          bastDate: editRecord.item.bast_date,
          warrantyDays: editRecord.item.warranty_days,
          status: editRecord.item.status,
        });
        toast.success(`BAST ${editRecord.item.bast_number} diperbarui.`);
      }
      setEditRecord(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan perubahan.");
    } finally {
      setSavingEditRecord(false);
    }
  }

  async function executeDeleteRecords() {
    if (!deleteConfirm || !project) return;
    const { section, ids } = deleteConfirm;
    if (section === "milestones") {
      await deleteProjectMilestones(project.id, ids);
    } else if (section === "progress") {
      await deleteProjectProgressEntries(ids);
    } else if (section === "quotations") {
      await deleteQuotations(ids);
    } else if (section === "clientPos") {
      await deleteClientPurchaseOrders(ids);
    } else if (section === "documents") {
      await deleteProjectDocuments(ids);
    } else if (section === "bakp") {
      await deleteBakpReports(ids);
    } else if (section === "uat") {
      await deleteUatChecklists(ids);
    } else if (section === "bast") {
      await deleteBastHandovers(ids);
    }
    toast.success(`${ids.length} data berhasil dihapus.`);
    setSelectedIdsBySection((prev) => ({ ...prev, [section]: [] }));
    setEditModes((prev) => ({ ...prev, [section]: false }));
    await reload();
  }

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

  const maxProgressPct = bundle.progressEntries.reduce(
    (m, p) => Math.max(m, p.cumulative_percentage),
    0,
  );

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

      {/* 1. Modal Dialog Susun Jadwal Termin */}
      <MilestoneScheduleDialog
        open={msDialogOpen}
        onOpenChange={setMsDialogOpen}
        contractValue={project.contract_value}
        draftMilestones={draftMilestones}
        setDraftMilestones={setDraftMilestones}
        saving={savingMs}
        onSave={handleSaveMilestones}
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
        onSave={handleRecordProgress}
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
        onSave={handleCreateQuotation}
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
        onSave={handleCreateDoc}
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
        onSave={handleCreateBakp}
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
        onSave={handleCreateUat}
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
        onSave={handleCreateBast}
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
          await verifyClientPurchaseOrder({
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
        onSave={handleSaveEditRecord}
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
        onConfirm={executeDeleteRecords}
      />
    </div>
  );
}
