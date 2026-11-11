export type CsvCellValue = string | number | null | undefined;

export function downloadCsvFile(
  filename: string,
  headers: string[],
  rows: CsvCellValue[][],
): void {
  const escapeCsv = (value: CsvCellValue): string => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeCsv).join(",");
  const rowLines = rows.map((row) => row.map(escapeCsv).join(","));
  const csvContent = "\uFEFF" + [headerLine, ...rowLines].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

