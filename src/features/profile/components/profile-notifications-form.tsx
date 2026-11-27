import { Card, CardContent } from "@/components/ui/card";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";

interface ProfileNotificationsFormProps {
  notifPayment: boolean;
  setNotifPayment: (val: boolean) => void;
  notifInvoice: boolean;
  setNotifInvoice: (val: boolean) => void;
  notifClosing: boolean;
  setNotifClosing: (val: boolean) => void;
}

export function ProfileNotificationsForm({
  notifPayment,
  setNotifPayment,
  notifInvoice,
  setNotifInvoice,
  notifClosing,
  setNotifClosing,
}: ProfileNotificationsFormProps) {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeaderWithInfo
        title={t("settings:profile.card_notif_title")}
        description={t("settings:profile.card_notif_desc")}
      />
      <CardContent className="pt-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/70">
            <div className="space-y-0.5 pr-4">
              <p className="text-xs font-bold text-foreground">
                {t("settings:profile.notif_payment_title")}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t("settings:profile.notif_payment_desc")}
              </p>
            </div>
            <Switch
              checked={notifPayment}
              onCheckedChange={(checked) => {
                setNotifPayment(checked);
                toast.success(t("settings:profile.toast_notif_saved"));
              }}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/70">
            <div className="space-y-0.5 pr-4">
              <p className="text-xs font-bold text-foreground">
                {t("settings:profile.notif_invoice_title")}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t("settings:profile.notif_invoice_desc")}
              </p>
            </div>
            <Switch
              checked={notifInvoice}
              onCheckedChange={(checked) => {
                setNotifInvoice(checked);
                toast.success(t("settings:profile.toast_notif_saved"));
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/70">
          <div className="space-y-0.5 pr-4">
            <p className="text-xs font-bold text-foreground">
              {t("settings:profile.notif_closing_title")}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {t("settings:profile.notif_closing_desc")}
            </p>
          </div>
          <Switch
            checked={notifClosing}
            onCheckedChange={(checked) => {
              setNotifClosing(checked);
              toast.success(t("settings:profile.toast_notif_saved"));
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
