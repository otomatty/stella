import type { TaskSummary } from "@stella/shared/tasks/catalog";
import type { ProblemStepState } from "@stella/shared/tasks/problem-steps";
import { signInAs } from "./support/auth";
import { expect, test } from "./support/test";

// export-seed-sql.ts の安定 UUID。dev-env-basics の U00「00-1 まとめ」のシード行。
const stageId = "77e54045-9e80-530d-8952-7aa6a7ba5938";
const lessonId = "1b5d3229-5c04-536c-8ff8-5d8113681cc5";

test("受講中のステージのまとめを読める", async ({ page }) => {
  await signInAs(page, "seed-learner");
  await page.goto(`/stages/${stageId}/lessons/${lessonId}`);

  const lesson = page.getByTestId("lesson-screen");
  await expect(lesson.getByRole("heading", { name: "00-1 まとめ", exact: true })).toBeVisible();
  await expect(lesson.getByTestId("lesson-doc").getByText("このレッスンの目標")).toBeVisible();

  await expect(lesson.getByRole("tab", { name: "教材", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page).toHaveScreenshot("lesson-summary.png");
});

// export-seed-sql.ts の安定 UUID。開発ラボG 01章「問1 税込価格を返す」のシード行。
const problemStageId = "1a628d2a-96a5-5fce-a148-b9e92b3a92bf";
const problemLessonId = "a28a17f0-8787-56fc-bff3-170300ca754e";

test("課題だけの単元は問題の一覧で提出状況と次の問題を確認し、末尾で参照元を読める", async ({
  page,
}) => {
  await signInAs(page, "seed-learner");
  // 開発ラボG 02章 u06-tuples の課題レッスンの安定 UUID。
  const tupleStageId = "135c4094-456c-5e74-a3fb-93876e7900e3";
  const tupleLessonId = "6d139d0b-2554-50c3-b6df-f856996856fe";
  let firstSubmitted = false;
  let inherited = false;
  await page.route(`**/api/tasks/for-stage/${tupleStageId}`, async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    const response = await route.fetch();
    const { tasks } = (await response.json()) as { tasks: TaskSummary[] };
    const task = tasks.find(({ lessonId }) => lessonId === tupleLessonId);
    expect(task?.problem_items).toHaveLength(21);
    expect(task?.problems).toBeUndefined();
    if (task) {
      task.status = "not-started";
      for (const problem of task.problem_items ?? []) {
        const first = problem.id === "q06-01-make-pair";
        problem.state = firstSubmitted && first ? "submitted" : "open";
        problem.manual = first && inherited ? true : undefined;
      }
    }
    await route.fulfill({ response, json: { tasks } });
  });
  await page.goto(`/stages/${tupleStageId}/lessons/${tupleLessonId}`);

  const lesson = page.getByTestId("lesson-screen");
  await expect(lesson.getByRole("heading", { level: 1 })).toHaveText("02章 q06 タプルの問題");
  await expect(lesson.getByRole("tab")).toHaveCount(0);
  await expect(lesson.getByRole("button", { name: "完了にする" })).toHaveCount(0);
  const nextAction = lesson.getByRole("region", { name: "いまやること" });
  await expect(nextAction).toContainText("問1 名前と数を、[名前, 数] のタプルにする");
  await expect(nextAction.getByRole("button", { name: "VS Code で開く" })).toBeVisible();
  await expect(lesson.getByRole("list", { name: "21 問中 0 問を提出済み" })).toBeVisible();

  firstSubmitted = true;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(lesson.getByRole("list", { name: "21 問中 1 問を提出済み" })).toBeVisible();
  await expect(lesson.getByText("取り組み中", { exact: true })).toBeVisible();
  await expect(nextAction).toContainText("問2 [数, 名前] を [名前, 数] に並べ替える");
  const problems = lesson.getByRole("region", { name: "問題の一覧" });
  await expect(problems.getByRole("listitem")).toHaveCount(21);
  const firstProblem = problems.getByRole("listitem").filter({ hasText: "名前と数を、" });
  await expect(firstProblem).toContainText("提出済み");
  await expect(firstProblem.getByRole("link")).toHaveCount(0);
  inherited = true;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(firstProblem).toContainText("引き継ぎ");
  await expect(firstProblem).not.toContainText("提出済み");

  const tocButton = page.getByRole("button", { name: "教材の目次を開く" });
  const usesTocDrawer = await tocButton.isVisible();
  if (usesTocDrawer) await tocButton.click();
  await expect(
    page.locator(`[data-testid="lesson-toc-text"][data-lesson-id="${tupleLessonId}"]`),
  ).toContainText("課題 ・ 提出 1/21");
  if (usesTocDrawer) {
    await page.getByRole("dialog").getByRole("button", { name: "閉じる" }).click();
  }

  const references = lesson.getByTestId("lesson-doc");
  await expect(references.getByRole("heading", { name: "単元の参照元" })).toBeVisible();
  await expect(
    references.getByRole("link", { name: "サバイバルTypeScript: タプル (tuple)", exact: true }),
  ).toHaveAttribute("href", "https://typescriptbook.jp/reference/values-types-variables/tuple");
});

test("問題のレッスンは手元の進捗でロックし、提出は取り直す。閲覧では完了にならない", async ({
  page,
}) => {
  await signInAs(page, "seed-learner");
  let state: ProblemStepState = "locked-video";
  await page.route(`**/api/tasks/for-stage/${problemStageId}`, async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    const response = await route.fetch();
    const { tasks } = (await response.json()) as { tasks: TaskSummary[] };
    for (const task of tasks) {
      if (!task.problems?.some((step) => step.stepLessonId === problemLessonId)) continue;
      task.status = "not-started";
      for (const problem of [...task.problems, ...(task.problem_items ?? [])]) {
        problem.state = problem.stepLessonId === problemLessonId ? state : "locked-previous";
      }
    }
    await route.fulfill({ response, json: { tasks } });
  });

  await page.goto(`/stages/${problemStageId}`);
  const row = page
    .getByTestId("stage-syllabus")
    .getByRole("button", { name: /問1 税込価格を返す/ });
  await expect(row).toBeDisabled();
  await expect(row).toContainText("を終えると解けます");

  await page.goto(`/stages/${problemStageId}/lessons/${problemLessonId}`);
  const lesson = page.getByTestId("lesson-screen");
  const handoff = lesson.getByTestId("lesson-problem-handoff");
  const open = handoff.getByRole("button", { name: "VS Code で開く", exact: true });
  const statement = lesson.getByTestId("lesson-doc");
  await expect(statement).toBeVisible();
  await expect(lesson.getByRole("heading", { level: 1 })).toHaveText("問1 税込価格を返す");
  await expect(statement.getByRole("heading")).toHaveCount(0);
  await expect(
    statement.getByRole("paragraph").filter({ hasText: "税率10%。税額の1円未満は切り捨て" }),
  ).toBeVisible();
  await expect(statement).toContainText("例: addTax(1000) → 1100");
  await expect(handoff).toContainText("を終えると解けます");
  await expect(open).toHaveCount(0);
  await expect(lesson.getByRole("tab", { name: "教材" })).toBeVisible();
  await expect(lesson.getByRole("tab")).toHaveCount(1);
  await expect(lesson.getByRole("navigation", { name: "パンくず" })).toHaveCount(0);
  await expect(lesson.getByRole("link", { name: "問題の一覧", exact: true })).toHaveCount(0);
  await expect(lesson.getByText("src/q01-01-add-tax.ts", { exact: true })).toBeVisible();
  const references = lesson.getByRole("region", { name: "手がかり" });
  const precedingVideo = references.getByRole("link", { name: /この問題の直前の動画/ });
  await expect(precedingVideo).toBeVisible();

  const tocButton = page.getByRole("button", { name: "教材の目次を開く" });
  const usesTocDrawer = await tocButton.isVisible();
  if (usesTocDrawer) await tocButton.click();
  const tocRow = page.locator(
    `[data-testid="lesson-toc-text"][data-lesson-id="${problemLessonId}"]`,
  );
  await expect(tocRow).toBeDisabled();
  await expect(tocRow).toContainText("を終えると解けます");
  if (usesTocDrawer) {
    await page.getByRole("dialog").getByRole("button", { name: "閉じる" }).click();
  }

  // サーバーが open でも、前の教材が手元で終わっていなければロックのまま。
  // focus の取り直しが画面に反映されてから、文言とボタンを見る。
  state = "open";
  const refreshed = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/tasks/for-stage/${problemStageId}`) &&
      response.request().method() === "GET" &&
      response.ok(),
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await refreshed;
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      }),
  );
  await expect(handoff).toContainText("を終えると解けます");
  await expect(open).toHaveCount(0);
  await expect(lesson.getByRole("button", { name: "完了にする" })).toHaveCount(0);
  const savedProgress = await page.evaluate((id) => {
    window.dispatchEvent(new Event("pagehide"));
    const progress = JSON.parse(localStorage.getItem("lms_lesson_progress") ?? "{}");
    return progress[id]?.completed === true;
  }, problemLessonId);
  expect(savedProgress).toBe(false);

  state = "submitted";
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(lesson.getByText("提出済み", { exact: true })).toBeVisible();
  await expect(handoff).not.toContainText("提出済み");
  await expect(
    handoff.getByRole("button", { name: "VS Code で見直す", exact: true }),
  ).toBeVisible();
  await expect(open).toHaveCount(0);
  await expect(handoff).toContainText("この課題の問題 1 / 21");
  await expect(handoff).toContainText("あと 20 問で課題を提出し終えます");
  await expect(lesson.getByRole("link", { name: "問題の一覧", exact: true })).toHaveCount(0);

  if (usesTocDrawer) await tocButton.click();
  await expect(tocRow).toContainText("問題 ・ 提出済み");
  if (usesTocDrawer) {
    await page.getByRole("dialog").getByRole("button", { name: "閉じる" }).click();
  }

  const videoPath = await precedingVideo.getAttribute("href");
  expect(videoPath).toBeTruthy();
  await precedingVideo.click();
  await expect(page).toHaveURL((url) => url.pathname === videoPath);
  await expect(handoff).toHaveCount(0);
});
