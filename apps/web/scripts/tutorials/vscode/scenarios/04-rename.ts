import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { explorerRow, rightClick, type Scenario } from "../helpers";

export default {
  id: "rename",
  title: "ファイルの名前を変える",
  summary: "「名前の変更」で名前を変え、拡張子で種類を確かめます。",
  topic: "dev-env-basics/modules/u03-files/l1-files-and-folders/t2-rename",
  task: "dev-env-basics/u03-files/q03-rename",
  others: [
    "dev-env-basics/u02-first-task/q01-first-page",
    "dev-env-basics/u03-files/q01-note-file",
  ],
  open: "memo.txt",

  async run(t, { taskRoot, page }) {
    const original = await readFile(path.join(taskRoot, "memo.txt"), "utf8");
    const memo = explorerRow(page, "memo.txt");
    const plan = explorerRow(page, "plan.txt");
    const input = page.locator(".explorer-folders-view input");

    await t.caption("memo.txt の名前を plan.txt に変えます。", {
      hold: 8000,
      say: "メモ ドット テキストの名前を、プラン ドット テキストに変えます。",
    });
    await t.expect(memo);
    await t.highlight(memo, 3000);

    await t.caption("一覧の memo.txt を右クリックします。", {
      hold: 8000,
      say: "一覧のメモ ドット テキストを右クリックします。",
    });
    await rightClick(t, memo);

    await t.caption("「名前の変更」を選びます。", { hold: 8000 });
    await t.click(page.locator(".monaco-menu .action-label").filter({ hasText: /^名前の変更/ }));
    await t.expect(input);

    await t.caption("名前の前半を plan に変えます。拡張子の .txt は残します。", {
      hold: 11000,
      say: "名前の前半をプランに変えます。拡張子のドット テキストは残します。",
    });
    await t.type("plan");
    await t.expect(input);
    if ((await input.inputValue()) !== "plan.txt") {
      throw new Error("名前の入力欄が plan.txt になっていません。");
    }

    await t.caption("Enter キーで決めます。", {
      hold: 8000,
      say: "エンターキーで決めます。",
    });
    await t.press("Enter");
    await t.park();

    await t.caption("一覧の名前が plan.txt に変わりました。", {
      hold: 9000,
      say: "一覧の名前がプラン ドット テキストに変わりました。",
    });
    await t.expect(plan);
    await t.expect(memo, { count: 0 });
    await t.highlight(plan, 3500);
    await t.poster();

    const saved = await readFile(path.join(taskRoot, "plan.txt"), "utf8");
    const files = await readdir(taskRoot);
    if (saved !== original || files.includes("memo.txt")) {
      throw new Error("名前を変えたファイルの本文、または元のファイルが無いことを確認できません。");
    }
  },
} satisfies Scenario;
