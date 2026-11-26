import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { LearnerQuiz, QuizQuestionRow, QuizWithQuestions } from "@stella/shared/cms/types";
import type { SrsTodaySummary } from "@stella/shared/srs/types";
import type { Env } from "../env.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { cmsRoute } from "./cms.js";
import { quizRoute } from "./quiz.js";
import { srsRoute } from "./srs.js";

const body = ["```ts", "const total = 1200 + 500;", "```"].join("\n");
const secret = "quiz-body-test-secret";
let database: ReturnType<typeof sqliteD1>;
let testApp: ReturnType<typeof mountTestApp>;

beforeEach(() => {
  database = sqliteD1();
  const { sqlite, binding } = database;
  sqlite.exec(`
    insert into tenants (id, name, created_at, updated_at) values ('ses', 'SES', 1, 1);
    insert into profiles (id, tenant_id, role, display_name, created_at) values
      ('learner', 'ses', 'student', '受講者', 1), ('admin', 'ses', 'admin', '管理者', 1);
    insert into stages (id, tenant_id, slug, title, status, format, created_at, updated_at)
      values ('stage', 'ses', 'quiz-stage', 'ステージ', 'published', 2, 1, 1);
    insert into enrollments (id, tenant_id, user_id, stage_id, enrolled_at)
      values ('enrollment', 'ses', 'learner', 'stage', 1);
    insert into sections (id, stage_id, title, created_at) values ('unit', 'stage', '単元', 1);
    insert into lessons (id, section_id, title, type, created_at, updated_at)
      values ('lesson', 'unit', '知識問題', 'quiz', 1, 1);
    insert into quizzes (id, lesson_id, source, created_at, updated_at)
      values ('quiz', 'lesson', 'knowledge', 1, 1);
  `);
  sqlite
    .prepare(
      `insert into quiz_questions (id, quiz_id, kind, prompt, body, explanation, created_at, updated_at)
      values ('question', 'quiz', 'single', 'total に入る数は？', ?, '足し算の結果です。', 1, 1)`,
    )
    .run(body);
  sqlite.exec(`
    insert into quiz_options (id, question_id, label, is_correct)
      values ('option', 'question', '1700', 1);
    insert into review_cards (id, tenant_id, user_id, question_id, due_date, last_reviewed_at, created_at)
      values ('card', 'ses', 'learner', 'question', '2020-01-01', 1, 1);
  `);

  const env = { DB: binding, AUTH_JWT_SECRET: secret } as Env;
  testApp = mountTestApp(env, quizRoute, srsRoute, cmsRoute);
});
afterEach(() => database.sqlite.close());

async function call(path: string, user: string, input?: Record<string, unknown>) {
  const token = await signAccessToken(secret, user, `${user}@example.test`);
  const response = await request(testApp.app, testApp.env, path, {
    token,
    ...(input ? { method: "POST", body: JSON.stringify(input) } : {}),
  });
  expect(response.status).toBe(200);
  return response;
}

describe("今日の復習のカード補完", () => {
  it("受験後に更新された設問を除き、同じ受験のほかの設問はカードにする", async () => {
    const { sqlite } = database;
    const answers = [
      { question_id: "question", selected_option_ids: ["option"] },
      { question_id: "revised-question", selected_option_ids: ["revised-option"] },
    ];
    sqlite.exec(`
      delete from review_cards;
      insert into quiz_questions (id, quiz_id, kind, prompt, created_at, updated_at)
        values ('revised-question', 'quiz', 'single', '新版の設問', 1, 3);
      insert into quiz_options (id, question_id, label, is_correct)
        values ('revised-option', 'revised-question', '新版の正解', 1);
    `);
    sqlite
      .prepare(
        `insert into quiz_attempts (id, tenant_id, quiz_id, user_id, score, max_score, passed, answers, submitted_at)
         values ('old-attempt', 'ses', 'quiz', 'learner', 2, 2, 1, ?, 2)`,
      )
      .run(JSON.stringify(answers));

    const response = await call("/api/srs/today", "learner");
    const { review } = await json<{ review: SrsTodaySummary }>(response);
    expect(review.questions.map((q) => q.id)).toEqual(["question"]);
    const cards = () =>
      sqlite.prepare("select question_id from review_cards order by question_id").all();
    expect(cards()).toEqual([{ question_id: "question" }]);

    await call("/api/quiz/quiz/attempt", "learner", { answers });
    expect(cards()).toEqual([{ question_id: "question" }, { question_id: "revised-question" }]);
  });
});

describe("知識問題の Markdown 本文", () => {
  it("レッスンのクイズで本文を返す", async () => {
    const res = await call("/api/quiz/for-lesson/lesson", "learner");
    const { quiz } = await json<{ quiz: LearnerQuiz }>(res);
    expect(quiz.questions[0]).toMatchObject({ prompt: "total に入る数は？", body });
    expect(quiz.questions[0]).not.toHaveProperty("explanation");
    expect(quiz.questions[0].options[0]).not.toHaveProperty("is_correct");
  });

  it("今日の復習で本文を返す", async () => {
    const res = await call("/api/srs/today", "learner");
    const { review } = await json<{ review: SrsTodaySummary }>(res);
    expect(review.questions[0]).toMatchObject({ prompt: "total に入る数は？", body });
    expect(review.questions[0]).not.toHaveProperty("explanation");
    expect(review.questions[0].options[0]).not.toHaveProperty("is_correct");
  });

  it("CMS は本文を返し、既存の設問を更新しても保持する", async () => {
    const res = await call("/api/cms/quiz/by-lesson/lesson", "admin");
    const { quiz } = await json<{ quiz: QuizWithQuestions }>(res);
    expect(quiz.questions[0].body).toBe(body);

    const updated = await call("/api/cms/quiz-questions", "admin", {
      id: "question",
      quiz_id: "quiz",
      kind: "single",
      prompt: "新しい見出し",
      body: "",
    });
    expect((await json<{ row: QuizQuestionRow }>(updated)).row).toMatchObject({
      prompt: "新しい見出し",
      body,
    });
  });

  it.each([{ body }, {}])("CMS で新規作成すると本文を保存する (%o)", async (input) => {
    const res = await call("/api/cms/quiz-questions", "admin", {
      quiz_id: "quiz",
      kind: "single",
      prompt: "新しい設問",
      ...input,
    });
    expect((await json<{ row: QuizQuestionRow }>(res)).row.body).toBe(input.body ?? "");
  });
});
