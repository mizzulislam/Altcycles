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
  CardDescription,
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
import { useLanguage, getActiveLanguage } from "@/lib/i18n";
import { saveServiceProduct } from "@/lib/services/products-services-service";
import { recordExportLog } from "@/lib/operations-service";
import { downloadCsvFile } from "@/lib/csv-exporter";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { downloadPdfBytes, generateDocumentPdf } from "@/lib/pdf-generator";
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
  const { t } = useLanguage();
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
      toast.success("Data produk/layanan berhasil disimpan.");
      setPrdOpen(false);
      await onReload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan produk/layanan.",
      );
    }
  }

  async function handleExportProductsExcel() {
    const isEn = getActiveLanguage() === "en";
    if (products.length === 0) {
      toast.error(isEn ? "No product/service data to export." : "Tidak ada data produk/layanan untuk diekspor.");
      return;
    }
    await downloadExcelSheet({
      sheetName: isEn ? "Products & Services" : "Katalog Produk & Layanan",
      fileName: isEn ? "Master_Products_Services_Altcycles.xlsx" : "Master_Produk_Layanan_Altcycles.xlsx",
      columns: isEn
        ? [
            { header: "Code", width: 14 },
            { header: "Product / Service Name", width: 32 },
            { header: "Category", width: 22 },
            { header: "Unit", width: 16 },
            { header: "Base Rate / Price (IDR)", width: 24 },
            { header: "Description", width: 44 },
            { header: "Status", width: 14 },
          ]
        : [
            { header: "Kode", width: 14 },
            { header: "Nama Produk / Layanan", width: 32 },
            { header: "Kategori", width: 22 },
            { header: "Satuan", width: 16 },
            { header: "Tarif / Harga Dasar (IDR)", width: 24 },
            { header: "Deskripsi", width: 44 },
            { header: "Status", width: 14 },
          ],
      rows: products.map((p) => [
        p.code,
        p.name,
        p.category,
        p.unit,
        p.price,
        p.description ?? "-",
        p.is_active ? (isEn ? "Active" : "Aktif") : (isEn ? "Inactive" : "Nonaktif"),
      ]),
    });
    await recordExportLog("SYSTEM_CONFIG", "EXCEL");
    toast.success(isEn ? "Products/services catalog successfully exported to Excel (.xlsx)." : "Katalog produk/layanan berhasil diekspor ke Excel (.xlsx).");
  }

  async function handleExportProductsPdf() {
    const isEn = getActiveLanguage() === "en";
    if (products.length === 0) {
      toast.error(isEn ? "No product/service data to export." : "Tidak ada data produk/layanan untuk diekspor.");
      return;
    }
    const comp = await getCompanyProfile();
    const bytes = await generateDocumentPdf({
      docTitle: isEn ? "ALTVIRA OFFICIAL PRODUCTS & SERVICES CATALOG" : "KATALOG PRODUK & LAYANAN RESMI ALTVIRA",
      docSubtitle: isEn
        ? "Summary of Digital Solutions, Software Products, & Professional Service Offerings"
        : "Rekapitulasi Penawaran Solusi Digital, Software, & Layanan Profesional",
      docNumber: `KATALOG-SRV-${new Date().toISOString().slice(0, 10)}`,
      docDate: new Date().toISOString().slice(0, 10),
      company: comp,
      metaRows: [
        { label: isEn ? "Total Services / Products" : "Total Layanan / Produk", value: isEn ? `${products.length} items` : `${products.length} item` },
        {
          label: isEn ? "Service Status" : "Status Layanan",
          value: isEn
            ? `${products.filter((p) => p.is_active).length} Active, ${products.filter((p) => !p.is_active).length} Inactive`
            : `${products.filter((p) => p.is_active).length} Aktif, ${products.filter((p) => !p.is_active).length} Nonaktif`,
        },
      ],
      tableColumns: isEn
        ? [
            { header: "Code", widthRatio: 1.5 },
            { header: "Service / Product Name", widthRatio: 3.5 },
            { header: "Category", widthRatio: 2 },
            { header: "Unit", widthRatio: 1.5 },
            { header: "Base Rate", widthRatio: 2.5 },
            { header: "Status", widthRatio: 1.5 },
          ]
        : [
            { header: "Kode", widthRatio: 1.5 },
            { header: "Nama Layanan / Produk", widthRatio: 3.5 },
            { header: "Kategori", widthRatio: 2 },
            { header: "Satuan", widthRatio: 1.5 },
            { header: "Tarif Dasar", widthRatio: 2.5 },
            { header: "Status", widthRatio: 1.5 },
          ],
      tableRows: products.map((p) => [
        p.code,
        p.name,
        p.category,
        p.unit,
        new Intl.NumberFormat(isEn ? "en-US" : "id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(p.price),
        p.is_active ? (isEn ? "Active" : "Aktif") : (isEn ? "Inactive" : "Nonaktif"),
      ]),
    });
    downloadPdfBytes(bytes, isEn ? "Master_Products_Services_Altcycles.pdf" : "Master_Produk_Layanan_Altcycles.pdf");
    await recordExportLog("SYSTEM_CONFIG", "PDF");
  }

  async function handleExportProductsCsv() {
    const isEn = getActiveLanguage() === "en";
    if (products.length === 0) {
      toast.error(isEn ? "No product/service data to export." : "Tidak ada data produk/layanan untuk diekspor.");
      return;
    }
    downloadCsvFile(
      isEn ? "Master_Products_Services_Altcycles.csv" : "Master_Produk_Layanan_Altcycles.csv",
      isEn
        ? [
            "Code",
            "Service / Product Name",
            "Category",
            "Unit",
            "Base Rate",
            "Description",
            "Status",
          ]
        : [
            "Kode",
            "Nama Layanan / Produk",
            "Kategori",
            "Satuan",
            "Tarif Dasar",
            "Deskripsi",
            "Status",
          ],
      products.map((p) => [
        p.code,
        p.name,
        p.category,
        p.unit,
        String(p.price),
        p.description ?? "-",
        p.is_active ? (isEn ? "Active" : "Aktif") : (isEn ? "Inactive" : "Nonaktif"),
      ]),
    );
    await recordExportLog("SYSTEM_CONFIG", "CSV");
    toast.success(isEn ? "Products/services catalog successfully exported to CSV (.csv)." : "Katalog produk/layanan berhasil diekspor ke CSV (.csv).");
  }

  return (
    <>
      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 min-w-0">
            <CardTitle>{t("parties.services_title", "Katalog Produk & Layanan Altvira")}</CardTitle>
            <CardDescription>
              {t("parties.services_desc", "Daftar penawaran solusi teknologi, produk digital, dan paket layanan profesional Altvira.")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ExportDownloadMenu
              label={t("action.export_download", "Unduh / Ekspor")}
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
              {t("parties.add_service", "Tambah Layanan / Produk")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">{t("table.code", "Kode")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("parties.col_service_name", "Nama Layanan / Produk")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("parties.col_category", "Kategori")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("parties.col_desc", "Deskripsi")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("parties.col_unit", "Satuan")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap min-w-[140px]">{t("parties.col_base_rate", "Tarif Dasar")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("table.status", "Status")}</TableHead>
                <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">{t("table.actions", "Aksi")}</TableHead>
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
                        {t("parties.no_service", "Belum Ada Data Produk / Layanan")}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                        {t("parties.no_service_desc", "Katalog produk dan layanan Altvira masih kosong. Tambahkan paket atau penawaran baru untuk referensi transaksi & SPK proyek.")}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-6 pr-3 text-center font-mono font-medium">
                      {p.code}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {p.name}
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      <span className="inline-flex items-center rounded-lg bg-muted/80 border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {p.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs">
                      <span className="line-clamp-2" title={p.description ?? "-"}>
                        {p.description ?? "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-xs font-medium">
                      {p.unit}
                    </TableCell>
                    <TableCell className="px-3">
                      <MonetaryCell amount={p.price} currency="Rp" />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="-my-px inline-flex justify-center">
                        <StatusBadge
                          tone={p.is_active ? "success" : "secondary"}
                          label={p.is_active ? "Aktif" : "Nonaktif"}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="pl-2 pr-6 text-center">
                      <div className="flex items-center justify-center gap-1 -my-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setPrdForm({
                              id: p.id,
                              code: p.code,
                              name: p.name,
                              category: p.category,
                              description: p.description ?? "",
                              unit: p.unit,
                              price: p.price,
                              is_active: p.is_active,
                            });
                            setPrdOpen(true);
                          }}
                          className="size-8 cursor-pointer text-muted-foreground hover:text-foreground"
                          title="Ubah data layanan/produk"
                          aria-label="Ubah data layanan/produk"
                        >
                          <PencilIcon className="size-4" />
                          <span className="sr-only">Ubah</span>
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
                              name: p.name,
                            })
                          }
                          className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                          title="Hapus data layanan/produk"
                          aria-label="Hapus data layanan/produk"
                        >
                          <Trash2Icon className="size-4" />
                          <span className="sr-only">Hapus</span>
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

      {/* Dialog Produk / Layanan */}
      <Dialog open={prdOpen} onOpenChange={setPrdOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {prdForm.id
                ? t("products.modal_edit_title", "Ubah Produk / Layanan")
                : t("products.modal_add_title", "Tambah Layanan / Produk")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitProduct}>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="p-code" required>
                    {t("products.code", "Kode Layanan")}
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
                    {t("products.category", "Kategori")}
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
                  {t("products.name", "Nama Layanan / Produk")}
                </FieldLabel>
                <Input
                  id="p-name"
                  required
                  value={prdForm.name}
                  onChange={(e) =>
                    setPrdForm({ ...prdForm, name: e.target.value })
                  }
                  placeholder={t("products.name_placeholder", "e.g. Pengembangan Portal Web Perusahaan")}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="p-unit" required>
                    {t("products.unit", "Satuan")}
                  </FieldLabel>
                  <Input
                    id="p-unit"
                    required
                    value={prdForm.unit}
                    onChange={(e) =>
                      setPrdForm({ ...prdForm, unit: e.target.value })
                    }
                    placeholder={t("products.unit_placeholder", "Proyek / Paket / Bulan")}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="p-price" required>
                    {t("products.price", "Tarif / Harga Dasar (IDR)")}
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
                  {t("products.description", "Deskripsi Ringkas")}
                </FieldLabel>
                <Textarea
                  id="p-desc"
                  rows={3}
                  value={prdForm.description}
                  onChange={(e) =>
                    setPrdForm({ ...prdForm, description: e.target.value })
                  }
                  placeholder={t("products.desc_placeholder", "Keterangan cakupan penawaran solusi atau layanan...")}
                />
              </Field>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="p-act">
                  {t("products.status_active", "Status Layanan Aktif")}
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
                  {t("action.cancel", "Batal")}
                </Button>
                <Button type="submit">
                  {t("products.btn_save", "Simpan Layanan / Produk")}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
