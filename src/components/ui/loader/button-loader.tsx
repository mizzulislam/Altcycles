import * as React from "react";
import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonLoaderProps {
  className?: string;
}

export function ButtonLoader({ className }: ButtonLoaderProps) {
  return (
    <Loader2Icon
      aria-hidden="true"
      className={cn("size-4 animate-spin motion-reduce:animate-none shrink-0", className)}
    />
  );
}
