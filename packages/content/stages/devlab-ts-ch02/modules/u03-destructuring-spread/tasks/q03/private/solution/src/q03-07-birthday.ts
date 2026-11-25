// 問7 age を1増やした新しい User を返す
//     例: birthday(30歳の山田) → age が 31 の新しい User
// 引数と戻り値には型注釈を付けます。
// 定義済みの User 型を使います。
// 元のオブジェクトを変えず、スプレッド構文で新しいオブジェクトを作ります。

export type User = { id: number; name: string; age: number; email: string };

export function birthday(user: User): User {
  return { ...user, age: user.age + 1 };
}
