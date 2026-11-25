// 問16 【アサーション】User の形でなければ "User ではありません" の Error を投げる。戻り値の型は asserts value is User
//     例: assertUser({}) → Error
// ファイル内に定義済みの User 型を使ってください。

export type User = { name: string; age: number };

export function assertUser(value: unknown): asserts value is User {
  if (
    typeof value !== "object" ||
    value === null ||
    !("name" in value) ||
    !("age" in value) ||
    typeof value.name !== "string" ||
    typeof value.age !== "number"
  ) {
    throw new Error("User ではありません");
  }
}
