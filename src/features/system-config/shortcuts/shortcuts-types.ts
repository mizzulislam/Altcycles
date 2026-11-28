import type { UserRole } from "@/types/database.types";

export type ShortcutSortOption = "default" | "name_asc" | "name_desc" | "group" | "status";

export function getRoleBadgeClass(role: UserRole) {
  switch (role) {
    case "super_admin":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
    case "admin":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    case "user":
      return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30";
    default:
      return "bg-muted/50 text-muted-foreground border-border/70";
  }
}
