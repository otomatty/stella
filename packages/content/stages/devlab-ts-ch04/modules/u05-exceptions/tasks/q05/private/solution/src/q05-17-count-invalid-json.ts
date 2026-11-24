// 問17 JSON として読めない文字列の数を返す
//     例: countInvalidJson(["1", "{", "[]", "x"]) → 2
// 引数と戻り値に型注釈を付けます。
// JSON.parse を try-catch で囲みます。
export function countInvalidJson(texts: readonly string[]): number {
  let count = 0;
  for (const text of texts) {
    try {
      JSON.parse(text);
    } catch {
      count++;
    }
  }
  return count;
}
