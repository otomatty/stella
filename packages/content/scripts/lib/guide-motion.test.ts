import { runInNewContext } from "node:vm";
import { expect, it } from "vitest";
import { guideMotion } from "./guide-motion.js";

/** DOM の描画は Chromium で確かめる。ここでは仮想時計で順番と完了を検査する。 */
function motionPage(
  kind: "rows" | "reveal" | "type" | "lines",
  numbers = [1, 2, 3],
  targetOverride?: unknown,
  documentOverrides: Record<string, unknown> = {},
) {
  const items = (kind === "rows" ? [0, 0, 0, 0, 0, 0] : numbers).map((number) => ({
    dataset: {} as Record<string, string>,
    querySelector: () => ({ textContent: String(number) }),
  }));
  const target = {
    querySelectorAll: () => items,
    matches: (selector: string) => kind === "reveal" && selector === "figure.anat",
    getBoundingClientRect: () => ({ top: 100, bottom: 200 }),
  };
  let now = 0;
  let nextFrame: ((now: number) => void) | undefined;
  const timers: { at: number; callback: () => void }[] = [];
  let removedSpot = false;
  const api = runInNewContext(`(${guideMotion.toString()})`, {
    Node: { TEXT_NODE: 3 },
    getComputedStyle: () => ({ lineHeight: "24px", paddingTop: "14px" }),
    document: {
      getElementById: () => ({}),
      querySelector: (selector: string) =>
        selector === ".guide-spot"
          ? {
              remove: () => {
                removedSpot = true;
              },
            }
          : selector === "#target"
            ? (targetOverride ?? target)
            : null,
      ...documentOverrides,
    },
    innerHeight: 1000,
    performance: { now: () => now },
    requestAnimationFrame: (callback: (now: number) => void) => {
      nextFrame = callback;
    },
    setTimeout: (callback: () => void, ms: number) => {
      timers.push({ at: now + ms, callback });
    },
  }) as typeof guideMotion;
  return {
    items,
    hidden: () => items.map((item) => "guideHidden" in item.dataset),
    api,
    removedSpot: () => removedSpot,
    tick: async (ms: number) => {
      now = ms;
      const callback = nextFrame;
      nextFrame = undefined;
      callback?.(now);
      for (const timer of timers.filter((timer) => timer.at <= now)) timer.callback();
      await Promise.resolve();
    },
  };
}
it("rows は呼び出しを先に出し、結果を後から出して全行で止める", async () => {
  const page = motionPage("rows");
  const step = { do: "rows", mark: "eg", to: "#target" } as const;
  await page.api(step, true);
  expect(page.hidden()).toEqual([true, true, true, true, true, true]);
  let complete = false;
  const recording = page.api(step).then(() => {
    complete = true;
  });
  // rAF のフレーム時刻が performance.now() より前でも、呼び出し1つだけ。
  await page.tick(-900);
  expect(page.hidden()).toEqual([false, true, true, true, true, true]);
  await page.tick(0);
  expect(page.hidden()).toEqual([false, true, true, true, true, true]);
  await page.tick(100);
  expect(page.hidden()).toEqual([false, true, true, true, true, true]);
  await page.tick(350);
  expect(page.hidden()).toEqual([false, false, true, true, true, true]);
  await page.tick(1800);
  expect(page.hidden()).toEqual([false, false, false, false, false, false]);
  expect(complete).toBe(false);
  await page.tick(2300);
  await recording;
  expect(complete).toBe(true);
  expect(page.removedSpot()).toBe(true);
});
it("部品図は DOM 順によらず番号順に札を含めて出す", async () => {
  const page = motionPage("reveal", [3, 1, 2]);
  const step = { do: "reveal", mark: "parts", to: "#target" } as const;
  await page.api(step, true);
  const recording = page.api(step);
  await page.tick(-900);
  expect(page.hidden()).toEqual([true, false, true]);
  await page.tick(0);
  expect(page.hidden()).toEqual([true, false, true]);
  await page.tick(100);
  expect(page.hidden()).toEqual([true, false, true]);
  await page.tick(650);
  expect(page.hidden()).toEqual([true, false, false]);
  await page.tick(1800);
  expect(page.hidden()).toEqual([false, false, false]);
  await page.tick(2300);
  await recording;
});
it("注入した関数だけで不足するセレクタを報告できる", async () => {
  const page = motionPage("rows");
  await expect(page.api({ do: "scroll", mark: "open", to: "#missing" }, true)).rejects.toThrow(
    "セレクタが見つかりません: #missing",
  );
});

/** 必要な DOM 操作だけを持つ木。親の要素を保って全テキストを辿れたかを検査する。 */
class MotionNode {
  childNodes: MotionNode[] = [];
  parent?: MotionNode;
  dataset: Record<string, string> = {};
  style: Record<string, string> = {};
  className = "";
  constructor(
    readonly tag: string,
    private text = "",
  ) {}
  get nodeType() {
    return this.tag === "#text" ? 3 : 1;
  }
  get textContent(): string {
    return this.text + this.childNodes.map((node) => node.textContent).join("");
  }
  set textContent(value: string) {
    this.text = value;
    this.childNodes = [];
  }
  append(node: MotionNode) {
    node.parent = this;
    this.childNodes.push(node);
  }
  replaceChild(fragment: MotionNode, node: MotionNode) {
    const index = this.childNodes.indexOf(node);
    if (index < 0) throw new Error("子ノードがありません");
    for (const child of fragment.childNodes) child.parent = this;
    this.childNodes.splice(index, 1, ...fragment.childNodes);
  }
  querySelectorAll(selector: string): MotionNode[] {
    const key = selector === "[data-guide-char]" ? "guideChar" : "guideHidden";
    return this.childNodes.flatMap((node) => [
      ...(key in node.dataset ? [node] : []),
      ...node.querySelectorAll(selector),
    ]);
  }
  querySelector(selector: string) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
  matches(selector: string) {
    return this.tag === selector;
  }
  getBoundingClientRect() {
    return { top: 100, bottom: 200 };
  }
  remove() {
    const siblings = this.parent?.childNodes;
    if (siblings) siblings.splice(siblings.indexOf(this), 1);
  }
}
it.each([-16, -900])(
  "type は開始より前のフレーム時刻 %sms でも空を保ち、入れ子の文字を1.8秒で順に出す",
  async (frameTime) => {
    const pre = new MotionNode("pre"),
      code = new MotionNode("code");
    const comment = new MotionNode("span"),
      keyword = new MotionNode("span"),
      string = new MotionNode("span");
    comment.className = "hljs-comment";
    keyword.className = "hljs-keyword";
    string.className = "hljs-string";
    comment.append(new MotionNode("#text", "// コメント"));
    keyword.append(new MotionNode("#text", "const"));
    string.append(new MotionNode("#text", '"東京"'));
    pre.append(code);
    code.append(comment);
    code.append(new MotionNode("#text", "\n"));
    code.append(keyword);
    code.append(new MotionNode("#text", " city = "));
    code.append(string);
    code.append(new MotionNode("#text", ";\n"));
    const original = pre.textContent;
    const style = new MotionNode("style");
    const page = motionPage("type", [], pre, {
      getElementById: () => null,
      head: {
        append: (node: MotionNode) => {
          style.textContent = node.textContent;
        },
      },
      createElement: (tag: string) => new MotionNode(tag),
      createTextNode: (text: string) => new MotionNode("#text", text),
      createDocumentFragment: () => new MotionNode("#fragment"),
    });
    const step = { do: "type", mark: "sample", to: "#target" } as const;
    await page.api(step, true);
    const chars = pre.querySelectorAll("[data-guide-char]");
    const visible = () =>
      chars
        .filter((char) => !("guideHidden" in char.dataset))
        .map((char) => char.textContent)
        .join("");
    expect(chars).toHaveLength([...original.replaceAll("\n", "")].length);
    expect(chars.every((char) => char.textContent !== "\n")).toBe(true);
    expect(visible()).toBe("");
    expect(style.textContent).toContain("visibility:hidden !important");
    expect(pre.textContent).toBe(original);
    expect(code.childNodes).toContain(comment);
    expect(code.childNodes).toContain(keyword);
    expect(code.childNodes).toContain(string);
    expect(comment.className).toBe("hljs-comment");
    expect(string.className).toBe("hljs-string");
    // 同じ pre を再度使っても文字を二重に包まない。
    await page.api(step, true);
    expect(pre.querySelectorAll("[data-guide-char]")).toHaveLength(chars.length);
    const recording = page.api(step);
    expect(visible()).toBe("");
    await page.tick(frameTime);
    expect(visible()).toBe("");
    await page.tick(0);
    expect(visible()).toBe("");
    await page.tick(50);
    const early = visible().length;
    await page.tick(900);
    const middle = visible().length;
    expect(middle).toBe(Math.floor(chars.length / 2));
    await page.tick(1800);
    const end = visible().length;
    expect(early).toBeLessThan(middle);
    expect(middle).toBeLessThan(end);
    expect(visible()).toBe(original.replaceAll("\n", ""));
    expect(pre.textContent).toBe(original);
    await page.tick(2300);
    await recording;
  },
);
it("lines は途中で帯が別の行へ動き、最後は帯を消す", async () => {
  const pre = new MotionNode("pre");
  pre.textContent = "const first = 1;\nconst second = 2;\nreturn first + second;";
  pre.style.position = "static";
  const page = motionPage("lines", [], pre, {
    createElement: (tag: string) => new MotionNode(tag),
  });
  const recording = page.api({ do: "lines", mark: "skeleton", to: "#target" });
  const band = pre.childNodes[0];
  expect(band.style.top).toBe("14px");
  await page.tick(-900);
  expect(band.style.top).toBe("14px");
  await page.tick(0);
  expect(band.style.top).toBe("14px");
  await page.tick(900);
  expect(band.style.top).toBe("38px");
  await page.tick(1700);
  expect(band.style.top).toBe("62px");
  await page.tick(1800);
  expect(pre.childNodes).toHaveLength(0);
  expect(pre.style.position).toBe("static");
  await page.tick(2300);
  await recording;
});
