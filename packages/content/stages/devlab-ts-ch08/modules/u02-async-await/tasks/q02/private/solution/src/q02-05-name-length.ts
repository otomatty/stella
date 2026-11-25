// 問5 async のアロー関数で書く。export const nameLength = async (id: number): Promise<number> => … の形で、名前の文字数を返す
//     例: nameLength(1) → 2 で解決する
// fetchUser の結果は await で受け取ってください。

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

export const nameLength = async (id: number): Promise<number> => {
  const user = await fetchUser(id);
  return user.name.length;
};
