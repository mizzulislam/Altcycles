import { Link } from "react-router-dom";
import { ArrowLeftIcon, ShieldCheckIcon } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function BuyerPlaceholderPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Portal Pembeli Altvira</CardTitle>
            <StatusBadge tone="info" label="Tanpa Login · Nomor PO" />
          </div>
          <CardDescription>
            Halaman publik terisolasi untuk pengajuan PO klien serta pemantauan
            progres, termin, dan dokumen proyek melalui Nomor PO berkode acak.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-xs text-muted-foreground leading-relaxed">
          <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-foreground">
            <ShieldCheckIcon className="size-4 shrink-0 mt-0.5 text-primary" />
            <span>
              Pada Fase 1 (Fondasi), seluruh tabel internal telah dikunci dari
              akses publik (<code>REVOKE ALL ... FROM anon</code> +{" "}
              <code>FORCE ROW LEVEL SECURITY</code>). Formulir pengajuan PO
              Klien dan pelacakan dokumen via Edge Function dibuka pada{" "}
              <strong>Fase 4 (Proyek Klien)</strong> sesuai roadmap PRD Bagian
              12.
            </span>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" asChild>
            <Link to="/login">
              <ArrowLeftIcon data-icon="inline-start" />
              Kembali ke Halaman Masuk Internal
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

