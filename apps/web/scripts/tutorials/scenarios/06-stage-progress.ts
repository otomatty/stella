import { openEntryStage, show } from "../lib/scenario-navigation";
import { defineScenario } from "../lib/types";

export default defineScenario({
  id: "stage-progress",
  order: 6,
  screen: "/stages/$stageId",
  title: "ステージの進み方と修了",
  summary: "到達リスト、レッスンと課題の一覧、修了条件を確認します。",
  start: "/",
  user: "seed-learner",
  async run(t) {
    await openEntryStage(t);
    await t.caption("星の「レッスン一覧」から開いた画面です。", { hold: 5500 });
    await t.expect("[data-testid=stage-syllabus]");
    await t.caption("到達リストで、使い方の進み具合が分かります。", { hold: 5500 });
    await t.expect("[data-testid=stage-first-steps]");
    await show(t, "[data-testid=stage-first-steps]");
    await t.poster();
    await t.caption("単元ごとに、レッスンが並んでいます。", { hold: 5500 });
    await show(t, "[data-testid=stage-syllabus]");
    await t.caption("読むレッスンを押すと、学習を始められます。", { hold: 5500 });
    await show(t, "[data-testid=stage-lesson-slides]");
    await t.caption("課題の一覧では、提出や確認の状態が分かります。", { hold: 5500 });
    await t.expect("[data-testid=stage-task]");
    await show(t, "[data-testid=stage-tasks]");
    await t.caption("修了条件には、終える必要があることが出ます。", { hold: 5500 });
    await t.expect("[data-testid=stage-completion]");
    await show(t, "[data-testid=stage-completion]");
    await t.caption("満たした条件には、緑のチェックが付きます。", { hold: 5500 });
    await t.caption("レッスンと課題を終えると、星がクリアになります。", { hold: 5500 });
    await t.expect("[data-testid=stage-completion]");
  },
});
