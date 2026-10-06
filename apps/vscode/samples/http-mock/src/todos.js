/**
 * API から ToDo の一覧を取り、終わっていないものだけを返す。
 * @param {string} baseUrl 例 "https://api.example.test"
 * @returns {Promise<{ id: number, title: string, done: boolean }[]>}
 */
export async function fetchOpenTodos(baseUrl) {
  const response = await fetch(new URL("/todos", baseUrl));
  // TODO: 応答の状態コードが失敗 (response.ok が false) のときは、エラーにする
  const todos = await response.json();
  return todos.filter((todo) => !todo.done);
}
