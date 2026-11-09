import { openFirstTask, show } from "../lib/scenario-navigation";
import { defineScenario } from "../lib/types";

export default defineScenario({
  id: "review-result",
  order: 4,
  screen: "/stages/$stageId/lessons/$lessonId",
  title: "提出の結果を見る",
  summary: "課題のレッスンの下でその課題の提出を開き、通知と結果の画面を確認します。",
  start: "/",
  user: "seed-learner",
  seedSql: [
    // 課題・課題文レッスン・受講者は seed の行を使い、提出直後の状態を用意する。
    // AI のジョブは作らず、収録中も「AI が確認中」のままにする。
    `INSERT INTO submissions (
      id, tenant_id, student_id, lesson_id, task_id, task_content_hash,
      task_kind, submission_mode, stage_title, section_title, assignment_title,
      code, status, ai_review_status, submitted_at
    )
    SELECT 'tutorial-review-result-' || t.id, st.tenant_id, p.id, l.id, t.id,
      t.content_hash, t.kind, 'submit', st.title, s.title, t.title,
      '', 'pending', 'queued', unixepoch('now') * 1000
    FROM tasks t
    JOIN lessons l ON l.id = t.lesson_id
    JOIN sections s ON s.id = l.section_id
    JOIN stages st ON st.id = s.stage_id
    JOIN profiles p ON p.tenant_id = st.tenant_id AND p.id = 'seed-learner'
    WHERE st.tenant_id = 'ses' AND st.slug = 'dev-env-basics' AND st.format = 2
      AND t.id = 'dev-env-basics/u02-first-task/q01-first-page';`,
  ],
  async run(t) {
    await openFirstTask(t);
    await t.caption("提出のあとも、Web で結果を確かめられます。", { hold: 5500 });
    await t.expect("[data-testid=lesson-screen]");
    await t.caption("課題のレッスンの下に「提出・添削を確認する」があります。", { hold: 5500 });
    await show(t, "[data-testid=submissions-toggle]");
    await t.caption("押すと、この課題の提出が開きます。", { hold: 5500 });
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
