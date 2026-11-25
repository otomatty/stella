// 問20 char を width 個並べた文字列を返す
//     例: line("=", 5) → "====="
// 戻り値には型注釈を付けてください。
export function line(char: string, width: number): string {
  return char.repeat(width);
}
