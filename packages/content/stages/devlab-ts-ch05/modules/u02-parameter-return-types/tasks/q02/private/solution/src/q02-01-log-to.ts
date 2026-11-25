// 問1 lines の末尾に message を足す。何も返さない
//     例: logTo(lines, "start") → lines が ["start"] になる
// 引数には型注釈を付け、戻り値の型は void と明記してください。

export function logTo(lines: string[], message: string): void {
  lines.push(message);
}
