import { readFile } from "node:fs/promises";
import path from "node:path";
import { closeNotifications, dragText, saveFile, type Scenario, webviewBody } from "../helpers";

export default {
  id: "run-check",
  title: "課題を確認する",
  summary: "手元で確認し、通らなければ直して確認し直します。",
  topic: "dev-env-basics/modules/u02-first-task/l1-first-task/t3-run-check",
  task: "dev-env-basics/u02-first-task/q01-first-page",
  open: "index.html",

  async run(t, { taskRoot, page }) {
    const runTask = page.locator('[id="saedgewell.stella-lms.stella.runTask"]');
    const resultTab = page.locator('.tabs-container .tab[aria-label^="確認: 最初のページを作る"]');
    const result = webviewBody(page);
    const heading = page
      .locator(".monaco-editor .view-lines .view-line")
      .filter({ hasText: "ここを変更します" })
      .first();

    await t.caption("下のステータスバーを見ます。「課題を確認する」を押します。", {
      hold: 8000,
    });
    await t.expect(runTask);
    await t.highlight(runTask, 2000);
    await t.settle();
    await t.hideCaption();
    await t.click(runTask);
    await t.expect(resultTab);
    await t.expect(result.locator(".outcome.failed"), {
      text: "直すところがあります",
      timeout: 30_000,
    });
    await closeNotifications(page, t);
    await t.park();

    await t.caption("結果の1行目を読みます。直すところがあります。", { hold: 8000 });
    await t.highlight(result.locator(".outcome.failed"), 3000);

    await t.caption("通らなかった項目のメッセージを読みます。", { hold: 8000 });
    const message = result.locator(".tests pre").filter({ hasText: "<h1>" });
    await t.expect(message, {
      text: "<h1> の文字が「はじめてのページ」になっていません (いまは「ここを変更します」)",
    });
    await t.highlight(message, 3500);

    await t.caption("課題文の指定どおり、見出しを直します。", { hold: 11000 });
    await t.expect(heading);
    await dragText(t, heading, "ここを変更します");
    await t.type("はじめてのページ");
    await t.expect(
      page.locator(".monaco-editor .view-lines .view-line").filter({
        hasText: "はじめてのページ",
      }),
      { text: /^\s*<h1>はじめてのページ<\/h1>\s*$/ },
    );

    await t.caption("直したら、保存します。", { hold: 8000 });
    await saveFile(t);
    await t.expect('.tabs-container .tab.dirty[aria-label^="index.html"]', { count: 0 });

    await t.caption("もう一度「課題を確認する」を押します。", { hold: 8000 });
    await t.highlight(runTask, 2000);
    await t.settle();
    await t.hideCaption();
    await t.click(runTask);
    await t.expect(result.locator(".outcome.passed"), {
      text: "すべて通りました",
      timeout: 30_000,
    });
    await closeNotifications(page, t);
    await t.park();

    await t.caption("「すべて通りました」と出れば、手元の確認は完了です。", { hold: 9000 });
    await t.highlight(result.locator(".outcome.passed"), 3500);
    await t.poster();

    const saved = await readFile(path.join(taskRoot, "index.html"), "utf8");
    if (!saved.includes("<h1>はじめてのページ</h1>")) {
      throw new Error("保存した index.html に変更した見出しがありません。");
    }
    const lastRun = JSON.parse(
      await readFile(path.join(taskRoot, ".stella", "last-run.json"), "utf8"),
    );
    if (
      lastRun.taskId !== "dev-env-basics/u02-first-task/q01-first-page" ||
      lastRun.outcome !== "passed"
    ) {
      throw new Error("この課題の手元の確認が通った記録がありません。");
    }
  },
} satisfies Scenario;
