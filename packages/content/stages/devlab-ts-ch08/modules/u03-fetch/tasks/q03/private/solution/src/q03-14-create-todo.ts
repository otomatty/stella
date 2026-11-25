// 問14 `${API}/todos` に { title, done: false } を JSON で POST し、作られた Todo を返す。ok でなければ `HTTP 400`、形が違えば "TODO の形が違います" の Error
//     例: createTodo("買い物") → { id: 5, title: "買い物", done: false } で解決する
// fetch と async・await を使ってください。
// res.json() の結果を unknown 型の変数に入れ、形を確かめてから使ってください。
// TODO の形は定義済みの isTodo で確かめてください。
// HTTP エラーのメッセージには実際の res.status を入れてください。

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

export async function createTodo(title: string): Promise<Todo> {
  const res = await fetch(`${API}/todos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, done: false }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data: unknown = await res.json();
  if (!isTodo(data)) {
    throw new Error("TODO の形が違います");
  }
  return data;
}
