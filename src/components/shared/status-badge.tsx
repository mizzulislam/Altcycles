import { Badge, type BadgeProps } from "@/components/ui/badge";

export type SemanticTone =
  | "success"
  | "warning"
  | "destructive"
  | "info"
  | "secondary"
  | "outline";

export function StatusBadge({
  tone,
  label,
}: {
  tone: SemanticTone;
  label: string;
}) {
  const variantMap: Record<SemanticTone, BadgeProps["variant"]> = {
    success: "success",
    warning: "warning",
    destructive: "destructive",
    info: "info",
    secondary: "secondary",
    outline: "outline",
  };

  return (
    <Badge variant={variantMap[tone]}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      <span>{label}</span>
    </Badge>
  );
}

