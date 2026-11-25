// 問14 error の cause をたどり、いちばん元の原因を返す（Error でないか、cause を持たないところで止める）
//     例: rootCause(c) → a（c の cause が b、b の cause が a のとき）
// 引数と戻り値に型注釈を付けます。
// エラーの種類は instanceof で見分けます。

export function rootCause(error: unknown): unknown {
  let current = error;
  while (current instanceof Error && current.cause !== undefined) {
    current = current.cause;
  }
  return current;
}
