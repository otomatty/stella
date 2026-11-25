// 問9 要素を「-」でつないだ文字列を返す（join を使わない）
//     例: joinWithDash(["a", "b", "c"]) → "a-b-c"
// 引数と戻り値に型注釈を付けます。
// 番号も使うところは for 文か for-of 文で回します。map や filter などでループを置き換えないでください。
export function joinWithDash(items: readonly string[]): string {
  let result = "";
  for (const [i, item] of items.entries()) {
    result += i === 0 ? item : `-${item}`;
  }
  return result;
}
