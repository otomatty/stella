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

// 問10
export async function countDone(): Promise<number> {
  const res = await fetch(`${API}/todos`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("TODO の形が違います");
  }
  const items: readonly unknown[] = data;
  if (!items.every(isTodo)) {
    throw new Error("TODO の形が違います");
  }
  return items.filter((todo) => todo.done).length;
}
