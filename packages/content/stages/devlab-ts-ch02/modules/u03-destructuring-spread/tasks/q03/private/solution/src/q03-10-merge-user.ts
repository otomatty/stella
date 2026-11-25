// 問10 patch { name, email } の値で上書きした新しい User を返す
//     例: mergeUser(山田, { name: "山田太郎", email: "t@example.com" }) → name と email が変わった User
// 引数と戻り値には型注釈を付けます。
// 定義済みの User 型を使います。
// 元のオブジェクトを変えず、スプレッド構文で新しいオブジェクトを作ります。

export type User = { id: number; name: string; age: number; email: string };

export function mergeUser(user: User, patch: { name: string; email: string }): User {
  return { ...user, ...patch };
}
