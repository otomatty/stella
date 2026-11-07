// 05-q09 型ガード関数とアサーション関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/type-guard-functions
//       https://typescriptbook.jp/reference/functions/assertion-functions

export type User = { name: string; age: number };

export type Admin = User & { role: "admin" };

// 問8
export function isAdmin(user: User | Admin): user is Admin {
  return "role" in user;
}
