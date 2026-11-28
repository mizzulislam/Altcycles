import { ChevronLeftIcon, ChevronRightIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { useLanguage } from "@/lib/i18n";
import type { LoginMediaItemRow } from "@/types/database.types";
import type { CategoryMetaMap } from "./login-media-types";

export interface LoginMediaPreviewCardProps {
  activeItems: LoginMediaItemRow[];
  previewIdx: number;
  setPreviewIdx: React.Dispatch<React.SetStateAction<number>>;
  previewSlide: LoginMediaItemRow | null;
  categoryMeta: CategoryMetaMap;
}

export function LoginMediaPreviewCard({
  activeItems,
  previewIdx,
  setPreviewIdx,
  previewSlide,
  categoryMeta,
}: LoginMediaPreviewCardProps) {
  const { t } = useLanguage();

  return (
    <Card className="overflow-hidden">
      <CardHeaderWithInfo
        title={t("settings:login_media.preview_panel_title")}
        description={t("settings:login_media.preview_panel_desc")}
        action={
          activeItems.length > 1 ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-8 rounded-lg"
                onClick={() =>
                  setPreviewIdx(
                    (prev) => (prev - 1 + activeItems.length) % activeItems.length,
                  )
                }
                aria-label={t("settings:login_media.prev_slide")}
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <span className="text-xs font-semibold tabular-nums px-1.5 text-muted-foreground">
                {previewIdx + 1} / {activeItems.length}
              </span>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-8 rounded-lg"
                onClick={() =>
                  setPreviewIdx((prev) => (prev + 1) % activeItems.length)
                }
                aria-label={t("settings:login_media.next_slide")}
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          ) : null
        }
      />
      <CardContent className="p-6">
        <div className="relative h-64 sm:h-80 w-full rounded-2xl overflow-hidden bg-[#090E19] border border-border/80 flex items-center justify-center">
          {previewSlide ? (
            <>
              {previewSlide.category === "banner" ? (
                <img
                  src={previewSlide.image_url}
                  alt={previewSlide.title}
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                <>
                  <img
                    src={previewSlide.image_url}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 size-full object-cover blur-2xl scale-110 opacity-35"
                  />
                  <img
                    src={previewSlide.image_url}
                    alt={previewSlide.title}
                    className="relative z-10 max-h-[82%] max-w-[85%] rounded-xl object-contain shadow-2xl ring-1 ring-white/15"
                  />
                </>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent z-10" />
              <div className="absolute inset-x-4 bottom-4 z-20">
                <div className="rounded-2xl bg-slate-950/65 backdrop-blur-md border border-white/15 px-4 py-3 flex items-center justify-between gap-3 shadow-xl">
                  <div className="min-w-0 flex flex-col items-start gap-1">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-300 leading-none">
                      <span className="size-1.5 rounded-full bg-sky-400 shrink-0" />
                      <span>{categoryMeta[previewSlide.category].label}</span>
                    </span>
                    <p className="text-sm font-bold text-white leading-snug text-left truncate max-w-full">
                      {previewSlide.title}
                    </p>
                    {previewSlide.subtitle ? (
                      <p className="text-xs text-white/80 line-clamp-1 text-left">
                        {previewSlide.subtitle}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="relative size-full flex flex-col items-center justify-center text-center px-6">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0f_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0f_1px,transparent_1px)] bg-[size:36px_36px]" />
              <SparklesIcon className="size-7 text-sky-400/80 mb-2 relative z-10" />
              <p className="text-sm font-semibold text-white relative z-10">
                {t("settings:login_media.preview_empty_title")}
              </p>
              <p className="text-xs text-white/70 mt-1 max-w-md relative z-10">
                {t("settings:login_media.preview_empty_desc")}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
