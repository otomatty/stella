// 問10 ids のユーザーの取得を map で一度に始め、Promise.all で待って、名前の配列を返す
//     例: namesAtOnce([2, 4]) → ["佐藤", "田中"] で解決する
// async と await を使ってください。
// 戻り値の型は Promise<…> と明記してください。
// ユーザーの取得には定義済みの fetchUser を使ってください。

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

export async function namesAtOnce(ids: readonly number[]): Promise<string[]> {
  const users = await Promise.all(ids.map((id) => fetchUser(id)));
  return users.map((u) => u.name);
}
