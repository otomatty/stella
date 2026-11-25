// 問12 BigInt(text) を返す。例外が出たら null を返す
//     例: toBigIntOrNull("123") → 123n
// 引数と戻り値に型注釈を付けます。
// BigInt(text) を try-catch で囲みます。
export function toBigIntOrNull(text: string): bigint | null {
  try {
    return BigInt(text);
  } catch {
    return null;
  }
}
