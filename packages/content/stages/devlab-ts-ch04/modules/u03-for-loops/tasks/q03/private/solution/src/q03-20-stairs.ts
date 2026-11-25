// 問20 "*" を1個、2個…n 個並べた文字列の配列を返す
//     例: stairs(3) → ["*", "**", "***"]
// 引数と戻り値に型注釈を付けます。
// for 文か for-of 文で繰り返します。map や filter などでループを置き換えないでください。
export function stairs(n: number): string[] {
  const result: string[] = [];
  for (let i = 1; i <= n; i++) {
    result.push("*".repeat(i));
  }
  return result;
}
