// 07-q04 Pick と Omit ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/pick
//       https://typescriptbook.jp/reference/type-reuse/utility-types/omit
//
// 次の20問を解いてください。型 User と Article は定義済みです。
// Pick<T, "a" | "b"> は指定したプロパティだけを取り出した型、Omit<T, "a" | "b"> は指定したプロパティを除いた型。
// 型を書く問題は、プロパティを手で書き並べず、Pick や Omit で作ること。関数は引数と戻り値に型注釈を付けること。
// Omit した型を返す関数は、返すオブジェクトに、除いたプロパティを含めないこと（テストで確かめます）。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

export type User = { id: number; name: string; email: string; password: string; age: number };
export type Article = {
  id: number;
  title: string;
  body: string;
  author: string;
  publishedAt: Date;
};

// 問1 型 UserName を、User から name だけを取り出して作る
// ここに型 UserName を書く

// 問2 型 UserContact を、User から name と email を取り出して作る
// ここに型 UserContact を書く

// 問3 型 SafeUser を、User から password を除いて作る
// ここに型 SafeUser を書く

// 問4 型 NewUser を、User から id を除いて作る
// ここに型 NewUser を書く

// 問5 型 ArticleSummary を、Article から id と title を取り出して作る
// ここに型 ArticleSummary を書く

// 問6 型 ArticleDraft を、Article から id と publishedAt を除いて作る
// ここに型 ArticleDraft を書く

// 問7 User から { name, email } を取り出して返す。戻り値は Pick<User, "name" | "email">
//     例: toContact(user) → { name: "山田", email: "y@example.com" }
export function toContact() {}

// 問8 User から password を除いたオブジェクトを返す。戻り値は Omit<User, "password">
//     例: toSafeUser(user) → password のない User
export function toSafeUser() {}

// 問9 Article から { id, title } を取り出して返す
//     例: toSummary(article) → { id: 1, title: "はじめまして" }
export function toSummary() {}

// 問10 Omit<User, "id"> と id から User を作る
//     例: createUser(input, 7).id → 7
export function createUser() {}

// 問11 下書き Omit<Article, "id" | "publishedAt"> に id と publishedAt を足して Article を作る
//     例: publish(draft, 1, 日時).id → 1
export function publish() {}

// 問12 Article の配列を Pick<Article, "id" | "title"> の配列にする
//     例: summaries(articles) → [{ id, title }, …]
export function summaries() {}

// 問13 User の配列から、password を除いた配列を返す
//     例: safeUsers(users) → password のない User の配列
export function safeUsers() {}

// 問14 型 UserPatch を、User の name、email、age だけを、どれも省略できるようにして作る（Partial と Pick）。patchUser(user, patch) は上書きした新しい User を返す
//     例: patchUser(user, { age: 31 }).age → 31
// ここに型 UserPatch と関数 patchUser を書く

// 問15 型 AuthorInfo を Pick<Article, "author"> & { articleCount: number } として作り、authorInfo(articles, author) でその人の記事の数を返す
//     例: authorInfo(articles, "山田") → { author: "山田", articleCount: 2 }
// ここに型 AuthorInfo と関数 authorInfo を書く

// 問16 id の User を探し、Pick<User, "name" | "email"> を返す。いなければ undefined
//     例: findContact(users, 1) → { name: "山田", email: "y@example.com" }
export function findContact() {}

// 問17 型 Credentials を Pick<User, "email" | "password"> として作る。login(users, credentials) は、email と password が一致する User を、password を除いて返す。いなければ undefined
//     例: login(users, { email: "y@example.com", password: "x" }) → password のない山田
// ここに型 Credentials と関数 login を書く

// 問18 型 PublicArticle を、Article から body を除いて作る。toPublicArticle(article) で PublicArticle を返す
//     例: toPublicArticle(article) → body のない Article
// ここに型 PublicArticle と関数 toPublicArticle を書く

// 問19 型 Teaser を Pick<Article, "title"> & { excerpt: string } として作る。toTeaser(article) の excerpt は body の先頭10文字（10文字を超えるときは「…」を付ける）
//     例: toTeaser(本文が「TypeScriptを始めよう」の記事).excerpt → "TypeScript…"
// ここに型 Teaser と関数 toTeaser を書く

// 問20 型 UserRow を Pick<User, "id" | "name" | "age"> として作る。toRows(users) で UserRow の配列を id の小さい順に返す
//     例: toRows(users) → [{ id: 1, name: "山田", age: 30 }, …]
// ここに型 UserRow と関数 toRows を書く
