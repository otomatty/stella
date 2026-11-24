// 問20 ids を size 人ずつに区切り、区切りの中は同時に、区切りどうしは順番に取得して、名前の配列を返す（ids の順）。size が1未満なら Error
//     例: loadInBatches([1, 2, 3, 4], 3) → [1, 2, 3] を同時に取得してから [4] を取得し、["山田", "佐藤", "鈴木", "田中"] で解決する
// async と await を使ってください。
// ユーザーの取得には定義済みの getUser を使ってください。
// 同時に始めた取得は Promise.all で待ってください。

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

export async function loadInBatches(ids: readonly number[], size: number): Promise<string[]> {
  if (size < 1) {
    throw new Error("size は1以上にしてください");
  }
  const names: string[] = [];
  for (let i = 0; i < ids.length; i += size) {
    const users = await Promise.all(ids.slice(i, i + size).map((id) => getUser(id)));
    names.push(...users.map((u) => u.name));
  }
  return names;
}
