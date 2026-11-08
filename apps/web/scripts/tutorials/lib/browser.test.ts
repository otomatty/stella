import { existsSync } from "node:fs";
import { chromium } from "playwright";
import { afterEach, expect, it, vi } from "vitest";
import { launchTutorialBrowser } from "./browser";

vi.mock("node:fs", () => ({ existsSync: vi.fn() }));
vi.mock("playwright", () => ({ chromium: { launch: vi.fn() } }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

const args = ["--font-render-hinting=none", "--disable-lcd-text"];

it("環境変数の実行ファイルを最優先で使う", async () => {
  vi.stubEnv("PLAYWRIGHT_CHROMIUM_EXECUTABLE", "/custom/chromium");
  vi.mocked(existsSync).mockReturnValue(true);
  await launchTutorialBrowser();
  expect(chromium.launch).toHaveBeenCalledExactlyOnceWith({
    args,
    executablePath: "/custom/chromium",
  });
  expect(existsSync).not.toHaveBeenCalled();
});

it("環境変数が空なら、環境に入っている Chromium を使う", async () => {
  vi.stubEnv("PLAYWRIGHT_CHROMIUM_EXECUTABLE", "");
  vi.mocked(existsSync).mockReturnValue(true);
  await launchTutorialBrowser();
  expect(existsSync).toHaveBeenCalledExactlyOnceWith("/opt/pw-browsers/chromium");
  expect(chromium.launch).toHaveBeenCalledExactlyOnceWith({
    args,
    executablePath: "/opt/pw-browsers/chromium",
  });
});

it("どちらもなければ Playwright の既定のブラウザーを使う", async () => {
  vi.stubEnv("PLAYWRIGHT_CHROMIUM_EXECUTABLE", undefined);
  vi.mocked(existsSync).mockReturnValue(false);
  await launchTutorialBrowser();
  expect(chromium.launch).toHaveBeenCalledExactlyOnceWith({ args });
});
