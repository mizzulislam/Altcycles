import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    data-slot="select-trigger"
    className={cn(
      "flex h-9 w-full min-w-0 max-w-full items-center justify-between gap-2 overflow-hidden whitespace-nowrap rounded-xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2 text-sm shadow-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-ring/45 focus-visible:border-ring/70 data-[state=open]:border-ring/60 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:min-w-0 [&>span]:flex-1 [&>span]:truncate [&>span]:text-left [&>svg]:shrink-0 cursor-pointer transition-colors",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDownIcon className="size-4 opacity-60" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", side = "bottom", sideOffset = 4, align = "start", avoidCollisions = true, collisionPadding = 12, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      side={side}
      sideOffset={sideOffset}
      align={align}
      avoidCollisions={avoidCollisions}
      collisionPadding={collisionPadding}
      className={cn(
        "relative z-[9999] max-h-[min(18rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] max-w-[min(var(--radix-select-trigger-width),calc(100vw-2rem))] overflow-x-hidden overflow-y-auto rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-xl duration-150 animate-in fade-in-0 zoom-in-95 data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1 w-full max-w-full overflow-x-hidden no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full min-w-0 cursor-pointer select-none items-center rounded-lg py-2 pl-2.5 pr-8 text-xs sm:text-sm whitespace-normal break-words leading-snug outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors",
      className,
    )}
    {...props}
  >
    <span className="absolute right-2 flex size-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <CheckIcon className="size-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText className="block min-w-0">{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
};

