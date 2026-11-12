import type { Locator, Page } from "playwright";
import type { Director } from "../lib/director";

export interface TaskContext {
  taskRoot: string;
  trainingRoot: string;
}

export interface Scenario {
  id: string;
  title: string;
  summary: string;
  /** 動画を置くトピック (packages/content/stages からの相対パス) */
  topic: string;
  /** 取り組む課題 (<ステージ>/<単元>/<課題>) */
  task: string;
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
  await t.click('.menubar-menu-button[aria-label="ファイル"]');
  await t.click(t.page.locator(".monaco-menu .action-label").filter({ hasText: /^保存$/ }));
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
      await dismiss.click({ timeout: 500 });
      if (t) await t.wait(150);
    } catch (error) {
      if (!(await toast.isVisible())) return;
      throw error;
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

export async function rightClick(t: Director, target: Locator) {
  await t.moveTo(target);
  await t.wait(420);
  await t.page.mouse.down({ button: "right" });
  await t.wait(90);
  await t.page.mouse.up({ button: "right" });
  await t.wait(800);
}
