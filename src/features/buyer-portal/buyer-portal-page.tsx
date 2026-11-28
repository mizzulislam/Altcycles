import * as React from "react";
import { Link } from "react-router-dom";
import { PlusIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { AltviraLogoMark } from "@/components/shared/altvira-logo";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/lib/i18n";
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
import { DEMO_COMPANY } from "@/lib/demo-seed";
import { isDemoMode } from "@/lib/supabase";
import type { BuyerPortalLookupDto } from "@/types/database.types";
import { BuyerPortalLookupTab } from "./components/buyer-portal-lookup-tab";
import { BuyerPortalSubmitTab } from "./components/buyer-portal-submit-tab";
import { BuyerPortalSuccessDialog } from "./components/buyer-portal-success-dialog";
import type { SubmittedPoDialogState } from "./components/buyer-portal-types";

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

export function BuyerPortalPage() {
  const { t } = useLanguage();
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
      toast.error(t("projects:buyer_portal.toast_turnstile_required"));
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

      {/* Top Header Bar */}
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
          {/* Header Portal Pelanggan */}
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
              <BuyerPortalLookupTab
                poQuery={poQuery}
                setPoQuery={setPoQuery}
                searching={searching}
                lookupResult={lookupResult}
                onLookup={handleLookup}
                onDownloadBuyerDoc={handleDownloadBuyerDoc}
                onDownloadBuyerDocWord={handleDownloadBuyerDocWord}
              />
            </TabsContent>

            {/* TAB 2: Pengajuan PO Klien Baru */}
            <TabsContent value="submit" className="flex flex-col gap-6 mt-5">
              <BuyerPortalSubmitTab
                clientName={clientName}
                setClientName={setClientName}
                clientCompany={clientCompany}
                setClientCompany={setClientCompany}
                clientEmail={clientEmail}
                setClientEmail={setClientEmail}
                clientPhone={clientPhone}
                setClientPhone={setClientPhone}
                quotationReference={quotationReference}
                setQuotationReference={setQuotationReference}
                items={items}
                setItems={setItems}
                totalDraftPo={totalDraftPo}
                turnstileSiteKey={turnstileSiteKey}
                turnstileContainerRef={turnstileContainerRef}
                submittingPo={submittingPo}
                onSubmitPo={handleSubmitPo}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Dialog Konfirmasi Pengiriman PO Klien & Instruksi Simpan Kode PO */}
      <BuyerPortalSuccessDialog
        modal={submittedPoModal}
        copied={copiedModalPo}
        onCopy={() => {
          if (!submittedPoModal) return;
          void navigator.clipboard?.writeText(submittedPoModal.poNumber);
          setCopiedModalPo(true);
          toast.success(t("projects:buyer_portal.toast_copied"));
        }}
        onClose={handleCloseSuccessModal}
        onDownloadPdf={() => void handleDownloadSubmittedPoPdf()}
        onDownloadWord={() => void handleDownloadSubmittedPoWord()}
      />
    </div>
  );
}
