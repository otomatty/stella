// 08-q02 async と await ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/async
//       https://typescriptbook.jp/reference/asynchronous/await
//
// async と await を使って書いてください。型 User と、関数 fetchUser、wait は定義済みです。
// fetchUser(id) は id のユーザーを取得します（いない id なら "ユーザー 9 はいません" の Error で失敗する）。
// 戻り値の型は Promise<number> のように書く。async 関数の中では、Promise の結果を await で受け取る。
// 失敗を受け止めるときは try・catch を使う。try の中で Promise を return するときは return await と書く。

export type User = { id: number; name: string; age: number };

const USERS: User[] = [
  { id: 1, name: "山田", age: 34 },
  { id: 2, name: "佐藤", age: 19 },
  { id: 3, name: "鈴木", age: 52 },
  { id: 4, name: "田中", age: 20 },
];

// id のユーザーを取得する。いなければ失敗する
export function fetchUser(id: number): Promise<User> {
  const user = USERS.find((u) => u.id === id);
  return user === undefined
    ? Promise.reject(new Error(`ユーザー ${id} はいません`))
    : Promise.resolve(user);
}

// 問5 async のアロー関数で書く。export const nameLength = async (id: number): Promise<number> => … の形で、名前の文字数を返す
//     例: nameLength(1) → 2 で解決する
// ここに nameLength をアロー関数で書く
