// 08-q05 ★総合問題 複数のAPIの結果をまとめる
//
// 教材: 08章のこれまでの教材
//       https://typescriptbook.jp/reference/asynchronous/promise
//
// 問題
// ユーザーを取得する getUser と、ユーザーの投稿を取得する getPosts を持つ api（型は Api）を受け取り、
// ダッシュボードに出す情報をまとめる関数を書いてください。async と await を使うこと。
// 待つ必要のない取得は、一度に始めて同時に待つこと（Promise.all、Promise.allSettled）。
//
// 1. loadProfile(api, userId)
//    getUser と getPosts を同時に呼び、{ user, posts } を返す。どちらかが失敗したら、その失敗をそのまま投げる。
//    2つとも 1000 ミリ秒以内に終わらなければ "タイムアウトしました" の Error を投げる
//
// 2. loadUsers(api, ids)
//    ids のユーザーを同時に取得する。失敗したユーザーがいても止めず、
//    { users: 取得できた User の配列, failedIds: 取得できなかった id の配列 } を返す（どちらも ids の順）
//
// 3. loadDashboard(api, ids)
//    ids のそれぞれについて、getUser と getPosts をすべて同時に呼ぶ。
//    ユーザーを取得できた人だけを ids の順に並べ、{ name: 名前, postCount: 投稿の数 } の配列を返す。
//    投稿の取得は、失敗したら1回だけやり直す（全部で2回まで）。2回とも失敗した人の postCount は null にする
//
// 4. formatDashboard(rows)
//    loadDashboard の結果を、1人1行の文字列にして改行（\n）でつなぐ。
//      投稿数が分かる人: "山田: 投稿 3件"
//      postCount が null の人: "佐藤: 投稿数を取得できませんでした"
//    rows が空なら "表示できるユーザーがいません"
//
// このファイルに書く関数と型（export は不要）
// - timeout(promise, ms): promise が ms ミリ秒以内に解決したらその値で解決する。
//   間に合わなければ "タイムアウトしました" の Error で失敗する（Promise.race）。
//   型変数を使い、引数の Promise の中身の型と戻り値の Promise の中身の型をそろえる。loadProfile で使う。
// - Result<T>: 成功の { ok: true, value: T } と、失敗の { ok: false, error: Error } を表す型。
// - tryAsync(fn): fn() を待ち、成功なら { ok: true, value: 値 }、失敗なら { ok: false, error: Error } を返す。
//   Error 以外が投げられたら、その値を String で文字列にして Error のメッセージにする。
//   戻り値は Promise<Result<T>>。loadUsers と loadDashboard で取得の成功と失敗を分けるときに使う。
// - withRetry(fn, attempts): 成功するまで fn() を全部で attempts 回まで呼び、成功したらその値を返す。
//   すべて失敗したら最後の失敗をそのまま投げる。attempts が 1 未満なら Error を投げる。
//   loadDashboard の投稿の取得で使う。try の中で Promise を返すときは return await と書く。

function timeout() {}

type Result<T> = unknown;

function tryAsync() {}

function withRetry() {}

export type User = { id: number; name: string };
export type Post = { id: number; userId: number; title: string };
export type Api = {
  getUser: (id: number) => Promise<User>;
  getPosts: (userId: number) => Promise<Post[]>;
};
export type DashboardRow = { name: string; postCount: number | null };

export function loadProfile() {}

export function loadUsers() {}

export function loadDashboard() {}

export function formatDashboard() {}
