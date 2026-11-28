import type { Dispatch, SetStateAction } from "react";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { NumberInput } from "@/components/ui/number-input";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/lib/i18n";
import type { CompanyProfileRow } from "@/types/database.types";

interface SystemConfigTabTaxProps {
  company: CompanyProfileRow;
  setCompany: Dispatch<SetStateAction<CompanyProfileRow | null>>;
  onOpenPkpConfirm: (checked: boolean) => void;
}

export function SystemConfigTabTax({
  company,
  setCompany,
  onOpenPkpConfirm,
}: SystemConfigTabTaxProps) {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeaderWithInfo
        title={t("settings:company.tax_card_title")}
        description={t("settings:company.tax_card_desc")}
      />
      <CardContent className="flex flex-col gap-5">
        <Alert variant={company.pkp_enabled ? "warning" : "info"}>
          <AlertTitle>
            {company.pkp_enabled
              ? t("settings:company.badge_pkp_active", { rate: company.ppn_rate })
              : t("settings:company.badge_non_pkp")}
          </AlertTitle>
          <AlertDescription>
            {company.pkp_enabled
              ? t("settings:company.pkp_desc_active", { rate: company.ppn_rate })
              : t("settings:company.pkp_desc_inactive")}
          </AlertDescription>
        </Alert>

        <FieldSet>
          <FieldLegend>{t("settings:company.tax_pkp_title")}</FieldLegend>
          <Field orientation="horizontal">
            <div className="flex flex-col gap-0.5">
              <FieldLabel htmlFor="sw-pkp">
                {t("settings:company.enable_pkp_label")}
              </FieldLabel>
              <FieldDescription>
                {t("settings:company.enable_pkp_desc", { name: company.company_name })}
              </FieldDescription>
            </div>
            <Switch
              id="sw-pkp"
              checked={company.pkp_enabled}
              onCheckedChange={onOpenPkpConfirm}
            />
          </Field>

          <Field className="max-w-xs" data-disabled={!company.pkp_enabled}>
            <FieldLabel htmlFor="ppn-rate">
              {t("settings:company.default_vat_rate")}
            </FieldLabel>
            <NumberInput
              id="ppn-rate"
              allowDecimal
              maxDecimals={2}
              min={0}
              max={100}
              disabled={!company.pkp_enabled}
              value={company.ppn_rate}
              onValueChange={(ppn_rate) =>
                setCompany((prev) =>
                  prev ? { ...prev, ppn_rate } : prev,
                )
              }
            />
          </Field>
        </FieldSet>
      </CardContent>
    </Card>
  );
}
