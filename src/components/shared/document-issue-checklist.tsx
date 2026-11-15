import * as React from "react";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ShieldCheckIcon,
} from "lucide-react";
import type { ChecklistItem } from "@/lib/document-checklist";

export function DocumentIssueChecklistCard({
  items,
  title = "Checklist Validasi Sebelum Terbit (Standar Altvira)",
}: {
  items: ChecklistItem[];
  title?: string;
}) {
  const passedCount = items.filter((i) => i.passed).length;
  const allPassed = passedCount === items.length;

  return (
    <div
      className={`rounded-xl border p-3.5 transition-all ${
        allPassed
          ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10"
          : "border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10"
      }`}
    >
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheckIcon
            className={`size-4 shrink-0 ${
              allPassed
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400"
            }`}
          />
          <span className="text-xs font-semibold text-foreground truncate">
            {title}
          </span>
        </div>
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 tabular-nums ${
            allPassed
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
          }`}
        >
          {passedCount} / {items.length} Lengkap
        </span>
      </div>

      <div className="grid gap-2 pt-2.5">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-2 text-xs">
            {item.passed ? (
              <CheckCircle2Icon className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircleIcon className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <span
                className={
                  item.passed
                    ? "text-foreground"
                    : "text-amber-900 dark:text-amber-200 font-medium"
                }
              >
                {item.label}
              </span>
              {!item.passed && item.message && (
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
                  {item.message}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
