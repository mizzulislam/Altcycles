import * as React from "react";
import { EyeIcon, EyeOffIcon, PencilIcon, PlusIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { ExportDownloadMenu } from "@/components/shared/export-download-menu";
import { ImageAssetUploadBox } from "@/components/shared/image-asset-upload-box";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
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
import {
  formatNpwpDisplay,
  isValidNpwp,
  maskNpwp,
  normalizeNpwp,
} from "@/lib/formatters";
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
  const [revealedNpwpIds, setRevealedNpwpIds] = React.useState<Record<string, boolean>>({});
  const [cstForm, setCstForm] = React.useState({
    id: undefined as string | undefined,
    code: "",
    name: "",
    company_name: "",
    contact_person: "",
    contact_title: "",
    email: "",
    phone: "",
    npwp: "",
    address: "",
    shipping_address: "",
    shipping_same_as_office: false,
    logo_storage_path: null as string | null,
    signature_storage_path: null as string | null,
    paraf_storage_path: null as string | null,
    is_active: true,
  });

  async function submitCustomer(e: React.FormEvent) {
    e.preventDefault();
    const trimmedNpwp = cstForm.npwp.trim();
    if (trimmedNpwp && !isValidNpwp(trimmedNpwp)) {
      toast.error(
        t(
          "parties:customers.toast_npwp_invalid",
          "Format NPWP tidak valid. Masukkan 15 atau 16 digit angka.",
        ),
      );
      return;
    }
    try {
      await saveCustomer({
        ...cstForm,
        npwp: trimmedNpwp ? normalizeNpwp(trimmedNpwp) : null,
        shipping_address: cstForm.shipping_same_as_office
          ? cstForm.address
          : cstForm.shipping_address,
        shipping_same_as_office: cstForm.shipping_same_as_office,
      });
      toast.success(t("parties:customers.toast_saved", "Data pelanggan berhasil disimpan."));
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
      toast.error(t("parties:customers.export_toast_no_data", "Tidak ada data pelanggan untuk diekspor."));
      return;
    }
    await downloadExcelSheet({
      sheetName: t("parties:customers.export_excel_sheet", "Daftar Pelanggan"),
      fileName: t("parties:customers.export_excel_filename", "Master_Pelanggan_Altcycles.xlsx"),
      columns: [
        { header: t("parties:customers.col_code", "Kode"), width: 14 },
        { header: t("parties:customers.col_name", "Nama Lengkap"), width: 28 },
        { header: t("parties:customers.modal_name", "Perusahaan / Instansi"), width: 28 },
        { header: t("parties:customers.modal_pic", "PIC"), width: 22 },
        { header: t("parties:customers.modal_pic_title", "Jabatan"), width: 20 },
        { header: t("parties:customers.modal_email", "Email"), width: 24 },
        { header: t("parties:customers.modal_phone", "Telepon"), width: 18 },
        { header: t("parties:customers.modal_npwp", "NPWP"), width: 22 },
        { header: t("parties:customers.modal_address", "Alamat Kantor"), width: 36 },
        { header: t("parties:customers.modal_shipping_address", "Alamat Pengiriman"), width: 36 },
        { header: t("parties:customers.col_status", "Status"), width: 14 },
      ],
      rows: customers.map((c) => [
        c.code,
        c.name,
        c.company_name ?? "-",
        c.contact_person ?? "-",
        c.contact_title ?? "-",
        c.email ?? "-",
        c.phone ?? "-",
        formatNpwpDisplay(c.npwp),
        c.address ?? "-",
        (c.shipping_same_as_office ? c.address : c.shipping_address) ?? "-",
        c.is_active ? t("common:status.active", "Aktif") : t("common:status.inactive", "Nonaktif"),
      ]),
    });
    await recordExportLog("SYSTEM_CONFIG", "EXCEL");
    toast.success(t("parties:customers.export_toast_excel", "Daftar pelanggan berhasil diekspor ke Excel (.xlsx)."));
  }

  async function handleExportCustomersPdf() {
    if (customers.length === 0) {
      toast.error(t("parties:customers.export_toast_no_data", "Tidak ada data pelanggan untuk diekspor."));
      return;
    }
    const comp = await getCompanyProfile();
    const activeCount = customers.filter((c) => c.is_active).length;
    const inactiveCount = customers.filter((c) => !c.is_active).length;
    const bytes = await generateDocumentPdf({
      docTitle: t("parties:customers.export_pdf_title", "DAFTAR PELANGGAN/KLIEN"),
      docSubtitle: t("parties:customers.export_pdf_subtitle", "Basis Data Klien & Pelanggan Resmi Perusahaan"),
      docNumber: `REKAP-CST-${new Date().toISOString().slice(0, 10)}`,
      docDate: new Date().toISOString().slice(0, 10),
      company: comp,
      metaRows: [
        {
          label: t("parties:customers.export_pdf_total_label", "Total Pelanggan"),
          value: `${customers.length} ${t("parties:customers.export_pdf_total_unit", "klien")}`,
        },
        {
          label: t("parties:customers.export_pdf_status_label", "Status Klien"),
          value: `${activeCount} ${t("common:status.active", "Aktif")}, ${inactiveCount} ${t("common:status.inactive", "Nonaktif")}`,
        },
      ],
      tableColumns: [
        { header: t("parties:customers.col_code", "Kode"), widthRatio: 0.10, align: "center" },
        { header: t("parties:customers.col_name", "Nama Pelanggan"), widthRatio: 0.30 },
        { header: t("parties:customers.col_company", "Perusahaan PIC"), widthRatio: 0.36 },
        { header: t("parties:customers.col_contact", "Kontak"), widthRatio: 0.24 },
      ],
      tableRows: customers.map((c) => [
        c.code,
        c.name,
        c.company_name
          ? `${c.company_name} (PIC: ${c.contact_person || "-"})`
          : c.contact_person || "-",
        `${c.email || "-"} / ${c.phone || "-"}`,
      ]),
    });
    downloadPdfBytes(bytes, "Master_Pelanggan_Altcycles.pdf");
    await recordExportLog("SYSTEM_CONFIG", "PDF");
  }

  async function handleExportCustomersCsv() {
    if (customers.length === 0) {
      toast.error(t("parties:customers.export_toast_no_data", "Tidak ada data pelanggan untuk diekspor."));
      return;
    }
    downloadCsvFile(
      "Master_Pelanggan_Altcycles.csv",
      [
        t("parties:customers.col_code", "Kode"),
        t("parties:customers.col_name", "Nama Pelanggan"),
        t("parties:customers.modal_name", "Perusahaan"),
        t("parties:customers.modal_pic", "PIC"),
        t("parties:customers.modal_pic_title", "Jabatan"),
        t("parties:customers.modal_email", "Email"),
        t("parties:customers.modal_phone", "Telepon"),
        t("parties:customers.modal_npwp", "NPWP"),
        t("parties:customers.modal_address", "Alamat Kantor"),
        t("parties:customers.modal_shipping_address", "Alamat Pengiriman"),
        t("parties:customers.col_status", "Status"),
      ],
      customers.map((c) => [
        c.code,
        c.name,
        c.company_name ?? "-",
        c.contact_person ?? "-",
        c.contact_title ?? "-",
        c.email ?? "-",
        c.phone ?? "-",
        formatNpwpDisplay(c.npwp),
        c.address ?? "-",
        (c.shipping_same_as_office ? c.address : c.shipping_address) ?? "-",
        c.is_active ? t("common:status.active", "Aktif") : t("common:status.inactive", "Nonaktif"),
      ]),
    );
    await recordExportLog("SYSTEM_CONFIG", "CSV");
    toast.success(t("parties:customers.export_toast_csv", "Daftar pelanggan berhasil diekspor ke CSV (.csv)."));
  }

  return (
    <>
      <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeaderWithInfo
          title={t("parties:customers.title", "Daftar Pelanggan / Klien Resmi")}
          description={t("parties:customers.desc", "Basis data pelanggan untuk penerbitan penawaran harga, SPK, invoice penagihan, dan kuitansi.")}
          controls={
            <div className="flex items-center gap-2 shrink-0">
              <ExportDownloadMenu
                label={t("common:action.export_download", "Unduh / Ekspor")}
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
                    npwp: "",
                    address: "",
                    shipping_address: "",
                    shipping_same_as_office: false,
                    logo_storage_path: null,
                    signature_storage_path: null,
                    paraf_storage_path: null,
                    is_active: true,
                  });
                  setCstOpen(true);
                }}
              >
                <PlusIcon data-icon="inline-start" />
                {t("parties:customers.add_btn", "Tambah Pelanggan")}
              </Button>
            </div>
          }
        />
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead className="pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 text-center font-semibold whitespace-nowrap">{t("parties:customers.col_code", "Kode")}</TableHead>
                <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("parties:customers.col_name", "Nama Pelanggan")}</TableHead>
                <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("parties:customers.col_company", "Perusahaan & PIC")}</TableHead>
                <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("parties:customers.col_contact", "Kontak")}</TableHead>
                <TableHead className="px-3 max-sm:px-2 text-center font-semibold whitespace-nowrap">{t("parties:customers.col_status", "Status")}</TableHead>
                <TableHead className="pl-2 pr-6 max-sm:pl-1 max-sm:pr-3 text-center font-semibold whitespace-nowrap">{t("parties:customers.col_actions", "Aksi")}</TableHead>
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
                        {t("parties:customers.empty_title", "Belum Ada Data Pelanggan")}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                        {t("parties:customers.empty_desc", "Daftar pelanggan / klien masih kosong. Tambahkan pelanggan untuk penerbitan proyek dan invoice resmi.")}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="pl-6 pr-3 max-sm:pl-3 max-sm:pr-2 text-center font-mono font-medium">
                      {c.code}
                    </TableCell>
                    <TableCell className="px-3 max-sm:px-2 font-medium">
                      <div>{c.name}</div>
                      {c.npwp ? (
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-normal text-muted-foreground font-mono">
                          <span>
                            {t("parties:customers.npwp_short", "NPWP")}:{" "}
                            {revealedNpwpIds[c.id]
                              ? formatNpwpDisplay(c.npwp)
                              : maskNpwp(c.npwp)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedNpwpIds((prev) => ({
                                ...prev,
                                [c.id]: !prev[c.id],
                              }))
                            }
                            aria-label={
                              revealedNpwpIds[c.id]
                                ? t("parties:customers.hide_npwp", "Sembunyikan NPWP")
                                : t("parties:customers.show_npwp", "Lihat NPWP")
                            }
                            className="inline-flex items-center justify-center rounded p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            {revealedNpwpIds[c.id] ? (
                              <EyeOffIcon className="size-3" />
                            ) : (
                              <EyeIcon className="size-3" />
                            )}
                          </button>
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="px-3 max-sm:px-2 text-xs">
                      <div>{c.contact_person ?? "-"}</div>
                      <div className="text-muted-foreground">
                        {c.contact_title ?? ""}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 max-sm:px-2 text-xs">
                      <div>{c.email ?? "-"}</div>
                      <div className="text-muted-foreground">
                        {c.phone ?? ""}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 max-sm:px-2 text-center">
                      <div className="-my-px inline-flex justify-center">
                        <StatusBadge
                          tone={c.is_active ? "success" : "secondary"}
                          label={c.is_active ? t("common:status.active", "Aktif") : t("common:status.inactive", "Nonaktif")}
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
                            const sameAsOffice = Boolean(c.shipping_same_as_office);
                            setCstForm({
                              id: c.id,
                              code: c.code,
                              name: c.name,
                              company_name: c.company_name ?? "",
                              contact_person: c.contact_person ?? "",
                              contact_title: c.contact_title ?? "",
                              email: c.email ?? "",
                              phone: c.phone ?? "",
                              npwp: c.npwp ? formatNpwpDisplay(c.npwp) : "",
                              address: c.address ?? "",
                              shipping_address: sameAsOffice
                                ? (c.address ?? "")
                                : (c.shipping_address ?? ""),
                              shipping_same_as_office: sameAsOffice,
                              logo_storage_path: c.logo_storage_path ?? null,
                              signature_storage_path: c.signature_storage_path ?? null,
                              paraf_storage_path: c.paraf_storage_path ?? null,
                              is_active: c.is_active,
                            });
                            setCstOpen(true);
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
                              type: "customer",
                              id: c.id,
                              code: c.code,
                              name: c.name,
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

      {/* Dialog Pelanggan */}
      <Dialog open={cstOpen} onOpenChange={setCstOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {cstForm.id
                ? t("parties:customers.modal_edit_title", "Ubah Data Pelanggan")
                : t("parties:customers.modal_create_title", "Tambah Pelanggan Baru")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitCustomer}>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="c-code" required>
                    {t("parties:customers.modal_code", "Kode Pelanggan")}
                  </FieldLabel>
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
                  <FieldLabel htmlFor="c-name" required>
                    {t("parties:customers.modal_name", "Nama Klien / Instansi")}
                  </FieldLabel>
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
                  <FieldLabel htmlFor="c-comp">
                    {t("parties:customers.modal_name", "Nama Perusahaan")}
                  </FieldLabel>
                  <Input
                    id="c-comp"
                    value={cstForm.company_name}
                    onChange={(e) =>
                      setCstForm({ ...cstForm, company_name: e.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="c-pic">
                    {t("parties:customers.modal_pic", "PIC / Pejabat")}
                  </FieldLabel>
                  <Input
                    id="c-pic"
                    value={cstForm.contact_person}
                    onChange={(e) =>
                      setCstForm({ ...cstForm, contact_person: e.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="c-title">
                    {t("parties:customers.modal_pic_title", "Jabatan PIC")}
                  </FieldLabel>
                  <Input
                    id="c-title"
                    value={cstForm.contact_title}
                    onChange={(e) =>
                      setCstForm({ ...cstForm, contact_title: e.target.value })
                    }
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="c-email">
                    {t("parties:customers.modal_email", "Email")}
                  </FieldLabel>
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
                  <FieldLabel htmlFor="c-phone">
                    {t("parties:customers.modal_phone", "Telepon")}
                  </FieldLabel>
                  <Input
                    id="c-phone"
                    value={cstForm.phone}
                    onChange={(e) =>
                      setCstForm({ ...cstForm, phone: e.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="c-npwp">
                    {t("parties:customers.modal_npwp", "NPWP")}
                  </FieldLabel>
                  <Input
                    id="c-npwp"
                    placeholder={t(
                      "parties:customers.modal_npwp_placeholder",
                      "15 atau 16 digit (mis. 01.234.567.8-901.000)",
                    )}
                    value={cstForm.npwp}
                    onChange={(e) =>
                      setCstForm({ ...cstForm, npwp: e.target.value })
                    }
                  />
                  <FieldDescription className="text-[11px]">
                    {t(
                      "parties:customers.modal_npwp_desc",
                      "Opsional, format 15 atau 16 digit angka.",
                    )}
                  </FieldDescription>
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="c-addr">
                  {t("parties:customers.modal_address", "Alamat Lengkap")}
                </FieldLabel>
                <Textarea
                  id="c-addr"
                  value={cstForm.address}
                  onChange={(e) => {
                    const nextAddress = e.target.value;
                    setCstForm((prev) => ({
                      ...prev,
                      address: nextAddress,
                      shipping_address: prev.shipping_same_as_office
                        ? nextAddress
                        : prev.shipping_address,
                    }));
                  }}
                />
              </Field>
              <Field>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <FieldLabel htmlFor="c-ship-addr">
                    {t(
                      "parties:customers.modal_shipping_address",
                      "Alamat Pengiriman",
                    )}
                  </FieldLabel>
                  <label
                    htmlFor="c-ship-same"
                    className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer select-none"
                  >
                    <Checkbox
                      id="c-ship-same"
                      checked={cstForm.shipping_same_as_office}
                      onCheckedChange={(checked) => {
                        const isChecked = checked === true;
                        setCstForm((prev) => ({
                          ...prev,
                          shipping_same_as_office: isChecked,
                          shipping_address: isChecked
                            ? prev.address
                            : prev.shipping_address,
                        }));
                      }}
                    />
                    <span>
                      {t(
                        "parties:customers.modal_shipping_same_as_office",
                        "Samakan dengan alamat kantor",
                      )}
                    </span>
                  </label>
                </div>
                <Textarea
                  id="c-ship-addr"
                  readOnly={cstForm.shipping_same_as_office}
                  placeholder={t(
                    "parties:customers.modal_shipping_address_placeholder",
                    "Alamat tujuan pengiriman dokumen atau perangkat...",
                  )}
                  className={
                    cstForm.shipping_same_as_office
                      ? "bg-muted/40 text-muted-foreground cursor-not-allowed"
                      : undefined
                  }
                  value={
                    cstForm.shipping_same_as_office
                      ? cstForm.address
                      : cstForm.shipping_address
                  }
                  onChange={(e) => {
                    if (cstForm.shipping_same_as_office) return;
                    setCstForm({
                      ...cstForm,
                      shipping_address: e.target.value,
                    });
                  }}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <ImageAssetUploadBox
                  label={t("parties:customers.modal_logo", "Logo Klien")}
                  emptyTitle="Upload Logo"
                  emptySubtitle="PNG / JPG"
                  value={cstForm.logo_storage_path}
                  onChange={(next) =>
                    setCstForm({ ...cstForm, logo_storage_path: next })
                  }
                />
                <ImageAssetUploadBox
                  label={t("parties:customers.modal_signature", "TTD Klien")}
                  emptyTitle="Upload TTD"
                  emptySubtitle="PNG transparan"
                  value={cstForm.signature_storage_path}
                  onChange={(next) =>
                    setCstForm({ ...cstForm, signature_storage_path: next })
                  }
                />
                <ImageAssetUploadBox
                  label={t("parties:customers.modal_paraf", "Paraf Klien")}
                  emptyTitle="Upload Paraf"
                  emptySubtitle="PNG transparan"
                  value={cstForm.paraf_storage_path}
                  onChange={(next) =>
                    setCstForm({ ...cstForm, paraf_storage_path: next })
                  }
                />
              </div>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="c-act">
                  {t("parties:customers.modal_status_active", "Status Pelanggan Aktif")}
                </FieldLabel>
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
                  {t("common:action.cancel", "Batal")}
                </Button>
                <Button type="submit">
                  {t("parties:customers.modal_btn_save", "Simpan Pelanggan")}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
