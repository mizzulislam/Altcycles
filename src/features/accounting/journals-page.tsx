import * as React from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangleIcon,
  ArrowUpDownIcon,
  CheckCircle2Icon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  ScaleIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { type SemanticTone } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
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
import { DatePicker } from "@/components/ui/date-picker";
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
  listAccounts,
  listProjects,
} from "@/lib/data-service";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { downloadCsvFile } from "@/lib/csv-exporter";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { formatDateID, formatRupiah, roundRupiah } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  createCorrectionJournalEntry,
  createManualOrAdjustmentJournal,
  deleteJournals,
  listJournalsWithLines,
  recordExportLog,
  updateJournal,
} from "@/lib/operations-service";
import type {
  AccountRow,
  CompanyProfileRow,
  JournalLineRow,
  JournalRow,
  JournalType,
  ProjectRow,
} from "@/types/database.types";

export const JOURNAL_TYPE_LABELS: Record<
  JournalType,
  { label: string; tone: SemanticTone }
> = {
  general: { label: "Jurnal Umum", tone: "secondary" },
  adjustment: { label: "Jurnal Penyesuaian", tone: "info" },
  correction: { label: "Jurnal Koreksi", tone: "warning" },
  closing: { label: "Jurnal Penutup", tone: "outline" },
  reversing: { label: "Jurnal Pembalik", tone: "secondary" },
  auto_invoice: { label: "Otomatis: Invoice", tone: "info" },
  auto_receipt: { label: "Otomatis: Penerimaan Kas", tone: "success" },
  auto_expense: { label: "Otomatis: Beban PA", tone: "warning" },
  auto_payment: { label: "Otomatis: Pelunasan PA", tone: "success" },
  progress_billing: { label: "Progress Billing", tone: "info" },
  elimination: { label: "Eliminasi Selesai 100%", tone: "success" },
  profit_sharing: { label: "Bagi Hasil Proyek", tone: "info" },
};

interface DraftLineEntry {
  accountId: string;
  amount: string;
}

function formatJournalDate(val: string | null | undefined): string {
  if (!val) return "-";
  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  const parts = val.split("-");
  const y = parts[0];
  const mStr = parts[1];
  const d = parts[2];
  if (y && mStr && d) {
    const monthIdx = parseInt(mStr, 10) - 1;
    const m = months[monthIdx] ?? mStr;
    return `${d}/${m}/${y}`;
  }
  return formatDateID(val);
}

export interface JournalsPageProps {
  initialTypeFilter?: string;
  hideHeader?: boolean;
  filterMode?: "all" | "adjusting";
  externalPeriodFilter?: string;
  externalStartDate?: string;
  externalEndDate?: string;
  externalProjectFilter?: string;
  externalTypeFilter?: string;
}

export function JournalsPage({
  initialTypeFilter = "ALL",
  hideHeader: _hideHeader = false,
  filterMode = "all",
  externalPeriodFilter,
  externalStartDate,
  externalEndDate,
  externalProjectFilter,
  externalTypeFilter,
}: JournalsPageProps = {}) {
  const [journals, setJournals] = React.useState<JournalRow[]>([]);
  const [lines, setLines] = React.useState<JournalLineRow[]>([]);
  const [accounts, setAccounts] = React.useState<AccountRow[]>([]);
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [company, setCompany] = React.useState<CompanyProfileRow | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const [periodFilter] = React.useState("ALL");
  const [projectFilter] = React.useState("ALL");
  const [typeFilter] = React.useState(
    filterMode === "adjusting" ? "adjustment" : initialTypeFilter,
  );
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");

  // Form Jurnal Baru & Edit (Umum / Penyesuaian)
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingJournal, setEditingJournal] = React.useState<JournalRow | null>(
    null,
  );
  const [journalDate, setJournalDate] = React.useState("2026-11-30");
  const [journalType, setJournalType] = React.useState<"general" | "adjustment">(
    "general",
  );
  const [description, setDescription] = React.useState("");
  const [autoReverse, setAutoReverse] = React.useState(false);
  const [draftDebits, setDraftDebits] = React.useState<DraftLineEntry[]>([
    { accountId: "", amount: "" },
  ]);
  const [draftCredits, setDraftCredits] = React.useState<DraftLineEntry[]>([
    { accountId: "", amount: "" },
  ]);
  const [posting, setPosting] = React.useState(false);

  // Mode Edit Riwayat & Aksi Baris (Splitz style)
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [selectedJournalIds, setSelectedJournalIds] = React.useState<string[]>(
    [],
  );
  const [journalLockEnabled, setJournalLockEnabled] = React.useState(true);
  const [detailJournal, setDetailJournal] = React.useState<JournalRow | null>(
    null,
  );
  const [deleteTargetJournal, setDeleteTargetJournal] =
    React.useState<JournalRow | null>(null);
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] =
    React.useState(false);

  // Dialog Jurnal Koreksi Resmi (BR-2)
  const [correctTarget, setCorrectTarget] = React.useState<JournalRow | null>(
    null,
  );
  const [correctionDate, setCorrectionDate] = React.useState("2026-11-30");
  const [correctionReason, setCorrectionReason] = React.useState("");
  const [correcting, setCorrecting] = React.useState(false);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [jRes, accs, prjRes, comp] = await Promise.all([
        listJournalsWithLines(),
        listAccounts(),
        listProjects(),
        getCompanyProfile(),
      ]);
      setJournals(jRes.journals);
      setLines(jRes.lines);
      setAccounts(accs);
      setProjects(prjRes.projects);
      setCompany(comp);
      setJournalLockEnabled(comp.journal_lock_enabled !== false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memuat daftar jurnal.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const postableAccounts = React.useMemo(
    () => accounts.filter((a) => a.is_active && a.is_postable),
    [accounts],
  );
  const accountMap = React.useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );
  const projectMap = React.useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  );

  const canUseAutoReverse = journalType === "adjustment";

  function openNewJournal() {
    setEditingJournal(null);
    const firstAcc = postableAccounts[0]?.id ?? "";
    const secondAcc = postableAccounts[1]?.id ?? firstAcc;
    setJournalDate("2026-11-30");
    setJournalType(filterMode === "adjusting" ? "adjustment" : "general");
    setDescription("");
    setAutoReverse(false);
    setDraftDebits([{ accountId: firstAcc, amount: "" }]);
    setDraftCredits([{ accountId: secondAcc, amount: "" }]);
    setCreateOpen(true);
  }

  function openEditJournal(j: JournalRow) {
    if (journalLockEnabled) {
      toast.error(
        "Kunci jurnal sedang aktif. Untuk mengedit atau menghapus transaksi jurnal, Super Admin perlu membuka kunci jurnal di menu Pengaturan & Kontrol Akuntansi.",
      );
      return;
    }
    setEditingJournal(j);
    setJournalDate(j.journal_date);
    setJournalType(j.journal_type === "adjustment" ? "adjustment" : "general");
    setDescription(j.description || "");
    setAutoReverse(Boolean(j.auto_reverse_next_period));

    const jLines = lines
      .filter((l) => l.journal_id === j.id)
      .sort((a, b) => a.line_no - b.line_no);
    const debLines = jLines.filter((l) => l.debit > 0);
    const credLines = jLines.filter((l) => l.credit > 0);

    setDraftDebits(
      debLines.length > 0
        ? debLines.map((l) => ({
            accountId: l.account_id,
            amount: String(l.debit),
          }))
        : [{ accountId: postableAccounts[0]?.id ?? "", amount: "" }],
    );
    setDraftCredits(
      credLines.length > 0
        ? credLines.map((l) => ({
            accountId: l.account_id,
            amount: String(l.credit),
          }))
        : [
            {
              accountId:
                postableAccounts[1]?.id ?? postableAccounts[0]?.id ?? "",
              amount: "",
            },
          ],
    );
    setCreateOpen(true);
  }

  function addDebitRow() {
    setDraftDebits((prev) => [
      ...prev,
      { accountId: postableAccounts[0]?.id ?? "", amount: "" },
    ]);
  }

  function removeDebitRow(idx: number) {
    if (draftDebits.length > 1) {
      setDraftDebits((prev) => prev.filter((_, i) => i !== idx));
    }
  }

  function updateDebitRow(idx: number, patch: Partial<DraftLineEntry>) {
    setDraftDebits((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    );
  }

  function addCreditRow() {
    setDraftCredits((prev) => [
      ...prev,
      {
        accountId: postableAccounts[1]?.id ?? postableAccounts[0]?.id ?? "",
        amount: "",
      },
    ]);
  }

  function removeCreditRow(idx: number) {
    if (draftCredits.length > 1) {
      setDraftCredits((prev) => prev.filter((_, i) => i !== idx));
    }
  }

  function updateCreditRow(idx: number, patch: Partial<DraftLineEntry>) {
    setDraftCredits((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    );
  }

  const totalDraftDebit = draftDebits.reduce(
    (s, d) => s + (Number(d.amount) || 0),
    0,
  );
  const totalDraftCredit = draftCredits.reduce(
    (s, c) => s + (Number(c.amount) || 0),
    0,
  );
  const isDraftBalanced =
    totalDraftDebit > 0 && Math.abs(totalDraftDebit - totalDraftCredit) < 1;
  const balanceDiff = Math.abs(totalDraftDebit - totalDraftCredit);

  async function handlePostJournal(e: React.FormEvent) {
    e.preventDefault();
    if (!isDraftBalanced) {
      toast.error(
        "Jurnal belum seimbang: Total Debit wajib sama dengan Total Kredit dan bernilai di atas Rp0.",
      );
      return;
    }
    setPosting(true);
    try {
      const linesPayload = [
        ...draftDebits
          .filter((d) => d.accountId && Number(d.amount) > 0)
          .map((d) => ({
            accountId: d.accountId,
            description: description.trim(),
            debit: roundRupiah(Number(d.amount)),
            credit: 0,
          })),
        ...draftCredits
          .filter((c) => c.accountId && Number(c.amount) > 0)
          .map((c) => ({
            accountId: c.accountId,
            description: description.trim(),
            debit: 0,
            credit: roundRupiah(Number(c.amount)),
          })),
      ];

      if (editingJournal) {
        await updateJournal({
          journalId: editingJournal.id,
          journalDate,
          journalType,
          description,
          projectId: editingJournal.project_id,
          autoReverseNextPeriod: canUseAutoReverse ? autoReverse : false,
          lines: linesPayload,
        });
        toast.success(
          `Jurnal ${editingJournal.journal_number} berhasil diperbarui.`,
        );
      } else {
        await createManualOrAdjustmentJournal({
          journalDate,
          journalType,
          description,
          projectId: null,
          autoReverseNextPeriod: canUseAutoReverse ? autoReverse : false,
          lines: linesPayload,
        });
        toast.success("Jurnal berhasil diposting ke Buku Besar.");
      }
      setCreateOpen(false);
      setEditingJournal(null);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan jurnal.",
      );
    } finally {
      setPosting(false);
    }
  }

  async function handleDeleteSingle(journal: JournalRow) {
    if (journalLockEnabled) {
      toast.error(
        "Kunci jurnal sedang aktif. Jurnal tidak dapat dihapus saat kunci jurnal aktif. Hubungi Super Admin di Pengaturan & Kontrol Akuntansi untuk membuka mode testing.",
      );
      return;
    }
    try {
      await deleteJournals([journal.id]);
      toast.success(`Jurnal ${journal.journal_number} berhasil dihapus.`);
      setSelectedJournalIds((prev) => prev.filter((id) => id !== journal.id));
      setDeleteTargetJournal(null);
      setIsEditMode(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menghapus jurnal.",
      );
    }
  }

  async function handleDeleteBatch() {
    if (selectedJournalIds.length === 0) return;
    if (journalLockEnabled) {
      toast.error(
        "Kunci jurnal sedang aktif. Jurnal tidak dapat dihapus saat kunci jurnal aktif. Hubungi Super Admin di Pengaturan & Kontrol Akuntansi untuk membuka mode testing.",
      );
      return;
    }
    try {
      await deleteJournals(selectedJournalIds);
      toast.success(
        `${selectedJournalIds.length} transaksi jurnal berhasil dihapus.`,
      );
      setSelectedJournalIds([]);
      setIsBatchDeleteDialogOpen(false);
      setIsEditMode(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menghapus jurnal pilihan.",
      );
    }
  }

  async function handleCreateCorrection(e: React.FormEvent) {
    e.preventDefault();
    if (!correctTarget) return;
    setCorrecting(true);
    try {
      await createCorrectionJournalEntry({
        originalJournalId: correctTarget.id,
        correctionDate,
        reason: correctionReason,
      });
      toast.success(
        `Jurnal koreksi resmi atas ${correctTarget.journal_number} berhasil diposting.`,
      );
      setCorrectTarget(null);
      setCorrectionReason("");
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menerbitkan jurnal koreksi.",
      );
    } finally {
      setCorrecting(false);
    }
  }

  const filteredJournals = React.useMemo(() => {
    return journals.filter((j) => {
      const activePeriod =
        externalPeriodFilter && externalPeriodFilter !== "all"
          ? externalPeriodFilter
          : periodFilter;
      if (
        activePeriod !== "ALL" &&
        activePeriod !== "all" &&
        j.period_id !== activePeriod
      ) {
        return false;
      }
      if (externalStartDate && j.journal_date < externalStartDate) return false;
      if (externalEndDate && j.journal_date > externalEndDate) return false;

      const activePrj = externalProjectFilter ?? projectFilter;
      if (activePrj !== "ALL" && j.project_id !== activePrj) return false;

      // Pemisahan Tab AJP vs Jurnal Umum
      if (filterMode === "adjusting") {
        // Tab Jurnal Penyesuaian: HANYA menampilkan jurnal bertipe penyesuaian (adjustment)
        if (j.journal_type !== "adjustment") return false;
      } else {
        // Tab Jurnal Umum
        const activeType = externalTypeFilter ?? typeFilter;
        if (activeType === "ALL") {
          // Default Jurnal Umum: tampilkan seluruh transaksi umum harian operasional (bukan penyesuaian)
          if (j.journal_type === "adjustment") return false;
        } else if (j.journal_type !== activeType) {
          return false;
        }
      }

      return true;
    });
  }, [
    journals,
    filterMode,
    periodFilter,
    externalPeriodFilter,
    externalStartDate,
    externalEndDate,
    projectFilter,
    externalProjectFilter,
    typeFilter,
    externalTypeFilter,
  ]);

  const sortedJournals = React.useMemo(() => {
    return [...filteredJournals].sort((a, b) => {
      if (sortOrder === "asc") {
        return (
          a.journal_date.localeCompare(b.journal_date) ||
          a.journal_number.localeCompare(b.journal_number)
        );
      }
      return (
        b.journal_date.localeCompare(a.journal_date) ||
        b.journal_number.localeCompare(a.journal_number)
      );
    });
  }, [filteredJournals, sortOrder]);

  const printAreaId = `altcycles-journal-print-${filterMode}`;

  const printPeriodLabel =
    externalStartDate && externalEndDate
      ? `${formatDateID(externalStartDate)} s.d. ${formatDateID(externalEndDate)}`
      : periodFilter === "ALL"
        ? "Semua Periode"
        : periodFilter;

  const printDocTitle =
    filterMode === "adjusting"
      ? "Jurnal Penyesuaian & Koreksi"
      : "Jurnal Umum";

  const printBrandName = company?.company_name
    ? company.company_name.toUpperCase()
    : "ALTVIRA TECHNOLOGY";

  function handleExportPdf() {
    setTimeout(() => {
      window.print();
    }, 60);
    void recordExportLog("JOURNALS", "PDF", periodFilter);
  }

  async function handleExportExcel() {
    const exportRows: Array<Array<string | number>> = [];
    for (const j of filteredJournals) {
      const jLines = lines
        .filter((l) => l.journal_id === j.id)
        .sort((a, b) => a.line_no - b.line_no);
      const prj = j.project_id ? projectMap.get(j.project_id) : undefined;
      for (const l of jLines) {
        const acc = accountMap.get(l.account_id);
        exportRows.push([
          j.journal_number,
          formatDateID(j.journal_date),
          JOURNAL_TYPE_LABELS[j.journal_type].label,
          prj ? prj.code : "-",
          acc ? `${acc.code}: ${acc.name}` : "-",
          l.description || j.description,
          l.debit,
          l.credit,
        ]);
      }
    }

    await downloadExcelSheet({
      fileName: "Jurnal_Akuntansi_Altcycles.xlsx",
      sheetName: "Jurnal Akuntansi",
      columns: [
        { header: "No. Jurnal", width: 20 },
        { header: "Tanggal", width: 14 },
        { header: "Jenis Jurnal", width: 24 },
        { header: "Proyek", width: 16 },
        { header: "Akun", width: 32 },
        { header: "Uraian", width: 36 },
        { header: "Debit (Rp)", width: 18 },
        { header: "Kredit (Rp)", width: 18 },
      ],
      rows: exportRows,
    });
    await recordExportLog("JOURNALS", "EXCEL", periodFilter);
    toast.success("Jurnal akuntansi berhasil diekspor ke Excel (.xlsx).");
  }

  async function handleExportCsv() {
    const exportRows: Array<Array<string | number>> = [];
    for (const j of sortedJournals) {
      const jLines = lines
        .filter((l) => l.journal_id === j.id)
        .sort((a, b) => a.line_no - b.line_no);
      const debitLines = jLines.filter((l) => l.debit > 0);
      const creditLines = jLines.filter((l) => l.credit > 0);

      debitLines.forEach((l, idx) => {
        const acc = accountMap.get(l.account_id);
        exportRows.push([
          idx === 0 ? formatDateID(j.journal_date) : "",
          acc?.name ?? "Akun Debit",
          acc?.code ?? "-",
          l.debit,
          "",
        ]);
      });

      creditLines.forEach((l) => {
        const acc = accountMap.get(l.account_id);
        exportRows.push([
          "",
          `    ${acc?.name ?? "Akun Kredit"}`,
          acc?.code ?? "-",
          "",
          Math.abs(l.credit),
        ]);
      });

      if (j.description) {
        exportRows.push([
          "",
          `(${j.description})`,
          "",
          "",
          "",
        ]);
      }
    }
    downloadCsvFile(
      filterMode === "adjusting"
        ? "Jurnal_Penyesuaian_Altcycles.csv"
        : "Jurnal_Umum_Altcycles.csv",
      [
        "Tanggal",
        "Deskripsi",
        "Ref",
        "Debit",
        "Kredit",
      ],
      exportRows,
    );
    await recordExportLog("JOURNALS", "CSV", periodFilter);
    toast.success("Jurnal akuntansi berhasil diekspor ke CSV (.csv).");
  }

  const journalPrintContent = (
    <div data-accounting-print-area={printAreaId} aria-hidden="true">
      <div className="print-brand">{printBrandName}</div>
      <h1>{printDocTitle}</h1>
      <div className="print-meta">
        Periode: {printPeriodLabel} | Dicetak: {new Date().toLocaleString("id-ID")}
      </div>

      <table className="print-table">
        <colgroup>
          <col style={{ width: "13%" }} />
          <col style={{ width: "45%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "16%" }} />
        </colgroup>
        <thead>
          <tr>
            <th className="print-center">Tanggal</th>
            <th className="print-center">Deskripsi</th>
            <th className="print-center">Ref</th>
            <th className="print-center">Debit</th>
            <th className="print-center">Kredit</th>
          </tr>
        </thead>
        <tbody>
          {sortedJournals.length === 0 ? (
            <tr>
              <td colSpan={5} className="print-center" style={{ padding: "28px", color: "#6b7280" }}>
                Belum ada transaksi pada periode ini.
              </td>
            </tr>
          ) : (
            sortedJournals.map((j) => {
              const jLines = lines
                .filter((l) => l.journal_id === j.id)
                .sort((a, b) => a.line_no - b.line_no);
              const debitLines = jLines.filter((l) => l.debit > 0);
              const creditLines = jLines.filter((l) => l.credit > 0);
              const journalRows = [...debitLines, ...creditLines];

              return (
                <tr key={j.id} className="align-top">
                  <td className="print-center whitespace-nowrap">
                    {formatDateID(j.journal_date)}
                  </td>
                  <td>
                    <div className="print-deskripsi-wrap">
                      {debitLines.map((row, idx) => {
                        const acc = accountMap.get(row.account_id);
                        return (
                          <div key={`d-${idx}`} className="print-account-debit">
                            {acc?.name ?? "Akun Debit"}
                          </div>
                        );
                      })}
                      {creditLines.map((row, idx) => {
                        const acc = accountMap.get(row.account_id);
                        return (
                          <div key={`c-${idx}`} className="print-account-credit">
                            {acc?.name ?? "Akun Kredit"}
                          </div>
                        );
                      })}
                    </div>
                    {j.description && (
                      <div className="print-memo">
                        ({j.description})
                      </div>
                    )}
                  </td>
                  <td className="print-center">
                    <div className="print-ref-wrap">
                      {journalRows.map((row, idx) => {
                        const acc = accountMap.get(row.account_id);
                        return (
                          <div key={`r-${idx}`} className="print-ref-item">
                            {acc?.code ?? "-"}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td>
                    <div className="print-amount-wrap">
                      {journalRows.map((row, idx) => {
                        if (row.debit > 0) {
                          return (
                            <div key={`deb-${idx}`} className="print-amount-row">
                              <span className="print-currency">Rp</span>
                              <span className="print-val">{row.debit.toLocaleString("id-ID")}</span>
                            </div>
                          );
                        }
                        return (
                          <div key={`deb-blank-${idx}`} className="print-amount-row print-blank" aria-hidden="true">
                            <span className="print-currency">Rp</span>
                            <span className="print-val">0</span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td>
                    <div className="print-amount-wrap">
                      {journalRows.map((row, idx) => {
                        if (row.credit > 0) {
                          return (
                            <div key={`cred-${idx}`} className="print-amount-row">
                              <span className="print-currency">Rp</span>
                              <span className="print-val">{Math.abs(row.credit).toLocaleString("id-ID")}</span>
                            </div>
                          );
                        }
                        return (
                          <div key={`cred-blank-${idx}`} className="print-amount-row print-blank" aria-hidden="true">
                            <span className="print-currency">Rp</span>
                            <span className="print-val">0</span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {filterMode === "adjusting"
              ? "Riwayat Jurnal Penyesuaian & Koreksi"
              : "Riwayat Jurnal Umum"}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
            {filterMode === "adjusting"
              ? "Kelola penyesuaian akrual, amortisasi, dan penerbitan jurnal koreksi transaksi dengan jejak audit."
              : "Daftar historis seluruh transaksi akuntansi keuangan secara kronologis."}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
          <ExportDownloadMenu
            label="Unduh / Ekspor"
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            onExportCsv={handleExportCsv}
          />
          <Button
            type="button"
            onClick={openNewJournal}
            className="h-9 px-4 rounded-xl text-xs sm:text-sm font-semibold shrink-0 cursor-pointer shadow-xs gap-2"
          >
            <PlusIcon className="size-4" />
            <span>{filterMode === "adjusting" ? "Catat Jurnal Penyesuaian" : "Catat Transaksi"}</span>
          </Button>
        </div>
      </div>

      {/* Penerapan Asumsi Akuntansi (IFRS & PSAK) - Tampil pada Tab Jurnal Penyesuaian (Splitz Style) */}
      {filterMode === "adjusting" && (
        <Card className="p-5 border-border/80 bg-card shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <SlidersHorizontalIcon className="size-4 text-primary dark:text-cyan-400" />
            <h3 className="font-bold text-sm text-foreground">
              Penerapan Asumsi Akuntansi (IFRS &amp; PSAK)
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                <h4 className="font-semibold text-xs text-foreground">Periodisitas (Periodicity)</h4>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Membagi aktivitas ekonomi entitas ke dalam periode waktu bulanan/tahunan untuk penyajian laporan yang tepat waktu dan relevan.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                <h4 className="font-semibold text-xs text-foreground">Penangguhan (Deferral)</h4>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Pendapatan diterima dimuka dicatat sebagai kewajiban dan direalisasikan bertahap menjadi pendapatan pada periode manfaat.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                <h4 className="font-semibold text-xs text-foreground">Asas Akrual (Accrual Basis)</h4>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Mencatat pengaruh transaksi pada periode terjadinya, bukan sekadar saat kas diterima atau dikeluarkan, guna mencerminkan posisi keuangan yang andal.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                <h4 className="font-semibold text-xs text-foreground">Depresiasi (Depreciation)</h4>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Mengalokasikan harga perolehan aset tetap secara berkala ke Beban Penyusutan berpasangan dengan Akumulasi Penyusutan.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-4.5 border-b border-border/60 gap-3">
          <CardTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground">
            {filterMode === "adjusting"
              ? "Buku Jurnal Penyesuaian (AJP)"
              : "Buku Jurnal Harian"}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
              }
              className="gap-1.5 text-xs font-medium cursor-pointer shrink-0"
            >
              <ArrowUpDownIcon className="size-3.5" />
              <span>Urutan: {sortOrder === "asc" ? "Terlama" : "Terbaru"}</span>
            </Button>

            {sortedJournals.length === 0 && !isEditMode ? null : !isEditMode ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditMode(true)}
                className="gap-1.5 text-xs font-medium cursor-pointer text-primary dark:text-sky-400 bg-primary/10 hover:bg-primary/15 border-primary/25 transition-colors shadow-xs"
              >
                <PencilIcon className="size-3.5" />
                <span>Edit</span>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditMode(false);
                    setSelectedJournalIds([]);
                  }}
                  className="text-xs font-medium cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsBatchDeleteDialogOpen(true)}
                  disabled={selectedJournalIds.length === 0}
                  className="text-xs font-medium cursor-pointer"
                >
                  Hapus Pilihan ({selectedJournalIds.length})
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="w-full min-w-[680px] table-fixed">
            <TableHeader className="bg-muted/30">
              <TableRow>
                {isEditMode && (
                  <TableHead className="w-12 text-center align-middle px-3">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={
                          sortedJournals.length > 0 &&
                          selectedJournalIds.length === sortedJournals.length
                        }
                        indeterminate={
                          selectedJournalIds.length > 0 &&
                          selectedJournalIds.length < sortedJournals.length
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedJournalIds(
                              sortedJournals.map((j) => j.id),
                            );
                          } else {
                            setSelectedJournalIds([]);
                          }
                        }}
                        aria-label="Pilih semua transaksi"
                      />
                    </div>
                  </TableHead>
                )}
                <TableHead className="w-[120px] text-center pl-6 pr-3 font-semibold text-xs sm:text-sm text-foreground/80">
                  Tanggal
                </TableHead>
                <TableHead className="text-center px-4 font-semibold text-xs sm:text-sm text-foreground/80">
                  Deskripsi
                </TableHead>
                <TableHead className="w-[82px] text-center font-semibold text-xs sm:text-sm text-foreground/80">
                  Ref
                </TableHead>
                <TableHead className="w-[155px] text-center px-4 font-semibold text-xs sm:text-sm text-foreground/80">
                  Debit
                </TableHead>
                <TableHead className="w-[155px] text-center pl-4 pr-6 font-semibold text-xs sm:text-sm text-foreground/80">
                  Kredit
                </TableHead>
                {isEditMode && (
                  <TableHead className="w-[112px] text-center pr-6 font-semibold text-xs sm:text-sm text-foreground/80">
                    Aksi
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={isEditMode ? 7 : 5}
                      className="h-32 text-center text-muted-foreground"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Spinner />
                        <span>Memuat buku jurnal...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sortedJournals.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isEditMode ? 7 : 5}
                      className="h-36 text-center text-muted-foreground"
                    >
                      <EmptyState
                        title={
                          filterMode === "adjusting"
                            ? "Belum ada Ayat Jurnal Penyesuaian (AJP)"
                            : "Belum ada transaksi jurnal umum pada periode ini"
                        }
                        description={
                          filterMode === "adjusting"
                            ? "Gunakan tombol 'Catat Jurnal Penyesuaian' untuk menambahkan penyesuaian beban akrual, amortisasi, atau pengakuan pendapatan sewa/jasa di muka."
                            : "Gunakan tombol 'Catat Transaksi' atau sesuaikan saringan periode dan proyek."
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedJournals.map((j) => {
                    const jLines = lines
                      .filter((l) => l.journal_id === j.id)
                      .sort((a, b) => a.line_no - b.line_no);
                    const debitLines = jLines.filter((l) => l.debit > 0);
                    const creditLines = jLines.filter((l) => l.credit > 0);
                    const journalRows = [...debitLines, ...creditLines];

                    return (
                      <TableRow
                        key={j.id}
                        className="hover:bg-muted/20 border-b border-border/60 transition-colors"
                      >
                        {/* Checkbox Kolom Pilihan saat Edit Mode */}
                        {isEditMode && (
                          <TableCell className="align-top py-4 text-center px-3">
                            <Checkbox
                              checked={selectedJournalIds.includes(j.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedJournalIds([
                                    ...selectedJournalIds,
                                    j.id,
                                  ]);
                                } else {
                                  setSelectedJournalIds(
                                    selectedJournalIds.filter(
                                      (id) => id !== j.id,
                                    ),
                                  );
                                }
                              }}
                              className="mt-0.5"
                              aria-label={`Pilih transaksi ${j.journal_number}`}
                            />
                          </TableCell>
                        )}

                        {/* TANGGAL: Left-up / top-left alignment */}
                        <TableCell className="align-top py-4 pl-6 pr-3 text-left whitespace-nowrap">
                          <span className="font-medium text-xs sm:text-sm text-foreground">
                            {formatJournalDate(j.journal_date)}
                          </span>
                        </TableCell>

                        {/* DESKRIPSI */}
                        <TableCell className="align-top py-4 px-4 min-w-0">
                          <div className="space-y-1.5 text-xs sm:text-sm leading-5">
                            {debitLines.map((row, idx) => {
                              const acc = accountMap.get(row.account_id);
                              return (
                                <div
                                  key={`d-${idx}`}
                                  className="text-foreground font-medium min-h-5 flex items-center whitespace-normal break-words"
                                >
                                  {acc?.name ?? "Akun Debit"}
                                </div>
                              );
                            })}
                            {creditLines.map((row, idx) => {
                              const acc = accountMap.get(row.account_id);
                              return (
                                <div
                                  key={`c-${idx}`}
                                  className="text-foreground font-medium min-h-5 flex items-center pl-6 whitespace-normal break-words"
                                >
                                  {acc?.name ?? "Akun Kredit"}
                                </div>
                              );
                            })}
                          </div>
                          {/* Keterangan di bawah baris kredit (membungkus rapi 2 baris jika panjang) */}
                          <div className="mt-2 max-w-[54ch] text-xs leading-relaxed text-blue-600 dark:text-cyan-400 italic font-medium whitespace-normal break-words">
                            ({j.description})
                          </div>
                        </TableCell>

                        {/* REF - seragam font sistem (tanpa font-mono) */}
                        <TableCell className="align-top py-4 text-center whitespace-nowrap">
                          <div className="space-y-1.5 text-xs sm:text-sm leading-5">
                            {journalRows.map((row, idx) => {
                              const acc = accountMap.get(row.account_id);
                              return (
                                <div
                                  key={`ref-${idx}`}
                                  className="text-muted-foreground min-h-5 flex items-center justify-center text-xs tabular-nums"
                                >
                                  {acc?.code ?? "-"}
                                </div>
                              );
                            })}
                          </div>
                        </TableCell>

                        {/* DEBIT - seragam font sistem (tanpa font-mono) */}
                        <TableCell className="align-top py-4 px-4 text-right whitespace-nowrap">
                          <div className="space-y-1.5 text-xs sm:text-sm leading-5">
                            {journalRows.map((row, idx) => {
                              if (row.debit > 0) {
                                return (
                                  <div
                                    key={`deb-${idx}`}
                                    className="text-foreground font-medium flex justify-between w-full min-h-5 items-center text-xs tabular-nums"
                                  >
                                    <span className="text-muted-foreground mr-2 font-normal">
                                      Rp
                                    </span>
                                    <span>
                                      {row.debit.toLocaleString("id-ID")}
                                    </span>
                                  </div>
                                );
                              }
                              return (
                                <div
                                  key={`deb-blank-${idx}`}
                                  className="text-transparent select-none flex justify-between w-full min-h-5 items-center text-xs"
                                >
                                  <span>Rp</span>
                                  <span>-</span>
                                </div>
                              );
                            })}
                          </div>
                        </TableCell>

                        {/* KREDIT - seragam font sistem (tanpa font-mono) */}
                        <TableCell className="align-top py-4 pl-4 pr-6 text-right whitespace-nowrap">
                          <div className="space-y-1.5 text-xs sm:text-sm leading-5">
                            {journalRows.map((row, idx) => {
                              if (row.credit > 0) {
                                return (
                                  <div
                                    key={`cred-${idx}`}
                                    className="text-foreground font-medium flex justify-between w-full min-h-5 items-center text-xs tabular-nums"
                                  >
                                    <span className="text-muted-foreground mr-2 font-normal">
                                      Rp
                                    </span>
                                    <span>
                                      {row.credit.toLocaleString("id-ID")}
                                    </span>
                                  </div>
                                );
                              }
                              return (
                                <div
                                  key={`cred-blank-${idx}`}
                                  className="text-transparent select-none flex justify-between w-full h-5 items-center text-xs"
                                >
                                  <span>Rp</span>
                                  <span>-</span>
                                </div>
                              );
                            })}
                          </div>
                        </TableCell>

                        {/* AKSI - Kolom baru saat mode edit aktif: 3 button (Lihat, Edit, Hapus) */}
                        {isEditMode && (
                          <TableCell className="align-top py-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setDetailJournal(j)}
                                className="p-1.5 text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-500/20"
                                title="Lihat detail transaksi"
                                aria-label="Lihat detail transaksi"
                              >
                                <EyeIcon className="size-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditJournal(j)}
                                className="p-1.5 text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-sky-500/20"
                                title="Edit transaksi"
                                aria-label="Edit transaksi"
                              >
                                <PencilIcon className="size-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTargetJournal(j)}
                                className="p-1.5 text-rose-600 hover:text-rose-500 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-500/20"
                                title="Hapus transaksi"
                                aria-label="Hapus transaksi"
                              >
                                <Trash2Icon className="size-4" />
                              </button>
                            </div>
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

      {/* Dialog Entri Jurnal Umum / Penyesuaian */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setEditingJournal(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingJournal
                ? `Edit Transaksi Jurnal (${editingJournal.journal_number})`
                : filterMode === "adjusting"
                  ? "Buat & Posting Jurnal Penyesuaian (AJP)"
                  : "Buat & Posting Jurnal Baru"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePostJournal}>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="j-date" required>Tanggal Jurnal</FieldLabel>
                  <DatePicker
                    id="j-date"
                    value={journalDate}
                    onChange={setJournalDate}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel required>Jenis Jurnal</FieldLabel>
                  <Select
                    value={journalType}
                    onValueChange={(v) =>
                      setJournalType(v as "general" | "adjustment")
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="general">Jurnal Umum</SelectItem>
                        <SelectItem value="adjustment">
                          Jurnal Penyesuaian (AJP)
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="j-desc" required>Keterangan</FieldLabel>
                <Input
                  id="j-desc"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Penyesuaian beban sewa kantor bersama bulan berjalan"
                />
              </Field>

              {journalType === "adjustment" ? (
                <Field orientation="horizontal">
                  <div className="flex flex-col gap-0.5">
                    <FieldLabel htmlFor="j-rev">
                      Tandai untuk Jurnal Pembalik Awal Periode Berikutnya (Opsional)
                    </FieldLabel>
                    <FieldDescription>
                      Diterapkan otomatis pada saat proses Tutup Buku periode berjalan.
                    </FieldDescription>
                  </div>
                  <Switch
                    id="j-rev"
                    checked={autoReverse}
                    onCheckedChange={setAutoReverse}
                  />
                </Field>
              ) : null}

              {/* Container Baris Ayat Jurnal (DEBIT & KREDIT side by side - Proporsional & Terstruktur) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* DEBIT Container */}
                <div className="rounded-xl border border-border/70 dark:border-white/10 bg-muted/20 dark:bg-white/[0.02] p-4 flex flex-col justify-between space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-border/50 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                      <span className="text-xs font-bold text-foreground tracking-wide">
                        Sisi Debit
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addDebitRow}
                      className="text-xs h-7 px-2.5 rounded-lg text-cyan-600 dark:text-cyan-300 hover:text-cyan-500 dark:hover:text-cyan-200 border-cyan-500/30 dark:border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 font-medium transition-colors cursor-pointer"
                    >
                      <PlusIcon data-icon="inline-start" className="size-3.5 mr-1" />
                      Tambah Akun
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto pr-0.5 no-scrollbar">
                    {draftDebits.map((d, idx) => (
                      <div
                        key={`deb-${idx}`}
                        className="rounded-lg border border-border/60 dark:border-white/5 bg-background/70 dark:bg-[#0c1424] p-3 space-y-2 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-muted-foreground tracking-wide">
                            Akun {draftDebits.length > 1 ? `#${idx + 1}` : "Debit"}
                          </span>
                          {draftDebits.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Hapus baris debit"
                              onClick={() => removeDebitRow(idx)}
                              className="size-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                            >
                              <Trash2Icon className="size-3.5" />
                            </Button>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Select
                            value={d.accountId}
                            onValueChange={(val) =>
                              updateDebitRow(idx, { accountId: val })
                            }
                          >
                            <SelectTrigger className="w-full text-xs sm:text-sm">
                              <SelectValue placeholder="-- Pilih Akun Debit --" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {postableAccounts.map((a) => (
                                  <SelectItem key={a.id} value={a.id}>
                                    {a.code}: {a.name}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>

                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/70 font-medium pointer-events-none select-none">
                              Rp
                            </span>
                            <NumberInput
                              allowDecimal={false}
                              min={0}
                              placeholder="0"
                              value={Number(d.amount || 0)}
                              onValueChange={(val) =>
                                updateDebitRow(idx, {
                                  amount: val > 0 ? String(val) : "",
                                })
                              }
                              className="pl-8 text-xs sm:text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2.5 mt-auto border-t border-border/50 dark:border-white/5 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground text-[11px] font-medium">
                      Total Debit
                    </span>
                    <span className="font-bold text-cyan-600 dark:text-cyan-400 text-sm">
                      {formatRupiah(totalDraftDebit)}
                    </span>
                  </div>
                </div>

                {/* KREDIT Container */}
                <div className="rounded-xl border border-border/70 dark:border-white/10 bg-muted/20 dark:bg-white/[0.02] p-4 flex flex-col justify-between space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-border/50 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                      <span className="text-xs font-bold text-foreground tracking-wide">
                        Sisi Kredit
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addCreditRow}
                      className="text-xs h-7 px-2.5 rounded-lg text-blue-600 dark:text-blue-300 hover:text-blue-500 dark:hover:text-blue-200 border-blue-500/30 dark:border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 font-medium transition-colors cursor-pointer"
                    >
                      <PlusIcon data-icon="inline-start" className="size-3.5 mr-1" />
                      Tambah Akun
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto pr-0.5 no-scrollbar">
                    {draftCredits.map((c, idx) => (
                      <div
                        key={`cred-${idx}`}
                        className="rounded-lg border border-border/60 dark:border-white/5 bg-background/70 dark:bg-[#0c1424] p-3 space-y-2 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-muted-foreground tracking-wide">
                            Akun {draftCredits.length > 1 ? `#${idx + 1}` : "Kredit"}
                          </span>
                          {draftCredits.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Hapus baris kredit"
                              onClick={() => removeCreditRow(idx)}
                              className="size-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                            >
                              <Trash2Icon className="size-3.5" />
                            </Button>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Select
                            value={c.accountId}
                            onValueChange={(val) =>
                              updateCreditRow(idx, { accountId: val })
                            }
                          >
                            <SelectTrigger className="w-full text-xs sm:text-sm">
                              <SelectValue placeholder="-- Pilih Akun Kredit --" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {postableAccounts.map((a) => (
                                  <SelectItem key={a.id} value={a.id}>
                                    {a.code}: {a.name}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>

                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/70 font-medium pointer-events-none select-none">
                              Rp
                            </span>
                            <NumberInput
                              allowDecimal={false}
                              min={0}
                              placeholder="0"
                              value={Number(c.amount || 0)}
                              onValueChange={(val) =>
                                updateCreditRow(idx, {
                                  amount: val > 0 ? String(val) : "",
                                })
                              }
                              className="pl-8 text-xs sm:text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2.5 mt-auto border-t border-border/50 dark:border-white/5 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground text-[11px] font-medium">
                      Total Kredit
                    </span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                      {formatRupiah(totalDraftCredit)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modern Balance Indicator Bar (Skema Desain Altcycles) */}
              <div
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all duration-200",
                  isDraftBalanced
                    ? "bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-transparent border-cyan-500/40 dark:border-cyan-500/50 shadow-xs"
                    : "bg-muted/40 dark:bg-[#0c1322] border-border/80"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "p-1.5 rounded-lg shrink-0",
                      isDraftBalanced
                        ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <ScaleIcon className="size-4" />
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold">
                    <span className="text-cyan-600 dark:text-cyan-400">
                      D: {formatRupiah(totalDraftDebit)}
                    </span>
                    <div className="w-px h-3.5 bg-border" />
                    <span className="text-blue-600 dark:text-blue-400">
                      K: {formatRupiah(totalDraftCredit)}
                    </span>
                  </div>
                </div>

                {isDraftBalanced ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30">
                    <CheckCircle2Icon className="size-3.5" />
                    SEIMBANG
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    <AlertTriangleIcon className="size-3.5" />
                    {totalDraftDebit === 0 && totalDraftCredit === 0
                      ? "NOMINAL KOSONG"
                      : `SELISIH: ${formatRupiah(balanceDiff)}`}
                  </span>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateOpen(false);
                    setEditingJournal(null);
                  }}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={posting || !isDraftBalanced}>
                  {posting ? <Spinner data-icon="inline-start" /> : null}
                  {editingJournal ? "Simpan Perubahan" : "Rekam Transaksi"}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Jurnal Koreksi Resmi (BR-2) */}
      <Dialog
        open={Boolean(correctTarget)}
        onOpenChange={(open) => {
          if (!open) setCorrectTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Buat Jurnal Koreksi atas {correctTarget?.journal_number}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCorrection}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="corr-date" required>Tanggal Jurnal Koreksi</FieldLabel>
                <DatePicker
                  id="corr-date"
                  value={correctionDate}
                  onChange={setCorrectionDate}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="corr-reason" required>
                  Alasan Koreksi (Minimal 5 Karakter)
                </FieldLabel>
                <Textarea
                  id="corr-reason"
                  required
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="Contoh: Koreksi salah pilih akun beban pada pencatatan sebelumnya..."
                />
              </Field>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCorrectTarget(null)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={correcting}>
                  {correcting ? <Spinner data-icon="inline-start" /> : null}
                  Posting Jurnal Koreksi
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Detail Jurnal (Icon Lihat) */}
      <Dialog
        open={Boolean(detailJournal)}
        onOpenChange={(open) => {
          if (!open) setDetailJournal(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Transaksi Jurnal</DialogTitle>
          </DialogHeader>

          {detailJournal && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Nomor Jurnal
                  </span>
                  <span className="font-semibold text-foreground">
                    {detailJournal.journal_number}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Tanggal
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatDateID(detailJournal.journal_date)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Jenis Jurnal
                  </span>
                  <span className="font-semibold text-foreground">
                    {JOURNAL_TYPE_LABELS[detailJournal.journal_type]?.label ??
                      detailJournal.journal_type}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Status
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {detailJournal.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-muted-foreground">
                  Keterangan:
                </span>
                <p className="text-sm text-foreground mt-1 p-3 rounded-xl bg-muted/30 border border-border/50">
                  {detailJournal.description || "-"}
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-foreground">
                  Daftar Akun &amp; Mutasi:
                </span>
                <div className="rounded-xl border border-border/60 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-xs font-bold text-left py-2.5">
                          Akun
                        </TableHead>
                        <TableHead className="text-xs font-bold text-center w-20 py-2.5">
                          Ref
                        </TableHead>
                        <TableHead className="text-xs font-bold text-right w-32 py-2.5 pr-4">
                          Debit
                        </TableHead>
                        <TableHead className="text-xs font-bold text-right w-32 py-2.5 pr-4">
                          Kredit
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines
                        .filter((l) => l.journal_id === detailJournal.id)
                        .sort((a, b) => a.line_no - b.line_no)
                        .map((line, idx) => {
                          const acc = accountMap.get(line.account_id);
                          return (
                            <TableRow key={line.id ?? idx} className="text-xs">
                              <TableCell className="py-2.5">
                                <span
                                  className={cn(
                                    "font-medium",
                                    line.credit > 0 && "pl-5 text-muted-foreground",
                                  )}
                                >
                                  {acc
                                    ? `${acc.code} - ${acc.name}`
                                    : line.account_id}
                                </span>
                              </TableCell>
                              <TableCell className="py-2.5 text-center text-muted-foreground">
                                {acc?.code ?? "-"}
                              </TableCell>
                              <TableCell className="py-2.5 pr-4 font-medium">
                                {line.debit > 0 ? (
                                  <MonetaryCell amount={line.debit} />
                                ) : (
                                  <span className="block text-right text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="py-2.5 pr-4 font-medium">
                                {line.credit > 0 ? (
                                  <MonetaryCell amount={line.credit} />
                                ) : (
                                  <span className="block text-right text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDetailJournal(null)}
              className="rounded-xl"
            >
              Tutup
            </Button>
            {detailJournal && (
              <Button
                type="button"
                onClick={() => {
                  const target = detailJournal;
                  setDetailJournal(null);
                  openEditJournal(target);
                }}
                className="rounded-xl gap-1.5"
              >
                <PencilIcon className="size-3.5" />
                <span>Edit Transaksi</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi Hapus Single (Icon Hapus) */}
      <ConfirmActionDialog
        open={Boolean(deleteTargetJournal)}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetJournal(null);
        }}
        title="Hapus Transaksi Jurnal?"
        description={`Apakah Anda yakin ingin menghapus jurnal ${deleteTargetJournal?.journal_number ?? ""}? Seluruh baris debit dan kredit terkait akan dihapus dari buku besar. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus Jurnal"
        destructive
        onConfirm={() =>
          deleteTargetJournal ? handleDeleteSingle(deleteTargetJournal) : Promise.resolve()
        }
      />

      {/* Konfirmasi Hapus Pilihan / Batch */}
      <ConfirmActionDialog
        open={isBatchDeleteDialogOpen}
        onOpenChange={setIsBatchDeleteDialogOpen}
        title={`Hapus ${selectedJournalIds.length} Transaksi Terpilih?`}
        description={`Apakah Anda yakin ingin menghapus secara massal ${selectedJournalIds.length} transaksi jurnal yang dipilih? Seluruh data mutasi dan baris buku besar terkait akan dihapus permanen.`}
        confirmLabel={`Ya, Hapus (${selectedJournalIds.length}) Jurnal`}
        destructive
        onConfirm={handleDeleteBatch}
      />

      {/* Style & Portal Cetak Save as PDF Standar Splitz */}
      <style>
        {`
          @media screen {
            [data-accounting-print-area="${printAreaId}"] {
              display: none !important;
            }
          }

          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            @page {
              size: A4 portrait;
              margin: 15mm 20mm;
            }

            body > :not([data-accounting-print-area="${printAreaId}"]) {
              display: none !important;
            }

            body {
              background: #ffffff !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            [data-accounting-print-area="${printAreaId}"] {
              display: block !important;
              width: 100% !important;
              box-sizing: border-box !important;
              background: #ffffff !important;
              color: #1f2937 !important;
              font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif !important;
              line-height: 1.5 !important;
            }

            [data-accounting-print-area="${printAreaId}"] .print-brand {
              font-size: 11px !important;
              font-weight: 700 !important;
              color: #0B43C8 !important;
              text-transform: uppercase !important;
              letter-spacing: 0.05em !important;
              margin: 0 0 4px 0 !important;
            }

            [data-accounting-print-area="${printAreaId}"] h1 {
              margin: 0 0 6px !important;
              font-size: 22px !important;
              font-weight: 800 !important;
              color: #111827 !important;
              line-height: 1.2 !important;
            }

            [data-accounting-print-area="${printAreaId}"] .print-meta {
              margin-bottom: 20px !important;
              color: #4b5563 !important;
              font-size: 11px !important;
              border-bottom: 2px solid #0B43C8 !important;
              padding-bottom: 8px !important;
            }

            [data-accounting-print-area="${printAreaId}"] table.print-table {
              width: 100% !important;
              border-collapse: collapse !important;
              table-layout: fixed !important;
              font-size: 10.5px !important;
              margin-top: 10px !important;
            }

            [data-accounting-print-area="${printAreaId}"] th {
              border: 1px solid #d1d5db !important;
              background: #f8fafc !important;
              color: #1f2937 !important;
              padding: 8px 10px !important;
              font-weight: 700 !important;
              font-size: 11px !important;
              text-transform: uppercase !important;
              text-align: center !important;
            }

            [data-accounting-print-area="${printAreaId}"] td {
              border: 1px solid #e5e7eb !important;
              padding: 6px 8px !important;
              vertical-align: top !important;
              color: #374151 !important;
            }

            [data-accounting-print-area="${printAreaId}"] tr:nth-child(even) td {
              background-color: #fafafa !important;
            }

            [data-accounting-print-area="${printAreaId}"] .print-center {
              text-align: center !important;
            }

            [data-accounting-print-area="${printAreaId}"] .print-deskripsi-wrap {
              display: flex !important;
              flex-direction: column !important;
              gap: 4px !important;
              word-break: break-word !important;
            }

            [data-accounting-print-area="${printAreaId}"] .print-account-debit {
              color: #111827 !important;
              font-weight: 600 !important;
              min-height: 16.5px !important;
              display: flex !important;
              align-items: center !important;
            }

            [data-accounting-print-area="${printAreaId}"] .print-account-credit {
              color: #111827 !important;
              font-weight: 600 !important;
              min-height: 16.5px !important;
              padding-left: 18px !important;
              display: flex !important;
              align-items: center !important;
            }

            [data-accounting-print-area="${printAreaId}"] .print-memo {
              margin-top: 5px !important;
              font-size: 10px !important;
              color: #0B43C8 !important;
              font-style: italic !important;
              font-weight: 500 !important;
              line-height: 1.4 !important;
              word-break: break-word !important;
            }

            [data-accounting-print-area="${printAreaId}"] .print-ref-wrap {
              display: flex !important;
              flex-direction: column !important;
              gap: 4px !important;
            }

            [data-accounting-print-area="${printAreaId}"] .print-ref-item {
              color: #6b7280 !important;
              min-height: 16.5px !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              font-size: 10.5px !important;
              white-space: nowrap !important;
            }

            [data-accounting-print-area="${printAreaId}"] .print-amount-wrap {
              display: flex !important;
              flex-direction: column !important;
              gap: 4px !important;
            }

            [data-accounting-print-area="${printAreaId}"] .print-amount-row {
              color: #111827 !important;
              font-weight: 600 !important;
              display: flex !important;
              justify-content: space-between !important;
              min-height: 16.5px !important;
              align-items: center !important;
              width: 100% !important;
              white-space: nowrap !important;
              word-break: normal !important;
              font-variant-numeric: tabular-nums !important;
            }

            [data-accounting-print-area="${printAreaId}"] .print-currency {
              color: #9ca3af !important;
              font-weight: 400 !important;
              margin-right: 4px !important;
              white-space: nowrap !important;
              flex-shrink: 0 !important;
            }

            [data-accounting-print-area="${printAreaId}"] .print-val {
              white-space: nowrap !important;
              font-variant-numeric: tabular-nums !important;
              flex-shrink: 0 !important;
            }

            [data-accounting-print-area="${printAreaId}"] .print-blank {
              visibility: hidden !important;
            }
          }
        `}
      </style>

      {mounted && typeof document !== "undefined" && createPortal(journalPrintContent, document.body)}
    </div>
  );
}

