import type { SemanticTone } from "@/components/shared/status-badge";
import type { ProjectStatus } from "@/types/database.types";

export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; tone: SemanticTone }
> = {
  draft: { label: "Draf", tone: "secondary" },
  active: { label: "Aktif", tone: "success" },
  on_hold: { label: "Ditunda", tone: "warning" },
  completed: { label: "Selesai", tone: "info" },
  cancelled: { label: "Dibatalkan", tone: "destructive" },
};
