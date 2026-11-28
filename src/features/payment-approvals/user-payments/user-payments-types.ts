import type {
  AccountRow,
  PaymentRequestStatus,
} from "@/types/database.types";

export function getPaUserStatusMeta(
  status: PaymentRequestStatus,
  t: (key: string) => string,
): { label: string; tone: "secondary" | "info" | "success" | "destructive" | "warning" } {
  switch (status) {
    case "draft":
      return { label: t("approvals:status.draft"), tone: "secondary" };
    case "submitted":
      return { label: t("approvals:status.submitted"), tone: "info" };
    case "approved":
      return { label: t("approvals:status.approved"), tone: "warning" };
    case "rejected":
      return { label: t("approvals:status.rejected"), tone: "destructive" };
    case "paid":
      return { label: t("approvals:status.paid"), tone: "success" };
  }
}

export const FRIENDLY_EXPENSE_KEYS: Record<string, { labelKey: string; hintKey: string }> = {
  "5-1101": { labelKey: "cat_5_1101_label", hintKey: "cat_5_1101_hint" },
  "5-1201": { labelKey: "cat_5_1201_label", hintKey: "cat_5_1201_hint" },
  "5-1301": { labelKey: "cat_5_1301_label", hintKey: "cat_5_1301_hint" },
  "5-1401": { labelKey: "cat_5_1401_label", hintKey: "cat_5_1401_hint" },
  "6-1101": { labelKey: "cat_6_1101_label", hintKey: "cat_6_1101_hint" },
  "6-1201": { labelKey: "cat_6_1201_label", hintKey: "cat_6_1201_hint" },
  "6-1301": { labelKey: "cat_6_1301_label", hintKey: "cat_6_1301_hint" },
  "6-1401": { labelKey: "cat_6_1401_label", hintKey: "cat_6_1401_hint" },
};

export function getFriendlyExpenseCategory(
  acc: AccountRow,
  t: (key: string) => string,
): {
  label: string;
  hint: string;
} {
  const mapped = FRIENDLY_EXPENSE_KEYS[acc.code];
  if (mapped) {
    return {
      label: t(`approvals:categories.${mapped.labelKey}`),
      hint: t(`approvals:categories.${mapped.hintKey}`),
    };
  }
  const cleanName = acc.name
    .replace(/^Beban\s+/i, "")
    .replace(/\s+Proyek$/i, "")
    .trim();
  return {
    label: cleanName || acc.name,
    hint: acc.description ?? t("approvals:categories.default_hint"),
  };
}
