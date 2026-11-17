// 08-q05 複数のAPIの結果をまとめる ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/promise
//       https://typescriptbook.jp/reference/asynchronous/await

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

// 問20
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
