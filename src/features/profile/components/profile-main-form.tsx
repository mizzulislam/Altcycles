import * as React from "react";
import {
  Loader2Icon,
  PencilIcon,
  SaveIcon,
  Trash2Icon,
  UploadCloudIcon,
} from "lucide-react";
import { ActionTooltip } from "@/components/ui/action-tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ROLE_LABELS } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import type { ProfileRow } from "@/types/database.types";

interface ProfileMainFormProps {
  profile: ProfileRow;
  fullName: string;
  setFullName: (val: string) => void;
  username: string;
  setUsername: (val: string) => void;
  bio: string;
  setBio: (val: string) => void;
  avatarUrl: string;
  isUploadingAvatar: boolean;
  isSavingProfile: boolean;
  onOpenUploadDialog: () => void;
  onRemoveAvatar: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ProfileMainForm({
  profile,
  fullName,
  setFullName,
  username,
  setUsername,
  bio,
  setBio,
  avatarUrl,
  isUploadingAvatar,
  isSavingProfile,
  onOpenUploadDialog,
  onRemoveAvatar,
  onSubmit,
}: ProfileMainFormProps) {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeaderWithInfo
        title={t("settings:profile.card_profile_title")}
        description={t("settings:profile.card_profile_desc")}
      />
      <CardContent className="pt-5 space-y-6">
        <form onSubmit={onSubmit} className="space-y-5">
          {/* Baris 1: Grid 2-Kolom (Kolom Kiri: Box Upload Foto Diri | Kolom Kanan: Tentang Saya) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Kolom Kiri: Box Upload Foto Diri */}
            <div className="p-4 rounded-xl bg-muted/20 border border-border/60 flex flex-col justify-between gap-2.5">
              <FieldLabel className="text-xs font-semibold">
                {t("settings:profile.photo_label")}
              </FieldLabel>

              {avatarUrl ? (
                <div className="group relative w-full h-[96px] rounded-2xl overflow-hidden border border-border/80 shadow-xs bg-muted">
                  <img
                    src={avatarUrl}
                    alt={t("settings:profile.photo_label")}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Overlay Hover Gelap Tipis dengan Icon Button Ganti & Hapus */}
                  <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-3">
                    <ActionTooltip
                      content={t("settings:profile.photo_change_tooltip")}
                      side="top"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenUploadDialog();
                        }}
                        disabled={isUploadingAvatar}
                        aria-label={t("settings:profile.photo_change_aria")}
                        className="size-9 rounded-xl bg-white/20 hover:bg-white/35 text-white backdrop-blur-md border border-white/30 flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                      >
                        <PencilIcon className="size-4" />
                      </button>
                    </ActionTooltip>

                    <ActionTooltip
                      content={t("settings:profile.photo_delete_tooltip")}
                      side="top"
                    >
                      <button
                        type="button"
                        onClick={onRemoveAvatar}
                        disabled={isUploadingAvatar}
                        aria-label={t("settings:profile.photo_delete_aria")}
                        className="size-9 rounded-xl bg-destructive/80 hover:bg-destructive text-white backdrop-blur-md border border-white/30 flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                      >
                        <Trash2Icon className="size-4" />
                      </button>
                    </ActionTooltip>
                  </div>

                  {/* Spinner Loading saat Proses Upload/Hapus */}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white z-10">
                      <Loader2Icon className="size-6 animate-spin" />
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onOpenUploadDialog}
                  disabled={isUploadingAvatar}
                  className="group relative w-full h-[96px] rounded-2xl border-2 border-dashed border-border/80 hover:border-primary/60 dark:border-border/60 dark:hover:border-primary/50 bg-card/60 hover:bg-muted/40 transition-all cursor-pointer flex flex-col items-center justify-center p-3 text-center overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="size-8 rounded-full bg-primary/10 text-primary dark:bg-primary/20 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                    <UploadCloudIcon className="size-4.5" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">
                    {t("settings:profile.photo_upload_btn")}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {t("settings:profile.photo_upload_hint")}
                  </p>
                </button>
              )}
            </div>

            {/* Kolom Kanan: Tentang Saya */}
            <div className="p-4 rounded-xl bg-muted/20 border border-border/60 flex flex-col justify-between gap-2.5">
              <FieldLabel className="text-xs font-semibold">
                {t("settings:profile.about_me")}
              </FieldLabel>
              <div className="flex flex-col justify-between h-[96px]">
                <Textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t("settings:profile.about_me_ph")}
                  className="text-xs resize-none h-[60px] min-h-[60px] bg-background"
                />
                <p className="text-[11px] text-muted-foreground leading-normal truncate">
                  {t("settings:profile.about_me_desc")}
                </p>
              </div>
            </div>
          </div>

          {/* Grid 2-Kolom: Nama Lengkap & Username */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field>
              <FieldLabel required className="text-xs font-semibold">
                {t("settings:profile.full_name")}
              </FieldLabel>
              <Input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("settings:profile.full_name_ph")}
                className="text-xs h-9"
              />
              <FieldDescription className="text-[11px]">
                {t("settings:profile.full_name_desc")}
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel required className="text-xs font-semibold">
                {t("settings:profile.username")}
              </FieldLabel>
              <Input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("settings:profile.username_ph")}
                className="text-xs h-9"
              />
              <FieldDescription className="text-[11px]">
                {t("settings:profile.username_desc")}
              </FieldDescription>
            </Field>
          </div>

          {/* Grid 2-Kolom: Email Akun & Status Hak Akses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel className="text-xs font-semibold">
                  {t("settings:profile.email")}
                </FieldLabel>
                <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                  {t("settings:profile.email_readonly")}
                </span>
              </div>
              <Input
                type="email"
                disabled
                value={profile.email}
                onMouseDown={(e) => e.preventDefault()}
                onFocus={(e) => e.currentTarget.blur()}
                className="text-xs h-9 bg-muted/40 cursor-not-allowed select-none caret-transparent opacity-90 disabled:opacity-90 disabled:cursor-not-allowed"
              />
              <FieldDescription className="text-[11px]">
                {t("settings:profile.email_desc")}
              </FieldDescription>
            </Field>

            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel className="text-xs font-semibold">
                  {t("settings:profile.current_role")}
                </FieldLabel>
                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  {t("settings:profile.role_auth_system")}
                </span>
              </div>
              <Input
                type="text"
                disabled
                value={
                  t(`common:role.${profile.role}`) ||
                  (ROLE_LABELS as Record<string, string>)[profile.role] ||
                  profile.role
                }
                onMouseDown={(e) => e.preventDefault()}
                onFocus={(e) => e.currentTarget.blur()}
                className="text-xs h-9 bg-muted/40 cursor-not-allowed select-none caret-transparent opacity-90 disabled:opacity-90 disabled:cursor-not-allowed"
              />
              <FieldDescription className="text-[11px]">
                {t("settings:profile.current_role_desc")}
              </FieldDescription>
            </Field>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isSavingProfile || isUploadingAvatar}
              className="h-9 text-xs rounded-2xl gap-2 shadow-xs cursor-pointer max-sm:w-full"
            >
              {isSavingProfile ? (
                <>
                  <Loader2Icon className="size-3.5 animate-spin" />
                  <span>{t("settings:profile.btn_saving")}</span>
                </>
              ) : (
                <>
                  <SaveIcon className="size-3.5" />
                  <span>{t("settings:profile.btn_save_profile")}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
