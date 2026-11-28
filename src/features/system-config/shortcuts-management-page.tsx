import { PageHeader } from "@/components/shared/page-header";
import { ConfirmActionDialog } from "@/components/shared/confirm-dialog";
import { ShortcutsKpiGrid } from "./shortcuts/shortcuts-kpi-grid";
import { ShortcutsTable } from "./shortcuts/shortcuts-table";
import { ShortcutsDropdownPortals } from "./shortcuts/shortcuts-dropdown-portals";
import { ShortcutsEditDialog } from "./shortcuts/shortcuts-edit-dialog";
import { useShortcutsManagementState } from "./shortcuts/use-shortcuts-management-state";

export function ShortcutsManagementPage() {
  const state = useShortcutsManagementState();
  const {
    t,
    isMac,
    overrides,
    searchQuery,
    setSearchQuery,
    groupFilter,
    setGroupFilter,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    filterMenuOpen,
    setFilterMenuOpen,
    filterBtnRef,
    filterMenuRef,
    filterCoords,
    sortMenuOpen,
    setSortMenuOpen,
    sortBtnRef,
    sortMenuRef,
    sortCoords,
    activeFilterCount,
    totalItems,
    customCount,
    lockedCount,
    roleLabels,
    groupLabels,
    sortedItems,
    editingItem,
    editOpen,
    setEditOpen,
    recordedKeys,
    setRecordedKeys,
    isRecording,
    setIsRecording,
    recordingError,
    setRecordingError,
    recordInputRef,
    conflictResult,
    resetAllOpen,
    setResetAllOpen,
    handleOpenEdit,
    handleResetSingle,
    handleConfirmResetAll,
    handleRecordKeyDown,
    handleApplyPreset,
    handleSaveEdit,
  } = state;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Halaman Terstandar */}
      <PageHeader
        title={t("shortcuts.management_title", "Pintasan Keyboard")}
        description={t(
          "shortcuts.management_desc",
          "Konfigurasi dan kelola pemetaan pintasan keyboard global untuk seluruh portal dan peran pengguna.",
        )}
      />

      {/* 2. Kartu Ringkasan KPI (4 Cards) */}
      <ShortcutsKpiGrid
        totalItems={totalItems}
        customCount={customCount}
        lockedCount={lockedCount}
      />

      {/* 3. Kartu Edge-to-Edge Tabel Pintasan */}
      <ShortcutsTable
        sortedItems={sortedItems}
        overrides={overrides}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeFilterCount={activeFilterCount}
        filterMenuOpen={filterMenuOpen}
        setFilterMenuOpen={setFilterMenuOpen}
        filterBtnRef={filterBtnRef}
        sortBy={sortBy}
        sortMenuOpen={sortMenuOpen}
        setSortMenuOpen={setSortMenuOpen}
        sortBtnRef={sortBtnRef}
        customCount={customCount}
        onResetAllClick={() => setResetAllOpen(true)}
        onOpenEdit={handleOpenEdit}
        onResetSingle={handleResetSingle}
        isMac={isMac}
        roleLabels={roleLabels}
        groupLabels={groupLabels}
      />

      {/* 4. Portal Dropdown Menu Filter & Sort */}
      <ShortcutsDropdownPortals
        filterMenuOpen={filterMenuOpen}
        filterCoords={filterCoords}
        filterMenuRef={filterMenuRef}
        activeFilterCount={activeFilterCount}
        groupFilter={groupFilter}
        setGroupFilter={setGroupFilter}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortMenuOpen={sortMenuOpen}
        sortCoords={sortCoords}
        sortMenuRef={sortMenuRef}
        sortBy={sortBy}
        setSortBy={setSortBy}
        setSortMenuOpen={setSortMenuOpen}
      />

      {/* 5. Modal Dialog: Edit Pintasan Keyboard */}
      <ShortcutsEditDialog
        editOpen={editOpen}
        setEditOpen={setEditOpen}
        editingItem={editingItem}
        recordedKeys={recordedKeys}
        isRecording={isRecording}
        setIsRecording={setIsRecording}
        recordingError={recordingError}
        setRecordingError={setRecordingError}
        setRecordedKeys={setRecordedKeys}
        recordInputRef={recordInputRef}
        conflictResult={conflictResult}
        onRecordKeyDown={handleRecordKeyDown}
        onApplyPreset={handleApplyPreset}
        onSaveEdit={handleSaveEdit}
        isMac={isMac}
        roleLabels={roleLabels}
        groupLabels={groupLabels}
      />

      {/* 6. Dialog Konfirmasi: Reset Semua Pintasan */}
      <ConfirmActionDialog
        open={resetAllOpen}
        onOpenChange={setResetAllOpen}
        title={t("shortcuts.reset_all_title", "Reset Semua Pintasan ke Bawaan?")}
        description={t(
          "shortcuts.reset_all_desc",
          "Seluruh konfigurasi pintasan keyboard kustom yang telah dibuat akan dihapus dan dikembalikan ke pengaturan bawaan pabrik sistem.",
        )}
        confirmLabel={t("shortcuts.reset_all_confirm", "Ya, Reset Semua")}
        cancelLabel={t("common:action.cancel", "Batal")}
        destructive={true}
        onConfirm={handleConfirmResetAll}
      />
    </div>
  );
}
