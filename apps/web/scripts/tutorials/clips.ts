/// <reference lib="dom" />
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Browser } from "playwright";
import { launchTutorialBrowser } from "./lib/browser";
import { writeClip } from "./lib/clip-output";
import { defineClip, type ClipDefinition, type Regions } from "./lib/clips";
import { Director } from "./lib/director";
import { TutorialEnvironment, WEB_ROOT, jwtSecret, mintToken } from "./lib/environment";
import { overlayScript } from "./lib/overlay";
import { ScreenRecorder } from "./lib/recorder";
import { pixelRegion } from "./lib/shots";

const viewport = { width: 1280, height: 800 };
async function main() {
  const args = process.argv.slice(2);
  const filters: string[] = [];
  let url: string | undefined;
  let skipBuild = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--") continue;
    if (arg === "--skip-build") skipBuild = true;
    else if (arg === "--url") {
      url = args[++i];
      if (!url || !/^https?:\/\//.test(url))
        throw new Error("--url には起動済みの Web の URL を指定してください");
    } else if (arg.startsWith("--")) throw new Error(`不明な引数: ${arg}`);
    else filters.push(arg);
  }
  const dir = path.join(WEB_ROOT, "scripts/tutorials/clips");
  const definitions: { definition: ClipDefinition; source: string }[] = [];
  const ids = new Set<string>();
  for (const file of (await readdir(dir)).filter((f) => f.endsWith(".ts")).sort()) {
    const definition = defineClip((await import(pathToFileURL(path.join(dir, file)).href)).default);
    if (ids.has(definition.id)) throw new Error(`定義 id が重複しています: ${definition.id}`);
    ids.add(definition.id);
    if (!filters.length || filters.some((f) => definition.id.includes(f)))
      definitions.push({ definition, source: `apps/web/scripts/tutorials/clips/${file}` });
  }
  if (!definitions.length) {
    console.log("該当するクリップの定義はありません");
    return;
  }
  const secret = jwtSecret();
  const environment = new TutorialEnvironment();
  let browser: Browser | undefined;
  try {
    const base = url ? url.replace(/\/$/, "") : await environment.boot(skipBuild);
    browser = await launchTutorialBrowser();
    for (const { definition, source } of definitions) {
      if (!url) await environment.reset(secret, definition.seedSql);
      else if (definition.seedSql?.length)
        console.warn(`警告: ${definition.id} の seedSql は --url 指定時には適用しません`);
      const context = await browser.newContext({
        baseURL: base,
        viewport,
        deviceScaleFactor: 1.5,
        colorScheme: "light",
        locale: "ja-JP",
        timezoneId: "Asia/Tokyo",
      });
      const work = await mkdtemp(path.join(os.tmpdir(), "stella-clip-"));
      let recorder: ScreenRecorder | undefined;
      try {
        const page = await context.newPage();
        await page.addInitScript(
          ({ token }) => {
            localStorage.setItem("stella_auth_token_v1", token);
            localStorage.setItem("theme", "light");
          },
          { token: mintToken(secret, definition.user ?? "seed-learner") },
        );
        await page.addInitScript({
          content: `var __name = (f) => f; (${overlayScript.toString()})(${JSON.stringify({ accent: "#6470e8", clip: true })});`,
        });
        await page.goto(base);
        await page.waitForSelector("body");
        recorder = new ScreenRecorder(page, path.join(work, "frames"));
        const t = new Director(page, recorder, { clip: true });
        await recorder.start();
        const regions: Regions = {};
        try {
          await definition.run(t);
          for (const [name, selector] of Object.entries(definition.regions)) {
            const loc = page.locator(selector).first();
            await loc.waitFor({ state: "visible" });
            const rect = await loc.boundingBox();
            if (!rect) throw new Error(`領域が見つかりません: ${name}`);
            regions[name] = pixelRegion(rect, viewport, 1600 / viewport.width);
          }
        } finally {
          await recorder.stop();
        }
        const video = path.join(work, "clip.mp4");
        await recorder.encode(video, null, { width: 1600 });
        await writeClip(
          path.resolve(WEB_ROOT, "../../packages/content/clips"),
          video,
          definition.id,
          source,
          t.marks,
          regions,
        );
        console.log(`作成しました: ${definition.id}`);
      } finally {
        try {
          await context.close();
        } finally {
          await rm(work, { recursive: true, force: true });
        }
      }
    }
  } finally {
    try {
      await browser?.close();
    } finally {
      await environment.close();
    }
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
