import { openEntryStage, show } from "../lib/scenario-navigation";
import { defineScenario } from "../lib/types";

export default defineScenario({
  id: "stage-progress",
  order: 6,
  screen: "/stages/$stageId",
  title: "ステージの進み方と完了",
  summary: "到達リスト、教材と課題の一覧、完了条件を確認します。",
  start: "/",
  user: "seed-learner",
  async run(t) {
    await openEntryStage(t);
    await t.caption("ステージの「教材の一覧」から開いた画面です。", { hold: 5500 });
    await t.expect("[data-testid=stage-syllabus]");
    await t.caption("到達リストで、使い方の進み具合が分かります。", { hold: 5500 });
    await t.expect("[data-testid=stage-first-steps]");
    await show(t, "[data-testid=stage-first-steps]");
    await t.poster();
    await t.caption("単元ごとに、教材が並んでいます。", { hold: 5500 });
    await show(t, "[data-testid=stage-syllabus]");
    await t.caption("読みたい教材を押すと、学習を始められます。", { hold: 5500 });
    await show(t, "[data-testid=stage-lesson-slides]");
    await t.caption("課題の一覧では、提出や確認の状態が分かります。", { hold: 5500 });
    await t.expect("[data-testid=stage-task]");
    await show(t, "[data-testid=stage-tasks]");
    await t.caption("完了条件で、あと何が必要か分かります。", { hold: 5500 });
    await t.expect("[data-testid=stage-completion]");
    await show(t, "[data-testid=stage-completion]");
    await t.caption("満たした条件には、緑のチェックが付きます。", { hold: 5500 });
    await t.caption("教材と課題を終えると、ステージが完了します。", { hold: 5500 });
    await t.expect("[data-testid=stage-completion]");
  },
});
