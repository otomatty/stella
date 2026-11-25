// 問9 `${API}/todos` を取得し、TODO のタイトルの配列を返す。形が違えば "TODO の形が違います" の Error
//     例: getTodoTitles() → ["買い物", "掃除"] で解決する
// fetch と async・await を使ってください。
// res.json() の結果を unknown 型の変数に入れ、形を確かめてから使ってください。
// TODO の形は定義済みの isTodo で確かめてください。

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

export function getTodoTitles() {}
