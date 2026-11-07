import * as React from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  DownloadIcon,
  PlusIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
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
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  getCompanyProfile,
  listCustomers,
  listProjects,
} from "@/lib/data-service";
import {
  formatDateID,
  formatRupiah,
  REVENUE_METHOD_LABELS,
  roundRupiah,
} from "@/lib/formatters";
import {
  approveBakpByClient,
  createBakpReport,
  createBastHandover,
  createProjectDocument,
  createQuotation,
  createUatChecklist,
  getProjectWorkspace,
  type ProjectWorkspaceBundle,
  recordExportLog,
  recordPeriodProjectCompletion,
  saveProjectMilestonesSchedule,
  verifyClientPurchaseOrder,
} from "@/lib/operations-service";
import { downloadPdfBytes, generateDocumentPdf } from "@/lib/pdf-generator";
import type {
  ClientPurchaseOrderRow,
  CompanyProfileRow,
  CustomerRow,
  HandoverReportRow,
  ProgressReportRow,
  ProjectDocumentRow,
  ProjectRow,
  QuotationRow,
  UatChecklistRow,
  UatConclusion,
} from "@/types/database.types";

interface DraftMilestone {
  name: string;
  isDownPayment: boolean;
  isFinalSettlement: boolean;
  percentage: number;
  amount: number;
  achievementCriteria: string;
}

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = React.useState<ProjectRow | null>(null);
  const [customer, setCustomer] = React.useState<CustomerRow | null>(null);
  const [company, setCompany] = React.useState<CompanyProfileRow | null>(null);
  const [bundle, setBundle] = React.useState<ProjectWorkspaceBundle | null>(
    null,
  );
  const [loading, setLoading] = React.useState(true);

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

  // 8. Dialog BAST (Lampiran A.8 — wajib UAT diterima FR-PK8)
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
      setProject(found);
      setCustomer(
        found?.customer_id
          ? (csts.find((c) => c.id === found.customer_id) ?? null)
          : null,
      );
      setCompany(comp);
      setBundle(ws);

      if (ws.milestones[0]) {
        setBakpMilestoneId((prev) => prev || ws.milestones[0]!.id);
      }
      const passedUat = ws.uatList.find(
        (u) =>
          u.conclusion === "accepted" || u.conclusion === "accepted_with_notes",
      );
      if (passedUat) {
        setBastUatId((prev) => prev || passedUat.id);
      }
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
        title: docTitle || `${docType} — ${project.name}`,
        summary: docSummary,
        isSigned: docSigned,
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

  async function handleCreateBakp(e: React.FormEvent) {
    e.preventDefault();
    if (!project || !bakpMilestoneId) return;
    setSavingBakp(true);
    try {
      await createBakpReport({
        bakpDate,
        projectId: project.id,
        milestoneId: bakpMilestoneId,
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

  // Generator PDF Lampiran A.1, A.2, A.3, A.4, A.7, A.8
  async function downloadQuotationPdf(qt: QuotationRow) {
    if (!company || !bundle) return;
    const qItems = bundle.quotationItems.filter(
      (i) => i.quotation_id === qt.id,
    );
    const bytes = await generateDocumentPdf({
      docTitle: "SURAT PENAWARAN HARGA (QUOTATION)",
      docSubtitle: `Berlaku s.d. ${formatDateID(qt.valid_until)}`,
      docNumber: qt.quotation_number,
      docDate: qt.quotation_date,
      company,
      recipientTitle: "Kepada Yth.:",
      recipientLines: [
        customer?.name ?? "Klien Mitra",
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
        { header: "No", widthRatio: 0.08 },
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
        "Harga tidak dikenakan PPN karena Altvira Technology belum dikukuhkan sebagai PKP.",
        "Penawaran ini sah sebagai referensi penerbitan Purchase Order (PO) Klien.",
      ],
      rightSignatureName: `${company.signer_name} - ${company.signer_title}`,
    });
    downloadPdfBytes(bytes, `${qt.quotation_number.replace(/\//g, "_")}.pdf`);
    await recordExportLog("QUOTATION", "PDF");
  }

  async function downloadProjectDocPdf(doc: ProjectDocumentRow) {
    if (!company || !project) return;
    const summaryText =
      typeof doc.content_json === "object" &&
      doc.content_json !== null &&
      "summary" in doc.content_json
        ? String((doc.content_json as Record<string, unknown>).summary ?? "")
        : "";
    const bytes = await generateDocumentPdf({
      docTitle:
        doc.doc_type === "SOW"
          ? "STATEMENT OF WORK (RUANG LINGKUP PEKERJAAN)"
          : "SURAT PERINTAH KERJA / PERJANJIAN JASA (SPK)",
      docNumber: doc.doc_number,
      docDate: doc.created_at.slice(0, 10),
      company,
      recipientTitle: "Pihak Klien (Pemberi Kerja):",
      recipientLines: [
        customer?.name ?? "Klien",
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
      rightSignatureLabel: `Pelaksana, ${company.company_name}`,
      rightSignatureName: `${company.signer_name} - ${company.signer_title}`,
    });
    downloadPdfBytes(bytes, `${doc.doc_number.replace(/\//g, "_")}.pdf`);
  }

  async function downloadBakpPdf(bakp: ProgressReportRow) {
    if (!company || !project || !bundle) return;
    const ms = bundle.milestones.find((m) => m.id === bakp.milestone_id);
    const bytes = await generateDocumentPdf({
      docTitle: "BERITA ACARA KEMAJUAN PEKERJAAN (BAKP)",
      docNumber: bakp.bakp_number,
      docDate: bakp.bakp_date,
      company,
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
      rightSignatureName: `${company.signer_name} - ${company.signer_title}`,
    });
    downloadPdfBytes(bytes, `${bakp.bakp_number.replace(/\//g, "_")}.pdf`);
  }

  async function downloadUatPdf(uat: UatChecklistRow) {
    if (!company || !project || !bundle) return;
    const items = bundle.uatItems.filter((i) => i.uat_id === uat.id);
    const bytes = await generateDocumentPdf({
      docTitle: "USER ACCEPTANCE TEST (UAT) CHECKLIST",
      docNumber: uat.uat_number,
      docDate: uat.test_date,
      company,
      metaRows: [
        { label: "Proyek", value: `${project.code} - ${project.name}` },
        { label: "Lingkungan Uji", value: uat.staging_url ?? "-" },
        { label: "Penguji Klien", value: uat.client_tester_name },
        { label: "Pendamping Altvira", value: uat.altvira_companion_name },
        { label: "Kesimpulan UAT", value: uat.conclusion.toUpperCase() },
      ],
      tableColumns: [
        { header: "No", widthRatio: 0.08 },
        { header: "Fitur", widthRatio: 0.32 },
        { header: "Skenario Uji", widthRatio: 0.44 },
        { header: "Hasil", widthRatio: 0.16 },
      ],
      tableRows: items.map((it) => [
        String(it.line_no),
        it.feature_name,
        it.test_scenario,
        it.result === "pass" ? "SESUAI" : "REVISI",
      ]),
      leftSignatureLabel: "Penguji Klien,",
      leftSignatureName: uat.client_tester_name,
      rightSignatureName: uat.altvira_companion_name,
    });
    downloadPdfBytes(bytes, `${uat.uat_number.replace(/\//g, "_")}.pdf`);
  }

  async function downloadBastPdf(bast: HandoverReportRow) {
    if (!company || !project) return;
    const bytes = await generateDocumentPdf({
      docTitle: "BERITA ACARA SERAH TERIMA PEKERJAAN (BAST)",
      docNumber: bast.bast_number,
      docDate: bast.bast_date,
      company,
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
      rightSignatureName: `${company.signer_name} - ${company.signer_title}`,
    });
    downloadPdfBytes(bytes, `${bast.bast_number.replace(/\//g, "_")}.pdf`);
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit px-0"
            asChild
          >
            <Link to="/admin/proyek">
              <ArrowLeftIcon data-icon="inline-start" />
              Kembali ke Master Proyek
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {project.code} — {project.name}
            </h1>
            <StatusBadge
              tone={project.status === "completed" ? "success" : "info"}
              label={project.status}
            />
            {project.is_eliminated ? (
              <StatusBadge
                tone="success"
                label="WIP & Penagihan Tereliminasi 100%"
              />
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Klien: {customer?.name ?? "Internal"} · Nilai Kontrak:{" "}
            <strong>{formatRupiah(project.contract_value)}</strong> · Metode:{" "}
            {REVENUE_METHOD_LABELS[project.revenue_method]}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/admin/penagihan">Buka Modul Invoice &amp; Kuitansi</Link>
        </Button>
      </div>

      <Tabs defaultValue="termin">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="termin">
            Termin &amp; Progres ({maxProgressPct}%)
          </TabsTrigger>
          <TabsTrigger value="quotation_po">
            Quotation &amp; PO Klien ({bundle.clientPos.length})
          </TabsTrigger>
          <TabsTrigger value="sow_spk">
            SoW &amp; SPK ({bundle.documents.length})
          </TabsTrigger>
          <TabsTrigger value="bakp_uat_bast">
            BAKP, UAT, &amp; BAST
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Termin & Progres Penyelesaian */}
        <TabsContent value="termin" className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Jadwal Termin Penagihan (Total 100%)</CardTitle>
                <CardDescription>
                  Total persentase termin wajib 100% (BR-17). Mengubah jumlah
                  termin menyesuaikan metode pengakuan pendapatan otomatis.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={project.has_posted_journal}
                onClick={openMilestonesEditor}
              >
                <PlusIcon data-icon="inline-start" />
                {bundle.milestones.length > 0
                  ? "Atur Ulang Termin"
                  : "Susun Termin 100%"}
              </Button>
            </CardHeader>
            <CardContent>
              {bundle.milestones.length === 0 ? (
                <EmptyState
                  title="Jadwal termin belum disusun"
                  description="Klik tombol Susun Termin 100% untuk menetapkan DP, termin progres, dan pelunasan."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Nama Termin</TableHead>
                      <TableHead>Porsi (%)</TableHead>
                      <TableHead>Nominal</TableHead>
                      <TableHead>Kriteria Pencapaian</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bundle.milestones.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{m.sequence_no}</TableCell>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell>{m.percentage}%</TableCell>
                        <TableCell className="font-semibold">
                          {formatRupiah(m.amount)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.achievement_criteria ?? "-"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            tone={m.status === "paid" ? "success" : "info"}
                            label={m.status}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>
                  Pengakuan Pendapatan &amp; Persentase Penyelesaian Akhir
                  Periode
                </CardTitle>
                <CardDescription>
                  Mencatat capaian progres (0%–100%, tidak boleh mundur sesuai
                  BR-21) dan memposting jurnal otomatis (mis.{" "}
                  <code>D Jasa dalam Proses / K Pendapatan Jasa</code> pada
                  Progress Billing). Saat progres 100% &amp; seluruh termin
                  tertagih, sistem otomatis mengeliminasi akun kontrak.
                </CardDescription>
              </div>
              <Button
                type="button"
                onClick={() => {
                  setCumulativePct(maxProgressPct < 100 ? 100 : 100);
                  setProgDialogOpen(true);
                }}
              >
                <PlusIcon data-icon="inline-start" />
                Catat Progres Penyelesaian
              </Button>
            </CardHeader>
            <CardContent>
              {bundle.progressEntries.length === 0 ? (
                <EmptyState
                  title="Belum ada pencatatan progres penyelesaian"
                  description="Catat progres pada akhir periode buku untuk mengakui pendapatan akrual sesuai capaian proyek."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal Pengakuan</TableHead>
                      <TableHead>Progres Kumulatif</TableHead>
                      <TableHead>Pendapatan Diakui Periode Ini</TableHead>
                      <TableHead>Pendapatan Kumulatif</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bundle.progressEntries.map((pe) => (
                      <TableRow key={pe.id}>
                        <TableCell>{formatDateID(pe.progress_date)}</TableCell>
                        <TableCell className="font-semibold">
                          {pe.cumulative_percentage}%
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatRupiah(pe.period_recognized_revenue)}
                        </TableCell>
                        <TableCell>
                          {formatRupiah(pe.cumulative_recognized_revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Quotation & Verifikasi PO Klien */}
        <TabsContent value="quotation_po" className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Quotation Penawaran Harga (Lampiran A.1)</CardTitle>
                <CardDescription>
                  Terbitkan penawaran resmi tanpa PPN (default Non-PKP) dan
                  unduh berkas PDF siap kirim.
                </CardDescription>
              </div>
              <Button type="button" onClick={() => setQtDialogOpen(true)}>
                <PlusIcon data-icon="inline-start" />
                Buat Quotation
              </Button>
            </CardHeader>
            <CardContent>
              {bundle.quotations.length === 0 ? (
                <EmptyState
                  title="Belum ada Quotation"
                  description="Buat Quotation penawaran harga sebagai dasar pengajuan PO oleh klien."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nomor Quotation</TableHead>
                      <TableHead>Tanggal &amp; Berlaku</TableHead>
                      <TableHead>Nilai Penawaran</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">PDF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bundle.quotations.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell className="font-mono text-xs font-semibold">
                          {q.quotation_number}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDateID(q.quotation_date)} (s.d.{" "}
                          {formatDateID(q.valid_until)})
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatRupiah(q.total_amount)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge tone="info" label={q.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void downloadQuotationPdf(q)}
                          >
                            <DownloadIcon data-icon="inline-start" />
                            PDF A.1
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Verifikasi Purchase Order (PO) Masuk dari Klien (UC-14 &amp;
                BR-23)
              </CardTitle>
              <CardDescription>
                PO klien yang masuk dari Portal Pembeli berstatus Menunggu
                Verifikasi dan baru aktif untuk penagihan setelah diverifikasi
                Admin ke proyek ini.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bundle.clientPos.length === 0 ? (
                <EmptyState
                  title="Belum ada PO Klien"
                  description="Klien dapat mengirimkan PO tanpa login melalui halaman /portal-pembeli."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode Akses PO</TableHead>
                      <TableHead>Klien &amp; Perusahaan</TableHead>
                      <TableHead>Nilai PO</TableHead>
                      <TableHead>Status Verifikasi</TableHead>
                      <TableHead className="text-right">Aksi Admin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bundle.clientPos.map((cpo) => (
                      <TableRow key={cpo.id}>
                        <TableCell className="font-mono text-xs font-bold">
                          {cpo.po_number}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium">{cpo.client_name}</div>
                          <div className="text-muted-foreground">
                            {cpo.client_company ?? cpo.client_email}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatRupiah(cpo.po_value)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            tone={
                              cpo.status === "verified"
                                ? "success"
                                : cpo.status === "rejected"
                                  ? "destructive"
                                  : "warning"
                            }
                            label={cpo.status}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {cpo.status === "pending_verification" ? (
                            <div className="flex justify-end gap-1.5">
                              <Button
                                type="button"
                                size="sm"
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
                              >
                                <CheckCircle2Icon data-icon="inline-start" />
                                Verifikasi ke Proyek Ini
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => setRejectPoTarget(cpo)}
                              >
                                <XCircleIcon data-icon="inline-start" />
                                Tolak
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Terverifikasi
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: SoW & SPK */}
        <TabsContent value="sow_spk">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>
                  Statement of Work (SoW) &amp; Surat Perintah Kerja (SPK)
                </CardTitle>
                <CardDescription>
                  Rekam dokumen lingkup pekerjaan (Lampiran A.2) dan kontrak SPK
                  (Lampiran A.3) beserta arsip tanda tangan basah.
                </CardDescription>
              </div>
              <Button
                type="button"
                onClick={() => {
                  setDocTitle("");
                  setDocSummary("");
                  setDocDialogOpen(true);
                }}
              >
                <PlusIcon data-icon="inline-start" />
                Tambah SoW / SPK
              </Button>
            </CardHeader>
            <CardContent>
              {bundle.documents.length === 0 ? (
                <EmptyState
                  title="Belum ada dokumen SoW atau SPK"
                  description="Tambahkan dokumen SoW dan SPK proyek untuk diunduh oleh tim maupun klien."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Nomor Dokumen</TableHead>
                      <TableHead>Judul</TableHead>
                      <TableHead>Status Tanda Tangan</TableHead>
                      <TableHead className="text-right">Unduh PDF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bundle.documents.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <StatusBadge tone="info" label={d.doc_type} />
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold">
                          {d.doc_number}
                        </TableCell>
                        <TableCell className="font-medium">{d.title}</TableCell>
                        <TableCell>
                          <StatusBadge
                            tone={d.is_signed ? "success" : "warning"}
                            label={
                              d.is_signed ? "Ditandatangani" : "Draf Review"
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void downloadProjectDocPdf(d)}
                          >
                            <DownloadIcon data-icon="inline-start" />
                            PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: BAKP, UAT, & BAST */}
        <TabsContent value="bakp_uat_bast" className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>
                  Berita Acara Kemajuan Pekerjaan / BAKP (Lampiran A.4)
                </CardTitle>
                <CardDescription>
                  Syarat wajib sebelum menerbitkan Invoice Termin (BR-14).
                </CardDescription>
              </div>
              <Button type="button" onClick={() => setBakpDialogOpen(true)}>
                <PlusIcon data-icon="inline-start" />
                Buat BAKP
              </Button>
            </CardHeader>
            <CardContent>
              {bundle.bakpList.length === 0 ? (
                <EmptyState
                  title="Belum ada BAKP"
                  description="Terbitkan BAKP saat capaian termin siap ditagihkan."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. BAKP</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Capaian</TableHead>
                      <TableHead>Nilai Tagih</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bundle.bakpList.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono text-xs font-semibold">
                          {b.bakp_number}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDateID(b.bakp_date)}
                        </TableCell>
                        <TableCell>{b.cumulative_percentage}%</TableCell>
                        <TableCell className="font-semibold">
                          {formatRupiah(b.billable_amount)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            tone={
                              b.status === "approved_by_client"
                                ? "success"
                                : "warning"
                            }
                            label={b.status}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            {b.status !== "approved_by_client" ? (
                              <Button
                                type="button"
                                size="sm"
                                onClick={async () => {
                                  await approveBakpByClient(b.id);
                                  toast.success("BAKP ditandai disetujui klien.");
                                  await reload();
                                }}
                              >
                                Setujui Klien
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => void downloadBakpPdf(b)}
                            >
                              <DownloadIcon data-icon="inline-start" />
                              PDF A.4
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Checklist Pengujian UAT (Lampiran A.7)</CardTitle>
                <CardDescription>
                  UAT wajib dinyatakan Diterima sebelum BAST dapat diterbitkan
                  (FR-PK8).
                </CardDescription>
              </div>
              <Button type="button" onClick={() => setUatDialogOpen(true)}>
                <PlusIcon data-icon="inline-start" />
                Catat UAT
              </Button>
            </CardHeader>
            <CardContent>
              {bundle.uatList.length === 0 ? (
                <EmptyState
                  title="Belum ada pengujian UAT"
                  description="Rekam hasil skenario uji bersama klien sebelum serah terima akhir."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. UAT</TableHead>
                      <TableHead>Tanggal Uji</TableHead>
                      <TableHead>Penguji Klien</TableHead>
                      <TableHead>Kesimpulan</TableHead>
                      <TableHead className="text-right">PDF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bundle.uatList.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-mono text-xs font-semibold">
                          {u.uat_number}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDateID(u.test_date)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {u.client_tester_name}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            tone={
                              u.conclusion === "rejected"
                                ? "destructive"
                                : u.conclusion === "pending"
                                  ? "warning"
                                  : "success"
                            }
                            label={u.conclusion}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void downloadUatPdf(u)}
                          >
                            <DownloadIcon data-icon="inline-start" />
                            PDF A.7
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>
                  Berita Acara Serah Terima / BAST (Lampiran A.8)
                </CardTitle>
                <CardDescription>
                  Syarat wajib penerbitan Invoice Pelunasan Akhir (BR-15).
                </CardDescription>
              </div>
              <Button
                type="button"
                disabled={bundle.uatList.length === 0}
                onClick={() => setBastDialogOpen(true)}
              >
                <PlusIcon data-icon="inline-start" />
                Terbitkan BAST
              </Button>
            </CardHeader>
            <CardContent>
              {bundle.bastList.length === 0 ? (
                <EmptyState
                  title="Belum ada BAST"
                  description="Pastikan UAT telah berstatus Diterima untuk menerbitkan BAST."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. BAST</TableHead>
                      <TableHead>Tanggal Serah Terima</TableHead>
                      <TableHead>Garansi Pemeliharaan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">PDF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bundle.bastList.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="font-mono text-xs font-semibold">
                          {h.bast_number}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDateID(h.bast_date)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {h.warranty_days} Hari
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            tone={h.status === "signed" ? "success" : "warning"}
                            label={h.status}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void downloadBastPdf(h)}
                          >
                            <DownloadIcon data-icon="inline-start" />
                            PDF A.8
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Susun Jadwal Termin */}
      <Dialog open={msDialogOpen} onOpenChange={setMsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Susun Jadwal Termin Proyek (Wajib 100%)</DialogTitle>
            <DialogDescription>
              Total nilai kontrak proyek:{" "}
              <strong>{formatRupiah(project.contract_value)}</strong>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveMilestones}>
            <FieldGroup>
              <div className="flex justify-end">
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
              <div className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
                {draftMilestones.map((ms, idx) => (
                  <div
                    key={idx}
                    className="grid items-end gap-2 rounded-lg border p-3 sm:grid-cols-12"
                  >
                    <div className="sm:col-span-4">
                      <Input
                        placeholder="Nama Termin"
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
                    <div className="sm:col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="%"
                        value={ms.percentage}
                        onChange={(e) => {
                          const pct = Number(e.target.value);
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
                    <div className="sm:col-span-3">
                      <Input
                        type="number"
                        placeholder="Nominal Rp"
                        value={ms.amount}
                        onChange={(e) =>
                          setDraftMilestones((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, amount: Number(e.target.value) }
                                : x,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="flex items-center gap-1 sm:col-span-3">
                      <Input
                        placeholder="Kriteria"
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
                          onClick={() =>
                            setDraftMilestones((prev) =>
                              prev.filter((_, i) => i !== idx),
                            )
                          }
                        >
                          <Trash2Icon className="size-4 text-destructive" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Total Persentase: {sumDraftMsPct}%</span>
                <StatusBadge
                  tone={sumDraftMsPct === 100 ? "success" : "destructive"}
                  label={
                    sumDraftMsPct === 100
                      ? "Tepat 100% (BR-17)"
                      : "Wajib 100%"
                  }
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMsDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={savingMs || sumDraftMsPct !== 100}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Catat Persentase Penyelesaian Proyek</DialogTitle>
            <DialogDescription>
              Sistem menghitung selisih pendapatan kumulatif terhadap periode
              sebelumnya dan menerbitkan jurnal akrual otomatis.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordProgress}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="prog-date">
                  Tanggal Pengakuan Akhir Periode
                </FieldLabel>
                <Input
                  id="prog-date"
                  type="date"
                  required
                  value={progressDate}
                  onChange={(e) => setProgressDate(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="prog-pct">
                  Persentase Penyelesaian Kumulatif (0% – 100%)
                </FieldLabel>
                <Input
                  id="prog-pct"
                  type="number"
                  step="0.01"
                  min={maxProgressPct}
                  max={100}
                  required
                  value={cumulativePct}
                  onChange={(e) => setCumulativePct(Number(e.target.value))}
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
                  <Input
                    id="prog-exact-val"
                    type="number"
                    min={0}
                    max={project.contract_value}
                    value={exactRevenueOverride}
                    onChange={(e) =>
                      setExactRevenueOverride(Number(e.target.value))
                    }
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
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setProgDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={savingProg}>
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Terbitkan Quotation Penawaran Harga</DialogTitle>
            <DialogDescription>
              Dokumen standar Lampiran A.1 tanpa pengenaan PPN (Non-PKP).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateQuotation}>
            <FieldGroup>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="qt-date">Tanggal Quotation</FieldLabel>
                  <Input
                    id="qt-date"
                    type="date"
                    required
                    value={qtDate}
                    onChange={(e) => setQtDate(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="qt-valid">Masa Berlaku s.d.</FieldLabel>
                  <Input
                    id="qt-valid"
                    type="date"
                    required
                    value={qtValidUntil}
                    onChange={(e) => setQtValidUntil(e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="qt-w">Estimasi Durasi (Minggu)</FieldLabel>
                  <Input
                    id="qt-w"
                    type="number"
                    min={1}
                    value={qtWeeks}
                    onChange={(e) => setQtWeeks(Number(e.target.value))}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="qt-rev">Batas Revisi</FieldLabel>
                  <Input
                    id="qt-rev"
                    type="number"
                    min={0}
                    value={qtRevisions}
                    onChange={(e) => setQtRevisions(Number(e.target.value))}
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
                      <Input
                        type="number"
                        min={0}
                        value={it.costAmount}
                        onChange={(e) =>
                          setQtItems((prev) =>
                            prev.map((x, i) =>
                              i === idx
                                ? { ...x, costAmount: Number(e.target.value) }
                                : x,
                            ),
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              </Field>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQtDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={savingQt}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rekam Dokumen SoW atau SPK</DialogTitle>
            <DialogDescription>
              Dokumen ini dapat diunduh pula oleh klien melalui Portal Pembeli
              menggunakan kode PO terverifikasi.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateDoc}>
            <FieldGroup>
              <Field>
                <FieldLabel>Jenis Dokumen</FieldLabel>
                <Select
                  value={docType}
                  onValueChange={(v) => setDocType(v as "SOW" | "SPK")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="SOW">
                        SoW — Statement of Work (Lampiran A.2)
                      </SelectItem>
                      <SelectItem value="SPK">
                        SPK — Surat Perintah Kerja (Lampiran A.3)
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="doc-title">Judul Dokumen</FieldLabel>
                <Input
                  id="doc-title"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder={`${docType} Pengembangan ${project.name}`}
                />
              </Field>
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
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDocDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={savingDoc}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Berita Acara Kemajuan Pekerjaan (BAKP)</DialogTitle>
            <DialogDescription>
              Digunakan sebagai dasar penerbitan Invoice Termin (BR-14).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBakp}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="bakp-date">Tanggal BAKP</FieldLabel>
                <Input
                  id="bakp-date"
                  type="date"
                  required
                  value={bakpDate}
                  onChange={(e) => setBakpDate(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Termin Terkait</FieldLabel>
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
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="bakp-pct">Capaian Kumulatif (%)</FieldLabel>
                  <Input
                    id="bakp-pct"
                    type="number"
                    step="0.01"
                    value={bakpCumPct}
                    onChange={(e) => setBakpCumPct(Number(e.target.value))}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="bakp-amt">
                    Nilai Tagihan Termin (Rp)
                  </FieldLabel>
                  <Input
                    id="bakp-amt"
                    type="number"
                    value={bakpBillable}
                    onChange={(e) => setBakpBillable(Number(e.target.value))}
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
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBakpDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={savingBakp}>
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Catat Checklist Pengujian UAT</DialogTitle>
            <DialogDescription>
              Dokumentasikan pengujian penerimaan pengguna bersama klien
              (Lampiran A.7).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUat}>
            <FieldGroup>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="uat-date">Tanggal Pengujian</FieldLabel>
                  <Input
                    id="uat-date"
                    type="date"
                    required
                    value={uatDate}
                    onChange={(e) => setUatDate(e.target.value)}
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
                  <FieldLabel htmlFor="uat-tester">Nama Penguji Klien</FieldLabel>
                  <Input
                    id="uat-tester"
                    required
                    value={uatClientTester}
                    onChange={(e) => setUatClientTester(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="uat-comp">Pendamping Altvira</FieldLabel>
                  <Input
                    id="uat-comp"
                    required
                    value={uatCompanion}
                    onChange={(e) => setUatCompanion(e.target.value)}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel>Kesimpulan UAT</FieldLabel>
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
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUatDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={savingUat}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terbitkan Berita Acara Serah Terima (BAST)</DialogTitle>
            <DialogDescription>
              Hanya UAT berstatus Diterima yang mengizinkan penerbitan BAST
              (FR-PK8).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBast}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="bast-date">Tanggal BAST</FieldLabel>
                <Input
                  id="bast-date"
                  type="date"
                  required
                  value={bastDate}
                  onChange={(e) => setBastDate(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Referensi Dokumen UAT</FieldLabel>
                <Select value={bastUatId} onValueChange={setBastUatId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih UAT" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {bundle.uatList.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.uat_number} ({u.conclusion})
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
                <Input
                  id="bast-war"
                  type="number"
                  min={0}
                  value={bastWarrantyDays}
                  onChange={(e) => setBastWarrantyDays(Number(e.target.value))}
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
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBastDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={savingBast}>
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
    </div>
  );
}
