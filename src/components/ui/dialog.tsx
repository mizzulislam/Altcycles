import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[100] bg-black/60 dark:bg-white/10 dark:backdrop-blur-sm duration-200 animate-in fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-[101] grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border border-border/80 dark:border-white/15 bg-background p-5 sm:p-6 shadow-2xl dark:shadow-[0_0_50px_rgba(255,255,255,0.06),0_20px_50px_rgba(0,0,0,0.8)] max-h-[90vh] overflow-y-auto overflow-x-hidden [&>*]:min-w-0 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.35)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:my-3 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/80 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 duration-200 animate-in fade-in-0 zoom-in-95",
        className,
      )}
      onPointerDownOutside={(e) => {
        const target = e.target as HTMLElement | null;
        if (target?.closest?.("[data-date-picker-popover], [data-radix-portal], [data-radix-popper-content-wrapper]")) {
          e.preventDefault();
        }
        props.onPointerDownOutside?.(e);
      }}
      onInteractOutside={(e) => {
        const target = e.target as HTMLElement | null;
        if (target?.closest?.("[data-date-picker-popover], [data-radix-portal], [data-radix-popper-content-wrapper]")) {
          e.preventDefault();
        }
        props.onInteractOutside?.(e);
      }}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  hideCloseButton?: boolean;
}

function DialogHeader({
  className,
  children,
  hideCloseButton = false,
  ...props
}: DialogHeaderProps) {
  return (
    <div
      className={cn(
        "sticky -top-5 sm:-top-6 z-30 -mt-5 -mx-5 sm:-mt-6 sm:-mx-6 px-5 py-4 sm:pl-6 sm:pr-7 sm:py-4 bg-background border-b border-border/70 dark:border-white/10 flex items-center justify-between gap-4 shadow-2xs",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col gap-1 min-w-0 flex-1 text-left">
        {children}
      </div>
      {!hideCloseButton && (
        <DialogPrimitive.Close className="shrink-0 self-center inline-flex size-8 items-center justify-center rounded-xl text-muted-foreground/70 transition-all duration-150 hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-500/30 border border-border/40 dark:border-white/10 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring/45 cursor-pointer shadow-2xs bg-background/90 backdrop-blur-xs">
          <XIcon className="size-4" />
          <span className="sr-only">Tutup</span>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2",
        className,
      )}
      {...props}
    />
  );
}

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-base sm:text-lg font-bold leading-tight tracking-tight text-foreground", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-xs sm:text-sm text-muted-foreground mt-0.5", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};

