import * as React from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2Icon,
  CopyIcon,
  DownloadIcon,
  FolderKanbanIcon,
  PlusIcon,
  SearchIcon,
  ShieldCheckIcon,
  Trash2Icon,
  WalletIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AltviraLogoMark } from "@/components/shared/altvira-logo";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEMO_COMPANY } from "@/lib/demo-seed";
import { formatDateID, formatDateTimeID, formatRupiah } from "@/lib/formatters";
import {
  publicBuyerLookupPo,
  publicBuyerSubmitPo,
} from "@/lib/operations-service";
import { downloadPdfBytes, generateDocumentPdf } from "@/lib/pdf-generator";
import { isDemoMode } from "@/lib/supabase";
import type { BuyerPortalLookupDto } from "@/types/database.types";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
        },
      ) => string;
      remove?: (widgetId: string) => void;
    };
  }
}

export function BuyerPortalPage() {
  const turnstileSiteKey =
    (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() ??
    "";

  // Tab 1: Pelacakan 1 PO Tanpa Login
  const [poQuery, setPoQuery] = React.useState(
    isDemoMode ? "PO-202611-SN8K4P" : "",
  );
  const [searching, setSearching] = React.useState(false);
  const [lookupResult, setLookupResult] =
    React.useState<BuyerPortalLookupDto | null>(null);

  // Tab 2: Pengajuan PO Klien Baru
  const [clientName, setClientName] = React.useState("");
  const [clientCompany, setClientCompany] = React.useState("");
  const [clientEmail, setClientEmail] = React.useState("");
  const [clientPhone, setClientPhone] = React.useState("");
  const [quotationReference, setQuotationReference] = React.useState("");
  const [items, setItems] = React.useState<
    Array<{ item: string; qty: number; price: number }>
  >([{ item: "Pengembangan Sistem Aplikasi Web", qty: 1, price: 0 }]);
  const [turnstileToken, setTurnstileToken] = React.useState("");
  const [submittingPo, setSubmittingPo] = React.useState(false);
  const [createdPoCode, setCreatedPoCode] = React.useState<string | null>(null);

  const turnstileContainerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!turnstileSiteKey || isDemoMode) return;
    let widgetId: string | null = null;
    const mountWidget = () => {
      if (window.turnstile && turnstileContainerRef.current) {
        widgetId = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: turnstileSiteKey,
          callback: (token: string) => setTurnstileToken(token),
          "expired-callback": () => setTurnstileToken(""),
        });
      }
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src*="challenges.cloudflare.com/turnstile"]',
    );
    if (existingScript) {
      mountWidget();
    } else {
      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = mountWidget;
      document.head.appendChild(script);
    }

    return () => {
      if (widgetId && window.turnstile?.remove) {
        window.turnstile.remove(widgetId);
      }
    };
  }, [turnstileSiteKey]);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    try {
      const dto = await publicBuyerLookupPo(poQuery);
      setLookupResult(dto);
    } catch (err) {
      setLookupResult(null);
      toast.error(
        err instanceof Error ? err.message : "Nomor PO tidak ditemukan.",
      );
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmitPo(e: React.FormEvent) {
    e.preventDefault();
    if (turnstileSiteKey && !isDemoMode && !turnstileToken) {
      toast.error(
        "Silakan selesaikan verifikasi keamanan Cloudflare Turnstile terlebih dahulu.",
      );
      return;
    }
    setSubmittingPo(true);
    try {
      const res = await publicBuyerSubmitPo({
        clientName,
        clientCompany,
        clientEmail,
        clientPhone,
        quotationReference,
        items,
        turnstileToken: turnstileToken || undefined,
      });
      setCreatedPoCode(res.po_number);
      setPoQuery(res.po_number);
      toast.success(
        `PO Klien berhasil diajukan dengan kode ${res.po_number}.`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal mengirimkan PO Klien.",
      );
    } finally {
      setSubmittingPo(false);
    }
  }

  async function handleDownloadBuyerDoc(
    doc: BuyerPortalLookupDto["documents"][number],
  ) {
    if (!lookupResult) return;
    const bytes = await generateDocumentPdf({
      docTitle: `DOKUMEN PROYEK — ${doc.category.toUpperCase()}`,
      docSubtitle: `Referensi PO: ${lookupResult.po_number}`,
      docNumber: doc.doc_number,
      docDate: doc.doc_date,
      company: DEMO_COMPANY,
      recipientTitle: "Diterbitkan Untuk Klien:",
      recipientLines: [
        lookupResult.client_name,
        lookupResult.client_company ?? "-",
      ],
      metaRows: [
        {
          label: "Proyek",
          value: lookupResult.project
            ? `${lookupResult.project.code} - ${lookupResult.project.name}`
            : "Menunggu Tautan Proyek",
        },
        { label: "Kategori Dokumen", value: doc.category },
        { label: "Status Dokumen", value: doc.status },
      ],
      paragraphsBefore: [
        "Salinan dokumen resmi ini diunduh melalui Portal Pembeli Altcycles menggunakan verifikasi Nomor PO unik klien tanpa menampilkan data biaya internal perusahaan.",
      ],
      rightSignatureName: `${DEMO_COMPANY.signer_name} - ${DEMO_COMPANY.signer_title}`,
    });
    downloadPdfBytes(
      bytes,
      `${doc.category}_${doc.doc_number.replace(/\//g, "_")}.pdf`,
    );
  }

  const totalDraftPo = items.reduce(
    (s, it) => s + Math.round(it.qty * it.price),
    0,
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Header Bar sejajar sistem internal: Breadcrumb di kiri, Toggle Tema di ujung kanan atas */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/80 bg-card/90 px-4 sm:px-6 backdrop-blur-md">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs text-muted-foreground min-w-0"
        >
          <Link
            to="/login"
            className="hover:text-foreground transition-colors font-medium whitespace-nowrap"
          >
            Beranda
          </Link>
          <span className="text-muted-foreground/60 select-none">/</span>
          <span className="text-foreground font-semibold truncate">
            Portal Pembeli
          </span>
        </nav>

        <ThemeToggle
          size="sm"
          className="size-9 rounded-2xl border border-border shadow-2xs shrink-0"
        />
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          {/* Header Portal Pelanggan: Logo Altvira sejajar ujung atas judul & ujung bawah deskripsi */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex size-12 sm:size-14 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-card shadow-2xs">
              <AltviraLogoMark size={36} iconVariant="transparent" />
            </div>
            <div className="flex flex-col justify-between min-w-0 sm:min-h-14 py-0.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight sm:leading-none text-foreground">
                Portal Pelanggan Altvira Technology
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-0 leading-relaxed sm:leading-snug">
                Lacak progres proyek, unduh dokumen tagihan resmi, dan ajukan purchase order secara mandiri.
              </p>
            </div>
          </div>

          <Tabs defaultValue="lookup" className="w-full">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2">
              <TabsTrigger value="lookup" className="w-full">
                <SearchIcon className="size-4 shrink-0" />
                <span>Lacak Progres &amp; Unduh Dokumen PO</span>
              </TabsTrigger>
              <TabsTrigger value="submit" className="w-full">
                <PlusIcon className="size-4 shrink-0" />
                <span>Ajukan Purchase Order (PO) Baru</span>
              </TabsTrigger>
            </TabsList>

          {/* TAB 1: Pelacakan Progres & Dokumen 1 PO */}
          <TabsContent value="lookup" className="flex flex-col gap-6 mt-5">
            <Card className="overflow-hidden">
              <CardHeader className="px-6 py-4 border-b border-border/70">
                <CardTitle className="text-base sm:text-lg font-bold">
                  Masukkan Nomor Akses PO Anda
                </CardTitle>
                <CardDescription>
                  Demi kerahasiaan antar klien, pencocokan dilakukan di sisi server dan hanya menampilkan satu proyek yang cocok beserta pembatasan percobaan per IP.
                  {isDemoMode
                    ? " (Contoh pratinjau Mode Lokal: PO-202611-SN8K4P)"
                    : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form
                  onSubmit={handleLookup}
                  className="flex flex-col gap-3 sm:flex-row sm:items-center"
                >
                  <Input
                    required
                    value={poQuery}
                    onChange={(e) => setPoQuery(e.target.value.toUpperCase())}
                    placeholder="Contoh: PO-202611-SN8K4P"
                    className="flex-1 font-mono placeholder:font-sans"
                  />
                  <Button
                    type="submit"
                    disabled={searching}
                    className="shrink-0"
                  >
                    {searching ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <SearchIcon className="size-4" />
                    )}
                    <span>Cek Status Proyek</span>
                  </Button>
                </form>
              </CardContent>
            </Card>

            {lookupResult ? (
              <div className="flex flex-col gap-6">
                {/* Identitas & 3 KPI PO Terlacak */}
                <Card className="overflow-hidden">
                  <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1 min-w-0">
                      <CardTitle className="font-mono text-base sm:text-lg">
                        {lookupResult.po_number}
                      </CardTitle>
                      <CardDescription>
                        {lookupResult.client_name}
                        {lookupResult.client_company
                          ? ` — ${lookupResult.client_company}`
                          : ""}{" "}
                        &bull; Diajukan {formatDateTimeID(lookupResult.submitted_at)}
                      </CardDescription>
                    </div>
                    <StatusBadge
                      tone={
                        lookupResult.verification_status === "verified"
                          ? "success"
                          : lookupResult.verification_status === "rejected"
                            ? "destructive"
                            : "warning"
                      }
                      label={
                        lookupResult.verification_status === "verified"
                          ? "PO Terverifikasi Admin"
                          : lookupResult.verification_status === "rejected"
                            ? "PO Ditolak"
                            : "Menunggu Verifikasi Admin"
                      }
                    />
                  </CardHeader>
                  <CardContent className="p-6 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-border/70 bg-muted/15 p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">
                          Nilai Purchase Order
                        </p>
                        <p className="text-lg sm:text-xl font-bold tracking-tight text-foreground mt-1 tabular-nums">
                          {formatRupiah(lookupResult.po_value)}
                        </p>
                      </div>
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-sky-400 border border-primary/20">
                        <WalletIcon className="size-5" />
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-muted/15 p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">
                          Proyek Terkait
                        </p>
                        <p className="text-xs sm:text-sm font-bold text-foreground mt-1.5 line-clamp-2">
                          {lookupResult.project
                            ? `${lookupResult.project.code} — ${lookupResult.project.name}`
                            : "Sedang Disiapkan Admin"}
                        </p>
                      </div>
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                        <FolderKanbanIcon className="size-5" />
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-muted/15 p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">
                          Capaian Penyelesaian
                        </p>
                        <p className="text-lg sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                          {lookupResult.project?.cumulative_progress_pct ?? 0}%
                        </p>
                      </div>
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2Icon className="size-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabel Termin Proyek (Edge-to-Edge) */}
                <Card className="overflow-hidden">
                  <CardHeader className="px-6 py-4 border-b border-border/70">
                    <CardTitle className="text-base sm:text-lg font-bold">
                      Jadwal &amp; Status Termin Proyek
                    </CardTitle>
                    <CardDescription>
                      Informasi baca-saja tahapan penyelesaian dan penagihan kontrak Anda.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                          <TableHead className="pl-6 pr-3 text-center text-xs sm:text-sm font-semibold w-16 whitespace-nowrap">
                            No
                          </TableHead>
                          <TableHead className="px-3 text-center text-xs sm:text-sm font-semibold whitespace-nowrap">
                            Nama Termin
                          </TableHead>
                          <TableHead className="px-3 text-center text-xs sm:text-sm font-semibold w-24 whitespace-nowrap">
                            Porsi
                          </TableHead>
                          <TableHead className="px-3 text-center text-xs sm:text-sm font-semibold w-44 whitespace-nowrap">
                            Nominal
                          </TableHead>
                          <TableHead className="pl-2 pr-6 text-center text-xs sm:text-sm font-semibold w-36 whitespace-nowrap">
                            Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lookupResult.milestones.length === 0 ? (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={5} className="p-0">
                              <div className="py-10 px-6 bg-muted/10 border-t border-dashed border-border/70">
                                <EmptyState
                                  title="Jadwal termin belum tersedia"
                                  description="Jadwal termin akan tampil setelah PO diverifikasi dan proyek diaktifkan."
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          lookupResult.milestones.map((m) => (
                            <TableRow key={m.sequence_no}>
                              <TableCell className="align-top pl-6 pr-3 py-3.5 text-center text-xs sm:text-sm leading-5 tabular-nums whitespace-nowrap">
                                {m.sequence_no}
                              </TableCell>
                              <TableCell className="align-top px-3 py-3.5 text-xs sm:text-sm leading-5 font-medium">
                                <div className="text-foreground">{m.name}</div>
                                {m.achievement_criteria ? (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {m.achievement_criteria}
                                  </div>
                                ) : null}
                              </TableCell>
                              <TableCell className="align-top px-3 py-3.5 text-center text-xs sm:text-sm leading-5 tabular-nums whitespace-nowrap">
                                {m.percentage}%
                              </TableCell>
                              <TableCell className="align-top px-3 py-3.5 text-xs sm:text-sm leading-5 font-semibold whitespace-nowrap">
                                <MonetaryCell amount={m.amount} />
                              </TableCell>
                              <TableCell className="align-top pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                                <div className="-my-px inline-flex justify-center">
                                  <StatusBadge
                                    tone={
                                      m.status === "paid" ? "success" : "info"
                                    }
                                    label={m.status}
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Tabel Dokumen Resmi Proyek (Edge-to-Edge) */}
                <Card className="overflow-hidden">
                  <CardHeader className="px-6 py-4 border-b border-border/70">
                    <CardTitle className="text-base sm:text-lg font-bold">
                      Dokumen Resmi Proyek
                    </CardTitle>
                    <CardDescription>
                      Quotation, SoW, SPK, BAKP, UAT, BAST, Invoice, dan Kuitansi yang terkait dengan Nomor PO ini.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                          <TableHead className="pl-6 pr-3 text-center text-xs sm:text-sm font-semibold whitespace-nowrap">
                            Kategori
                          </TableHead>
                          <TableHead className="px-3 text-center text-xs sm:text-sm font-semibold whitespace-nowrap">
                            Nomor Dokumen
                          </TableHead>
                          <TableHead className="px-3 text-center text-xs sm:text-sm font-semibold whitespace-nowrap">
                            Tanggal
                          </TableHead>
                          <TableHead className="px-3 text-center text-xs sm:text-sm font-semibold whitespace-nowrap">
                            Status
                          </TableHead>
                          <TableHead className="pl-2 pr-6 text-center text-xs sm:text-sm font-semibold w-28 whitespace-nowrap">
                            Aksi
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lookupResult.documents.length === 0 ? (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={5} className="p-0">
                              <div className="py-10 px-6 bg-muted/10 border-t border-dashed border-border/70">
                                <EmptyState
                                  title="Belum ada dokumen terbit"
                                  description="Dokumen resmi akan muncul secara otomatis seiring tahapan proyek berjalan."
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          lookupResult.documents.map((doc, idx) => (
                            <TableRow key={`${doc.doc_number}-${idx}`}>
                              <TableCell className="align-top pl-6 pr-3 py-3.5 text-center whitespace-nowrap">
                                <div className="-my-px inline-flex justify-center">
                                  <StatusBadge
                                    tone="secondary"
                                    label={doc.category}
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="align-top px-3 py-3.5 font-mono text-xs sm:text-sm leading-5 font-semibold text-center whitespace-nowrap">
                                {doc.doc_number}
                              </TableCell>
                              <TableCell className="align-top px-3 py-3.5 text-center text-xs sm:text-sm leading-5 tabular-nums whitespace-nowrap">
                                {formatDateID(doc.doc_date)}
                              </TableCell>
                              <TableCell className="align-top px-3 py-3.5 text-center text-xs sm:text-sm leading-5 whitespace-nowrap">
                                {doc.status}
                              </TableCell>
                              <TableCell className="align-top pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                                <div className="-my-1.5 inline-flex justify-center">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    title="Unduh Dokumen PDF"
                                    className="size-8 rounded-lg text-primary dark:text-sky-400 hover:bg-primary/10 cursor-pointer"
                                    onClick={() =>
                                      void handleDownloadBuyerDoc(doc)
                                    }
                                  >
                                    <DownloadIcon className="size-4" />
                                    <span className="sr-only">Unduh PDF</span>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </TabsContent>

          {/* TAB 2: Pengajuan PO Klien Baru */}
          <TabsContent value="submit" className="mt-5">
            <Card className="overflow-hidden">
              <CardHeader className="px-6 py-4 border-b border-border/70">
                <CardTitle className="text-base sm:text-lg font-bold">
                  Formulir Pengajuan Purchase Order (PO) Klien
                </CardTitle>
                <CardDescription>
                  Setelah dikirim, sistem menerbitkan Nomor PO dengan kode unik{" "}
                  <span className="font-semibold text-foreground">
                    PO-YYYYMM-XXXXXX
                  </span>
                  . Simpan kode tersebut untuk memantau progres proyek Anda.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 flex flex-col gap-6">
                {createdPoCode ? (
                  <Alert>
                    <CheckCircle2Icon className="size-4" />
                    <AlertTitle>
                      PO Klien Berhasil Diterima: {createdPoCode}
                    </AlertTitle>
                    <AlertDescription className="mt-2 flex flex-wrap items-center gap-2">
                      <span>
                        Mohon simpan kode unik ini. Status awal PO adalah
                        Menunggu Verifikasi Admin Altvira.
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          void navigator.clipboard?.writeText(createdPoCode);
                          toast.success("Kode PO disalin ke papan klip.");
                        }}
                      >
                        <CopyIcon className="size-3.5" />
                        <span>Salin Kode PO</span>
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : null}

                <form onSubmit={handleSubmitPo}>
                  <FieldGroup className="gap-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel
                          htmlFor="bp-name"
                          required
                          className="text-xs sm:text-sm font-medium"
                        >
                          Nama Lengkap Penanggung Jawab
                        </FieldLabel>
                        <Input
                          id="bp-name"
                          required
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="Contoh: Hendra Wijaya"
                          className="text-xs sm:text-sm"
                        />
                      </Field>
                      <Field>
                        <FieldLabel
                          htmlFor="bp-comp"
                          required
                          className="text-xs sm:text-sm font-medium"
                        >
                          Nama Perusahaan / Instansi
                        </FieldLabel>
                        <Input
                          id="bp-comp"
                          required
                          value={clientCompany}
                          onChange={(e) => setClientCompany(e.target.value)}
                          placeholder="Contoh: PT Sinar Niaga Distribusi"
                          className="text-xs sm:text-sm"
                        />
                      </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field>
                        <FieldLabel
                          htmlFor="bp-mail"
                          required
                          className="text-xs sm:text-sm font-medium"
                        >
                          Email Resmi
                        </FieldLabel>
                        <Input
                          id="bp-mail"
                          type="email"
                          required
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          placeholder="Contoh: finance@perusahaan.co.id"
                          className="text-xs sm:text-sm"
                        />
                      </Field>
                      <Field>
                        <FieldLabel
                          htmlFor="bp-phone"
                          className="text-xs sm:text-sm font-medium"
                        >
                          Nomor Telepon
                        </FieldLabel>
                        <Input
                          id="bp-phone"
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="Contoh: 0812-3456-7890"
                          className="text-xs sm:text-sm"
                        />
                      </Field>
                      <Field>
                        <FieldLabel
                          htmlFor="bp-qt"
                          className="text-xs sm:text-sm font-medium"
                        >
                          Nomor Referensi Quotation Altvira
                        </FieldLabel>
                        <Input
                          id="bp-qt"
                          value={quotationReference}
                          onChange={(e) =>
                            setQuotationReference(e.target.value)
                          }
                          placeholder="Contoh: QT/ALT/2026/11/001"
                          className="text-xs sm:text-sm"
                        />
                      </Field>
                    </div>

                    {/* Rincian Item Pekerjaan / Layanan (Nested Edge-to-Edge Table Card) */}
                    <div className="rounded-2xl border border-border/80 bg-card/40 overflow-hidden">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-border/70 bg-muted/15">
                        <div className="space-y-1 min-w-0">
                          <FieldLabel
                            required
                            className="text-xs sm:text-sm font-semibold text-foreground"
                          >
                            Rincian Pekerjaan / Layanan yang Dipesan
                          </FieldLabel>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Tambahkan daftar paket pekerjaan beserta kuantitas dan estimasi harga satuan.
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-primary/25 bg-primary/10 text-primary dark:text-sky-400 hover:bg-primary/15 shrink-0 self-start sm:self-center"
                          onClick={() =>
                            setItems((prev) => [
                              ...prev,
                              { item: "", qty: 1, price: 0 },
                            ])
                          }
                        >
                          <PlusIcon className="size-3.5" />
                          <span>Tambah Item</span>
                        </Button>
                      </div>

                      {/* Tabel Rincian Item (Desktop) */}
                      <div className="hidden sm:block">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/25 hover:bg-muted/25">
                              <TableHead className="pl-5 pr-2 text-center text-xs sm:text-sm font-semibold w-12 whitespace-nowrap">
                                No
                              </TableHead>
                              <TableHead className="px-2.5 text-center text-xs sm:text-sm font-semibold">
                                Deskripsi Paket / Pekerjaan
                                <span className="text-destructive ml-1" aria-hidden="true">
                                  *
                                </span>
                              </TableHead>
                              <TableHead className="px-2.5 text-center text-xs sm:text-sm font-semibold w-24 whitespace-nowrap">
                                Qty
                                <span className="text-destructive ml-1" aria-hidden="true">
                                  *
                                </span>
                              </TableHead>
                              <TableHead className="px-2.5 text-center text-xs sm:text-sm font-semibold w-48 whitespace-nowrap">
                                Harga Satuan
                                <span className="text-destructive ml-1" aria-hidden="true">
                                  *
                                </span>
                              </TableHead>
                              <TableHead className="px-3 text-center text-xs sm:text-sm font-semibold w-44 whitespace-nowrap">
                                Subtotal
                              </TableHead>
                              <TableHead className="pl-2 pr-5 text-center text-xs sm:text-sm font-semibold w-16 whitespace-nowrap">
                                Aksi
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((it, idx) => {
                              const rowSubtotal = Math.round(it.qty * it.price);
                              return (
                                <TableRow key={idx} className="hover:bg-muted/10">
                                  <TableCell className="align-middle pl-5 pr-2 py-3 text-center text-xs sm:text-sm font-medium text-muted-foreground tabular-nums">
                                    {idx + 1}
                                  </TableCell>
                                  <TableCell className="align-middle px-2.5 py-3">
                                    <Input
                                      required
                                      placeholder="Deskripsi paket/pekerjaan"
                                      className="h-9 text-xs sm:text-sm"
                                      value={it.item}
                                      onChange={(e) =>
                                        setItems((prev) =>
                                          prev.map((x, i) =>
                                            i === idx
                                              ? { ...x, item: e.target.value }
                                              : x,
                                          ),
                                        )
                                      }
                                    />
                                  </TableCell>
                                  <TableCell className="align-middle px-2.5 py-3">
                                    <NumberInput
                                      allowDecimal={false}
                                      min={1}
                                      required
                                      className="h-9 text-center text-xs sm:text-sm tabular-nums"
                                      value={it.qty}
                                      onValueChange={(qty) =>
                                        setItems((prev) =>
                                          prev.map((x, i) =>
                                            i === idx ? { ...x, qty } : x,
                                          ),
                                        )
                                      }
                                    />
                                  </TableCell>
                                  <TableCell className="align-middle px-2.5 py-3">
                                    <div className="relative flex items-center">
                                      <span className="pointer-events-none absolute left-3 text-xs text-muted-foreground select-none">
                                        Rp
                                      </span>
                                      <NumberInput
                                        allowDecimal={false}
                                        min={1}
                                        required
                                        placeholder="0"
                                        className="h-9 pl-9 text-right text-xs sm:text-sm tabular-nums"
                                        value={it.price || 0}
                                        onValueChange={(price) =>
                                          setItems((prev) =>
                                            prev.map((x, i) =>
                                              i === idx ? { ...x, price } : x,
                                            ),
                                          )
                                        }
                                      />
                                    </div>
                                  </TableCell>
                                  <TableCell className="align-middle px-3 py-3">
                                    <MonetaryCell amount={rowSubtotal} />
                                  </TableCell>
                                  <TableCell className="align-middle pl-2 pr-5 py-3 text-center">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      disabled={items.length === 1}
                                      title={
                                        items.length === 1
                                          ? "Minimal harus terdapat 1 item"
                                          : "Hapus Baris Item"
                                      }
                                      className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-35"
                                      onClick={() =>
                                        setItems((prev) =>
                                          prev.filter((_, i) => i !== idx),
                                        )
                                      }
                                    >
                                      <Trash2Icon className="size-4" />
                                      <span className="sr-only">
                                        Hapus Baris
                                      </span>
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Tampilan Kartu Ringkas (Seluler < 640px) */}
                      <div className="sm:hidden divide-y divide-border/70">
                        {items.map((it, idx) => {
                          const rowSubtotal = Math.round(it.qty * it.price);
                          return (
                            <div key={idx} className="p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                                  Item #{idx + 1}
                                </span>
                                {items.length > 1 ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    title="Hapus Baris Item"
                                    className="size-8 rounded-lg text-destructive hover:bg-destructive/10"
                                    onClick={() =>
                                      setItems((prev) =>
                                        prev.filter((_, i) => i !== idx),
                                      )
                                    }
                                  >
                                    <Trash2Icon className="size-4" />
                                    <span className="sr-only">Hapus Baris</span>
                                  </Button>
                                ) : null}
                              </div>
                              <div className="space-y-1.5">
                                <span className="block text-xs font-medium text-muted-foreground">
                                  Deskripsi Paket / Pekerjaan{" "}
                                  <span className="text-destructive">*</span>
                                </span>
                                <Input
                                  required
                                  placeholder="Deskripsi paket/pekerjaan"
                                  className="text-xs sm:text-sm"
                                  value={it.item}
                                  onChange={(e) =>
                                    setItems((prev) =>
                                      prev.map((x, i) =>
                                        i === idx
                                          ? { ...x, item: e.target.value }
                                          : x,
                                      ),
                                    )
                                  }
                                />
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-1 space-y-1.5">
                                  <span className="block text-xs font-medium text-muted-foreground">
                                    Qty{" "}
                                    <span className="text-destructive">*</span>
                                  </span>
                                  <NumberInput
                                    allowDecimal={false}
                                    min={1}
                                    required
                                    className="text-center text-xs sm:text-sm tabular-nums"
                                    value={it.qty}
                                    onValueChange={(qty) =>
                                      setItems((prev) =>
                                        prev.map((x, i) =>
                                          i === idx ? { ...x, qty } : x,
                                        ),
                                      )
                                    }
                                  />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                  <span className="block text-xs font-medium text-muted-foreground">
                                    Harga Satuan{" "}
                                    <span className="text-destructive">*</span>
                                  </span>
                                  <div className="relative flex items-center">
                                    <span className="pointer-events-none absolute left-3 text-xs text-muted-foreground select-none">
                                      Rp
                                    </span>
                                    <NumberInput
                                      allowDecimal={false}
                                      min={1}
                                      required
                                      placeholder="0"
                                      className="pl-9 text-right text-xs sm:text-sm tabular-nums"
                                      value={it.price || 0}
                                      onValueChange={(price) =>
                                        setItems((prev) =>
                                          prev.map((x, i) =>
                                            i === idx ? { ...x, price } : x,
                                          ),
                                        )
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                                <span className="text-xs font-medium text-muted-foreground">
                                  Subtotal
                                </span>
                                <span className="text-xs sm:text-sm font-semibold text-foreground tabular-nums">
                                  {formatRupiah(rowSubtotal)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Ringkasan Total Estimasi PO */}
                      <div className="px-5 py-3.5 border-t border-border/70 bg-muted/15 flex items-center justify-between gap-4">
                        <span className="text-xs sm:text-sm font-semibold text-muted-foreground">
                          Total Estimasi Nilai Purchase Order
                        </span>
                        <span className="text-base sm:text-lg font-bold text-foreground tabular-nums">
                          {formatRupiah(totalDraftPo)}
                        </span>
                      </div>
                    </div>

                    {turnstileSiteKey && !isDemoMode ? (
                      <Field>
                        <FieldLabel required className="text-xs sm:text-sm font-medium">
                          Verifikasi Keamanan Anti-Bot
                        </FieldLabel>
                        <div ref={turnstileContainerRef} />
                        <FieldDescription>
                          Dilindungi oleh verifikasi Cloudflare Turnstile.
                        </FieldDescription>
                      </Field>
                    ) : null}

                    {/* Footer Form Pengajuan PO */}
                    <div className="pt-4 border-t border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0 leading-relaxed">
                        <ShieldCheckIcon className="size-4 text-primary dark:text-sky-400 shrink-0" />
                        <span>
                          Endpoint publik dilindungi verifikasi Cloudflare Turnstile &amp; pembatasan laju pada server produksi.
                        </span>
                      </div>
                      <Button
                        type="submit"
                        disabled={submittingPo}
                        className="shrink-0"
                      >
                        {submittingPo ? (
                          <Spinner data-icon="inline-start" />
                        ) : (
                          <CheckCircle2Icon className="size-4" />
                        )}
                        <span>Kirim Purchase Order (PO) Klien</span>
                      </Button>
                    </div>
                  </FieldGroup>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </main>
    </div>
  );
}
