/**
 * CSV 文字列化とブラウザダウンロードの小さなユーティリティ。
 *
 * Excel / Google スプレッドシートで文字化けしないよう UTF-8 BOM を先頭に付ける。
 */

/** 1 セルを RFC 4180 風にエスケープする (ダブルクオート二重化 + 引用)。 */
function escapeCell(value: unknown): string {
  const s =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  // 式インジェクション対策: 先頭が =,+,-,@ の値は表計算ソフトで数式として
  // 評価され得るため、 無害化のため先頭にシングルクオートを付ける。
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** ヘッダ + 行の二次元データを CSV 文字列にする。 */
export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(","));
  return lines.join("\r\n");
}

/** CSV 文字列を `filename` でダウンロードさせる (UTF-8 BOM 付き)。 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["\ufeff", csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
