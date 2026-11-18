import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  LockIcon,
  MailCheckIcon,
  MailIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AltviraLogo } from "@/components/shared/altvira-logo";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-context";
import { useLanguage } from "@/lib/i18n";
import { useOptionalTheme } from "@/lib/theme-context";

/**
 * Halaman Permintaan Tautan Pemulihan Kata Sandi (/lupa-kata-sandi)
 * Didesain modern, minimalis, dan elegan sesuai token desain Altcycles
 * dengan background grid arsitektural, ambient glow, Altvira brand logo,
 * serta tombol pengalih tema dan dual bahasa di sudut kanan atas.
 */
export function ForgotPasswordPage() {
  const { t } = useLanguage();
  const themeCtx = useOptionalTheme();
  const resolvedTheme = themeCtx?.resolvedTheme ?? "dark";
  const { requestPasswordReset } = useAuth();

  const [email, setEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
      toast.success(
        t(
          "common:auth.link_sent_toast",
          "Tautan pemulihan kata sandi telah dikirim.",
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim tautan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-muted/30 dark:bg-background flex flex-col items-center justify-center p-4 sm:p-6 transition-colors duration-300 overflow-hidden select-none">
      {/* Background Architectural Grid Pattern */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Ambient Glow Orbs */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-sky-400/10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Tombol Aksi di Ujung Kanan Atas: Dual Bahasa & Mode Tema */}
      <div className="fixed top-4 right-4 sm:top-5 sm:right-6 z-[9999] flex items-center gap-2">
        <LanguageToggle
          size="default"
          className="size-10 rounded-2xl shadow-md border-border/80 bg-card/95 backdrop-blur-md"
        />
        <ThemeToggle variant="inline" size="default" />
      </div>

      {/* Brand Logo Header */}
      <div className="flex flex-col items-center text-center mb-6 z-10">
        <AltviraLogo
          size={38}
          variant={resolvedTheme === "dark" ? "light" : "dark"}
          subtitle="FINANCIAL ERP"
        />
      </div>

      {/* Kartu Konten Utama */}
      <Card className="w-full max-w-[440px] rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-xl dark:shadow-2xl dark:shadow-black/50 p-6 sm:p-8 z-10 transition-all">
        {sent ? (
          /* Tampilan Status Berhasil Terkirim */
          <div className="flex flex-col items-center text-center space-y-4 py-2 animate-in fade-in zoom-in-95 duration-200">
            <div className="size-14 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 flex items-center justify-center shadow-xs">
              <MailCheckIcon className="size-7" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {t("common:auth.email_sent_title", "Tautan Terkirim")}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xs">
                {t("common:auth.reset_sent")}
              </p>
            </div>
            <div className="w-full pt-3">
              <Button
                variant="outline"
                asChild
                className="w-full h-10 rounded-xl text-xs sm:text-sm font-semibold border-border hover:bg-muted/60"
              >
                <Link to="/login">
                  <ArrowLeftIcon className="size-4 mr-2" />
                  {t("common:auth.back_to_login")}
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          /* Formulir Masukkan Email */
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="size-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs">
                <KeyRoundIcon className="size-6" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {t("common:auth.reset_title")}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-sm">
                  {t("common:auth.reset_desc")}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <FieldGroup>
                <Field data-invalid={Boolean(error)}>
                  <FieldLabel htmlFor="reset-email" required>
                    {t("common:auth.work_email")}
                  </FieldLabel>
                  <div className="relative">
                    <MailIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="reset-email"
                      type="email"
                      required
                      placeholder={t("common:auth.email_ph")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-invalid={Boolean(error)}
                      className="h-10 rounded-xl pl-10 pr-3.5 text-xs sm:text-sm bg-background border-border"
                    />
                  </div>
                  {error ? <FieldDescription>{error}</FieldDescription> : null}
                </Field>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-10 rounded-xl text-xs sm:text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer mt-2"
                >
                  {submitting ? (
                    <Spinner data-icon="inline-start" className="mr-2 size-4" />
                  ) : null}
                  {submitting
                    ? t("common:auth.btn_sending")
                    : t("common:auth.btn_send_link")}
                </Button>
              </FieldGroup>
            </form>

            <div className="text-center pt-1 border-t border-border/60">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group mt-4 cursor-pointer"
              >
                <ArrowLeftIcon className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
                <span>{t("common:auth.back_to_login")}</span>
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/**
 * Halaman Penetapan Kata Sandi Baru (/reset-kata-sandi)
 * Dilengkapi pengalih tema, dual bahasa, logo resmi Altvira,
 * toggle pratinjau visibilitas kata sandi, serta validasi minimal 8 karakter.
 */
export function ResetPasswordPage() {
  const { t } = useLanguage();
  const themeCtx = useOptionalTheme();
  const resolvedTheme = themeCtx?.resolvedTheme ?? "dark";
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError(
        t(
          "common:auth.pwd_mismatch",
          "Konfirmasi kata sandi tidak cocok.",
        ),
      );
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await updatePassword(password);
      toast.success(
        t(
          "common:auth.reset_success_toast",
          "Kata sandi berhasil diperbarui. Silakan masuk.",
        ),
      );
      navigate("/login", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memperbarui kata sandi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-muted/30 dark:bg-background flex flex-col items-center justify-center p-4 sm:p-6 transition-colors duration-300 overflow-hidden select-none">
      {/* Background Architectural Grid Pattern */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Ambient Glow Orbs */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-sky-400/10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Tombol Aksi di Ujung Kanan Atas: Dual Bahasa & Mode Tema */}
      <div className="fixed top-4 right-4 sm:top-5 sm:right-6 z-[9999] flex items-center gap-2">
        <LanguageToggle
          size="default"
          className="size-10 rounded-2xl shadow-md border-border/80 bg-card/95 backdrop-blur-md"
        />
        <ThemeToggle variant="inline" size="default" />
      </div>

      {/* Brand Logo Header */}
      <div className="flex flex-col items-center text-center mb-6 z-10">
        <AltviraLogo
          size={38}
          variant={resolvedTheme === "dark" ? "light" : "dark"}
          subtitle="FINANCIAL ERP"
        />
      </div>

      {/* Kartu Konten Utama */}
      <Card className="w-full max-w-[440px] rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-xl dark:shadow-2xl dark:shadow-black/50 p-6 sm:p-8 z-10">
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="size-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs">
              <LockIcon className="size-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {t("common:auth.set_new_pwd_title")}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-sm">
                {t("common:auth.set_new_pwd_desc")}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <FieldGroup>
              {/* Field Kata Sandi Baru */}
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="new-pass" required>
                  {t("common:auth.new_password")}
                </FieldLabel>
                <div className="relative">
                  <Input
                    id="new-pass"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={Boolean(error)}
                    className="h-10 rounded-xl pr-10 text-xs sm:text-sm bg-background border-border"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  >
                    {showPassword ? (
                      <EyeOffIcon className="size-4" />
                    ) : (
                      <EyeIcon className="size-4" />
                    )}
                  </button>
                </div>
              </Field>

              {/* Field Ulangi Kata Sandi Baru */}
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="confirm-pass" required>
                  {t("common:auth.confirm_new_password")}
                </FieldLabel>
                <div className="relative">
                  <Input
                    id="confirm-pass"
                    type={showConfirm ? "text" : "password"}
                    required
                    minLength={8}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    aria-invalid={Boolean(error)}
                    className="h-10 rounded-xl pr-10 text-xs sm:text-sm bg-background border-border"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                    aria-label={showConfirm ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  >
                    {showConfirm ? (
                      <EyeOffIcon className="size-4" />
                    ) : (
                      <EyeIcon className="size-4" />
                    )}
                  </button>
                </div>
                {error ? <FieldDescription>{error}</FieldDescription> : null}
              </Field>

              {/* Petunjuk Kriteria Keamanan */}
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 rounded-xl p-2.5 border border-border/60">
                <ShieldCheckIcon className="size-4 text-primary shrink-0" />
                <span>{t("common:auth.set_new_pwd_desc")}</span>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-10 rounded-xl text-xs sm:text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer mt-2"
              >
                {submitting ? (
                  <Spinner data-icon="inline-start" className="mr-2 size-4" />
                ) : (
                  <CheckCircle2Icon className="mr-2 size-4" />
                )}
                {submitting
                  ? t("common:auth.btn_saving_pwd")
                  : t("common:auth.btn_save_pwd")}
              </Button>
            </FieldGroup>
          </form>

          <div className="text-center pt-1 border-t border-border/60">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group mt-4 cursor-pointer"
            >
              <ArrowLeftIcon className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>{t("common:auth.back_to_login")}</span>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
