import type { Dispatch, FormEvent, SetStateAction } from "react";
import { SaveIcon } from "lucide-react";
import { CardHeaderWithInfo } from "@/components/shared/card-header-with-info";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/empty";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/i18n";
import type { CompanyProfileRow } from "@/types/database.types";

interface SystemConfigTabIdentityProps {
  company: CompanyProfileRow;
  setCompany: Dispatch<SetStateAction<CompanyProfileRow | null>>;
  onSave: (e: FormEvent) => Promise<void>;
  saving: boolean;
}

export function SystemConfigTabIdentity({
  company,
  setCompany,
  onSave,
  saving,
}: SystemConfigTabIdentityProps) {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeaderWithInfo
        title={t("settings:company.identity_card_title")}
        description={t("settings:company.identity_card_desc")}
      />
      <CardContent>
        <form onSubmit={onSave}>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="cp-name" required>
                  {t("settings:company.name")}
                </FieldLabel>
                <Input
                  id="cp-name"
                  required
                  value={company.company_name}
                  onChange={(e) =>
                    setCompany((prev) =>
                      prev ? { ...prev, company_name: e.target.value } : prev,
                    )
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="cp-legal" required>
                  {t("settings:company.brand_name")}
                </FieldLabel>
                <Input
                  id="cp-legal"
                  required
                  value={company.legal_entity_name}
                  onChange={(e) =>
                    setCompany((prev) =>
                      prev
                        ? { ...prev, legal_entity_name: e.target.value }
                        : prev,
                    )
                  }
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="cp-addr" required>
                {t("settings:company.address")}
              </FieldLabel>
              <Textarea
                id="cp-addr"
                required
                value={company.address}
                onChange={(e) =>
                  setCompany((prev) =>
                    prev ? { ...prev, address: e.target.value } : prev,
                  )
                }
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="cp-email" required>
                  {t("settings:company.email")}
                </FieldLabel>
                <Input
                  id="cp-email"
                  type="email"
                  required
                  value={company.email}
                  onChange={(e) =>
                    setCompany((prev) =>
                      prev ? { ...prev, email: e.target.value } : prev,
                    )
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="cp-phone" required>
                  {t("settings:company.phone")}
                </FieldLabel>
                <Input
                  id="cp-phone"
                  required
                  value={company.phone}
                  onChange={(e) =>
                    setCompany((prev) =>
                      prev ? { ...prev, phone: e.target.value } : prev,
                    )
                  }
                />
              </Field>
            </div>

            <FieldSet>
              <FieldLegend>{t("settings:company.accounts_card_title")}</FieldLegend>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="cp-bank" required>
                    {t("settings:company.bank_name")}
                  </FieldLabel>
                  <Input
                    id="cp-bank"
                    required
                    value={company.bank_name}
                    onChange={(e) =>
                      setCompany((prev) =>
                        prev ? { ...prev, bank_name: e.target.value } : prev,
                      )
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="cp-accno" required>
                    {t("settings:company.bank_account_number")}
                  </FieldLabel>
                  <Input
                    id="cp-accno"
                    required
                    value={company.bank_account_number}
                    onChange={(e) =>
                      setCompany((prev) =>
                        prev
                          ? { ...prev, bank_account_number: e.target.value }
                          : prev,
                      )
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="cp-holder" required>
                    {t("settings:company.bank_account_holder")}
                  </FieldLabel>
                  <Input
                    id="cp-holder"
                    required
                    value={company.bank_account_holder}
                    onChange={(e) =>
                      setCompany((prev) =>
                        prev
                          ? { ...prev, bank_account_holder: e.target.value }
                          : prev,
                      )
                    }
                  />
                </Field>
              </div>
            </FieldSet>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="cp-signer" required>
                  {t("settings:company.default_signer_name")}
                </FieldLabel>
                <Input
                  id="cp-signer"
                  required
                  value={company.signer_name}
                  onChange={(e) =>
                    setCompany((prev) =>
                      prev ? { ...prev, signer_name: e.target.value } : prev,
                    )
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="cp-title" required>
                  {t("settings:company.signer_title")}
                </FieldLabel>
                <Input
                  id="cp-title"
                  required
                  value={company.signer_title}
                  onChange={(e) =>
                    setCompany((prev) =>
                      prev ? { ...prev, signer_title: e.target.value } : prev,
                    )
                  }
                />
              </Field>
            </div>

            <div>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <SaveIcon data-icon="inline-start" />
                )}
                {t("common:action.save")}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
