export const PROJECT_STATUS_LABELS: Record<
  string,
  { label: string; tone: "success" | "info" | "warning" | "secondary" }
> = {
  active: { label: "Aktif", tone: "success" },
  completed: { label: "Selesai", tone: "info" },
  on_hold: { label: "Ditunda", tone: "warning" },
};
