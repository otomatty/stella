import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  closeNotifications,
  coverRegion,
  dragText,
  mergeRegions,
  runTaskButton,
  saveFile,
  type Scenario,
  webviewWith,
} from "../helpers";

const TASK = "dev-env-basics/u02-first-task/q01-first-page";
const FAILED_HEADING = "直すところがあります";
const PASSED_HEADING = "すべて通りました";
const HEADING_MESSAGE =
  "<h1> の文字が「はじめてのページ」になっていません (いまは「ここを変更します」)";

const regions: Record<string, [number, number, number, number]> = {
  editor: [440, 84, 578, 876],
  code: [476, 112, 490, 304],
  panel: [1022, 84, 568, 876],
  headline: [1119, 234, 310, 31],
  result: [1047, 219, 518, 385],
};

export default {
  id: "run-check-clip",
  clip: "vscode/run-check",
  title: "課題を確認する",
  summary: "手元で確認し、通らなければ直して保存し、確認し直します。",
  topic: "dev-env-basics/modules/u00-start/l1-how-stella-works/t1-learning-loop",
  task: TASK,
  open: "index.html",
  regions,

  async run(t, { taskRoot, page, region }) {
    const runTask = runTaskButton(page);
    const resultTab = page.locator('.tabs-container .tab[aria-label^="確認: 最初のページを作る"]');
    let result = page.locator("body");
    const heading = page
      .locator(".monaco-editor .view-lines .view-line")
      .filter({ hasText: "ここを変更します" })
      .first();
    const dirtyTab = page.locator('.tabs-container .tab.dirty[aria-label^="index.html"]');

    await t.mark("press-check", async () => {
      await t.expect(runTask);
      await t.click(runTask);
      await t.expect(resultTab);
      result = await webviewWith(page, ".summary.failed", 30_000);
      await t.expect(result.locator(".summary.failed .summary-title"), {
        text: FAILED_HEADING,
        timeout: 30_000,
      });
      await closeNotifications(page, t);
      await t.park();
      await t.wait(800);
    });

    await t.mark("fail", async () => {
      const summary = result.locator(".summary.failed");
      const title = summary.locator(".summary-title");
      await region("headline", title);
      regions.result = await coverRegion("result", [
        summary,
        result.locator("section.step.failed"),
      ]);
      await t.highlight(title, 1200);
      const message = result.locator(".test-fail pre").filter({ hasText: "<h1>" });
      await t.expect(message, { text: HEADING_MESSAGE });
      await t.highlight(message, 1500);
    });

    await t.mark("fix", async () => {
      await dragText(t, heading, "ここを変更します");
      await t.type("はじめてのページ");
      await t.expect(
        page.locator(".monaco-editor .view-lines .view-line").filter({
          hasText: "はじめてのページ",
        }),
        { text: /^\s*<h1>はじめてのページ<\/h1>\s*$/ },
      );
      await t.expect(dirtyTab, { count: 1 });
      await t.wait(800);
    });

    await t.mark("save", async () => {
      await saveFile(t);
      await t.expect(dirtyTab, { count: 0 });
      await t.wait(800);
    });

    await t.mark("recheck", async () => {
      await t.click(runTask);
      result = await webviewWith(page, ".summary.passed", 30_000);
      await t.expect(result.locator(".summary.passed .summary-title"), {
        text: PASSED_HEADING,
        timeout: 30_000,
      });
      await closeNotifications(page, t);
      await t.park();
      await t.wait(800);
    });

    await t.mark("pass", async () => {
      const summary = result.locator(".summary.passed");
      regions.result = mergeRegions(regions.result, await coverRegion("result", [summary]));
      await t.highlight(summary.locator(".summary-title"), 1800);
    });

    const saved = await readFile(path.join(taskRoot, "index.html"), "utf8");
    if (!saved.includes("<h1>はじめてのページ</h1>")) {
      throw new Error("保存した index.html に変更した見出しがありません。");
    }
    const lastRun = JSON.parse(
      await readFile(path.join(taskRoot, ".stella", "last-run.json"), "utf8"),
    );
    if (lastRun.taskId !== TASK || lastRun.outcome !== "passed") {
      throw new Error("この課題の手元の確認が通った記録がありません。");
    }
  },
} satisfies Scenario;
