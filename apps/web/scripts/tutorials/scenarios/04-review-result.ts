import { openFirstSlides, show } from "../lib/scenario-navigation";
import { defineScenario } from "../lib/types";

export default defineScenario({
  id: "review-result",
  order: 4,
  screen: "/stages/$stageId/lessons/$lessonId",
  title: "提出の結果を見る",
  summary: "レッスンの提出履歴と、通知から結果を確認する場所を見ます。",
  start: "/",
  user: "seed-learner",
  async run(t) {
    await openFirstSlides(t);
    await t.caption("提出のあとも、Web で結果を確かめられます。", { hold: 5500 });
    await t.expect("[data-testid=lesson-screen]");
    await t.caption("画面の下に「提出・添削を確認する」があります。", { hold: 5500 });
    await show(t, "[data-testid=submissions-toggle]");
    await t.caption("押すと、これまでの提出が開きます。", { hold: 5500 });
    await t.click("[data-testid=submissions-toggle]");
    await t.expect("[data-testid=submissions-history][open]");
    // 読み込み完了を待ってから、提出の有無で分ける。
    await t.expect("[data-testid=submissions-list], [data-testid=submissions-empty]");
    await t.poster();
    await t.caption("右上のベルを押すと、通知が開きます。", { hold: 5500 });
    await t.click("[data-testid=notifications-toggle]");
    await t.expect("[data-testid=notifications-panel]");
    await t.caption("レビューが終わると、ここにも通知が届きます。", { hold: 5500 });
    await show(t, "[data-testid=notifications-panel]");
    await t.caption("通知を閉じて、提出の一覧に戻ります。", { hold: 5500 });
    await t.click("[data-testid=notifications-close]");
    await t.expect("[data-testid=notifications-panel]", { hidden: true });
    if (await t.locate("[data-testid=submission-open]").count()) {
      await t.caption("提出を押すと、結果の画面が開きます。", { hold: 5500 });
      await t.click("[data-testid=submission-open]");
      await t.expect("[data-testid=submission-result]");
      await t.caption("確認中のときは、結果が届くのを待ちましょう。", { hold: 5500 });
    } else {
      await t.caption("まだ提出がないときは、ここに案内が出ます。", { hold: 5500 });
      await t.expect("[data-testid=submissions-empty]");
      await t.caption("課題を提出したあと、またここを開きましょう。", { hold: 5500 });
    }
  },
});
