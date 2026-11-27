import * as React from "react";
import { toast } from "sonner";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import {
  getCompanyProfile,
  listProjects,
  listVendors,
} from "@/lib/data-service";
import { validatePurchaseOrderChecklist } from "@/lib/document-checklist";
import { roundRupiah } from "@/lib/formatters";
import { useLanguage } from "@/lib/i18n";
import {
  createPurchaseOrder,
  deletePurchaseOrders,
  getProjectBudgetComparison,
  listPurchaseOrders,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
} from "@/lib/operations-service";
import type {
  CompanyProfileRow,
  PoItemRow,
  ProjectRow,
  PurchaseOrderRow,
  VendorRow,
} from "@/types/database.types";
import { PoCreateDialog } from "./dialogs/po-create-dialog";
import { PoTable } from "./components/po-table";
import {
  downloadPoPdf,
  downloadPoWord,
  exportPoListToCsv,
  exportPoListToExcel,
  exportPoListToPdf,
} from "./components/po-export-handlers";

export function PurchaseOrdersPage({ mode }: { mode: "user" | "admin" }) {
  const { t } = useLanguage();
  const [orders, setOrders] = React.useState<PurchaseOrderRow[]>([]);
  const [items, setItems] = React.useState<PoItemRow[]>([]);
  const [vendors, setVendors] = React.useState<VendorRow[]>([]);
  const [projects, setProjects] = React.useState<ProjectRow[]>([]);
  const [company, setCompany] = React.useState<CompanyProfileRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingPo, setEditingPo] = React.useState<PurchaseOrderRow | null>(null);
  const [sortField, setSortField] = React.useState<"date" | "number" | "vendor" | "amount">("date");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [isEditing, setIsEditing] = React.useState(false);
  const [selectedPoIds, setSelectedPoIds] = React.useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [singleDeleteTarget, setSingleDeleteTarget] =
    React.useState<PurchaseOrderRow | null>(null);

  const [poDate, setPoDate] = React.useState(() =>
    new Date().toLocaleDateString("en-CA"),
  );
  const [vendorId, setVendorId] = React.useState("");
  const [projectId, setProjectId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [issueNow, setIssueNow] = React.useState(true);
  const [formItems, setFormItems] = React.useState<
    Array<{ description: string; quantity: number; unit: string; unitPrice: number }>
  >([{ description: "", quantity: 1, unit: "Unit", unitPrice: 0 }]);
  const [budgetRemaining, setBudgetRemaining] = React.useState<number | null>(null);
  const [ackBudgetWarning, setAckBudgetWarning] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [cancelTarget, setCancelTarget] =
    React.useState<PurchaseOrderRow | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [poRes, vnds, prjs, comp] = await Promise.all([
        listPurchaseOrders(),
        listVendors(),
        listProjects(),
        getCompanyProfile(),
      ]);
      const activeVendors = vnds.filter((v) => v.is_active);
      setOrders(poRes.orders);
      setItems(poRes.items);
      setVendors(activeVendors);
      setProjects(prjs.projects);
      setCompany(comp);
      setVendorId((prev) => prev || activeVendors[0]?.id || "");
      setProjectId((prev) => prev || prjs.projects[0]?.id || "");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat data PO.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  React.useEffect(() => {
    if (!projectId || !dialogOpen) {
      setBudgetRemaining(null);
      return;
    }
    void getProjectBudgetComparison(projectId)
      .then((rows) => {
        if (rows.length === 0) {
          setBudgetRemaining(null);
        } else {
          setBudgetRemaining(
            rows.reduce((s, r) => s + r.remaining_amount, 0),
          );
        }
      })
      .catch(() => setBudgetRemaining(null));
  }, [projectId, dialogOpen]);

  const draftTotal = formItems.reduce(
    (s, it) => s + roundRupiah(it.quantity * it.unitPrice),
    0,
  );
  const exceedsBudget =
    budgetRemaining !== null && draftTotal > budgetRemaining;

  const selectedVendor = vendors.find((v) => v.id === vendorId) ?? null;
  const poChecklist = React.useMemo(() => {
    return validatePurchaseOrderChecklist({
      vendor: selectedVendor,
      poDate,
      items: formItems,
      exceedsBudget,
      ackBudgetWarning,
      issueImmediately: issueNow,
    });
  }, [selectedVendor, poDate, formItems, exceedsBudget, ackBudgetWarning, issueNow]);

  function handleOpenCreate() {
    setEditingPo(null);
    setPoDate(new Date().toLocaleDateString("en-CA"));
    setVendorId(vendors[0]?.id || "");
    setProjectId(projects[0]?.id || "");
    setNotes("");
    setIssueNow(true);
    setFormItems([{ description: "", quantity: 1, unit: "Unit", unitPrice: 0 }]);
    setAckBudgetWarning(false);
    setDialogOpen(true);
  }

  function handleOpenEditPo(po: PurchaseOrderRow) {
    const poLines = items.filter((i) => i.po_id === po.id);
    setEditingPo(po);
    setPoDate(po.po_date);
    setVendorId(po.vendor_id);
    setProjectId(po.project_id);
    setNotes(po.notes || "");
    setIssueNow(false);
    setFormItems(
      poLines.length > 0
        ? poLines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unit: l.unit,
            unitPrice: l.unit_price,
          }))
        : [{ description: "", quantity: 1, unit: "Unit", unitPrice: 0 }],
    );
    setAckBudgetWarning(Boolean(po.budget_warning_acknowledged));
    setDialogOpen(true);
  }

  async function handleSavePo(e: React.FormEvent) {
    e.preventDefault();
    if (issueNow && draftTotal <= 0) {
      toast.error(
        "Purchase Order yang langsung diterbitkan wajib memiliki total nilai lebih dari Rp 0 (harga satuan > 0).",
      );
      return;
    }
    if (!poChecklist.isValid) {
      const firstInvalid = poChecklist.items.find((i) => !i.passed);
      toast.error(
        firstInvalid?.message || "Checklist PO sebelum terbit belum terpenuhi.",
      );
      return;
    }
    if (exceedsBudget && !ackBudgetWarning) {
      toast.error(
        "Nilai PO melampaui sisa anggaran proyek. Centang konfirmasi peringatan anggaran untuk melanjutkan.",
      );
      return;
    }
    setSaving(true);
    try {
      if (editingPo) {
        const updated = await updatePurchaseOrder(editingPo.id, {
          poDate,
          vendorId,
          projectId,
          notes,
          issueImmediately: issueNow,
          budgetWarningAcknowledged: ackBudgetWarning,
          items: formItems,
        });
        toast.success(
          t("po:toast_updated", {
            number: updated.po_number,
            defaultValue: `PO ${updated.po_number} berhasil diperbarui.`,
          }),
        );
      } else {
        const created = await createPurchaseOrder({
          poDate,
          vendorId,
          projectId,
          notes,
          issueImmediately: issueNow,
          budgetWarningAcknowledged: ackBudgetWarning,
          items: formItems,
        });
        toast.success(
          t("po:toast_created", {
            number: created.po_number,
            defaultValue: `PO ${created.po_number} berhasil disimpan.`,
          }),
        );
      }
      setDialogOpen(false);
      setEditingPo(null);
      setFormItems([{ description: "", quantity: 1, unit: "Unit", unitPrice: 0 }]);
      setNotes("");
      setAckBudgetWarning(false);
      await reload();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : editingPo
            ? "Gagal memperbarui PO."
            : "Gagal membuat PO.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSelectedPos() {
    try {
      await deletePurchaseOrders(selectedPoIds);
      toast.success(
        t("po:toast_deleted", {
          count: selectedPoIds.length,
          defaultValue: `${selectedPoIds.length} PO draf berhasil dihapus.`,
        }),
      );
      setSelectedPoIds([]);
      setDeleteConfirmOpen(false);
      setIsEditing(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus PO.");
    }
  }

  const filtered = orders.filter(
    (o) => statusFilter === "ALL" || o.status === statusFilter,
  );

  const sortedOrders = React.useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === "number") {
        cmp = a.po_number.localeCompare(b.po_number);
      } else if (sortField === "vendor") {
        const vA = vendors.find((v) => v.id === a.vendor_id)?.name ?? "";
        const vB = vendors.find((v) => v.id === b.vendor_id)?.name ?? "";
        cmp = vA.localeCompare(vB);
      } else if (sortField === "amount") {
        cmp = a.total_amount - b.total_amount;
      } else {
        cmp = a.po_date.localeCompare(b.po_date) || a.po_number.localeCompare(b.po_number);
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortField, sortOrder]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <PageHeader
        title={
          mode === "admin"
            ? t("po:title", "Seluruh Purchase Order Pembelian Vendor")
            : t("po:my_title", "Purchase Order Pembelian Saya")
        }
        description={
          mode === "admin"
            ? t(
                "po:subtitle",
                "Kelola penerbitan, persetujuan status, dan dokumen purchase order vendor.",
              )
            : t(
                "po:my_subtitle",
                "Buat dan pantau pesanan pembelian pengadaan barang atau jasa proyek.",
              )
        }
      />

      <PoTable
        loading={loading}
        sortedOrders={sortedOrders}
        vendors={vendors}
        projects={projects}
        mode={mode}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortField={sortField}
        setSortField={setSortField}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        selectedPoIds={selectedPoIds}
        setSelectedPoIds={setSelectedPoIds}
        onDeleteSelected={() => setDeleteConfirmOpen(true)}
        onOpenEditPo={handleOpenEditPo}
        onOpenSingleDelete={(po) => setSingleDeleteTarget(po)}
        onOpenCreate={handleOpenCreate}
        onExportExcel={
          mode === "admin"
            ? () => exportPoListToExcel({ filtered, vendors, projects, t })
            : undefined
        }
        onExportPdf={
          mode === "admin"
            ? () => exportPoListToPdf({ filtered, company, vendors, projects, t })
            : undefined
        }
        onExportCsv={
          mode === "admin"
            ? () => exportPoListToCsv({ filtered, vendors, projects, t })
            : undefined
        }
        onDownloadPdf={(po) =>
          void downloadPoPdf({ po, company, vendors, projects, items, t })
        }
        onDownloadWord={(po) =>
          void downloadPoWord({ po, company, vendors, projects, items, t })
        }
        onIssuePo={async (po) => {
          await updatePurchaseOrderStatus(po.id, "issued");
          toast.success(
            t("po:toast_issued", {
              number: po.po_number,
              defaultValue: `PO ${po.po_number} diterbitkan.`,
            }),
          );
          await reload();
        }}
        onCompletePo={async (po) => {
          await updatePurchaseOrderStatus(po.id, "completed");
          toast.success(
            t("po:toast_completed", {
              number: po.po_number,
              defaultValue: `PO ${po.po_number} ditandai selesai.`,
            }),
          );
          await reload();
        }}
        onCancelPo={(po) => setCancelTarget(po)}
      />

      <PoCreateDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingPo(null);
          }
        }}
        editingPo={editingPo}
        poDate={poDate}
        setPoDate={setPoDate}
        vendorId={vendorId}
        setVendorId={setVendorId}
        projectId={projectId}
        setProjectId={setProjectId}
        vendors={vendors}
        projects={projects}
        formItems={formItems}
        setFormItems={setFormItems}
        draftTotal={draftTotal}
        exceedsBudget={exceedsBudget}
        budgetRemaining={budgetRemaining}
        ackBudgetWarning={ackBudgetWarning}
        setAckBudgetWarning={setAckBudgetWarning}
        notes={notes}
        setNotes={setNotes}
        issueNow={issueNow}
        setIssueNow={setIssueNow}
        poChecklist={poChecklist}
        saving={saving}
        onSubmit={handleSavePo}
        onCancel={() => {
          setDialogOpen(false);
          setEditingPo(null);
        }}
      />

      <ConfirmActionDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t("po:modal_delete.title", "Hapus Purchase Order Draf?")}
        description={t(
          "po:modal_delete.desc",
          `Apakah Anda yakin ingin menghapus ${selectedPoIds.length} dokumen Purchase Order draf terpilih? Tindakan ini tidak dapat dibatalkan.`,
        )}
        destructive
        confirmLabel={t("common:action.delete", "Hapus")}
        onConfirm={handleDeleteSelectedPos}
      />

      <ConfirmActionDialog
        open={Boolean(singleDeleteTarget)}
        onOpenChange={(open) => {
          if (!open) setSingleDeleteTarget(null);
        }}
        title={t("po:modal_delete_single.title", {
          number: singleDeleteTarget?.po_number ?? "",
          defaultValue: `Hapus Purchase Order ${singleDeleteTarget?.po_number ?? ""}?`,
        })}
        description={t(
          "po:modal_delete_single.desc",
          "Apakah Anda yakin ingin menghapus dokumen Purchase Order draf ini? Tindakan ini tidak dapat dibatalkan.",
        )}
        destructive
        confirmLabel={t("common:action.delete", "Hapus")}
        onConfirm={async () => {
          if (!singleDeleteTarget) return;
          try {
            await deletePurchaseOrders([singleDeleteTarget.id]);
            toast.success(
              t("po:toast_deleted_single", {
                number: singleDeleteTarget.po_number,
                defaultValue: `PO draf ${singleDeleteTarget.po_number} berhasil dihapus.`,
              }),
            );
            setSingleDeleteTarget(null);
            await reload();
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "Gagal menghapus PO.",
            );
          }
        }}
      />

      <ConfirmActionDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        title={t("po:modal_cancel.title", {
          number: cancelTarget?.po_number ?? "",
          defaultValue: `Batalkan dokumen ${cancelTarget?.po_number ?? ""}?`,
        })}
        description={t(
          "po:modal_cancel.desc",
          "Pembatalan PO ini akan dicatat dalam riwayat audit trail sistem. Masukkan alasan pembatalan dokumen resmi ini.",
        )}
        destructive
        requireReason
        reasonLabel={t("po:modal_cancel.reason_label", "Alasan Pembatalan PO")}
        confirmLabel={t("po:modal_cancel.btn_confirm", "Ya, Batalkan PO")}
        onConfirm={async (reason) => {
          if (!cancelTarget) return;
          await updatePurchaseOrderStatus(cancelTarget.id, "cancelled", reason);
          toast.success(
            t("po:toast_cancelled", {
              number: cancelTarget.po_number,
              defaultValue: `PO ${cancelTarget.po_number} dibatalkan.`,
            }),
          );
          await reload();
        }}
      />
    </div>
  );
}
