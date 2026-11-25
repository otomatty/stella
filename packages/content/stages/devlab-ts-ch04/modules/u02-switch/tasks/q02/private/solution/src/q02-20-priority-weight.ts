// 問20 優先度 "high"、"middle"、"low" を 3、2、1 にする
//     例: priorityWeight("middle") → 2
// 引数と戻り値に型注釈を付けます。
// switch 文で分けます。
export function priorityWeight(priority: "high" | "middle" | "low"): number {
  switch (priority) {
    case "high":
      return 3;
    case "middle":
      return 2;
    case "low":
      return 1;
  }
}
