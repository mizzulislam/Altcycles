import type {
  PaymentRequestStatus,
} from "@/types/database.types";
import type { SemanticTone } from "@/components/shared/status-badge";

export function getPaStatusMeta(
  status: PaymentRequestStatus,
  t: (k: string, fb?: string) => string,
): { label: string; tone: SemanticTone } {
  switch (status) {
    case "draft":
      return { label: t("approvals:status.draft", "Draf"), tone: "secondary" };
    case "submitted":
      return { label: t("approvals:status.submitted", "Menunggu Persetujuan"), tone: "info" };
    case "approved":
      return { label: t("approvals:status.approved", "Disetujui (Siap Cair)"), tone: "warning" };
    case "rejected":
      return { label: t("approvals:status.rejected", "Ditolak"), tone: "destructive" };
    case "paid":
      return { label: t("approvals:status.paid", "Dibayar Lunas"), tone: "success" };
  }
}
