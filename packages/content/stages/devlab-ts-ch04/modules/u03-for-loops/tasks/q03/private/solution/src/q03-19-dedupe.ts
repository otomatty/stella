// 問19 重複を除いた新しい配列を返す。最初に出てきた順を保つ
//     例: dedupe(["a", "b", "a", "c", "b"]) → ["a", "b", "c"]
// 引数と戻り値に型注釈を付けます。
// for 文か for-of 文で回します。map や filter などでループを置き換えないでください。
export function dedupe(items: readonly string[]): string[] {
  const result: string[] = [];
  for (const item of items) {
    if (!result.includes(item)) {
      result.push(item);
    }
  }
  return result;
}
