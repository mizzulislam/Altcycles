import * as React from "react";
import {
  CheckCircle2Icon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  LockIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useAuth } from "@/features/auth/auth-context";
import { ROLE_LABELS } from "@/lib/formatters";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PasswordCriteria {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
}

function evaluatePassword(pwd: string): PasswordCriteria {
  return {
    minLength: pwd.length >= 8,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSymbol: /[^A-Za-z0-9]/.test(pwd),
  };
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: ChangePasswordDialogProps) {
  const { profile, updatePassword } = useAuth();

  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Evaluasi kekuatan kata sandi
  const criteria = React.useMemo(
    () => evaluatePassword(newPassword),
    [newPassword],
  );

  const pwdScore = React.useMemo(() => {
    let score = 0;
    if (criteria.minLength) score++;
    if (criteria.hasUpper) score++;
    if (criteria.hasLower) score++;
    if (criteria.hasNumber) score++;
    if (criteria.hasSymbol) score++;
    return score;
  }, [criteria]);

  // Reset form saat dialog ditutup/dibuka
  React.useEffect(() => {
    if (!open) {
      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirm(false);
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validasi kelengkapan kriteria
    if (
      !criteria.minLength ||
      !criteria.hasUpper ||
      !criteria.hasLower ||
      !criteria.hasNumber ||
      !criteria.hasSymbol
    ) {
      setError(
        "Kata sandi baru belum memenuhi kriteria: Wajib minimal 8 karakter, serta memiliki kombinasi huruf kapital (A-Z), huruf kecil (a-z), angka (0-9), dan simbol khusus (!@#$%^&* dll).",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok dengan kata sandi baru.");
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(newPassword);
      toast.success("Kata sandi akun Anda berhasil diperbarui!");
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memperbarui kata sandi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <KeyRoundIcon className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Ganti Kata Sandi Akun
              </DialogTitle>
              <DialogDescription className="text-xs">
                Perbarui kata sandi untuk menjaga keamanan akun Anda.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Informasi Akun Saat Ini */}
        <div className="p-3 rounded-xl bg-muted/50 border border-border/60 flex items-center justify-between text-xs">
          <div className="flex flex-col min-w-0 pr-2">
            <span className="font-semibold text-foreground truncate">
              {profile.full_name}
            </span>
            <span className="text-muted-foreground truncate">
              {profile.email}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary shrink-0">
            {ROLE_LABELS[profile.role]}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <FieldGroup className="space-y-3.5">
            {/* Field Kata Sandi Baru */}
            <Field data-invalid={Boolean(error)}>
              <FieldLabel className="text-xs font-semibold">
                Kata Sandi Baru
              </FieldLabel>
              <div className="relative">
                <LockIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Masukkan kata sandi baru"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 pr-11 h-10 text-sm"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
                  aria-label={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                >
                  {showPassword ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </button>
              </div>

              {/* Indikator Kekuatan Sandi */}
              {newPassword.length > 0 && (
                <div className="space-y-2 pt-1 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground font-medium">
                        Kekuatan Kata Sandi:
                      </span>
                      <span
                        className={`font-bold transition-colors ${
                          pwdScore === 5
                            ? "text-emerald-600 dark:text-emerald-400"
                            : pwdScore >= 3
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-red-500 dark:text-red-400"
                        }`}
                      >
                        {pwdScore === 5
                          ? "Kuat"
                          : pwdScore >= 3
                            ? "Sedang"
                            : "Lemah"}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <div
                          key={lvl}
                          className={`h-full rounded-full transition-all duration-300 ${
                            pwdScore >= lvl
                              ? pwdScore === 5
                                ? "bg-emerald-500"
                                : pwdScore >= 3
                                  ? "bg-amber-400"
                                  : "bg-red-500"
                              : "bg-transparent"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Ketentuan Kata Sandi */}
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-1 text-[11px]">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
                      <ShieldCheckIcon className="size-3.5 text-primary" />
                      <span>Ketentuan Kata Sandi:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                      <div
                        className={`flex items-center gap-1.5 ${
                          criteria.minLength
                            ? "text-emerald-600 dark:text-emerald-400 font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {criteria.minLength ? (
                          <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <div className="size-3.5 rounded-full border border-current shrink-0 opacity-60" />
                        )}
                        <span>Min. 8 karakter</span>
                      </div>
                      <div
                        className={`flex items-center gap-1.5 ${
                          criteria.hasUpper
                            ? "text-emerald-600 dark:text-emerald-400 font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {criteria.hasUpper ? (
                          <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <div className="size-3.5 rounded-full border border-current shrink-0 opacity-60" />
                        )}
                        <span>Huruf kapital (A-Z)</span>
                      </div>
                      <div
                        className={`flex items-center gap-1.5 ${
                          criteria.hasLower
                            ? "text-emerald-600 dark:text-emerald-400 font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {criteria.hasLower ? (
                          <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <div className="size-3.5 rounded-full border border-current shrink-0 opacity-60" />
                        )}
                        <span>Huruf kecil (a-z)</span>
                      </div>
                      <div
                        className={`flex items-center gap-1.5 ${
                          criteria.hasNumber
                            ? "text-emerald-600 dark:text-emerald-400 font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {criteria.hasNumber ? (
                          <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <div className="size-3.5 rounded-full border border-current shrink-0 opacity-60" />
                        )}
                        <span>Angka (0-9)</span>
                      </div>
                      <div
                        className={`flex items-center gap-1.5 sm:col-span-2 ${
                          criteria.hasSymbol
                            ? "text-emerald-600 dark:text-emerald-400 font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {criteria.hasSymbol ? (
                          <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <div className="size-3.5 rounded-full border border-current shrink-0 opacity-60" />
                        )}
                        <span>Simbol khusus (!@#$%^&* dll)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Field>

            {/* Field Konfirmasi Kata Sandi */}
            <Field data-invalid={Boolean(error)}>
              <FieldLabel className="text-xs font-semibold">
                Konfirmasi Kata Sandi Baru
              </FieldLabel>
              <div className="relative">
                <LockIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type={showConfirm ? "text" : "password"}
                  required
                  placeholder="Ulangi kata sandi baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-11 h-10 text-sm"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
                  aria-label={
                    showConfirm
                      ? "Sembunyikan konfirmasi kata sandi"
                      : "Tampilkan konfirmasi kata sandi"
                  }
                >
                  {showConfirm ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </button>
              </div>
            </Field>

            {/* Error Message */}
            {error && (
              <FieldDescription className="text-xs text-destructive font-medium bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                {error}
              </FieldDescription>
            )}
          </FieldGroup>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner className="mr-2" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Kata Sandi</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

