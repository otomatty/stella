# 08章 q05 複数のAPIの結果をまとめる

ドリルの問題を 1 問ずつ確認して提出してから、そのあとの問題に進みます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q05 | 複数のAPIの結果をまとめる | 20 問 | ★総合問題 |

## 課題の説明

次の20問を、async・await と Promise.all・Promise.allSettled を使って書いてください。

型 User・Post・Comment と、APIの代わりの関数 getUser・getPosts・getComments は定義済みです。

getUser(id) はいない id なら失敗し、getPosts(3) は必ず失敗します（投稿を取得できない人の例）。

待つ必要のない取得は、一度に始めて同時に待つこと。「順番に」と書いてある問題だけ、1つずつ待つ。

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

id のユーザーを取得する。いなければ失敗する

export function getUser(id: number): Promise<User> {

const user = USERS.find((u) => u.id === id);

return user === undefined

? Promise.reject(new Error(`ユーザー ${id} はいません`))

: Promise.resolve(user);

}

ユーザーの投稿を取得する。userId が 3 なら失敗する

export function getPosts(userId: number): Promise<Post[]> {

return userId === 3

? Promise.reject(new Error("投稿を取得できません"))

: Promise.resolve(POSTS.filter((p) => p.userId === userId));

}

投稿のコメントを取得する

export function getComments(postId: number): Promise<Comment[]> {

return Promise.resolve(COMMENTS.filter((c) => c.postId === postId));

}

総合問題では、q01 の `timeout` と q04 の `Result<T>`・`tryAsync`・`withRetry` を `src/q05-aggregate.ts` の中でもう一度書きます。

## 進め方

1 問確認して提出し、次の問題へ進みます。

VS Code 拡張で「STELLA: 課題を確認する」を実行し、課題のパネルから提出します。

問題を全部提出すると、この課題は合格になります。合否は手元のテストが通ったという申告で、サーバーはコードを実行しません。

ドリルの問題は `src/q05-01-user-with-posts.ts` のように、番号・問の番号・名前で 1 問 1 ファイルです。応用問題や、クラス・型を 1 ファイルにまとめた問題は `src/q05-aggregate.ts` のような名前です。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く

## 教材

- [サバイバルTypeScript: Promise (promise)](https://typescriptbook.jp/reference/asynchronous/promise)
- [サバイバルTypeScript: async と await (async)](https://typescriptbook.jp/reference/asynchronous/async)
- [サバイバルTypeScript: async と await (await)](https://typescriptbook.jp/reference/asynchronous/await)
