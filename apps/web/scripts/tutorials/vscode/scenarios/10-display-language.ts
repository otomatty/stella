import { step } from "../../lib/clips";
import { closeNotifications, type Scenario } from "../helpers";

export default {
  id: "display-language",
  bare: "en",
  clip: "vscode/display-language",
  regions: { work: [200, 0, 1000, 625], menubar: [40, 0, 400, 44] },
  title: "表示を日本語にする",
  summary: "表示言語を日本語に切り替えます。",

  async setup(page) {
    await closeNotifications(page);
  },

  async run(t, ctx) {
    const page = t.page;
    const view = page.locator('.menubar-menu-button[aria-label="View"]');
    await ctx.region("view-menu", view);

    await t.mark("open-palette", () =>
      step("open-palette", async () => {
        await t.click(view);
        const box = await view.boundingBox();
        if (!box) throw new Error("View メニューがありません");
        // メニューバーを横に横切ると隣のメニューに切り替わる。先に真下へ入る。
        await t.moveToPoint(box.x + box.width / 2, box.y + box.height + 28);
        const palette = page
          .locator(".monaco-menu .action-item")
          .filter({ hasText: /^Command Palette/ })
          .filter({ visible: true })
          .first();
        await t.expect(palette);
        await t.click(palette);
        await t.expect(".quick-input-widget");
        await t.wait(1000);
      }),
    );

    await t.mark("find-command", () =>
      step("find-command", async () => {
        await t.type("Configure Display Language");
        await t.expect(page.locator(".quick-input-widget .monaco-list-row").first(), {
          text: "Configure Display Language",
        });
        await t.press("Enter");
        await t.expect(".quick-input-widget .monaco-list-row");
        await ctx.region("languages", page.locator(".quick-input-widget"));
        await t.wait(1000);
      }),
    );

    await t.mark("choose-japanese", () =>
      step("choose-japanese", async () => {
        let row = page
          .locator(".quick-input-widget .monaco-list-row")
          .filter({ hasText: "日本語" });
        if ((await row.count()) === 0) {
          await t.type("日本語");
          row = page.locator(".quick-input-widget .monaco-list-row").filter({ hasText: "日本語" });
        }
        await t.click(row);
        const dialog = page
          .locator(".monaco-dialog-box, .notifications-toasts .notification-toast")
          .filter({ hasText: /Restart/ })
          .last();
        await t.expect(dialog, { timeout: 180_000 });
        await ctx.region("restart", dialog);
        await t.pretendClick(
          dialog
            .locator("a, button, .monaco-button")
            .filter({ hasText: /Restart/ })
            .last(),
        );
        await t.wait(1000);
      }),
    );

    await t.mark("done", () =>
      step("done", async () => {
        await t.wait(1200);
      }),
    );
  },
} satisfies Scenario;
