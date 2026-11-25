// 問11 Error なら name（"Error"、"RangeError" など）、それ以外は "Unknown" を返す
//     例: errorName(new RangeError("x")) → "RangeError"
// 引数と戻り値に型注釈を付けます。
// instanceof Error で Error かどうかを確かめます。
export function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "Unknown";
}
