// 問10 英大文字（A〜Z）の数を返す
//     例: countUpper("TypeScript") → 2
// 引数と戻り値に型注釈を付けます。
// for 文か for-of 文で回します。map や filter などでループを置き換えないでください。
export function countUpper(text: string): number {
  let count = 0;
  for (const c of text) {
    if (c >= "A" && c <= "Z") {
      count++;
    }
  }
  return count;
}
