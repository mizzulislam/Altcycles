import * as React from "react";
import { Loader2Icon, PlusIcon, SaveIcon, Trash2Icon } from "lucide-react";
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
import { SOCIAL_PLATFORM_OPTIONS } from "@/lib/asset-utils";
import { useLanguage } from "@/lib/i18n";
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
          <Button
            type="button"
            onClick={onAddSlot}
            className="shrink-0 h-9 rounded-xl px-4 text-xs sm:text-sm font-semibold cursor-pointer"
          >
            <PlusIcon data-icon="inline-start" />
            {t("settings:company.add_social_btn", "Tambah Sosial Media")}
          </Button>
        }
      />
      <CardContent className="pt-5">
        <form onSubmit={onSave} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {socials.map((entry, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3"
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
