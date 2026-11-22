import { signInAs } from "./support/auth";
import { expect, test } from "./support/test";

test("管理者のレビュー画面にタブと提出が出る", async ({ page }) => {
  await signInAs(page, "seed-admin");
  await page.goto("/review-queue");

  await expect(page.getByRole("heading", { name: "レビュー", exact: true })).toBeVisible();
  const queue = page.getByRole("tab", { name: /^人に回した提出/ });
  await expect(queue).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab", { name: "AI が判定した提出" })).toBeVisible();

  const panel = page.getByRole("tabpanel", { name: /^人に回した提出/ });
  await expect(panel.getByText("console.log で文字を出す", { exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot("review-queue.png", {
    mask: [
      page.getByText(/^人に回した提出 \d+件/),
      queue.locator("span").filter({ hasText: /^\d+$/ }),
      panel.getByRole("button", { name: /\(\d+\)$/ }),
      panel.getByText(/^(1時間未満|\d+(時間|日))$/),
    ],
  });
});
