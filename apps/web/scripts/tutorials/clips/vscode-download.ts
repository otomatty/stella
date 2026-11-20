import { defineClip, step } from "../lib/clips";

const rejectName = /必須以外を拒否|拒否する|^Reject$|^Decline$/;

export default defineClip({
  id: "web/vscode-download",
  standalone: true,
  browser: { tab: "Download VS Code", address: "code.visualstudio.com/download" },
  regions: {
    windows: "#download-alt-win",
    macos: "#download-alt-main-osx",
    platforms: "#alt-downloads",
  },
  async run(t) {
    await t.page.goto("https://code.visualstudio.com/download");
    const reject = t.page
      .locator("#cookie-banner, #wcpConsentBannerCtrl")
      .getByRole("button", { name: rejectName });
    const shown = await reject
      .first()
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(
        () => true,
        () => false,
      );
    if (shown) await t.click(reject.first());
    await t.mark("open", () =>
      step("open", async () => {
        await t.expect("#download-alt-win", { text: "Download" });
        await t.expect("#download-alt-main-osx", { text: "Download" });
        await t.wait(1000);
      }),
    );
    await t.mark("choose", () =>
      step("choose", async () => {
        await t.pretendClick("#download-alt-win");
        await t.wait(1000);
      }),
    );
    await t.mark("done", () =>
      step("done", async () => {
        await t.wait(1200);
      }),
    );
  },
});
