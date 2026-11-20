// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

// 問17
export type Account = { plan: "free" } | { plan: "paid"; until: string };

export function accountText(account: Account): string {
  return account.plan === "free" ? "無料" : `有料（${account.until}まで）`;
}
