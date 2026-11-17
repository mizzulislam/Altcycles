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
      toast.success("Data vendor berhasil disimpan.");
      setVndOpen(false);
      await onReload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan vendor.");
    }
  }

  async function handleExportVendorsExcel() {
    if (vendors.length === 0) {
      toast.error("Tidak ada data vendor untuk diekspor.");
      return;
    }
    await downloadExcelSheet({
      sheetName: "Daftar Vendor",
      fileName: "Master_Vendor_Altcycles.xlsx",
      columns: [
        { header: "Kode", width: 14 },
        { header: "Nama Vendor", width: 28 },
        { header: "PIC", width: 22 },
        { header: "Email", width: 24 },
        { header: "Telepon", width: 18 },
        { header: "Bank", width: 20 },
        { header: "No Rekening", width: 20 },
        { header: "Alamat", width: 36 },
        { header: "Status", width: 14 },
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
        v.is_active ? "Aktif" : "Nonaktif",
      ]),
    });
    await recordExportLog("SYSTEM_CONFIG", "EXCEL");
    toast.success("Daftar vendor berhasil diekspor ke Excel (.xlsx).");
  }

  async function handleExportVendorsPdf() {
    if (vendors.length === 0) {
      toast.error("Tidak ada data vendor untuk diekspor.");
      return;
    }
    const comp = await getCompanyProfile();
    const bytes = await generateDocumentPdf({
      docTitle: "DAFTAR MASTER VENDOR PEMASOK",
      docSubtitle: "Rekapitulasi Data Rekanan & Mitra Vendor Terdaftar",
      docNumber: `REKAP-VND-${new Date().toISOString().slice(0, 10)}`,
      docDate: new Date().toISOString().slice(0, 10),
      company: comp,
      metaRows: [
        { label: "Total Vendor", value: `${vendors.length} vendor` },
        {
          label: "Status Vendor",
          value: `${vendors.filter((v) => v.is_active).length} Aktif, ${vendors.filter((v) => !v.is_active).length} Nonaktif`,
        },
      ],
      tableColumns: [
        { header: "Kode", widthRatio: 1.5 },
        { header: "Nama Vendor", widthRatio: 3 },
        { header: "PIC / Kontak", widthRatio: 3 },
        { header: "Bank & Rekening", widthRatio: 3 },
        { header: "Status", widthRatio: 1.5 },
      ],
      tableRows: vendors.map((v) => [
        v.code,
        v.name,
        v.contact_name
          ? `${v.contact_name} (${v.phone || v.email || "-"})`
          : "-",
        v.bank_name ? `${v.bank_name} - ${v.bank_account_number}` : "-",
        v.is_active ? "Aktif" : "Nonaktif",
      ]),
    });
    downloadPdfBytes(bytes, "Master_Vendor_Altcycles.pdf");
    await recordExportLog("SYSTEM_CONFIG", "PDF");
  }

  async function handleExportVendorsCsv() {
    if (vendors.length === 0) {
      toast.error("Tidak ada data vendor untuk diekspor.");
      return;
    }
    downloadCsvFile(
      "Master_Vendor_Altcycles.csv",
      [
        "Kode",
        "Nama Vendor",
        "PIC",
        "Email",
        "Telepon",
        "Bank",
        "No Rekening",
        "Alamat",
        "Status",
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
        v.is_active ? "Aktif" : "Nonaktif",
      ]),
    );
    await recordExportLog("SYSTEM_CONFIG", "CSV");
    toast.success("Daftar vendor berhasil diekspor ke CSV (.csv).");
  }

  return (
    <>
      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 min-w-0">
            <CardTitle>Daftar Vendor Pemasok</CardTitle>
            <CardDescription>
              Vendor bukan pengguna sistem dan tidak memiliki akun login.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ExportDownloadMenu
              label="Unduh / Ekspor"
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
              Tambah Vendor
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">Kode</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Nama Vendor</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">PIC &amp; Kontak</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Rekening Bank</TableHead>
                <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Status</TableHead>
                <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">Aksi</TableHead>
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
                        Belum Ada Data Vendor
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                        Daftar vendor pemasok masih kosong. Tambahkan vendor baru untuk kebutuhan PO Pembelian internal.
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
                          label={v.is_active ? "Aktif" : "Nonaktif"}
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
                          title="Ubah data vendor"
                          aria-label="Ubah data vendor"
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
                              type: "vendor",
                              id: v.id,
                              code: v.code,
                              name: v.name,
                            })
                          }
                          className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                          title="Hapus data vendor"
                          aria-label="Hapus data vendor"
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

      {/* Dialog Vendor */}
      <Dialog open={vndOpen} onOpenChange={setVndOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {vndForm.id ? "Ubah Data Vendor" : "Tambah Vendor Baru"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitVendor}>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="v-code" required>Kode Vendor</FieldLabel>
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
                  <FieldLabel htmlFor="v-name" required>Nama Vendor</FieldLabel>
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
                <FieldLabel htmlFor="v-contact">Nama Kontak / PIC</FieldLabel>
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
                  <FieldLabel htmlFor="v-email">Email</FieldLabel>
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
                  <FieldLabel htmlFor="v-phone">Telepon</FieldLabel>
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
                  <FieldLabel htmlFor="v-bank">Nama Bank</FieldLabel>
                  <Input
                    id="v-bank"
                    value={vndForm.bank_name}
                    onChange={(e) =>
                      setVndForm({ ...vndForm, bank_name: e.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="v-acc">Nomor Rekening</FieldLabel>
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
                <FieldLabel htmlFor="v-addr">Alamat Lengkap</FieldLabel>
                <Textarea
                  id="v-addr"
                  value={vndForm.address}
                  onChange={(e) =>
                    setVndForm({ ...vndForm, address: e.target.value })
                  }
                />
              </Field>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="v-act">Status Vendor Aktif</FieldLabel>
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
                  Batal
                </Button>
                <Button type="submit">Simpan Vendor</Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
