// 08-q05 複数のAPIの結果をまとめる ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/promise
//       https://typescriptbook.jp/reference/asynchronous/await
//
// async・await と Promise.all・Promise.allSettled を使って書いてください。
// 型 User・Post・Comment と、APIの代わりの関数 getUser・getPosts・getComments は定義済みです。
// getUser(id) はいない id なら失敗し、getPosts(3) は必ず失敗します（投稿を取得できない人の例）。
// 待つ必要のない取得は、一度に始めて同時に待つこと。「順番に」と書いてある問題だけ、1つずつ待つ。

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

// 問20 ids を size 人ずつに区切り、区切りの中は同時に、区切りどうしは順番に取得して、名前の配列を返す（ids の順）。size が1未満なら Error
//     例: loadInBatches([1, 2, 3, 4], 3) → [1, 2, 3] を同時に取得してから [4] を取得し、["山田", "佐藤", "鈴木", "田中"] で解決する
export function loadInBatches() {}
