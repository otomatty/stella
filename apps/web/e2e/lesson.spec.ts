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
