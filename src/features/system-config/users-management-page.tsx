import * as React from "react";
import {
  ChevronDownIcon,
  PlusIcon,
  Trash2Icon,
  UserCheckIcon,
  UsersIcon,
  UserXIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/empty";
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
  deleteInternalUser,
  listProfiles,
  toggleInternalUserActive,
  updateInternalUserRoles,
} from "@/lib/data-service";
import { formatDateTimeID } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { ProfileRow, UserRole } from "@/types/database.types";

const ALL_ROLES: { id: UserRole; label: string; descKey: string; fallbackDesc: string }[] = [
  { id: "super_admin", label: "Super Admin", descKey: "settings:users.role_desc_super_admin", fallbackDesc: "Pengelola Sistem & Akun" },
  { id: "admin", label: "Admin", descKey: "settings:users.role_desc_admin", fallbackDesc: "Bendahara / Keuangan" },
  { id: "user", label: "User", descKey: "settings:users.role_desc_user", fallbackDesc: "Tim Proyek / Operasional" },
];

function getRolesSummary(user: ProfileRow, t: (key: string, def?: string) => string): string {
  const roles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
  const shortLabels: Record<UserRole, string> = {
    super_admin: "Super Admin",
    admin: t("settings:super_admin.role_treasurer", "Bendahara"),
    user: "User",
  };
  return roles.map((r) => shortLabels[r] || r).join(", ");
}

export function UsersManagementPage() {
  const { profile: currentUser } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = React.useState<ProfileRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("all");

  // State Dropdown Multi-Role per Baris
  const [openDropdownId, setOpenDropdownId] = React.useState<string | null>(null);

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

  // Dialog Konfirmasi Hapus Akun (Tugas 1)
  const [deleteTarget, setDeleteTarget] = React.useState<ProfileRow | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await listProfiles();
      setUsers(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settings:users.loading", "Gagal memuat pengguna."));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  // Tutup dropdown multi-role jika klik di luar
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-role-dropdown]")) {
        setOpenDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    if (password.length < 8) {
      setCreateError(t("settings:users.toast_create_pwd_min", "Kata sandi awal minimal 8 karakter."));
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
      toast.success(t("settings:users.toast_created", { name: fullName }));
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

  // Handle Perubahan Peran Multi-Role dengan Centang (Tugas 2)
  async function handleToggleRole(target: ProfileRow, toggledRole: UserRole) {
    const currentRoles = target.roles && target.roles.length > 0 ? [...target.roles] : [target.role];
    let nextRoles: UserRole[];

    if (currentRoles.includes(toggledRole)) {
      if (currentRoles.length <= 1) {
        toast.error(t("settings:users.toast_min_one_role", "Minimal satu peran harus tetap tercentang."));
        return;
      }
      nextRoles = currentRoles.filter((r) => r !== toggledRole);
    } else {
      nextRoles = [...currentRoles, toggledRole];
    }

    try {
      await updateInternalUserRoles(target.id, nextRoles);
      toast.success(t("settings:users.toast_role_updated", { name: target.full_name, roles: nextRoles.join(", ") }));
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settings:users.toast_role_failed", "Gagal mengubah peran pengguna."));
    }
  }

  // Handle Hapus Pengguna Aman (Tugas 1)
  async function handleDeleteUser() {
    if (!deleteTarget) return;
    try {
      await deleteInternalUser(deleteTarget.id);
      toast.success(t("settings:users.toast_deleted", { name: deleteTarget.full_name }));
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus pengguna.");
    }
  }

  const filtered = users.filter((u) => {
    const matchText =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const userRoles = u.roles && u.roles.length > 0 ? u.roles : [u.role];
    const matchRole = roleFilter === "all" || userRoles.includes(roleFilter as UserRole);
    return matchText && matchRole;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t("settings:users.page_title", "Manajemen Akun & Peran Internal")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            {t("settings:users.page_desc", "Kelola akun pengguna, wewenang peran ganda, dan hak akses modul internal perusahaan.")}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="shrink-0"
        >
          <PlusIcon className="size-4" />
          <span>{t("settings:users.add_account_btn", "Tambah Akun Internal")}</span>
        </Button>
      </div>

      <Card className="overflow-visible">
        <CardHeader className="px-6 py-4 border-b border-border/70 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-base sm:text-lg font-bold">
              {t("settings:users.card_title", "Daftar Pengguna Internal")}
            </CardTitle>
            <CardDescription>
              {t("settings:users.card_desc", "Atur hak akses tunggal atau multi-peran untuk Super Admin, Admin, dan User.")}
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <Input
              placeholder={t("settings:users.search_input_placeholder", "Cari nama atau email...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-56 h-9 rounded-xl text-xs sm:text-sm"
            />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48 h-9 rounded-xl text-xs sm:text-sm">
                <SelectValue placeholder={t("settings:users.filter_role_placeholder", "Filter peran")} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">{t("settings:users.filter_role_all", "Semua Peran")}</SelectItem>
                  <SelectItem value="user">{t("settings:users.filter_role_user", "User (Tim Proyek)")}</SelectItem>
                  <SelectItem value="admin">{t("settings:users.filter_role_admin", "Admin (Bendahara)")}</SelectItem>
                  <SelectItem value="super_admin">{t("settings:users.filter_role_super_admin", "Super Admin")}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Spinner />
              <span>{t("settings:users.loading", "Memuat daftar akun...")}</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="pl-6 pr-3 text-center font-semibold whitespace-nowrap">
                    {t("settings:users.col_full_name", "Nama Lengkap")}
                  </TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">{t("settings:users.col_email", "Email")}</TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap min-w-[200px]">
                    {t("settings:users.col_roles_multi", "Peran (Multi-Role)")}
                  </TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                    {t("settings:users.col_status", "Status")}
                  </TableHead>
                  <TableHead className="px-3 text-center font-semibold whitespace-nowrap">
                    {t("settings:users.col_last_login", "Terakhir Login")}
                  </TableHead>
                  <TableHead className="pl-2 pr-6 text-center font-semibold whitespace-nowrap">
                    {t("settings:users.col_actions", "Aksi")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="p-0">
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-t border-dashed border-border/70 bg-muted/10">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 mb-3 text-muted-foreground">
                          <UsersIcon className="size-6" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                          {t("settings:users.empty_title", "Tidak Ada Pengguna Ditemukan")}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                          {t("settings:users.empty_desc", "Ubah kata kunci pencarian atau filter peran di atas.")}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const currentRoles = u.roles && u.roles.length > 0 ? u.roles : [u.role];
                  const isDropdownOpen = openDropdownId === u.id;

                  return (
                    <TableRow key={u.id}>
                      <TableCell className="pl-6 pr-3 font-medium">
                        <div className="flex flex-col">
                          <span>{u.full_name}</span>
                          {isSelf ? (
                            <span className="text-[11px] font-semibold text-primary dark:text-sky-400">
                              {t("settings:users.your_account", "(Akun Anda)")}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 text-muted-foreground">{u.email}</TableCell>

                      {/* KOLOM PERAN DENGAN DROPDOWN BERCENTANG */}
                      <TableCell className="relative px-3" data-role-dropdown>
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() =>
                            setOpenDropdownId((prev) => (prev === u.id ? null : u.id))
                          }
                          className={cn(
                            "w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer text-left -my-0.5",
                            isSelf
                              ? "bg-muted/40 border-border/60 text-muted-foreground cursor-not-allowed"
                              : "bg-card border-border hover:bg-muted/50 text-foreground",
                          )}
                        >
                          <span className="truncate">{getRolesSummary(u, t)}</span>
                          <ChevronDownIcon
                            className={cn(
                              "size-3.5 text-muted-foreground shrink-0 transition-transform duration-150",
                              isDropdownOpen && "rotate-180",
                            )}
                          />
                        </button>

                        {/* Menu Dropdown Checkbox */}
                        {isDropdownOpen && !isSelf && (
                          <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-card border border-border rounded-xl shadow-xl p-1.5 animate-in fade-in zoom-in-95 duration-150">
                            <div className="px-2.5 py-1.5 border-b border-border/60 mb-1">
                              <p className="text-[11px] font-semibold text-muted-foreground">
                                {t("settings:users.manage_role_rights", "Atur Hak Peran Pengguna")}
                              </p>
                            </div>
                            <div className="space-y-1">
                              {ALL_ROLES.map((r) => {
                                const isChecked = currentRoles.includes(r.id);
                                const isPrimary = currentRoles[0] === r.id;
                                const isOnlyRole = currentRoles.length === 1 && isChecked;

                                return (
                                  <label
                                    key={r.id}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      if (isOnlyRole) {
                                        toast.error("Minimal satu peran harus tetap tercentang.");
                                        return;
                                      }
                                      void handleToggleRole(u, r.id);
                                    }}
                                    className={cn(
                                      "flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors",
                                      isChecked
                                        ? "bg-primary/10 text-primary dark:text-sky-400 font-medium"
                                        : "hover:bg-muted/60 text-foreground",
                                      isOnlyRole && "cursor-not-allowed opacity-80",
                                    )}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <Checkbox
                                        checked={isChecked}
                                        tabIndex={-1}
                                        aria-hidden="true"
                                        className="pointer-events-none"
                                      />
                                      <div className="min-w-0">
                                        <p className="text-xs font-semibold leading-tight">
                                          {r.label}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground leading-tight">
                                          {t(r.descKey, r.fallbackDesc)}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Penanda Peran Utama */}
                                    {isPrimary && (
                                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 shrink-0">
                                        {t("settings:users.role_primary_badge", "Utama")}
                                      </span>
                                    )}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center min-h-5 -my-px">
                          <StatusBadge
                            tone={u.is_active ? "success" : "destructive"}
                            label={u.is_active ? t("status.active", "Aktif") : t("status.inactive", "Nonaktif")}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="px-3 text-center text-muted-foreground whitespace-nowrap tabular-nums">
                        {formatDateTimeID(u.last_login_at)}
                      </TableCell>

                      {/* KOLOM TINDAKAN: NONAKTIFKAN + HAPUS */}
                      <TableCell className="pl-2 pr-6 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1 -my-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={isSelf}
                            onClick={() => setToggleTarget(u)}
                            title={u.is_active ? t("settings:users.title_deactivate", "Nonaktifkan Akses Pengguna") : t("settings:users.title_reactivate", "Aktifkan Kembali Pengguna")}
                            className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                          >
                            {u.is_active ? (
                              <UserXIcon className="size-4" />
                            ) : (
                              <UserCheckIcon className="size-4 text-emerald-500" />
                            )}
                            <span className="sr-only">
                              {u.is_active ? t("settings:users.title_deactivate", "Nonaktifkan Akses Pengguna") : t("settings:users.title_reactivate", "Aktifkan Kembali Pengguna")}
                            </span>
                          </Button>

                          {/* Tombol Hapus User */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={isSelf}
                            onClick={() => setDeleteTarget(u)}
                            className="size-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                            title={t("settings:users.title_delete_user", "Hapus Akun Pengguna Secara Permanen")}
                          >
                            <Trash2Icon className="size-4" />
                            <span className="sr-only">{t("settings:users.title_delete_user", "Hapus Akun Pengguna Secara Permanen")}</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog Tambah Pengguna */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t("settings:users.modal_create_title", "Buat Akun Internal Baru")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="u-name" required className="text-xs font-semibold">
                  {t("settings:users.modal_full_name", "Nama Lengkap")}
                </FieldLabel>
                <Input
                  id="u-name"
                  required
                  placeholder={t("settings:users.ph_full_name", "Contoh: Nadia Putri")}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="text-xs h-9"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="u-email" required className="text-xs font-semibold">
                  {t("settings:users.modal_email", "Email Altvira")}
                </FieldLabel>
                <Input
                  id="u-email"
                  type="email"
                  required
                  placeholder={t("settings:users.ph_email", "nama@altvira.id")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-xs h-9"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="u-pwd" required className="text-xs font-semibold">
                  {t("settings:users.modal_password", "Kata Sandi Awal")}
                </FieldLabel>
                <Input
                  id="u-pwd"
                  type="password"
                  required
                  minLength={8}
                  placeholder={t("settings:users.ph_password", "Minimal 8 karakter...")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-xs h-9"
                />
                <FieldDescription className="text-[11px]">
                  {t("settings:users.modal_pwd_desc", "Pengguna dapat mengganti kata sandi setelah masuk ke sistem.")}
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel required className="text-xs font-semibold">
                  {t("settings:users.modal_role", "Peran Utama Awal")}
                </FieldLabel>
                <Select
                  value={newRole}
                  onValueChange={(val) => setNewRole(val as UserRole)}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="user">{t("settings:users.filter_role_user", "User (Tim Proyek)")}</SelectItem>
                      <SelectItem value="admin">{t("settings:users.filter_role_admin", "Admin (Bendahara)")}</SelectItem>
                      <SelectItem value="super_admin">{t("settings:users.filter_role_super_admin", "Super Admin")}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
            {createError ? (
              <p className="text-xs text-destructive">{createError}</p>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                className="rounded-2xl text-xs h-9"
              >
                {t("action.cancel", "Batal")}
              </Button>
              <Button type="submit" disabled={creating} className="rounded-2xl text-xs h-9 shadow-2xs">
                {creating ? t("settings:users.modal_creating", "Membuat...") : t("settings:users.modal_btn_create", "Buat Akun")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Aktif / Nonaktif */}
      {toggleTarget ? (
        <ConfirmActionDialog
          open={Boolean(toggleTarget)}
          onOpenChange={(open) => {
            if (!open) setToggleTarget(null);
          }}
          title={
            toggleTarget.is_active
              ? t("settings:users.title_deactivate", "Nonaktifkan Akses Pengguna")
              : t("settings:users.title_reactivate", "Aktifkan Kembali Pengguna")
          }
          description={t("settings:users.desc_confirm_toggle", {
            action: toggleTarget.is_active ? t("settings:users.btn_deactivate", "menonaktifkan").toLowerCase() : t("settings:users.btn_reactivate", "mengaktifkan kembali").toLowerCase(),
            name: toggleTarget.full_name,
            email: toggleTarget.email,
          })}
          confirmLabel={
            toggleTarget.is_active
              ? t("settings:users.btn_deactivate", "Nonaktifkan")
              : t("settings:users.btn_reactivate", "Aktifkan")
          }
          destructive={toggleTarget.is_active}
          onConfirm={async () => {
            if (!toggleTarget) return;
            try {
              await toggleInternalUserActive(
                toggleTarget.id,
                !toggleTarget.is_active,
              );
              toast.success(
                t("settings:users.toast_toggle_success", {
                  name: toggleTarget.full_name,
                  action: toggleTarget.is_active ? t("settings:users.status_deactivated", "dinonaktifkan") : t("settings:users.status_reactivated", "diaktifkan"),
                }),
              );
              setToggleTarget(null);
              await reload();
            } catch (err) {
              toast.error(
                err instanceof Error
                  ? err.message
                  : t("error", "Gagal memperbarui status."),
              );
            }
          }}
        />
      ) : null}

      {/* Dialog Konfirmasi Hapus Akun Pengguna (Tugas 1) */}
      {deleteTarget ? (
        <ConfirmActionDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          title={t("settings:users.title_delete_user", "Hapus Akun Pengguna Secara Permanen")}
          description={t("settings:users.desc_delete_user", {
            name: deleteTarget.full_name,
            email: deleteTarget.email,
          })}
          confirmLabel={t("settings:users.btn_delete_confirm", "Hapus Permanen")}
          destructive={true}
          confirmText="DELETE"
          onConfirm={handleDeleteUser}
        />
      ) : null}
    </div>
  );
}
