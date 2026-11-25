// 問10 小文字にして、Plan のどれかならそれを返す。違えば undefined
//     例: parsePlan("Pro") → "pro"
// 引数と戻り値に型注釈を付ける。
// 定義済みの Plan 型を使う。

export type Plan = "free" | "pro" | "enterprise";

export function parsePlan(text: string): Plan | undefined {
  const value = text.toLowerCase();
  if (value === "free" || value === "pro" || value === "enterprise") {
    return value;
  }
  return undefined;
}
