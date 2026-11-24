import * as React from "react";
import { BriefcaseIcon, Building2Icon, UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { Spinner } from "@/components/ui/empty";
import { PageLoader } from "@/components/ui/loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deleteCustomer,
  deleteVendor,
  listCustomers,
  listVendors,
} from "@/lib/data-service";
import {
  deleteServiceProduct,
  listServicesProducts,
} from "@/lib/services/products-services-service";
import type { CustomerRow, ServiceProductRow, VendorRow } from "@/types/database.types";
import { VendorTabContent } from "./parties/vendor-tab-content";
import { CustomerTabContent } from "./parties/customer-tab-content";
import { ProductServiceTabContent } from "./parties/product-service-tab-content";

export function PartiesMasterPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = React.useState<"vendor" | "pelanggan" | "produk_layanan">("vendor");
  const [vendors, setVendors] = React.useState<VendorRow[]>([]);
  const [customers, setCustomers] = React.useState<CustomerRow[]>([]);
  const [products, setProducts] = React.useState<ServiceProductRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Dialog Konfirmasi Hapus Data Master
  const [deleteTarget, setDeleteTarget] = React.useState<{
    type: "vendor" | "customer" | "product";
    id: string;
    code: string;
    name: string;
  } | null>(null);

  const reload = React.useCallback(async (showSpinner = false) => {
    if (showSpinner) {
      setLoading(true);
    }
    try {
      const [v, c, p] = await Promise.all([
        listVendors(),
        listCustomers(),
        listServicesProducts(),
      ]);
      setVendors(v);
      setCustomers(c);
      setProducts(p);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("parties:common.load_error", "Gagal memuat data master."),
      );
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  }, [t]);

  React.useEffect(() => {
    void reload(true);
  }, [reload]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "vendor") {
        await deleteVendor(deleteTarget.id);
        toast.success(
          t("parties:vendors.toast_deleted", {
            name: deleteTarget.name,
            code: deleteTarget.code,
            defaultValue: `Vendor "${deleteTarget.name}" (${deleteTarget.code}) berhasil dihapus.`,
          }),
        );
      } else if (deleteTarget.type === "customer") {
        await deleteCustomer(deleteTarget.id);
        toast.success(
          t("parties:customers.toast_deleted", {
            name: deleteTarget.name,
            code: deleteTarget.code,
            defaultValue: `Pelanggan "${deleteTarget.name}" (${deleteTarget.code}) berhasil dihapus.`,
          }),
        );
      } else if (deleteTarget.type === "product") {
        await deleteServiceProduct(deleteTarget.id);
        toast.success(
          t("parties:products.toast_deleted", {
            name: deleteTarget.name,
            code: deleteTarget.code,
            defaultValue: `Produk/layanan "${deleteTarget.name}" (${deleteTarget.code}) berhasil dihapus.`,
          }),
        );
      }
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("parties:common.delete_error", "Gagal menghapus data."),
      );
    }
  }

  if (loading) {
    return <PageLoader message={t("parties:common.loading")} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1 min-w-0 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t("parties.title", "Master Data Vendor & Pelanggan")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            {t(
              "parties.subtitle",
              "Kelola direktori mitra vendor pengadaan, basis data pelanggan resmi, serta katalog produk dan layanan profesional perusahaan.",
            )}
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(value as "vendor" | "pelanggan" | "produk_layanan")
        }
      >
        <TabsList>
          <TabsTrigger value="vendor">
            <Building2Icon
              className={cn(
                "size-4 shrink-0 transition-colors",
                activeTab === "vendor"
                  ? "text-primary-foreground"
                  : "text-muted-foreground",
              )}
            />
            <span className="whitespace-nowrap">{t("parties.tab_vendors", "Vendor")}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums transition-colors",
                activeTab === "vendor"
                  ? "bg-white/20 text-white"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {vendors.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="pelanggan">
            <UsersIcon
              className={cn(
                "size-4 shrink-0 transition-colors",
                activeTab === "pelanggan"
                  ? "text-primary-foreground"
                  : "text-muted-foreground",
              )}
            />
            <span className="whitespace-nowrap">{t("parties.tab_customers", "Pelanggan / Klien")}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums transition-colors",
                activeTab === "pelanggan"
                  ? "bg-white/20 text-white"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {customers.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="produk_layanan">
            <BriefcaseIcon
              className={cn(
                "size-4 shrink-0 transition-colors",
                activeTab === "produk_layanan"
                  ? "text-primary-foreground"
                  : "text-muted-foreground",
              )}
            />
            <span className="whitespace-nowrap">{t("parties.tab_products", "Produk / Layanan")}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums transition-colors",
                activeTab === "produk_layanan"
                  ? "bg-white/20 text-white"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {products.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendor">
          <VendorTabContent
            vendors={vendors}
            onReload={reload}
            onRequestDelete={setDeleteTarget}
          />
        </TabsContent>

        <TabsContent value="pelanggan">
          <CustomerTabContent
            customers={customers}
            onReload={reload}
            onRequestDelete={setDeleteTarget}
          />
        </TabsContent>

        <TabsContent value="produk_layanan">
          <ProductServiceTabContent
            products={products}
            onReload={reload}
            onRequestDelete={setDeleteTarget}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog Konfirmasi Hapus Data Master */}
      <ConfirmActionDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("parties:common.delete_title", {
          type:
            deleteTarget?.type === "vendor"
              ? t("parties:tab_vendors", "Vendor")
              : deleteTarget?.type === "customer"
                ? t("parties:tab_customers", "Pelanggan")
                : t("parties:tab_products", "Produk / Layanan"),
        })}
        description={t("parties:common.delete_desc", {
          name: deleteTarget?.name ?? "",
          code: deleteTarget?.code ?? "",
        })}
        confirmLabel={t("parties:common.delete_btn", "Ya, Hapus Data")}
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}
