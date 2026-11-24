// 問6 分割代入で name と age を取り出し、「山田（30）」の形にする
//     例: userSummary(山田) → "山田（30）"
// 引数と戻り値には型注釈を付けます。
// 定義済みの User 型を使います。

export type User = { id: number; name: string; age: number; email: string };

export function userSummary(user: User): string {
  const { name, age } = user;
  return `${name}（${age}）`;
}
