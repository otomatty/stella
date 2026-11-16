import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { closeNotifications, type Scenario, webviewBody, webviewWith } from "../helpers";

const TOPIC = "dev-env-basics/modules/u00-start/l1-how-stella-works/t1-learning-loop";
const TASK = "dev-env-basics/u02-first-task/q01-first-page";
const REFLECTION =
  "見出しを「はじめてのページ」に直し、課題を確認してすべて通ることを確かめました。";

export default {
  id: "submit",
  clip: "vscode/submit",
  lms: true,
  title: "課題を提出する",
  summary: "確認が通った課題に振り返りを書いて提出します。",
  topic: TOPIC,
  task: TASK,
  regions: {
    panel: [1022, 84, 568, 876],
    result: [1046, 466, 502, 340],
    submit: [1040, 864, 48, 28],
  },

  async setup(page, ctx) {
    if (!ctx.openTask) throw new Error("課題を開く手順がありません。");
    await ctx.openTask();
    const indexTab = page.locator('.tabs-container .tab[aria-label^="index.html"]');
    const taskTab = page.locator('.tabs-container .tab[aria-label^="課題: "]');
    await indexTab.waitFor({ state: "visible", timeout: 60_000 });
    await taskTab.waitFor({ state: "visible", timeout: 60_000 });
    await webviewBody(page).waitFor({ timeout: 60_000 });

    const file = path.join(ctx.taskRoot, "index.html");
    const html = await readFile(file, "utf8");
    const next = html.replace("ここを変更します", "はじめてのページ");
    if (next === html) throw new Error("index.html に差し替える見出しがありません。");
    await writeFile(file, next);
    await page
      .locator(".monaco-editor .view-lines .view-line")
      .filter({ hasText: "はじめてのページ" })
      .first()
      .waitFor({ state: "visible", timeout: 30_000 });

    await page.locator('[id="saedgewell.stella-lms.stella.runTask"]').click();
    const result = await webviewWith(page, ".outcome.passed", 30_000);
    await result
      .locator(".outcome.passed")
      .filter({ hasText: "すべて通りました" })
      .waitFor({ state: "visible", timeout: 30_000 });
    await closeNotifications(page);
  },

  async run(t, { page, api }) {
    const result = await webviewWith(page, ".outcome.passed", 30_000);
    const submitLink = result.locator('a[href^="command:stella.submitTask"]');
    await t.mark("press-submit", async () => {
      await t.expect(submitLink);
      await t.click(submitLink);
      const form = await webviewWith(page, "#explanation", 60_000);
      await t.expect(form.locator("#explanation"), { timeout: 60_000 });
    });
    const form = await webviewWith(page, "#explanation", 60_000);
    await t.mark("write", async () => {
      const explanation = form.locator("#explanation");
      const box = await explanation.boundingBox();
      if (!box) throw new Error("振り返りの欄が見つかりません。");
      await t.click(explanation, { offsetY: Math.max(8, box.height - 16) });
      await t.type(REFLECTION);
    });
    await t.mark("sent", async () => {
      await t.click(form.locator("#submit"));
      await t.expect(
        page
          .locator(".notifications-toasts .notification-toast")
          .filter({ hasText: "提出しました" }),
        { timeout: 30_000 },
      );
      await t.wait(2500);
    });
    if (!api) throw new Error("提出の確認先がありません。");
    const response = await fetch(`${api.base}/api/submissions/mine`, {
      headers: { Authorization: `Bearer ${api.token}` },
    });
    if (!response.ok) throw new Error(`提出一覧の取得に失敗しました (${response.status})`);
    const listed = (await response.json()) as { rows?: { task_id?: string }[] };
    if (!listed.rows?.some((row) => row.task_id === TASK)) {
      throw new Error("ローカルの API にこの課題の提出が届いていません。");
    }
  },
} satisfies Scenario;
