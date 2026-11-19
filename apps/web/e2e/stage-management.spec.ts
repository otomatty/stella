import { signInAs } from "./support/auth";
import { expect, test } from "./support/test";

test("管理者のステージ管理に盤面が出る", async ({ page }) => {
  await signInAs(page, "seed-admin");
  await page.goto("/stages");

  await expect(page.getByRole("complementary", { name: "ステージ管理" })).toBeVisible();
  await expect(page.getByRole("button", { name: "全体を表示" })).toBeVisible();
  await expect(page.getByTestId("tree-star-dev-env-basics")).toBeVisible();
});
