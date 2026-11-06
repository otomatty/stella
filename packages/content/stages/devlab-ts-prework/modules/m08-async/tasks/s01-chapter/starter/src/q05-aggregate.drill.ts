// 08-q05 複数のAPIの結果をまとめる ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/promise
//       https://typescriptbook.jp/reference/asynchronous/await
//
// 次の20問を、async・await と Promise.all・Promise.allSettled を使って書いてください。
// 型 User・Post・Comment と、APIの代わりの関数 getUser・getPosts・getComments は定義済みです。
// getUser(id) はいない id なら失敗し、getPosts(3) は必ず失敗します（投稿を取得できない人の例）。
// 待つ必要のない取得は、一度に始めて同時に待つこと。「順番に」と書いてある問題だけ、1つずつ待つ。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

export type User = { id: number; name: string };
export type Post = { id: number; userId: number; title: string };
export type Comment = { postId: number; text: string };

const USERS: User[] = [
  { id: 1, name: "山田" },
  { id: 2, name: "佐藤" },
  { id: 3, name: "鈴木" },
  { id: 4, name: "田中" },
];
const POSTS: Post[] = [
  { id: 10, userId: 1, title: "TypeScript を始めました" },
  { id: 11, userId: 1, title: "型注釈のこつ" },
  { id: 12, userId: 2, title: "非同期処理のまとめ" },
  { id: 13, userId: 1, title: "ジェネリクスに挑戦" },
];
const COMMENTS: Comment[] = [
  { postId: 10, text: "いいですね" },
  { postId: 10, text: "参考になりました" },
  { postId: 12, text: "わかりやすい" },
  { postId: 13, text: "難しそう" },
];

// id のユーザーを取得する。いなければ失敗する
export function getUser(id: number): Promise<User> {
  const user = USERS.find((u) => u.id === id);
  return user === undefined
    ? Promise.reject(new Error(`ユーザー ${id} はいません`))
    : Promise.resolve(user);
}

// ユーザーの投稿を取得する。userId が 3 なら失敗する
export function getPosts(userId: number): Promise<Post[]> {
  return userId === 3
    ? Promise.reject(new Error("投稿を取得できません"))
    : Promise.resolve(POSTS.filter((p) => p.userId === userId));
}

// 投稿のコメントを取得する
export function getComments(postId: number): Promise<Comment[]> {
  return Promise.resolve(COMMENTS.filter((c) => c.postId === postId));
}

// 問1 getUser と getPosts を同時に呼び（Promise.all）、{ user, posts } を返す。どちらかが失敗したら、その失敗を投げる
//     例: userWithPosts(2) → { user: { id: 2, name: "佐藤" }, posts: [id 12 の投稿] } で解決する
export function userWithPosts() {}

// 問2 ユーザーの投稿の数を返す
//     例: postCount(1) → 3 で解決する
export function postCount() {}

// 問3 ユーザーの投稿のタイトルの配列を返す
//     例: postTitles(2) → ["非同期処理のまとめ"] で解決する
export function postTitles() {}

// 問4 ids のユーザーを同時に取得し、名前の配列を返す（ids の順）。1人でも失敗したら、その失敗を投げる
//     例: namesOf([3, 1]) → ["鈴木", "山田"] で解決する
export function namesOf() {}

// 問5 ids のユーザーの投稿を同時に取得し、投稿の数の合計を返す
//     例: totalPosts([1, 2]) → 4 で解決する
export function totalPosts() {}

// 問6 ids のユーザーを同時に取得し（Promise.allSettled）、取得できたユーザーだけの配列を返す（ids の順）
//     例: loadedUsers([1, 9, 2]) → [山田, 佐藤] で解決する
export function loadedUsers() {}

// 問7 ids のユーザーを同時に取得し、取得できなかった id の配列を返す（ids の順）
//     例: missingIds([1, 9, 2, 8]) → [9, 8] で解決する
export function missingIds() {}

// 問8 ユーザーと投稿を同時に取得し、"山田（投稿 3件）" の形の文字列を返す
//     例: userSummary(1) → "山田（投稿 3件）" で解決する
export function userSummary() {}

// 問9 投稿のコメントの数を返す
//     例: commentCount(10) → 2 で解決する
export function commentCount() {}

// 問10 ユーザーの投稿を取得してから、それぞれの投稿のコメントを同時に取得し、コメントの text を1つの配列にまとめて返す（投稿の順）
//     例: commentsOfUser(1) → ["いいですね", "参考になりました", "難しそう"] で解決する
export function commentsOfUser() {}

// 問11 ユーザーの投稿のうち、id がいちばん大きいもののタイトルを返す。投稿がなければ undefined
//     例: latestPostTitle(1) → "ジェネリクスに挑戦" で解決する
export function latestPostTitle() {}

// 問12 ids の投稿を同時に取得し、{ id: 投稿の数 } のオブジェクト（Record<number, number>）を返す。取得に失敗した id は入れない
//     例: postCountsById([1, 2, 3]) → { 1: 3, 2: 1 } で解決する
export function postCountsById() {}

// 問13 userWithPosts と同じ { user, posts } を返す。ただし、どちらかが失敗したら null を返す
//     例: profileOrNull(3) → null で解決する
export function profileOrNull() {}

// 問14 ids のユーザーと投稿をすべて同時に取得し、ユーザーを取得できた人だけ { name, postCount } の配列にする（ids の順）。投稿の取得に失敗した人の postCount は null
//     例: dashboard([1, 3, 9, 4]) → [{ name: "山田", postCount: 3 }, { name: "鈴木", postCount: null }, { name: "田中", postCount: 0 }]
export function dashboard() {}

// 問15 ids のユーザーと投稿を同時に取得し、投稿がいちばん多い人の名前を返す。ユーザーか投稿の取得に失敗した人は除く。だれもいなければ undefined
//     例: mostActive([2, 1, 4]) → "山田" で解決する
export function mostActive() {}

// 問16 ids のユーザーと投稿を同時に取得し、すべての投稿を { title, author: 書いた人の名前 } の配列にする（ids の順、その中は投稿の順）。失敗したらその失敗を投げる
//     例: postsWithAuthor([2]) → [{ title: "非同期処理のまとめ", author: "佐藤" }] で解決する
export function postsWithAuthor() {}

// 問17 ids の投稿を同時に取得し、タイトルに keyword を含む投稿のタイトルの配列を返す。投稿の取得に失敗した人は飛ばす
//     例: searchPosts([1, 2, 3], "型") → ["型注釈のこつ"] で解決する
export function searchPosts() {}

// 問18 ユーザーの投稿を取得してから、それぞれの投稿のコメントを同時に取得し、コメントの数の合計を返す
//     例: commentTotal(1) → 3 で解決する
export function commentTotal() {}

// 問19 ids のユーザーを順番に1人ずつ取得し、最初に取得できた人の名前を返す（取得できたら後ろは取得しない）。だれも取得できなければ undefined
//     例: firstAvailableName([9, 8, 2, 1]) → "佐藤" で解決する
export function firstAvailableName() {}

// 問20 ids を size 人ずつに区切り、区切りの中は同時に、区切りどうしは順番に取得して、名前の配列を返す（ids の順）。size が1未満なら Error
//     例: loadInBatches([1, 2, 3, 4], 3) → [1, 2, 3] を同時に取得してから [4] を取得し、["山田", "佐藤", "鈴木", "田中"] で解決する
export function loadInBatches() {}
