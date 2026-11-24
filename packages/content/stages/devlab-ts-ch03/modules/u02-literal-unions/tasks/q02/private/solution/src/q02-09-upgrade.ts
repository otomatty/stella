// 問9 1つ上のプランを返す。free → pro → enterprise。enterprise はそのまま
//     例: upgrade("free") → "pro"
// 引数と戻り値に型注釈を付ける。
// 定義済みの Plan 型を使う。

export type Plan = "free" | "pro" | "enterprise";

export function upgrade(plan: Plan): Plan {
  if (plan === "free") {
    return "pro";
  }
  return "enterprise";
}
