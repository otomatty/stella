// 問17 型 Account（{ plan: "free" } か { plan: "paid"; until: string }）を定義して export し、accountText(account: Account) を書く。「無料」「有料（2026-12-31まで）」
//     例: accountText({ plan: "paid", until: "2026-12-31" }) → "有料（2026-12-31まで）"
// 引数と戻り値に型注釈を付ける。
// type と | を使い、判別可能なユニオン型を定義する。

export type Account = { plan: "free" } | { plan: "paid"; until: string };

export function accountText(account: Account): string {
  return account.plan === "free" ? "無料" : `有料（${account.until}まで）`;
}
