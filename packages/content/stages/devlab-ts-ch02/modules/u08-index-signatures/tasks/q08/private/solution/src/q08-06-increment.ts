// 問6 key の値を1増やした、新しいオブジェクトを返す。key がなければ 1 にする
//     例: increment({ a: 1 }, "a") → { a: 2 }
// 引数と戻り値には型注釈を付けます。
// キーが自由なオブジェクトの型は { [key: string]: number } の形で書きます。
// キーがない場合の値は ?? で補えます。
export function increment(
  counts: { [key: string]: number },
  key: string,
): { [key: string]: number } {
  return { ...counts, [key]: (counts[key] ?? 0) + 1 };
}
