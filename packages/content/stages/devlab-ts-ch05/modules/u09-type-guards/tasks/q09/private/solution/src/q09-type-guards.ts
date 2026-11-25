// 問題
// 戻り値の型を value is User のように書くと、true を返したとき、呼び出し側で value が User に絞り込まれる（型ガード関数）。
// asserts value is User と書くと、例外を投げずに戻ったとき、value が User に絞り込まれる（アサーション関数）。
// 型 User は定義済みです。
//
// 1. isString(value)
//    文字列なら true。戻り値の型は value is string
//
// 2. isUser(value)
//    null でないオブジェクトで、name が文字列、age が数値なら true。戻り値の型は value is User
//
// 3. isUserArray(value)
//    配列で、すべての要素が isUser を満たせば true。戻り値の型は value is User[]
//
// 4. assertIsUser(value)
//    User でなければ "User ではありません" の Error を投げる。戻り値の型は asserts value is User
//
// 5. parseUsers(json)
//    JSON の文字列を読み、User の配列なら返す。そうでなければ "User の配列ではありません" の Error を投げる。
//    JSON.parse の結果は any なので、いったん unknown の変数に入れてから isUserArray で確かめる

export type User = { name: string; age: number };

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "age" in value &&
    typeof value.name === "string" &&
    typeof value.age === "number"
  );
}

export function isUserArray(value: unknown): value is User[] {
  return Array.isArray(value) && value.every((item) => isUser(item));
}

export function assertIsUser(value: unknown): asserts value is User {
  if (!isUser(value)) {
    throw new Error("User ではありません");
  }
}

export function parseUsers(json: string): User[] {
  const data: unknown = JSON.parse(json);
  if (!isUserArray(data)) {
    throw new Error("User の配列ではありません");
  }
  return data;
}
