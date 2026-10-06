import { expect, test } from "@playwright/test";

test.describe("ToDo の画面", () => {
  test("入力したやることが一覧に増え、入力欄が空に戻る", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("やること").fill("買い物");
    await page.getByRole("button", { name: "追加" }).click();
    await expect(page.getByRole("listitem")).toHaveText(["買い物"]);
    await expect(page.getByLabel("やること")).toHaveValue("");
  });

  test("空白だけなら追加せず、理由を表示する", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("やること").fill("   ");
    await page.getByRole("button", { name: "追加" }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "やることを入力してください",
    );
    await expect(page.getByRole("listitem")).toHaveCount(0);
  });

  // 画面幅ごとに、横にはみ出していないかを確かめる。
  for (const width of [375, 768, 1280]) {
    test(`幅 ${width}px で横にはみ出さない`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
