// 問11 ids のユーザーを同時に取得し、いちばん年上の人の名前を返す。ids が空なら undefined
//     例: oldestName([1, 3, 4]) → "鈴木" で解決する
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

export async function oldestName(ids: readonly number[]): Promise<string | undefined> {
  const users = await Promise.all(ids.map((id) => fetchUser(id)));
  let oldest: User | undefined;
  for (const user of users) {
    if (oldest === undefined || user.age > oldest.age) {
      oldest = user;
    }
  }
  return oldest?.name;
}
