import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { defineClip, step } from "../lib/clips";

const starter = new URL(
  "../../../../../packages/content/stages/dev-env-basics/modules/u02-first-task/tasks/q01-first-page/starter/index.html",
  import.meta.url,
);

export default defineClip({
  id: "web/open-html",
  standalone: true,
  browser: {
    tab: "練習",
    address: "web-training/dev-env-basics/u02-first-task/q01-first-page/index.html",
  },
  regions: { heading: "h1", top: [0, 0, 800, 500], text: [0, 14, 440, 84] },
  async run(t) {
    const dir = await mkdtemp(path.join(os.tmpdir(), "stella-open-html-"));
    const file = path.join(dir, "index.html");
    try {
      const original = await readFile(starter, "utf8");
      const html = original.replace("<h1>ここを変更します</h1>", "<h1>はじめのページ</h1>");
      if (html === original) throw new Error("starter の見出しが見つかりません");
      await writeFile(file, html);
      const url = pathToFileURL(file).href;
      await t.mark("open", () =>
        step("open", async () => {
          await t.page.goto(url);
          await t.expect("h1", { text: "はじめのページ" });
          await t.wait(1000);
        }),
      );
      await writeFile(file, html.replace("<h1>はじめのページ</h1>", "<h1>はじめてのページ</h1>"));
      await t.mark("reload", () =>
        step("reload", async () => {
          await t.press("F5");
          await t.page.reload();
          await t.expect("h1", { text: "はじめてのページ" });
          await t.wait(1000);
        }),
      );
      await t.mark("done", () =>
        step("done", async () => {
          await t.wait(1200);
        }),
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
});
