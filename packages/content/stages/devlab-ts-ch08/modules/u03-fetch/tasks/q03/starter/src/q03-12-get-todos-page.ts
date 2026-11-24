// 問12 `${API}/todos?page=2&per_page=10` の形の URL で取得し、Todo の配列を返す。クエリは URLSearchParams で作る。形が違えば "TODO の形が違います" の Error
//     例: getTodosPage(2, 10) → `${API}/todos?page=2&per_page=10` を取得する
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

export function getTodosPage() {}
