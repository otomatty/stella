// 問15 `${API}/todos/${id}` に { done } を JSON で送り（method は "PATCH"）、res.ok を返す
//     例: updateTodo(3, true) → true で解決する
// fetch と async・await を使ってください。

export const API = "https://api.example.com";

export async function updateTodo(id: number, done: boolean): Promise<boolean> {
  const res = await fetch(`${API}/todos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ done }),
  });
  return res.ok;
}
