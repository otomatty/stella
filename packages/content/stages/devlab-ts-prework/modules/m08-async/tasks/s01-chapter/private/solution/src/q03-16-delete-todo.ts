// 08-q03 fetch ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://developer.mozilla.org/ja/docs/Web/API/Fetch_API/Using_Fetch

export const API = "https://api.example.com";

// 問16
export async function deleteTodo(id: number): Promise<boolean> {
  const res = await fetch(`${API}/todos/${id}`, { method: "DELETE" });
  return res.ok;
}
