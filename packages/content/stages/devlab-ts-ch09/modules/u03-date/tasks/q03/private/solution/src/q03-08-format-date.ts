// 問8 "2026-04-01" の形の文字列を返す（月と日は2桁）
//     例: formatDate(2026年4月1日) → "2026-04-01"
// 引数と戻り値に型注釈を付けます。
// Date では月を 0〜11（1月が 0）で数えます。
// ローカル時刻の年月日は getFullYear()、getMonth()、getDate() で取り出します。
// 引数の Date は変更しません。

export function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
