import * as React from "react";
import { Loader2Icon, LockIcon, ShieldAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { useLanguage } from "@/lib/i18n";

interface ProfileSecurityFormProps {
  newPassword: string;
  setNewPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  isSavingPassword: boolean;
  onUpdatePassword: (e: React.FormEvent) => Promise<void>;
}

export function ProfileSecurityForm({
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  isSavingPassword,
  onUpdatePassword,
}: ProfileSecurityFormProps) {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeaderWithInfo
        title={t("settings:profile.card_account_title")}
        description={t("settings:profile.card_account_desc")}
      />
      <CardContent className="pt-5 space-y-6">
        <form onSubmit={onUpdatePassword} className="space-y-5">
          {/* Grid 2-Kolom: Kata Sandi Baru & Konfirmasi Kata Sandi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field>
              <FieldLabel required className="text-xs font-semibold">
                {t("settings:profile.new_password")}
              </FieldLabel>
              <Input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("settings:profile.new_password_ph")}
                className="text-xs h-9"
              />
              <FieldDescription className="text-[11px]">
                {t("settings:profile.new_password_desc")}
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel required className="text-xs font-semibold">
                {t("settings:profile.confirm_password")}
              </FieldLabel>
              <Input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("settings:profile.confirm_password_ph")}
                className="text-xs h-9"
              />
              <FieldDescription className="text-[11px]">
                {t("settings:profile.confirm_password_desc")}
              </FieldDescription>
            </Field>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2.5">
            <ShieldAlertIcon className="size-4 shrink-0 mt-0.5" />
            <span>{t("settings:profile.password_audit_warning")}</span>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isSavingPassword || !newPassword}
              className="h-9 text-xs rounded-2xl gap-2 shadow-xs cursor-pointer"
            >
              {isSavingPassword ? (
                <>
                  <Loader2Icon className="size-3.5 animate-spin" />
                  <span>{t("settings:profile.btn_saving_password")}</span>
                </>
              ) : (
                <>
                  <LockIcon className="size-3.5" />
                  <span>{t("settings:profile.btn_save_password")}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
