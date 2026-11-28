import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2Icon,
  EyeIcon,
  EyeOffIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/lib/i18n";
import type { AuthMode, PasswordCriteria } from "./login-types";

function GoogleIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export interface LoginCredentialFormProps {
  mode: AuthMode;
  setMode: (mode: AuthMode) => void;
  username: string;
  setUsername: (val: string) => void;
  fullName: string;
  setFullName: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (val: boolean) => void;
  capsLockOn: boolean;
  setCapsLockOn: (val: boolean) => void;
  rememberMe: boolean;
  setRememberMe: (val: boolean) => void;
  submitting: boolean;
  googleSubmitting: boolean;
  error: string | null;
  setError: (val: string | null) => void;
  pwdCriteria: PasswordCriteria;
  pwdScore: number;
  onGoogleSignIn: () => Promise<void>;
  onSignIn: (e: FormEvent) => Promise<void>;
  onSignUp: (e: FormEvent) => Promise<void>;
}

export function LoginCredentialForm({
  mode,
  setMode,
  username,
  setUsername,
  fullName,
  setFullName,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  capsLockOn,
  setCapsLockOn,
  rememberMe,
  setRememberMe,
  submitting,
  googleSubmitting,
  error,
  setError,
  pwdCriteria,
  pwdScore,
  onGoogleSignIn,
  onSignIn,
  onSignUp,
}: LoginCredentialFormProps) {
  const { t } = useLanguage();

  return (
    <Card className="border border-border/80 shadow-xl dark:shadow-2xl dark:shadow-black/50 rounded-2xl bg-card overflow-hidden transition-colors">
      <CardContent className="p-6 sm:p-7 space-y-4">
        {/* Overline, Title & Subtitle */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
            {t("auth.login_overline", "ALTVIRA FINANCIAL ERP")}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {mode === "signin"
              ? t("auth.signin_title", "Masuk ke Altcycles")
              : t("auth.signup_title", "Daftar Akun Altcycles")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1">
            {mode === "signin"
              ? t("auth.signin_subtitle", "Lanjutkan kelola keuangan dan operasional proyek Anda.")
              : t("auth.signup_subtitle", "Daftarkan akun internal Altvira untuk mengakses portal kerja.")}
          </p>
        </div>

        {/* Tombol Masuk dengan Google */}
        <Button
          type="button"
          variant="outline"
          disabled={submitting || googleSubmitting}
          onClick={onGoogleSignIn}
          className="w-full h-11 text-sm font-semibold rounded-xl border-border bg-card hover:bg-muted text-foreground transition-all shadow-xs active:scale-[0.99] flex items-center justify-center gap-3 cursor-pointer"
        >
          {googleSubmitting ? (
            <Spinner className="size-4" />
          ) : (
            <GoogleIcon className="size-4.5 shrink-0" />
          )}
          <span>
            {mode === "signin"
              ? t("auth.signin_google", "Masuk dengan Google")
              : t("auth.signup_google", "Daftar dengan Google")}
          </span>
        </Button>

        {/* Pembatas "atau" */}
        <div className="relative my-0.5">
          <div className="absolute inset-0 flex items-center">
            <Separator className="bg-border/60" />
          </div>
          <div className="relative flex justify-center text-xs lowercase">
            <span className="bg-card px-3 text-muted-foreground">
              {t("auth.or", "atau")}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form
          id="auth-form"
          onSubmit={mode === "signin" ? onSignIn : onSignUp}
          className="space-y-3.5 pt-1.5"
        >
          <FieldGroup className="gap-3.5">
            {/* Field Nama Lengkap (Khusus Mode Daftar Akun) */}
            {mode === "signup" && (
              <Field data-invalid={Boolean(error)} className="space-y-1.5">
                <FieldLabel
                  htmlFor="auth-fullname"
                  required
                  className="text-xs font-semibold text-foreground"
                >
                  {t("auth.full_name", "Nama Lengkap")}
                </FieldLabel>
                <Input
                  id="auth-fullname"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder={t("auth.full_name_placeholder", "Nama lengkap Anda")}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-11 border-border bg-card text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary text-base sm:text-sm rounded-xl px-3.5"
                />
              </Field>
            )}

            {/* Field Identitas (Email atau Username) */}
            <Field data-invalid={Boolean(error)} className="space-y-1.5">
              <FieldLabel
                htmlFor="auth-username"
                className="text-xs font-semibold text-foreground"
              >
                {t("auth.identity_label", "Email atau Username")}
              </FieldLabel>
              <Input
                id="auth-username"
                type="text"
                autoComplete="username"
                required
                placeholder={
                  mode === "signin"
                    ? t("auth.identity_placeholder", "Masukkan email aktif atau username Anda")
                    : t("auth.username_placeholder_signup", "contoh: izzul atau nama@altvira.id")
                }
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 border-border bg-card text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary text-base sm:text-sm rounded-xl px-3.5"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "auth-error" : undefined}
              />
            </Field>

            {/* Field Kata Sandi / Password */}
            <Field data-invalid={Boolean(error)} className="space-y-1.5">
              <FieldLabel
                htmlFor="auth-password"
                className="text-xs font-semibold text-foreground"
              >
                {t("auth.password", "Kata Sandi")}
              </FieldLabel>
              <div className="relative">
                <Input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    mode === "signin"
                      ? "current-password"
                      : "new-password"
                  }
                  required
                  placeholder={t("auth.password_placeholder_dicoding", "Masukkan password")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                  onKeyUp={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
                  className="pr-11 h-11 border-border bg-card text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary text-base sm:text-sm rounded-xl px-3.5"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "auth-error" : undefined}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 size-8 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
                  aria-label={
                    showPassword
                      ? t("auth.hide_password", "Sembunyikan kata sandi")
                      : t("auth.show_password", "Tampilkan kata sandi")
                  }
                >
                  {showPassword ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </Button>
              </div>

              {/* Peringatan Caps Lock */}
              {capsLockOn && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5 mt-1.5">
                  <span className="size-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span>{t("auth.caps_lock_warning", "Caps Lock aktif")}</span>
                </p>
              )}

              {/* Baris Ingat Saya & Lupa Password */}
              {mode === "signin" && (
                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={rememberMe}
                      onCheckedChange={(val) => setRememberMe(Boolean(val))}
                      className="size-4 rounded-[3.5px]"
                    />
                    <span className="text-xs text-muted-foreground">
                      {t("auth.remember_me", "Ingat saya")}
                    </span>
                  </label>
                  <Link
                    to="/lupa-kata-sandi"
                    className="text-xs font-semibold text-primary dark:text-[#60A5FA] hover:underline transition-colors"
                  >
                    {t("auth.forgot_password", "Lupa password?")}
                  </Link>
                </div>
              )}

              {/* Indikator & Ketentuan Kata Sandi (Khusus Signup) */}
              {(mode === "signup" || password.length > 0) && (
                <div className="space-y-2 pt-1 transition-all">
                  {/* Progress Bar Kekuatan Sandi */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground font-medium">
                        {t("auth.password_strength", "Kekuatan Kata Sandi:")}
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
                          ? t("auth.strength_strong", "Kuat")
                          : pwdScore >= 3
                            ? t("auth.strength_medium", "Sedang")
                            : t("auth.strength_weak", "Lemah")}
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

                  {/* Checklist Ketentuan Kata Sandi (Hanya tampil pada tab Buat Akun) */}
                  {mode === "signup" && (
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/80 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                        <ShieldCheckIcon className="size-3.5 text-primary" />
                        <span>{t("auth.password_criteria", "Ketentuan Kata Sandi:")}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                        <div
                          className={`flex items-center gap-1.5 transition-colors ${
                            pwdCriteria.minLength
                              ? "text-emerald-600 dark:text-emerald-400 font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {pwdCriteria.minLength ? (
                            <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <div className="size-3.5 rounded-full border border-current shrink-0 opacity-60" />
                          )}
                          <span>{t("auth.criteria_min_length", "Minimal 8 karakter")}</span>
                        </div>

                        <div
                          className={`flex items-center gap-1.5 transition-colors ${
                            pwdCriteria.hasUpper
                              ? "text-emerald-600 dark:text-emerald-400 font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {pwdCriteria.hasUpper ? (
                            <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <div className="size-3.5 rounded-full border border-current shrink-0 opacity-60" />
                          )}
                          <span>{t("auth.criteria_upper", "Huruf kapital (A-Z)")}</span>
                        </div>

                        <div
                          className={`flex items-center gap-1.5 transition-colors ${
                            pwdCriteria.hasLower
                              ? "text-emerald-600 dark:text-emerald-400 font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {pwdCriteria.hasLower ? (
                            <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <div className="size-3.5 rounded-full border border-current shrink-0 opacity-60" />
                          )}
                          <span>{t("auth.criteria_lower", "Huruf kecil (a-z)")}</span>
                        </div>

                        <div
                          className={`flex items-center gap-1.5 transition-colors ${
                            pwdCriteria.hasNumber
                              ? "text-emerald-600 dark:text-emerald-400 font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {pwdCriteria.hasNumber ? (
                            <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <div className="size-3.5 rounded-full border border-current shrink-0 opacity-60" />
                          )}
                          <span>{t("auth.criteria_number", "Angka (0-9)")}</span>
                        </div>

                        <div
                          className={`flex items-center gap-1.5 sm:col-span-2 transition-colors ${
                            pwdCriteria.hasSymbol
                              ? "text-emerald-600 dark:text-emerald-400 font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {pwdCriteria.hasSymbol ? (
                            <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <div className="size-3.5 rounded-full border border-current shrink-0 opacity-60" />
                          )}
                          <span>{t("auth.criteria_symbol", "Simbol khusus (!@#$%^&* dll)")}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Field>

            {/* Field Konfirmasi Kata Sandi (Khusus Mode Buat Akun) */}
            {mode === "signup" && (
              <Field data-invalid={Boolean(error)} className="space-y-1.5">
                <FieldLabel
                  htmlFor="auth-confirm-password"
                  required
                  className="text-xs font-semibold text-foreground"
                >
                  {t("auth.confirm_password", "Konfirmasi Kata Sandi")}
                </FieldLabel>
                <div className="relative">
                  <Input
                    id="auth-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    placeholder={t("auth.confirm_password_placeholder", "Ulangi kata sandi")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-11 h-11 border-border bg-card text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary text-base sm:text-sm rounded-xl px-3.5"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "auth-error" : undefined}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-8 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
                    aria-label={
                      showConfirmPassword
                        ? t("auth.hide_password", "Sembunyikan konfirmasi kata sandi")
                        : t("auth.show_password", "Tampilkan konfirmasi kata sandi")
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOffIcon className="size-4" />
                    ) : (
                      <EyeIcon className="size-4" />
                    )}
                  </Button>
                </div>
              </Field>
            )}

            {/* Error Message */}
            {error && (
              <FieldDescription
                id="auth-error"
                role="alert"
                className="text-xs text-destructive font-medium bg-destructive/10 p-2.5 rounded-xl border border-destructive/20"
              >
                {error}
              </FieldDescription>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitting || googleSubmitting}
              className="w-full h-11 text-sm font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 transition-all active:scale-[0.99] mt-0.5 cursor-pointer"
            >
              {submitting ? (
                <Spinner className="mr-2" />
              ) : (
                <span>
                  {mode === "signin"
                    ? t("auth.signin_button", "Masuk")
                    : t("auth.signup_button", "Daftar")}
                </span>
              )}
            </Button>
          </FieldGroup>
        </form>

        {/* Footer Links: Alih Mode Akun & Akses Pembeli Proyek */}
        <div className="space-y-1.5 text-left text-xs text-muted-foreground pt-1">
          <p>
            {mode === "signin" ? (
              <span>
                {t("auth.no_account", "Belum punya akun?")}{" "}
                <Button
                  type="button"
                  variant="link"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                  className="p-0 h-auto font-semibold text-primary dark:text-[#60A5FA] hover:underline cursor-pointer"
                >
                  {t("auth.signup_action", "Daftar")}
                </Button>
              </span>
            ) : (
              <span>
                {t("auth.has_account", "Sudah punya akun?")}{" "}
                <Button
                  type="button"
                  variant="link"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                  }}
                  className="p-0 h-auto font-semibold text-primary dark:text-[#60A5FA] hover:underline cursor-pointer"
                >
                  {t("auth.signin_action", "Masuk")}
                </Button>
              </span>
            )}
          </p>

          <p>
            <span>{t("auth.buyer_portal_text", "Pembeli proyek?")}{" "}</span>
            <Link
              to="/portal-pembeli"
              className="font-semibold text-primary dark:text-[#60A5FA] hover:underline transition-colors"
            >
              {t("auth.buyer_portal_action", "Lacak dengan nomor PO")}
            </Link>
          </p>
        </div>

        {/* Legal Disclaimer */}
        <p className="text-[11px] text-muted-foreground/75 leading-relaxed text-center pt-3.5 border-t border-border/40">
          {t(
            "auth.legal_notice",
            "Dengan masuk, Anda menyetujui Syarat dan Ketentuan serta Kebijakan Privasi Altvira Technology. Akses portal dilindungi sistem keamanan internal.",
          )}
        </p>
      </CardContent>
    </Card>
  );
}
