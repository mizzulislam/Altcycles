/**
 * STANDAR RESMI UI TABEL & KARTU DATA ALTCYCLES (Design System Single Source of Truth)
 *
 * Sesuai konvensi AGENTS.md:
 * - Kartu pembungkus tabel: edge-to-edge (p-0 pada CardContent)
 * - Header tabel (<TableHead>): text-center, font-semibold, text-xs sm:text-sm, Proper Case
 * - Sel tabel (<TableCell>): align-top, text-xs sm:text-sm, leading-5
 * - Nominal Moneter: MonetaryCell (simbol kiri, angka rata kanan)
 */

export const TABLE_CARD_CLASS =
  "rounded-2xl border-border/80 bg-card shadow-2xs overflow-hidden";

export const TABLE_CARD_HEADER_CLASS =
  "px-6 py-4 border-b border-border/70 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between";

export const TABLE_HEAD_CLASS =
  "text-center font-semibold text-xs sm:text-sm px-3 py-3.5 text-muted-foreground whitespace-nowrap";

export const TABLE_CELL_CLASS =
  "align-top text-xs sm:text-sm leading-5 px-3 py-3.5";

export const TABLE_EMPTY_STATE_CONTAINER_CLASS =
  "py-10 px-6 bg-muted/10 border-t border-dashed border-border/70";
