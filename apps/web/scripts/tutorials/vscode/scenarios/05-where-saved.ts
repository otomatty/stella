import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expandFolder, explorerRow, type Scenario } from "../helpers";

export default {
  id: "where-saved",
  title: "保存先を確かめる",
  summary: "一番上のフォルダー名から、ファイルの保存先をたどります。",
  topic: "dev-env-basics/modules/u03-files/l1-files-and-folders/t3-where-saved",
  task: "dev-env-basics/u03-files/q01-note-file",
  others: ["dev-env-basics/u02-first-task/q01-first-page", "dev-env-basics/u03-files/q03-rename"],
  open: "note.txt",

  async prepare({ taskRoot }) {
    await writeFile(path.join(taskRoot, "note.txt"), "今日から学習を始めました\n", "utf8");
  },

  async setup(page) {
    await page
      .locator(".pane-header")
      .filter({ hasText: /web-training/i })
      .hover();
    await page
      .locator('.pane-header .action-label[aria-label^="エクスプローラーのフォルダーを折りたたむ"]')
      .click();
  },

  async run(t, { taskRoot, page }) {
    const root = page.locator(".pane-header").filter({ hasText: /web-training/i });
    const note = explorerRow(page, "note.txt");
    const breadcrumbs = page.locator(".breadcrumbs-control:visible").first();

    await t.caption("一番上のフォルダー名を確かめます。学習フォルダーの web-training です。", {
      hold: 11000,
      say: "一番上のフォルダー名を確かめます。学習フォルダーのウェブ トレーニングです。",
    });
    await t.expect(root);
    await t.highlight(root, 4000);

    await t.caption("ステージ、単元、課題の順にフォルダーを開きます。", { hold: 14000 });
    for (const name of ["dev-env-basics", "u03-files", "q01-note-file"]) {
      const folder = explorerRow(page, name);
      await t.expect(folder);
      await t.highlight(folder, 1200);
      await expandFolder(t, folder);
      await t.expect(folder.and(page.locator('[aria-expanded="true"]')));
    }
    await t.park();

    await t.caption("note.txt は、この課題のフォルダーの中にあります。", {
      hold: 9000,
      say: "ノート ドット テキストは、この課題のフォルダーの中にあります。",
    });
    await t.expect(note);
    await t.highlight(note, 3500);

    await t.caption("エディターの上のパンくずリストも、同じ場所を示します。", {
      hold: 10000,
    });
    for (const name of ["dev-env-basics", "u03-files", "q01-note-file", "note.txt"]) {
      await t.expect(breadcrumbs, { text: name });
    }
    await t.highlight(breadcrumbs, 4000);
    await t.poster();

    await t.caption("名前だけでなく、手前のフォルダーも読んで確かめましょう。", {
      hold: 9000,
    });
    const saved = await readFile(path.join(taskRoot, "note.txt"), "utf8");
    if (saved !== "今日から学習を始めました\n") {
      throw new Error("確かめた課題フォルダーに note.txt の元の文がありません。");
    }
  },
} satisfies Scenario;
