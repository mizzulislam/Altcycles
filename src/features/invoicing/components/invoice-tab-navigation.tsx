import {
  ClockIcon,
  FileTextIcon,
  ReceiptIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface InvoiceTabNavigationProps {
  activeTab: "invoices" | "aging" | "receipts";
  onTabChange: (tab: "invoices" | "aging" | "receipts") => void;
  invoiceCount: number;
  agingCount: number;
  receiptCount: number;
  t: (key: string, fallback: string) => string;
}

export function InvoiceTabNavigation({
  activeTab,
  onTabChange,
  invoiceCount,
  agingCount,
  receiptCount,
  t,
}: InvoiceTabNavigationProps) {
  const tabs = [
    {
      id: "invoices" as const,
      label: t("invoicing.tab_invoices", "Daftar Invoice"),
      count: invoiceCount,
      icon: FileTextIcon,
    },
    {
      id: "aging" as const,
      label: t("invoicing.tab_aging", "Umur Piutang / Jatuh Tempo"),
      count: agingCount,
      icon: ClockIcon,
    },
    {
      id: "receipts" as const,
      label: t("invoicing.tab_receipts", "Kuitansi Pembayaran"),
      count: receiptCount,
      icon: ReceiptIcon,
    },
  ];

  return (
    <div className="bg-card rounded-2xl p-2 flex items-center gap-1.5 shadow-2xs border border-border/80 w-full overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <Button
            key={tab.id}
            type="button"
            variant="ghost"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "h-auto shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer select-none",
              isActive
                ? "bg-primary text-primary-foreground shadow-xs hover:bg-primary hover:text-primary-foreground"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "size-4 shrink-0 transition-colors",
                isActive ? "text-primary-foreground" : "text-muted-foreground",
              )}
            />
            <span className="whitespace-nowrap">{tab.label}</span>
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold leading-none",
                isActive
                  ? "bg-white/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {tab.count}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
