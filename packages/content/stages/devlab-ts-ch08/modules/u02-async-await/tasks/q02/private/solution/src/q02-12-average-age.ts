// 問12 ids のユーザーを同時に取得し、年齢の平均を返す。ids が空なら 0
//     例: averageAge([1, 2]) → 26.5 で解決する
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

export async function averageAge(ids: readonly number[]): Promise<number> {
  if (ids.length === 0) {
    return 0;
  }
  const users = await Promise.all(ids.map((id) => fetchUser(id)));
  return users.reduce((sum, u) => sum + u.age, 0) / users.length;
}
