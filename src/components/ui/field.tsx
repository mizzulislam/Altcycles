import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function FieldGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex min-w-0 flex-col gap-4", className)} {...props} />;
}

interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "vertical" | "horizontal";
}

function Field({
  className,
  orientation = "vertical",
  ...props
}: FieldProps) {
  return (
    <div
      className={cn(
        orientation === "horizontal"
          ? "flex min-w-0 items-center justify-between gap-4"
          : "flex min-w-0 flex-col gap-1.5",
        "data-[invalid=true]:text-destructive data-[disabled=true]:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export interface FieldLabelProps
  extends React.ComponentPropsWithoutRef<typeof Label> {
  required?: boolean;
}

const FieldLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  FieldLabelProps
>(({ className, children, required, ...props }, ref) => (
  <Label ref={ref} className={cn("text-sm font-medium", className)} {...props}>
    {children}
    {required ? (
      <span className="text-destructive ml-1" aria-hidden="true">
        *
      </span>
    ) : null}
  </Label>
));
FieldLabel.displayName = "FieldLabel";

function FieldDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-xs text-muted-foreground leading-relaxed", className)}
      {...props}
    />
  );
}

function FieldSet({
  className,
  ...props
}: React.FieldsetHTMLAttributes<HTMLFieldSetElement>) {
  return (
    <fieldset
      className={cn("flex flex-col gap-3 rounded-lg border p-4", className)}
      {...props}
    />
  );
}

function FieldLegend({
  className,
  ...props
}: React.HTMLAttributes<HTMLLegendElement>) {
  return (
    <legend
      className={cn("px-1 text-sm font-semibold text-foreground", className)}
      {...props}
    />
  );
}

export {
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
  FieldSet,
  FieldLegend,
};

