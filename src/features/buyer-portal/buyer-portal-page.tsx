import * as React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  CopyIcon,
  DownloadIcon,
  PlusIcon,
  SearchIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { AltviraLogoMark } from "@/components/shared/altvira-logo";
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

  // Tab 1: Pelacakan 1 PO Tanpa Login (UC-35, UC-36)
  const [poQuery, setPoQuery] = React.useState(
    isDemoMode ? "PO-202611-SN8K4P" : "",
  );
  const [searching, setSearching] = React.useState(false);
  const [lookupResult, setLookupResult] =
    React.useState<BuyerPortalLookupDto | null>(null);

  // Tab 2: Pengajuan PO Klien Baru (UC-34)
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

  // Memuat widget resmi Cloudflare Turnstile bagi pengunjung manusia apabila site key tersedia
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
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <AltviraLogoMark size={36} iconVariant="transparent" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Portal Pelanggan: Altvira Technology
              </h1>
              <p className="text-xs text-muted-foreground">
                Akses informasi progres pengerjaan proyek dan dokumen invoice penagihan resmi klien secara mandiri.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle size="sm" />
            <Button variant="outline" size="sm" asChild>
              <Link to="/login">
                <ArrowLeftIcon data-icon="inline-start" />
                Login Tim Internal
              </Link>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="lookup">
          <TabsList>
            <TabsTrigger value="lookup">
              <SearchIcon className="size-4 shrink-0" />
              <span>Lacak Progres &amp; Unduh Dokumen PO</span>
            </TabsTrigger>
            <TabsTrigger value="submit">
              <PlusIcon className="size-4 shrink-0" />
              <span>Ajukan Purchase Order (PO) Baru</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Pelacakan Progres & Dokumen 1 PO */}
          <TabsContent value="lookup" className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Masukkan Nomor Akses PO Anda</CardTitle>
                <CardDescription>
                  Demi kerahasiaan antar klien, pencocokan dilakukan di sisi
                  server dan hanya menampilkan satu proyek yang cocok beserta
                  perlindungan pembatasan percobaan per IP.
                  {isDemoMode
                    ? " (Contoh pratinjau Mode Lokal: PO-202611-SN8K4P)"
                    : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleLookup}
                  className="flex flex-col gap-3 sm:flex-row"
                >
                  <Input
                    required
                    value={poQuery}
                    onChange={(e) => setPoQuery(e.target.value.toUpperCase())}
                    placeholder="Contoh: PO-202611-SN8K4P"
                    className="font-mono"
                  />
                  <Button type="submit" disabled={searching}>
                    {searching ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <SearchIcon data-icon="inline-start" />
                    )}
                    Cek Status Proyek
                  </Button>
                </form>
              </CardContent>
            </Card>

            {lookupResult ? (
              <div className="flex flex-col gap-4">
                <Card>
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="font-mono text-lg">
                        {lookupResult.po_number}
                      </CardTitle>
                      <CardDescription>
                        {lookupResult.client_name}
                        {lookupResult.client_company
                          ? ` — ${lookupResult.client_company}`
                          : ""}{" "}
                        · Diajukan {formatDateTimeID(lookupResult.submitted_at)}
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
                  <CardContent className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Nilai PO</p>
                      <p className="text-base font-bold">
                        {formatRupiah(lookupResult.po_value)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Proyek Terkait
                      </p>
                      <p className="text-sm font-semibold">
                        {lookupResult.project
                          ? `${lookupResult.project.code} — ${lookupResult.project.name}`
                          : "Sedang disiapkan Admin"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Capaian Penyelesaian Proyek
                      </p>
                      <p className="text-base font-bold text-primary">
                        {lookupResult.project?.cumulative_progress_pct ?? 0}%
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden">
                  <CardHeader className="px-6 py-4 border-b border-border/70">
                    <CardTitle>Jadwal &amp; Status Termin Proyek</CardTitle>
                    <CardDescription>
                      Informasi baca-saja tahapan penyelesaian dan penagihan
                      kontrak Anda.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                          <TableHead className="pl-6 pr-3 text-center w-16">#</TableHead>
                          <TableHead className="px-3 text-center">Termin</TableHead>
                          <TableHead className="px-3 text-center w-24">Porsi</TableHead>
                          <TableHead className="px-3 text-center w-44">Nominal</TableHead>
                          <TableHead className="pl-2 pr-6 text-center w-36">Status</TableHead>
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
                              <TableCell className="pl-6 pr-3 text-center tabular-nums">{m.sequence_no}</TableCell>
                              <TableCell className="font-medium">
                                <div>{m.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {m.achievement_criteria ?? ""}
                                </div>
                              </TableCell>
                              <TableCell className="text-center tabular-nums">{m.percentage}%</TableCell>
                              <TableCell className="font-semibold">
                                <MonetaryCell amount={m.amount} />
                              </TableCell>
                              <TableCell className="pl-2 pr-6 text-center">
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

                <Card className="overflow-hidden">
                  <CardHeader className="px-6 py-4 border-b border-border/70">
                    <CardTitle>Unduh Dokumen Resmi Proyek (UC-36)</CardTitle>
                    <CardDescription>
                      Quotation, SoW, SPK, BAKP, UAT, BAST, Invoice, dan
                      Kuitansi yang terkait dengan Nomor PO ini.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                          <TableHead className="pl-6 pr-3 text-center">Kategori</TableHead>
                          <TableHead className="px-3 text-center">Nomor Dokumen</TableHead>
                          <TableHead className="px-3 text-center">Tanggal</TableHead>
                          <TableHead className="px-3 text-center">Status</TableHead>
                          <TableHead className="pl-2 pr-6 text-center w-36">Aksi</TableHead>
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
                              <TableCell className="pl-6 pr-3 text-center">
                                <div className="-my-px inline-flex justify-center">
                                  <StatusBadge
                                    tone="secondary"
                                    label={doc.category}
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="font-mono font-semibold text-center">
                                {doc.doc_number}
                              </TableCell>
                              <TableCell className="text-center">
                                {formatDateID(doc.doc_date)}
                              </TableCell>
                              <TableCell className="text-center">
                                {doc.status}
                              </TableCell>
                              <TableCell className="pl-2 pr-6 text-center">
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
          <TabsContent value="submit">
            <Card>
              <CardHeader>
                <CardTitle>
                  Formulir Pengajuan Purchase Order (PO) Klien
                </CardTitle>
                <CardDescription>
                  Setelah dikirim, sistem menerbitkan Nomor PO dengan kode unik{" "}
                  <code>PO-YYYYMM-XXXXXX</code>. Simpan kode tersebut untuk memantau progres proyek Anda.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
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
                        <CopyIcon data-icon="inline-start" />
                        Salin Kode PO
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : null}

                <form onSubmit={handleSubmitPo}>
                  <FieldGroup>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="bp-name" required>
                          Nama Lengkap Penanggung Jawab
                        </FieldLabel>
                        <Input
                          id="bp-name"
                          required
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="Contoh: Hendra Wijaya"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="bp-comp" required>
                          Nama Perusahaan / Instansi
                        </FieldLabel>
                        <Input
                          id="bp-comp"
                          required
                          value={clientCompany}
                          onChange={(e) => setClientCompany(e.target.value)}
                          placeholder="Contoh: PT Sinar Niaga Distribusi"
                        />
                      </Field>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field>
                        <FieldLabel htmlFor="bp-mail" required>Email Resmi</FieldLabel>
                        <Input
                          id="bp-mail"
                          type="email"
                          required
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="bp-phone">Nomor Telepon</FieldLabel>
                        <Input
                          id="bp-phone"
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="bp-qt">
                          Nomor Referensi Quotation Altvira
                        </FieldLabel>
                        <Input
                          id="bp-qt"
                          value={quotationReference}
                          onChange={(e) =>
                            setQuotationReference(e.target.value)
                          }
                          placeholder="Contoh: QT/ALT/2026/11/001"
                        />
                      </Field>
                    </div>

                    <div className="flex flex-col gap-2 rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">
                          Rincian Pekerjaan / Layanan yang Dipesan
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setItems((prev) => [
                              ...prev,
                              { item: "", qty: 1, price: 0 },
                            ])
                          }
                        >
                          <PlusIcon data-icon="inline-start" />
                          Tambah Item
                        </Button>
                      </div>
                      {items.map((it, idx) => (
                        <div
                          key={idx}
                          className="grid items-center gap-2 sm:grid-cols-12"
                        >
                          <div className="sm:col-span-6">
                            <Input
                              required
                              placeholder="Deskripsi paket/pekerjaan"
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
                          <div className="sm:col-span-2">
                            <NumberInput
                              allowDecimal={false}
                              min={1}
                              required
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
                          <div className="flex items-center gap-1 sm:col-span-4">
                            <NumberInput
                              allowDecimal={false}
                              min={1}
                              required
                              placeholder="Harga satuan (Rp)"
                              value={it.price || 0}
                              onValueChange={(price) =>
                                setItems((prev) =>
                                  prev.map((x, i) =>
                                    i === idx ? { ...x, price } : x,
                                  ),
                                )
                              }
                            />
                            {items.length > 1 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  setItems((prev) =>
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
                      <div className="border-t pt-2 text-right text-sm font-bold">
                        Total Nilai PO: {formatRupiah(totalDraftPo)}
                      </div>
                    </div>

                    {turnstileSiteKey && !isDemoMode ? (
                      <Field>
                        <FieldLabel>Verifikasi Keamanan Anti-Bot</FieldLabel>
                        <div ref={turnstileContainerRef} />
                        <FieldDescription>
                          Dilindungi oleh verifikasi Cloudflare Turnstile.
                        </FieldDescription>
                      </Field>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ShieldCheckIcon className="size-4 text-primary" />
                        <span>
                          Endpoint publik dilindungi verifikasi Cloudflare
                          Turnstile &amp; pembatasan laju pada Edge Function
                          produksi.
                        </span>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button type="submit" disabled={submittingPo}>
                        {submittingPo ? (
                          <Spinner data-icon="inline-start" />
                        ) : null}
                        Kirim Purchase Order (PO) Klien
                      </Button>
                    </div>
                  </FieldGroup>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

