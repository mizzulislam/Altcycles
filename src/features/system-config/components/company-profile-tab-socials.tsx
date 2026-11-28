import * as React from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { SocialPlatformIcon } from "@/components/shared/social-platform-icon";
import { TOOLBAR_BUTTON_CLASS } from "@/components/shared/toolbar-button";
import { SOCIAL_PLATFORM_OPTIONS } from "@/lib/asset-utils";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { CompanyProfileRow, SocialMediaEntry } from "@/types/database.types";

interface CompanyProfileTabSocialsProps {
  socials: SocialMediaEntry[];
  setSocials: React.Dispatch<React.SetStateAction<SocialMediaEntry[]>>;
  company: CompanyProfileRow;
  saving: boolean;
  onAddSlot: () => void;
  onRemoveSlot: (idx: number) => void;
  onSave: (e: React.FormEvent) => Promise<void>;
}

export function CompanyProfileTabSocials({
  socials,
  setSocials,
  company,
  saving,
  onAddSlot,
  onRemoveSlot,
  onSave,
}: CompanyProfileTabSocialsProps) {
  const { t } = useLanguage();
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [startX, setStartX] = React.useState(0);
  const [scrollLeftState, setScrollLeftState] = React.useState(0);
  const prevSocialsCount = React.useRef(socials.length);

  const checkScroll = React.useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  React.useEffect(() => {
    checkScroll();
    const timer = setTimeout(checkScroll, 100);
    const el = scrollContainerRef.current;
    if (!el) return;

    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);

    const onWheelNative = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (e.deltaY !== 0 && !e.shiftKey) {
        const isAtLeft = el.scrollLeft <= 0 && e.deltaY < 0;
        const isAtRight =
          el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && e.deltaY > 0;
        if (!isAtLeft && !isAtRight) {
          e.preventDefault();
          el.scrollLeft += e.deltaY;
        }
      }
    };

    el.addEventListener("wheel", onWheelNative, { passive: false });

    return () => {
      clearTimeout(timer);
      el.removeEventListener("scroll", checkScroll);
      el.removeEventListener("wheel", onWheelNative);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, socials.length]);

  // Auto-scroll ke kartu baru ketika slot sosial media ditambahkan
  React.useEffect(() => {
    if (socials.length > prevSocialsCount.current) {
      const timer = setTimeout(() => {
        const el = scrollContainerRef.current;
        if (el) {
          if (typeof el.scrollTo === "function") {
            el.scrollTo({
              left: el.scrollWidth,
              behavior: "smooth",
            });
          } else {
            el.scrollLeft = el.scrollWidth;
          }
          checkScroll();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
    prevSocialsCount.current = socials.length;
  }, [socials.length, checkScroll]);

  const slideLeft = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (typeof el.scrollBy === "function") {
      el.scrollBy({ left: -340, behavior: "smooth" });
    } else {
      el.scrollLeft -= 340;
    }
  };

  const slideRight = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (typeof el.scrollBy === "function") {
      el.scrollBy({ left: 340, behavior: "smooth" });
    } else {
      el.scrollLeft += 340;
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest(
        "input, select, button, [role='combobox'], [data-radix-focus-guard]",
      )
    ) {
      return;
    }
    setIsDragging(true);
    setStartX(e.pageX - (scrollContainerRef.current?.offsetLeft || 0));
    setScrollLeftState(scrollContainerRef.current?.scrollLeft || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - (scrollContainerRef.current.offsetLeft || 0);
    const walk = (x - startX) * 1.2;
    scrollContainerRef.current.scrollLeft = scrollLeftState - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <Card>
      <CardHeaderWithInfo
        title={t("settings:company.social_accounts_title", {
          count: socials.length,
          defaultValue: `Akun Sosial Media Footer Dokumen (${socials.length})`,
        })}
        description={t(
          "settings:company.social_accounts_desc",
          "Ikon platform beserta username di bawah ini otomatis disematkan pada footer setiap dokumen PDF & Word yang diterbitkan sistem.",
        )}
        action={
          <div className="flex items-center gap-2">
            {(canScrollLeft || canScrollRight) && (
              <div className="flex items-center gap-1">
                <ActionTooltip
                  content={t("settings:company.slide_left", "Geser ke Kiri")}
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={!canScrollLeft}
                    onClick={slideLeft}
                    className="size-9 rounded-xl shrink-0 cursor-pointer shadow-2xs border-border/80 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label={t("settings:company.slide_left", "Geser ke Kiri")}
                  >
                    <ChevronLeftIcon className="size-4 text-foreground" />
                    <span className="sr-only">
                      {t("settings:company.slide_left", "Geser ke Kiri")}
                    </span>
                  </Button>
                </ActionTooltip>
                <ActionTooltip
                  content={t("settings:company.slide_right", "Geser ke Kanan")}
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={!canScrollRight}
                    onClick={slideRight}
                    className="size-9 rounded-xl shrink-0 cursor-pointer shadow-2xs border-border/80 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label={t("settings:company.slide_right", "Geser ke Kanan")}
                  >
                    <ChevronRightIcon className="size-4 text-foreground" />
                    <span className="sr-only">
                      {t("settings:company.slide_right", "Geser ke Kanan")}
                    </span>
                  </Button>
                </ActionTooltip>
              </div>
            )}
            <ActionTooltip
              content={t("settings:company.add_social_btn", "Tambah Sosial Media")}
            >
              <Button
                type="button"
                onClick={onAddSlot}
                className={cn(
                  TOOLBAR_BUTTON_CLASS,
                  "cursor-pointer",
                )}
                aria-label={t("settings:company.add_social_btn", "Tambah Sosial Media")}
              >
                <PlusIcon className="size-4 shrink-0 text-primary-foreground" />
                <span className="sr-only">
                  {t("settings:company.add_social_btn", "Tambah Sosial Media")}
                </span>
              </Button>
            </ActionTooltip>
          </div>
        }
      />
      <CardContent className="pt-5">
        <form onSubmit={onSave} className="space-y-5">
          <div className="relative">
            <div
              ref={scrollContainerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={`flex items-stretch gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth snap-x snap-mandatory modal-sleek-scrollbar focus:outline-hidden ${
                isDragging ? "cursor-grabbing select-none" : "cursor-grab"
              }`}
            >
              {socials.map((entry, idx) => (
                <div
                  key={idx}
                  className="w-[280px] sm:w-[320px] md:w-[340px] shrink-0 snap-start rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                      <SocialPlatformIcon
                        platform={entry.platform}
                        className="size-4 text-primary"
                      />
                      <span>
                        {t("settings:company.social_slot_title", {
                          index: idx + 1,
                          defaultValue: `Sosial Media #${idx + 1}`,
                        })}
                      </span>
                    </div>
                    {socials.length > 1 && (
                      <ActionTooltip
                        content={t(
                          "settings:company.remove_social_tooltip",
                          "Hapus sosial media ini",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => onRemoveSlot(idx)}
                          className="size-7 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        >
                          <Trash2Icon className="size-3.5" />
                          <span className="sr-only">
                            {t(
                              "settings:company.remove_social_sr",
                              "Hapus Sosial Media",
                            )}
                          </span>
                        </button>
                      </ActionTooltip>
                    )}
                  </div>

                  <Field>
                    <FieldLabel className="text-[11px] font-semibold">
                      {t("settings:company.platform", "Platform")}
                    </FieldLabel>
                    <Select
                      value={entry.platform}
                      onValueChange={(val) =>
                        setSocials((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, platform: val } : item,
                          ),
                        )
                      }
                    >
                      <SelectTrigger className="h-9 text-xs bg-background">
                        <SelectValue>
                          <span className="inline-flex items-center gap-2">
                            <SocialPlatformIcon
                              platform={entry.platform}
                              className="size-3.5 text-primary"
                            />
                            <span>{entry.platform}</span>
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {SOCIAL_PLATFORM_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              <span className="inline-flex items-center gap-2">
                                <SocialPlatformIcon
                                  platform={opt}
                                  className="size-3.5 text-primary"
                                />
                                <span>{opt}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel className="text-[11px] font-semibold">
                      {t("settings:company.username", "Username / Handle")}
                    </FieldLabel>
                    <Input
                      value={entry.username}
                      onChange={(e) =>
                        setSocials((prev) =>
                          prev.map((item, i) =>
                            i === idx
                              ? { ...item, username: e.target.value }
                              : item,
                          ),
                        )
                      }
                      placeholder={t(
                        "settings:company.handle_placeholder",
                        "Contoh: @altvira.tech",
                      )}
                      className="h-9 text-xs bg-background"
                    />
                  </Field>

                  <Field>
                    <FieldLabel className="text-[11px] font-semibold">
                      {t("settings:company.website", "Tautan / URL Profil")}
                    </FieldLabel>
                    <Input
                      value={entry.url ?? ""}
                      onChange={(e) =>
                        setSocials((prev) =>
                          prev.map((item, i) =>
                            i === idx
                              ? { ...item, url: e.target.value }
                              : item,
                          ),
                        )
                      }
                      placeholder={t(
                        "settings:company.url_placeholder",
                        "Contoh: https://instagram.com/altvira.tech",
                      )}
                      className="h-9 text-xs bg-background"
                    />
                  </Field>
                </div>
              ))}
            </div>
          </div>

          {/* Live Preview Footer Dokumen */}
          <div className="rounded-xl border border-border/70 bg-background/60 p-4 space-y-2.5">
            <p className="text-[11px] font-semibold text-muted-foreground">
              {t(
                "settings:company.preview_footer_title",
                "Pratinjau Footer Pada Dokumen PDF & Word:",
              )}
            </p>
            <div className="border-t border-border/80 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span className="font-semibold text-primary">
                {company.company_name}
              </span>
              <div className="flex flex-wrap items-center gap-4">
                {socials
                  .filter((s) => s.username.trim())
                  .map((s, idx) => (
                    <span
                      key={idx}
                      title={s.platform}
                      className="inline-flex items-center gap-1.5 text-foreground font-medium"
                    >
                      <SocialPlatformIcon
                        platform={s.platform}
                        className="size-3.5 text-primary"
                      />
                      <span>{s.username}</span>
                    </span>
                  ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-border/60">
            <Button
              type="submit"
              disabled={saving}
              className="h-9 text-xs rounded-2xl gap-2 shadow-xs cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2Icon className="size-3.5 animate-spin" />
                  <span>{t("common:action.loading", "Menyimpan...")}</span>
                </>
              ) : (
                <>
                  <SaveIcon className="size-3.5" />
                  <span>
                    {t(
                      "settings:company.btn_save_social",
                      "Simpan Sosial Media Footer",
                    )}
                  </span>
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
