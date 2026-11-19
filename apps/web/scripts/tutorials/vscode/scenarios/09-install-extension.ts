import { readdir } from "node:fs/promises";
import { step } from "../../lib/clips";
import { bareProfile, webviewWith, type Scenario } from "../helpers";

export default {
  id: "install-extension",
  bare: "ja",
  clip: "vscode/install-extension",
  regions: { left: [0, 40, 880, 550] },
  title: "STELLA拡張を入れる",
  summary: "拡張機能のビューで STELLA を検索してインストールします。",

  async run(t, ctx) {
    const page = t.page;
    const icon = page.locator(".activitybar .action-item", {
      has: page.locator(".codicon-extensions-view-icon"),
    });
    const row = page.locator(
      '.extensions-list .monaco-list-row[data-extension-id="saedgewell.stella-lms"]',
    );
    const search = page
      .locator(
        ".extensions-viewlet .extensions-search-container input, .extensions-viewlet .extensions-search-container textarea, .extensions-viewlet .extensions-search-container .search-box",
      )
      .last();
    await ctx.region("icon", icon);

    await t.mark("open-view", () =>
      step("open-view", async () => {
        await t.click(icon);
        await t.expect(search, { timeout: 15_000 });
        await t.wait(1000);
      }),
    );

    await t.mark("search", () =>
      step("search", async () => {
        await t.click(search);
        await t.type("STELLA");
        await t.expect(row, { timeout: 30_000 });
        await ctx.region("row", row);
        await t.wait(1000);
      }),
    );

    await t.mark("details", () =>
      step("details", async () => {
        await t.click(row);
        const identifier = page
          .locator(".extension-editor .more-info-entry")
          .filter({
            has: page.locator(".more-info-entry-name", { hasText: /^識別子$/ }),
          })
          .filter({ has: page.locator("code", { hasText: "saedgewell.stella-lms" }) });
        await t.expect(identifier, { timeout: 15_000 });
        await identifier.scrollIntoViewIfNeeded();
        await ctx.region("details", page.locator(".extension-editor .header"));
        await ctx.region("identifier", identifier);
        // 本文が空白のまま区間が終わらないよう、見出しが出てから終える。
        const readme = await webviewWith(page, "h1", 30_000);
        await t.expect(readme.locator("h1").first(), { timeout: 30_000 });
        await t.wait(1000);
      }),
    );

    await t.mark("install", () =>
      step("install", async () => {
        const header = page.locator(".extension-editor .header");
        const install = header.getByRole("button", { name: /^インストール$/ });
        await t.click(install);
        const trust = page
          .locator(".monaco-dialog-box")
          .locator(".monaco-button, .monaco-button-label, a, button")
          .filter({ hasText: /信頼してインストール|Trust Publisher/ });
        const shown = await trust
          .first()
          .waitFor({ state: "visible", timeout: 5_000 })
          .then(
            () => true,
            () => false,
          );
        if (shown) await t.click(trust.first());
        await t.expect(header.getByRole("button", { name: /^アンインストール$/ }), {
          timeout: 120_000,
        });
        await ctx.region("installed", header.locator(".actions-status-container"));
        await t.wait(1000);
      }),
    );

    await t.mark("done", () =>
      step("done", async () => {
        await t.wait(1200);
      }),
    );

    await step("installed", async () => {
      const entries = await readdir(bareProfile("ja").exts, { withFileTypes: true });
      if (
        !entries.some(
          (entry) => entry.isDirectory() && entry.name.startsWith("saedgewell.stella-lms-"),
        )
      )
        throw new Error("STELLA 拡張のフォルダーがありません");
    });
  },
} satisfies Scenario;
