import { readFile } from "node:fs/promises";
import path from "node:path";
import { explorerRow, saveFile, type Scenario } from "../helpers";

export default {
  id: "new-file",
  title: "新しいファイルを作る",
  summary: "課題フォルダーを選んでからファイルを作り、保存します。",
  topic: "dev-env-basics/modules/u03-files/l1-files-and-folders/t1-new-file",
  task: "dev-env-basics/u03-files/q01-note-file",
  others: ["dev-env-basics/u02-first-task/q01-first-page"],
  open: null,

  async setup(page) {
    const stage = explorerRow(page, "dev-env-basics");
    if ((await stage.getAttribute("aria-expanded")) === "false") await stage.click();
    // この台本では単元の子が1つなので、単元と課題が同じ行にまとまる。
    const folder = explorerRow(page, "q01-note-file");
    await folder.waitFor({ state: "visible" });
    if ((await folder.getAttribute("aria-expanded")) === "true") await folder.click();
  },

  async run(t, { taskRoot, page }) {
    const folder = explorerRow(page, "q01-note-file");
    const note = explorerRow(page, "note.txt");
    const input = page.locator(".explorer-folders-view input");
    const tab = page.locator('.tabs-container .tab[aria-label^="note.txt"]').first();

    await t.caption("エクスプローラーで、この課題のフォルダーを選びます。", {
      hold: 9000,
    });
    await t.expect(folder);
    await t.highlight(folder, 2000);
    await t.click(folder);
    await t.expect(folder.and(page.locator('[aria-expanded="true"]')));

    await t.caption("「新しいファイル」のボタンを押します。", { hold: 8000 });
    await t.moveTo(folder);
    await t.click('.pane-header .action-label[aria-label^="新しいファイル"]');
    await t.expect(input);

    await t.caption("名前を note.txt と入力して、Enter キーで決めます。", {
      hold: 10000,
      say: "名前をノート ドット テキストと入力して、エンターキーで決めます。",
    });
    await t.type("note.txt");
    await t.press("Enter");
    await t.expect(note);
    await t.expect(tab);

    await t.caption("本文を入力します。", { hold: 8000 });
    await t.type("今日から学習を始めました");
    await t.expect(page.locator(".monaco-editor .view-lines .view-line"), {
      text: "今日から学習を始めました",
    });

    await t.caption("「ファイル」から「保存」を選びます。", { hold: 9000 });
    await saveFile(t);
    await t.expect('.tabs-container .tab.dirty[aria-label^="note.txt"]', { count: 0 });

    await t.caption("一覧で、課題フォルダーの中にあることを確かめます。", {
      hold: 9000,
    });
    await t.expect(note);
    await t.highlight(note, 3500);
    await t.poster();

    const saved = await readFile(path.join(taskRoot, "note.txt"), "utf8");
    if (!saved.includes("今日から学習を始めました")) {
      throw new Error("課題フォルダーの note.txt に指定した文が保存されていません。");
    }
  },
} satisfies Scenario;
