import * as React from "react";
import { InfoIcon } from "lucide-react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { useGameDialog } from "@/components/shared/game-dialog";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface CardHeaderTitleWithInfoProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  infoAriaLabel?: string;
}

export function CardHeaderTitleWithInfo({
  title,
  description,
  className,
  titleClassName,
  infoAriaLabel,
}: CardHeaderTitleWithInfoProps) {
  const { openGameDialog } = useGameDialog();
  const { t } = useLanguage();
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  const titleString = typeof title === "string" ? title : "";
  const ariaLabel =
    infoAriaLabel ||
    t("card_info", {
      title: titleString || t("card_info_generic", "Kartu"),
      defaultValue: titleString ? `Informasi: ${titleString}` : "Informasi kartu",
    });

  const hasDescription =
    Boolean(description) &&
    (typeof description !== "string" || description.trim().length > 0);

  const handleOpenDialog = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasDescription) return;
    openGameDialog({
      title,
      description,
      triggerRef,
    });
  };

  return (
    <div className={cn("flex items-center gap-2 min-w-0 flex-1", className)}>
      <CardTitle
        className={cn(
          "font-bold tracking-tight text-foreground truncate min-w-0 py-0 m-0 leading-tight sm:leading-snug",
          titleClassName || "text-base sm:text-lg",
        )}
      >
        {title}
      </CardTitle>
      {hasDescription ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={handleOpenDialog}
          aria-label={ariaLabel}
          className="inline-flex size-6 items-center justify-center p-0 m-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
        >
          <InfoIcon className="size-4 shrink-0 block" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

export interface CardHeaderWithInfoProps extends CardHeaderTitleWithInfoProps {
  controls?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  headerClassName?: string;
}

export function CardHeaderWithInfo({
  title,
  description,
  controls,
  action,
  children,
  className,
  titleClassName,
  infoAriaLabel,
  headerClassName,
}: CardHeaderWithInfoProps) {
  const rightSlot = action ?? controls;

  return (
    <CardHeader
      className={cn(
        "px-6 py-4 border-b border-border/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-h-[68px]",
        headerClassName || className,
      )}
    >
      <CardHeaderTitleWithInfo
        title={title}
        description={description}
        titleClassName={titleClassName}
        infoAriaLabel={infoAriaLabel}
      />
      {rightSlot ? (
        <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
          {rightSlot}
        </div>
      ) : null}
      {children}
    </CardHeader>
  );
}
