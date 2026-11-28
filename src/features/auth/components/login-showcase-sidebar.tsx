import { ChevronLeftIcon, ChevronRightIcon, ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import type { LoginMediaItemRow } from "@/types/database.types";

export interface LoginShowcaseSidebarProps {
  bannerSrc?: string;
  mediaSlides: LoginMediaItemRow[];
  mediaLoading: boolean;
  safeSlideIndex: number;
  setActiveSlideIndex: React.Dispatch<React.SetStateAction<number>>;
  setIsBannerHovered: (hovered: boolean) => void;
  currentMedia: LoginMediaItemRow | null;
  loadedSlideIds: Record<string, boolean>;
  failedSlideIds: Record<string, boolean>;
  markSlideLoaded: (id: string) => void;
  markSlideFailed: (id: string) => void;
}

const DISPLAY_CATEGORY_LABELS = {
  banner: "Banner Utama",
  flyer: "Flyer Promosi",
  medsos: "Konten Medsos",
} as const;

export function LoginShowcaseSidebar({
  bannerSrc,
  mediaSlides,
  mediaLoading,
  safeSlideIndex,
  setActiveSlideIndex,
  setIsBannerHovered,
  currentMedia,
  loadedSlideIds,
  failedSlideIds,
  markSlideLoaded,
  markSlideFailed,
}: LoginShowcaseSidebarProps) {
  const { t } = useLanguage();

  return (
    <div
      className="group relative hidden lg:block w-full h-screen max-h-screen sticky top-0 self-start bg-slate-950 overflow-hidden select-none"
      onMouseEnter={() => setIsBannerHovered(true)}
      onMouseLeave={() => setIsBannerHovered(false)}
    >
      {/* LAYER 1 (BELAKANG): Banner / Flyer / Konten Medsos dari Super Admin */}
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        {mediaSlides.length > 0 ? (
          <div className="relative w-full h-full">
            {mediaSlides.map((slide, idx) => {
              const isSlideActive = idx === safeSlideIndex;
              const isLoaded = Boolean(loadedSlideIds[slide.id]);
              const isFailed = Boolean(failedSlideIds[slide.id]);

              return (
                <div
                  key={slide.id}
                  aria-hidden={!isSlideActive}
                  className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                    isSlideActive
                      ? "opacity-100 z-10"
                      : "opacity-0 z-0 pointer-events-none"
                  }`}
                >
                  {/* Shimmer halus saat gambar slide sedang diunduh/decode */}
                  {!isLoaded && !isFailed && (
                    <div className="absolute inset-0 z-0 bg-slate-950 flex items-center justify-center overflow-hidden">
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:44px_44px]" />
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-sky-500/10 to-slate-950 animate-pulse" />
                    </div>
                  )}

                  {isFailed ? (
                    <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:44px_44px]" />
                      <div className="relative z-10 space-y-2 max-w-sm">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-sky-400">
                          Altcycles ERP
                        </span>
                        <h3 className="text-base font-bold text-white">{slide.title}</h3>
                      </div>
                    </div>
                  ) : slide.category === "banner" ? (
                    <img
                      src={slide.image_url}
                      alt={slide.title}
                      loading={idx === 0 ? "eager" : "lazy"}
                      decoding="async"
                      fetchPriority={idx === 0 ? "high" : "auto"}
                      onLoad={() => markSlideLoaded(slide.id)}
                      onError={() => markSlideFailed(slide.id)}
                      className={`w-full h-full object-cover transition-opacity duration-500 ${
                        isLoaded ? "opacity-100" : "opacity-0"
                      }`}
                    />
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center p-10 bg-slate-950">
                      <img
                        src={slide.image_url}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-35"
                      />
                      <img
                        src={slide.image_url}
                        alt={slide.title}
                        loading={idx === 0 ? "eager" : "lazy"}
                        decoding="async"
                        fetchPriority={idx === 0 ? "high" : "auto"}
                        onLoad={() => markSlideLoaded(slide.id)}
                        onError={() => markSlideFailed(slide.id)}
                        className={`relative z-10 max-h-[78vh] max-w-full rounded-2xl object-contain shadow-2xl ring-1 ring-white/15 transition-opacity duration-500 ${
                          isLoaded ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : mediaLoading ? (
          <div className="w-full h-full relative overflow-hidden bg-slate-950">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:44px_44px]" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-sky-400/10 to-slate-950 animate-pulse" />
          </div>
        ) : bannerSrc ? (
          <img
            src={bannerSrc}
            alt="Banner Informasi Altvira"
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full relative overflow-hidden bg-slate-950">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0f_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0f_1px,transparent_1px)] bg-[size:44px_44px]" />
          </div>
        )}
      </div>

      {/* LAYER 2 (Highlight Gradien Altvira Lembut) */}
      <div
        className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-br from-primary via-sky-400 to-primary opacity-15"
        aria-hidden="true"
      />

      {/* Overlay Informasi Judul, Tautan, & Kontrol Carousel jika Media Aktif */}
      {currentMedia ? (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-48 z-15 bg-gradient-to-t from-black/75 via-black/30 to-transparent"
            aria-hidden="true"
          />
          <div className="absolute inset-x-6 bottom-6 z-20">
            <div className="rounded-2xl bg-slate-950/65 backdrop-blur-md border border-white/15 px-5 py-4 flex items-center justify-between gap-4 shadow-2xl">
              <div className="min-w-0 flex flex-col items-start gap-1">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-300 leading-none">
                  <span className="size-1.5 rounded-full bg-sky-400 shrink-0" />
                  <span>{DISPLAY_CATEGORY_LABELS[currentMedia.category]}</span>
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white leading-snug text-left">
                  {currentMedia.title}
                </h3>
                {currentMedia.subtitle ? (
                  <p className="text-xs text-white/80 line-clamp-2 max-w-md leading-relaxed text-left">
                    {currentMedia.subtitle}
                  </p>
                ) : null}
              </div>

              {currentMedia.link_url ? (
                <a
                  href={currentMedia.link_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 px-4 text-xs sm:text-sm font-semibold transition-colors shrink-0"
                >
                  <span>{t("common:action.view", "Selengkapnya")}</span>
                  <ExternalLinkIcon className="size-3.5 shrink-0" />
                </a>
              ) : null}
            </div>
          </div>

          {mediaSlides.length > 1 ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  setActiveSlideIndex(
                    (prev) =>
                      (prev - 1 + mediaSlides.length) % mediaSlides.length,
                  )
                }
                aria-label={t("common:table.previous_page", "Banner sebelumnya")}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 size-9 rounded-xl bg-black/35 hover:bg-black/55 text-white backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-0"
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  setActiveSlideIndex(
                    (prev) => (prev + 1) % mediaSlides.length,
                  )
                }
                aria-label={t("common:table.next_page", "Banner berikutnya")}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 size-9 rounded-xl bg-black/35 hover:bg-black/55 text-white backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-0"
              >
                <ChevronRightIcon className="size-4" />
              </Button>
              <div className="absolute top-6 left-8 z-20 flex items-center gap-1.5">
                {mediaSlides.map((slide, idx) => (
                  <Button
                    key={slide.id}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveSlideIndex(idx)}
                    aria-label={`${t("common:action.view", "Slide")} ${idx + 1}`}
                    className={`h-1.5 p-0 rounded-full transition-all cursor-pointer border-0 ${
                      idx === safeSlideIndex
                        ? "w-6 bg-white"
                        : "w-2 bg-white/40 hover:bg-white/70"
                    }`}
                  />
                ))}
              </div>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
