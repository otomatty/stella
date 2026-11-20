import { step } from "../../lib/clips";
import type { Scenario } from "../helpers";

export default {
  id: "japanese-ui",
  bare: "ja",
  clip: "vscode/japanese-ui",
  regions: { top: [0, 0, 800, 500] },
  title: "日本語のメニューを開く",
  summary: "メニューバーが日本語で開くことを確かめます。",

  async run(t, ctx) {
    const page = t.page;
    await t.mark("menu", () =>
      step("menu", async () => {
        await t.click(page.locator('.menubar-menu-button[aria-label="ファイル"]'));
        const menu = page.locator(".monaco-menu").filter({ hasText: "新しいテキスト ファイル" });
        await t.expect(menu);
        await ctx.region("menu", menu);
        await ctx.region("menubar", page.locator(".menubar"));
        await t.wait(1000);
      }),
    );
    await page.keyboard.press("Escape");
    await t.mark("done", () =>
      step("done", async () => {
        await t.wait(1200);
      }),
    );
  },
} satisfies Scenario;
