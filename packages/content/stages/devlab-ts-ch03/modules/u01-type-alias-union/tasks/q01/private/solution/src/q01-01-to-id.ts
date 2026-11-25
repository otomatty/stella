// 問1 文字列か数値を受け取り、文字列にして返す
//     例: toId(42) → "42"
// 引数と戻り値に型注釈を付ける。
// 引数の型にはユニオン型を直接書く。

export function toId(id: string | number): string {
  return String(id);
}
