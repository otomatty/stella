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

export type Todo = { id: number; title: string; done: boolean };

export function isTodo(value: unknown): value is Todo {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "title" in value &&
    typeof value.title === "string" &&
    "done" in value &&
    typeof value.done === "boolean"
  );
}

// 問10 `${API}/todos` を取得し、done が true の TODO の数を返す。形が違えば "TODO の形が違います" の Error
//     例: countDone() → 1 で解決する
export function countDone() {}
