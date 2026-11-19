import { openFirstSlides, show } from "../lib/scenario-navigation";
import { defineScenario } from "../lib/types";

export default defineScenario({
  id: "lesson-screen",
  order: 2,
  screen: "/stages/$stageId/lessons/$lessonId",
  title: "教材の画面の使い方",
  summary: "目次からスライド、まとめ、クイズを開きます。",
  start: "/",
  user: "seed-learner",
  async run(t) {
    await openFirstSlides(t);
    await t.caption("まずはスライドで、教材の要点をつかみます。", { hold: 5000 });
    await t.expect("[data-testid=lesson-slides]");
    await t.poster();
    await t.caption("「次へ」を押すと、次のページが見えます。", { hold: 5000 });
    await t.click("[data-testid=lesson-next-slide]");
    await t.expect("[data-testid=lesson-slides][data-page='2']");
    await t.caption("「完了にする」を押すと、読んだ記録が付きます。", { hold: 5000 });
    await t.click("[data-testid=lesson-complete]");
    await t.expect("[data-testid=lesson-completed]");
    await t.caption("目次の「まとめ」を押すと、本文を読めます。", { hold: 5000 });
    await t.click("[data-testid=lesson-toc-text]");
    await t.expect("[data-testid=lesson-doc]");
    await t.caption("目次のクイズを押して、理解を確かめます。", { hold: 5000 });
    await t.click("[data-testid=lesson-toc-quiz]");
    await t.expect("[data-testid=quiz-question]");
    await t.caption("選択肢を押すと、答えを選べます。", { hold: 5000 });
    await t.click("[data-testid=quiz-option]");
    await t.expect("[data-testid=quiz-option][data-selected=true]");
    await t.caption("すべて答えたら、「確認する」を押します。", { hold: 5000 });
    await show(t, "[data-testid=quiz-question]");
    await t.caption("次の教材も、左の目次から開けます。", { hold: 5000 });
    await t.click("[data-testid=lesson-toc-slides] >> nth=1");
    await t.expect("[data-testid=lesson-slides]");
  },
});
