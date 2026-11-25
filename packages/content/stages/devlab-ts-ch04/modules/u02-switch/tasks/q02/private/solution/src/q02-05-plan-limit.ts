// 問5 プラン "free"、"pro"、"team" の利用人数の上限を返す。1、10、100
//     例: planLimit("pro") → 10
// 引数と戻り値に型注釈を付けます。
// switch 文で分けます。
export function planLimit(plan: "free" | "pro" | "team"): number {
  switch (plan) {
    case "free":
      return 1;
    case "pro":
      return 10;
    case "team":
      return 100;
  }
}
