import { mkdir, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Locator, type Page } from "playwright";
import { getVSCodeShot } from "./scenarios.js";

const origin = "https://webview.stella.local";
const mediaRoot = fileURLToPath(new URL("../../media/", import.meta.url));
const themePath = fileURLToPath(new URL("./vscode-light.css", import.meta.url));

async function serveWebview(page: Page, html: string): Promise<void> {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin && url.pathname === "/index.html") {
      return route.fulfill({ contentType: "text/html; charset=utf-8", body: html });
    }
    if (url.origin === origin && url.pathname === "/theme.css") {
      return route.fulfill({ path: themePath });
    }
    if (url.origin === origin && url.pathname.startsWith("/media/")) {
      try {
        const path = await realpath(join(mediaRoot, decodeURIComponent(url.pathname.slice(7))));
        const fromMedia = relative(mediaRoot, path);
        if (
          fromMedia &&
          !isAbsolute(fromMedia) &&
          fromMedia !== ".." &&
          !fromMedia.startsWith(`..${sep}`)
        ) {
          return await route.fulfill({ path });
        }
      } catch {
        // ファイルが無い場合や Media の外を指すパスは配信しない。
      }
    }
    await route.abort();
  });

  await page.addInitScript(() => {
    Object.assign(window, {
      acquireVsCodeApi: () => ({
        postMessage: () => undefined,
        getState: () => undefined,
        setState: () => undefined,
      }),
    });
  });
  await page.goto(`${origin}/index.html`);
  await page.evaluate(async () => {
    document.body.classList.add("vscode-light");
    document.body.dataset.vscodeThemeKind = "vscode-light";
    const theme = document.createElement("link");
    theme.rel = "stylesheet";
    theme.href = "/theme.css";
    await new Promise<void>((resolve, reject) => {
      theme.onload = () => resolve();
      theme.onerror = () => reject(new Error("ライトテーマを読み込めませんでした"));
      document.head.prepend(theme);
    });
    // レイアウトを確定し、テーマのフォントを読み込んでから撮影する。
    document.body.getBoundingClientRect();
    await document.fonts.ready;
  });
}

async function clipAround(target: Locator) {
  await target.waitFor();
  return target.evaluate((element) => {
    element.scrollIntoView({ block: "start", behavior: "instant" });
    const box = element.getBoundingClientRect();
    const x = Math.max(0, Math.floor(box.left - 24));
    const y = Math.max(0, Math.floor(box.top - 24));
    const right = Math.min(window.innerWidth, Math.ceil(box.right + 24));
    const bottom = Math.min(window.innerHeight, Math.ceil(box.bottom + 24));
    return { x, y, width: right - x, height: bottom - y };
  });
}

async function main(): Promise<void> {
  const names = new Set(
    process.env.RELEASE_SHOTS?.split(",")
      .map((name) => name.trim())
      .filter(Boolean),
  );
  const shots = [...names].map((name) => ({ name, shot: getVSCodeShot(name) }));
  const out = process.env.RELEASE_SHOTS_OUT;
  if (!shots.length || !out)
    throw new Error("RELEASE_SHOTS と RELEASE_SHOTS_OUT を設定してください");

  await mkdir(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM_PATH });
  try {
    for (const { name, shot } of shots) {
      const context = await browser.newContext({
        viewport: shot.viewport,
        deviceScaleFactor: 2,
        colorScheme: "light",
        bypassCSP: true,
        locale: "ja-JP",
        timezoneId: "Asia/Tokyo",
        serviceWorkers: "block",
      });
      try {
        const page = await context.newPage();
        const html = shot.html({
          cspSource: origin,
          styleUri: `${origin}/media/${shot.media.style}`,
          scriptUri: `${origin}/media/${shot.media.script}`,
          nonce: "release-shot",
        });
        await serveWebview(page, html);
        const clip = shot.target ? await clipAround(page.locator(shot.target)) : undefined;
        if (shot.highlight) {
          await page.locator(shot.highlight).evaluate((element) => {
            const box = element.getBoundingClientRect();
            const nearEdge =
              box.left <= 8 ||
              box.top <= 8 ||
              window.innerWidth - box.right <= 8 ||
              window.innerHeight - box.bottom <= 8;
            element.style.outline = "3px solid #f59e0b";
            element.style.outlineOffset = nearEdge ? "-3px" : "4px";
          });
        }
        await page.screenshot({
          path: join(out, `${name}.png`),
          clip,
          animations: "disabled",
          caret: "hide",
        });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
