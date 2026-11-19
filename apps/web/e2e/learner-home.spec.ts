import { signInAs } from "./support/auth";
import { expect, test } from "./support/test";

test("受講者のホームに盤面とガイドが出る", async ({ page }) => {
  await signInAs(page, "seed-learner");
  await page.goto("/");

  const status = page.getByRole("region", { name: "あなたの状況" });
  await expect(status).toBeVisible();
  await expect(page.getByRole("complementary", { name: "次にやること" })).toBeVisible();
  await expect(page.getByRole("button", { name: "全体を表示" })).toBeVisible();
  await expect(page.getByTestId("tree-star-dev-env-basics")).toBeVisible();
  await expect(page).toHaveScreenshot("learner-home.png", {
    mask: [status.getByText(/^\d+ 日$/), status.getByText(/^\d+ \/ \d+$/)],
  });
});

test("未着手の受講者に最初のステージが案内される", async ({ page }) => {
  await signInAs(page, "seed-learner2");
  await page.goto("/");

  const guide = page.getByRole("complementary", { name: "次にやること" });
  await expect(
    guide.getByRole("heading", { name: "『STELLAの使い方』から始めましょう" }),
  ).toBeVisible();
  await expect(guide.getByRole("button", { name: "最初のステージを始める" })).toBeVisible();
});
