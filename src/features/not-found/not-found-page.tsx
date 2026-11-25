import { Link } from "react-router-dom";
import { ArrowLeftIcon, FileQuestionIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AltviraLogoMark } from "@/components/shared/altvira-logo";
import { useLanguage } from "@/lib/i18n";

export function NotFoundPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6 antialiased">
      <div className="w-full max-w-md flex flex-col items-center text-center">
        {/* Logo Altcycles */}
        <div className="mb-6 flex items-center gap-2.5">
          <AltviraLogoMark size={36} />
          <span className="font-bold text-xl tracking-tight text-foreground">
            Altcycles
          </span>
        </div>

        <Card className="w-full rounded-2xl border-border/80 bg-card p-6 sm:p-8 shadow-2xs flex flex-col items-center">
          <div className="size-16 rounded-2xl border border-border/80 bg-muted/30 flex items-center justify-center text-muted-foreground mb-4 shadow-2xs">
            <FileQuestionIcon className="size-8 text-primary" />
          </div>

          <span className="text-4xl sm:text-5xl font-black tracking-tight text-primary font-mono mb-2">
            {t("common:not_found.code", "404")}
          </span>

          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground mb-2">
            {t("common:not_found.title", "Halaman Tidak Ditemukan")}
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6">
            {t(
              "common:not_found.desc",
              "Tautan yang Anda tuju mungkin salah ketik, telah dipindahkan, atau hak akses akun Anda tidak mencakup rute ini.",
            )}
          </p>

          <Button asChild className="h-9 px-4 rounded-xl text-xs sm:text-sm font-semibold w-full sm:w-auto gap-2">
            <Link to="/">
              <ArrowLeftIcon className="size-4" />
              <span>{t("common:not_found.back_home", "Kembali ke Beranda")}</span>
            </Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
