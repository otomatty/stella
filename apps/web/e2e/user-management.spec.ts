import { signInAs } from "./support/auth";
import { expect, test } from "./support/test";

test("受講者の削除ダイアログを開いて取り消せる", async ({ page }) => {
  await signInAs(page, "seed-admin");
  await page.goto("/admin/users");

  const learner = page
    .getByRole("row")
    .or(page.getByRole("list", { name: "ユーザーの一覧" }).getByRole("listitem"))
    .filter({ has: page.getByText("seed-learner@example.local", { exact: true }) });
  await learner.getByTitle("操作", { exact: true }).click();
  await page.getByRole("button", { name: "削除する…" }).click();

  const dialog = page.getByRole("dialog", { name: "Seed Learner を削除しますか？" });
  await expect(dialog.getByRole("button", { name: "削除する", exact: true })).toBeDisabled();
  await expect(dialog).toHaveScreenshot("delete-user-dialog.png");
  await dialog.getByRole("button", { name: "キャンセル" }).click();

  await expect(dialog).toBeHidden();
  await expect(learner).toBeVisible();
});
