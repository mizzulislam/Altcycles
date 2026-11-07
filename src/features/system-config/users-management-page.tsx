import * as React from "react";
import { PlusIcon, UserCheckIcon, UserXIcon } from "lucide-react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, Spinner } from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/features/auth/auth-context";
import {
  createInternalUser,
  listProfiles,
  toggleInternalUserActive,
  updateInternalUserRole,
} from "@/lib/data-service";
import { formatDateTimeID, ROLE_LABELS } from "@/lib/formatters";
import type { ProfileRow, UserRole } from "@/types/database.types";

export function UsersManagementPage() {
  const { profile: currentUser } = useAuth();
  const [users, setUsers] = React.useState<ProfileRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("all");

  // Modal Tambah Pengguna
  const [createOpen, setCreateOpen] = React.useState(false);
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [newRole, setNewRole] = React.useState<UserRole>("user");
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

  // Dialog Konfirmasi Aktif / Nonaktif
  const [toggleTarget, setToggleTarget] = React.useState<ProfileRow | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await listProfiles();
      setUsers(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat pengguna.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    if (password.length < 8) {
      setCreateError("Kata sandi awal minimal 8 karakter.");
      return;
    }
    setCreating(true);
    try {
      await createInternalUser({
        fullName,
        email,
        password,
        role: newRole,
      });
      toast.success(`Akun ${fullName} berhasil dibuat.`);
      setCreateOpen(false);
      setFullName("");
      setEmail("");
      setPassword("");
      setNewRole("user");
      await reload();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Gagal membuat pengguna.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleChangeRole(target: ProfileRow, role: UserRole) {
    try {
      await updateInternalUserRole(target.id, role);
      toast.success(`Peran ${target.full_name} diubah menjadi ${ROLE_LABELS[role]}.`);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah peran.");
    }
  }

  const filtered = users.filter((u) => {
    const matchText =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchText && matchRole;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Manajemen Akun &amp; Peran Internal
          </h1>
          <p className="text-sm text-muted-foreground">
            Buat akun tim Altvira, tetapkan peran pemisahan tugas, atau
            nonaktifkan akses pengguna.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          Tambah Akun Internal
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengguna Internal</CardTitle>
          <CardDescription>
            Super Admin tidak menyetujui pembayaran; Admin mengelola keuangan;
            User mengajukan PO &amp; pembayaran.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Cari nama atau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="sm:w-56">
                <SelectValue placeholder="Filter peran" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Semua Peran</SelectItem>
                  <SelectItem value="user">User (Tim Proyek)</SelectItem>
                  <SelectItem value="admin">Admin (Bendahara)</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Spinner />
              <span>Memuat daftar akun...</span>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Tidak ada pengguna ditemukan"
              description="Ubah kata kunci pencarian atau filter peran di atas."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Peran</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Terakhir Login</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.full_name}
                        {isSelf ? (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            (Anda)
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell className="w-56">
                        <Select
                          value={u.role}
                          disabled={isSelf}
                          onValueChange={(val) =>
                            void handleChangeRole(u, val as UserRole)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="super_admin">
                                Super Admin
                              </SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          tone={u.is_active ? "success" : "destructive"}
                          label={u.is_active ? "Aktif" : "Nonaktif"}
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTimeID(u.last_login_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant={u.is_active ? "outline" : "secondary"}
                          size="sm"
                          disabled={isSelf}
                          onClick={() => setToggleTarget(u)}
                        >
                          {u.is_active ? (
                            <>
                              <UserXIcon data-icon="inline-start" />
                              Nonaktifkan
                            </>
                          ) : (
                            <>
                              <UserCheckIcon data-icon="inline-start" />
                              Aktifkan
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog Tambah Pengguna */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Akun Internal Baru</DialogTitle>
            <DialogDescription>
              Akun internal langsung aktif sesuai peran yang ditetapkan. Klien
              (Pembeli) tidak dibuatkan akun karena mengakses via Nomor PO.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="u-name">Nama Lengkap</FieldLabel>
                <Input
                  id="u-name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Rina Maharani"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="u-email">Email Kerja</FieldLabel>
                <Input
                  id="u-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rina@altvira.id"
                />
              </Field>
              <Field data-invalid={Boolean(createError)}>
                <FieldLabel htmlFor="u-pass">Kata Sandi Awal</FieldLabel>
                <Input
                  id="u-pass"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  aria-invalid={Boolean(createError)}
                />
                {createError ? (
                  <FieldDescription>{createError}</FieldDescription>
                ) : null}
              </Field>
              <Field>
                <FieldLabel>Peran Pengguna</FieldLabel>
                <Select
                  value={newRole}
                  onValueChange={(v) => setNewRole(v as UserRole)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="user">
                        User — Tim Proyek (PO &amp; Pengajuan Pembayaran)
                      </SelectItem>
                      <SelectItem value="admin">
                        Admin — Bendahara / Akuntan
                      </SelectItem>
                      <SelectItem value="super_admin">
                        Super Admin — Pengelola Sistem
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? <Spinner data-icon="inline-start" /> : null}
                  Buat Akun
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi Aktif / Nonaktif */}
      <ConfirmActionDialog
        open={Boolean(toggleTarget)}
        onOpenChange={(open) => {
          if (!open) setToggleTarget(null);
        }}
        title={
          toggleTarget?.is_active
            ? `Nonaktifkan akun ${toggleTarget.full_name}?`
            : `Aktifkan kembali akun ${toggleTarget?.full_name ?? ""}?`
        }
        description={
          toggleTarget?.is_active
            ? "Pengguna yang dinonaktifkan otomatis ditolak oleh kebijakan RLS server dan tidak dapat masuk ke sistem, namun riwayat dokumen lamanya tetap terjaga."
            : "Pengguna akan dapat masuk kembali sesuai peran yang terdaftar."
        }
        destructive={Boolean(toggleTarget?.is_active)}
        confirmLabel={
          toggleTarget?.is_active ? "Ya, Nonaktifkan" : "Ya, Aktifkan"
        }
        onConfirm={async () => {
          if (!toggleTarget) return;
          await toggleInternalUserActive(
            toggleTarget.id,
            !toggleTarget.is_active,
          );
          toast.success("Status akun berhasil diperbarui.");
          await reload();
        }}
      />
    </div>
  );
}

