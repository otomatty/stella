import { existsSync } from "node:fs";
import { chromium } from "playwright";

/** 収録用 Chromium の選択と起動をここにまとめる。 */
export function launchTutorialBrowser() {
  const executablePath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
  return chromium.launch({
    args: ["--font-render-hinting=none", "--disable-lcd-text"],
    ...(executablePath ? { executablePath } : {}),
  });
}
