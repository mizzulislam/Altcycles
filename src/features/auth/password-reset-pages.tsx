import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useAuth } from "@/features/auth/auth-context";
import { useLanguage } from "@/lib/i18n";

export function ForgotPasswordPage() {
  const { t } = useLanguage();
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
      toast.success("Tautan pemulihan kata sandi telah dikirim.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim tautan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <ThemeToggle variant="floating" />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("common:auth.reset_title")}</CardTitle>
          <CardDescription>
            {t("common:auth.reset_desc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("common:auth.reset_sent")}
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field data-invalid={Boolean(error)}>
                  <FieldLabel htmlFor="reset-email" required>{t("common:auth.work_email")}</FieldLabel>
                  <Input
                    id="reset-email"
                    type="email"
                    required
                    placeholder={t("common:auth.email_ph")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={Boolean(error)}
                  />
                  {error ? <FieldDescription>{error}</FieldDescription> : null}
                </Field>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Spinner data-icon="inline-start" /> : null}
                  {submitting ? t("common:auth.btn_sending") : t("common:auth.btn_send_link")}
                </Button>
              </FieldGroup>
            </form>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">
              <ArrowLeftIcon data-icon="inline-start" />
              {t("common:auth.back_to_login")}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export function ResetPasswordPage() {
  const { t } = useLanguage();
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await updatePassword(password);
      toast.success("Kata sandi berhasil diperbarui. Silakan masuk.");
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
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <ThemeToggle variant="floating" />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("common:auth.set_new_pwd_title")}</CardTitle>
          <CardDescription>
            {t("common:auth.set_new_pwd_desc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="new-pass" required>{t("common:auth.new_password")}</FieldLabel>
                <Input
                  id="new-pass"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(error)}
                />
              </Field>
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="confirm-pass" required>
                  {t("common:auth.confirm_new_password")}
                </FieldLabel>
                <Input
                  id="confirm-pass"
                  type="password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  aria-invalid={Boolean(error)}
                />
                {error ? <FieldDescription>{error}</FieldDescription> : null}
              </Field>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Spinner data-icon="inline-start" /> : null}
                {submitting ? t("common:auth.btn_saving_pwd") : t("common:auth.btn_save_pwd")}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

