import * as React from "react";
import { BriefcaseIcon, Building2Icon, UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { Spinner } from "@/components/ui/empty";
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
      toast.error(err instanceof Error ? err.message : "Gagal memuat data master.");
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  }, []);

  React.useEffect(() => {
    void reload(true);
  }, [reload]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "vendor") {
        await deleteVendor(deleteTarget.id);
        toast.success(`Vendor "${deleteTarget.name}" (${deleteTarget.code}) berhasil dihapus.`);
      } else if (deleteTarget.type === "customer") {
        await deleteCustomer(deleteTarget.id);
        toast.success(`Pelanggan "${deleteTarget.name}" (${deleteTarget.code}) berhasil dihapus.`);
      } else if (deleteTarget.type === "product") {
        await deleteServiceProduct(deleteTarget.id);
        toast.success(`Produk/layanan "${deleteTarget.name}" (${deleteTarget.code}) berhasil dihapus.`);
      }
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus data.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Spinner />
        <span>Memuat master vendor, pelanggan, &amp; produk layanan...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1 min-w-0 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Master Data Vendor &amp; Pelanggan
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            Kelola direktori mitra vendor pengadaan, basis data pelanggan resmi, serta katalog produk dan layanan profesional perusahaan.
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
            <span className="whitespace-nowrap">Vendor</span>
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
            <span className="whitespace-nowrap">Pelanggan / Klien</span>
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
            <span className="whitespace-nowrap">Produk / Layanan</span>
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
        title={`Hapus Data ${
          deleteTarget?.type === "vendor"
            ? "Vendor"
            : deleteTarget?.type === "customer"
              ? "Pelanggan"
              : "Produk / Layanan"
        }?`}
        description={`Apakah Anda yakin ingin menghapus data master ${deleteTarget?.name ?? ""} (${deleteTarget?.code ?? ""})? Data yang dihapus tidak dapat dipulihkan.`}
        confirmLabel="Ya, Hapus Data"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}
