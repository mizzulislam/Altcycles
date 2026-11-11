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

export function ForgotPasswordPage() {
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
          <CardTitle>Pemulihan Kata Sandi</CardTitle>
          <CardDescription>
            Masukkan alamat email akun internal Anda untuk menerima tautan atur
            ulang kata sandi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Jika email <strong>{email}</strong> terdaftar sebagai akun aktif
              Altvira, instruksi pemulihan kata sandi telah dikirimkan.
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field data-invalid={Boolean(error)}>
                  <FieldLabel htmlFor="reset-email" required>Email Kerja</FieldLabel>
                  <Input
                    id="reset-email"
                    type="email"
                    required
                    placeholder="nama@altvira.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={Boolean(error)}
                  />
                  {error ? <FieldDescription>{error}</FieldDescription> : null}
                </Field>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Spinner data-icon="inline-start" /> : null}
                  Kirim Tautan Pemulihan
                </Button>
              </FieldGroup>
            </form>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">
              <ArrowLeftIcon data-icon="inline-start" />
              Kembali ke Halaman Masuk
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export function ResetPasswordPage() {
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
          <CardTitle>Tetapkan Kata Sandi Baru</CardTitle>
          <CardDescription>
            Gunakan kata sandi baru minimal 8 karakter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="new-pass" required>Kata Sandi Baru</FieldLabel>
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
                  Ulangi Kata Sandi Baru
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
                Simpan Kata Sandi Baru
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

