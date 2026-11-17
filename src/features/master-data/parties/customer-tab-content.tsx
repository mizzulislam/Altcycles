import * as React from "react";
import { PencilIcon, PlusIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { ImageAssetUploadBox } from "@/components/shared/image-asset-upload-box";
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
import { getCompanyProfile, saveCustomer } from "@/lib/data-service";
import { useLanguage } from "@/lib/i18n";
import { recordExportLog } from "@/lib/operations-service";
import { downloadCsvFile } from "@/lib/csv-exporter";
import { downloadExcelSheet } from "@/lib/excel-exporter";
import { downloadPdfBytes, generateDocumentPdf } from "@/lib/pdf-generator";
import type { CustomerRow } from "@/types/database.types";

export interface CustomerTabContentProps {
  customers: CustomerRow[];
  onReload: () => Promise<void>;
  onRequestDelete: (target: {
    type: "customer";
    id: string;
    code: string;
    name: string;
  }) => void;
}

export function CustomerTabContent({
  customers,
  onReload,
  onRequestDelete,
}: CustomerTabContentProps) {
  const { t } = useLanguage();
  const [cstOpen, setCstOpen] = React.useState(false);
  const [cstForm, setCstForm] = React.useState({
    id: undefined as string | undefined,
    code: "",
    name: "",
    company_name: "",
    contact_person: "",
    contact_title: "",
    email: "",
    phone: "",
    address: "",
    logo_storage_path: null as string | null,
    signature_storage_path: null as string | null,
    paraf_storage_path: null as string | null,
    is_active: true,
  });

  async function submitCustomer(e: React.FormEvent) {
    e.preventDefault();
    try {
      await saveCustomer(cstForm);
      toast.success("Data pelanggan berhasil disimpan.");
      setCstOpen(false);
      await onReload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan pelanggan.",
      );
    }
  }

  async function handleExportCustomersExcel() {
    if (customers.length === 0) {
      toast.error("Tidak ada data pelanggan untuk diekspor.");
      return;
    }
    await downloadExcelSheet({
      sheetName: "Daftar Pelanggan",
      fileName: "Master_Pelanggan_Altcycles.xlsx",
      columns: [
        { header: "Kode", width: 14 },
        { header: "Nama Lengkap", width: 28 },
        { header: "Perusahaan / Instansi", width: 28 },
        { header: "PIC", width: 22 },
        { header: "Jabatan", width: 20 },
        { header: "Email", width: 24 },
        { header: "Telepon", width: 18 },
        { header: "Alamat", width: 36 },
        { header: "Status", width: 14 },
      ],
      rows: customers.map((c) => [
        c.code,
        c.name,
        c.company_name ?? "-",
        c.contact_person ?? "-",
        c.contact_title ?? "-",
        c.email ?? "-",
        c.phone ?? "-",
        c.address ?? "-",
        c.is_active ? "Aktif" : "Nonaktif",
      ]),
    });
    await recordExportLog("SYSTEM_CONFIG", "EXCEL");
    toast.success("Daftar pelanggan berhasil diekspor ke Excel (.xlsx).");
  }

  async function handleExportCustomersPdf() {
    if (customers.length === 0) {
      toast.error("Tidak ada data pelanggan untuk diekspor.");
      return;
    }
    const comp = await getCompanyProfile();
    const bytes = await generateDocumentPdf({
      docTitle: "DAFTAR MASTER PELANGGAN RESMI",
      docSubtitle: "Rekapitulasi Basis Data Klien, Pelanggan, & Mitra Strategis Perusahaan",
      docNumber: `REKAP-CST-${new Date().toISOString().slice(0, 10)}`,
      docDate: new Date().toISOString().slice(0, 10),
      company: comp,
      metaRows: [
        { label: "Total Pelanggan", value: `${customers.length} klien` },
        {
          label: "Status Klien",
          value: `${customers.filter((c) => c.is_active).length} Aktif, ${customers.filter((c) => !c.is_active).length} Nonaktif`,
        },
      ],
      tableColumns: [
        { header: "Kode", widthRatio: 1.5 },
        { header: "Nama Pelanggan", widthRatio: 3 },
        { header: "Perusahaan / PIC", widthRatio: 3.5 },
        { header: "Kontak", widthRatio: 3 },
        { header: "Status", widthRatio: 1.5 },
      ],
      tableRows: customers.map((c) => [
        c.code,
        c.name,
        c.company_name
          ? `${c.company_name} (PIC: ${c.contact_person || "-"})`
          : c.contact_person || "-",
        `${c.email || "-"} / ${c.phone || "-"}`,
        c.is_active ? "Aktif" : "Nonaktif",
      ]),
    });
    downloadPdfBytes(bytes, "Master_Pelanggan_Altcycles.pdf");
    await recordExportLog("SYSTEM_CONFIG", "PDF");
  }

  async function handleExportCustomersCsv() {
    if (customers.length === 0) {
      toast.error("Tidak ada data pelanggan untuk diekspor.");
      return;
    }
    downloadCsvFile(
      "Master_Pelanggan_Altcycles.csv",
      [
        "Kode",
        "Nama Pelanggan",
        "Perusahaan",
        "PIC",
        "Jabatan",
        "Email",
        "Telepon",
        "Alamat",
        "Status",
      ],
      customers.map((c) => [
        c.code,
        c.name,
        c.company_name ?? "-",
        c.contact_person ?? "-",
        c.contact_title ?? "-",
        c.email ?? "-",
        c.phone ?? "-",
        c.address ?? "-",
        c.is_active ? "Aktif" : "Nonaktif",
      ]),
    );
    await recordExportLog("SYSTEM_CONFIG", "CSV");
    toast.success("Daftar pelanggan berhasil diekspor ke CSV (.csv).");
  }

  return (
    <>
      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 min-w-0">
            <CardTitle>{t("parties.customer_title", "Daftar Pelanggan / Klien Resmi")}</CardTitle>
            <CardDescription>
              {t("parties.customer_desc", "Basis data pelanggan untuk penerbitan penawaran harga, SPK, invoice penagihan, dan kuitansi.")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ExportDownloadMenu
              label={t("action.export_download", "Unduh / Ekspor")}
              onExportExcel={handleExportCustomersExcel}
              onExportPdf={handleExportCustomersPdf}
              onExportCsv={handleExportCustomersCsv}
            />
            <Button
              type="button"
              size="sm"
              className="shrink-0 cursor-pointer"
              onClick={() => {
                setCstForm({
                  id: undefined,
                  code: `CST-00${customers.length + 1}`,
                  name: "",
                  company_name: "",
                  contact_person: "",
                  contact_title: "",
                  email: "",
                  phone: "",
                  address: "",
                  logo_storage_path: null,
                  signature_storage_path: null,
                  paraf_storage_path: null,
                  is_active: true,
                });
                setCstOpen(true);
              }}
            >
              <PlusIcon data-icon="inline-start" />
              {t("parties.add_customer", "Tambah Pelanggan")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">{t("table.code", "Kode")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("parties.col_customer_name", "Nama Pelanggan")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("parties.col_company_pic", "Perusahaan & PIC")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("parties.col_contact", "Kontak")}</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("table.status", "Status")}</TableHead>
                <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">{t("table.actions", "Aksi")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                      <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                        <UsersIcon className="size-6" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {t("parties.no_customer", "Belum Ada Data Pelanggan")}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                        {t("parties.no_customer_desc", "Daftar pelanggan / klien masih kosong. Tambahkan pelanggan untuk penerbitan proyek dan invoice resmi.")}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="pl-6 pr-3 text-center font-mono font-medium">
                      {c.code}
                    </TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-xs">
                      <div>{c.contact_person ?? "-"}</div>
                      <div className="text-muted-foreground">
                        {c.contact_title ?? ""}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{c.email ?? "-"}</div>
                      <div className="text-muted-foreground">
                        {c.phone ?? ""}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="-my-px inline-flex justify-center">
                        <StatusBadge
                          tone={c.is_active ? "success" : "secondary"}
                          label={c.is_active ? "Aktif" : "Nonaktif"}
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
                            setCstForm({
                              id: c.id,
                              code: c.code,
                              name: c.name,
                              company_name: c.company_name ?? "",
                              contact_person: c.contact_person ?? "",
                              contact_title: c.contact_title ?? "",
                              email: c.email ?? "",
                              phone: c.phone ?? "",
                              address: c.address ?? "",
                              logo_storage_path: c.logo_storage_path ?? null,
                              signature_storage_path: c.signature_storage_path ?? null,
                              paraf_storage_path: c.paraf_storage_path ?? null,
                              is_active: c.is_active,
                            });
                            setCstOpen(true);
                          }}
                          className="size-8 cursor-pointer text-muted-foreground hover:text-foreground"
                          title="Ubah data pelanggan"
                          aria-label="Ubah data pelanggan"
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
                              type: "customer",
                              id: c.id,
                              code: c.code,
                              name: c.name,
                            })
                          }
                          className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                          title="Hapus data pelanggan"
                          aria-label="Hapus data pelanggan"
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

      {/* Dialog Pelanggan */}
      <Dialog open={cstOpen} onOpenChange={setCstOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {cstForm.id ? "Ubah Data Pelanggan" : "Tambah Pelanggan Baru"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitCustomer}>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="c-code" required>Kode Pelanggan</FieldLabel>
                  <Input
                    id="c-code"
                    required
                    value={cstForm.code}
                    onChange={(e) =>
                      setCstForm({ ...cstForm, code: e.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="c-name" required>Nama Klien / Instansi</FieldLabel>
                  <Input
                    id="c-name"
                    required
                    value={cstForm.name}
                    onChange={(e) =>
                      setCstForm({ ...cstForm, name: e.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="c-comp">Nama Perusahaan</FieldLabel>
                  <Input
                    id="c-comp"
                    value={cstForm.company_name}
                    onChange={(e) =>
                      setCstForm({ ...cstForm, company_name: e.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="c-pic">PIC / Pejabat</FieldLabel>
                  <Input
                    id="c-pic"
                    value={cstForm.contact_person}
                    onChange={(e) =>
                      setCstForm({ ...cstForm, contact_person: e.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="c-title">Jabatan PIC</FieldLabel>
                  <Input
                    id="c-title"
                    value={cstForm.contact_title}
                    onChange={(e) =>
                      setCstForm({ ...cstForm, contact_title: e.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="c-email">Email</FieldLabel>
                  <Input
                    id="c-email"
                    type="email"
                    value={cstForm.email}
                    onChange={(e) =>
                      setCstForm({ ...cstForm, email: e.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="c-phone">Telepon</FieldLabel>
                  <Input
                    id="c-phone"
                    value={cstForm.phone}
                    onChange={(e) =>
                      setCstForm({ ...cstForm, phone: e.target.value })
                    }
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="c-addr">Alamat Lengkap</FieldLabel>
                <Textarea
                  id="c-addr"
                  value={cstForm.address}
                  onChange={(e) =>
                    setCstForm({ ...cstForm, address: e.target.value })
                  }
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <ImageAssetUploadBox
                  label="Logo Klien"
                  emptyTitle="Upload Logo"
                  emptySubtitle="PNG / JPG"
                  value={cstForm.logo_storage_path}
                  onChange={(next) =>
                    setCstForm({ ...cstForm, logo_storage_path: next })
                  }
                />
                <ImageAssetUploadBox
                  label="TTD Klien"
                  emptyTitle="Upload TTD"
                  emptySubtitle="PNG transparan"
                  value={cstForm.signature_storage_path}
                  onChange={(next) =>
                    setCstForm({ ...cstForm, signature_storage_path: next })
                  }
                />
                <ImageAssetUploadBox
                  label="Paraf Klien"
                  emptyTitle="Upload Paraf"
                  emptySubtitle="PNG transparan"
                  value={cstForm.paraf_storage_path}
                  onChange={(next) =>
                    setCstForm({ ...cstForm, paraf_storage_path: next })
                  }
                />
              </div>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="c-act">Status Pelanggan Aktif</FieldLabel>
                <Switch
                  id="c-act"
                  checked={cstForm.is_active}
                  onCheckedChange={(c) =>
                    setCstForm({ ...cstForm, is_active: c })
                  }
                />
              </Field>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCstOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit">Simpan Pelanggan</Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
