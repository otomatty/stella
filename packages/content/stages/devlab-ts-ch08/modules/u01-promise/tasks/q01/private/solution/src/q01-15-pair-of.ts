// 問15 Promise.all で、2つの値を [文字列, 数値] のタプルにして返す
//     例: pairOf(Promise.resolve("a"), Promise.resolve(1)) → ["a", 1] で解決する
// async と await を使わずに書いてください。
// 引数と戻り値に型注釈を付け、Promise の中身の型まで書いてください。

export function pairOf(a: Promise<string>, b: Promise<number>): Promise<[string, number]> {
  return Promise.all([a, b]);
}
