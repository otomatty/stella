// 問8 Date なら「2026-12-01」（toISOString の先頭10文字）、それ以外は "日付ではありません"
//     例: dateText(new Date("2026-12-01T09:00:00Z")) → "2026-12-01"
// 引数と戻り値に型注釈を付けます。
// instanceof Date で Date かどうかを確かめます。
export function dateText(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return "日付ではありません";
}
