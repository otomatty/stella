import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { codeSceneState, type CodeScene } from "../../src/scene-code.js";
import { sceneTimelines } from "../../src/scene-timeline.js";
import { storyboardStates, type Board, type Scene } from "../../src/video-storyboard.js";
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

it.each([
  { kind: "values", expr: "short", result: "123", stacked: false, size: 38, overflow: false },
  {
    kind: "values",
    expr: `\`\${item}を\${count}冊注文しました\``,
    result: '"ノートを3冊注文しました"',
    stacked: true,
    size: 26,
    overflow: false,
  },
  {
    kind: "numberLine",
    expr: "long expression",
    result: "1234567890",
    stacked: true,
    size: 38,
    overflow: false,
  },
  { kind: "values", result: "12345678901234567890", stacked: false, size: 22, overflow: true },
  { kind: "numberLine", result: "123456789012345", stacked: false, size: 26, overflow: false },
] as const)("値の箱の実寸に応じて配置と文字サイズを決める: $kind / $result", async (test) => {
  const expr = "expr" in test ? test.expr : undefined;
  const scene: CodeScene = {
    kind: "code",
    id: "fit",
    role: "hook",
    title: "値を見る",
    code: ["// 値"],
    panel:
      test.kind === "values"
        ? { kind: "values", items: ["x", "longName"] }
        : { kind: "numberLine", from: 0, to: 1, items: ["x", "longName"] },
    beats: [
      {
        say: "値を見ます。",
        ...(expr ? { calc: { on: "x", expr, result: test.result } } : { set: { x: test.result } }),
      },
    ],
  };
  const timing = sceneTimelines([scene], [[3]])[0];
  const html = sceneHtml({
    board: { cols: 1, rows: 1, nodes: [] },
    scene,
    state: codeSceneState(scene),
    timing,
    index: 0,
    total: 1,
  });
  // DOM の実寸を模した測定値。文字サイズの変更後も幅を再計算する。
  const result = {
    style: {} as Record<string, string>,
    getBoundingClientRect: () => ({
      width: test.result.length * Number.parseInt(result.style.fontSize ?? "38", 10),
    }),
  };
  const answer = {
    getBoundingClientRect: () => ({
      width: result.getBoundingClientRect().width + (expr ? 20 : 0),
    }),
  };
  const classes = new Set<string>();
  const content = {
    id: "value-content",
    clientWidth: 432,
    clientHeight: 200,
    clientLeft: 0,
    clientTop: 0,
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
    classList: { add: (name: string) => classes.add(name) },
    querySelector: (selector: string) =>
      selector === "strong"
        ? result
        : selector === ".answer"
          ? expr
            ? answer
            : null
          : expr
            ? { getBoundingClientRect: () => ({ width: expr.length * 14 }) }
            : null,
  };
  const names = [40, 170].map((width) => ({
    style: {} as Record<string, string>,
    getBoundingClientRect: () => ({ width }),
  }));
  const boxes = names.map((name) => ({
    querySelector: (selector: string) => (selector === ".name" ? name : content),
  }));
  const panel = { innerHTML: "", querySelectorAll: () => boxes };
  const node = { textContent: test.result };
  const window = {} as ScenePageWindow;
  runInNewContext(/<script>([\s\S]*)<\/script>/.exec(html)?.[1] ?? "", {
    window,
    NodeFilter: { SHOW_TEXT: 4 },
    document: {
      getElementById: (id: string) => (id === "panel" ? panel : { innerHTML: "", style: {} }),
      querySelectorAll: () => [content],
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
        selectNodeContents: () => undefined,
        getClientRects: () => [
          {
            left: 16,
            right: 16 + answer.getBoundingClientRect().width,
            top: 12,
            bottom: 60,
            width: answer.getBoundingClientRect().width,
            height: 48,
          },
        ],
      }),
    },
  });
  await window.__setTime(timing.beats[0].start + 1.5);
  expect(classes.has("stacked")).toBe(test.stacked);
  expect(Number.parseInt(result.style.fontSize ?? "38", 10)).toBe(test.size);
  expect(names.map((name) => name.style.width)).toEqual(["170px", "170px"]);
  expect(window.__overflows().length > 0).toBe(test.overflow);
  if (test.overflow)
    expect(window.__overflows()[0]).toContain("コードの場面で文字がはみ出しています");
  expect(html).toContain(".value-content.stacked{flex-direction:column;align-items:flex-end;");
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

it("等幅のコード・値・呼び出し表で合字を無効にする", () => {
  const scene: CodeScene = {
    kind: "code",
    id: "operators",
    role: "hook",
    title: "入力する記号",
    code: ["// <= >= !== をそのまま見せる"],
    beats: [{ say: "記号を見ます。", type: [0] }],
  };
  const html = sceneHtml({
    board: { cols: 1, rows: 1, nodes: [] },
    scene,
    state: codeSceneState(scene),
    timing: sceneTimelines([scene], [[3]])[0],
    index: 0,
    total: 1,
  });
  // font の一括指定より後で、子要素のフォント指定にも適用する。
  expect(html).toContain(
    '#code,#code *,#panel,#panel *{font-variant-ligatures: none;font-feature-settings: "liga" 0, "calt" 0}',
  );
  expect(html.indexOf("font-variant-ligatures: none")).toBeGreaterThan(
    html.indexOf(".call-row code{font:"),
  );
});

it.each([
  { kind: "plot", at: 0 },
  { kind: "plot", at: 4 },
  { kind: "snap", at: 0 },
  { kind: "snap", at: 4 },
  { kind: "tick", at: 0 },
  { kind: "tick", at: 4 },
] as const)("数直線の端でも札と印をパネル内に収める: $kind / $at", async ({ kind, at }) => {
  const label = `${at} <= 3 は false`;
  const scene: CodeScene = {
    kind: "code",
    id: "edge",
    role: "hook",
    title: "端の札",
    code: ["// 境目を確かめる"],
    panel: { kind: "numberLine", from: 0, to: 4 },
    beats:
      kind === "plot"
        ? [{ say: "点を置きます。", plot: { at, label } }]
        : kind === "snap"
          ? [
              { say: "点を置きます。", plot: { at, label: String(at) } },
              { say: "丸めます。", snap: { to: at, label } },
            ]
          : [{ say: "印を付けます。", tick: [{ at, kind: "cross" }] }],
  };
  const timing = sceneTimelines([scene], [scene.beats.map(() => 3)])[0];
  const html = sceneHtml({
    board: { cols: 1, rows: 1, nodes: [] },
    scene,
    state: codeSceneState(scene),
    timing,
    index: 0,
    total: 1,
  });
  const attribute = (tag: string, name: string) =>
    new RegExp(`(?:^| )${name}="([^"]*)"`).exec(tag)?.[1] ?? "";
  const makeElement = (initial: Record<string, string>) => ({
    attrs: initial,
    setAttribute(name: string, value: string) {
      this.attrs[name] = value;
    },
    getAttribute(name: string) {
      return this.attrs[name];
    },
  });
  type Label = ReturnType<typeof makeElement> & {
    text: string;
    offset: number;
    getBBox: () => { x: number; width: number };
    classList: { contains: (name: string) => boolean };
    parentNode: { insertBefore: (node: ReturnType<typeof makeElement>) => void };
  };
  let labels: Label[] = [];
  let box = makeElement({});
  const leaders: ReturnType<typeof makeElement>[] = [];
  const panel = {
    innerHTML: "",
    querySelector: () => ({
      querySelectorAll: () => {
        labels = [
          ...panel.innerHTML.matchAll(/<text class="(number-line-[^"]+)"([^>]*)>([^<]*)<\/text>/g),
        ]
          .filter((m) => /-(point-label|snap-label|tick)$/.test(m[1]))
          .map(([, name, attrs, text]) => {
            const item = {
              ...makeElement({
                x: attribute(attrs, "x"),
                "font-size": attribute(attrs, "font-size"),
              }),
              text: text.replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
              offset: name === "number-line-point-label" ? 48 + (at / 4) * 610 : 0,
              classList: { contains: (className: string) => name === className },
              parentNode: {
                insertBefore: (node: ReturnType<typeof makeElement>) => leaders.push(node),
              },
              getBBox() {
                // 実寸を模し、文字サイズ・座標を変えたら幅と位置も変わる。
                const width = Array.from(this.text).length * Number(this.attrs["font-size"]);
                return { x: Number(this.attrs.x) - width / 2, width };
              },
            };
            return item;
          });
        return labels;
      },
      querySelector: () => {
        box = makeElement({});
        return box;
      },
    }),
  };
  const window = {} as ScenePageWindow;
  runInNewContext(/<script>([\s\S]*)<\/script>/.exec(html)?.[1] ?? "", {
    window,
    document: {
      getElementById: (id: string) => (id === "panel" ? panel : { innerHTML: "", style: {} }),
      createElementNS: () => makeElement({}),
    },
  });
  await window.__setTime(timing.beats[timing.beats.length - 1].end);
  expect(labels.length).toBeGreaterThan(0);
  for (const text of labels) {
    const bounds = text.getBBox();
    expect(bounds.x + text.offset).toBeGreaterThanOrEqual(8);
    expect(bounds.x + text.offset + bounds.width).toBeLessThanOrEqual(698);
  }
  if (kind !== "tick") {
    expect(leaders.some((leader) => leader.attrs["stroke-width"] === "1")).toBe(true);
    const pointX = 48 + (at / 4) * 610;
    expect(Number(box.attrs.x) + pointX).toBeGreaterThanOrEqual(8);
    expect(Number(box.attrs.x) + pointX + Number(box.attrs.width)).toBeLessThanOrEqual(698);
    // 札を寄せても点そのものの座標を変えない。
    expect(panel.innerHTML).toContain(`translate(${pointX} 262)`);
  }
});

it("概念図のカード・矢印・イラストと、フェード・印・札・移動を時刻から描く", async () => {
  const board: Board = {
    cols: 3,
    rows: 1,
    nodes: [
      { id: "total", label: "合計", at: [3, 1], icon: "file" },
      { id: "price", label: "価格", at: [1, 1], art: "price" },
      { id: "shipping", label: "送料", at: [2, 1], icon: "file" },
    ],
    links: [
      { id: "first", from: "price", to: "shipping", label: "足す" },
      { id: "second", from: "shipping", to: "total" },
    ],
  };
  const scene: CodeScene = {
    id: "syntax",
    kind: "code",
    role: "syntax",
    title: "価格と合計",
    code: ["const price = 1200;"],
    show: true,
    panel: { kind: "figure", board: "shop" },
    beats: [
      {
        say: "価格を出します。",
        figure: {
          show: ["price", "shipping", "total", "first", "second"],
          mark: [{ on: "price", kind: "check" }],
          tag: { price: "1200" },
          pulse: ["price"],
          focus: ["price"],
        },
      },
      {
        say: "値を渡します。",
        figure: { travel: { along: ["first", "second"] }, tag: { price: "500" } },
      },
      {
        say: "札と印を外します。",
        figure: { untag: ["price"], unmark: ["price"], hide: ["total", "second"] },
      },
    ],
  };
  const timing = sceneTimelines([scene], [[3, 4, 3]], undefined, 2)[0];
  const state = storyboardStates({
    schema: 2,
    boards: { shop: board },
    brief: { goal: "", stuck: "", points: [], leaveOut: [] },
    scenes: [scene],
  })[0];
  const url = "file:///art/price.png";
  const html = sceneHtml({
    board,
    scene,
    state,
    timing,
    index: 1,
    total: 3,
    images: { "art:price": { url, width: 400, height: 300, regions: {} } },
  });
  expect(html).toContain(url);
  const label = {
    textContent: "長いラベル",
    classList: { contains: () => false },
    dataset: {},
  };
  const card = {
    style: { opacity: "1" },
    offsetHeight: 170,
    clientTop: 3,
    getBoundingClientRect: () => ({ left: 0, right: 300, top: 0, bottom: 170, height: 170 }),
    querySelectorAll: () => [label],
    querySelector: () => label,
  };
  const panel = {
    innerHTML: "",
    querySelectorAll: (selector: string) => (selector === ".figure-node" ? [card] : []),
  };
  let textRight = 310;
  const window = {} as ScenePageWindow;
  runInNewContext(/<script>([\s\S]*)<\/script>/.exec(html)?.[1] ?? "", {
    window,
    NodeFilter: { SHOW_TEXT: 4 },
    document: {
      getElementById: (id: string) => (id === "panel" ? panel : { innerHTML: "", style: {} }),
      querySelectorAll: () => [],
      createTreeWalker: () => {
        let unread = true;
        return {
          currentNode: label,
          nextNode: () => {
            const result = unread;
            unread = false;
            return result;
          },
        };
      },
      createRange: () => ({
        selectNodeContents: () => undefined,
        getClientRects: () => [
          { left: 160, right: textRight, top: 65, bottom: 105, width: textRight - 160, height: 40 },
        ],
      }),
    },
  });
  const markup = () => panel.innerHTML;
  expect(markup()).toContain('data-id="price" style="height:170px;opacity:0');
  expect(markup()).toContain(`<img src="${url}" alt="">`);
  expect(markup().indexOf('data-id="price"')).toBeLessThan(markup().indexOf('data-id="shipping"'));
  expect(markup().indexOf('data-id="shipping"')).toBeLessThan(markup().indexOf('data-id="total"'));
  expect(markup()).toContain('<span class="figure-arrow-label">足す</span>');
  expect(window.__overflows()).toContain("図のカード「長いラベル」のラベルが収まりません");
  textRight = 296;
  expect(window.__overflows()).toEqual([]);
  expect(
    window.__busyRanges.some(
      ([from, to]) => from <= timing.beats[1].start && to > timing.beats[1].end,
    ),
  ).toBe(true);
  const [first, second, third] = timing.beats;
  await window.__setTime(first.start + 0.3);
  expect(markup()).toMatch(
    /data-id="price"[^>]*opacity:0\.6\d*;transform:scale\(1\.045\);border-color:#E62F9A;background:rgba/,
  );
  expect(markup()).toMatch(/data-mark="check" style="transform:scale\(0\./);
  expect(markup()).toContain(">1200</span>");
  await window.__setTime(first.end);
  expect(markup()).toContain('data-id="shipping" style="height:170px;opacity:1');
  expect(markup()).toContain('data-mark="check" style="transform:scale(1)"');

  await window.__setTime(second.start + 0.1);
  expect(markup()).toContain(">1200</span>");
  expect(markup()).not.toContain('class="figure-traveler"');
  await window.__setTime(second.start + 1);
  expect(markup()).not.toContain(">1200</span>");
  expect(markup()).toContain('class="figure-tag" style="opacity:1;transform:scale(1)">500');
  expect(markup()).toMatch(/足す<\/span><span class="figure-traveler"/);
  await window.__setTime(second.start + 2);
  expect(markup()).not.toContain('class="figure-traveler"');
  await window.__setTime(second.start + 3);
  expect(markup()).toContain('class="figure-traveler"');
  expect(markup()).not.toMatch(/足す<\/span><span class="figure-traveler"/);

  await window.__setTime(third.start + 0.1);
  expect(markup()).toMatch(/data-id="total"[^>]*opacity:0\.6/);
  expect(markup()).toContain(">500</span>");
  expect(markup()).not.toContain('data-mark="check"');
  await window.__setTime(third.start + 0.4);
  expect(markup()).toContain('data-id="total" style="height:170px;opacity:0');
  expect(markup()).not.toContain('class="figure-tag"');
});

it("レッスン型はコードの前後をカットにし、冒頭だけ背景からフェードする", async () => {
  const scene: CodeScene = {
    kind: "code",
    id: "next",
    role: "next",
    title: "課題のコード",
    code: ["const value = 1;"],
    show: true,
    beats: [{ say: "最初のコードです。" }],
  };
  const board = { cols: 1, rows: 1, nodes: [] };
  const [timing] = sceneTimelines([scene], [[2]], {}, 2);
  const input = {
    scene,
    board,
    timing,
    state: codeSceneState(scene),
    index: 3,
    total: 4,
    previousFrame: "data:image/png;base64,YQ==",
  };
  const legacy = sceneHtml({ ...input, schema: 1 });
  const cut = sceneHtml({ ...input, schema: 2 });
  expect(legacy).toContain("previous-code-frame");
  expect(cut).not.toContain(input.previousFrame);
  expect(cut).not.toContain("previous-code-frame");
  expect(cut).not.toContain('id="code-opening"');
  const boardScene = {
    id: "board",
    role: "next",
    title: "図",
    board: "main",
    beats: [{ say: "最初に見るものです。" }],
  } satisfies Scene;
  const viewScene = {
    id: "view",
    kind: "view",
    role: "next",
    title: "図",
    image: "art:example",
    beats: [{ say: "最初に見るものです。" }],
  } satisfies Scene;
  for (const scene of [boardScene, viewScene]) {
    const [state] = storyboardStates({
      schema: 2,
      brief: { goal: "図", stuck: "図", points: ["図"], leaveOut: [] },
      boards: { main: board },
      scenes: [scene],
    });
    const frame = sceneHtml({ ...input, scene, state, schema: 2 });
    expect(frame).not.toContain(input.previousFrame);
    expect(frame).not.toContain("previous-code-frame");
  }

  for (const [html, schema, opening] of [
    [legacy, 1, false],
    [cut, 2, false],
    [sceneHtml({ ...input, schema: 2, fadeFromBackground: true }), 2, true],
  ] as const) {
    const elements = new Map(
      [
        "code",
        "panel",
        "caption",
        "card",
        "previous-code-frame",
        ...(opening ? ["code-opening"] : []),
      ].map((id) => [id, { innerHTML: "", style: {} as Record<string, string> }]),
    );
    const window = {} as ScenePageWindow;
    const vm = {
      window,
      document: { getElementById: (id: string) => elements.get(id), querySelectorAll: () => [] },
    };
    for (const [, script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g))
      runInNewContext(script, vm);
    await window.__setTime(0);
    expect(elements.get("card")?.style.opacity).toBe(schema === 1 ? "0" : "1");
    expect(elements.get("code-opening")?.style.opacity).toBe(opening ? "1" : undefined);
    await window.__setTime(0.2);
    if (schema === 1) {
      expect(elements.get("previous-code-frame")?.style.opacity).toBe("0.5");
      expect(elements.get("card")?.style.opacity).toBe("0.5");
    } else expect(elements.get("card")?.style.opacity).toBe("1");
    await window.__setTime(0.4);
    expect(elements.get("code-opening")?.style.opacity).toBe(opening ? "0" : undefined);
  }
});

it("意味の吹き出しはフリガナなしで出て番号を消し、次の文で消える", async () => {
  const scene: CodeScene = {
    kind: "code",
    id: "name",
    role: "point",
    point: 1,
    title: "関数を作る",
    code: ["function add() {}"],
    show: true,
    beats: [
      { say: "足すという意味です。", part: { line: 0, text: "add", note: "足す" } },
      { say: "次の文です。", part: { line: 0, text: "add" } },
    ],
  };
  const [timing] = sceneTimelines([scene], [[2, 2]]);
  const html = sceneHtml({
    scene,
    timing,
    state: codeSceneState(scene),
    board: { cols: 1, rows: 1, nodes: [] },
    index: 2,
    total: 3,
  });
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(([, script]) =>
    script.includes("function partNoteRuntime("),
  )?.[1];
  if (!script) throw new Error("吹き出しの描画処理がありません");
  let numbered = true;
  let below = false;
  let drawn = false;
  let top = 28;
  let nextText = "";
  const line = { nextElementSibling: { querySelector: () => ({ textContent: nextText }) } };
  const span = {
    getBoundingClientRect: () => ({ left: 930, right: 1000, top, bottom: top + 36 }),
    closest: () => line,
    classList: {
      remove: (name: string) => {
        if (name === "numbered") numbered = false;
      },
    },
  };
  const bubble = {
    className: "",
    innerHTML: "",
    offsetWidth: 140,
    offsetHeight: 44,
    style: { setProperty: () => undefined } as Record<string, string | ((name: string) => void)>,
    classList: {
      toggle: (name: string, value: boolean) => {
        if (name === "below") below = value;
      },
    },
  };
  const code = {
    clientWidth: 1010,
    clientHeight: 365,
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
    querySelector: () => span,
    append: () => {
      drawn = true;
    },
  };
  const window = {
    __busyRanges: [],
    __setTime: async () => {
      drawn = false;
      numbered = true;
    },
  };
  const document = { getElementById: () => code, createElement: () => bubble };
  runInNewContext(script, { window, document });
  const [first, next] = timing.beats;
  await (window as unknown as ScenePageWindow).__setTime(first.start + 0.3);
  expect(window.__busyRanges).toEqual([[first.start, first.start + 0.3]]);
  expect(drawn).toBe(true);
  expect(numbered).toBe(false);
  expect(below).toBe(true);
  expect(bubble.style.left).toBe("862px");
  expect(Number(bubble.style.opacity)).toBeCloseTo(1);
  expect(bubble.style.transform).toBe("translateY(0px)");
  await (window as unknown as ScenePageWindow).__setTime(first.start + 0.15);
  expect(Number(/translateY\(([^)]+)px\)/.exec(String(bubble.style.transform))?.[1])).toBeCloseTo(
    -1.5,
  );
  await (window as unknown as ScenePageWindow).__setTime(first.start + 0.3);
  expect(bubble.innerHTML).toBe("足す");
  expect(html).toContain("font:700 30px/1.2");
  top = 100;
  await (window as unknown as ScenePageWindow).__setTime(first.start + 0.3);
  expect(below).toBe(true);
  expect(bubble.style.top).toBe("146px");
  nextText = "return 1;";
  await (window as unknown as ScenePageWindow).__setTime(first.start + 0.3);
  expect(below).toBe(false);
  expect(bubble.style.top).toBe("46px");
  top = 28;
  await (window as unknown as ScenePageWindow).__setTime(first.start + 0.3);
  expect(below).toBe(true);
  await (window as unknown as ScenePageWindow).__setTime(next.start);
  expect(drawn).toBe(false);
  expect(numbered).toBe(true);
});

it("170pxの3枚のfigureで6字のラベルと5字の札に横幅を渡す", async () => {
  const ids = ["first", "second", "third"];
  const board: Board = {
    cols: 3,
    rows: 1,
    nodes: ids.map((id, index) => ({
      id,
      label: "税込にする係",
      icon: "file",
      at: [index + 1, 1],
    })),
  };
  const withTags = Object.fromEntries(ids.map((id) => [id, "ここを書く"]));
  const scene: CodeScene = {
    kind: "code",
    id: "width",
    role: "syntax",
    title: "札とラベル",
    code: ["const x = 1;"],
    show: true,
    panel: { kind: "figure", board: "main" },
    beats: [
      { say: "カードを出します。", figure: { show: ids } },
      { say: "札を付けます。", figure: { tag: withTags, pulse: ids } },
    ],
  };
  const timing = sceneTimelines([scene], [[2, 2]], undefined, 2)[0];
  const state = storyboardStates({
    schema: 2,
    boards: { main: board },
    brief: { goal: "", stuck: "", points: [], leaveOut: [] },
    scenes: [scene],
  })[0];
  const html = sceneHtml({
    schema: 2,
    scene,
    state,
    timing,
    board,
    index: 2,
    total: 3,
  });

  const panel = { innerHTML: "", querySelectorAll: () => [] };
  const elements = new Map(
    ["code", "card", "caption"].map((id) => [id, { innerHTML: "", style: {} }]),
  );
  const window = {} as ScenePageWindow;
  const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1];
  runInNewContext(script ?? "", {
    window,
    document: {
      getElementById: (id: string) => (id === "panel" ? panel : elements.get(id)),
      querySelectorAll: () => [],
    },
  });
  expect(html).not.toMatch(/<ruby>|<rt[ >]|ruby-fit/);
  expect(html).toMatch(/\.figure-art\{[^}]*min-width:var\(--art-min\)/);
  expect(html).toMatch(/\.figure-label\{[^}]*min-width:max-content[^}]*white-space:nowrap/);

  // ラベルと札は全角32pxで見積もる。
  // パネル幅はカード1800pxから左右24px・コード1010px・列間36pxを引いたもの。
  const available = 1800 - 48 - 1010 - 36 - 32 - 32 - 6 - 32 - 40;
  for (const offset of [0.15, 0.3, 0.8]) {
    await window.__setTime(timing.beats[1].start + offset);
    expect(panel.innerHTML.match(/height:170px/g)).toHaveLength(3);
    expect(panel.innerHTML.match(/>税込にする係<\/div>/g)).toHaveLength(3);
    expect(panel.innerHTML.match(/>ここを書く<\/span>/g)).toHaveLength(3);
    const arts = [
      ...panel.innerHTML.matchAll(/class="figure-art" style="width:([\d.]+)px;--art-min:(\d+)px"/g),
    ];
    expect(arts).toHaveLength(3);
    for (const [, preferred, minimum] of arts) {
      const textWidth = (6 + 5) * 32;
      expect(Number(preferred) + textWidth).toBeGreaterThan(available);
      expect(Number(minimum) + textWidth).toBeLessThanOrEqual(available);
    }
  }
});

describe("schema 2 の図は等倍までフェードし、強調を枠で続ける", () => {
  const board: Board = {
    cols: 2,
    rows: 1,
    nodes: [
      { id: "price", label: "価格", icon: "file", at: [1, 1] },
      { id: "shipping", label: "送料", icon: "file", at: [2, 1] },
    ],
    links: [{ id: "add", from: "price", to: "shipping", label: "足す" }],
  };
  const brief = { goal: "図", stuck: "図", points: ["図"], leaveOut: [] };

  function codeScene(id: string, beats: CodeScene["beats"], reset?: boolean): CodeScene {
    return {
      kind: "code",
      id,
      role: "point",
      point: 1,
      title: "価格",
      code: ["const price = 1200;"],
      show: true,
      panel: { kind: "figure", board: "main" },
      ...(reset === undefined ? {} : { reset }),
      beats,
    };
  }

  function open(scenes: CodeScene[], index = 0) {
    const timelines = sceneTimelines(
      scenes,
      scenes.map((scene) => scene.beats.map(() => 2)),
      {},
      2,
    );
    const state = storyboardStates({
      schema: 2,
      brief,
      boards: { main: board },
      scenes,
    })[index];
    const html = sceneHtml({
      schema: 2,
      board,
      scene: scenes[index],
      state,
      timing: timelines[index],
      index,
      total: scenes.length,
    });
    const panel = { innerHTML: "", querySelectorAll: () => [] as never[] };
    const elements = new Map(
      ["code", "card", "caption"].map((id) => [id, { innerHTML: "", style: {} }]),
    );
    const window = {} as ScenePageWindow;
    const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1] ?? "";
    runInNewContext(script, {
      window,
      document: {
        getElementById: (id: string) => (id === "panel" ? panel : elements.get(id)),
        querySelectorAll: () => [],
      },
    });
    const markup = () => panel.innerHTML;
    return { window, timing: timelines[index], markup };
  }

  function card(html: string, id: string): string {
    const found = new RegExp(`data-id="${id}" style="([^"]*)"`).exec(html);
    if (!found) throw new Error(`カードがありません: ${id}`);
    return found[1];
  }
  function prop(style: string, name: string): string {
    return new RegExp(`(?:^|;)${name}:([^;]*)`).exec(style)?.[1] ?? "";
  }
  function scaleOf(style: string): number {
    return Number(/scale\(([^)]+)\)/.exec(prop(style, "transform"))?.[1]);
  }
  function mark(html: string): { kind: string; style: string } | undefined {
    const found = /data-mark="([^"]+)" style="([^"]*)"/.exec(html);
    return found ? { kind: found[1], style: found[2] } : undefined;
  }
  function tag(html: string): { style: string; text: string } | undefined {
    const found = /class="figure-tag" style="([^"]*)">([^<]*)</.exec(html);
    return found ? { style: found[1], text: found[2] } : undefined;
  }
  function accent(html: string): number {
    const found = /stroke="#E62F9A" stroke-opacity="([^"]+)"/.exec(html);
    if (!found) throw new Error("矢印の強調がありません");
    return Number(found[1]);
  }

  it("カード・印・札は 0.94 から 1 へ向かい、枠が続く", async () => {
    const view = open([
      codeScene("main", [
        {
          say: "出します。",
          figure: {
            show: ["price", "shipping", "add"],
            mark: [{ on: "price", kind: "check" }],
            tag: { price: "1200" },
          },
        },
        { say: "価格を強調します。", figure: { pulse: ["price", "add"] } },
        { say: "送料を見ます。", figure: { focus: ["shipping"] } },
        { say: "送料へ替えます。", figure: { pulse: ["shipping"] } },
        { say: "外します。", figure: { pulse: [] } },
        { say: "価格に戻します。", figure: { pulse: ["price"] } },
        { say: "価格を隠します。", figure: { hide: ["price"] } },
      ]),
    ]);
    const [show, pulse, focus, next, clear, again, hide] = view.timing.beats;
    await view.window.__setTime(0);
    expect(prop(card(view.markup(), "price"), "border-color")).toBe("#DDDDE2");

    const scales: number[] = [];
    const opacities: number[] = [];
    for (const offset of [0, 0.125, 0.25, 0.375, 0.5]) {
      await view.window.__setTime(show.start + offset);
      const style = card(view.markup(), "price");
      const scale = scaleOf(style);
      const opacity = Number(prop(style, "opacity"));
      expect(scale).toBeGreaterThanOrEqual(0.94);
      expect(scale).toBeLessThanOrEqual(1);
      scales.push(scale);
      opacities.push(opacity);
    }
    expect(scales[0]).toBeCloseTo(0.94);
    expect(opacities[2]).toBeCloseTo(0.875);
    expect(scales[2]).toBeCloseTo(0.9925);
    expect(scales.at(-1)).toBeCloseTo(1);
    expect(opacities.at(-1)).toBeCloseTo(1);
    for (let i = 1; i < scales.length; i++) {
      expect(scales[i]).toBeGreaterThanOrEqual(scales[i - 1]);
      expect(opacities[i]).toBeGreaterThanOrEqual(opacities[i - 1]);
    }

    const markScales: number[] = [];
    for (const offset of [0, 0.175, 0.35]) {
      await view.window.__setTime(show.start + offset);
      const shown = mark(view.markup());
      if (!shown) throw new Error("印がありません");
      expect(shown.kind).toBe("check");
      const scale = scaleOf(shown.style);
      expect(scale).toBeGreaterThanOrEqual(0.94);
      expect(scale).toBeLessThanOrEqual(1);
      markScales.push(scale);
    }
    expect(markScales[0]).toBeCloseTo(0.94);
    expect(markScales.at(-1)).toBeCloseTo(1);
    expect(markScales[1]).toBeGreaterThan(markScales[0]);

    const tagScales: number[] = [];
    for (const offset of [0, 0.175, 0.35]) {
      await view.window.__setTime(show.start + offset);
      const shown = tag(view.markup());
      if (shown?.text !== "1200") throw new Error("札がありません");
      const scale = scaleOf(shown.style);
      expect(scale).toBeGreaterThanOrEqual(0.94);
      expect(scale).toBeLessThanOrEqual(1);
      tagScales.push(scale);
    }
    expect(tagScales[0]).toBeCloseTo(0.94);
    expect(tagScales.at(-1)).toBeCloseTo(1);
    expect(tagScales[1]).toBeGreaterThan(tagScales[0]);

    await view.window.__setTime(pulse.start + 0.1);
    expect(
      Number(
        /rgba\(230,47,154,([^)]+)\)/.exec(prop(card(view.markup(), "price"), "border-color"))?.[1],
      ),
    ).toBeCloseTo(0.5);
    expect(prop(card(view.markup(), "price"), "background")).toBe("white");
    await view.window.__setTime(pulse.start + 0.3);
    const emphasized = card(view.markup(), "price");
    expect(scaleOf(emphasized)).toBe(1);
    expect(emphasized).not.toContain("scale(1.045)");
    expect(prop(emphasized, "border-width")).toBe("4px");
    expect(prop(emphasized, "border-color")).toBe("#E62F9A");
    expect(prop(emphasized, "background")).toBe("white");
    expect(view.markup()).toContain('stroke="#5C5C66" stroke-width="3"');
    expect(accent(view.markup())).toBe(1);
    await view.window.__setTime(pulse.end + 0.3);
    expect(prop(card(view.markup(), "price"), "border-color")).toBe("#E62F9A");
    expect(accent(view.markup())).toBe(1);

    await view.window.__setTime(focus.start + 0.3);
    expect(prop(card(view.markup(), "shipping"), "border-color")).toBe("#E62F9A");
    expect(prop(card(view.markup(), "price"), "border-color")).toBe("#DDDDE2");
    expect(accent(view.markup())).toBe(0);
    expect(view.window.__busyRanges).toContainEqual([focus.end, focus.end + 0.2]);
    await view.window.__setTime(focus.end + 0.25);
    expect(prop(card(view.markup(), "price"), "border-color")).toBe("#E62F9A");
    expect(prop(card(view.markup(), "shipping"), "border-color")).toBe("#DDDDE2");
    expect(accent(view.markup())).toBe(1);

    await view.window.__setTime(next.start + 0.3);
    expect(prop(card(view.markup(), "price"), "border-color")).toBe("#DDDDE2");
    expect(prop(card(view.markup(), "shipping"), "border-color")).toBe("#E62F9A");
    expect(accent(view.markup())).toBe(0);
    await view.window.__setTime(clear.start + 0.3);
    expect(prop(card(view.markup(), "shipping"), "border-color")).toBe("#DDDDE2");
    await view.window.__setTime(again.start + 0.3);
    expect(prop(card(view.markup(), "price"), "border-color")).toBe("#E62F9A");
    await view.window.__setTime(hide.start + 0.3);
    expect(prop(card(view.markup(), "price"), "border-color")).toBe("#DDDDE2");
  });

  it("場面の頭では枠が外れ、引き継いだ印は最初から等倍", async () => {
    const scenes = [
      codeScene("main", [
        {
          say: "出します。",
          figure: { show: ["price"], mark: [{ on: "price", kind: "check" }] },
        },
        { say: "強調します。", figure: { pulse: ["price"] } },
      ]),
      codeScene("next", [{ say: "続きです。" }], false),
    ];
    const view = open(scenes, 1);
    await view.window.__setTime(0);
    expect(prop(card(view.markup(), "price"), "border-color")).toBe("#DDDDE2");
    const shown = mark(view.markup());
    expect(shown?.kind).toBe("check");
    expect(scaleOf(shown?.style ?? "")).toBe(1);
    expect(prop(shown?.style ?? "", "opacity")).toBe("1");
  });

  it("札の入れ替えは消してから小さめに出る", async () => {
    const view = open([
      codeScene("main", [
        { say: "出します。", figure: { show: ["price"], tag: { price: "1200" } } },
        { say: "替えます。", figure: { tag: { price: "500" } } },
      ]),
    ]);
    const change = view.timing.beats[1];
    await view.window.__setTime(change.start + 0.1);
    const fading = tag(view.markup());
    expect(fading?.text).toBe("1200");
    expect(scaleOf(fading?.style ?? "")).toBe(1);
    expect(Number(prop(fading?.style ?? "", "opacity"))).toBeLessThan(1);
    await view.window.__setTime(change.start + 0.2);
    const next = tag(view.markup());
    expect(next?.text).toBe("500");
    expect(scaleOf(next?.style ?? "")).toBeGreaterThanOrEqual(0.94);
    expect(scaleOf(next?.style ?? "")).toBeLessThan(1);
  });
});

it("schema 2 の吹き出しは 0.94 から等倍へフェードする", async () => {
  const scene: CodeScene = {
    kind: "code",
    id: "name",
    role: "point",
    point: 1,
    title: "関数を作る",
    code: ["function add() {}"],
    show: true,
    beats: [{ say: "足すという意味です。", part: { line: 0, text: "add", note: "足す" } }],
  };
  const [timing] = sceneTimelines([scene], [[2]], {}, 2);
  const html = sceneHtml({
    schema: 2,
    scene,
    timing,
    state: codeSceneState(scene),
    board: { cols: 1, rows: 1, nodes: [] },
    index: 0,
    total: 1,
  });
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(([, item]) =>
    item.includes("function partNoteRuntime("),
  )?.[1];
  if (!script) throw new Error("吹き出しの描画処理がありません");
  expect(script).toContain(",true");
  const style = {
    transform: "",
    opacity: "",
    transformOrigin: "",
    setProperty: () => undefined,
  };
  const bubble = {
    className: "",
    innerHTML: "",
    offsetWidth: 140,
    offsetHeight: 44,
    style,
    classList: { toggle: () => undefined },
  };
  const span = {
    getBoundingClientRect: () => ({ left: 930, right: 1000, top: 28, bottom: 64 }),
    closest: () => ({ nextElementSibling: { querySelector: () => ({ textContent: "" }) } }),
    classList: { remove: () => undefined },
  };
  const code = {
    clientWidth: 1010,
    clientHeight: 365,
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
    querySelector: () => span,
    append: () => undefined,
  };
  const window = { __busyRanges: [] as [number, number][], __setTime: async () => undefined };
  runInNewContext(script, {
    window,
    document: { getElementById: () => code, createElement: () => bubble },
  });
  const start = timing.beats[0].start;
  const scales: number[] = [];
  for (const offset of [0, 0.15, 0.3]) {
    await (window as unknown as ScenePageWindow).__setTime(start + offset);
    const scale = Number(/scale\(([^)]+)\)/.exec(bubble.style.transform)?.[1]);
    expect(scale).toBeGreaterThanOrEqual(0.94);
    expect(scale).toBeLessThanOrEqual(1);
    scales.push(scale);
  }
  expect(scales[0]).toBeCloseTo(0.94);
  expect(scales[1]).toBeCloseTo(0.9925);
  expect(scales[2]).toBe(1);
  expect(bubble.style.transformOrigin).toBe("center");
  expect(Number(bubble.style.opacity)).toBeCloseTo(1);
});
