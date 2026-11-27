import * as React from "react";
import { Trans } from "react-i18next";
import {
  CheckCircle2Icon,
  FileSignatureIcon,
  Loader2Icon,
  PencilIcon,
  SaveIcon,
  Trash2Icon,
  UploadCloudIcon,
  UserCheckIcon,
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
import { ROLE_LABELS } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import type { UserRole } from "@/types/database.types";

interface ProfilePersonalFormProps {
  phoneNumber: string;
  setPhoneNumber: (val: string) => void;
  jobTitle: string;
  setJobTitle: (val: string) => void;
  signatureUrl: string;
  isUploadingSignature: boolean;
  isSavingProfile: boolean;
  availableRoles: UserRole[];
  onOpenSignatureDialog: () => void;
  onRemoveSignature: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ProfilePersonalForm({
  phoneNumber,
  setPhoneNumber,
  jobTitle,
  setJobTitle,
  signatureUrl,
  isUploadingSignature,
  isSavingProfile,
  availableRoles,
  onOpenSignatureDialog,
  onRemoveSignature,
  onSubmit,
}: ProfilePersonalFormProps) {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeaderWithInfo
        title={t("settings:profile.card_personal_title")}
        description={t("settings:profile.card_personal_desc")}
      />
      <CardContent className="pt-5 space-y-6">
        <form onSubmit={onSubmit} className="space-y-5">
          {/* Grid 2-Kolom: Nomor Telepon & Jabatan Divisi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field>
              <FieldLabel className="text-xs font-semibold">
                {t("settings:profile.phone_number")}
              </FieldLabel>
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder={t("settings:profile.phone_number_ph")}
                className="text-xs h-9"
              />
              <FieldDescription className="text-[11px]">
                {t("settings:profile.phone_number_desc")}
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel className="text-xs font-semibold">
                {t("settings:profile.job_title")}
              </FieldLabel>
              <Input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder={t("settings:profile.job_title_ph")}
                className="text-xs h-9"
              />
              <FieldDescription className="text-[11px]">
                {t("settings:profile.job_title_desc")}
              </FieldDescription>
            </Field>
          </div>

          {/* Spesimen Tanda Tangan Digital Pengguna untuk Pengesahan Dokumen PDF (Item 4) */}
          <div className="p-4 rounded-xl bg-muted/20 border border-border/70 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileSignatureIcon className="size-4 text-primary" />
                <FieldLabel className="text-xs font-bold text-foreground">
                  {t("settings:profile.signature_label")}
                </FieldLabel>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {t("settings:profile.signature_hint")}
              </span>
            </div>

            {signatureUrl ? (
              <div className="group relative w-full h-[108px] rounded-2xl overflow-hidden border border-border/80 shadow-xs bg-white dark:bg-slate-100 flex items-center justify-center p-3">
                <img
                  src={signatureUrl}
                  alt={t("settings:profile.signature_label")}
                  className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-3">
                  <ActionTooltip
                    content={t("settings:profile.signature_change_tooltip")}
                    side="top"
                  >
                    <button
                      type="button"
                      onClick={onOpenSignatureDialog}
                      disabled={isUploadingSignature}
                      aria-label={t("settings:profile.signature_change_aria")}
                      className="size-9 rounded-xl bg-white/20 hover:bg-white/35 text-white backdrop-blur-md border border-white/30 flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                    >
                      <PencilIcon className="size-4" />
                    </button>
                  </ActionTooltip>

                  <ActionTooltip
                    content={t("settings:profile.signature_delete_tooltip")}
                    side="top"
                  >
                    <button
                      type="button"
                      onClick={onRemoveSignature}
                      disabled={isUploadingSignature}
                      aria-label={t("settings:profile.signature_delete_aria")}
                      className="size-9 rounded-xl bg-destructive/80 hover:bg-destructive text-white backdrop-blur-md border border-white/30 flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  </ActionTooltip>
                </div>

                {isUploadingSignature && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white z-10">
                    <Loader2Icon className="size-6 animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenSignatureDialog}
                disabled={isUploadingSignature}
                className="group relative w-full h-[108px] rounded-2xl border-2 border-dashed border-border/80 hover:border-primary/60 dark:border-border/60 dark:hover:border-primary/50 bg-card/60 hover:bg-muted/40 transition-all cursor-pointer flex flex-col items-center justify-center p-3 text-center overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="size-8 rounded-full bg-primary/10 text-primary dark:bg-primary/20 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <UploadCloudIcon className="size-4.5" />
                </div>
                <p className="text-xs font-semibold text-foreground">
                  {t("settings:profile.signature_upload_btn")}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {t("settings:profile.signature_upload_sub")}
                </p>
              </button>
            )}

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t("settings:profile.signature_desc")}
            </p>
          </div>

          {/* Informasi Peran Aktif & Hak Akses (Lebar Penuh) */}
          <div className="p-4 rounded-xl bg-muted/20 border border-border/70 space-y-3">
            <div className="flex items-center gap-2">
              <UserCheckIcon className="size-4 text-primary" />
              <h4 className="text-xs font-bold text-foreground">
                {t("settings:profile.multi_role_title")}
              </h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <Trans
                i18nKey="settings:profile.multi_role_desc"
                components={[<span key="0" />, <strong key="1" />]}
              />
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {availableRoles.map((role) => (
                <div
                  key={role}
                  className="px-3 py-1.5 rounded-lg border text-xs font-medium bg-card flex items-center gap-2"
                >
                  <CheckCircle2Icon className="size-3.5 text-primary" />
                  <span>
                    {t(`common:role.${role}`) || ROLE_LABELS[role] || role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isSavingProfile || isUploadingSignature}
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
                  <span>{t("settings:profile.btn_save_personal")}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
