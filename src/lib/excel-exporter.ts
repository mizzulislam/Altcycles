import type { SheetData } from "write-excel-file/universal";

export interface ExcelColumnSpec {
  header: string;
  width?: number;
}

export type ExcelCellPrimitive =
  | string
  | number
  | boolean
  | null
  | undefined
  | {
      value: string | number | boolean | null | undefined;
      fontStyle?: "italic";
      fontWeight?: "bold";
      color?: string;
    };

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
      let rawVal: string | number | boolean | null | undefined = cell as any;
      let fontStyle: "italic" | undefined;
      let fontWeight: "bold" | undefined;
      let color: string | undefined;

      if (cell != null && typeof cell === "object") {
        rawVal = cell.value;
        fontStyle = cell.fontStyle;
        fontWeight = cell.fontWeight;
        color = cell.color;
      }

      if (typeof rawVal === "number") {
        return {
          type: Number,
          value: rawVal,
          format: "#,##0",
          fontStyle,
          fontWeight,
          color,
        };
      }
      if (typeof rawVal === "boolean") {
        return { type: Boolean, value: rawVal, fontStyle, fontWeight, color };
      }
      return {
        type: String,
        value: rawVal == null ? "" : String(rawVal),
        fontStyle,
        fontWeight,
        color,
      };
    }),
  );

  const sheetData: SheetData = [headerRow, ...bodyRows];
  const columnsConfig = params.columns.map((c) => ({ width: c.width ?? 22 }));

  const { default: writeXlsxFile } = await import("write-excel-file/universal");
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

