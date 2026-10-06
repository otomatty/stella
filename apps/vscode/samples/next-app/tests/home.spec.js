import { expect, test } from "@playwright/test";

test.describe("トップページ", () => {
  test("ページの題名と見出しが ToDo になっている", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("ToDo");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("ToDo");
  });

  test("入力したやることが一覧に増える", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("やること").fill("買い物");
    await page.getByRole("button", { name: "追加" }).click();
    await expect(page.getByRole("listitem")).toHaveText(["買い物"]);
    await expect(page.getByLabel("やること")).toHaveValue("");
  });
});
