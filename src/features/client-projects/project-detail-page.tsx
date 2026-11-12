import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CalendarCheck2Icon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  DownloadIcon,
  FileCheck2Icon,
  FileSignatureIcon,
  FileTextIcon,
  FolderKanbanIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
  TrendingUpIcon,
  WalletIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { DocumentDownloadMenu } from "@/components/shared/document-download-menu";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { SpkCharterFields } from "@/components/shared/spk-charter-fields";
import { StatusBadge, type SemanticTone } from "@/components/shared/status-badge";
import {
  BAKP_STATUS_META,
  BAST_STATUS_META,
  CPO_STATUS_META,
  MILESTONE_STATUS_META,
  QUOTATION_STATUS_META,
  RowEditActionButtons,
  SectionEditControls,
  UAT_CONCLUSION_META,
  type DraftMilestone,
  type EditableRecord,
  type SectionKey,
  type ViewDetailState,
} from "@/features/client-projects/components/project-detail-shared";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, Spinner } from "@/components/ui/empty";
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
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  getCompanyProfile,
  listCustomers,
  listProjects,
} from "@/lib/data-service";
import {
  formatDateID,
  formatRupiah,
  roundRupiah,
} from "@/lib/formatters";
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
  type ProjectWorkspaceBundle,
  recordExportLog,
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
} from "@/lib/operations-service";
import {
  buildClientPoPdfSpec,
  downloadPdfBytes,
  generateDocumentPdf,
  generateSpkProjectCharterPdf,
  type PdfDocumentSpec,
} from "@/lib/pdf-generator";
import {
  buildDefaultSpkContent,
  extractSpkCharterContent,
} from "@/lib/spk-defaults";
import {
  downloadWordBlob,
  generateDocumentWord,
  generateSpkProjectCharterWord,
} from "@/lib/word-generator";
import type {
  BakpStatus,
  BastStatus,
  ClientPoStatus,
  ClientPurchaseOrderRow,
  CompanyProfileRow,
  CustomerRow,
  HandoverReportRow,
  MilestoneStatus,
  ProgressReportRow,
  ProjectDocumentRow,
  ProjectRow,
  QuotationRow,
  QuotationStatus,
  SpkCharterContent,
  UatChecklistRow,
  UatConclusion,
} from "@/types/database.types";

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = React.useState<ProjectRow | null>(null);
  const [allProjects, setAllProjects] = React.useState<ProjectRow[]>([]);
  const [customer, setCustomer] = React.useState<CustomerRow | null>(null);
  const [company, setCompany] = React.useState<CompanyProfileRow | null>(null);
  const [bundle, setBundle] = React.useState<ProjectWorkspaceBundle | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<
    "termin" | "quotation_po" | "sow_spk" | "bakp_uat_bast"
  >("termin");
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
  const [draftMilestones, setDraftMilestones] = React.useState<
    DraftMilestone[]
  >([]);
  const [savingMs, setSavingMs] = React.useState(false);

  // 2. Dialog Progres Penyelesaian Periode (Progress Billing / Deferral / Akrual)
  const [progDialogOpen, setProgDialogOpen] = React.useState(false);
  const [progressDate, setProgressDate] = React.useState("2026-12-31");
  const [cumulativePct, setCumulativePct] = React.useState(66.67);
  const [useExactRevenueOverride, setUseExactRevenueOverride] =
    React.useState(false);
  const [exactRevenueOverride, setExactRevenueOverride] =
    React.useState(80_000_000);
  const [enableAutoReverse, setEnableAutoReverse] = React.useState(false);
  const [savingProg, setSavingProg] = React.useState(false);

  // 3. Dialog Quotation (Lampiran A.1)
  const [qtDialogOpen, setQtDialogOpen] = React.useState(false);
  const [qtDate, setQtDate] = React.useState("2026-11-01");
  const [qtValidUntil, setQtValidUntil] = React.useState("2026-11-15");
  const [qtNeedSummary, setQtNeedSummary] = React.useState("");
  const [qtWeeks, setQtWeeks] = React.useState(12);
  const [qtRevisions, setQtRevisions] = React.useState(2);
  const [qtItems, setQtItems] = React.useState<
    Array<{ featureName: string; description: string; costAmount: number }>
  >([
    {
      featureName: "Pengembangan Modul Inti & Integrasi",
      description: "Arsitektur web aplikasi sesuai ruang lingkup",
      costAmount: 120_000_000,
    },
  ]);
  const [savingQt, setSavingQt] = React.useState(false);

  // 4. Penolakan PO Klien
  const [rejectPoTarget, setRejectPoTarget] =
    React.useState<ClientPurchaseOrderRow | null>(null);

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
  const [uatStagingUrl, setUatStagingUrl] = React.useState(
    "https://staging.altvira.id",
  );
  const [uatClientTester, setUatClientTester] = React.useState("");
  const [uatCompanion, setUatCompanion] = React.useState("");
  const [uatConclusion, setUatConclusion] =
    React.useState<UatConclusion>("accepted");
  const [uatScenarios, setUatScenarios] = React.useState<
    Array<{ featureName: string; testScenario: string; result: "pass" | "fail" }>
  >([
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

  // Builder & Generator PDF / Word Lampiran A.1, A.2, A.3, A.4, A.7, A.8
  function makeQuotationSpec(qt: QuotationRow): PdfDocumentSpec | null {
    if (!company || !bundle) return null;
    const qItems = bundle.quotationItems.filter(
      (i) => i.quotation_id === qt.id,
    );
    return {
      docTitle: "SURAT PENAWARAN HARGA (QUOTATION)",
      docSubtitle: `Berlaku s.d. ${formatDateID(qt.valid_until)}`,
      docNumber: qt.quotation_number,
      docDate: qt.quotation_date,
      company,
      clientLogoUrl: customer?.logo_storage_path ?? null,
      recipientTitle: "Kepada Yth.:",
      recipientLines: [
        customer?.company_name ?? customer?.name ?? "Klien Mitra",
        ...(customer?.contact_person ? [customer.contact_person] : []),
        customer?.address ?? "-",
      ],
      metaRows: [
        { label: "Judul Proyek", value: qt.project_title },
        { label: "Estimasi Durasi", value: `${qt.estimated_weeks} Minggu` },
        { label: "Batas Revisi Desain/Fitur", value: `${qt.revision_limit}x Revisi` },
      ],
      paragraphsBefore: qt.client_need_summary
        ? [`Ringkasan Kebutuhan: ${qt.client_need_summary}`]
        : undefined,
      tableColumns: [
        { header: "No", widthRatio: 0.08, align: "center" },
        { header: "Modul / Fitur Pekerjaan", widthRatio: 0.62 },
        { header: "Biaya (IDR)", widthRatio: 0.3, align: "right" },
      ],
      tableRows: qItems.map((it, idx) => [
        String(idx + 1),
        `${it.feature_name}${it.description ? ` - ${it.description}` : ""}`,
        formatRupiah(it.cost_amount),
      ]),
      summaryRows: [
        { label: "TOTAL PENAWARAN", value: formatRupiah(qt.total_amount) },
      ],
      terbilangAmount: qt.total_amount,
      notes: [
        company.pkp_enabled
          ? `Harga belum termasuk PPN ${company.ppn_rate}%.`
          : "Harga tidak dikenakan PPN karena Altvira Technology belum dikukuhkan sebagai PKP.",
        "Penawaran ini sah sebagai referensi penerbitan Purchase Order (PO) Klien.",
      ],
      rightSignatureName: `${company.signer_name} - ${company.signer_title}`,
      rightSignatureImageUrl: company.signer_signature_path ?? null,
    };
  }

  async function downloadQuotationPdf(qt: QuotationRow) {
    const spec = makeQuotationSpec(qt);
    if (!spec) return;
    const bytes = await generateDocumentPdf(spec);
    downloadPdfBytes(bytes, `${qt.quotation_number.replace(/\//g, "_")}.pdf`);
    await recordExportLog("QUOTATION", "PDF");
  }

  async function downloadQuotationWord(qt: QuotationRow) {
    const spec = makeQuotationSpec(qt);
    if (!spec) return;
    const blob = await generateDocumentWord(spec);
    downloadWordBlob(blob, `${qt.quotation_number.replace(/\//g, "_")}.docx`);
    await recordExportLog("QUOTATION", "PDF");
  }

  function makeSowDocSpec(doc: ProjectDocumentRow): PdfDocumentSpec | null {
    if (!company || !project) return null;
    const summaryText =
      typeof doc.content_json === "object" &&
      doc.content_json !== null &&
      "summary" in doc.content_json
        ? String((doc.content_json as Record<string, unknown>).summary ?? "")
        : "";
    return {
      docTitle:
        doc.doc_type === "SOW"
          ? "STATEMENT OF WORK (RUANG LINGKUP PEKERJAAN)"
          : "SURAT PERINTAH KERJA / PERJANJIAN JASA (SPK)",
      docNumber: doc.doc_number,
      docDate: doc.created_at.slice(0, 10),
      company,
      clientLogoUrl: customer?.logo_storage_path ?? null,
      recipientTitle: "Pihak Klien (Pemberi Kerja):",
      recipientLines: [
        customer?.company_name ?? customer?.name ?? "Klien",
        ...(customer?.contact_person ? [customer.contact_person] : []),
        customer?.address ?? "-",
      ],
      metaRows: [
        { label: "Kode & Nama Proyek", value: `${project.code} - ${project.name}` },
        { label: "Nilai Kontrak Disepakati", value: formatRupiah(project.contract_value) },
        {
          label: "Status Tanda Tangan",
          value: doc.is_signed ? "Telah Ditandatangani Kedua Pihak" : "Draf Review",
        },
      ],
      paragraphsBefore: [
        summaryText ||
          `Dokumen ${doc.doc_type} ini mengatur ruang lingkup teknis, kriteria penerimaan, hak kekayaan intelektual (source code beralih setelah pelunasan 100%), serta jadwal termin proyek ${project.name}.`,
      ],
      leftSignatureLabel: "Disetujui Pihak Klien,",
      leftSignatureName: customer?.contact_person ?? customer?.name ?? "Perwakilan Klien",
      leftSignatureImageUrl: customer?.signature_storage_path ?? null,
      rightSignatureLabel: `Pelaksana, ${company.company_name}`,
      rightSignatureName: `${company.signer_name} - ${company.signer_title}`,
      rightSignatureImageUrl: company.signer_signature_path ?? null,
    };
  }

  async function downloadProjectDocPdf(doc: ProjectDocumentRow) {
    if (!company || !project || !bundle) return;
    if (doc.doc_type === "SPK") {
      const spkContent = extractSpkCharterContent(
        doc.content_json as Record<string, unknown> | null,
        { project, customer, company, milestones: bundle.milestones },
      );
      const bytes = await generateSpkProjectCharterPdf({
        docNumber: doc.doc_number,
        docDate: doc.created_at.slice(0, 10),
        docTitle: doc.title,
        company,
        content: spkContent,
      });
      downloadPdfBytes(bytes, `${doc.doc_number.replace(/\//g, "_")}.pdf`);
      return;
    }
    const spec = makeSowDocSpec(doc);
    if (!spec) return;
    const bytes = await generateDocumentPdf(spec);
    downloadPdfBytes(bytes, `${doc.doc_number.replace(/\//g, "_")}.pdf`);
  }

  async function downloadProjectDocWord(doc: ProjectDocumentRow) {
    if (!company || !project || !bundle) return;
    if (doc.doc_type === "SPK") {
      const spkContent = extractSpkCharterContent(
        doc.content_json as Record<string, unknown> | null,
        { project, customer, company, milestones: bundle.milestones },
      );
      const blob = await generateSpkProjectCharterWord({
        docNumber: doc.doc_number,
        docDate: doc.created_at.slice(0, 10),
        docTitle: doc.title,
        company,
        content: spkContent,
      });
      downloadWordBlob(blob, `${doc.doc_number.replace(/\//g, "_")}.docx`);
      return;
    }
    const spec = makeSowDocSpec(doc);
    if (!spec) return;
    const blob = await generateDocumentWord(spec);
    downloadWordBlob(blob, `${doc.doc_number.replace(/\//g, "_")}.docx`);
  }

  function makeBakpSpec(bakp: ProgressReportRow): PdfDocumentSpec | null {
    if (!company || !project || !bundle) return null;
    const ms = bundle.milestones.find((m) => m.id === bakp.milestone_id);
    return {
      docTitle: "BERITA ACARA KEMAJUAN PEKERJAAN (BAKP)",
      docNumber: bakp.bakp_number,
      docDate: bakp.bakp_date,
      company,
      clientLogoUrl: customer?.logo_storage_path ?? null,
      metaRows: [
        { label: "Proyek", value: `${project.code} - ${project.name}` },
        { label: "Termin Terkait", value: ms?.name ?? "-" },
        { label: "Capaian Kumulatif", value: `${bakp.cumulative_percentage}%` },
        { label: "Nilai Tagihan Termin", value: formatRupiah(bakp.billable_amount) },
      ],
      paragraphsBefore: [
        bakp.findings_notes ||
          "Pekerjaan pada tahapan ini telah diperiksa bersama dan dinyatakan memenuhi kriteria pencapaian termin untuk dasar penagihan invoice.",
      ],
      leftSignatureLabel: "Disetujui Klien,",
      leftSignatureName: customer?.contact_person ?? customer?.name ?? "Klien",
      leftSignatureImageUrl: customer?.signature_storage_path ?? null,
      rightSignatureName: `${company.signer_name} - ${company.signer_title}`,
      rightSignatureImageUrl: company.signer_signature_path ?? null,
    };
  }

  async function downloadBakpPdf(bakp: ProgressReportRow) {
    const spec = makeBakpSpec(bakp);
    if (!spec) return;
    const bytes = await generateDocumentPdf(spec);
    downloadPdfBytes(bytes, `${bakp.bakp_number.replace(/\//g, "_")}.pdf`);
  }

  async function downloadBakpWord(bakp: ProgressReportRow) {
    const spec = makeBakpSpec(bakp);
    if (!spec) return;
    const blob = await generateDocumentWord(spec);
    downloadWordBlob(blob, `${bakp.bakp_number.replace(/\//g, "_")}.docx`);
  }

  function makeUatSpec(uat: UatChecklistRow): PdfDocumentSpec | null {
    if (!company || !project || !bundle) return null;
    const items = bundle.uatItems.filter((i) => i.uat_id === uat.id);
    return {
      docTitle: "USER ACCEPTANCE TEST (UAT) CHECKLIST",
      docNumber: uat.uat_number,
      docDate: uat.test_date,
      company,
      clientLogoUrl: customer?.logo_storage_path ?? null,
      metaRows: [
        { label: "Proyek", value: `${project.code} - ${project.name}` },
        { label: "Lingkungan Uji", value: uat.staging_url ?? "-" },
        { label: "Penguji Klien", value: uat.client_tester_name },
        { label: "Pendamping Altvira", value: uat.altvira_companion_name },
        { label: "Kesimpulan UAT", value: uat.conclusion.toUpperCase() },
      ],
      tableColumns: [
        { header: "No", widthRatio: 0.08, align: "center" },
        { header: "Fitur", widthRatio: 0.32 },
        { header: "Skenario Uji", widthRatio: 0.44 },
        { header: "Hasil", widthRatio: 0.16, align: "center" },
      ],
      tableRows: items.map((it) => [
        String(it.line_no),
        it.feature_name,
        it.test_scenario,
        it.result === "pass" ? "SESUAI" : "REVISI",
      ]),
      leftSignatureLabel: "Penguji Klien,",
      leftSignatureName: uat.client_tester_name,
      leftSignatureImageUrl: customer?.signature_storage_path ?? null,
      rightSignatureName: uat.altvira_companion_name,
      rightSignatureImageUrl: company.signer_signature_path ?? null,
    };
  }

  async function downloadUatPdf(uat: UatChecklistRow) {
    const spec = makeUatSpec(uat);
    if (!spec) return;
    const bytes = await generateDocumentPdf(spec);
    downloadPdfBytes(bytes, `${uat.uat_number.replace(/\//g, "_")}.pdf`);
  }

  async function downloadUatWord(uat: UatChecklistRow) {
    const spec = makeUatSpec(uat);
    if (!spec) return;
    const blob = await generateDocumentWord(spec);
    downloadWordBlob(blob, `${uat.uat_number.replace(/\//g, "_")}.docx`);
  }

  function makeBastSpec(bast: HandoverReportRow): PdfDocumentSpec | null {
    if (!company || !project) return null;
    return {
      docTitle: "BERITA ACARA SERAH TERIMA PEKERJAAN (BAST)",
      docNumber: bast.bast_number,
      docDate: bast.bast_date,
      company,
      clientLogoUrl: customer?.logo_storage_path ?? null,
      metaRows: [
        { label: "Proyek", value: `${project.code} - ${project.name}` },
        { label: "Masa Garansi Bug-Fix", value: `${bast.warranty_days} Hari Kalender` },
        {
          label: "Status Dokumen",
          value: bast.status === "signed" ? "Ditandatangani Sah" : "Draf",
        },
      ],
      paragraphsBefore: [
        `Pada tanggal ${formatDateID(bast.bast_date)}, kedua belah pihak menyatakan bahwa seluruh ruang lingkup pengembangan perangkat lunak pada proyek ${project.name} telah selesai 100%, lulus pengujian UAT, dan diserahterimakan dengan baik.`,
      ],
      leftSignatureLabel: "Penerima Hasil Pekerjaan (Klien),",
      leftSignatureName: customer?.contact_person ?? customer?.name ?? "Klien",
      leftSignatureImageUrl: customer?.signature_storage_path ?? null,
      rightSignatureName: `${company.signer_name} - ${company.signer_title}`,
      rightSignatureImageUrl: company.signer_signature_path ?? null,
    };
  }

  async function downloadBastPdf(bast: HandoverReportRow) {
    const spec = makeBastSpec(bast);
    if (!spec) return;
    const bytes = await generateDocumentPdf(spec);
    downloadPdfBytes(bytes, `${bast.bast_number.replace(/\//g, "_")}.pdf`);
  }

  async function downloadBastWord(bast: HandoverReportRow) {
    const spec = makeBastSpec(bast);
    if (!spec) return;
    const blob = await generateDocumentWord(spec);
    downloadWordBlob(blob, `${bast.bast_number.replace(/\//g, "_")}.docx`);
  }

  const isSectionEditing = (key: SectionKey) => Boolean(editModes[key]);
  const getSelectedIds = (key: SectionKey) => selectedIdsBySection[key] ?? [];

  function setSectionEditing(key: SectionKey, enabled: boolean) {
    setEditModes((prev) => ({ ...prev, [key]: enabled }));
    if (!enabled) {
      setSelectedIdsBySection((prev) => ({ ...prev, [key]: [] }));
    }
  }

  function toggleRowSelection(key: SectionKey, id: string, checked: boolean) {
    setSelectedIdsBySection((prev) => {
      const current = prev[key] ?? [];
      const next = checked
        ? current.includes(id)
          ? current
          : [...current, id]
        : current.filter((item) => item !== id);
      return { ...prev, [key]: next };
    });
  }

  function toggleSelectAllRows(key: SectionKey, allIds: string[], checked: boolean) {
    setSelectedIdsBySection((prev) => ({
      ...prev,
      [key]: checked ? allIds : [],
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
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Spinner />
        <span>Memuat ruang kerja proyek klien...</span>
      </div>
    );
  }

  if (!project || !bundle) {
    return (
      <EmptyState
        title="Proyek tidak ditemukan"
        description="Kembali ke daftar Master Proyek untuk memilih proyek yang valid."
      />
    );
  }

  const maxProgressPct = bundle.progressEntries.reduce(
    (m, p) => Math.max(m, p.cumulative_percentage),
    0,
  );
  const sumDraftMsPct = Number(
    draftMilestones.reduce((s, m) => s + m.percentage, 0).toFixed(2),
  );

  const totalDocsCount =
    bundle.quotations.length +
    bundle.clientPos.length +
    bundle.documents.length +
    bundle.bakpList.length +
    bundle.uatList.length +
    bundle.bastList.length;
  const verifiedClientPosCount = bundle.clientPos.filter(
    (c) => c.status === "verified",
  ).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman: Judul Pendek + 1 Kalimat Deskripsi + Dropdown Shortcut Kode Proyek Sejajar Bawah */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Dokumen &amp; Termin Proyek
            </h1>
            {project.is_eliminated ? (
              <StatusBadge
                tone="success"
                label="WIP & Penagihan Tereliminasi 100%"
              />
            ) : null}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            Kelola jadwal termin, progres penyelesaian, dan dokumen resmi proyek.
          </p>
        </div>

        <div className="shrink-0">
          <Select
            value={project.id}
            onValueChange={(nextId) => {
              if (nextId && nextId !== project.id) {
                navigate(`/admin/proyek/${nextId}`);
              }
            }}
          >
            <SelectTrigger
              aria-label="Pindah ke proyek lain"
              className="h-9 w-full sm:w-52 rounded-xl bg-card border-border/80 text-xs sm:text-sm font-semibold shadow-2xs cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <FolderKanbanIcon className="size-4 text-primary shrink-0" />
                <SelectValue placeholder="Pilih kode proyek" />
              </div>
            </SelectTrigger>
            <SelectContent align="end">
              <SelectGroup>
                {allProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id} title={p.name}>
                    {p.code}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Div Informasi Proyek: 2 Kelompok Seimbang (Kiri: Kode & Nama Proyek, Kanan: Klien & Periode) */}
      <Card className="rounded-2xl border-border/80 bg-card px-6 py-4 shadow-2xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-8">
          <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              <p className="text-[11px] font-medium text-muted-foreground">
                Kode Proyek
              </p>
              <p className="text-xs sm:text-sm font-semibold text-foreground truncate tabular-nums">
                {project.code}
              </p>
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[11px] font-medium text-muted-foreground">
                Nama Proyek
              </p>
              <p className="text-xs sm:text-sm font-semibold text-foreground leading-snug">
                {project.name}
              </p>
            </div>
          </div>

          <div className="hidden md:block w-px bg-border/60 shrink-0" />

          <div className="shrink-0 md:min-w-[230px] lg:min-w-[260px] flex flex-col justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              <p className="text-[11px] font-medium text-muted-foreground">
                Klien
              </p>
              <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                {customer?.name ?? "Proyek Internal"}
              </p>
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-[11px] font-medium text-muted-foreground">
                Periode Pelaksanaan
              </p>
              <p className="text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap tabular-nums">
                {formatDateID(project.start_date)} &minus;{" "}
                {formatDateID(project.target_end_date)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Ringkasan Eksekutif Proyek */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Nilai Kontrak Proyek
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {formatRupiah(project.contract_value)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              {customer?.name ?? "Proyek Internal"}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-sky-400 border border-primary/20">
            <WalletIcon className="size-5" />
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Progres Penyelesaian Proyek
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {maxProgressPct}%
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              {bundle.milestones.length} termin terstruktur
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <TrendingUpIcon className="size-5" />
          </div>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card p-5 shadow-2xs flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Kelengkapan Dokumen &amp; PO
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
              {totalDocsCount} Dokumen
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              {verifiedClientPosCount} PO klien terverifikasi
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <FileTextIcon className="size-5" />
          </div>
        </Card>
      </div>

      {/* Bar Navigasi Tab Dokumen & Termin Proyek */}
      <div className="bg-card rounded-2xl p-2 flex items-center gap-1.5 shadow-2xs border border-border/80 w-full overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {[
          {
            id: "termin" as const,
            label: "Termin & Progres",
            badge: `${maxProgressPct}%`,
            icon: CalendarCheck2Icon,
          },
          {
            id: "quotation_po" as const,
            label: "Quotation & PO Klien",
            badge: String(bundle.clientPos.length),
            icon: FileCheck2Icon,
          },
          {
            id: "sow_spk" as const,
            label: "SoW & SPK",
            badge: String(bundle.documents.length),
            icon: FileSignatureIcon,
          },
          {
            id: "bakp_uat_bast" as const,
            label: "BAKP, UAT, & BAST",
            badge: String(
              bundle.bakpList.length + bundle.uatList.length + bundle.bastList.length,
            ),
            icon: ClipboardCheckIcon,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer select-none",
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  isActive ? "text-primary-foreground" : "text-muted-foreground",
                )}
              />
              <span className="whitespace-nowrap">{tab.label}</span>
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold leading-none tabular-nums",
                  isActive
                    ? "bg-white/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Termin & Progres Penyelesaian */}
      {activeTab === "termin" && (
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

          {/* 3B. Pengakuan Pendapatan Over-Time */}

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
                  onClick={() => {
                    setCumulativePct(maxProgressPct < 100 ? 100 : 100);
                    setProgDialogOpen(true);
                  }}
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
      )}

      {/* TAB 2: Quotation & Verifikasi PO Klien */}
      {activeTab === "quotation_po" && (
        <div className="flex flex-col gap-5">
          <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
            <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1 min-w-0">
                <CardTitle className="text-base sm:text-lg font-bold">Quotation Penawaran Harga (Lampiran A.1)</CardTitle>
                <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                  Terbitkan penawaran resmi proyek dan unduh dokumen PDF.
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
                      label: "quotation terpilih",
                    })
                  }
                />
                <Button
                  type="button"
                  onClick={() => setQtDialogOpen(true)}
                  className="shrink-0 h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  <PlusIcon data-icon="inline-start" />
                  Buat Quotation
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
                            aria-label="Pilih semua quotation"
                          />
                        </div>
                      </TableHead>
                    )}
                    <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">Nomor Quotation</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Tanggal &amp; Berlaku</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap w-44">Nilai Penawaran</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Status</TableHead>
                    <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap w-28">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bundle.quotations.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={5 + (isSectionEditing("quotations") ? 1 : 0)} className="p-0">
                        <div className="py-10 px-6 bg-muted/10 border-t border-dashed border-border/70">
                          <EmptyState
                            title="Belum ada Quotation"
                            description="Buat Quotation penawaran harga sebagai dasar pengajuan PO oleh klien."
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    bundle.quotations.map((q) => {
                      const qtStatus = QUOTATION_STATUS_META[q.status] ?? {
                        label: q.status,
                        tone: "info" as SemanticTone,
                      };
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
                            {formatDateID(q.quotation_date)} (s.d.{" "}
                            {formatDateID(q.valid_until)})
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
                                      { label: "Nomor Quotation", value: q.quotation_number },
                                      { label: "Tanggal Terbit", value: formatDateID(q.quotation_date) },
                                      { label: "Masa Berlaku", value: formatDateID(q.valid_until) },
                                      { label: "Estimasi Durasi", value: `${q.estimated_weeks} Minggu` },
                                      { label: "Batas Revisi", value: `${q.revision_limit}x` },
                                      { label: "Nilai Penawaran", value: formatRupiah(q.total_amount) },
                                      { label: "Ringkasan Kebutuhan", value: q.client_need_summary ?? "-" },
                                      { label: "Status", value: qtStatus.label },
                                    ],
                                    onDownloadPdf: () => void downloadQuotationPdf(q),
                                    onDownloadWord: () => void downloadQuotationWord(q),
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
                                  title="Unduh Quotation (PDF / Word)"
                                  onDownloadPdf={() => downloadQuotationPdf(q)}
                                  onDownloadWord={() => downloadQuotationWord(q)}
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
                  Verifikasi Purchase Order (PO) Masuk dari Klien
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                  Verifikasi PO dari Portal Pembeli sebelum penagihan proyek.
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
                      label: "PO klien terpilih",
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
                            aria-label="Pilih semua PO klien"
                          />
                        </div>
                      </TableHead>
                    )}
                    <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">Kode Akses PO</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Nama Klien</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Perusahaan / Instansi</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap w-40">Nilai PO</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Status Verifikasi</TableHead>
                    <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap w-28">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bundle.clientPos.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={6 + (isSectionEditing("clientPos") ? 1 : 0)} className="p-0">
                        <div className="py-10 px-6 bg-muted/10 border-t border-dashed border-border/70">
                          <EmptyState
                            title="Belum ada PO Klien"
                            description="Klien dapat mengirimkan PO tanpa login melalui halaman /portal-pembeli."
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    bundle.clientPos.map((cpo) => {
                      const cpoStatus = CPO_STATUS_META[cpo.status] ?? {
                        label: cpo.status,
                        tone: "info" as SemanticTone,
                      };
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
                                      { label: "Kode Akses PO", value: cpo.po_number },
                                      { label: "Nama Klien", value: cpo.client_name },
                                      { label: "Perusahaan", value: cpo.client_company ?? "-" },
                                      { label: "Email Klien", value: cpo.client_email },
                                      { label: "Nilai PO", value: formatRupiah(cpo.po_value) },
                                      { label: "Status", value: cpoStatus.label },
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
                                  title="Verifikasi ke Proyek Ini"
                                  onClick={async () => {
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
                                  className="size-8 rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                                >
                                  <CheckCircle2Icon className="size-4" />
                                  <span className="sr-only">Verifikasi ke Proyek Ini</span>
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  title="Tolak PO Klien"
                                  onClick={() => setRejectPoTarget(cpo)}
                                  className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                >
                                  <XCircleIcon className="size-4" />
                                  <span className="sr-only">Tolak</span>
                                </Button>
                              </div>
                            ) : cpo.status === "verified" ? (
                              <div className="flex justify-center items-center -my-1.5">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  title="Unduh Dokumen PO"
                                  onClick={async () => {
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
                                  className="size-8 rounded-lg text-primary dark:text-sky-400 hover:bg-primary/10 cursor-pointer"
                                >
                                  <DownloadIcon className="size-4" />
                                  <span className="sr-only">Unduh Dokumen PO</span>
                                </Button>
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
      )}

      {/* TAB 3: SoW & SPK */}
      {activeTab === "sow_spk" && (
        <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
          <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 min-w-0">
              <CardTitle>
                Statement of Work (SoW) &amp; Surat Perintah Kerja (SPK)
              </CardTitle>
              <CardDescription>
                Kelola dokumen ruang lingkup kerja (SoW) dan kontrak SPK proyek.
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
                    label: "dokumen terpilih",
                  })
                }
              />
              <Button
                type="button"
                onClick={() => {
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
                className="shrink-0 h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer"
              >
                <PlusIcon data-icon="inline-start" />
                Tambah SoW / SPK
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
                          aria-label="Pilih semua dokumen"
                        />
                      </div>
                    </TableHead>
                  )}
                  <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">Jenis</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Nomor Dokumen</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Judul Dokumen</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Status Tanda Tangan</TableHead>
                  <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap w-28">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bundle.documents.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5 + (isSectionEditing("documents") ? 1 : 0)} className="p-0">
                      <div className="py-10 px-6 bg-muted/10 border-t border-dashed border-border/70">
                        <EmptyState
                          title="Belum ada dokumen SoW atau SPK"
                          description="Tambahkan dokumen SoW dan SPK proyek untuk diunduh oleh tim maupun klien."
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  bundle.documents.map((d) => {
                    const isChecked = getSelectedIds("documents").includes(d.id);
                    const contentObj = d.content_json as Record<string, unknown> | null;
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
                              label={
                                d.is_signed ? "Ditandatangani" : "Draf Review"
                              }
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
                                    { label: "Jenis Dokumen", value: d.doc_type },
                                    { label: "Nomor Dokumen", value: d.doc_number },
                                    { label: "Judul", value: d.title },
                                    { label: "Status Tanda Tangan", value: d.is_signed ? "Ditandatangani" : "Draf Review" },
                                    { label: "Ringkasan Ruang Lingkup", value: String(contentObj?.summary ?? "-") },
                                  ],
                                  onDownloadPdf: () => void downloadProjectDocPdf(d),
                                  onDownloadWord: () => void downloadProjectDocWord(d),
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
                                title={`Unduh ${d.doc_type} (PDF / Word)`}
                                onDownloadPdf={() => downloadProjectDocPdf(d)}
                                onDownloadWord={() => downloadProjectDocWord(d)}
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
      )}

      {/* TAB 4: BAKP, UAT, & BAST */}
      {activeTab === "bakp_uat_bast" && (
        <div className="flex flex-col gap-5">
          {/* Card 4A: BAKP */}
          <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
            <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1 min-w-0">
                <CardTitle className="text-base sm:text-lg font-bold">
                  Berita Acara Kemajuan Pekerjaan / BAKP (Lampiran A.4)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                  Syarat wajib sebelum menerbitkan Invoice Termin Progres.
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
                      label: "dokumen BAKP terpilih",
                    })
                  }
                />
                <Button
                  type="button"
                  disabled={bundle.milestones.length === 0}
                  title={
                    bundle.milestones.length === 0
                      ? "Susun jadwal termin 100% pada tab Termin & Progres terlebih dahulu sebelum membuat BAKP"
                      : "Buat Berita Acara Kemajuan Pekerjaan (Lampiran A.4)"
                  }
                  onClick={openBakpDialog}
                  className="shrink-0 h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  <PlusIcon data-icon="inline-start" />
                  Buat BAKP
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
                            aria-label="Pilih semua BAKP"
                          />
                        </div>
                      </TableHead>
                    )}
                    <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">No. BAKP</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Tanggal</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Capaian</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap w-40">Nilai Tagih</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Status</TableHead>
                    <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap w-28">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bundle.bakpList.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={6 + (isSectionEditing("bakp") ? 1 : 0)} className="p-0">
                        <div className="py-10 px-6 bg-muted/10 border-t border-dashed border-border/70">
                          <EmptyState
                            title="Belum ada BAKP"
                            description="Terbitkan BAKP saat capaian termin siap ditagihkan."
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    bundle.bakpList.map((b) => {
                      const bakpStatus = BAKP_STATUS_META[b.status] ?? {
                        label: b.status,
                        tone: "warning" as SemanticTone,
                      };
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
                            {formatDateID(b.bakp_date)}
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
                                      { label: "Nomor BAKP", value: b.bakp_number },
                                      { label: "Tanggal BAKP", value: formatDateID(b.bakp_date) },
                                      { label: "Capaian Kumulatif", value: `${b.cumulative_percentage}%` },
                                      { label: "Nilai Tagih Termin", value: formatRupiah(b.billable_amount) },
                                      { label: "Catatan Pemeriksaan", value: b.findings_notes ?? "-" },
                                      { label: "Status", value: bakpStatus.label },
                                    ],
                                    onDownloadPdf: () => void downloadBakpPdf(b),
                                    onDownloadWord: () => void downloadBakpWord(b),
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
                                    title="Setujui BAKP oleh Klien"
                                    onClick={async () => {
                                      await approveBakpByClient(b.id);
                                      toast.success("BAKP ditandai disetujui klien.");
                                      await reload();
                                    }}
                                    className="size-8 rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                                  >
                                    <CheckCircle2Icon className="size-4" />
                                    <span className="sr-only">Setujui Klien</span>
                                  </Button>
                                ) : null}
                                <DocumentDownloadMenu
                                  title="Unduh BAKP (PDF / Word)"
                                  onDownloadPdf={() => downloadBakpPdf(b)}
                                  onDownloadWord={() => downloadBakpWord(b)}
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
                  Checklist Pengujian UAT (Lampiran A.7)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                  UAT wajib dinyatakan Diterima sebelum BAST dapat diterbitkan.
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
                      label: "dokumen UAT terpilih",
                    })
                  }
                />
                <Button
                  type="button"
                  onClick={() => setUatDialogOpen(true)}
                  className="shrink-0 h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  <PlusIcon data-icon="inline-start" />
                  Catat UAT
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
                            aria-label="Pilih semua UAT"
                          />
                        </div>
                      </TableHead>
                    )}
                    <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">No. UAT</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Tanggal Uji</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Penguji Klien</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Kesimpulan</TableHead>
                    <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap w-28">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bundle.uatList.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={5 + (isSectionEditing("uat") ? 1 : 0)} className="p-0">
                        <div className="py-10 px-6 bg-muted/10 border-t border-dashed border-border/70">
                          <EmptyState
                            title="Belum ada pengujian UAT"
                            description="Rekam hasil skenario uji bersama klien sebelum serah terima akhir."
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    bundle.uatList.map((u) => {
                      const uatMeta = UAT_CONCLUSION_META[u.conclusion] ?? {
                        label: u.conclusion,
                        tone: "info" as SemanticTone,
                      };
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
                            {formatDateID(u.test_date)}
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
                                      { label: "Nomor UAT", value: u.uat_number },
                                      { label: "Tanggal Uji", value: formatDateID(u.test_date) },
                                      { label: "Lingkungan Uji", value: u.staging_url ?? "-" },
                                      { label: "Penguji Klien", value: u.client_tester_name },
                                      { label: "Pendamping Altvira", value: u.altvira_companion_name },
                                      { label: "Kesimpulan", value: uatMeta.label },
                                    ],
                                    onDownloadPdf: () => void downloadUatPdf(u),
                                    onDownloadWord: () => void downloadUatWord(u),
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
                                  title="Unduh UAT (PDF / Word)"
                                  onDownloadPdf={() => downloadUatPdf(u)}
                                  onDownloadWord={() => downloadUatWord(u)}
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
                  Berita Acara Serah Terima / BAST (Lampiran A.8)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                  Syarat wajib penerbitan Invoice Pelunasan Akhir.
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
                      label: "dokumen BAST terpilih",
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
                      ? "Pastikan UAT telah berstatus Diterima untuk menerbitkan BAST (FR-PK8)"
                      : "Terbitkan BAST (Lampiran A.8)"
                  }
                  onClick={() => setBastDialogOpen(true)}
                  className="shrink-0 h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  <PlusIcon data-icon="inline-start" />
                  Terbitkan BAST
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
                            aria-label="Pilih semua BAST"
                          />
                        </div>
                      </TableHead>
                    )}
                    <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">No. BAST</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Tanggal Serah Terima</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Garansi Pemeliharaan</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Status</TableHead>
                    <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap w-28">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bundle.bastList.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={5 + (isSectionEditing("bast") ? 1 : 0)} className="p-0">
                        <div className="py-10 px-6 bg-muted/10 border-t border-dashed border-border/70">
                          <EmptyState
                            title="Belum ada BAST"
                            description="Pastikan UAT telah berstatus Diterima untuk menerbitkan BAST."
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    bundle.bastList.map((h) => {
                      const bastStatus = BAST_STATUS_META[h.status] ?? {
                        label: h.status,
                        tone: "warning" as SemanticTone,
                      };
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
                                    onDownloadPdf: () => void downloadBastPdf(h),
                                    onDownloadWord: () => void downloadBastWord(h),
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
                                  onDownloadPdf={() => downloadBastPdf(h)}
                                  onDownloadWord={() => downloadBastWord(h)}
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
      )}

      {/* Dialog Susun Jadwal Termin */}
      <Dialog open={msDialogOpen} onOpenChange={setMsDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Susun Jadwal Termin Proyek (Wajib 100%)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveMilestones}>
            <FieldGroup>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/25 dark:bg-[var(--field-bg)] px-3.5 py-2.5">
                <span className="text-xs text-muted-foreground">
                  Total nilai kontrak proyek:{" "}
                  <strong className="text-foreground">{formatRupiah(project.contract_value)}</strong>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setDraftMilestones((prev) => [
                      ...prev,
                      {
                        name: `Termin ${prev.length + 1}`,
                        isDownPayment: false,
                        isFinalSettlement: false,
                        percentage: 0,
                        amount: 0,
                        achievementCriteria: "",
                      },
                    ])
                  }
                >
                  <PlusIcon data-icon="inline-start" />
                  Tambah Termin
                </Button>
              </div>
              <div className="flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
                {draftMilestones.map((ms, idx) => (
                  <div
                    key={idx}
                    className="grid items-end gap-3 rounded-xl border border-border/70 bg-muted/15 p-3.5 sm:grid-cols-12"
                  >
                    <div className="sm:col-span-4 space-y-1.5">
                      <span className="text-[11px] font-medium text-muted-foreground block">
                        Nama Termin #{idx + 1}
                      </span>
                      <Input
                        placeholder="Contoh: Termin 1 (DP)"
                        value={ms.name}
                        onChange={(e) =>
                          setDraftMilestones((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, name: e.target.value } : x,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <span className="text-[11px] font-medium text-muted-foreground block">
                        Porsi (%)
                      </span>
                      <NumberInput
                        allowDecimal
                        maxDecimals={2}
                        min={0}
                        max={100}
                        placeholder="%"
                        value={ms.percentage}
                        onValueChange={(pct) => {
                          setDraftMilestones((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? {
                                    ...x,
                                    percentage: pct,
                                    amount: roundRupiah(
                                      (project.contract_value * pct) / 100,
                                    ),
                                  }
                                : x,
                            ),
                          );
                        }}
                      />
                    </div>
                    <div className="sm:col-span-3 space-y-1.5">
                      <span className="text-[11px] font-medium text-muted-foreground block">
                        Nominal (Rp)
                      </span>
                      <NumberInput
                        allowDecimal={false}
                        min={0}
                        placeholder="Nominal Rp"
                        value={ms.amount}
                        onValueChange={(amount) =>
                          setDraftMilestones((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, amount } : x)),
                          )
                        }
                      />
                    </div>
                    <div className="sm:col-span-3 space-y-1.5">
                      <span className="text-[11px] font-medium text-muted-foreground block">
                        Kriteria Pencapaian
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Input
                          placeholder="Contoh: BAKP Disetujui"
                          value={ms.achievementCriteria}
                          onChange={(e) =>
                            setDraftMilestones((prev) =>
                              prev.map((x, i) =>
                                i === idx
                                  ? { ...x, achievementCriteria: e.target.value }
                                  : x,
                              ),
                            )
                          }
                        />
                        {draftMilestones.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Hapus Baris Termin"
                            className="size-9 shrink-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                            onClick={() =>
                              setDraftMilestones((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                          >
                            <Trash2Icon className="size-4" />
                            <span className="sr-only">Hapus Baris Termin</span>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs font-semibold pt-1">
                <span>Total Persentase: {sumDraftMsPct}%</span>
                <StatusBadge
                  tone={sumDraftMsPct === 100 ? "success" : "destructive"}
                  label={
                    sumDraftMsPct === 100
                      ? "Tepat 100%"
                      : "Wajib 100%"
                  }
                />
              </div>
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMsDialogOpen(false)}
                  className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={savingMs || sumDraftMsPct !== 100}
                  className="cursor-pointer"
                >
                  {savingMs ? <Spinner data-icon="inline-start" /> : null}
                  Simpan Jadwal Termin
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Catat Progres Penyelesaian Proyek */}
      <Dialog open={progDialogOpen} onOpenChange={setProgDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Catat Persentase Penyelesaian Proyek</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordProgress}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="prog-date" required>
                  Tanggal Pengakuan Akhir Periode
                </FieldLabel>
                <DatePicker
                  id="prog-date"
                  required
                  value={progressDate}
                  onChange={setProgressDate}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="prog-pct" required>
                  Persentase Penyelesaian Kumulatif (0% – 100%)
                </FieldLabel>
                <NumberInput
                  id="prog-pct"
                  allowDecimal
                  maxDecimals={2}
                  min={maxProgressPct}
                  max={100}
                  required
                  value={cumulativePct}
                  onValueChange={setCumulativePct}
                />
                <FieldDescription>
                  Estimasi nilai kumulatif proporsional:{" "}
                  {formatRupiah(
                    roundRupiah((project.contract_value * cumulativePct) / 100),
                  )}
                </FieldDescription>
              </Field>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="prog-override">
                  Tetapkan Nominal Rupiah Kumulatif Eksak (mis. pecahan 2/3 =
                  Rp80.000.000)
                </FieldLabel>
                <Switch
                  id="prog-override"
                  checked={useExactRevenueOverride}
                  onCheckedChange={setUseExactRevenueOverride}
                />
              </Field>
              {useExactRevenueOverride ? (
                <Field>
                  <FieldLabel htmlFor="prog-exact-val">
                    Pendapatan Kumulatif Eksak (Rp Bulat)
                  </FieldLabel>
                  <NumberInput
                    id="prog-exact-val"
                    allowDecimal={false}
                    min={0}
                    max={project.contract_value}
                    value={exactRevenueOverride}
                    onValueChange={setExactRevenueOverride}
                  />
                </Field>
              ) : null}
              {project.revenue_method === "two_term_accrual" ? (
                <Field orientation="horizontal">
                  <FieldLabel htmlFor="prog-rev-2t">
                    Aktifkan Jurnal Pembalik Awal Tahun Berikutnya (Opsional 2
                    Termin)
                  </FieldLabel>
                  <Switch
                    id="prog-rev-2t"
                    checked={enableAutoReverse}
                    onCheckedChange={setEnableAutoReverse}
                  />
                </Field>
              ) : null}
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProgDialogOpen(false)}
                  className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 cursor-pointer"
                >
                  Batal
                </Button>
                <Button type="submit" disabled={savingProg} className="cursor-pointer">
                  {savingProg ? <Spinner data-icon="inline-start" /> : null}
                  Simpan &amp; Posting Pendapatan
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Buat Quotation */}
      <Dialog open={qtDialogOpen} onOpenChange={setQtDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Terbitkan Quotation Penawaran Harga</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateQuotation}>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="qt-date" required>Tanggal Quotation</FieldLabel>
                  <DatePicker
                    id="qt-date"
                    required
                    value={qtDate}
                    onChange={setQtDate}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="qt-valid" required>Masa Berlaku s.d.</FieldLabel>
                  <DatePicker
                    id="qt-valid"
                    required
                    value={qtValidUntil}
                    onChange={setQtValidUntil}
                  />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="qt-w">Estimasi Durasi (Minggu)</FieldLabel>
                  <NumberInput
                    id="qt-w"
                    allowDecimal={false}
                    min={1}
                    value={qtWeeks}
                    onValueChange={setQtWeeks}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="qt-rev">Batas Revisi</FieldLabel>
                  <NumberInput
                    id="qt-rev"
                    allowDecimal={false}
                    min={0}
                    value={qtRevisions}
                    onValueChange={setQtRevisions}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="qt-need">
                  Ringkasan Kebutuhan Klien
                </FieldLabel>
                <Textarea
                  id="qt-need"
                  value={qtNeedSummary}
                  onChange={(e) => setQtNeedSummary(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Rincian Fitur &amp; Biaya (Rp Bulat)</FieldLabel>
                <div className="flex flex-col gap-2">
                  {qtItems.map((it, idx) => (
                    <div key={idx} className="grid gap-2 sm:grid-cols-3">
                      <Input
                        placeholder="Nama modul/fitur"
                        value={it.featureName}
                        onChange={(e) =>
                          setQtItems((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, featureName: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                      <Input
                        placeholder="Deskripsi singkat"
                        value={it.description}
                        onChange={(e) =>
                          setQtItems((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, description: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                      <NumberInput
                        allowDecimal={false}
                        min={0}
                        value={it.costAmount}
                        onValueChange={(costAmount) =>
                          setQtItems((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, costAmount } : x,
                            ),
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              </Field>
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQtDialogOpen(false)}
                  className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 cursor-pointer"
                >
                  Batal
                </Button>
                <Button type="submit" disabled={savingQt} className="cursor-pointer">
                  {savingQt ? <Spinner data-icon="inline-start" /> : null}
                  Terbitkan Quotation
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Tambah SoW / SPK */}
      <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
        <DialogContent className={docType === "SPK" ? "sm:max-w-3xl max-h-[90vh] overflow-y-auto" : "sm:max-w-lg"}>
          <DialogHeader>
            <DialogTitle>Rekam Dokumen SoW atau SPK</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateDoc}>
            <FieldGroup>
              <Field>
                <FieldLabel required>Jenis Dokumen</FieldLabel>
                <Select
                  value={docType}
                  onValueChange={(v) => {
                    const nextType = v as "SOW" | "SPK";
                    setDocType(nextType);
                    if (nextType === "SPK" && !docSpkDraft && company && bundle) {
                      setDocSpkDraft(
                        buildDefaultSpkContent({
                          project,
                          customer,
                          company,
                          milestones: bundle.milestones,
                        }),
                      );
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="SOW">
                        SoW: Statement of Work (Lampiran A.2)
                      </SelectItem>
                      <SelectItem value="SPK">
                        SPK: Surat Perjanjian Kerjasama / Project Charter (Lampiran A.3)
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="doc-title" required>Judul Dokumen</FieldLabel>
                <Input
                  id="doc-title"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder={
                    docType === "SPK"
                      ? `SURAT PERJANJIAN KERJASAMA ${project.name.toUpperCase()}`
                      : `${docType} Pengembangan ${project.name}`
                  }
                />
              </Field>
              {docType === "SPK" && docSpkDraft ? (
                <SpkCharterFields
                  value={docSpkDraft}
                  onChange={setDocSpkDraft}
                />
              ) : (
                <Field>
                  <FieldLabel htmlFor="doc-sum">
                    Ringkasan Ruang Lingkup / Klausul Utama
                  </FieldLabel>
                  <Textarea
                    id="doc-sum"
                    value={docSummary}
                    onChange={(e) => setDocSummary(e.target.value)}
                  />
                </Field>
              )}
              <Field orientation="horizontal">
                <FieldLabel htmlFor="doc-signed">
                  Arsip Fisik / Pindaian Telah Ditandatangani Kedua Pihak
                </FieldLabel>
                <Switch
                  id="doc-signed"
                  checked={docSigned}
                  onCheckedChange={setDocSigned}
                />
              </Field>
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDocDialogOpen(false)}
                  className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 cursor-pointer"
                >
                  Batal
                </Button>
                <Button type="submit" disabled={savingDoc} className="cursor-pointer">
                  {savingDoc ? <Spinner data-icon="inline-start" /> : null}
                  Simpan Dokumen
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Buat BAKP */}
      <Dialog open={bakpDialogOpen} onOpenChange={setBakpDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Berita Acara Kemajuan Pekerjaan (BAKP)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateBakp}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="bakp-date" required>Tanggal BAKP</FieldLabel>
                <DatePicker
                  id="bakp-date"
                  required
                  value={bakpDate}
                  onChange={setBakpDate}
                />
              </Field>
              <Field>
                <FieldLabel required>Termin Terkait</FieldLabel>
                {bundle.milestones.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-600 dark:text-amber-400">
                    Jadwal termin belum disusun. Silakan susun termin terlebih dahulu pada tab Termin &amp; Progres.
                  </p>
                ) : (
                  <Select
                    value={bakpMilestoneId}
                    onValueChange={(id) => {
                      setBakpMilestoneId(id);
                      const found = bundle.milestones.find((m) => m.id === id);
                      if (found) setBakpBillable(found.amount);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih termin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {bundle.milestones.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name} ({formatRupiah(m.amount)})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="bakp-pct" required>Capaian Kumulatif (%)</FieldLabel>
                  <NumberInput
                    id="bakp-pct"
                    allowDecimal
                    maxDecimals={2}
                    min={0}
                    max={100}
                    value={bakpCumPct}
                    onValueChange={setBakpCumPct}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="bakp-amt" required>
                    Nilai Tagihan Termin (Rp)
                  </FieldLabel>
                  <NumberInput
                    id="bakp-amt"
                    allowDecimal={false}
                    min={0}
                    value={bakpBillable}
                    onValueChange={setBakpBillable}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="bakp-notes">Catatan Pemeriksaan</FieldLabel>
                <Textarea
                  id="bakp-notes"
                  value={bakpNotes}
                  onChange={(e) => setBakpNotes(e.target.value)}
                />
              </Field>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="bakp-app">
                  Telah Disetujui Klien
                </FieldLabel>
                <Switch
                  id="bakp-app"
                  checked={bakpApprovedNow}
                  onCheckedChange={setBakpApprovedNow}
                />
              </Field>
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBakpDialogOpen(false)}
                  className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={savingBakp || bundle.milestones.length === 0}
                  className="cursor-pointer"
                >
                  {savingBakp ? <Spinner data-icon="inline-start" /> : null}
                  Simpan BAKP
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Catat UAT */}
      <Dialog open={uatDialogOpen} onOpenChange={setUatDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Catat Checklist Pengujian UAT</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUat}>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="uat-date" required>Tanggal Pengujian</FieldLabel>
                  <DatePicker
                    id="uat-date"
                    required
                    value={uatDate}
                    onChange={setUatDate}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="uat-url">URL Staging</FieldLabel>
                  <Input
                    id="uat-url"
                    value={uatStagingUrl}
                    onChange={(e) => setUatStagingUrl(e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="uat-tester" required>Nama Penguji Klien</FieldLabel>
                  <Input
                    id="uat-tester"
                    required
                    value={uatClientTester}
                    onChange={(e) => setUatClientTester(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="uat-comp" required>Pendamping Altvira</FieldLabel>
                  <Input
                    id="uat-comp"
                    required
                    value={uatCompanion}
                    onChange={(e) => setUatCompanion(e.target.value)}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel required>Kesimpulan UAT</FieldLabel>
                <Select
                  value={uatConclusion}
                  onValueChange={(v) => setUatConclusion(v as UatConclusion)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="accepted">
                        Diterima Penuh (Siap BAST)
                      </SelectItem>
                      <SelectItem value="accepted_with_notes">
                        Diterima dengan Catatan Minor (Siap BAST)
                      </SelectItem>
                      <SelectItem value="rejected">
                        Ditolak / Perlu Perbaikan Ulang (Menolak BAST)
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Skenario Uji Utama</FieldLabel>
                <div className="flex flex-col gap-2">
                  {uatScenarios.map((sc, idx) => (
                    <div key={idx} className="grid gap-2 sm:grid-cols-3">
                      <Input
                        value={sc.featureName}
                        onChange={(e) =>
                          setUatScenarios((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, featureName: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                      <Input
                        value={sc.testScenario}
                        onChange={(e) =>
                          setUatScenarios((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, testScenario: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                      <Select
                        value={sc.result}
                        onValueChange={(v) =>
                          setUatScenarios((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, result: v as "pass" | "fail" }
                                : x,
                            ),
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="pass">Sesuai (Pass)</SelectItem>
                            <SelectItem value="fail">Revisi (Fail)</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </Field>
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUatDialogOpen(false)}
                  className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 cursor-pointer"
                >
                  Batal
                </Button>
                <Button type="submit" disabled={savingUat} className="cursor-pointer">
                  {savingUat ? <Spinner data-icon="inline-start" /> : null}
                  Simpan UAT
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Terbitkan BAST */}
      <Dialog open={bastDialogOpen} onOpenChange={setBastDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Terbitkan Berita Acara Serah Terima (BAST)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateBast}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="bast-date" required>Tanggal BAST</FieldLabel>
                <DatePicker
                  id="bast-date"
                  required
                  value={bastDate}
                  onChange={setBastDate}
                />
              </Field>
              <Field>
                <FieldLabel required>Referensi Dokumen UAT</FieldLabel>
                <Select value={bastUatId} onValueChange={setBastUatId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih UAT" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {bundle.uatList.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.uat_number} ({UAT_CONCLUSION_META[u.conclusion]?.label ?? u.conclusion})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="bast-war">
                  Masa Garansi Perbaikan Bug (Hari Kalender)
                </FieldLabel>
                <NumberInput
                  id="bast-war"
                  allowDecimal={false}
                  min={0}
                  value={bastWarrantyDays}
                  onValueChange={setBastWarrantyDays}
                />
              </Field>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="bast-sign">
                  Telah Ditandatangani Kedua Pihak
                </FieldLabel>
                <Switch
                  id="bast-sign"
                  checked={bastSigned}
                  onCheckedChange={setBastSigned}
                />
              </Field>
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBastDialogOpen(false)}
                  className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 cursor-pointer"
                >
                  Batal
                </Button>
                <Button type="submit" disabled={savingBast} className="cursor-pointer">
                  {savingBast ? <Spinner data-icon="inline-start" /> : null}
                  Terbitkan BAST
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi Penolakan PO Klien */}
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

      {/* Modal Lihat Rincian (Aksi Mode Edit) */}
      <Dialog
        open={Boolean(viewModal)}
        onOpenChange={(open) => {
          if (!open) setViewModal(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewModal?.title ?? "Rincian Data"}</DialogTitle>
          </DialogHeader>
          {viewModal ? (
            <div className="space-y-4">
              {viewModal.subtitle ? (
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {viewModal.subtitle}
                </p>
              ) : null}
              <div className="divide-y divide-border/60 rounded-xl border border-border/70 bg-muted/15">
                {viewModal.rows.map((r, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                  >
                    <span className="text-xs font-medium text-muted-foreground shrink-0">
                      {r.label}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-foreground sm:text-right break-words">
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>
              <DialogFooter className="pt-1">
                {viewModal.onDownloadWord ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={viewModal.onDownloadWord}
                    className="cursor-pointer gap-1.5"
                  >
                    <DownloadIcon className="size-4" />
                    <span>Unduh Word</span>
                  </Button>
                ) : null}
                {viewModal.onDownloadPdf ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={viewModal.onDownloadPdf}
                    className="cursor-pointer gap-1.5"
                  >
                    <DownloadIcon className="size-4" />
                    <span>Unduh PDF</span>
                  </Button>
                ) : null}
                <Button
                  type="button"
                  onClick={() => setViewModal(null)}
                  className="cursor-pointer"
                >
                  Tutup
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Modal Edit Data Baris (Aksi Mode Edit) */}
      <Dialog
        open={Boolean(editRecord)}
        onOpenChange={(open) => {
          if (!open) setEditRecord(null);
        }}
      >
        <DialogContent
          className={
            editRecord?.section === "documents" &&
            editRecord.item.doc_type === "SPK"
              ? "sm:max-w-3xl max-h-[90vh] overflow-y-auto"
              : "sm:max-w-lg"
          }
        >
          <DialogHeader>
            <DialogTitle>
              {editRecord?.section === "milestones"
                ? "Edit Termin Penagihan"
                : editRecord?.section === "progress"
                  ? "Edit Catatan Progres Penyelesaian"
                  : editRecord?.section === "quotations"
                    ? `Edit Quotation ${editRecord.item.quotation_number}`
                    : editRecord?.section === "clientPos"
                      ? `Edit PO Klien ${editRecord.item.po_number}`
                      : editRecord?.section === "documents"
                        ? `Edit Dokumen ${editRecord.item.doc_number}`
                        : editRecord?.section === "bakp"
                          ? `Edit BAKP ${editRecord.item.bakp_number}`
                          : editRecord?.section === "uat"
                            ? `Edit Checklist UAT ${editRecord.item.uat_number}`
                            : editRecord?.section === "bast"
                              ? `Edit BAST ${editRecord.item.bast_number}`
                              : "Edit Data"}
            </DialogTitle>
          </DialogHeader>
          {editRecord ? (
            <form onSubmit={handleSaveEditRecord}>
              <FieldGroup>
                {editRecord.section === "milestones" && (
                  <>
                    <Field>
                      <FieldLabel required>Nama Termin</FieldLabel>
                      <Input
                        required
                        value={editRecord.item.name}
                        onChange={(e) =>
                          setEditRecord({
                            section: "milestones",
                            item: { ...editRecord.item, name: e.target.value },
                          })
                        }
                      />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel required>Porsi (%)</FieldLabel>
                        <NumberInput
                          allowDecimal
                          maxDecimals={2}
                          min={0}
                          max={100}
                          value={editRecord.item.percentage}
                          onValueChange={(percentage) =>
                            setEditRecord({
                              section: "milestones",
                              item: {
                                ...editRecord.item,
                                percentage,
                              },
                            })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel required>Nominal (Rp)</FieldLabel>
                        <NumberInput
                          allowDecimal={false}
                          min={0}
                          value={editRecord.item.amount}
                          onValueChange={(amount) =>
                            setEditRecord({
                              section: "milestones",
                              item: {
                                ...editRecord.item,
                                amount,
                              },
                            })
                          }
                        />
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel>Kriteria Pencapaian</FieldLabel>
                      <Input
                        value={editRecord.item.achievement_criteria ?? ""}
                        onChange={(e) =>
                          setEditRecord({
                            section: "milestones",
                            item: {
                              ...editRecord.item,
                              achievement_criteria: e.target.value,
                            },
                          })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel required>Status Termin</FieldLabel>
                      <Select
                        value={editRecord.item.status}
                        onValueChange={(v) =>
                          setEditRecord({
                            section: "milestones",
                            item: {
                              ...editRecord.item,
                              status: v as MilestoneStatus,
                            },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="planned">Direncanakan</SelectItem>
                            <SelectItem value="in_progress">Berjalan</SelectItem>
                            <SelectItem value="bakp_approved">BAKP Disetujui</SelectItem>
                            <SelectItem value="invoiced">Ditagihkan</SelectItem>
                            <SelectItem value="paid">Lunas</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  </>
                )}

                {editRecord.section === "progress" && (
                  <>
                    <Field>
                      <FieldLabel required>Tanggal Pengakuan</FieldLabel>
                      <DatePicker
                        required
                        value={editRecord.item.progress_date}
                        onChange={(v) =>
                          setEditRecord({
                            section: "progress",
                            item: { ...editRecord.item, progress_date: v },
                          })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel required>Progres Kumulatif (%)</FieldLabel>
                      <NumberInput
                        allowDecimal
                        maxDecimals={2}
                        min={0}
                        max={100}
                        value={editRecord.item.cumulative_percentage}
                        onValueChange={(cumulative_percentage) =>
                          setEditRecord({
                            section: "progress",
                            item: {
                              ...editRecord.item,
                              cumulative_percentage,
                            },
                          })
                        }
                      />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel>Pendapatan Periode Ini (Rp)</FieldLabel>
                        <NumberInput
                          allowDecimal={false}
                          min={0}
                          value={editRecord.item.period_recognized_revenue}
                          onValueChange={(period_recognized_revenue) =>
                            setEditRecord({
                              section: "progress",
                              item: {
                                ...editRecord.item,
                                period_recognized_revenue,
                              },
                            })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Pendapatan Kumulatif (Rp)</FieldLabel>
                        <NumberInput
                          allowDecimal={false}
                          min={0}
                          value={editRecord.item.cumulative_recognized_revenue}
                          onValueChange={(cumulative_recognized_revenue) =>
                            setEditRecord({
                              section: "progress",
                              item: {
                                ...editRecord.item,
                                cumulative_recognized_revenue,
                              },
                            })
                          }
                        />
                      </Field>
                    </div>
                  </>
                )}

                {editRecord.section === "quotations" && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel required>Tanggal Quotation</FieldLabel>
                        <DatePicker
                          required
                          value={editRecord.item.quotation_date}
                          onChange={(v) =>
                            setEditRecord({
                              section: "quotations",
                              item: { ...editRecord.item, quotation_date: v },
                            })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel required>Berlaku Sampai</FieldLabel>
                        <DatePicker
                          required
                          value={editRecord.item.valid_until}
                          onChange={(v) =>
                            setEditRecord({
                              section: "quotations",
                              item: { ...editRecord.item, valid_until: v },
                            })
                          }
                        />
                      </Field>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel required>Nilai Penawaran (Rp)</FieldLabel>
                        <NumberInput
                          allowDecimal={false}
                          min={0}
                          value={editRecord.item.total_amount}
                          onValueChange={(total_amount) =>
                            setEditRecord({
                              section: "quotations",
                              item: {
                                ...editRecord.item,
                                total_amount,
                              },
                            })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Status</FieldLabel>
                        <Select
                          value={editRecord.item.status}
                          onValueChange={(v) =>
                            setEditRecord({
                              section: "quotations",
                              item: {
                                ...editRecord.item,
                                status: v as QuotationStatus,
                              },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="draft">Draf</SelectItem>
                              <SelectItem value="sent">Terkirim</SelectItem>
                              <SelectItem value="accepted">Disetujui</SelectItem>
                              <SelectItem value="rejected">Ditolak</SelectItem>
                              <SelectItem value="expired">Kedaluwarsa</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel>Ringkasan Kebutuhan Klien</FieldLabel>
                      <Textarea
                        value={editRecord.item.client_need_summary ?? ""}
                        onChange={(e) =>
                          setEditRecord({
                            section: "quotations",
                            item: {
                              ...editRecord.item,
                              client_need_summary: e.target.value,
                            },
                          })
                        }
                      />
                    </Field>
                  </>
                )}

                {editRecord.section === "clientPos" && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel required>Nama Klien</FieldLabel>
                        <Input
                          required
                          value={editRecord.item.client_name}
                          onChange={(e) =>
                            setEditRecord({
                              section: "clientPos",
                              item: {
                                ...editRecord.item,
                                client_name: e.target.value,
                              },
                            })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel>Perusahaan</FieldLabel>
                        <Input
                          value={editRecord.item.client_company ?? ""}
                          onChange={(e) =>
                            setEditRecord({
                              section: "clientPos",
                              item: {
                                ...editRecord.item,
                                client_company: e.target.value,
                              },
                            })
                          }
                        />
                      </Field>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel required>Nilai PO (Rp)</FieldLabel>
                        <NumberInput
                          allowDecimal={false}
                          min={0}
                          value={editRecord.item.po_value}
                          onValueChange={(po_value) =>
                            setEditRecord({
                              section: "clientPos",
                              item: {
                                ...editRecord.item,
                                po_value,
                              },
                            })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel required>Status Verifikasi</FieldLabel>
                        <Select
                          value={editRecord.item.status}
                          onValueChange={(v) =>
                            setEditRecord({
                              section: "clientPos",
                              item: {
                                ...editRecord.item,
                                status: v as ClientPoStatus,
                              },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="pending_verification">
                                Menunggu Verifikasi
                              </SelectItem>
                              <SelectItem value="verified">Terverifikasi</SelectItem>
                              <SelectItem value="rejected">Ditolak</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                  </>
                )}

                {editRecord.section === "documents" && (
                  <>
                    <Field>
                      <FieldLabel required>Jenis Dokumen</FieldLabel>
                      <Select
                        value={editRecord.item.doc_type}
                        onValueChange={(v) =>
                          setEditRecord({
                            section: "documents",
                            item: {
                              ...editRecord.item,
                              doc_type: v as "SOW" | "SPK",
                            },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="SOW">SoW (Lampiran A.2)</SelectItem>
                            <SelectItem value="SPK">SPK (Lampiran A.3)</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel required>Judul Dokumen</FieldLabel>
                      <Input
                        required
                        value={editRecord.item.title}
                        onChange={(e) =>
                          setEditRecord({
                            section: "documents",
                            item: { ...editRecord.item, title: e.target.value },
                          })
                        }
                      />
                    </Field>
                    {editRecord.item.doc_type === "SPK" && company ? (
                      <SpkCharterFields
                        value={extractSpkCharterContent(
                          editRecord.item.content_json as Record<string, unknown> | null,
                          {
                            project,
                            customer,
                            company,
                            milestones: bundle.milestones,
                          },
                        )}
                        onChange={(nextSpk) =>
                          setEditRecord({
                            section: "documents",
                            item: {
                              ...editRecord.item,
                              content_json: nextSpk as unknown as ProjectDocumentRow["content_json"],
                            },
                          })
                        }
                      />
                    ) : (
                      <Field>
                        <FieldLabel>Ringkasan Ruang Lingkup</FieldLabel>
                        <Textarea
                          value={String(
                            (editRecord.item.content_json as Record<string, unknown> | null)
                              ?.summary ?? "",
                          )}
                          onChange={(e) =>
                            setEditRecord({
                              section: "documents",
                              item: {
                                ...editRecord.item,
                                content_json: {
                                  ...(editRecord.item.content_json as Record<string, unknown> | null),
                                  summary: e.target.value,
                                },
                              },
                            })
                          }
                        />
                      </Field>
                    )}
                    <Field orientation="horizontal">
                      <FieldLabel>Telah Ditandatangani Kedua Pihak</FieldLabel>
                      <Switch
                        checked={editRecord.item.is_signed}
                        onCheckedChange={(checked) =>
                          setEditRecord({
                            section: "documents",
                            item: { ...editRecord.item, is_signed: checked },
                          })
                        }
                      />
                    </Field>
                  </>
                )}

                {editRecord.section === "bakp" && (
                  <>
                    <Field>
                      <FieldLabel required>Tanggal BAKP</FieldLabel>
                      <DatePicker
                        required
                        value={editRecord.item.bakp_date}
                        onChange={(v) =>
                          setEditRecord({
                            section: "bakp",
                            item: { ...editRecord.item, bakp_date: v },
                          })
                        }
                      />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel required>Capaian (%)</FieldLabel>
                        <NumberInput
                          allowDecimal
                          maxDecimals={2}
                          min={0}
                          max={100}
                          value={editRecord.item.cumulative_percentage}
                          onValueChange={(cumulative_percentage) =>
                            setEditRecord({
                              section: "bakp",
                              item: {
                                ...editRecord.item,
                                cumulative_percentage,
                              },
                            })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel required>Nilai Tagih (Rp)</FieldLabel>
                        <NumberInput
                          allowDecimal={false}
                          min={0}
                          value={editRecord.item.billable_amount}
                          onValueChange={(billable_amount) =>
                            setEditRecord({
                              section: "bakp",
                              item: {
                                ...editRecord.item,
                                billable_amount,
                              },
                            })
                          }
                        />
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel>Status</FieldLabel>
                      <Select
                        value={editRecord.item.status}
                        onValueChange={(v) =>
                          setEditRecord({
                            section: "bakp",
                            item: {
                              ...editRecord.item,
                              status: v as BakpStatus,
                            },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="draft">Draf</SelectItem>
                            <SelectItem value="approved_by_client">
                              Disetujui Klien
                            </SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel>Catatan Pemeriksaan</FieldLabel>
                      <Textarea
                        value={editRecord.item.findings_notes ?? ""}
                        onChange={(e) =>
                          setEditRecord({
                            section: "bakp",
                            item: {
                              ...editRecord.item,
                              findings_notes: e.target.value,
                            },
                          })
                        }
                      />
                    </Field>
                  </>
                )}

                {editRecord.section === "uat" && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel required>Tanggal Pengujian</FieldLabel>
                        <DatePicker
                          required
                          value={editRecord.item.test_date}
                          onChange={(v) =>
                            setEditRecord({
                              section: "uat",
                              item: { ...editRecord.item, test_date: v },
                            })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel>URL Staging</FieldLabel>
                        <Input
                          value={editRecord.item.staging_url ?? ""}
                          onChange={(e) =>
                            setEditRecord({
                              section: "uat",
                              item: { ...editRecord.item, staging_url: e.target.value },
                            })
                          }
                        />
                      </Field>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel required>Penguji Klien</FieldLabel>
                        <Input
                          required
                          value={editRecord.item.client_tester_name}
                          onChange={(e) =>
                            setEditRecord({
                              section: "uat",
                              item: {
                                ...editRecord.item,
                                client_tester_name: e.target.value,
                              },
                            })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel required>Pendamping Altvira</FieldLabel>
                        <Input
                          required
                          value={editRecord.item.altvira_companion_name}
                          onChange={(e) =>
                            setEditRecord({
                              section: "uat",
                              item: {
                                ...editRecord.item,
                                altvira_companion_name: e.target.value,
                              },
                            })
                          }
                        />
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel required>Kesimpulan UAT</FieldLabel>
                      <Select
                        value={editRecord.item.conclusion}
                        onValueChange={(v) =>
                          setEditRecord({
                            section: "uat",
                            item: {
                              ...editRecord.item,
                              conclusion: v as UatConclusion,
                            },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="pending">Menunggu Hasil</SelectItem>
                            <SelectItem value="accepted">Diterima Penuh</SelectItem>
                            <SelectItem value="accepted_with_notes">
                              Diterima (Catatan)
                            </SelectItem>
                            <SelectItem value="rejected">Ditolak / Revisi</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  </>
                )}

                {editRecord.section === "bast" && (
                  <>
                    <Field>
                      <FieldLabel required>Tanggal BAST</FieldLabel>
                      <DatePicker
                        required
                        value={editRecord.item.bast_date}
                        onChange={(v) =>
                          setEditRecord({
                            section: "bast",
                            item: { ...editRecord.item, bast_date: v },
                          })
                        }
                      />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel>Masa Garansi (Hari)</FieldLabel>
                        <NumberInput
                          allowDecimal={false}
                          min={0}
                          value={editRecord.item.warranty_days}
                          onValueChange={(warranty_days) =>
                            setEditRecord({
                              section: "bast",
                              item: {
                                ...editRecord.item,
                                warranty_days,
                              },
                            })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel required>Status BAST</FieldLabel>
                        <Select
                          value={editRecord.item.status}
                          onValueChange={(v) =>
                            setEditRecord({
                              section: "bast",
                              item: {
                                ...editRecord.item,
                                status: v as BastStatus,
                              },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="draft">Draf</SelectItem>
                              <SelectItem value="signed">Ditandatangani</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                  </>
                )}

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditRecord(null)}
                    className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 cursor-pointer"
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={savingEditRecord} className="cursor-pointer">
                    {savingEditRecord ? <Spinner data-icon="inline-start" /> : null}
                    Simpan Perubahan
                  </Button>
                </DialogFooter>
              </FieldGroup>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Konfirmasi Hapus Data / Hapus Pilihan (Aksi Mode Edit) */}
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
