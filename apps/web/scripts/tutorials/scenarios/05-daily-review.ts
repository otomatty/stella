import { show } from "../lib/scenario-navigation";
import { defineScenario } from "../lib/types";

export default defineScenario({
  id: "daily-review",
  order: 5,
  screen: "/review",
  title: "今日の復習",
  summary: "今日の復習で答えを選び、正誤と解説を確認します。",
  start: "/",
  user: "seed-learner",
  seedSql: [
    // seed が作る U00 の知識問題を使う。期限は API と同じ日本時間、時刻は timestamp_ms。
    // 登録中・公開中・knowledge の条件も「今日の問題」の取得条件に合わせる。
    `INSERT INTO review_cards (
      id, tenant_id, user_id, question_id, ease, interval_days, reps,
      due_date, last_reviewed_at, created_at
    )
    SELECT 'tutorial-daily-review-' || qq.id, st.tenant_id, e.user_id, qq.id,
      2.5, 1, 1, date('now', '+9 hours'),
      unixepoch('now', '-1 day') * 1000, unixepoch('now') * 1000
    FROM quiz_questions qq
    JOIN quizzes q ON q.id = qq.quiz_id
    JOIN lessons l ON l.id = q.lesson_id
    JOIN sections s ON s.id = l.section_id
    JOIN stages st ON st.id = s.stage_id
    JOIN enrollments e ON e.stage_id = st.id
    WHERE st.tenant_id = 'ses' AND st.slug = 'dev-env-basics'
      AND st.status = 'published' AND st.format = 2
      AND s."order" = 0 AND q.source = 'knowledge'
      AND e.user_id = 'seed-learner' AND e.status = 'active'
    ORDER BY l."order", qq."order", qq.id
    LIMIT 3;`,
  ],
  async run(t) {
    await t.caption("ホームのガイドから、今日の復習を始めます。", { hold: 5500 });
    // ガイドの取得が終わるまで待つ。復習の行が無ければ直接開く。
    await t.expect("[data-testid=guide-primary]");
    if (await t.locate("[data-testid=guide-review]").count()) {
      await t.click("[data-testid=guide-review]");
    } else {
      await t.goto("/review");
    }
    await t.expectUrl(/\/review$/);
    // seedSql で準備した復習問題が出ることを確かめる。
    // 空画面を「解答の動画」として公開しないよう、問題が無ければ収録を止める。
    await t.expect("[data-testid=review-option]");
    await t.caption("前に解いた知識問題が、もう一度出ます。", { hold: 5500 });
    await show(t, "[data-testid=review-option]");
    await t.poster();
    await t.caption("ここでは、試しに答えを一つ選んでみます。", { hold: 5500 });
    await t.click("[data-testid=review-option]");
    await t.expect("[data-testid=review-option][aria-pressed=true]");
    await t.caption("回答する前なら、答えを選び直せます。", { hold: 5500 });
    await t.caption("「回答する」を押すと、正誤が分かります。", { hold: 5500 });
    await t.click("[data-testid=review-submit]");
    await t.expect("[data-testid=review-feedback]");
    await t.caption("解説を読んで、考え方を確かめましょう。", { hold: 5500 });
    await show(t, "[data-testid=review-feedback]");
    await t.caption("間違えた問題ほど、早くまた出てきます。", { hold: 5500 });
    await t.caption("少しずつ振り返ると、覚えたことが残ります。", { hold: 5500 });
    await t.expect("[data-testid=review-feedback]");
  },
});
