// 08-q03 fetch ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://developer.mozilla.org/ja/docs/Web/API/Fetch_API/Using_Fetch

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

// 問12
export async function getTodosPage(page: number, perPage: number): Promise<Todo[]> {
  const query = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  const res = await fetch(`${API}/todos?${query.toString()}`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("TODO の形が違います");
  }
  const items: readonly unknown[] = data;
  if (!items.every(isTodo)) {
    throw new Error("TODO の形が違います");
  }
  return [...items];
}
