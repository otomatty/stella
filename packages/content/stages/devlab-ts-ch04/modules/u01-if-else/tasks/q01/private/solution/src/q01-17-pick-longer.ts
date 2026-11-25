// 問17 長い方の文字列を返す。同じ長さなら a
//     例: pickLonger("abc", "de") → "abc"
// 引数と戻り値に型注釈を付けます。
// if-else 文で分けます。短い場合は三項演算子でも構いません。
export function pickLonger(a: string, b: string): string {
  return b.length > a.length ? b : a;
}
