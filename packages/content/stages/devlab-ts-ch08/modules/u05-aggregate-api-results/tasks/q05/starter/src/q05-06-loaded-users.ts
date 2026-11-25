// 問6 ids のユーザーを同時に取得し（Promise.allSettled）、取得できたユーザーだけの配列を返す（ids の順）
//     例: loadedUsers([1, 9, 2]) → [山田, 佐藤] で解決する
// async と await を使ってください。
// ユーザーの取得には定義済みの getUser を使ってください。

export type User = { id: number; name: string };

const USERS: User[] = [
  { id: 1, name: "山田" },
  { id: 2, name: "佐藤" },
  { id: 3, name: "鈴木" },
  { id: 4, name: "田中" },
];

// id のユーザーを取得する。いなければ失敗する
export function getUser(id: number): Promise<User> {
  const user = USERS.find((u) => u.id === id);
  return user === undefined
    ? Promise.reject(new Error(`ユーザー ${id} はいません`))
    : Promise.resolve(user);
}

export function loadedUsers() {}
