// 問16 a と b の両方に出てくる文字を、a の順に重複なくつないだ文字列を返す
//     例: commonChars("banana", "cabin") → "ban"
// 引数と戻り値に型注釈を付けます。
// 重複や要素の有無を調べるために Set を使います。
// Set の要素をスプレッド構文で配列にします。
// 要素が Set にあるかは has() で調べます。

export function commonChars(a: string, b: string): string {
  const inB = new Set(b);
  return [...new Set(a)].filter((char) => inB.has(char)).join("");
}
