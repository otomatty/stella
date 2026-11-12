import { readFile } from "node:fs/promises";
import path from "node:path";
import { dragText, saveFile, type Scenario } from "../helpers";

export default {
  id: "edit-save",
  title: "編集して保存する",
  summary: "課題のファイルを編集して、変更を保存します。",
  topic: "dev-env-basics/modules/u02-first-task/l1-first-task/t1-edit-save",
  task: "dev-env-basics/u02-first-task/q01-first-page",

  async run(t, { taskRoot }) {
    const indexTab = t.page.locator('.tabs-container .tab[aria-label^="index.html"]').first();
    const taskTab = t.page.locator('.tabs-container .tab[aria-label^="課題: "]');
    const taskPanel = t.page.locator(".editor-group-container").filter({ has: taskTab });
    const heading = t.page
      .locator(".monaco-editor .view-lines .view-line")
      .filter({ hasText: "ここを変更します" })
      .first();
    const dirtyTab = t.page.locator('.tabs-container .tab.dirty[aria-label^="index.html"]');

    await t.expect(indexTab);
    await t.expect(taskPanel);
    await t.caption("左に編集するファイル、右に課題文が開いています。", { hold: 8000 });
    await t.highlight(indexTab, 2000);
    await t.highlight(taskPanel, 2200);

    await t.caption("課題文を読みます。見出しを「はじめてのページ」に変えます。", {
      hold: 9000,
      say: "課題文を読みます。見出しを、はじめてのページ、に変えます。",
    });
    await t.highlight(taskPanel, 3500);

    await t.caption("h1 のタグの間の文字を選びます。", {
      hold: 9000,
      say: "エイチワンのタグの間の文字を選びます。",
    });
    await dragText(t, heading, "ここを変更します");

    await t.caption("「はじめてのページ」と入力します。タグは残します。", {
      hold: 9000,
      say: "はじめてのページ、と入力します。タグは残します。",
    });
    await t.type("はじめてのページ");
    await t.expect(
      t.page.locator(".monaco-editor .view-lines .view-line").filter({
        hasText: "はじめてのページ",
      }),
      { text: /^\s*<h1>はじめてのページ<\/h1>\s*$/ },
    );

    await t.caption("タブの丸印は、まだ保存していない印です。", { hold: 8000 });
    await t.expect(dirtyTab, { count: 1 });
    await t.highlight(dirtyTab, 3000);

    await t.caption("「ファイル」から「保存」を選びます。", {
      hold: 9000,
      say: "ファイルから、保存を選びます。",
    });
    await saveFile(t);

    await t.caption("丸印が消えました。変更がファイルに残りました。", { hold: 8000 });
    await t.expect(".tabs-container .tab.dirty", { count: 0 });
    await t.highlight(indexTab, 2500);
    await t.poster();
    const saved = await readFile(path.join(taskRoot, "index.html"), "utf8");
    if (!saved.includes("<h1>はじめてのページ</h1>")) {
      throw new Error("保存した index.html に変更した見出しがありません。");
    }
  },
} satisfies Scenario;
