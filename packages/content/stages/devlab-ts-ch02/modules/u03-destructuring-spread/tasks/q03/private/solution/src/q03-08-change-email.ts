// 問8 email だけを変えた新しい User を返す
//     例: changeEmail(山田, "new@example.com") → email が変わった新しい User
// 引数と戻り値には型注釈を付けます。
// 定義済みの User 型を使います。
// 元のオブジェクトを変えず、スプレッド構文で新しいオブジェクトを作ります。

export type User = { id: number; name: string; age: number; email: string };

export function changeEmail(user: User, email: string): User {
  return { ...user, email };
}
