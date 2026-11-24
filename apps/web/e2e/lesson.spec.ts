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

  const materials = lesson.getByRole("tab", { name: /^資料/ });
  const count = materials.locator("span").filter({ hasText: /^\d+$/ });
  await expect(count).toBeVisible();
  await expect(page).toHaveScreenshot("lesson-summary.png", { mask: [count] });
});

// export-seed-sql.ts の安定 UUID。開発ラボG 01章「問1 税込価格を返す」のシード行。
const problemStageId = "1a628d2a-96a5-5fce-a148-b9e92b3a92bf";
const problemLessonId = "a28a17f0-8787-56fc-bff3-170300ca754e";

test("課題だけの単元は問題の一覧の末尾で参照元を読める", async ({ page }) => {
  await signInAs(page, "seed-learner");
  // 開発ラボG 02章 u06-tuples の課題レッスンの安定 UUID。
  await page.goto(
    "/stages/135c4094-456c-5e74-a3fb-93876e7900e3/lessons/6d139d0b-2554-50c3-b6df-f856996856fe",
  );

  const lesson = page.getByTestId("lesson-screen");
  await expect(lesson.getByRole("region", { name: "問題の一覧" })).toBeVisible();
  const references = lesson.getByTestId("lesson-doc");
  await expect(references.getByRole("heading", { name: "単元の参照元" })).toBeVisible();
  await expect(
    references.getByRole("link", { name: "サバイバルTypeScript: タプル (tuple)", exact: true }),
  ).toHaveAttribute("href", "https://typescriptbook.jp/reference/values-types-variables/tuple");
});

test("問題のレッスンは解放状態を取り直し、閲覧では完了にならない", async ({ page }) => {
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
  await expect(row).toContainText("の動画を見ると解けます");

  await page.goto(`/stages/${problemStageId}/lessons/${problemLessonId}`);
  const lesson = page.getByTestId("lesson-screen");
  const handoff = lesson.getByTestId("lesson-problem-handoff");
  const open = handoff.getByRole("button", { name: "VS Code で開く" });
  const statement = lesson.getByTestId("lesson-doc");
  await expect(statement).toBeVisible();
  await expect(lesson.getByRole("heading", { level: 1 })).toHaveText("問1 税込価格を返す");
  await expect(statement.getByRole("heading")).toHaveCount(0);
  await expect(
    statement.getByRole("paragraph").filter({ hasText: "（税率10%。税額の1円未満は切り捨て）" }),
  ).toBeVisible();
  await expect(statement).toContainText("例: addTax(1000) → 1100");
  await expect(handoff).toContainText("の動画を見ると解けます");
  await expect(open).toHaveCount(0);
  await expect(lesson.getByRole("tab")).toHaveCount(0);
  await expect(lesson.getByRole("navigation", { name: "パンくず" })).toContainText("問題 1 / 21");
  await expect(lesson.getByText("src/q01-01-add-tax.ts", { exact: true })).toBeVisible();
  await expect(lesson.getByRole("region", { name: "手がかり" })).toContainText(
    "この問題の直前の動画",
  );

  const tocButton = page.getByRole("button", { name: "教材の目次を開く" });
  const usesTocDrawer = await tocButton.isVisible();
  if (usesTocDrawer) await tocButton.click();
  const tocRow = page.locator(
    `[data-testid="lesson-toc-text"][data-lesson-id="${problemLessonId}"]`,
  );
  await expect(tocRow).toBeDisabled();
  await expect(tocRow).toContainText("の動画を見ると解けます");
  if (usesTocDrawer) {
    await page.getByRole("dialog").getByRole("button", { name: "閉じる" }).click();
  }

  state = "open";
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(open).toBeVisible();
  await open.scrollIntoViewIfNeeded();
  await expect(lesson.getByRole("button", { name: "完了にする" })).toHaveCount(0);
  const savedProgress = await page.evaluate((id) => {
    window.dispatchEvent(new Event("pagehide"));
    const progress = JSON.parse(localStorage.getItem("lms_lesson_progress") ?? "{}");
    return progress[id]?.completed === true;
  }, problemLessonId);
  expect(savedProgress).toBe(false);

  state = "submitted";
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(handoff).toContainText("提出済み");
  await expect(open).toBeVisible();

  await lesson.getByRole("link", { name: "問題の一覧", exact: true }).click();
  await expect(lesson.getByRole("heading", { level: 1 })).toHaveText(/letとconst.*の問題/);
  await expect(lesson.getByRole("list", { name: "21 問中 1 問を提出済み" })).toBeVisible();
  await expect(lesson.getByText("取り組み中", { exact: true })).toBeVisible();
  await expect(lesson.getByRole("tab")).toHaveCount(0);
  await expect(lesson.getByRole("button", { name: "完了にする" })).toHaveCount(0);
  const problems = lesson.getByRole("region", { name: "問題の一覧" });
  const firstProblem = problems.getByRole("link", { name: /税込価格を返す/ });
  await expect(firstProblem).toHaveAttribute(
    "href",
    `/stages/${problemStageId}/lessons/${problemLessonId}`,
  );
  await expect(firstProblem).toContainText("提出済み");
  await expect(problems.getByText("前の問題のあと")).toHaveCount(20);

  if (usesTocDrawer) await tocButton.click();
  await expect(tocRow).toContainText("問題 ・ 提出済み");
  const overviewId = await lesson.getAttribute("data-lesson-id");
  const overviewRow = page.locator(
    `[data-testid="lesson-toc-text"][data-lesson-id="${overviewId}"]`,
  );
  await expect(overviewRow).toContainText("課題 ・ 提出 1/21");
  if (usesTocDrawer) {
    await page.getByRole("dialog").getByRole("button", { name: "閉じる" }).click();
  }

  const nextAction = lesson.getByRole("region", { name: "いまやること" });
  state = "open";
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(nextAction.getByRole("button", { name: "VS Code で開く" })).toBeVisible();

  state = "locked-video";
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(firstProblem).toHaveCount(0);
  const video = nextAction.getByRole("link", { name: "動画を見る" });
  await expect(video).toBeVisible();
  const videoPath = await video.getAttribute("href");
  expect(videoPath).toBeTruthy();
  await video.click();
  await expect(page).toHaveURL(new RegExp(`${videoPath}$`));
  await expect(nextAction).toHaveCount(0);
});
