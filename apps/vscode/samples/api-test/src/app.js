import { Hono } from "hono";

/**
 * ToDo の API。テストごとに新しい状態で作れるよう、関数で組み立てる。
 * @param {{ id: number, title: string, done: boolean }[]} [initial]
 */
export function createApp(initial = []) {
  const todos = [...initial];
  const app = new Hono();

  app.get("/api/todos", (c) => c.json(todos));

  app.post("/api/todos", async (c) => {
    const body = await c.req.json().catch(() => null);
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    // TODO: title が空なら 400 と { error: "title を入力してください" } を返す
    const todo = { id: todos.length + 1, title, done: false };
    todos.push(todo);
    return c.json(todo, 201);
  });

  return app;
}
