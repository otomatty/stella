// 08-q03 fetch でAPIを呼ぶ
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://developer.mozilla.org/ja/docs/Web/API/Fetch_API/Using_Fetch
//
// 問題
// fetch を使って、ユーザーと投稿のAPI（API_URL）を呼ぶ関数を書いてください。async と await を使うこと。
// テストでは fetch を差し替えて、本物の通信はしません。
// res.json() の戻り値は any なので、そのまま使わずに unknown の変数に入れ、型ガード関数で確かめてから使うこと。
//
// 1. getJson(url)
//    url を fetch する。res.ok が false なら `HTTP 404` の形（数字はステータスコード）の Error を投げる。
//    ok なら res.json() の結果を返す。戻り値の型は Promise<unknown>
//
// 2. isUser(value)
//    value が { id: number; name: string } の形なら true。戻り値の型は value is User
//
// 3. getUser(id)
//    getJson で `${API_URL}/users/${id}` を取得し、User の形なら返す。違えば "ユーザーの形が違います" の Error を投げる
//
// 4. searchUsers(keyword)
//    `${API_URL}/users?q=キーワード` を取得し、User の配列を返す。
//    キーワードは encodeURIComponent で変換する。配列でない、または User でない要素があれば "ユーザーの形が違います" の Error
//
// 5. createPost(post)
//    `${API_URL}/posts` に POST する。fetch の2つ目の引数に次を渡す
//      method: "POST"
//      headers: { "Content-Type": "application/json" }
//      body: JSON.stringify(post)
//    res.ok が false なら `HTTP 400` の形の Error を投げる。ok なら作られた投稿の id（レスポンスの { id: number } の id）を返す。
//    レスポンスに数値の id がなければ "投稿の形が違います" の Error を投げる

export const API_URL = "https://api.example.com";

export type User = { id: number; name: string };
export type NewPost = { userId: number; title: string };

export function getJson() {}

export function isUser() {}

export function getUser() {}

export function searchUsers() {}

export function createPost() {}
