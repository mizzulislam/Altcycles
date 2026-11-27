/**
 * STANDAR RESMI UI MODAL DIALOG & KONFIRMASI ALTCYCLES (Design System Single Source of Truth)
 *
 * Sesuai konvensi AGENTS.md:
 * - Header modal minimalis tanpa icon dekoratif sebelah kiri judul dan tanpa subteks
 * - Judul modal (DialogTitle) dan tombol close (DialogClose / X) sejajar sempurna secara vertikal
 * - Tier lebar modal:
 *   - Konfirmasi: ConfirmActionDialog (sm:max-w-md)
 *   - Form Sederhana: sm:max-w-lg
 *   - Form Menengah: sm:max-w-2xl
 *   - Form Kompleks / Multi-Kolom / Tabel: sm:max-w-3xl
 */

export const MODAL_WIDTH_CONFIRM = "sm:max-w-md";
export const MODAL_WIDTH_SIMPLE = "sm:max-w-lg";
export const MODAL_WIDTH_MEDIUM = "sm:max-w-2xl";
export const MODAL_WIDTH_COMPLEX = "sm:max-w-3xl";

export const MODAL_HEADER_CLASS =
  "px-5 py-4 sm:px-6 sm:py-4 border-b border-border/70 flex items-center justify-between";

export const MODAL_FOOTER_CLASS =
  "px-5 py-4 sm:px-6 sm:py-4 border-t border-border/70 flex items-center justify-end gap-3 bg-muted/10";
