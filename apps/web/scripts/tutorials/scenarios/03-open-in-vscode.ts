import { openFirstTask, show } from "../lib/scenario-navigation";
import { defineScenario } from "../lib/types";

export default defineScenario({
  id: "open-in-vscode",
  order: 3,
  screen: "/stages/$stageId/lessons/$lessonId",
  title: "課題を VS Code で開く",
  summary: "課題文と、VS Code に課題を開く入口を確認します。",
  start: "/",
  user: "seed-learner",
  async run(t) {
    await openFirstTask(t);
    await t.caption("課題文のレッスンを開きました。", { hold: 5500 });
    await t.expect("[data-testid=lesson-doc]");
    await show(t, "[data-testid=lesson-doc]");
    await t.caption("まず、何を作るかと手順を読みましょう。", { hold: 5500 });
    await show(t, "[data-testid=lesson-doc]");
    await t.caption("課題に取り組む場所は、パソコンの VS Code です。", { hold: 5500 });
    await show(t, "[data-testid=lesson-task-handoff]");
    await t.caption("「VS Code で開く」を押すと、起動します。", { hold: 5500 });
    // vscode:// へ移動させず、入口を見せる。
    await show(t, "[data-testid=open-in-vscode]");
    await t.expect("[data-testid=open-in-vscode]");
    await t.poster();
    await t.caption("初回は、学習フォルダーを選びます。", { hold: 5500 });
    await t.caption("自分の学習フォルダーを、信頼して開きます。", { hold: 5500 });
    await t.caption("VS Code に課題文と編集するファイルが開きます。", { hold: 5500 });
    await t.caption("スマートフォンでは、PC へ送るボタンになります。", { hold: 5500 });
    await t.expect("[data-testid=lesson-task-handoff]");
  },
});
