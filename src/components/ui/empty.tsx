import * as React from "react";
import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2Icon className={cn("size-4 animate-spin", className)} />;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 sm:p-10 text-center [table_&]:sticky [table_&]:left-0 [table_&]:max-w-[calc(100cqw-1.5rem)] sm:[table_&]:max-w-full">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="max-w-md text-xs text-muted-foreground">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

