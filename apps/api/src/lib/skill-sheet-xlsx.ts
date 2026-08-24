/**
 * xlsx → CSV 変換 (Issue #203)。
 *
 * SheetJS community xlsx 0.18.x の read 経路は使用しない。
 * ExcelJS で先頭シートを CSV 化する。
 */

import ExcelJS from "exceljs";

function escapeCsvCell(value: unknown): string {
  if (value == null) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** xlsx バイト列の先頭シートを CSV 文字列へ変換する。 */
export async function xlsxBytesToCsv(xlsxBytes: Uint8Array): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(xlsxBytes));
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return "";

  const rows: string[] = [];
  worksheet.eachRow((row) => {
    const values = row.values;
    const cells = Array.isArray(values) ? values.slice(1).map((cell) => escapeCsvCell(cell)) : [];
    rows.push(cells.join(","));
  });
  return rows.join("\n");
}
