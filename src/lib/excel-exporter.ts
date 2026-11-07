import writeXlsxFile, { type SheetData } from "write-excel-file/universal";

export interface ExcelColumnSpec {
  header: string;
  width?: number;
}

export type ExcelCellPrimitive = string | number | boolean | null | undefined;

/**
 * Membangun Blob .xlsx (Microsoft Excel) secara universal di peramban maupun Node/Vitest.
 */
export async function createExcelBlob(params: {
  sheetName: string;
  columns: ExcelColumnSpec[];
  rows: ExcelCellPrimitive[][];
}): Promise<Blob> {
  const headerRow = params.columns.map((c) => ({
    value: c.header,
    fontWeight: "bold" as const,
  }));

  const bodyRows = params.rows.map((r) =>
    r.map((cell) => {
      if (typeof cell === "number") {
        return { type: Number, value: cell, format: "#,##0" };
      }
      if (typeof cell === "boolean") {
        return { type: Boolean, value: cell };
      }
      return { type: String, value: cell == null ? "" : String(cell) };
    }),
  );

  const sheetData: SheetData = [headerRow, ...bodyRows];
  const columnsConfig = params.columns.map((c) => ({ width: c.width ?? 22 }));

  return writeXlsxFile(sheetData, {
    columns: columnsConfig,
    sheet: params.sheetName.slice(0, 31),
  }).toBlob();
}

/**
 * Mengunduh berkas Excel (.xlsx) langsung di peramban pengguna (UC-29 & UC-39).
 */
export async function downloadExcelSheet(params: {
  fileName: string;
  sheetName: string;
  columns: ExcelColumnSpec[];
  rows: ExcelCellPrimitive[][];
}): Promise<void> {
  const blob = await createExcelBlob(params);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = params.fileName.endsWith(".xlsx")
    ? params.fileName
    : `${params.fileName}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

