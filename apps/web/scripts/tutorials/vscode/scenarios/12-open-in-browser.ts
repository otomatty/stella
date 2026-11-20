import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { step } from "../../lib/clips";
import { dragText, explorerRow, saveFile, type Scenario } from "../helpers";

const heading = /^\s*<h1>はじめてのページ<\/h1>\s*$/;

export default {
  id: "open-in-browser",
  clip: "vscode/open-in-browser",
  title: "ブラウザーで表示する",
  summary: "保存した HTML を表示し、見出しを直して保存します。",
  topic: "dev-env-basics/modules/u02-first-task/l1-first-task/t2-open-in-browser",
  task: "dev-env-basics/u02-first-task/q01-first-page",
  open: "index.html",
  regions: {
    explorer: [62, 84, 378, 876],
    editor: [440, 84, 578, 876],
    left: [0, 40, 1040, 650],
  },

  async prepare({ taskRoot }) {
    const file = path.join(taskRoot, "index.html");
    const html = await readFile(file, "utf8");
    const next = html.replace("<h1>ここを変更します</h1>", "<h1>はじめのページ</h1>");
    if (next === html) throw new Error("index.html に <h1>ここを変更します</h1> がありません");
    await writeFile(file, next);
  },

  async run(t, { taskRoot, page, region }) {
    await t.mark("reveal", () =>
      step("reveal", async () => {
        const row = explorerRow(page, "index.html");
        await t.moveTo(row);
        const box = await row.boundingBox();
        if (!box) throw new Error("index.html の行が見つかりません");
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
        const menu = page.locator(".context-view .monaco-menu");
        await t.expect(menu);
        const reveal = menu
          .locator(".action-item")
          .filter({ hasText: "エクスプローラーで表示する" });
        await t.pretendClick(reveal);
        await region("menu", menu);
        await region("reveal", reveal);
        await t.wait(1000);
      }),
    );
    await page.keyboard.press("Escape");
    await t.click(".monaco-editor .view-lines");

    await t.mark("edit", () =>
      step("edit", async () => {
        const line = page
          .locator(".monaco-editor .view-lines .view-line")
          .filter({ hasText: "はじめのページ" })
          .first();
        await dragText(t, line, "はじめのページ");
        await t.type("はじめてのページ");
        const edited = page
          .locator(".monaco-editor .view-lines .view-line")
          .filter({ hasText: heading })
          .first();
        await t.expect(edited, { text: heading });
        await region("code", edited);
        await t.wait(1000);
      }),
    );

    await t.mark("save", () =>
      step("save", async () => {
        await saveFile(t);
        await t.expect(page.locator('.tabs-container .tab.dirty[aria-label^="index.html"]'), {
          count: 0,
        });
        await region("tab", page.locator('.tabs-container .tab[aria-label^="index.html"]').first());
        await t.wait(1000);
      }),
    );

    await t.mark("done", () =>
      step("done", async () => {
        await t.wait(1200);
      }),
    );
    await step("saved", async () => {
      const saved = await readFile(path.join(taskRoot, "index.html"), "utf8");
      if (!saved.includes("<h1>はじめてのページ</h1>"))
        throw new Error("保存した index.html に <h1>はじめてのページ</h1> がありません");
    });
  },
} satisfies Scenario;
