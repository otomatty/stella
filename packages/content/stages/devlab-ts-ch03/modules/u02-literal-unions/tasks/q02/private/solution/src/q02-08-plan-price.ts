// 問8 月額料金を返す。free は 0、pro は 1000、enterprise は 5000
//     例: planPrice("pro") → 1000
// 引数と戻り値に型注釈を付ける。
// 定義済みの Plan 型を使う。

export type Plan = "free" | "pro" | "enterprise";

export function planPrice(plan: Plan): number {
  if (plan === "free") {
    return 0;
  }
  if (plan === "pro") {
    return 1000;
  }
  return 5000;
}
