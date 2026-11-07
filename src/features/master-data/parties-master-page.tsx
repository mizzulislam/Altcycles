import * as React from "react";
import { PencilIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
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
  listCustomers,
  listVendors,
  saveCustomer,
  saveVendor,
} from "@/lib/data-service";
import type { CustomerRow, VendorRow } from "@/types/database.types";

export function PartiesMasterPage() {
  const [vendors, setVendors] = React.useState<VendorRow[]>([]);
  const [customers, setCustomers] = React.useState<CustomerRow[]>([]);
  const [loading, setLoading] = React.useState(true);

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
    is_active: true,
  });

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [v, c] = await Promise.all([listVendors(), listCustomers()]);
      setVendors(v);
      setCustomers(c);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Master Data Vendor &amp; Pelanggan
        </h1>
        <p className="text-sm text-muted-foreground">
          Vendor digunakan pada PO Pembelian internal; Pelanggan menjadi pihak
          kontrak pada Quotation dan Invoice proyek klien.
        </p>
      </div>

      <Tabs defaultValue="vendor">
        <TabsList>
          <TabsTrigger value="vendor">Vendor ({vendors.length})</TabsTrigger>
          <TabsTrigger value="pelanggan">
            Pelanggan / Klien ({customers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendor">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Daftar Vendor Pemasok</CardTitle>
                <CardDescription>
                  Vendor bukan pengguna sistem dan tidak memiliki akun login.
                </CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
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
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama Vendor</TableHead>
                    <TableHead>PIC &amp; Kontak</TableHead>
                    <TableHead>Rekening Bank</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono font-medium">
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
                      <TableCell>
                        <StatusBadge
                          tone={v.is_active ? "success" : "secondary"}
                          label={v.is_active ? "Aktif" : "Nonaktif"}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
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
                        >
                          <PencilIcon data-icon="inline-start" />
                          Ubah
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pelanggan">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Daftar Pelanggan (Klien Altvira)</CardTitle>
                <CardDescription>
                  Pelanggan mengakses progres &amp; dokumen di Portal Pembeli
                  tanpa login memakai Nomor PO.
                </CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
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
                    is_active: true,
                  });
                  setCstOpen(true);
                }}
              >
                <PlusIcon data-icon="inline-start" />
                Tambah Pelanggan
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama Pelanggan</TableHead>
                    <TableHead>Penanggung Jawab</TableHead>
                    <TableHead>Email &amp; Telepon</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-medium">
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
                      <TableCell>
                        <StatusBadge
                          tone={c.is_active ? "success" : "secondary"}
                          label={c.is_active ? "Aktif" : "Nonaktif"}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
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
                              is_active: c.is_active,
                            });
                            setCstOpen(true);
                          }}
                        >
                          <PencilIcon data-icon="inline-start" />
                          Ubah
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Vendor */}
      <Dialog open={vndOpen} onOpenChange={setVndOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {vndForm.id ? "Ubah Data Vendor" : "Tambah Vendor Baru"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitVendor}>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="v-code">Kode Vendor</FieldLabel>
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
                  <FieldLabel htmlFor="v-name">Nama Vendor</FieldLabel>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {cstForm.id ? "Ubah Data Pelanggan" : "Tambah Pelanggan Baru"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitCustomer}>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="c-code">Kode Pelanggan</FieldLabel>
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
                  <FieldLabel htmlFor="c-name">Nama / Perusahaan</FieldLabel>
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
    </div>
  );
}

