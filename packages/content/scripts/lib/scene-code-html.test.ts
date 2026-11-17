import { runInNewContext } from "node:vm";
import { expect, it } from "vitest";
import { codeSceneState, type CodeScene } from "../../src/scene-code.js";
import { sceneTimelines } from "../../src/scene-timeline.js";
import { sceneHtml, type ScenePageWindow } from "./scene-html.js";

it("コードのHTMLを時刻から描き、打ち込み途中・計算途中・印・字幕と撮影区間を出す", async () => {
  const scene: CodeScene = {
    kind: "code",
    id: "names",
    role: "point",
    point: 1,
    title: "値に名前を付ける",
    code: ["// 合計を作る", "const total = 1200 + 500;", "// 誤りの例", "total = 980;"],
    panel: { kind: "values", items: ["total"] },
    beats: [
      {
        say: "合計を作ります。",
        type: [0, 1],
        calc: { on: "total", expr: "1200 + 500", result: "1700" },
      },
      { say: "これは誤りです。", type: [2, 3], mark: [{ line: 3, kind: "cross" }] },
      { say: "値を変えます。", set: { total: "980" } },
    ],
  };
  const timing = sceneTimelines([scene], [[4, 4, 4]])[0];
  const html = sceneHtml({
    board: { cols: 1, rows: 1, nodes: [] },
    scene,
    state: codeSceneState(scene),
    timing,
    index: 1,
    total: 3,
  });
  expect(html).toContain("JetBrains Mono");
  expect(html).toContain("hljs-keyword");
  expect(html).toContain("#16161a");
  const elements = new Map(
    ["code", "panel", "heading", "caption", "card"].map((id) => [
      id,
      { innerHTML: "", style: {} as Record<string, string> },
    ]),
  );
  const window = {} as ScenePageWindow;
  runInNewContext(/<script>([\s\S]*)<\/script>/.exec(html)?.[1] ?? "", {
    window,
    document: { getElementById: (id: string) => elements.get(id), querySelectorAll: () => [] },
  });
  const content = (id: string) => elements.get(id)?.innerHTML ?? "";
  expect(content("code")).not.toContain("const");
  await window.__setTime(timing.beats[0].start + 0.3);
  expect(content("code")).not.toContain("1200");
  expect(content("panel")).toContain("1200 + 500");
  expect(content("panel")).toContain('class="answer" style="opacity:0"');
  expect(content("caption")).toContain("合計を作ります。");
  await window.__setTime(timing.beats[0].start + 1.5);
  expect(content("code")).toContain("const");
  expect(content("panel")).toContain('class="answer" style="opacity:1"');
  await window.__setTime(timing.beats[1].end);
  expect(content("code")).toContain("✕");
  expect(content("code")).toContain("#e5342b");
  await window.__setTime(timing.beats[2].start + 0.1);
  expect(content("panel")).toContain("1700");
  await window.__setTime(timing.beats[2].start + 1);
  expect(content("panel")).toContain("980");
  expect(window.__busyRanges).toContainEqual([timing.beats[0].start, timing.beats[0].end + 1 / 30]);
  await window.__setTime(timing.duration);
  expect(elements.get("card")?.style.opacity).toBe("1");
  expect(elements.get("heading")?.style.opacity).toBeUndefined();
  expect(html).toContain("background:#0e0e10;color:#fff");
  expect(html).toContain("<span>要点 1</span><h2>値に名前を付ける</h2>");
  expect(window.__overflows()).toEqual([]);
});

it("スクロール寸法ではなく、枠から切れる文字を検出する", () => {
  const scene: CodeScene = {
    kind: "code",
    id: "calls",
    role: "recap",
    title: "結果を見る",
    code: ["// 呼び出しの結果"],
    panel: { kind: "calls", rows: [{ call: "addTax(1000)", result: "1100" }] },
    beats: [{ say: "結果を見ます。", row: [0] }],
  };
  const html = sceneHtml({
    board: { cols: 1, rows: 1, nodes: [] },
    scene,
    state: codeSceneState(scene),
    timing: sceneTimelines([scene], [[3]])[0],
    index: 1,
    total: 3,
  });
  let rect = { left: 120, right: 400, top: 220, bottom: 260, width: 280, height: 40 };
  const node = { textContent: "addTax(1000) → 1100" };
  const panel = {
    id: "panel",
    innerHTML: "",
    style: {},
    clientLeft: 0,
    clientTop: 0,
    clientWidth: 706,
    clientHeight: 480,
    // 内部のレイアウト寸法が枠を超えていても、文字が枠内ならエラーにしない。
    scrollWidth: 706,
    scrollHeight: 482,
    getBoundingClientRect: () => ({ left: 100, top: 200 }),
  };
  const window = {} as ScenePageWindow;
  runInNewContext(/<script>([\s\S]*)<\/script>/.exec(html)?.[1] ?? "", {
    window,
    NodeFilter: { SHOW_TEXT: 4 },
    document: {
      getElementById: (id: string) => (id === "panel" ? panel : { innerHTML: "", style: {} }),
      querySelectorAll: () => [panel],
      createTreeWalker: () => {
        let visited = false;
        return {
          currentNode: node,
          nextNode: () => {
            if (visited) return false;
            visited = true;
            return true;
          },
        };
      },
      createRange: () => ({ selectNodeContents: () => undefined, getClientRects: () => [rect] }),
    },
  });
  expect(window.__overflows()).toEqual([]);
  rect = { ...rect, right: 810, width: 690 };
  expect(window.__overflows()).toEqual([
    "コードの場面で文字がはみ出しています: panel: addTax(1000) → 1100",
  ]);
  rect = { ...rect, right: 400, width: 280, bottom: 685, height: 465 };
  expect(window.__overflows()).toHaveLength(1);
});

it("短いコードは36pxまで拡大し、枠を内容に合わせて中央に置く", () => {
  const render = (code: string[]) => {
    const scene: CodeScene = {
      kind: "code",
      id: "short",
      role: "hook",
      title: "価格を計算する",
      code,
      panel: { kind: "values", items: ["price"] },
      beats: [{ say: "価格を見ます。", type: [0] }],
    };
    return sceneHtml({
      board: { cols: 1, rows: 1, nodes: [] },
      scene,
      state: codeSceneState(scene),
      timing: sceneTimelines([scene], [[3]])[0],
      index: 1,
      total: 3,
      previous: scene,
    });
  };
  const short = render(["// 価格", "const price = 1200;", "// 送料", "const shipping = 500;"]);
  expect(short).toContain("font:400 36px/54px");
  expect(short).toContain("height:365px;padding:28px 24px");
  expect(short).toContain("#content{display:flex;align-items:center;");
  expect(short).toContain('<div id="card"><div id="heading"><span>つかみ</span>');
  expect(short).not.toContain("titleOpacity");
  const long = render(Array.from({ length: 14 }, () => "const price = 1200;"));
  const height = Number(/#code\{[^}]*height:(\d+)px/.exec(long)?.[1]);
  expect(height).toBeGreaterThanOrEqual(810 * 0.45);
  expect(height).toBeLessThanOrEqual(682);
  // 幅の長い行は36pxを強制せず、横幅にも収める。
  const wide = render([`// ${"価格".repeat(18)}`]);
  const font = Number(/#code\{[^}]*font:400 (\d+)px/.exec(wide)?.[1]);
  expect(font).toBeLessThan(36);
});

it("callsの行を出し、コードや値に含むHTMLを実行しない", () => {
  const scene: CodeScene = {
    kind: "code",
    id: "calls",
    role: "recap",
    title: "結果を見る",
    show: true,
    code: ["// 安全な文字列", 'const text = "</script><img>";'],
    panel: { kind: "calls", rows: [{ call: "addTax(980)", result: "1078", note: "税額は98円" }] },
    beats: [{ say: "結果を確かめます。", row: [0] }],
  };
  const html = sceneHtml({
    board: { cols: 1, rows: 1, nodes: [] },
    scene,
    state: codeSceneState(scene),
    timing: sceneTimelines([scene], [[3]])[0],
    index: 1,
    total: 3,
  });
  expect(html).toContain("<span>問題へ</span>");
  expect(html).not.toContain("<span>まとめ</span>");
  expect(html.match(/<\/script>/g)).toHaveLength(1);
  expect(html).not.toContain("</script><img>");
});

it("部分の下線は最初に一致する箇所を囲み、丸い番号を付ける", async () => {
  const scene: CodeScene = {
    kind: "code",
    id: "part",
    role: "point",
    point: 1,
    title: "代入の印",
    show: true,
    code: ["const total = 1 + 2; // ="],
    beats: [{ say: "代入の印です。", part: { line: 0, text: "=" } }],
  };
  const timing = sceneTimelines([scene], [[3]])[0];
  const html = sceneHtml({
    board: { cols: 1, rows: 1, nodes: [] },
    scene,
    state: codeSceneState(scene),
    timing,
    index: 1,
    total: 3,
  });
  const text = "const total = 1 + 2; // =";
  const node = { length: text.length };
  const wraps: { start: number; end: number; numbered: boolean }[] = [];
  let start = 0,
    end = 0;
  const source = {};
  const code = { innerHTML: "", children: [{ querySelector: () => source }] };
  const elements = new Map<string, unknown>([
    ["code", code],
    ...["panel", "caption", "card", "heading"].map((id): [string, unknown] => [
      id,
      { innerHTML: "", style: {} },
    ]),
  ]);
  const window = {} as ScenePageWindow;
  runInNewContext(/<script>([\s\S]*)<\/script>/.exec(html)?.[1] ?? "", {
    window,
    NodeFilter: { SHOW_TEXT: 4 },
    document: {
      getElementById: (id: string) => elements.get(id),
      createTreeWalker: () => {
        let visited = false;
        return {
          currentNode: node,
          nextNode: () => {
            if (visited) return false;
            visited = true;
            return true;
          },
        };
      },
      createRange: () => ({
        setStart: (_node: unknown, n: number) => {
          start = n;
        },
        setEnd: (_node: unknown, n: number) => {
          end = n;
        },
        surroundContents: () => {
          wraps.push({ start, end, numbered: false });
        },
      }),
      createElement: () => ({
        className: "",
        classList: {
          add: () => {
            wraps[wraps.length - 1].numbered = true;
          },
        },
      }),
    },
  });
  await window.__setTime(timing.beats[0].start + 1);
  expect(wraps).toEqual([{ start: text.indexOf("="), end: text.indexOf("=") + 1, numbered: true }]);
});

it("codeの前後では直前の最終コマを0.4秒でクロスフェードする", async () => {
  const scene: CodeScene = {
    kind: "code",
    id: "fade",
    role: "point",
    point: 1,
    title: "名前と値",
    code: ["const price = 1200;"],
    beats: [{ say: "価格を作ります。", type: [0] }],
  };
  const input = {
    board: { cols: 1, rows: 1, nodes: [] },
    scene,
    state: codeSceneState(scene),
    timing: sceneTimelines([scene], [[3]])[0],
    index: 1,
    total: 3,
  };
  expect(sceneHtml(input)).not.toContain('id="previous-code-frame"');
  const html = sceneHtml({ ...input, previousFrame: "data:image/png;base64,previous" });
  expect(html).toContain('id="previous-code-frame"');
  const overlay = { style: {} as Record<string, string> };
  const times: number[] = [];
  const window = {
    __setTime: async (time: number) => {
      times.push(time);
    },
    __busyRanges: [],
  } as unknown as ScenePageWindow;
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  runInNewContext(scripts.at(-1)?.[1] ?? "", {
    window,
    document: { getElementById: () => overlay },
  });
  await window.__setTime(0.2);
  expect(overlay.style.opacity).toBe("0.5");
  await window.__setTime(0.4);
  expect(overlay.style.opacity).toBe("0");
  expect(times).toContain(0.4);
  expect(window.__busyRanges).toEqual([[0, 0.4]]);
});

it("数直線の点の出現・移動・区間・矢印・目盛りの印・値の箱を描く", async () => {
  const scene: CodeScene = {
    kind: "code",
    id: "floor",
    role: "point",
    point: 1,
    title: "切り捨て",
    code: ["const points = Math.floor(19.8);"],
    panel: { kind: "numberLine", from: 18, to: 21, items: ["points"] },
    beats: [
      { say: "点を置きます。", plot: { at: 19.8, label: "<19.8>" } },
      { say: "間です。", range: [19, 20] },
      { say: "切り捨てます。", snap: { to: 19, label: "<切り捨て>" } },
      {
        say: "二十ではありません。",
        tick: [
          { at: 20, kind: "cross" },
          { at: 19, kind: "check" },
        ],
      },
      { say: "値を入れます。", set: { points: "19" } },
    ],
  };
  const timing = sceneTimelines([scene], [[3, 3, 3, 3, 3]])[0];
  const html = sceneHtml({
    board: { cols: 1, rows: 1, nodes: [] },
    scene,
    state: codeSceneState(scene),
    timing,
    index: 0,
    total: 1,
  });
  const elements = new Map(
    ["code", "panel", "caption", "card"].map((id) => [id, { innerHTML: "", style: {} }]),
  );
  const window = {} as ScenePageWindow;
  runInNewContext(/<script>([\s\S]*)<\/script>/.exec(html)?.[1] ?? "", {
    window,
    document: { getElementById: (id: string) => elements.get(id) },
  });
  const panel = () => elements.get("panel")?.innerHTML ?? "";
  expect(panel()).toContain('font-size="36"');
  expect(html).toContain("margin-bottom:32px");
  expect(panel()).not.toContain("<circle");
  await window.__setTime(timing.beats[0].start);
  expect(panel()).toContain('<g opacity="0"');
  await window.__setTime(timing.beats[0].start + 1);
  expect(Number(/translate\(([^ ]+) 262\)/.exec(panel())?.[1])).toBeCloseTo(414);
  expect(panel()).toContain("&lt;19.8&gt;");
  await window.__setTime(timing.beats[1].start + 1);
  expect(panel()).toContain('height="24"');
  expect(panel()).toContain('y="250"');
  await window.__setTime(timing.beats[2].start + 0.5);
  expect(Number(/translate\(([^ ]+) 262\)/.exec(panel())?.[1])).toBeCloseTo(271.6666667);
  expect(panel()).toContain('marker-end="url(#snap-arrow)"');
  expect(panel()).toContain("&lt;切り捨て&gt;");
  await window.__setTime(timing.beats[4].start + 1);
  expect(Number(/translate\(([^ ]+) 262\)/.exec(panel())?.[1])).toBeCloseTo(251.3333333);
  expect(panel()).toContain('font-weight="800"');
  expect(panel()).toContain('fill="#e5342b">✕');
  expect(panel()).toContain('fill="#16a34a">○');
  expect(panel()).toContain('class="value-box active"');
  expect(panel()).toContain(">19</strong>");
  // ブラウザーを使わず、出力された座標とフォントサイズから余裕を持った矩形で検査する。
  // テキストは上1em・下0.3em・1文字1emとして実際より広めに見積もる。
  const assertSeparated = (markup: string) => {
    const boxes: { name: string; left: number; right: number; top: number; bottom: number }[] = [];
    const attr = (tag: string, name: string) =>
      Number(new RegExp(`${name}="([^" ]+)"`).exec(tag)?.[1]);
    const point = /translate\(([^ ]+) ([^)]+)\)/.exec(markup);
    for (const match of markup.matchAll(
      /<text class="(number-line-[^"]+)"([^>]*)>([^<]*)<\/text>/g,
    )) {
      const [, name, tag, escaped] = match;
      const font = attr(tag, "font-size");
      const text = escaped.replace(/&(?:lt|gt|amp|quot);/g, "x");
      const x = attr(tag, "x") + (name === "number-line-point-label" ? Number(point?.[1]) : 0);
      const y = attr(tag, "y") + (name === "number-line-point-label" ? Number(point?.[2]) : 0);
      boxes.push({
        name,
        left: x - (text.length * font) / 2,
        right: x + (text.length * font) / 2,
        top: y - font,
        bottom: y + font * 0.3,
      });
    }
    const arrow = /class="number-line-arrow" d="M ([^ ]+) ([^ ]+) H ([^"]+)"/.exec(markup);
    if (arrow) {
      // 線幅4px × markerHeight 6。矢じりを含む矩形。
      boxes.push({
        name: "arrow",
        left: Math.min(Number(arrow[1]), Number(arrow[3])) - 4,
        right: Math.max(Number(arrow[1]), Number(arrow[3])) + 4,
        top: Number(arrow[2]) - 12,
        bottom: Number(arrow[2]) + 12,
      });
    }
    for (let i = 0; i < boxes.length; i++) {
      for (const b of boxes.slice(i + 1)) {
        const a = boxes[i];
        expect(
          a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top,
          `${a.name} と ${b.name} が重なっています`,
        ).toBe(true);
      }
    }
    const pointBox = /class="number-line-point-label-box"([^>]*)/.exec(markup)?.[1];
    if (pointBox) {
      const bottom = attr(pointBox, "y") + Number(point?.[2]) + attr(pointBox, "height");
      expect(bottom).toBeLessThan(100); // 矢印の札の領域より上に収まる。
    }
  };
  for (const beat of timing.beats) {
    for (let elapsed = 0; elapsed <= 1.1; elapsed += 0.1) {
      await window.__setTime(beat.start + elapsed);
      assertSeparated(panel());
    }
  }
  expect(panel()).toContain('r="14"');
  expect(panel()).toContain('font-size="30" font-weight="700"');
  expect(panel()).toContain('font-size="40"');
  expect(panel()).toContain('font-size="26"');
  const labelX = Number(/class="number-line-snap-label" x="([^"]+)"/.exec(panel())?.[1]);
  expect(labelX).toBeCloseTo((414 + 251.3333333) / 2);
  await window.__setTime(0);
  expect(panel()).not.toContain("<circle");
});
