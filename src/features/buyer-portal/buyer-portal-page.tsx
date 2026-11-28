import * as React from "react";
import { Link } from "react-router-dom";
import { Trans } from "react-i18next";
import {
  CheckCircle2Icon,
  CheckIcon,
  CopyIcon,
  PlusIcon,
  SearchIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { AltviraLogoMark } from "@/components/shared/altvira-logo";
import { DocumentDownloadMenu } from "@/components/shared/document-download-menu";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { ThemeToggle } from "@/components/shared/theme-toggle";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ModalFooterAction } from "@/components/patterns";
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
import { formatDateI18n, formatDateTimeI18n, formatRupiah } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  publicBuyerLookupPo,
  publicBuyerSubmitPo,
} from "@/lib/operations-service";
import {
  buildClientPoPdfSpec,
  downloadPdfBytes,
  generateDocumentPdf,
} from "@/lib/pdf-generator";
import { downloadWordBlob, generateDocumentWord } from "@/lib/word-generator";
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
      reset?: (widgetId?: string) => void;
      remove?: (widgetId: string) => void;
    };
  }
}

interface SubmittedPoDialogState {
  poNumber: string;
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  clientPhone: string;
  quotationReference: string;
  submittedAt: string;
  items: Array<{ item: string; qty: number; price: number }>;
  totalAmount: number;
}

export function BuyerPortalPage() {
  const { t, language } = useLanguage();
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
  const [submittedPoModal, setSubmittedPoModal] =
    React.useState<SubmittedPoDialogState | null>(null);
  const [copiedModalPo, setCopiedModalPo] = React.useState(false);

  const turnstileContainerRef = React.useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = React.useRef<string | null>(null);

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
        turnstileWidgetIdRef.current = widgetId;
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
      turnstileWidgetIdRef.current = null;
    };
  }, [turnstileSiteKey]);

  function handleCloseSuccessModal() {
    setSubmittedPoModal(null);
    setCopiedModalPo(false);
    setClientName("");
    setClientCompany("");
    setClientEmail("");
    setClientPhone("");
    setQuotationReference("");
    setItems([{ item: "", qty: 1, price: 0 }]);
    setTurnstileToken("");
    if (turnstileWidgetIdRef.current && window.turnstile?.reset) {
      window.turnstile.reset(turnstileWidgetIdRef.current);
    }
  }

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    try {
      const dto = await publicBuyerLookupPo(poQuery);
      setLookupResult(dto);
    } catch (err) {
      setLookupResult(null);
      toast.error(
        err instanceof Error ? err.message : t("projects:buyer_portal.toast_po_not_found"),
      );
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmitPo(e: React.FormEvent) {
    e.preventDefault();
    if (turnstileSiteKey && !isDemoMode && !turnstileToken) {
      toast.error(
        t("projects:buyer_portal.toast_turnstile_required"),
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
      const validItems = items
        .map((it) => ({
          item: it.item.trim(),
          qty: Math.max(1, Math.round(it.qty)),
          price: Math.max(0, Math.round(it.price)),
        }))
        .filter((it) => it.item.length > 0);
      const totalAmount = validItems.reduce(
        (s, it) => s + Math.round(it.qty * it.price),
        0,
      );
      setCopiedModalPo(false);
      setSubmittedPoModal({
        poNumber: res.po_number,
        clientName: clientName.trim(),
        clientCompany: clientCompany.trim(),
        clientEmail: clientEmail.trim(),
        clientPhone: clientPhone.trim(),
        quotationReference: quotationReference.trim(),
        submittedAt: new Date().toISOString().slice(0, 10),
        items: validItems,
        totalAmount,
      });
      setPoQuery(res.po_number);
      toast.success(
        t("projects:buyer_portal.toast_submit_success", { poNumber: res.po_number }),
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("projects:buyer_portal.toast_submit_failed"),
      );
    } finally {
      setSubmittingPo(false);
    }
  }

  async function handleDownloadSubmittedPoPdf() {
    if (!submittedPoModal) return;
    try {
      const spec = buildClientPoPdfSpec({
        company: DEMO_COMPANY,
        poNumber: submittedPoModal.poNumber,
        poDate: submittedPoModal.submittedAt,
        clientName: submittedPoModal.clientName,
        clientCompany: submittedPoModal.clientCompany,
        clientEmail: submittedPoModal.clientEmail,
        clientPhone: submittedPoModal.clientPhone,
        quotationReference: submittedPoModal.quotationReference,
        statusLabel: t("projects:buyer_portal.status_pending"),
        items: submittedPoModal.items,
        poValue: submittedPoModal.totalAmount,
      });
      const bytes = await generateDocumentPdf(spec);
      downloadPdfBytes(
        bytes,
        `PO_Klien_${submittedPoModal.poNumber.replace(/[^A-Za-z0-9_-]/g, "_")}.pdf`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("projects:buyer_portal.toast_download_pdf_fail"),
      );
    }
  }

  async function handleDownloadSubmittedPoWord() {
    if (!submittedPoModal) return;
    try {
      const spec = buildClientPoPdfSpec({
        company: DEMO_COMPANY,
        poNumber: submittedPoModal.poNumber,
        poDate: submittedPoModal.submittedAt,
        clientName: submittedPoModal.clientName,
        clientCompany: submittedPoModal.clientCompany,
        clientEmail: submittedPoModal.clientEmail,
        clientPhone: submittedPoModal.clientPhone,
        quotationReference: submittedPoModal.quotationReference,
        statusLabel: t("projects:buyer_portal.status_pending"),
        items: submittedPoModal.items,
        poValue: submittedPoModal.totalAmount,
      });
      const blob = await generateDocumentWord(spec);
      downloadWordBlob(
        blob,
        `PO_Klien_${submittedPoModal.poNumber.replace(/[^A-Za-z0-9_-]/g, "_")}.docx`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("projects:buyer_portal.toast_download_word_fail"),
      );
    }
  }

  function makeBuyerDocSpec(doc: BuyerPortalLookupDto["documents"][number]) {
    if (!lookupResult) return null;
    return {
      docTitle: t("projects:buyer_portal.doc_pdf_title", { category: doc.category.toUpperCase() }),
      docSubtitle: t("projects:buyer_portal.doc_pdf_po_ref", { poNumber: lookupResult.po_number }),
      docNumber: doc.doc_number,
      docDate: doc.doc_date,
      company: DEMO_COMPANY,
      recipientTitle: t("projects:buyer_portal.doc_pdf_recipient_title"),
      recipientLines: [
        lookupResult.client_name,
        lookupResult.client_company ?? "-",
      ],
      metaRows: [
        {
          label: t("projects:buyer_portal.doc_pdf_label_project"),
          value: lookupResult.project
            ? `${lookupResult.project.code} - ${lookupResult.project.name}`
            : t("projects:buyer_portal.project_waiting_link"),
        },
        { label: t("projects:buyer_portal.doc_pdf_label_category"), value: doc.category },
        { label: t("projects:buyer_portal.doc_pdf_label_status"), value: doc.status },
      ],
      paragraphsBefore: [
        t("projects:buyer_portal.doc_pdf_notice"),
      ],
      rightSignatureName: `${DEMO_COMPANY.signer_name} - ${DEMO_COMPANY.signer_title}`,
    };
  }

  async function handleDownloadBuyerDoc(
    doc: BuyerPortalLookupDto["documents"][number],
  ) {
    const spec = makeBuyerDocSpec(doc);
    if (!spec) return;
    const bytes = await generateDocumentPdf(spec);
    downloadPdfBytes(
      bytes,
      `${doc.category}_${doc.doc_number.replace(/\//g, "_")}.pdf`,
    );
  }

  async function handleDownloadBuyerDocWord(
    doc: BuyerPortalLookupDto["documents"][number],
  ) {
    const spec = makeBuyerDocSpec(doc);
    if (!spec) return;
    const blob = await generateDocumentWord(spec);
    downloadWordBlob(
      blob,
      `${doc.category}_${doc.doc_number.replace(/\//g, "_")}.docx`,
    );
  }

  const totalDraftPo = items.reduce(
    (s, it) => s + Math.round(it.qty * it.price),
    0,
  );

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Background Architectural Grid Pattern */}
      <div
        className="fixed inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none z-0"
        aria-hidden="true"
      />

      {/* Ambient Glow Orbs */}
      <div
        className="fixed -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none z-0"
        aria-hidden="true"
      />
      <div
        className="fixed -bottom-32 -right-32 w-96 h-96 rounded-full bg-sky-400/10 blur-3xl pointer-events-none z-0"
        aria-hidden="true"
      />

      {/* Top Header Bar sejajar sistem internal: Breadcrumb di kiri, Toggle Tema & Bahasa di ujung kanan atas */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/80 bg-card/90 px-4 sm:px-6 backdrop-blur-md">
        <nav
          aria-label={t("common:nav.breadcrumb")}
          className="flex items-center gap-2 text-xs text-muted-foreground min-w-0"
        >
          <Link
            to="/login"
            className="hover:text-foreground transition-colors font-medium whitespace-nowrap"
          >
            {t("projects:buyer_portal.home")}
          </Link>
          <span className="text-muted-foreground/60 select-none">/</span>
          <span className="text-foreground font-semibold truncate">
            {t("projects:buyer_portal.portal_name")}
          </span>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <LanguageToggle
            size="sm"
            className="size-9 rounded-2xl border border-border shadow-2xs shrink-0"
          />
          <ThemeToggle
            size="sm"
            className="size-9 rounded-2xl border border-border shadow-2xs shrink-0"
          />
        </div>
      </header>

      <main className="relative z-10 flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          {/* Header Portal Pelanggan: Logo Altvira sejajar ujung atas judul & ujung bawah deskripsi */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="flex max-sm:size-10 size-12 sm:size-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border border-border/80 bg-card shadow-2xs">
              <AltviraLogoMark size={36} className="max-sm:size-6" iconVariant="transparent" />
            </div>
            <div className="flex flex-col justify-center sm:justify-between min-w-0 sm:min-h-14 py-0.5">
              <h1 className="max-sm:text-base text-2xl sm:text-3xl font-bold tracking-tight leading-snug sm:leading-none text-foreground truncate">
                {t("projects:buyer_portal.page_title")}
              </h1>
              <p className="max-sm:text-[11px] text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-0 leading-relaxed sm:leading-snug truncate">
                {t("projects:buyer_portal.page_subtitle")}
              </p>
            </div>
          </div>

          <Tabs defaultValue="lookup" className="w-full">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2">
              <TabsTrigger value="lookup" className="w-full">
                <SearchIcon className="size-4 shrink-0" />
                <span>{t("projects:buyer_portal.tab_lookup")}</span>
              </TabsTrigger>
              <TabsTrigger value="submit" className="w-full">
                <PlusIcon className="size-4 shrink-0" />
                <span>{t("projects:buyer_portal.tab_submit")}</span>
              </TabsTrigger>
            </TabsList>

          {/* TAB 1: Pelacakan Progres & Dokumen 1 PO */}
          <TabsContent value="lookup" className="flex flex-col gap-6 mt-5">
            <Card className="overflow-hidden">
              <CardHeader className="max-sm:px-4 max-sm:py-3.5 px-6 py-4 border-b border-border/70">
                <CardTitle className="text-base sm:text-lg font-bold">
                  {t("projects:buyer_portal.card_lookup_title")}
                </CardTitle>
                <CardDescription>
                  {t("projects:buyer_portal.card_lookup_desc")}
                  {isDemoMode
                    ? t("projects:buyer_portal.demo_hint")
                    : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="max-sm:p-4 p-6">
                <form
                  onSubmit={handleLookup}
                  className="flex flex-col gap-3 sm:flex-row sm:items-center"
                >
                  <Input
                    required
                    value={poQuery}
                    onChange={(e) => setPoQuery(e.target.value.toUpperCase())}
                    placeholder={t("projects:buyer_portal.lookup_ph")}
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
                    <span>{t("projects:buyer_portal.btn_check_status")}</span>
                  </Button>
                </form>
              </CardContent>
            </Card>

            {lookupResult ? (
              <div className="flex flex-col gap-6">
                {/* Detail Purchase Order */}
                <Card className="overflow-hidden">
                  <CardHeader className="max-sm:px-4 max-sm:py-3.5 px-6 py-4 border-b border-border/70">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {t("projects:buyer_portal.po_number_label")}
                    </p>
                    <CardTitle className="font-mono text-lg sm:text-xl font-bold">
                      {lookupResult.po_number}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 sm:gap-8">
                      {/* Kolom Kiri */}
                      <div className="space-y-5 min-w-0 flex-1">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">
                            {t("projects:buyer_portal.client_name_label")}
                          </p>
                          <p className="text-sm font-semibold text-foreground mt-1 break-words">
                            {lookupResult.client_name}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">
                            {t("projects:buyer_portal.client_company_label")}
                          </p>
                          <p className="text-sm font-semibold text-foreground mt-1 break-words">
                            {lookupResult.client_company || "-"}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">
                            {t("projects:buyer_portal.submitted_date_label")}
                          </p>
                          <p className="text-sm font-semibold text-foreground mt-1 tabular-nums">
                            {formatDateTimeI18n(lookupResult.submitted_at, language)}
                          </p>
                        </div>
                      </div>

                      {/* Kolom Kanan (seimbang di sisi kanan tanpa menempel ke tepi) */}
                      <div className="space-y-5 shrink-0 sm:w-64 md:w-72 min-w-0">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">
                            {t("projects:buyer_portal.verification_status_label")}
                          </p>
                          <p
                            className={cn(
                              "text-sm font-semibold mt-1",
                              lookupResult.verification_status === "verified"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : lookupResult.verification_status === "rejected"
                                  ? "text-destructive"
                                  : "text-amber-600 dark:text-amber-400",
                            )}
                          >
                            {lookupResult.verification_status === "verified"
                              ? t("projects:buyer_portal.status_verified")
                              : lookupResult.verification_status === "rejected"
                                ? t("projects:buyer_portal.status_rejected")
                                : t("projects:buyer_portal.status_pending")}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">
                            {t("projects:buyer_portal.po_value_label")}
                          </p>
                          <p className="text-sm font-semibold text-foreground mt-1 tabular-nums">
                            {formatRupiah(lookupResult.po_value)}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">
                            {t("projects:buyer_portal.progress_label")}
                          </p>
                          <p className="text-sm font-semibold text-foreground mt-1 tabular-nums">
                            {lookupResult.project?.cumulative_progress_pct ?? 0}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Proyek Terkait: Lebar penuh hingga ujung kanan div */}
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {t("projects:buyer_portal.project_label")}
                      </p>
                      <p className="text-sm font-semibold text-foreground mt-1 leading-relaxed break-words">
                        {lookupResult.project
                          ? `${lookupResult.project.code}: ${lookupResult.project.name}`
                          : t("projects:buyer_portal.project_pending")}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabel Termin Proyek (Edge-to-Edge) */}
                <Card className="overflow-hidden">
                  <CardHeader className="max-sm:px-4 max-sm:py-3.5 px-6 py-4 border-b border-border/70">
                    <CardTitle className="text-base sm:text-lg font-bold">
                      {t("projects:buyer_portal.milestones_title")}
                    </CardTitle>
                    <CardDescription>
                      {t("projects:buyer_portal.milestones_desc")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                          <TableHead className="pl-6 pr-3 text-center text-xs sm:text-sm font-semibold w-16 whitespace-nowrap">
                            {t("projects:buyer_portal.col_no")}
                          </TableHead>
                          <TableHead className="px-3 text-center text-xs sm:text-sm font-semibold whitespace-nowrap">
                            {t("projects:buyer_portal.col_milestone_name")}
                          </TableHead>
                          <TableHead className="px-3 text-center text-xs sm:text-sm font-semibold w-24 whitespace-nowrap">
                            {t("projects:buyer_portal.col_portion")}
                          </TableHead>
                          <TableHead className="px-3 text-center text-xs sm:text-sm font-semibold w-44 whitespace-nowrap">
                            {t("projects:buyer_portal.col_amount")}
                          </TableHead>
                          <TableHead className="pl-2 pr-6 text-center text-xs sm:text-sm font-semibold w-36 whitespace-nowrap">
                            {t("projects:buyer_portal.col_status")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lookupResult.milestones.length === 0 ? (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={5} className="p-0">
                              <div className="py-10 px-6 bg-muted/10 border-t border-dashed border-border/70">
                                <EmptyState
                                  title={t("projects:buyer_portal.empty_milestones_title")}
                                  description={t("projects:buyer_portal.empty_milestones_desc")}
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
                                    label={t(`projects:status.${m.status}`) || m.status}
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
                  <CardHeader className="max-sm:px-4 max-sm:py-3.5 px-6 py-4 border-b border-border/70">
                    <CardTitle className="text-base sm:text-lg font-bold">
                      {t("projects:buyer_portal.docs_title")}
                    </CardTitle>
                    <CardDescription>
                      {t("projects:buyer_portal.docs_desc")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                          <TableHead className="pl-6 pr-3 text-center text-xs sm:text-sm font-semibold whitespace-nowrap">
                            {t("projects:buyer_portal.col_category")}
                          </TableHead>
                          <TableHead className="px-3 text-center text-xs sm:text-sm font-semibold whitespace-nowrap">
                            {t("projects:buyer_portal.col_doc_number")}
                          </TableHead>
                          <TableHead className="px-3 text-center text-xs sm:text-sm font-semibold whitespace-nowrap">
                            {t("projects:buyer_portal.col_date")}
                          </TableHead>
                          <TableHead className="px-3 text-center text-xs sm:text-sm font-semibold whitespace-nowrap">
                            {t("projects:buyer_portal.col_doc_status")}
                          </TableHead>
                          <TableHead className="pl-2 pr-6 text-center text-xs sm:text-sm font-semibold w-28 whitespace-nowrap">
                            {t("projects:buyer_portal.col_actions")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lookupResult.documents.length === 0 ? (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={5} className="p-0">
                              <div className="py-10 px-6 bg-muted/10 border-t border-dashed border-border/70">
                                <EmptyState
                                  title={t("projects:buyer_portal.empty_docs_title")}
                                  description={t("projects:buyer_portal.empty_docs_desc")}
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
                                {formatDateI18n(doc.doc_date, language)}
                              </TableCell>
                              <TableCell className="align-top px-3 py-3.5 text-center text-xs sm:text-sm leading-5 whitespace-nowrap">
                                {t(`projects:status.${doc.status}`) || doc.status}
                              </TableCell>
                              <TableCell className="align-top pl-2 pr-6 py-3.5 text-center whitespace-nowrap">
                                <div className="-my-1.5 inline-flex justify-center">
                                  <DocumentDownloadMenu
                                    title={t("projects:buyer_portal.download_tooltip")}
                                    onDownloadPdf={() =>
                                      void handleDownloadBuyerDoc(doc)
                                    }
                                    onDownloadWord={() =>
                                      void handleDownloadBuyerDocWord(doc)
                                    }
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
              </div>
            ) : null}
          </TabsContent>

          {/* TAB 2: Pengajuan PO Klien Baru */}
          <TabsContent value="submit" className="mt-5">
            <Card className="overflow-hidden">
              <CardHeader className="max-sm:px-4 max-sm:py-3.5 px-6 py-4 border-b border-border/70">
                <CardTitle className="text-base sm:text-lg font-bold">
                  {t("projects:buyer_portal.form_title")}
                </CardTitle>
                <CardDescription>
                  <Trans i18nKey="projects:buyer_portal.form_desc">
                    Setelah dikirim, sistem menerbitkan Nomor PO dengan kode unik{" "}
                    <span className="font-semibold text-foreground">
                      PO-YYYYMM-XXXXXX
                    </span>
                    .
                  </Trans>
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 flex flex-col gap-6">
                <form onSubmit={handleSubmitPo}>
                  <FieldGroup className="gap-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel
                          htmlFor="bp-name"
                          required
                          className="text-xs sm:text-sm font-medium"
                        >
                          {t("projects:buyer_portal.field_pic_name")}
                        </FieldLabel>
                        <Input
                          id="bp-name"
                          required
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder={t("projects:buyer_portal.field_pic_name_ph")}
                          className="text-xs sm:text-sm"
                        />
                      </Field>
                      <Field>
                        <FieldLabel
                          htmlFor="bp-comp"
                          required
                          className="text-xs sm:text-sm font-medium"
                        >
                          {t("projects:buyer_portal.field_company")}
                        </FieldLabel>
                        <Input
                          id="bp-comp"
                          required
                          value={clientCompany}
                          onChange={(e) => setClientCompany(e.target.value)}
                          placeholder={t("projects:buyer_portal.field_company_ph")}
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
                          {t("projects:buyer_portal.field_email")}
                        </FieldLabel>
                        <Input
                          id="bp-mail"
                          type="email"
                          required
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          placeholder={t("projects:buyer_portal.field_email_ph")}
                          className="text-xs sm:text-sm"
                        />
                      </Field>
                      <Field>
                        <FieldLabel
                          htmlFor="bp-phone"
                          className="text-xs sm:text-sm font-medium"
                        >
                          {t("projects:buyer_portal.field_phone")}
                        </FieldLabel>
                        <Input
                          id="bp-phone"
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder={t("projects:buyer_portal.field_phone_ph")}
                          className="text-xs sm:text-sm"
                        />
                      </Field>
                      <Field>
                        <FieldLabel
                          htmlFor="bp-qt"
                          className="text-xs sm:text-sm font-medium"
                        >
                          {t("projects:buyer_portal.field_qt_ref")}
                        </FieldLabel>
                        <Input
                          id="bp-qt"
                          value={quotationReference}
                          onChange={(e) =>
                            setQuotationReference(e.target.value)
                          }
                          placeholder={t("projects:buyer_portal.field_qt_ref_ph")}
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
                            {t("projects:buyer_portal.items_box_title")}
                          </FieldLabel>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {t("projects:buyer_portal.items_box_desc")}
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
                          <span>{t("projects:buyer_portal.btn_add_item")}</span>
                        </Button>
                      </div>

                      {/* Tabel Rincian Item (Desktop) */}
                      <div className="hidden sm:block">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/25 hover:bg-muted/25">
                              <TableHead className="pl-5 pr-2 text-center text-xs sm:text-sm font-semibold w-12 whitespace-nowrap">
                                {t("projects:buyer_portal.col_no")}
                              </TableHead>
                              <TableHead className="px-2.5 text-center text-xs sm:text-sm font-semibold">
                                {t("projects:buyer_portal.col_item_desc")}
                                <span className="text-destructive ml-1" aria-hidden="true">
                                  *
                                </span>
                              </TableHead>
                              <TableHead className="px-2.5 text-center text-xs sm:text-sm font-semibold w-24 whitespace-nowrap">
                                {t("projects:buyer_portal.col_qty")}
                                <span className="text-destructive ml-1" aria-hidden="true">
                                  *
                                </span>
                              </TableHead>
                              <TableHead className="px-2.5 text-center text-xs sm:text-sm font-semibold w-48 whitespace-nowrap">
                                {t("projects:buyer_portal.col_unit_price")}
                                <span className="text-destructive ml-1" aria-hidden="true">
                                  *
                                </span>
                              </TableHead>
                              <TableHead className="px-3 text-center text-xs sm:text-sm font-semibold w-44 whitespace-nowrap">
                                {t("projects:buyer_portal.col_subtotal")}
                              </TableHead>
                              <TableHead className="pl-2 pr-5 text-center text-xs sm:text-sm font-semibold w-16 whitespace-nowrap">
                                {t("projects:buyer_portal.col_actions")}
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
                                      placeholder={t("projects:buyer_portal.col_item_desc_ph")}
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
                                          ? t("projects:buyer_portal.min_item_warning")
                                          : t("projects:buyer_portal.delete_item_row")
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
                                        {t("projects:buyer_portal.delete_row_sr")}
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
                                  {t("projects:buyer_portal.item_prefix", { index: idx + 1 })}
                                </span>
                                {items.length > 1 ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    title={t("projects:buyer_portal.delete_item_row")}
                                    className="size-8 rounded-lg text-destructive hover:bg-destructive/10"
                                    onClick={() =>
                                      setItems((prev) =>
                                        prev.filter((_, i) => i !== idx),
                                      )
                                    }
                                  >
                                    <Trash2Icon className="size-4" />
                                    <span className="sr-only">{t("projects:buyer_portal.delete_row_sr")}</span>
                                  </Button>
                                ) : null}
                              </div>
                              <div className="space-y-1.5">
                                <span className="block text-xs font-medium text-muted-foreground">
                                  {t("projects:buyer_portal.col_item_desc")}{" "}
                                  <span className="text-destructive">*</span>
                                </span>
                                <Input
                                  required
                                  placeholder={t("projects:buyer_portal.col_item_desc_ph")}
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
                                    {t("projects:buyer_portal.col_qty")}{" "}
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
                                    {t("projects:buyer_portal.col_unit_price")}{" "}
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
                                  {t("projects:buyer_portal.col_subtotal")}
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
                          {t("projects:buyer_portal.total_po_estimate")}
                        </span>
                        <span className="text-base sm:text-lg font-bold text-foreground tabular-nums">
                          {formatRupiah(totalDraftPo)}
                        </span>
                      </div>
                    </div>

                    {turnstileSiteKey && !isDemoMode ? (
                      <Field>
                        <FieldLabel required className="text-xs sm:text-sm font-medium">
                          {t("projects:buyer_portal.turnstile_label")}
                        </FieldLabel>
                        <div ref={turnstileContainerRef} />
                        <FieldDescription>
                          {t("projects:buyer_portal.turnstile_desc")}
                        </FieldDescription>
                      </Field>
                    ) : null}

                    {/* Footer Form Pengajuan PO */}
                    <div className="pt-4 border-t border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0 leading-relaxed">
                        <ShieldCheckIcon className="size-4 text-primary dark:text-sky-400 shrink-0" />
                        <span>
                          {t("projects:buyer_portal.security_footer_notice")}
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
                        <span>{t("projects:buyer_portal.btn_submit_po")}</span>
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

      {/* Dialog Konfirmasi Pengiriman PO Klien & Instruksi Simpan Kode PO */}
      <Dialog
        open={submittedPoModal !== null}
        onOpenChange={(open) => {
          if (!open) handleCloseSuccessModal();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("projects:buyer_portal.modal_success_title")}</DialogTitle>
          </DialogHeader>

          {submittedPoModal ? (
            <div className="flex flex-col gap-4">
              {/* Kartu Kode / Nomor PO */}
              <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4 flex items-center justify-between gap-4">
                <div className="flex flex-col justify-between min-h-11 py-0.5 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground leading-none">
                    {t("projects:buyer_portal.modal_po_number_label")}
                  </p>
                  <p className="text-lg sm:text-xl font-bold font-mono tracking-wide leading-none text-primary dark:text-sky-400 select-all break-all mt-1.5">
                    {submittedPoModal.poNumber}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  title={copiedModalPo ? t("projects:buyer_portal.modal_copied_po") : t("projects:buyer_portal.modal_copy_po")}
                  className="size-11 rounded-xl border-primary/25 bg-background/80 text-primary dark:text-sky-400 hover:bg-primary/15 shrink-0"
                  onClick={() => {
                    void navigator.clipboard?.writeText(
                      submittedPoModal.poNumber,
                    );
                    setCopiedModalPo(true);
                    toast.success(t("projects:buyer_portal.toast_copied"));
                  }}
                >
                  {copiedModalPo ? (
                    <CheckIcon className="size-5" />
                  ) : (
                    <CopyIcon className="size-5" />
                  )}
                  <span className="sr-only">{t("projects:buyer_portal.modal_copy_po")}</span>
                </Button>
              </div>

              {/* Ringkasan Pekerjaan / Layanan / Barang yang Dipesan */}
              <div className="rounded-2xl border border-border/80 bg-muted/15 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border/70 bg-muted/20 flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-foreground shrink-0">
                    {t("projects:buyer_portal.modal_order_details")}
                  </span>
                  <span className="text-muted-foreground truncate text-right">
                    {submittedPoModal.clientName}
                    {submittedPoModal.clientCompany
                      ? t("projects:buyer_portal.modal_from", { company: submittedPoModal.clientCompany })
                      : ""}
                  </span>
                </div>
                <div className="divide-y divide-border/60 max-h-48 overflow-y-auto">
                  {submittedPoModal.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-2.5 grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-x-2 text-xs"
                    >
                      <span className="font-medium text-muted-foreground tabular-nums">
                        {idx + 1}.
                      </span>
                      <div className="min-w-0 pr-4 sm:pr-6">
                        <p className="font-medium text-foreground break-words">
                          {it.item}
                        </p>
                        <p className="text-muted-foreground mt-0.5 tabular-nums">
                          {it.qty.toLocaleString("id-ID")} &times;{" "}
                          {formatRupiah(it.price)}
                        </p>
                      </div>
                      <span className="font-semibold text-foreground tabular-nums text-right whitespace-nowrap">
                        {formatRupiah(Math.round(it.qty * it.price))}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5 border-t border-border/70 bg-muted/20 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {t("projects:buyer_portal.modal_total_label")}
                  </span>
                  <span className="text-sm font-bold text-foreground tabular-nums">
                    {formatRupiah(submittedPoModal.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Instruksi Penyimpanan Kode PO & Reset Formulir */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[11px] text-foreground/90 leading-relaxed">
                {t("projects:buyer_portal.modal_save_instruction")}
              </div>
            </div>
          ) : null}

          <ModalFooterAction
            className="pt-2"
            extraActions={
              <DocumentDownloadMenu
                variant="button"
                label={t("projects:buyer_portal.modal_btn_export")}
                title={t("projects:buyer_portal.modal_btn_export_title")}
                onDownloadPdf={() => void handleDownloadSubmittedPoPdf()}
                onDownloadWord={() => void handleDownloadSubmittedPoWord()}
              />
            }
            onCancel={handleCloseSuccessModal}
            cancelLabel={t("projects:buyer_portal.modal_btn_close")}
            showSubmit={false}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
