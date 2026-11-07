import * as React from "react";
import {
  BanknoteIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  PlusIcon,
} from "lucide-react";
import { toast } from "sonner";
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
import { buildArAging } from "@/lib/accounting-engine";
import {
  getCompanyProfile,
  listAccounts,
  listCustomers,
  listProjects,
} from "@/lib/data-service";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { formatDateID, formatRupiah, roundRupiah } from "@/lib/formatters";
import {
  createAndIssueSalesInvoice,
  getProjectWorkspace,
  type ProjectWorkspaceBundle,
  recordClientInvoicePayment,
  recordExportLog,
} from "@/lib/operations-service";
import {
  buildInvoicePdfSpec,
  buildReceiptPdfSpec,
  downloadPdfBytes,
  generateDocumentPdf,
} from "@/lib/pdf-generator";
import type {
  AccountRow,
  CompanyProfileRow,
  CustomerRow,
  InvoiceKind,
  ProjectRow,
  ReceiptRow,
  SalesInvoiceRow,
} from "@/types/database.types";

const INVOICE_KIND_LABELS: Record<InvoiceKind, string> = {
  down_payment: "Uang Muka (DP)",
  milestone: "Termin Progres (Wajib BAKP — BR-14)",
  final_settlement: "Pelunasan Akhir (Wajib BAST — BR-15)",
};

export function InvoicingPage() {
  const [bundle, setBundle] = React.useState<ProjectWorkspaceBundle | null>(
    null,
  );
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [customers, setCustomers] = React.useState<CustomerRow[]>([]);
  const [cashAccounts, setCashAccounts] = React.useState<AccountRow[]>([]);
  const [company, setCompany] = React.useState<CompanyProfileRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [agingRefDate, setAgingRefDate] = React.useState("2026-12-31");

  // Dialog Terbitkan Invoice Baru
  const [createOpen, setCreateOpen] = React.useState(false);
  const [invDate, setInvDate] = React.useState("2026-11-01");
  const [dueDate, setDueDate] = React.useState("2026-11-15");
  const [selectedProjectId, setSelectedProjectId] = React.useState("");
  const [invoiceKind, setInvoiceKind] =
    React.useState<InvoiceKind>("down_payment");
  const [clientPoId, setClientPoId] = React.useState("");
  const [milestoneId, setMilestoneId] = React.useState("none");
  const [bakpId, setBakpId] = React.useState("none");
  const [bastId, setBastId] = React.useState("none");
  const [subtotalAmount, setSubtotalAmount] = React.useState(0);
  const [directCashAccountId, setDirectCashAccountId] = React.useState("none");
  const [notes, setNotes] = React.useState("");
  const [issuing, setIssuing] = React.useState(false);

  // Dialog Catat Pembayaran Invoice Klien (menerbitkan Kuitansi otomatis)
  const [payTarget, setPayTarget] = React.useState<SalesInvoiceRow | null>(
    null,
  );
  const [payDate, setPayDate] = React.useState("2026-11-07");
  const [payAmount, setPayAmount] = React.useState(0);
  const [destCashAccountId, setDestCashAccountId] = React.useState("");
  const [paying, setPaying] = React.useState(false);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [ws, prjRes, csts, accs, comp] = await Promise.all([
        getProjectWorkspace(),
        listProjects(),
        listCustomers(),
        listAccounts(),
        getCompanyProfile(),
      ]);
      setBundle(ws);
      const clientProjects = prjRes.projects.filter(
        (p) => p.project_category === "client",
      );
      setProjects(clientProjects);
      setCustomers(csts);
      const cash = accs.filter(
        (a) => a.is_active && a.is_postable && a.system_tag === "cash_bank",
      );
      setCashAccounts(cash);
      setCompany(comp);

      if (clientProjects[0]) {
        setSelectedProjectId((prev) => prev || clientProjects[0]!.id);
      }
      if (cash[0]) {
        setDestCashAccountId((prev) => prev || cash[0]!.id);
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal memuat data penagihan dan piutang.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const customerMap = React.useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers],
  );
  const projectMap = React.useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  );

  const projectVerifiedPos = React.useMemo(
    () =>
      (bundle?.clientPos ?? []).filter(
        (c) => c.project_id === selectedProjectId && c.status === "verified",
      ),
    [bundle, selectedProjectId],
  );
  const projectMilestones = React.useMemo(
    () =>
      (bundle?.milestones ?? []).filter(
        (m) => m.project_id === selectedProjectId,
      ),
    [bundle, selectedProjectId],
  );
  const projectApprovedBakps = React.useMemo(
    () =>
      (bundle?.bakpList ?? []).filter(
        (b) =>
          b.project_id === selectedProjectId &&
          b.status === "approved_by_client",
      ),
    [bundle, selectedProjectId],
  );
  const projectSignedBasts = React.useMemo(
    () =>
      (bundle?.bastList ?? []).filter(
        (h) => h.project_id === selectedProjectId && h.status === "signed",
      ),
    [bundle, selectedProjectId],
  );

  React.useEffect(() => {
    setClientPoId(projectVerifiedPos[0]?.id ?? "");
    setMilestoneId(projectMilestones[0]?.id ?? "none");
    setBakpId(projectApprovedBakps[0]?.id ?? "none");
    setBastId(projectSignedBasts[0]?.id ?? "none");
    if (projectMilestones[0]) {
      setSubtotalAmount(projectMilestones[0].amount);
    }
  }, [
    selectedProjectId,
    projectVerifiedPos,
    projectMilestones,
    projectApprovedBakps,
    projectSignedBasts,
  ]);

  const arAgingRows = React.useMemo(() => {
    if (!bundle) return [];
    const cNameMap = new Map(customers.map((c) => [c.id, c.name]));
    const pCodeMap = new Map(projects.map((p) => [p.id, p.code]));
    return buildArAging(bundle.invoices, cNameMap, pCodeMap, agingRefDate);
  }, [bundle, customers, projects, agingRefDate]);

  async function handleIssueInvoice(e: React.FormEvent) {
    e.preventDefault();
    const prj = projectMap.get(selectedProjectId);
    if (!prj || !prj.customer_id) {
      toast.error("Proyek belum memiliki pelanggan terkait.");
      return;
    }
    if (!clientPoId) {
      toast.error(
        "Pilih PO Klien yang telah diverifikasi Admin terlebih dahulu (BR-23).",
      );
      return;
    }
    setIssuing(true);
    try {
      await createAndIssueSalesInvoice({
        invoiceDate: invDate,
        dueDate,
        projectId: prj.id,
        customerId: prj.customer_id,
        milestoneId: milestoneId === "none" ? null : milestoneId,
        clientPoId,
        bakpId:
          invoiceKind === "milestone" && bakpId !== "none" ? bakpId : null,
        bastId:
          invoiceKind === "final_settlement" && bastId !== "none"
            ? bastId
            : null,
        invoiceKind,
        subtotalAmount: roundRupiah(subtotalAmount),
        notes,
        directCashAccountId:
          directCashAccountId === "none" ? null : directCashAccountId,
      });
      toast.success(
        "Invoice penagihan berhasil diterbitkan dan jurnal otomatis telah diposting.",
      );
      setCreateOpen(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menerbitkan invoice.",
      );
    } finally {
      setIssuing(false);
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payTarget || !destCashAccountId) return;
    setPaying(true);
    try {
      const kw = await recordClientInvoicePayment({
        invoiceId: payTarget.id,
        paymentDate: payDate,
        amount: roundRupiah(payAmount),
        destinationAccountId: destCashAccountId,
      });
      toast.success(
        `Pembayaran diterima & Kuitansi ${kw.receipt_number} otomatis diterbitkan.`,
      );
      setPayTarget(null);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal mencatat penerimaan pembayaran.",
      );
    } finally {
      setPaying(false);
    }
  }

  async function handleDownloadInvoicePdf(inv: SalesInvoiceRow) {
    if (!company || !bundle) return;
    const cust = customerMap.get(inv.customer_id);
    const prj = projectMap.get(inv.project_id);
    const cpo = bundle.clientPos.find((c) => c.id === inv.client_po_id);
    const ms = bundle.milestones.find((m) => m.id === inv.milestone_id);

    const spec = buildInvoicePdfSpec({
      company,
      invoiceNumber: inv.invoice_number,
      invoiceDate: inv.invoice_date,
      dueDate: inv.due_date,
      customerName: cust?.name ?? "Klien",
      customerAddress: cust?.address ?? "-",
      projectName: prj ? `${prj.code} - ${prj.name}` : "Proyek",
      clientPoNumber: cpo?.po_number ?? "-",
      description: ms
        ? `${ms.name} — Proyek ${prj?.name ?? ""}`
        : `Penagihan Proyek ${prj?.name ?? ""}`,
      subtotal: inv.subtotal_amount,
      ppnAmount: inv.ppn_amount,
      totalAmount: inv.total_amount,
    });
    const bytes = await generateDocumentPdf(spec);
    downloadPdfBytes(bytes, `${inv.invoice_number.replace(/\//g, "_")}.pdf`);
    await recordExportLog("SALES_INVOICE", "PDF");
  }

  async function handleDownloadReceiptPdf(kw: ReceiptRow) {
    if (!company || !bundle) return;
    const inv = bundle.invoices.find((i) => i.id === kw.invoice_id);
    const prj = inv ? projectMap.get(inv.project_id) : undefined;
    const spec = buildReceiptPdfSpec({
      company,
      receiptNumber: kw.receipt_number,
      receiptDate: kw.receipt_date,
      receivedFrom: kw.received_from,
      invoiceNumber: inv?.invoice_number ?? "-",
      projectName: prj ? `${prj.code} - ${prj.name}` : "Proyek Klien",
      amount: kw.amount,
    });
    const bytes = await generateDocumentPdf(spec);
    downloadPdfBytes(bytes, `${kw.receipt_number.replace(/\//g, "_")}.pdf`);
    await recordExportLog("RECEIPT_KUITANSI", "PDF");
  }

  async function handleExportInvoicesExcel() {
    if (!bundle) return;
    await downloadExcelSheet({
      fileName: "Daftar_Invoice_dan_Piutang_Altcycles.xlsx",
      sheetName: "Invoice Penjualan",
      columns: [
        { header: "No. Invoice", width: 22 },
        { header: "Tanggal", width: 14 },
        { header: "Jatuh Tempo", width: 14 },
        { header: "Proyek", width: 22 },
        { header: "Pelanggan", width: 26 },
        { header: "Total Tagihan", width: 18 },
        { header: "Terbayar", width: 18 },
        { header: "Sisa Piutang", width: 18 },
        { header: "Status Bayar", width: 16 },
      ],
      rows: bundle.invoices.map((inv) => [
        inv.invoice_number,
        formatDateID(inv.invoice_date),
        formatDateID(inv.due_date),
        projectMap.get(inv.project_id)?.code ?? "-",
        customerMap.get(inv.customer_id)?.name ?? "Klien",
        inv.total_amount,
        inv.paid_amount,
        inv.total_amount - inv.paid_amount,
        inv.payment_status,
      ]),
    });
    await recordExportLog("SALES_INVOICES", "EXCEL");
    toast.success("Daftar invoice & piutang berhasil diekspor ke Excel.");
  }

  const totalInvoiced = (bundle?.invoices ?? []).reduce(
    (s, i) => s + i.total_amount,
    0,
  );
  const totalCollected = (bundle?.invoices ?? []).reduce(
    (s, i) => s + i.paid_amount,
    0,
  );
  const totalOutstanding = totalInvoiced - totalCollected;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Invoice Penagihan, Umur Piutang, &amp; Kuitansi
          </h1>
          <p className="text-sm text-muted-foreground">
            Validasi prasyarat PO terverifikasi (BR-23), BAKP (BR-14), dan BAST
            (BR-15), disertai penerbitan PDF Invoice (Lampiran A.5) &amp;
            Kuitansi (Lampiran A.6) lengkap kalimat Terbilang.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleExportInvoicesExcel()}
          >
            <FileSpreadsheetIcon data-icon="inline-start" />
            Ekspor Excel
          </Button>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Terbitkan Invoice
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Nilai Invoice Diterbitkan</CardDescription>
            <CardTitle className="text-xl">
              {formatRupiah(totalInvoiced)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Penerimaan Pembayaran</CardDescription>
            <CardTitle className="text-xl">
              {formatRupiah(totalCollected)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saldo Piutang Usaha Belum Tertagih</CardDescription>
            <CardTitle className="text-xl">
              {formatRupiah(totalOutstanding)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">
            Daftar Invoice ({bundle?.invoices.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="aging">
            Umur Piutang / Jatuh Tempo ({arAgingRows.length})
          </TabsTrigger>
          <TabsTrigger value="receipts">
            Kuitansi Pembayaran ({bundle?.receipts.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Invoice Klien</CardTitle>
              <CardDescription>
                Klik Catat Pembayaran saat dana masuk ke rekening perusahaan
                untuk menerbitkan Kuitansi otomatis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                  <Spinner />
                  <span>Memuat daftar invoice...</span>
                </div>
              ) : !bundle || bundle.invoices.length === 0 ? (
                <EmptyState
                  title="Belum ada invoice diterbitkan"
                  description="Pastikan PO Klien telah diverifikasi sebelum menerbitkan invoice."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Invoice</TableHead>
                      <TableHead>Tanggal &amp; Jatuh Tempo</TableHead>
                      <TableHead>Proyek &amp; Klien</TableHead>
                      <TableHead>Total Tagihan</TableHead>
                      <TableHead>Terbayar</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bundle.invoices.map((inv) => {
                      const prj = projectMap.get(inv.project_id);
                      const cust = customerMap.get(inv.customer_id);
                      const remaining = inv.total_amount - inv.paid_amount;

                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono text-xs font-semibold">
                            {inv.invoice_number}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div>Terbit: {formatDateID(inv.invoice_date)}</div>
                            <div className="text-muted-foreground">
                              Tempo: {formatDateID(inv.due_date)}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium">
                              {prj ? `${prj.code} — ${prj.name}` : "-"}
                            </div>
                            <div className="text-muted-foreground">
                              {cust?.name ?? "Klien"}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatRupiah(inv.total_amount)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {formatRupiah(inv.paid_amount)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              tone={
                                inv.payment_status === "paid"
                                  ? "success"
                                  : inv.payment_status === "partial"
                                    ? "warning"
                                    : "info"
                              }
                              label={
                                inv.payment_status === "paid"
                                  ? "Lunas"
                                  : inv.payment_status === "partial"
                                    ? "Dibayar Sebagian"
                                    : "Belum Dibayar"
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1.5">
                              {remaining > 0 ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => {
                                    setPayDate(inv.invoice_date);
                                    setPayAmount(remaining);
                                    setPayTarget(inv);
                                  }}
                                >
                                  <BanknoteIcon data-icon="inline-start" />
                                  Terima Bayar
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  void handleDownloadInvoicePdf(inv)
                                }
                              >
                                <DownloadIcon data-icon="inline-start" />
                                PDF A.5
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>
                  Pemantauan Umur Piutang &amp; Tagihan Jatuh Tempo (UC-21)
                </CardTitle>
                <CardDescription>
                  Mengelompokkan sisa piutang berdasarkan keterlambatan hari
                  terhadap tanggal acuan.
                </CardDescription>
              </div>
              <div className="w-48">
                <Input
                  type="date"
                  value={agingRefDate}
                  onChange={(e) => setAgingRefDate(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {arAgingRows.length === 0 ? (
                <EmptyState
                  title="Tidak ada piutang tertunggak"
                  description="Seluruh invoice yang telah diterbitkan sudah lunas."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Invoice</TableHead>
                      <TableHead>Pelanggan &amp; Proyek</TableHead>
                      <TableHead>Jatuh Tempo</TableHead>
                      <TableHead>Sisa Tagihan</TableHead>
                      <TableHead>Keterlambatan</TableHead>
                      <TableHead>Kelompok Umur</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {arAgingRows.map((row) => (
                      <TableRow key={row.invoiceId}>
                        <TableCell className="font-mono text-xs font-semibold">
                          {row.invoiceNumber}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium">{row.customerName}</div>
                          <div className="text-muted-foreground">
                            {row.projectCode}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDateID(row.dueDate)}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatRupiah(row.outstandingAmount)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.daysOverdue} Hari
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            tone={
                              row.daysOverdue > 30
                                ? "destructive"
                                : row.daysOverdue >= 1
                                  ? "warning"
                                  : "success"
                            }
                            label={row.agingBucket}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipts">
          <Card>
            <CardHeader>
              <CardTitle>Kuitansi Bukti Pembayaran (Lampiran A.6)</CardTitle>
              <CardDescription>
                Diterbitkan otomatis setiap kali pembayaran invoice klien
                dicatat.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!bundle || bundle.receipts.length === 0 ? (
                <EmptyState
                  title="Belum ada Kuitansi"
                  description="Kuitansi diterbitkan otomatis saat pembayaran invoice dicatat."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nomor Kuitansi</TableHead>
                      <TableHead>Tanggal Terima</TableHead>
                      <TableHead>Diterima Dari</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead className="text-right">PDF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bundle.receipts.map((kw) => (
                      <TableRow key={kw.id}>
                        <TableCell className="font-mono text-xs font-semibold">
                          {kw.receipt_number}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDateID(kw.receipt_date)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {kw.received_from}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatRupiah(kw.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleDownloadReceiptPdf(kw)}
                          >
                            <DownloadIcon data-icon="inline-start" />
                            PDF A.6
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

      {/* Dialog Terbitkan Invoice */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Terbitkan Invoice Penagihan Klien</DialogTitle>
            <DialogDescription>
              Otomatis memposting jurnal sesuai metode pengakuan pendapatan
              proyek (mis. <code>K Penagihan atas Kontrak</code> pada Progress
              Billing).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleIssueInvoice}>
            <FieldGroup>
              <Field>
                <FieldLabel>Proyek Klien</FieldLabel>
                <Select
                  value={selectedProjectId}
                  onValueChange={setSelectedProjectId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih proyek" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.code} — {p.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="inv-date">Tanggal Invoice</FieldLabel>
                  <Input
                    id="inv-date"
                    type="date"
                    required
                    value={invDate}
                    onChange={(e) => setInvDate(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="inv-due">Tanggal Jatuh Tempo</FieldLabel>
                  <Input
                    id="inv-due"
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Jenis Tagihan</FieldLabel>
                  <Select
                    value={invoiceKind}
                    onValueChange={(v) => setInvoiceKind(v as InvoiceKind)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {Object.entries(INVOICE_KIND_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Referensi PO Klien Terverifikasi (BR-23)</FieldLabel>
                  <Select value={clientPoId} onValueChange={setClientPoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih PO Klien" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {projectVerifiedPos.map((cpo) => (
                          <SelectItem key={cpo.id} value={cpo.id}>
                            {cpo.po_number} ({formatRupiah(cpo.po_value)})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field>
                <FieldLabel>Termin Proyek</FieldLabel>
                <Select
                  value={milestoneId}
                  onValueChange={(id) => {
                    setMilestoneId(id);
                    const ms = projectMilestones.find((m) => m.id === id);
                    if (ms) setSubtotalAmount(ms.amount);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="none">— Tanpa Termin Spesifik —</SelectItem>
                      {projectMilestones.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} — {formatRupiah(m.amount)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              {invoiceKind === "milestone" ? (
                <Field>
                  <FieldLabel>Dokumen BAKP Disetujui Klien (BR-14)</FieldLabel>
                  <Select value={bakpId} onValueChange={setBakpId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih BAKP" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">— Pilih BAKP —</SelectItem>
                        {projectApprovedBakps.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.bakp_number} ({b.cumulative_percentage}%)
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}

              {invoiceKind === "final_settlement" ? (
                <Field>
                  <FieldLabel>Dokumen BAST Ditandatangani (BR-15)</FieldLabel>
                  <Select value={bastId} onValueChange={setBastId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih BAST" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">— Pilih BAST —</SelectItem>
                        {projectSignedBasts.map((h) => (
                          <SelectItem key={h.id} value={h.id}>
                            {h.bast_number} ({formatDateID(h.bast_date)})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="inv-amt">
                    Nominal Subtotal Tagihan (Rp Bulat)
                  </FieldLabel>
                  <Input
                    id="inv-amt"
                    type="number"
                    min={1}
                    required
                    value={subtotalAmount}
                    onChange={(e) => setSubtotalAmount(Number(e.target.value))}
                  />
                </Field>
                <Field>
                  <FieldLabel>Mode Pencatatan Saat Terbit</FieldLabel>
                  <Select
                    value={directCashAccountId}
                    onValueChange={setDirectCashAccountId}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">
                          Catat ke Piutang Usaha terlebih dahulu
                        </SelectItem>
                        {cashAccounts.map((ca) => (
                          <SelectItem key={ca.id} value={ca.id}>
                            Dibayar Tunai/Transfer Langsung ke {ca.code} —{" "}
                            {ca.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Mendukung pencatatan lewat Piutang Usaha maupun penerimaan
                    kas langsung.
                  </FieldDescription>
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="inv-notes">Catatan Invoice</FieldLabel>
                <Textarea
                  id="inv-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={issuing}>
                  {issuing ? <Spinner data-icon="inline-start" /> : null}
                  Terbitkan Invoice &amp; Posting Jurnal
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Terima Pembayaran Invoice */}
      <Dialog
        open={Boolean(payTarget)}
        onOpenChange={(open) => {
          if (!open) setPayTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Catat Penerimaan Pembayaran {payTarget?.invoice_number}
            </DialogTitle>
            <DialogDescription>
              Menerbitkan jurnal pelunasan piutang (Debit Kas-Bank / Kredit
              Piutang Usaha) dan membuat Kuitansi resmi secara otomatis.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordPayment}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="pay-date">Tanggal Dana Masuk</FieldLabel>
                <Input
                  id="pay-date"
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="pay-amt">
                  Nominal Pembayaran Diterima (Rp)
                </FieldLabel>
                <Input
                  id="pay-amt"
                  type="number"
                  min={1}
                  max={
                    payTarget
                      ? payTarget.total_amount - payTarget.paid_amount
                      : undefined
                  }
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                />
              </Field>
              <Field>
                <FieldLabel>Rekening Tujuan Kas / Bank Perusahaan</FieldLabel>
                <Select
                  value={destCashAccountId}
                  onValueChange={setDestCashAccountId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih akun kas/bank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {cashAccounts.map((ca) => (
                        <SelectItem key={ca.id} value={ca.id}>
                          {ca.code} — {ca.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPayTarget(null)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={paying}>
                  {paying ? <Spinner data-icon="inline-start" /> : null}
                  Simpan Pembayaran &amp; Buat Kuitansi
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
