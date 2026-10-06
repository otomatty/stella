/**
 * API から ToDo の一覧を取り、終わっていないものだけを返す。
 * @param {string} baseUrl 例 "https://api.example.test"
 * @returns {Promise<{ id: number, title: string, done: boolean }[]>}
 */
export async function fetchOpenTodos(baseUrl) {
  const response = await fetch(new URL("/todos", baseUrl));
  if (!response.ok) {
    throw new Error(`ToDo を取得できませんでした (${response.status})`);
  }
  const todos = await response.json();
  return todos.filter((todo) => !todo.done);
}
