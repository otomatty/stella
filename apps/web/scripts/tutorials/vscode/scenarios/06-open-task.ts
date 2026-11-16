import { existsSync } from "node:fs";
import path from "node:path";
import { type Scenario, webviewWith } from "../helpers";

const TOPIC = "dev-env-basics/modules/u00-start/l1-how-stella-works/t1-learning-loop";
const TASK = "dev-env-basics/u02-first-task/q01-first-page";

export default {
  id: "open-task",
  clip: "vscode/open-task",
  lms: true,
  title: "課題を開く",
  summary: "VS Code に課題のファイルと課題文が開きます。",
  topic: TOPIC,
  task: TASK,
  regions: {
    editor: [440, 84, 578, 876],
    panel: [1022, 84, 568, 876],
  },

  async run(t, { page, taskRoot, openTask }) {
    if (!openTask) throw new Error("課題を開く手順がありません。");
    const indexTab = page.locator('.tabs-container .tab[aria-label^="index.html"]');
    const taskTab = page.locator('.tabs-container .tab[aria-label^="課題: "]');
    await t.wait(800);
    await t.mark("open", async () => {
      await openTask();
      await t.expect(indexTab, { timeout: 60_000 });
      await t.expect(taskTab, { timeout: 60_000 });
      await webviewWith(page, "text=最初のページを作る", 60_000);
      await webviewWith(page, "text=次にやること", 60_000);
      await t.wait(1200);
    });
    if (
      !existsSync(path.join(taskRoot, "index.html")) ||
      !existsSync(path.join(taskRoot, ".stella", "distribution.json"))
    ) {
      throw new Error("学習フォルダーに課題が置かれていません。");
    }
  },
} satisfies Scenario;
