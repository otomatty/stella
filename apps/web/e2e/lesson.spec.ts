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
      const problem = task.problems?.find((step) => step.stepLessonId === problemLessonId);
      if (problem) problem.state = state;
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
  const open = handoff.getByRole("button", { name: "VS Code で開く" });
  await expect(lesson.getByTestId("lesson-doc")).toBeVisible();
  await expect(handoff).toContainText("を終えると解けます");
  await expect(open).toHaveCount(0);

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
  state = "open";
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
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
  await expect(handoff).toContainText("提出済み");
  await expect(open).toBeVisible();
});
