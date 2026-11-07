import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2Icon, ExternalLinkIcon, ShieldCheckIcon } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Separator } from "@/components/ui/separator";
import { portalHomeForRole, useAuth } from "@/features/auth/auth-context";

export function LoginPage() {
  const { signIn, profile, isDemoMode } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (profile) {
      navigate(portalHomeForRole(profile.role), { replace: true });
    }
  }, [profile, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const loggedIn = await signIn(email, password);
      toast.success(`Selamat datang, ${loggedIn.full_name}`);
      navigate(portalHomeForRole(loggedIn.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk ke sistem.");
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemoAccount(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("demo1234");
    setError(null);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <div className="flex w-full max-w-md flex-col gap-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Building2Icon className="size-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Altcycles</h1>
          <p className="text-xs text-muted-foreground">
            Sistem Administrasi Keuangan &amp; Akuntansi — Altvira Technology
          </p>
        </div>

        {isDemoMode ? (
          <Alert variant="info">
            <ShieldCheckIcon />
            <AlertTitle>Mode Pratinjau Lokal Aktif</AlertTitle>
            <AlertDescription>
              Variabel Supabase belum dihubungkan. Pilih akun contoh di bawah
              untuk menguji masing-masing portal peran:
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fillDemoAccount("superadmin@altvira.id")}
                >
                  Super Admin
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fillDemoAccount("admin@altvira.id")}
                >
                  Admin
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fillDemoAccount("user@altvira.id")}
                >
                  User
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Masuk Portal Internal</CardTitle>
            <CardDescription>
              Gunakan email dan kata sandi akun internal Altvira Anda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form id="login-form" onSubmit={handleSubmit}>
              <FieldGroup>
                <Field data-invalid={Boolean(error)}>
                  <FieldLabel htmlFor="login-email">Email Kerja</FieldLabel>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="nama@altvira.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={Boolean(error)}
                  />
                </Field>

                <Field data-invalid={Boolean(error)}>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="login-password">Kata Sandi</FieldLabel>
                    <Link
                      to="/lupa-kata-sandi"
                      className="text-xs text-primary hover:underline"
                    >
                      Lupa kata sandi?
                    </Link>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="Masukkan kata sandi"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={Boolean(error)}
                  />
                  {error ? <FieldDescription>{error}</FieldDescription> : null}
                </Field>

                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? <Spinner data-icon="inline-start" /> : null}
                  Masuk Sistem
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
          <Separator />
          <CardFooter className="flex flex-col items-start gap-2 pt-4">
            <p className="text-xs text-muted-foreground">
              Klien / Pembeli Altvira tidak memerlukan akun login:
            </p>
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link to="/portal-pembeli">
                Buka Portal Pembeli (Akses via Nomor PO)
                <ExternalLinkIcon data-icon="inline-end" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

