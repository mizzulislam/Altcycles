import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonLoaderProps {
  className?: string;
}

/**
 * ButtonLoader Terstandar
 * Spinner inline yang pas di dalam Button (size-3.5 atau size-4)
 */
export function ButtonLoader({ className }: ButtonLoaderProps) {
  return (
    <Loader2Icon
      className={cn("size-3.5 animate-spin motion-reduce:animate-none shrink-0", className)}
      aria-hidden="true"
    />
  );
}
