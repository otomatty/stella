// 08-q03 fetch ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://developer.mozilla.org/ja/docs/Web/API/Fetch_API/Using_Fetch
//
// 次の20問を、fetch と async・await を使って書いてください。定数 API、型 User・Todo、型ガード関数 isUser・isTodo は定義済みです。
// テストでは fetch を差し替えて、本物の通信はしません。fetch に渡した URL や設定（2つ目の引数）もテストで確かめます。
// res.json() の戻り値は any なので、const data: unknown = await res.json(); のように unknown の変数に入れてから確かめて使う。
// 「`HTTP 404` の Error」は、数字の部分を res.status にした Error のこと。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

export const API = "https://api.example.com";

export type User = { id: number; name: string };
export type Todo = { id: number; title: string; done: boolean };

export function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    "name" in value &&
    typeof value.name === "string"
  );
}

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

// 問1 url を fetch して、ステータスコード（res.status）を返す
//     例: getStatus("https://api.example.com/a") → 200 で解決する
export function getStatus() {}

// 問2 url を fetch して、res.ok を返す
//     例: isOk(url) → 成功なら true で解決する
export function isOk() {}

// 問3 url を fetch して、本文を文字列（res.text()）で返す
//     例: getText(url) → 本文で解決する
export function getText() {}

// 問4 url を fetch して、本文を JSON として読んだ結果（res.json()）を返す。戻り値の型は Promise<unknown>
//     例: getJson(url) → { a: 1 } で解決する
export function getJson() {}

// 問5 getJson と同じ。ただし res.ok が false なら `HTTP 404` の Error を投げる
//     例: getJsonOrThrow(url) → 404 なら Error("HTTP 404") で失敗する
export function getJsonOrThrow() {}

// 問6 `${API}/users/${id}` を取得し、isUser で確かめて User を返す。形が違えば "ユーザーの形が違います"、ok でなければ `HTTP 404` の Error
//     例: getUser(1) → { id: 1, name: "山田" } で解決する
export function getUser() {}

// 問7 `${API}/users/${id}` を取得する。404 なら null、ok なら User（形が違えば "ユーザーの形が違います" の Error）、それ以外は `HTTP 500` の Error
//     例: getUserOrNull(9) → 404 なら null で解決する
export function getUserOrNull() {}

// 問8 `${API}/users` を取得し、User の配列を返す。配列でない、または User でない要素があれば "ユーザーの形が違います" の Error
//     例: getUsers() → [{ id: 1, name: "山田" }] で解決する
export function getUsers() {}

// 問9 `${API}/todos` を取得し、TODO のタイトルの配列を返す。形が違えば "TODO の形が違います" の Error
//     例: getTodoTitles() → ["買い物", "掃除"] で解決する
export function getTodoTitles() {}

// 問10 `${API}/todos` を取得し、done が true の TODO の数を返す。形が違えば "TODO の形が違います" の Error
//     例: countDone() → 1 で解決する
export function countDone() {}

// 問11 `${API}/users?q=キーワード` を取得し、User の配列を返す。キーワードは encodeURIComponent で変換する。形が違えば "ユーザーの形が違います" の Error
//     例: searchUsers("山田") → `${API}/users?q=%E5%B1%B1%E7%94%B0` を取得する
export function searchUsers() {}

// 問12 `${API}/todos?page=2&per_page=10` の形の URL で取得し、Todo の配列を返す。クエリは URLSearchParams で作る。形が違えば "TODO の形が違います" の Error
//     例: getTodosPage(2, 10) → `${API}/todos?page=2&per_page=10` を取得する
export function getTodosPage() {}

// 問13 url に body を JSON で POST し、ステータスコードを返す。fetch の2つ目の引数は { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
//     例: postJson(url, { level: "info" }) → 201 で解決する
export function postJson() {}

// 問14 `${API}/todos` に { title, done: false } を JSON で POST し、作られた Todo を返す。ok でなければ `HTTP 400`、形が違えば "TODO の形が違います" の Error
//     例: createTodo("買い物") → { id: 5, title: "買い物", done: false } で解決する
export function createTodo() {}

// 問15 `${API}/todos/${id}` に { done } を JSON で送り（method は "PATCH"）、res.ok を返す
//     例: updateTodo(3, true) → true で解決する
export function updateTodo() {}

// 問16 `${API}/todos/${id}` を method "DELETE" で呼び、res.ok を返す（2つ目の引数は { method: "DELETE" } だけ）
//     例: deleteTodo(3) → true で解決する
export function deleteTodo() {}

// 問17 url を、ヘッダー Authorization: "Bearer トークン" を付けて取得し、本文の文字列を返す（2つ目の引数は { headers: { Authorization: … } } だけ）
//     例: getWithToken(url, "abc") → ヘッダー Authorization: "Bearer abc" を付けて取得する
export function getWithToken() {}

// 問18 urls をすべて同時に取得し（Promise.all）、本文の文字列の配列を返す
//     例: getAllTexts([url1, url2]) → ["a", "b"] で解決する
export function getAllTexts() {}

// 問19 urls を前から順番に取得し、最初に ok だったものの本文の文字列を返す（それより後ろは取得しない）。どれも ok でなければ "取得できませんでした" の Error
//     例: getFirstOk([404 の url, 200 の url, …]) → 2つ目の本文で解決する
export function getFirstOk() {}

// 問20 url の JSON を返す。通信の失敗（fetch が失敗）、ok でない、JSON として読めない、のどれでも undefined を返す
//     例: getJsonSafe(url) → 読めなければ undefined で解決する
export function getJsonSafe() {}
