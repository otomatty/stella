// 問6 逆順にした新しい配列を返す（後ろから for 文で回して push する）
//     例: reverseArray(["a", "b", "c"]) → ["c", "b", "a"]
// 引数と戻り値に型注釈を付けます。
// map や filter などでループを置き換えないでください。
export function reverseArray(items: readonly string[]): string[] {
  const result: string[] = [];
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (item !== undefined) {
      result.push(item);
    }
  }
  return result;
}
