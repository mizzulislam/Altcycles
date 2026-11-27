import {
  TOOLBAR_BUTTON_CLASS,
  TOOLBAR_ACTIVE_EXPANDED_CLASS,
  ToolbarButton,
  type ToolbarButtonProps,
} from "@/components/shared/toolbar-button";

/**
 * STANDAR RESMI UI BUTTON ALTCYCLES (Design System Single Source of Truth)
 *
 * 1. Toolbar Action Button (Tabel & Kartu):
 *    - Ukuran: size-9 (36x36 px)
 *    - Radius: rounded-xl
 *    - Warna: Solid Biru Primary (bg-primary text-primary-foreground hover:bg-primary/90)
 *    - Ikon: size-4 text-primary-foreground
 *
 * 2. Table Row Action Button (Kolom Aksi):
 *    - Ukuran: size-8 rounded-lg
 *    - Margin vertikal offset: -my-1.5
 *
 * 3. Dialog Modal Action Buttons:
 *    - Default: h-9 px-4 rounded-xl text-xs sm:text-sm font-semibold
 *    - Batal: variant="outline" h-9 rounded-xl
 *    - Simpan/Aksi Utama: variant="default" (bg-primary text-primary-foreground)
 */

export {
  TOOLBAR_BUTTON_CLASS,
  TOOLBAR_ACTIVE_EXPANDED_CLASS,
  ToolbarButton,
  type ToolbarButtonProps,
};

export const TABLE_ROW_ACTION_BUTTON_CLASS =
  "size-8 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shrink-0";
