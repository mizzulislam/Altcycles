import * as React from "react";
import { Trans } from "react-i18next";
import {
  CheckCircle2Icon,
  PlusIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from "lucide-react";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/empty";
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
import { formatRupiah } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import { isDemoMode } from "@/lib/supabase";

interface BuyerPortalSubmitTabProps {
  clientName: string;
  setClientName: (val: string) => void;
  clientCompany: string;
  setClientCompany: (val: string) => void;
  clientEmail: string;
  setClientEmail: (val: string) => void;
  clientPhone: string;
  setClientPhone: (val: string) => void;
  quotationReference: string;
  setQuotationReference: (val: string) => void;
  items: Array<{ item: string; qty: number; price: number }>;
  setItems: React.Dispatch<
    React.SetStateAction<Array<{ item: string; qty: number; price: number }>>
  >;
  totalDraftPo: number;
  turnstileSiteKey: string;
  turnstileContainerRef: React.RefObject<HTMLDivElement | null>;
  submittingPo: boolean;
  onSubmitPo: (e: React.FormEvent) => void;
}

export function BuyerPortalSubmitTab({
  clientName,
  setClientName,
  clientCompany,
  setClientCompany,
  clientEmail,
  setClientEmail,
  clientPhone,
  setClientPhone,
  quotationReference,
  setQuotationReference,
  items,
  setItems,
  totalDraftPo,
  turnstileSiteKey,
  turnstileContainerRef,
  submittingPo,
  onSubmitPo,
}: BuyerPortalSubmitTabProps) {
  const { t } = useLanguage();

  return (
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
        <form onSubmit={onSubmitPo}>
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
                  onChange={(e) => setQuotationReference(e.target.value)}
                  placeholder={t("projects:buyer_portal.field_qt_ref_ph")}
                  className="text-xs sm:text-sm"
                />
              </Field>
            </div>

            {/* Rincian Item Pekerjaan / Layanan */}
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
  );
}
