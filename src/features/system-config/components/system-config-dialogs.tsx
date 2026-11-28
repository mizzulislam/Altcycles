import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { useLanguage } from "@/lib/i18n";

interface SystemConfigDialogsProps {
  pendingPkpState: boolean | null;
  onClosePkpConfirm: () => void;
  onConfirmPkp: (msg: string) => Promise<void>;
  confirmPurgeOpen: boolean;
  onOpenChangePurge: (open: boolean) => void;
  purging: boolean;
  onConfirmPurge: () => Promise<void>;
}

export function SystemConfigDialogs({
  pendingPkpState,
  onClosePkpConfirm,
  onConfirmPkp,
  confirmPurgeOpen,
  onOpenChangePurge,
  purging,
  onConfirmPurge,
}: SystemConfigDialogsProps) {
  const { t } = useLanguage();

  return (
    <>
      <ConfirmActionDialog
        open={pendingPkpState !== null}
        onOpenChange={(open) => {
          if (!open) onClosePkpConfirm();
        }}
        title={
          pendingPkpState
            ? t("settings:company.confirm_pkp_activate_title")
            : t("settings:company.confirm_pkp_deactivate_title")
        }
        description={
          pendingPkpState
            ? t("settings:company.confirm_pkp_activate_desc")
            : t("settings:company.confirm_pkp_deactivate_desc")
        }
        onConfirm={async () => {
          await onConfirmPkp(t("settings:company.toast_tax_updated"));
        }}
      />

      <ConfirmActionDialog
        open={confirmPurgeOpen}
        onOpenChange={onOpenChangePurge}
        title="Bersihkan Data Pengujian & Reset Penomoran?"
        description="Aksi ini akan menghapus seluruh data nomor urut dokumen hasil testing sebelumnya dan mengembalikan urutan penomoran ke awal. Format penomoran dokumen tetap dipertahankan. Gunakan aksi ini hanya saat mode sandbox/testing aktif."
        confirmLabel={purging ? "Membersihkan..." : "Ya, Bersihkan Data"}
        destructive
        onConfirm={onConfirmPurge}
      />
    </>
  );
}
