import { InfoIcon } from "lucide-react";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageLoader } from "@/components/ui/loader";
import { LoginMediaKpiGrid } from "./login-media/login-media-kpi-grid";
import { LoginMediaPreviewCard } from "./login-media/login-media-preview-card";
import { LoginMediaTable } from "./login-media/login-media-table";
import { LoginMediaFormDialog } from "./login-media/login-media-form-dialog";
import { useLoginMediaState } from "./login-media/use-login-media-state";

export function LoginMediaPage() {
  const state = useLoginMediaState();
  const {
    t,
    items,
    loading,
    usingLocalFallback,
    activeItems,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    sortOrder,
    setSortOrder,
    filterOpen,
    setFilterOpen,
    filterRef,
    pageSize,
    setPageSize,
    setCurrentPage,
    previewIdx,
    setPreviewIdx,
    dialogOpen,
    setDialogOpen,
    editingItem,
    titleInput,
    setTitleInput,
    subtitleInput,
    setSubtitleInput,
    categoryInput,
    setCategoryInput,
    imageUrlInput,
    setImageUrlInput,
    linkUrlInput,
    setLinkUrlInput,
    orderInput,
    setOrderInput,
    activeInput,
    setActiveInput,
    saving,
    deleteTarget,
    setDeleteTarget,
    openCreateDialog,
    openEditDialog,
    handleSave,
    handleToggleActive,
    handleConfirmDelete,
    bannerCount,
    flyerCount,
    medsosCount,
    categoryTickerItems,
    totalFiltered,
    totalPages,
    safePage,
    paginatedItems,
    startDisplay,
    endDisplay,
    pageNumbers,
    previewSlide,
    categoryMeta,
  } = state;

  if (loading) {
    return <PageLoader message={t("settings:login_media.loading_gallery")} />;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman */}
      <PageHeader
        title={t("settings:login_media.header_title")}
        description={t("settings:login_media.header_desc")}
      />

      {usingLocalFallback ? (
        <Alert variant="info">
          <InfoIcon className="size-4" />
          <AlertTitle>{t("settings:login_media.alert_supabase_migration")}</AlertTitle>
          <AlertDescription className="text-xs leading-relaxed">
            {t("settings:login_media.alert_supabase_desc")}
          </AlertDescription>
        </Alert>
      ) : null}

      {/* 3 Kartu KPI */}
      <LoginMediaKpiGrid
        totalCount={items.length}
        activeCount={activeItems.length}
        bannerCount={bannerCount}
        flyerCount={flyerCount}
        medsosCount={medsosCount}
        categoryTickerItems={categoryTickerItems}
      />

      {/* Pratinjau Langsung Panel Kiri Halaman Login */}
      <LoginMediaPreviewCard
        activeItems={activeItems}
        previewIdx={previewIdx}
        setPreviewIdx={setPreviewIdx}
        previewSlide={previewSlide}
        categoryMeta={categoryMeta}
      />

      {/* Tabel Daftar Media */}
      <LoginMediaTable
        items={items}
        paginatedItems={paginatedItems}
        totalFiltered={totalFiltered}
        totalPages={totalPages}
        safePage={safePage}
        startDisplay={startDisplay}
        endDisplay={endDisplay}
        pageNumbers={pageNumbers}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        filterOpen={filterOpen}
        setFilterOpen={setFilterOpen}
        filterRef={filterRef}
        pageSize={pageSize}
        setPageSize={setPageSize}
        setCurrentPage={setCurrentPage}
        categoryMeta={categoryMeta}
        onOpenCreateDialog={openCreateDialog}
        onOpenEditDialog={openEditDialog}
        onToggleActive={handleToggleActive}
        onSetDeleteTarget={setDeleteTarget}
      />

      {/* Modal Tambah / Edit Media */}
      <LoginMediaFormDialog
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        editingItem={editingItem}
        titleInput={titleInput}
        setTitleInput={setTitleInput}
        subtitleInput={subtitleInput}
        setSubtitleInput={setSubtitleInput}
        categoryInput={categoryInput}
        setCategoryInput={setCategoryInput}
        imageUrlInput={imageUrlInput}
        setImageUrlInput={setImageUrlInput}
        linkUrlInput={linkUrlInput}
        setLinkUrlInput={setLinkUrlInput}
        orderInput={orderInput}
        setOrderInput={setOrderInput}
        activeInput={activeInput}
        setActiveInput={setActiveInput}
        saving={saving}
        onSave={handleSave}
      />

      {/* Dialog Konfirmasi Hapus */}
      <ConfirmActionDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("settings:login_media.confirm_delete_modal_title")}
        description={
          deleteTarget
            ? t("settings:login_media.confirm_delete_modal_desc", {
                title: deleteTarget.title,
              })
            : ""
        }
        confirmLabel={t("settings:login_media.confirm_delete_perm")}
        destructive
        confirmText="DELETE"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
