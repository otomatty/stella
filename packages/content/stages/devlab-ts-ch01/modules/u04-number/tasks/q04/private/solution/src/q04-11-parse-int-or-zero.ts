// 問11 文字列の先頭の整数を取り出す。取り出せなければ 0 を返す（Number.parseInt と Number.isNaN）
//     例: parseIntOrZero("42px") → 42
// 戻り値には型注釈を付けてください。
export function parseIntOrZero(text: string): number {
  const n = Number.parseInt(text, 10);
  return Number.isNaN(n) ? 0 : n;
}
