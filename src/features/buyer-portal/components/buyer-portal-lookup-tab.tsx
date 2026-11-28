import * as React from "react";
import { SearchIcon } from "lucide-react";
import { DocumentDownloadMenu } from "@/components/shared/document-download-menu";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState, Spinner } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateI18n, formatDateTimeI18n, formatRupiah } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import { isDemoMode } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { BuyerPortalLookupDto } from "@/types/database.types";

interface BuyerPortalLookupTabProps {
  poQuery: string;
  setPoQuery: (query: string) => void;
  searching: boolean;
  lookupResult: BuyerPortalLookupDto | null;
  onLookup: (e: React.FormEvent) => void;
  onDownloadBuyerDoc: (doc: BuyerPortalLookupDto["documents"][number]) => void;
  onDownloadBuyerDocWord: (doc: BuyerPortalLookupDto["documents"][number]) => void;
}

export function BuyerPortalLookupTab({
  poQuery,
  setPoQuery,
  searching,
  lookupResult,
  onLookup,
  onDownloadBuyerDoc,
  onDownloadBuyerDocWord,
}: BuyerPortalLookupTabProps) {
  const { t, language } = useLanguage();

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden">
        <CardHeader className="max-sm:px-4 max-sm:py-3.5 px-6 py-4 border-b border-border/70">
          <CardTitle className="text-base sm:text-lg font-bold">
            {t("projects:buyer_portal.card_lookup_title")}
          </CardTitle>
          <CardDescription>
            {t("projects:buyer_portal.card_lookup_desc")}
            {isDemoMode ? t("projects:buyer_portal.demo_hint") : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="max-sm:p-4 p-6">
          <form
            onSubmit={onLookup}
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

                {/* Kolom Kanan */}
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

              {/* Proyek Terkait */}
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

          {/* Tabel Termin Proyek */}
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
                              tone={m.status === "paid" ? "success" : "info"}
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

          {/* Tabel Dokumen Resmi Proyek */}
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
                            <StatusBadge tone="secondary" label={doc.category} />
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
                              onDownloadPdf={() => void onDownloadBuyerDoc(doc)}
                              onDownloadWord={() => void onDownloadBuyerDocWord(doc)}
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
    </div>
  );
}
