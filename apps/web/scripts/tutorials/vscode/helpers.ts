import os from "node:os";
import path from "node:path";
import type { Frame, Locator, Page } from "playwright";
import type { Director } from "../lib/director";
import { pixelRegion } from "../lib/shots";

export interface TaskContext {
  taskRoot: string;
  trainingRoot: string;
  /** Web の「VS Code で開く」と同じ URI を、収録中の VS Code に渡す。lms のときだけ入る。 */
  openTask?: () => Promise<void>;
  /** 提出が届いたかを読むための、収録用 API。lms のときだけ入る。 */
  api?: { base: string; token: string };
  region(name: string, target: Locator): Promise<void>;
}

export interface Scenario {
  id: string;
  /** 教材動画の素材として撮るときの出力 id。 */
  clip?: string;
  /** 動画 (1600×1000) のピクセルで指定する領域。 */
  regions?: Record<string, [number, number, number, number]>;
  title: string;
  summary: string;
  /** 動画を置くトピック (packages/content/stages からの相対パス) */
  topic?: string;
  /** 取り組む課題 (<ステージ>/<単元>/<課題>) */
  task?: string;
  /**
   * 課題・学習フォルダー・開発中の STELLA 拡張を使わない窓で撮る。クリップ専用。
   * "ja": 日本語の言語パック入り。STELLA 拡張は毎回アンインストールしてから起動する。
   * "en": 入れたばかりの状態。言語パックも拡張も無く、毎回プロファイルを作り直す。
   */
  bare?: "ja" | "en";
  /**
   * 収録用のローカル API と Web を起動し、拡張をそこへ接続する。
   * 課題は手元にコピーせず、拡張が API から受け取って学習フォルダーに置く。
   */
  lms?: boolean;
  /** 学習フォルダーに一緒に置く、受け取り済みの課題 */
  others?: string[];
  /** 起動時に開くファイル。既定は index.html、null なら課題文を開いたあと閉じる */
  open?: string | null;
  prepare?(ctx: TaskContext): Promise<void>;
  setup?(page: Page, ctx: TaskContext): Promise<void>;
  run(t: Director, ctx: TaskContext & { page: Page }): Promise<void>;
}

/** 色付けの span をまたいでも、行内の指定した文字だけを滑らかにドラッグする。 */
export async function dragText(t: Director, line: Locator, text: string) {
  await t.expect(line);
  const selection = await line.evaluate((element, selectedText) => {
    const start = (element.textContent ?? "").indexOf(selectedText);
    if (start < 0) throw new Error("選択する文字が見つかりません。");
    const range = document.createRange();
    const nodes = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let offset = 0;
    let started = false;
    let ended = false;
    for (let node = nodes.nextNode(); node; node = nodes.nextNode()) {
      const length = node.textContent?.length ?? 0;
      if (!started && start < offset + length) {
        range.setStart(node, start - offset);
        started = true;
      }
      if (started && start + selectedText.length <= offset + length) {
        range.setEnd(node, start + selectedText.length - offset);
        ended = true;
        break;
      }
      offset += length;
    }
    if (!ended) throw new Error("文字の選択範囲が見つかりません。");
    const rect = range.getBoundingClientRect();
    if (!rect.width || !rect.height) throw new Error("選択する文字が画面にありません。");
    return { left: rect.left + 0.5, right: rect.right - 0.5, y: rect.top + rect.height / 2 };
  }, text);
  await t.moveToPoint(selection.left, selection.y);
  await t.wait(450);
  await t.page.mouse.down();
  await t.moveToPoint(selection.right, selection.y, 60);
  await t.page.mouse.up();
  await t.wait(1000);
}

export async function saveFile(t: Director) {
  await t.press("Control+s", { label: ["Ctrl", "S"] });
  await t.park();
}

/** WebView の本体は、workbench 直下の外側 iframe のさらに内側にある。 */
export function webviewBody(page: Page): Locator {
  return page
    .frameLocator("iframe.webview.ready:visible")
    .first()
    .frameLocator('iframe[src*="fake.html"]')
    .locator("body");
}

/** selector を含むフレームの body。入れ子の iframe も page.frames() から探す。 */
export async function webviewWith(page: Page, selector: string, timeout: number): Promise<Locator> {
  const deadline = Date.now() + timeout;
  const workbench = page.mainFrame();
  for (;;) {
    for (const frame of page.frames()) {
      // 本体のタブ名が WebView の見出しより先に当たる。
      if (frame === workbench || frame.isDetached()) continue;
      try {
        const found = await frame.locator(selector).filter({ visible: true }).count();
        if (!found) continue;
        let visible = true;
        for (
          let current: Frame | null = frame;
          current?.parentFrame();
          current = current.parentFrame()
        ) {
          const iframe = await current.frameElement();
          try {
            if (!(await iframe.isVisible())) {
              visible = false;
              break;
            }
          } finally {
            await iframe.dispose();
          }
        }
        if (visible) return frame.locator("body");
      } catch {
        /* 切り離されたフレームは次の候補へ */
      }
    }
    if (Date.now() >= deadline) throw new Error(`WebView が見つかりません: ${selector}`);
    await page.waitForTimeout(200);
  }
}

export async function closeNotifications(page: Page, t?: Director) {
  const toast = page.locator(".notifications-toasts .notification-toast:visible").first();
  if (!(await toast.isVisible())) return;
  if (t) await t.wait(2000);
  for (let attempt = 0; attempt < 5; attempt++) {
    if (!(await toast.isVisible())) return;
    try {
      if (t) {
        // moveTo の固定待機を避け、自動で消える通知には座標でカーソルを動かす。
        const box = await toast.boundingBox({ timeout: 500 });
        if (!box) return;
        await t.moveToPoint(box.x + box.width / 2, box.y + box.height / 2);
      } else {
        await toast.hover({ timeout: 500 });
      }
      const dismiss = toast.locator(".codicon-notifications-clear").first();
      await dismiss.waitFor({ state: "visible", timeout: 500 });
      if (t) {
        const box = await dismiss.boundingBox({ timeout: 500 });
        if (!box) return;
        await t.moveToPoint(box.x + box.width / 2, box.y + box.height / 2);
      }
      await dismiss.click({ timeout: 1500 });
      if (t) await t.wait(150);
    } catch (error) {
      if (!(await toast.isVisible().catch(() => false))) return;
      if (attempt === 4) throw error;
    }
  }
}

/** 1 行にまとまったフォルダーは、末尾の課題名でも探せるようにする。 */
export function explorerRow(page: Page, name: string, level?: number): Locator {
  const names = [
    `[aria-label=${JSON.stringify(name)}]`,
    `[aria-label$=${JSON.stringify(`\\${name}`)}]`,
    `[aria-label$=${JSON.stringify(`/${name}`)}]`,
  ].join(", ");
  const depth = level === undefined ? "" : `[aria-level="${level}"]`;
  return page.locator(`.explorer-folders-view .monaco-list-row${depth}`).and(page.locator(names));
}

export async function expandFolder(t: Director, row: Locator) {
  await t.expect(row);
  if ((await row.getAttribute("aria-expanded")) === "false") await t.click(row);
}

const TASK_PATH = /^[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+$/;

export function assertScenario(s: Scenario) {
  if (typeof s?.id !== "string" || !/^[a-z0-9-]+$/.test(s.id))
    throw new Error("台本の id または課題の場所が不正です");
  if (s.bare !== undefined && s.bare !== "ja" && s.bare !== "en")
    throw new Error("bare は ja または en にしてください");
  if (s.bare) {
    if (!s.clip) throw new Error("bare の台本には clip が必要です");
    for (const key of ["lms", "others", "open", "prepare"] as const)
      if (Object.hasOwn(s, key)) throw new Error(`bare の台本に ${key} は使えません`);
    return;
  }
  if (!s.topic || !s.task) throw new Error("台本に topic と task が必要です");
  const tasks = [...new Set([s.task, ...(s.others ?? [])])];
  if (tasks.some((task) => !TASK_PATH.test(task)))
    throw new Error("台本の id または課題の場所が不正です");
}

export function bareProfile(lang: "ja" | "en") {
  const root = path.join(os.tmpdir(), "stella-tutorials", "vscode", "bare", lang);
  return {
    root,
    userData: path.join(root, "user-data"),
    exts: path.join(root, "exts"),
    home: path.join(root, "home"),
  };
}

export function recordedRegion(
  rect: { x: number; y: number; width: number; height: number } | null,
  name: string,
): [number, number, number, number] {
  if (!rect) throw new Error(`領域が見つかりません: ${name}`);
  try {
    return pixelRegion(rect, { width: 1280, height: 800 }, 1600 / 1280);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith(`${name}: `)) throw error;
    throw new Error(`${name}: ${message}`);
  }
}

/** エディター右上の「課題を確認する」。ステータスバーには出さない。 */
export function runTaskButton(page: Page): Locator {
  return page
    .locator(".editor-actions")
    .getByRole("button", { name: /課題を確認する/ })
    .filter({ visible: true })
    .first();
}

export function unionBox(boxes: { x: number; y: number; width: number; height: number }[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (boxes.length === 0) throw new Error("領域がありません");
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const box of boxes) {
    if (!(box.width > 0) || !(box.height > 0)) throw new Error("領域のサイズが不正です");
    left = Math.min(left, box.x);
    top = Math.min(top, box.y);
    right = Math.max(right, box.x + box.width);
    bottom = Math.max(bottom, box.y + box.height);
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** 複数の要素を囲む矩形を、収録の 1600×1000 に換算する。 */
export async function coverRegion(
  name: string,
  locators: Locator[],
): Promise<[number, number, number, number]> {
  const boxes: { x: number; y: number; width: number; height: number }[] = [];
  for (const locator of locators) {
    const box = await locator.boundingBox();
    if (!box) throw new Error(`領域が見つかりません: ${name}`);
    boxes.push(box);
  }
  return recordedRegion(unionBox(boxes), name);
}

export function mergeRegions(
  a: [number, number, number, number],
  b: [number, number, number, number],
): [number, number, number, number] {
  const left = Math.min(a[0], b[0]);
  const top = Math.min(a[1], b[1]);
  const right = Math.max(a[0] + a[2], b[0] + b[2]);
  const bottom = Math.max(a[1] + a[3], b[1] + b[3]);
  return [left, top, right - left, bottom - top];
}
