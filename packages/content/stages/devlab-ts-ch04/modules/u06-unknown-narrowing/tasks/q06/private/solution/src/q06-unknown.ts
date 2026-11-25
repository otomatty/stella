// 問題
// 型の分からない値（unknown）を受け取る関数を書いてください。引数と戻り値には型注釈を付けること。
// unknown の値は、typeof、instanceof、Array.isArray、=== null などで型を絞り込んでから使う。
//
// 1. describeValue(value)
//    値の種類と中身を文字列で返す
//    - 文字列:   "文字列(3文字)"       … 文字数
//    - 数値:     "数値(42)"
//    - 真偽値:   "真偽値(true)"
//    - null:     "null"
//    - undefined: "undefined"
//    - 配列:     "配列(要素2個)"
//    - Date:     "日付(2026-12-01)"   … toISOString の先頭10文字
//    - それ以外のオブジェクト: "オブジェクト"
//    - それ以外（関数など）: "その他"
//
// 2. toNumber(value)
//    有限の数値ならそのまま、数値に変換できる文字列（前後の空白を除いて空でないもの）なら変換した数値、
//    それ以外は null を返す。戻り値は number | null
//
// 3. sumNumbers(values)
//    配列の中の、有限の数値だけを合計する。引数は readonly unknown[]
export function describeValue(value: unknown): string {
  if (typeof value === "string") {
    return `文字列(${value.length}文字)`;
  }
  if (typeof value === "number") {
    return `数値(${value})`;
  }
  if (typeof value === "boolean") {
    return `真偽値(${String(value)})`;
  }
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "undefined";
  }
  if (Array.isArray(value)) {
    return `配列(要素${value.length}個)`;
  }
  if (value instanceof Date) {
    return `日付(${value.toISOString().slice(0, 10)})`;
  }
  if (typeof value === "object") {
    return "オブジェクト";
  }
  return "その他";
}

export function toNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function sumNumbers(values: readonly unknown[]): number {
  let total = 0;
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      total += value;
    }
  }
  return total;
}
