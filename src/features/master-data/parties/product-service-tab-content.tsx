import * as React from "react";
import { BriefcaseIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { MonetaryCell } from "@/components/shared/monetary-cell";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
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
import { getCompanyProfile } from "@/lib/data-service";
import { useLanguage } from "@/lib/i18n";
import { saveServiceProduct } from "@/lib/services/products-services-service";
import { recordExportLog } from "@/lib/operations-service";
import { downloadCsvFile } from "@/lib/csv-exporter";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { downloadPdfBytes, generateDocumentPdf } from "@/lib/pdf-generator";
import { formatRupiah } from "@/lib/formatters";
import { getLocalizedCatalogProduct } from "@/lib/glossary";
import type { ServiceProductRow } from "@/types/database.types";

export interface ProductServiceTabContentProps {
  products: ServiceProductRow[];
  onReload: () => Promise<void>;
  onRequestDelete: (target: {
    type: "product";
    id: string;
    code: string;
    name: string;
  }) => void;
}

export function ProductServiceTabContent({
  products,
  onReload,
  onRequestDelete,
}: ProductServiceTabContentProps) {
  const { t, language } = useLanguage();
  const [prdOpen, setPrdOpen] = React.useState(false);
  const [prdForm, setPrdForm] = React.useState({
    id: undefined as string | undefined,
    code: "",
    name: "",
    category: "Software Development",
    description: "",
    unit: "Proyek",
    price: 0,
    is_active: true,
  });

  async function submitProduct(e: React.FormEvent) {
    e.preventDefault();
    try {
      await saveServiceProduct(prdForm);
      toast.success(t("parties:products.toast_saved", "Data produk/layanan berhasil disimpan."));
      setPrdOpen(false);
      await onReload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("parties:products.toast_save_error", "Gagal menyimpan produk/layanan."),
      );
    }
  }

  async function handleExportProductsExcel() {
    if (products.length === 0) {
      toast.error(t("parties:products.export_toast_no_data", "Tidak ada data produk/layanan untuk diekspor."));
      return;
    }
    await downloadExcelSheet({
      sheetName: t("parties:products.export_excel_sheet", "Katalog Produk & Layanan"),
      fileName: t("parties:products.export_excel_filename", "Master_Produk_Layanan_Altcycles.xlsx"),
      columns: [
        { header: t("parties:products.col_code", "Kode"), width: 14 },
        { header: t("parties:products.col_name", "Nama Layanan / Produk"), width: 32 },
        { header: t("parties:products.col_category", "Kategori"), width: 22 },
        { header: t("parties:products.col_unit", "Satuan"), width: 16 },
        { header: t("parties:products.modal_price", "Tarif / Harga Dasar (IDR)"), width: 24 },
        { header: t("parties:products.col_desc", "Deskripsi"), width: 44 },
        { header: t("parties:products.col_status", "Status"), width: 14 },
      ],
      rows: products.map((p) => {
        const loc = getLocalizedCatalogProduct(p, language);
        return [
          p.code,
          loc.name,
          loc.category,
          loc.unit,
          p.price,
          loc.description ?? "-",
          p.is_active ? t("common:status.active", "Aktif") : t("common:status.inactive", "Nonaktif"),
        ];
      }),
    });
    await recordExportLog("SYSTEM_CONFIG", "EXCEL");
    toast.success(t("parties:products.export_toast_excel", "Katalog produk/layanan berhasil diekspor ke Excel (.xlsx)."));
  }

  async function handleExportProductsPdf() {
    if (products.length === 0) {
      toast.error(t("parties:products.export_toast_no_data", "Tidak ada data produk/layanan untuk diekspor."));
      return;
    }
    const comp = await getCompanyProfile();
    const activeCount = products.filter((p) => p.is_active).length;
    const inactiveCount = products.filter((p) => !p.is_active).length;
    const bytes = await generateDocumentPdf({
      docTitle: t("parties:products.export_pdf_title", "KATALOG RESMI PRODUK & LAYANAN ALTVIRA"),
      docSubtitle: t("parties:products.export_pdf_subtitle", "Daftar Paket Solusi Teknologi & Layanan Profesional"),
      docNumber: `KATALOG-SRV-${new Date().toISOString().slice(0, 10)}`,
      docDate: new Date().toISOString().slice(0, 10),
      company: comp,
      language,
      metaRows: [
        {
          label: t("parties:products.export_pdf_total_label", "Total Layanan"),
          value: `${products.length} ${t("parties:products.export_pdf_total_unit", "layanan/produk")}`,
        },
        {
          label: t("parties:products.export_pdf_status_label", "Status Layanan"),
          value: `${activeCount} ${t("common:status.active", "Aktif")}, ${inactiveCount} ${t("common:status.inactive", "Nonaktif")}`,
        },
      ],
      tableColumns: [
        { header: t("parties:products.col_code", "Kode"), widthRatio: 0.10, align: "center" },
        { header: t("parties:products.col_name", "Nama Layanan"), widthRatio: 0.38 },
        { header: t("parties:products.col_category", "Kategori"), widthRatio: 0.20 },
        { header: t("parties:products.col_unit", "Satuan"), widthRatio: 0.12, align: "center" },
        { header: t("parties:products.col_base_rate", "Tarif Dasar (IDR)"), widthRatio: 0.20, align: "right" },
      ],
      tableRows: products.map((p) => {
        const loc = getLocalizedCatalogProduct(p, language);
        return [
          p.code,
          loc.name,
          loc.category,
          loc.unit,
          formatRupiah(p.price),
        ];
      }),
    });
    downloadPdfBytes(
      bytes,
      language === "en"
        ? "Master_Products_Services_Altcycles.pdf"
        : "Master_Produk_Layanan_Altcycles.pdf",
    );
    await recordExportLog("SYSTEM_CONFIG", "PDF");
  }

  async function handleExportProductsCsv() {
    if (products.length === 0) {
      toast.error(t("parties:products.export_toast_no_data", "Tidak ada data produk/layanan untuk diekspor."));
      return;
    }
    downloadCsvFile(
      language === "en"
        ? "Master_Products_Services_Altcycles.csv"
        : "Master_Produk_Layanan_Altcycles.csv",
      [
        t("parties:products.col_code", "Kode"),
        t("parties:products.col_name", "Nama Layanan / Produk"),
        t("parties:products.col_category", "Kategori"),
        t("parties:products.col_unit", "Satuan"),
        t("parties:products.col_base_rate", "Tarif Dasar"),
        t("parties:products.col_desc", "Deskripsi"),
        t("parties:products.col_status", "Status"),
      ],
      products.map((p) => {
        const loc = getLocalizedCatalogProduct(p, language);
        return [
          p.code,
          loc.name,
          loc.category,
          loc.unit,
          String(p.price),
          loc.description ?? "-",
          p.is_active ? t("common:status.active", "Aktif") : t("common:status.inactive", "Nonaktif"),
        ];
      }),
    );
    await recordExportLog("SYSTEM_CONFIG", "CSV");
    toast.success(t("parties:products.export_toast_csv", "Katalog produk/layanan berhasil diekspor ke CSV (.csv)."));
  }

  return (
    <>
      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeaderWithInfo
          title={t("parties:products.title", "Katalog Produk & Layanan Altvira")}
          description={t("parties:products.desc", "Daftar penawaran solusi teknologi, produk digital, dan paket layanan profesional Altvira.")}
          controls={
            <div className="flex items-center gap-2 shrink-0">
              <ExportDownloadMenu
                label={t("common:action.export_download", "Unduh / Ekspor")}
                onExportExcel={handleExportProductsExcel}
                onExportPdf={handleExportProductsPdf}
                onExportCsv={handleExportProductsCsv}
              />
              <Button
                type="button"
                size="sm"
                className="shrink-0 cursor-pointer"
                onClick={() => {
                  setPrdForm({
                    id: undefined,
                    code: `SRV-00${products.length + 1}`,
                    name: "",
                    category: "Software Development",
                    description: "",
                    unit: "Proyek",
                    price: 0,
                    is_active: true,
                  });
                  setPrdOpen(true);
                }}
              >
                <PlusIcon data-icon="inline-start" />
                {t("parties:products.add_btn", "Tambah Layanan / Produk")}
              </Button>
            </div>
          }
        />
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead className="pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 text-center font-semibold whitespace-nowrap">{t("parties:products.col_code", "Kode")}</TableHead>
                <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("parties:products.col_name", "Nama Layanan / Produk")}</TableHead>
                <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("parties:products.col_category", "Kategori")}</TableHead>
                <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("parties:products.col_desc", "Deskripsi")}</TableHead>
                <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("parties:products.col_unit", "Satuan")}</TableHead>
                <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap min-w-[140px] max-sm:min-w-[110px]">{t("parties:products.col_base_rate", "Tarif Dasar")}</TableHead>
                <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("parties:products.col_status", "Status")}</TableHead>
                <TableHead className="pl-2 pr-6 max-sm:pl-1 max-sm:pr-3 text-center font-semibold whitespace-nowrap">{t("parties:products.col_actions", "Aksi")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="p-0">
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                      <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                        <BriefcaseIcon className="size-6" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {t("parties:products.empty_title", "Belum Ada Data Produk / Layanan")}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                        {t("parties:products.empty_desc", "Katalog produk dan layanan Altvira masih kosong. Tambahkan paket atau penawaran baru untuk referensi transaksi & SPK proyek.")}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => {
                  const loc = getLocalizedCatalogProduct(p, language);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 text-center font-mono font-medium">
                        {p.code}
                      </TableCell>
                      <TableCell className="px-3 max-sm:px-2 font-medium text-foreground">
                        {loc.name}
                      </TableCell>
                      <TableCell className="px-3 max-sm:px-2 text-center text-xs">
                        <span className="inline-flex items-center rounded-lg bg-muted/80 border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {loc.category}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 max-sm:px-2 text-xs text-muted-foreground max-w-xs">
                        <span className="line-clamp-2" title={loc.description ?? "-"}>
                          {loc.description ?? "-"}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 max-sm:px-2 text-center text-xs font-medium">
                        {loc.unit}
                      </TableCell>
                      <TableCell className="px-3 max-sm:px-2">
                        <MonetaryCell amount={p.price} currency="Rp" />
                      </TableCell>
                      <TableCell className="px-3 max-sm:px-2 text-center">
                        <div className="-my-px inline-flex justify-center">
                          <StatusBadge
                            tone={p.is_active ? "success" : "secondary"}
                            label={p.is_active ? t("common:status.active", "Aktif") : t("common:status.inactive", "Nonaktif")}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="pl-2 pr-6 max-sm:pl-1 max-sm:pr-3 text-center">
                        <div className="flex items-center justify-center gap-1 -my-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setPrdForm({
                                id: p.id,
                                code: p.code,
                                name: loc.name,
                                category: loc.category,
                                description: loc.description ?? "",
                                unit: loc.unit,
                                price: p.price,
                                is_active: p.is_active,
                              });
                              setPrdOpen(true);
                            }}
                            className="size-8 cursor-pointer text-muted-foreground hover:text-foreground"
                            title={t("common:action.edit", "Edit")}
                            aria-label={t("common:action.edit", "Edit")}
                          >
                            <PencilIcon className="size-4" />
                            <span className="sr-only">{t("common:action.edit", "Edit")}</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              onRequestDelete({
                                type: "product",
                                id: p.id,
                                code: p.code,
                                name: loc.name,
                              })
                            }
                            className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                            title={t("common:action.delete", "Hapus")}
                            aria-label={t("common:action.delete", "Hapus")}
                          >
                            <Trash2Icon className="size-4" />
                            <span className="sr-only">{t("common:action.delete", "Hapus")}</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Produk / Layanan */}
      <Dialog open={prdOpen} onOpenChange={setPrdOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {prdForm.id
                ? t("parties:products.modal_edit_title", "Ubah Produk / Layanan")
                : t("parties:products.modal_create_title", "Tambah Layanan / Produk")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitProduct}>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="p-code" required>
                    {t("parties:products.modal_code", "Kode Layanan")}
                  </FieldLabel>
                  <Input
                    id="p-code"
                    required
                    value={prdForm.code}
                    onChange={(e) =>
                      setPrdForm({ ...prdForm, code: e.target.value })
                    }
                    placeholder="SRV-001"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="p-cat" required>
                    {t("parties:products.modal_category", "Kategori")}
                  </FieldLabel>
                  <Input
                    id="p-cat"
                    required
                    value={prdForm.category}
                    onChange={(e) =>
                      setPrdForm({ ...prdForm, category: e.target.value })
                    }
                    placeholder="Software Development"
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="p-name" required>
                  {t("parties:products.modal_name", "Nama Layanan / Produk")}
                </FieldLabel>
                <Input
                  id="p-name"
                  required
                  value={prdForm.name}
                  onChange={(e) =>
                    setPrdForm({ ...prdForm, name: e.target.value })
                  }
                  placeholder={t("parties:products.name_placeholder", "e.g. Pengembangan Portal Web Perusahaan")}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="p-unit" required>
                    {t("parties:products.modal_unit", "Satuan")}
                  </FieldLabel>
                  <Input
                    id="p-unit"
                    required
                    value={prdForm.unit}
                    onChange={(e) =>
                      setPrdForm({ ...prdForm, unit: e.target.value })
                    }
                    placeholder={t("parties:products.unit_placeholder", "Proyek / Paket / Bulan")}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="p-price" required>
                    {t("parties:products.modal_price", "Tarif / Harga Dasar (IDR)")}
                  </FieldLabel>
                  <NumberInput
                    id="p-price"
                    value={prdForm.price}
                    onValueChange={(val: number) =>
                      setPrdForm({ ...prdForm, price: val })
                    }
                    min={0}
                    step={500000}
                    placeholder="0"
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="p-desc">
                  {t("parties:products.modal_description", "Deskripsi Ringkas")}
                </FieldLabel>
                <Textarea
                  id="p-desc"
                  rows={3}
                  value={prdForm.description}
                  onChange={(e) =>
                    setPrdForm({ ...prdForm, description: e.target.value })
                  }
                  placeholder={t("parties:products.desc_placeholder", "Keterangan cakupan penawaran solusi atau layanan...")}
                />
              </Field>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="p-act">
                  {t("parties:products.modal_status_active", "Status Layanan Aktif")}
                </FieldLabel>
                <Switch
                  id="p-act"
                  checked={prdForm.is_active}
                  onCheckedChange={(c) =>
                    setPrdForm({ ...prdForm, is_active: c })
                  }
                />
              </Field>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPrdOpen(false)}
                >
                  {t("common:action.cancel", "Batal")}
                </Button>
                <Button type="submit">
                  {t("parties:products.modal_btn_save", "Simpan Layanan / Produk")}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
