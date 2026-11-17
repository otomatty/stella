// 08-q03 fetch ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://developer.mozilla.org/ja/docs/Web/API/Fetch_API/Using_Fetch
//
// fetch と async・await を使って書いてください。定数 API、型 User・Todo、型ガード関数 isUser・isTodo は定義済みです。
// テストでは fetch を差し替えて、本物の通信はしません。fetch に渡した URL や設定（2つ目の引数）もテストで確かめます。
// res.json() の戻り値は any なので、const data: unknown = await res.json(); のように unknown の変数に入れてから確かめて使う。
// 「`HTTP 404` の Error」は、数字の部分を res.status にした Error のこと。

export const API = "https://api.example.com";

// 問5 getJson と同じ。ただし res.ok が false なら `HTTP 404` の Error を投げる
//     例: getJsonOrThrow(url) → 404 なら Error("HTTP 404") で失敗する
export function getJsonOrThrow() {}
