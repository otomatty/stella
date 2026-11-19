import { openFirstTask, show } from "../lib/scenario-navigation";
import { defineScenario } from "../lib/types";

export default defineScenario({
  id: "overview",
  order: 1,
  screen: "/",
  title: "STELLA で学ぶ流れ",
  summary: "ステージの始め方と、教材や課題の進め方を見ます。",
  start: "/",
  user: "seed-learner2",
  freshUser: true,
  async run(t) {
    await t.caption("ホームのガイドが、はじめの一歩を案内します。");
    await t.expect("[data-testid=guide-primary]");
    await show(t, "[data-testid=guide-primary]");
    await t.caption("最初のステージにマウスを合わせると、内容が見えます。");
    await t.hover("[data-testid=tree-star-dev-env-basics]");
    await t.expect("[data-testid=tree-start-stage]");
    await t.caption("ガイドの「最初のステージを始める」を押します。");
    await t.park();
    await t.click("[data-testid=guide-start-stage]");
    await t.expect("[data-testid=lesson-slides]");
    await t.expectUrl(/\/stages\/[^/]+\/lessons\/[^/]+$/);
    await t.caption("最初の教材が開きました。");
    await t.poster();
    await t.caption("「次へ」を押すと、スライドが進みます。");
    await t.click("[data-testid=lesson-next-slide]");
    await t.expect("[data-testid=lesson-slides][data-page='2']");
    await t.caption("目次の「まとめ」で、内容を読み返せます。");
    await t.click("[data-testid=lesson-toc-text]");
    await t.expect("[data-testid=lesson-doc]");
    await t.caption("クイズで、学んだことを確かめます。");
    await show(t, "[data-testid=lesson-toc-quiz]");
    await t.expect("[data-testid=lesson-toc-quiz]");
    await t.caption("課題文も、Web で読めます。");
    await openFirstTask(t);
    await t.caption("課題は「VS Code で開く」から取り組みます。");
    await show(t, "[data-testid=open-in-vscode]");
    await t.expect("[data-testid=open-in-vscode]");
    await t.caption("ホームに戻ると、始めたステージが進行中になります。");
    await t.goto("/");
    await t.expect("[data-testid=tree-star-dev-env-basics][data-active=true]");
    await show(t, "[data-testid=tree-star-dev-env-basics]");
  },
});
