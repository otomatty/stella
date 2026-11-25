// 問12 文字列に含まれる数字（0〜9）の合計を返す
//     例: digitTotal("a1b2c3") → 6
// 引数と戻り値に型注釈を付けます。
// for 文か for-of 文で回します。map や filter などでループを置き換えないでください。
export function digitTotal(text: string): number {
  let total = 0;
  for (const c of text) {
    if (c >= "0" && c <= "9") {
      total += Number(c);
    }
  }
  return total;
}
