import * as React from "react";
import { Building2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
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
import { getCompanyProfile, saveVendor } from "@/lib/data-service";
import { useLanguage } from "@/lib/i18n";
import { recordExportLog } from "@/lib/operations-service";
import { downloadCsvFile } from "@/lib/csv-exporter";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { downloadPdfBytes, generateDocumentPdf } from "@/lib/pdf-generator";
import type { VendorRow } from "@/types/database.types";

export interface VendorTabContentProps {
  vendors: VendorRow[];
  onReload: () => Promise<void>;
  onRequestDelete: (target: {
    type: "vendor";
    id: string;
    code: string;
    name: string;
  }) => void;
}

export function VendorTabContent({
  vendors,
  onReload,
  onRequestDelete,
}: VendorTabContentProps) {
  const { t } = useLanguage();
  const [vndOpen, setVndOpen] = React.useState(false);
  const [vndForm, setVndForm] = React.useState({
    id: undefined as string | undefined,
    code: "",
    name: "",
    contact_name: "",
    email: "",
    phone: "",
    bank_name: "",
    bank_account_number: "",
    address: "",
    is_active: true,
  });

  async function submitVendor(e: React.FormEvent) {
    e.preventDefault();
    try {
      await saveVendor(vndForm);
      toast.success(t("parties:vendors.toast_saved", "Data vendor berhasil disimpan."));
      setVndOpen(false);
      await onReload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan vendor.");
    }
  }

  async function handleExportVendorsExcel() {
    if (vendors.length === 0) {
      toast.error(t("parties:vendors.export_toast_no_data", "Tidak ada data vendor untuk diekspor."));
      return;
    }
    await downloadExcelSheet({
      sheetName: t("parties:vendors.export_excel_sheet", "Daftar Vendor"),
      fileName: t("parties:vendors.export_excel_filename", "Master_Vendor_Altcycles.xlsx"),
      columns: [
        { header: t("parties:vendors.col_code", "Kode"), width: 14 },
        { header: t("parties:vendors.col_name", "Nama Vendor"), width: 28 },
        { header: t("parties:vendors.col_pic", "PIC"), width: 22 },
        { header: t("parties:vendors.col_email", "Email"), width: 24 },
        { header: t("parties:vendors.col_phone", "Telepon"), width: 18 },
        { header: t("parties:vendors.col_bank", "Bank"), width: 20 },
        { header: t("parties:vendors.modal_account_number", "No Rekening"), width: 20 },
        { header: t("parties:vendors.col_address", "Alamat"), width: 36 },
        { header: t("parties:vendors.col_status", "Status"), width: 14 },
      ],
      rows: vendors.map((v) => [
        v.code,
        v.name,
        v.contact_name ?? "-",
        v.email ?? "-",
        v.phone ?? "-",
        v.bank_name ?? "-",
        v.bank_account_number ?? "-",
        v.address ?? "-",
        v.is_active ? t("common:status.active", "Aktif") : t("common:status.inactive", "Nonaktif"),
      ]),
    });
    await recordExportLog("SYSTEM_CONFIG", "EXCEL");
    toast.success(t("parties:vendors.export_toast_excel", "Daftar vendor berhasil diekspor ke Excel (.xlsx)."));
  }

  async function handleExportVendorsPdf() {
    if (vendors.length === 0) {
      toast.error(t("parties:vendors.export_toast_no_data", "Tidak ada data vendor untuk diekspor."));
      return;
    }
    const comp = await getCompanyProfile();
    const activeCount = vendors.filter((v) => v.is_active).length;
    const inactiveCount = vendors.filter((v) => !v.is_active).length;
    const bytes = await generateDocumentPdf({
      docTitle: t("parties:vendors.export_pdf_title", "DAFTAR MASTER VENDOR PEMASOK"),
      docSubtitle: t("parties:vendors.export_pdf_subtitle", "Direktori Rekanan Vendor Pemasok Resmi Perusahaan"),
      docNumber: `REKAP-VND-${new Date().toISOString().slice(0, 10)}`,
      docDate: new Date().toISOString().slice(0, 10),
      company: comp,
      metaRows: [
        {
          label: t("parties:vendors.export_pdf_total_label", "Total Vendor"),
          value: `${vendors.length} ${t("parties:vendors.export_pdf_total_unit", "vendor")}`,
        },
        {
          label: t("parties:vendors.export_pdf_status_label", "Status Vendor"),
          value: `${activeCount} ${t("common:status.active", "Aktif")}, ${inactiveCount} ${t("common:status.inactive", "Nonaktif")}`,
        },
      ],
      tableColumns: [
        { header: t("parties:vendors.col_code", "Kode"), widthRatio: 0.12, align: "center" },
        { header: t("parties:vendors.col_name", "Nama Vendor"), widthRatio: 0.28 },
        { header: t("parties:vendors.col_pic", "Kontak PIC"), widthRatio: 0.26 },
        { header: t("parties:vendors.col_bank", "Bank & Rekening"), widthRatio: 0.22 },
        { header: t("parties:vendors.col_status", "Status"), widthRatio: 0.12, align: "center" },
      ],
      tableRows: vendors.map((v) => [
        v.code,
        v.name,
        v.contact_name
          ? `${v.contact_name} (${v.phone || v.email || "-"})`
          : "-",
        v.bank_name ? `${v.bank_name} - ${v.bank_account_number}` : "-",
        v.is_active ? t("common:status.active", "Aktif") : t("common:status.inactive", "Nonaktif"),
      ]),
    });
    downloadPdfBytes(bytes, t("parties:vendors.export_pdf_title", "Master_Vendor_Altcycles.pdf"));
    await recordExportLog("SYSTEM_CONFIG", "PDF");
  }

  async function handleExportVendorsCsv() {
    if (vendors.length === 0) {
      toast.error(t("parties:vendors.export_toast_no_data", "Tidak ada data vendor untuk diekspor."));
      return;
    }
    downloadCsvFile(
      "Master_Vendor_Altcycles.csv",
      [
        t("parties:vendors.col_code", "Kode"),
        t("parties:vendors.col_name", "Nama Vendor"),
        t("parties:vendors.col_pic", "PIC"),
        t("parties:vendors.col_email", "Email"),
        t("parties:vendors.col_phone", "Telepon"),
        t("parties:vendors.col_bank", "Bank"),
        t("parties:vendors.modal_account_number", "No Rekening"),
        t("parties:vendors.col_address", "Alamat"),
        t("parties:vendors.col_status", "Status"),
      ],
      vendors.map((v) => [
        v.code,
        v.name,
        v.contact_name ?? "-",
        v.email ?? "-",
        v.phone ?? "-",
        v.bank_name ?? "-",
        v.bank_account_number ?? "-",
        v.address ?? "-",
        v.is_active ? t("common:status.active", "Aktif") : t("common:status.inactive", "Nonaktif"),
      ]),
    );
    await recordExportLog("SYSTEM_CONFIG", "CSV");
    toast.success(t("parties:vendors.export_toast_csv", "Daftar vendor berhasil diekspor ke CSV (.csv)."));
  }

  return (
    <>
      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 min-w-0">
            <CardTitle>{t("parties:vendors.title", "Daftar Vendor Pemasok")}</CardTitle>
            <CardDescription>
              {t("parties:vendors.desc", "Vendor bukan pengguna sistem dan tidak memiliki akun login.")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ExportDownloadMenu
              label={t("common:action.export_download", "Unduh / Ekspor")}
              onExportExcel={handleExportVendorsExcel}
              onExportPdf={handleExportVendorsPdf}
              onExportCsv={handleExportVendorsCsv}
            />
            <Button
              type="button"
              size="sm"
              className="shrink-0 cursor-pointer"
              onClick={() => {
                setVndForm({
                  id: undefined,
                  code: `VND-00${vendors.length + 1}`,
                  name: "",
                  contact_name: "",
                  email: "",
                  phone: "",
                  bank_name: "",
                  bank_account_number: "",
                  address: "",
                  is_active: true,
                });
                setVndOpen(true);
              }}
            >
              <PlusIcon data-icon="inline-start" />
              {t("parties:vendors.add_btn", "Tambah Vendor")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">{t("parties:vendors.col_code", "Kode")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("parties:vendors.col_name", "Nama Vendor")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("parties:vendors.col_pic", "PIC & Kontak")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("parties:vendors.col_bank", "Rekening Bank")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("parties:vendors.col_status", "Status")}</TableHead>
                <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">{t("parties:vendors.col_actions", "Aksi")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                      <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                        <Building2Icon className="size-6" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {t("parties:vendors.empty_title", "Belum Ada Data Vendor")}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                        {t("parties:vendors.empty_desc", "Daftar vendor pemasok masih kosong. Tambahkan vendor baru untuk kebutuhan PO Pembelian internal.")}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                vendors.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="pl-6 pr-3 text-center font-mono font-medium">
                      {v.code}
                    </TableCell>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell className="text-xs">
                      <div>{v.contact_name ?? "-"}</div>
                      <div className="text-muted-foreground">
                        {v.email ?? v.phone ?? ""}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {v.bank_name ?? "-"} {v.bank_account_number ?? ""}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="-my-px inline-flex justify-center">
                        <StatusBadge
                          tone={v.is_active ? "success" : "secondary"}
                          label={v.is_active ? t("common:status.active", "Aktif") : t("common:status.inactive", "Nonaktif")}
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
                            setVndForm({
                              id: v.id,
                              code: v.code,
                              name: v.name,
                              contact_name: v.contact_name ?? "",
                              email: v.email ?? "",
                              phone: v.phone ?? "",
                              bank_name: v.bank_name ?? "",
                              bank_account_number: v.bank_account_number ?? "",
                              address: v.address ?? "",
                              is_active: v.is_active,
                            });
                            setVndOpen(true);
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
                              type: "vendor",
                              id: v.id,
                              code: v.code,
                              name: v.name,
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Vendor */}
      <Dialog open={vndOpen} onOpenChange={setVndOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {vndForm.id
                ? t("parties:vendors.modal_edit_title", "Ubah Data Vendor")
                : t("parties:vendors.modal_create_title", "Tambah Vendor Baru")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitVendor}>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="v-code" required>
                    {t("parties:vendors.modal_code", "Kode Vendor")}
                  </FieldLabel>
                  <Input
                    id="v-code"
                    required
                    value={vndForm.code}
                    onChange={(e) =>
                      setVndForm({ ...vndForm, code: e.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="v-name" required>
                    {t("parties:vendors.modal_name", "Nama Vendor")}
                  </FieldLabel>
                  <Input
                    id="v-name"
                    required
                    value={vndForm.name}
                    onChange={(e) =>
                      setVndForm({ ...vndForm, name: e.target.value })
                    }
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="v-contact">
                  {t("parties:vendors.modal_pic", "Nama Kontak / PIC")}
                </FieldLabel>
                <Input
                  id="v-contact"
                  value={vndForm.contact_name}
                  onChange={(e) =>
                    setVndForm({ ...vndForm, contact_name: e.target.value })
                  }
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="v-email">
                    {t("parties:vendors.modal_email", "Email")}
                  </FieldLabel>
                  <Input
                    id="v-email"
                    type="email"
                    value={vndForm.email}
                    onChange={(e) =>
                      setVndForm({ ...vndForm, email: e.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="v-phone">
                    {t("parties:vendors.modal_phone", "Telepon")}
                  </FieldLabel>
                  <Input
                    id="v-phone"
                    value={vndForm.phone}
                    onChange={(e) =>
                      setVndForm({ ...vndForm, phone: e.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="v-bank">
                    {t("parties:vendors.modal_bank_name", "Nama Bank")}
                  </FieldLabel>
                  <Input
                    id="v-bank"
                    value={vndForm.bank_name}
                    onChange={(e) =>
                      setVndForm({ ...vndForm, bank_name: e.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="v-acc">
                    {t("parties:vendors.modal_account_number", "Nomor Rekening")}
                  </FieldLabel>
                  <Input
                    id="v-acc"
                    value={vndForm.bank_account_number}
                    onChange={(e) =>
                      setVndForm({
                        ...vndForm,
                        bank_account_number: e.target.value,
                      })
                    }
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="v-addr">
                  {t("parties:vendors.modal_address", "Alamat Lengkap")}
                </FieldLabel>
                <Textarea
                  id="v-addr"
                  value={vndForm.address}
                  onChange={(e) =>
                    setVndForm({ ...vndForm, address: e.target.value })
                  }
                />
              </Field>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="v-act">
                  {t("parties:vendors.modal_status_active", "Status Vendor Aktif")}
                </FieldLabel>
                <Switch
                  id="v-act"
                  checked={vndForm.is_active}
                  onCheckedChange={(c) =>
                    setVndForm({ ...vndForm, is_active: c })
                  }
                />
              </Field>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVndOpen(false)}
                >
                  {t("common:action.cancel", "Batal")}
                </Button>
                <Button type="submit">
                  {t("parties:vendors.modal_btn_save", "Simpan Vendor")}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
