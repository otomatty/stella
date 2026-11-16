/// <reference lib="dom" />
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Browser } from "playwright";
import { launchTutorialBrowser } from "./lib/browser";
import { Director } from "./lib/director";
import { TutorialEnvironment, WEB_ROOT, jwtSecret, mintToken } from "./lib/environment";
import { defineShots, pixelRegion, validateShot, type ShotsDefinition } from "./lib/shots";

const viewport = { width: 1280, height: 800 };
const scale = 2;
const output = path.resolve(WEB_ROOT, "../../packages/content/shots");
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
  const dir = path.join(WEB_ROOT, "scripts/tutorials/shots");
  const definitions: { definition: ShotsDefinition; source: string }[] = [];
  const ids = new Set<string>();
  for (const file of (await readdir(dir)).filter((f) => f.endsWith(".ts")).sort()) {
    const mod = await import(pathToFileURL(path.join(dir, file)).href);
    const definition = defineShots(mod.default);
    if (ids.has(definition.id)) throw new Error(`定義 id が重複しています: ${definition.id}`);
    ids.add(definition.id);
    if (!filters.length || filters.some((f) => definition.id.includes(f)))
      definitions.push({ definition, source: `apps/web/scripts/tutorials/shots/${file}` });
  }
  if (!definitions.length) {
    console.log("該当する静止画の定義はありません");
    return;
  }
  const secret = jwtSecret();
  const environment = new TutorialEnvironment();
  let browser: Browser | undefined;
  const captured = new Set<string>();
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
        deviceScaleFactor: scale,
        colorScheme: "light",
        locale: "ja-JP",
        timezoneId: "Asia/Tokyo",
      });
      try {
        const page = await context.newPage();
        await page.addInitScript(
          ({ token }) => {
            localStorage.setItem("stella_auth_token_v1", token);
            localStorage.setItem("theme", "light");
            // Director の表示 API を無表示にする。DOM・イベントリスナーは作らない。
            const noop = () => {
              /* 静止画では表示しない */
            };
            window.__tutor = {
              title: noop,
              hideTitle: noop,
              caption: noop,
              hideCaption: noop,
              setHidden: noop,
              highlight: noop,
              keys: noop,
            };
          },
          { token: mintToken(secret, definition.user ?? "seed-learner") },
        );
        const t = new Director(page, null);
        await definition.run(t, async (id, options) => {
          validateShot(id, options);
          if (captured.has(id)) throw new Error(`ショット id が重複しています: ${id}`);
          // スクロールを先にすべて済ませ、そのあとの同じ画面で領域を測る。
          for (const [name, selector] of Object.entries(options.regions)) {
            const loc = page.locator(selector).first();
            await loc.waitFor({ state: "visible" });
            if (!options.clipRegions?.includes(name)) await loc.scrollIntoViewIfNeeded();
          }
          await page.evaluate(() => document.fonts.ready.then(() => undefined));
          await page.waitForTimeout(350);
          const regions: Record<string, [number, number, number, number]> = {};
          for (const [name, selector] of Object.entries(options.regions)) {
            const rect = await page
              .locator(selector)
              .first()
              .evaluate((el) => {
                const r = el.getBoundingClientRect();
                return { x: r.x, y: r.y, width: r.width, height: r.height };
              });
            try {
              regions[name] = pixelRegion(
                rect,
                viewport,
                scale,
                options.clipRegions?.includes(name),
              );
            } catch (e) {
              throw new Error(`${id} / ${name}: ${(e as Error).message}`);
            }
          }
          // 領域の検査が終わるまで既存の素材を書き換えない。
          const png = await page.screenshot({
            type: "png",
            animations: "disabled",
            scale: "device",
          });
          const file = path.join(output, id);
          await mkdir(path.dirname(file), { recursive: true });
          await writeFile(`${file}.png`, png);
          await writeFile(
            `${file}.json`,
            JSON.stringify(
              { source, width: viewport.width * scale, height: viewport.height * scale, regions },
              null,
              2,
            ).replace(/\[\s+(\d+),\s+(\d+),\s+(\d+),\s+(\d+)\s+\]/g, "[$1, $2, $3, $4]") + "\n",
          );
          captured.add(id);
          console.log(`作成しました: ${id}`);
        });
      } finally {
        await context.close();
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
