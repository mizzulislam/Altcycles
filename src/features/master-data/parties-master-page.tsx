import * as React from "react";
import { Building2Icon, PencilIcon, PlusIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
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
import { Spinner } from "@/components/ui/empty";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteCustomer,
  deleteVendor,
  listCustomers,
  listVendors,
  saveCustomer,
  saveVendor,
} from "@/lib/data-service";
import type { CustomerRow, VendorRow } from "@/types/database.types";

export function PartiesMasterPage() {
  const [activeTab, setActiveTab] = React.useState<"vendor" | "pelanggan">("vendor");
  const [vendors, setVendors] = React.useState<VendorRow[]>([]);
  const [customers, setCustomers] = React.useState<CustomerRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Dialog Konfirmasi Hapus Data
  const [deleteTarget, setDeleteTarget] = React.useState<{
    type: "vendor" | "customer";
    id: string;
    code: string;
    name: string;
  } | null>(null);

  // Vendor Dialog
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

  // Customer Dialog
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

  const reload = React.useCallback(async (showSpinner = false) => {
    if (showSpinner) {
      setLoading(true);
    }
    try {
      const [v, c] = await Promise.all([listVendors(), listCustomers()]);
      setVendors(v);
      setCustomers(c);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  }, []);

  React.useEffect(() => {
    void reload(true);
  }, [reload]);

  async function submitVendor(e: React.FormEvent) {
    e.preventDefault();
    try {
      await saveVendor(vndForm);
      toast.success("Data vendor berhasil disimpan.");
      setVndOpen(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan vendor.");
    }
  }

  async function submitCustomer(e: React.FormEvent) {
    e.preventDefault();
    try {
      await saveCustomer(cstForm);
      toast.success("Data pelanggan berhasil disimpan.");
      setCstOpen(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan pelanggan.",
      );
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "vendor") {
        await deleteVendor(deleteTarget.id);
        toast.success(`Vendor "${deleteTarget.name}" (${deleteTarget.code}) berhasil dihapus.`);
      } else {
        await deleteCustomer(deleteTarget.id);
        toast.success(`Pelanggan "${deleteTarget.name}" (${deleteTarget.code}) berhasil dihapus.`);
      }
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus data.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Spinner />
        <span>Memuat master vendor &amp; pelanggan...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1 min-w-0 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Master Data Vendor &amp; Pelanggan
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            Kelola direktori mitra vendor pengadaan dan basis data pelanggan resmi perusahaan.
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "vendor" | "pelanggan")}
      >
        <TabsList>
          <TabsTrigger value="vendor">
            <Building2Icon
              className={cn(
                "size-4 shrink-0 transition-colors",
                activeTab === "vendor"
                  ? "text-primary-foreground"
                  : "text-muted-foreground",
              )}
            />
            <span className="whitespace-nowrap">Vendor</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums transition-colors",
                activeTab === "vendor"
                  ? "bg-white/20 text-white"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {vendors.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="pelanggan">
            <UsersIcon
              className={cn(
                "size-4 shrink-0 transition-colors",
                activeTab === "pelanggan"
                  ? "text-primary-foreground"
                  : "text-muted-foreground",
              )}
            />
            <span className="whitespace-nowrap">Pelanggan / Klien</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums transition-colors",
                activeTab === "pelanggan"
                  ? "bg-white/20 text-white"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {customers.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendor">
          <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
            <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1 min-w-0">
                <CardTitle>Daftar Vendor Pemasok</CardTitle>
                <CardDescription>
                  Vendor bukan pengguna sistem dan tidak memiliki akun login.
                </CardDescription>
              </div>
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
                              setDeleteTarget({
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
        </TabsContent>

        <TabsContent value="pelanggan">
          <Card className="rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden">
            <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1 min-w-0">
                <CardTitle>Daftar Pelanggan (Klien Altvira)</CardTitle>
                <CardDescription>
                  Pelanggan mengakses progres &amp; dokumen di Portal Pembeli
                  tanpa login memakai Nomor PO.
                </CardDescription>
              </div>
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
                Tambah Pelanggan
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">Kode</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Nama Pelanggan</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Penanggung Jawab</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Email &amp; Telepon</TableHead>
                    <TableHead className="px-3 text-center font-semibold whitespace-nowrap">Status</TableHead>
                    <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">Aksi</TableHead>
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
                            Belum Ada Data Pelanggan
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                            Daftar pelanggan (klien Altvira) masih kosong. Tambahkan pelanggan untuk pihak kontrak Quotation &amp; Invoice proyek.
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
                              setDeleteTarget({
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
        </TabsContent>
      </Tabs>

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
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="v-pic">Nama Kontak</FieldLabel>
                  <Input
                    id="v-pic"
                    value={vndForm.contact_name}
                    onChange={(e) =>
                      setVndForm({ ...vndForm, contact_name: e.target.value })
                    }
                  />
                </Field>
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
                  <FieldLabel htmlFor="v-rek">Nomor Rekening</FieldLabel>
                  <Input
                    id="v-rek"
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
                <FieldLabel htmlFor="v-addr">Alamat</FieldLabel>
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
                  <FieldLabel htmlFor="c-name" required>Nama / Perusahaan</FieldLabel>
                  <Input
                    id="c-name"
                    required
                    value={cstForm.name}
                    onChange={(e) =>
                      setCstForm({
                        ...cstForm,
                        name: e.target.value,
                        company_name: e.target.value,
                      })
                    }
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="c-pic">Penanggung Jawab</FieldLabel>
                  <Input
                    id="c-pic"
                    value={cstForm.contact_person}
                    onChange={(e) =>
                      setCstForm({ ...cstForm, contact_person: e.target.value })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="c-title">Jabatan</FieldLabel>
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

      {/* Dialog Konfirmasi Hapus Data Master */}
      <ConfirmActionDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Hapus Data ${deleteTarget?.type === "vendor" ? "Vendor" : "Pelanggan"}?`}
        description={`Apakah Anda yakin ingin menghapus data master ${deleteTarget?.name ?? ""} (${deleteTarget?.code ?? ""})? Data yang dihapus tidak dapat dipulihkan.`}
        confirmLabel="Ya, Hapus Data"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}

