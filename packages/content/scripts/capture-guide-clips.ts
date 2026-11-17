import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
// writeClip の型依存（Director → Window.__tutor）を解決する宣言だけを読む。
// ページには Web 用のオーバーレイを注入しない。
import type {} from "../../../apps/web/scripts/tutorials/lib/overlay";
import { writeClip } from "../../../apps/web/scripts/tutorials/lib/clip-output";
import { ScreenRecorder } from "../../../apps/web/scripts/tutorials/lib/recorder";
import { parseGuideClips, type GuideStep } from "./lib/guide-clips.js";
import { guideMotion } from "./lib/guide-motion.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const pages = path.join(root, "docs/devlab-ts-prework-guide/pages");
const output = path.join(root, "packages/content/clips");
const viewport = { width: 1600, height: 1000 };

async function main() {
  const definitions = parseGuideClips(
    JSON.parse(await readFile(path.join(output, "guide.json"), "utf8")),
    new Set(await readdir(pages)),
  );
  const filters = process.argv.slice(2).filter((arg) => arg !== "--");
  const selected = definitions.filter(
    (d) => !filters.length || filters.some((f) => d.id.startsWith(f)),
  );
  if (!selected.length) throw new Error("該当するクリップの定義はありません");
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    headless: true,
  });
  try {
    for (const definition of selected) {
      const context = await browser.newContext({
        viewport,
        deviceScaleFactor: 1,
        locale: "ja-JP",
        colorScheme: "light",
      });
      const work = await mkdtemp(path.join(os.tmpdir(), "stella-guide-"));
      try {
        const page = await context.newPage();
        await page.goto(pathToFileURL(path.join(pages, definition.page)).href);
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate((zoom) => {
          const content = document.querySelector<HTMLElement>(".page");
          if (!content) throw new Error("ガイドの本文 .page が見つかりません");
          // 本文だけを拡大し、window のスクロール座標とスポットライトの
          // 座標系は viewport のままにする。regions も拡大後の rect を読む。
          content.style.zoom = String(zoom);
        }, definition.zoom);
        const motion = (step: GuideStep, prepare = false) =>
          page.evaluate(
            `var __name = (f) => f; (${guideMotion.toString()})(${JSON.stringify(step)}, ${prepare})`,
          );
        for (const [i, step] of definition.steps.entries()) {
          try {
            await motion(step, true);
          } catch (error) {
            throw new Error(`${definition.id} step[${i}] (${step.mark}): ${String(error)}`);
          }
        }
        // 存在しない領域も、録画する前に定義名と領域名を添えて知らせる。
        for (const [name, selector] of Object.entries(definition.regions)) {
          if (!(await page.locator(selector).count()))
            throw new Error(
              `${definition.id} regions.${name}: セレクタが見つかりません: ${selector}`,
            );
        }
        // 長い章の先頭から高速で流さず、最初の対象の少し手前から撮る。
        const first = definition.steps.find((step) => step.do !== "wait");
        if (first)
          await page.evaluate((selector) => {
            const el = document.querySelector(selector);
            if (el) window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 500);
          }, first.to);
        const recorder = new ScreenRecorder(page, path.join(work, "frames"));
        const marks: Record<string, [number, number]> = {};
        const regions: Record<string, [number, number, number, number]> = {};
        await recorder.start();
        try {
          for (const [i, step] of definition.steps.entries()) {
            const start = recorder.elapsed();
            try {
              await motion(step);
              // 領域と操作対象が同じ、または包含関係なら、その mark 終了時の座標を保存。
              // 後のスクロールで画面外へ消えても上書きせず、領域を使う mark に合わせる。
              for (const [name, selector] of Object.entries(definition.regions)) {
                const rect = await page.evaluate(
                  ({ selector, target }) => {
                    const el = document.querySelector(selector);
                    const active = target ? document.querySelector(target) : null;
                    if (!el || !active || !(el.contains(active) || active.contains(el)))
                      return null;
                    const r = el.getBoundingClientRect();
                    const x = Math.max(0, Math.floor(r.x)),
                      y = Math.max(0, Math.floor(r.y));
                    const right = Math.min(innerWidth, Math.ceil(r.right)),
                      bottom = Math.min(innerHeight, Math.ceil(r.bottom));
                    return right > x && bottom > y
                      ? ([x, y, right - x, bottom - y] as [number, number, number, number])
                      : null;
                  },
                  { selector, target: step.do === "wait" ? null : step.to },
                );
                if (rect) regions[name] = rect;
              }
            } catch (error) {
              throw new Error(`${definition.id} step[${i}] (${step.mark}): ${String(error)}`);
            }
            marks[step.mark] = [start, recorder.elapsed()];
          }
        } finally {
          await recorder.stop();
        }
        // 操作対象と関係のない領域は、従来の Web クリップと同じく最後の画面で採寸。
        for (const [name, selector] of Object.entries(definition.regions)) {
          if (regions[name]) continue;
          const r = await page.locator(selector).first().boundingBox();
          if (r) {
            const x = Math.max(0, Math.floor(r.x)),
              y = Math.max(0, Math.floor(r.y));
            const right = Math.min(viewport.width, Math.ceil(r.x + r.width));
            const bottom = Math.min(viewport.height, Math.ceil(r.y + r.height));
            if (right > x && bottom > y) regions[name] = [x, y, right - x, bottom - y];
          }
          if (!regions[name])
            throw new Error(`${definition.id} regions.${name}: 最後の画面にも領域がありません`);
        }
        const video = path.join(work, "clip.mp4");
        await recorder.encode(video, null, { width: viewport.width });
        await writeClip(
          output,
          video,
          definition.id,
          `docs/devlab-ts-prework-guide/pages/${definition.page}`,
          marks,
          regions,
        );
        console.info(`作成しました: ${definition.id}`);
      } finally {
        try {
          await context.close();
        } finally {
          await rm(work, { recursive: true, force: true });
        }
      }
    }
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
