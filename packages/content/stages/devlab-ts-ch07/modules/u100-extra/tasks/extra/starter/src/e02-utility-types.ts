// 07-e02 発展問題 Exclude・Extract・NonNullable・ReturnType・Awaited
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/exclude
//       https://typescriptbook.jp/reference/type-reuse/utility-types/extract
//       https://typescriptbook.jp/reference/type-reuse/utility-types/nonnullable
//       https://typescriptbook.jp/reference/type-reuse/utility-types/return-type
//       https://typescriptbook.jp/reference/type-reuse/utility-types/awaited
//
// 問題
// 型 Status、AppEvent、MaybeName と、関数 createSession、fetchUser は定義済みです。
// 次の型を、それぞれのユーティリティ型を使って作り、export してください。型を手で書き並べないこと。
//
// 1. 型 ActiveStatus: Status から "archived" と "deleted" を除いた型（Exclude）
// 2. 型 ClickEvent: AppEvent のうち、type が "click" のものだけ（Extract）
// 3. 型 Name: MaybeName から null と undefined を除いた型（NonNullable）
// 4. 型 Session: createSession の戻り値の型（ReturnType）
// 5. 型 FetchedUser: fetchUser の戻り値（Promise）が解決した後の値の型（Awaited と ReturnType）
//
// 6. isActive(status) を書く。ActiveStatus なら true。戻り値の型は status is ActiveStatus

export type Status = "draft" | "published" | "archived" | "deleted";
export type AppEvent = { type: "click"; x: number; y: number } | { type: "key"; key: string };
export type MaybeName = string | null | undefined;

export function createSession(userId: number) {
  return { userId, token: `t-${userId}`, expiresAt: 0 };
}

export async function fetchUser(id: number) {
  await Promise.resolve();
  return { id, name: "山田" };
}

export type ActiveStatus = unknown;
export type ClickEvent = unknown;
export type Name = unknown;
export type Session = unknown;
export type FetchedUser = unknown;

export function isActive() {}
