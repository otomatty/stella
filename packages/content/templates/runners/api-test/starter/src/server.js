import { serve } from "@hono/node-server";
import { createApp } from "./app.js";

// 自分の PC からだけ開ける (127.0.0.1)。止めるときは Ctrl+C。
const port = 3000;
serve({ fetch: createApp().fetch, hostname: "127.0.0.1", port }, () => {
  console.log(`http://127.0.0.1:${port}/api/todos で起動しました`);
});
