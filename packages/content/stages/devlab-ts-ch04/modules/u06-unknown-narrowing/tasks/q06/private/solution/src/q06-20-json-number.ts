// 問20 JSON.parse(text) の結果が数値ならそれを、そうでなければ null を返す。JSON として読めなくても null
//     例: jsonNumber("42") → 42
// 引数と戻り値に型注釈を付けます。
// JSON.parse の結果を unknown として受け取り、typeof で数値か確かめます。
export function jsonNumber(text: string): number | null {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === "number" ? value : null;
  } catch {
    return null;
  }
}
