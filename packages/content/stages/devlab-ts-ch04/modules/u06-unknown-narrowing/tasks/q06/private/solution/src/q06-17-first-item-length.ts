// 問17 配列で、最初の要素が文字列なら、その文字数を返す。それ以外は 0
//     例: firstItemLength(["abc", 1]) → 3
// 引数と戻り値に型注釈を付けます。
// 配列かどうかは Array.isArray で確かめます。
export function firstItemLength(value: unknown): number {
  if (Array.isArray(value)) {
    const first: unknown = value[0];
    if (typeof first === "string") {
      return first.length;
    }
  }
  return 0;
}
