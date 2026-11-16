import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { sceneCaptionAt, sceneTimelines, sceneVideoSequence } from "../../src/scene-timeline.js";
import { storyboardStates, type BoardStoryboard, type Scene } from "../../src/video-storyboard.js";
import { sceneHtml, textSceneHtml, type ScenePageWindow } from "./scene-html.js";
const sample = JSON.parse(
  readFileSync(new URL("../../src/__fixtures__/board-video.json", import.meta.url), "utf8"),
) as BoardStoryboard;
it("文字だけのタイトルは字幕なしで中央に出し、前後0.4秒でフェードする", async () => {
  const html = textSceneHtml({
    kind: "text",
    id: "title",
    title: "学ぶ<流れ>",
    header: "開発&環境",
    duration: 2.6,
  });
  expect(html).toContain("<h1>学ぶ&lt;流れ&gt;</h1>");
  expect(html).toContain("<header>開発&amp;環境</header>");
  expect(html).toContain("font-size:80px;font-weight:700");
  expect(html).toContain("width:96px;height:6px;background:#E62F9A");
  expect(html).not.toContain('id="caption"');
  expect(
    textSceneHtml({ kind: "text", id: "title", title: "学ぶ流れ", duration: 2.6 }),
  ).not.toContain("<header>");
  const elements = new Map(
    ["text-scene", "white"].map((id) => [
      id,
      { style: {} as Record<string, string>, scrollHeight: 300 },
    ]),
  );
  const window = {} as ScenePageWindow;
  runInNewContext(/<script>([\s\S]*)<\/script>/.exec(html)?.[1] ?? "", {
    window,
    document: { getElementById: (id: string) => elements.get(id) },
  });
  for (const [time, opacity] of [
    [0, 0],
    [0.2, 0.5],
    [0.4, 1],
    [1.3, 1],
    [2.2, 1],
    [2.4, 0.5],
    [2.6, 0],
  ]) {
    await window.__setTime(time);
    expect(Number(elements.get("text-scene")?.style.opacity)).toBeCloseTo(opacity);
    expect(Number(elements.get("white")?.style.opacity)).toBeCloseTo(Math.max(0, 1 - time / 0.4));
  }
  expect(window.__busyRanges[0]).toEqual([0, 0.4]);
  expect(window.__busyRanges[1][0]).toBeCloseTo(2.2);
  expect(window.__busyRanges[1][1]).toBe(2.6);
  expect(window.__overflows()).toEqual([]);
});
it.each(["Webで読み、VS Codeで課題を書き、確認して提出します。"])(
  "まとめはtakeaway (%s) を中央に出し、3行の検査と白へのフェードを行う",
  async (takeaway) => {
    const scene = sceneVideoSequence(
      [],
      [],
      { title: "学ぶ流れ", takeaway },
      {},
      { title: 1, summary: 1 },
    ).at(-1)?.scene;
    if (scene?.kind !== "text") throw new Error("文字の場面ではありません");
    const html = textSceneHtml(scene);
    expect(html).toContain(`<h1>${takeaway}</h1>`);
    expect(html).toContain("<header>まとめ</header>");
    expect(html).toContain("font-size:32px;color:#5C5C66");
    expect(html).toContain("max-width:1500px");
    expect(html).toContain("font-size:56px;line-height:1.5");
    expect(html).toContain("word-break:normal;line-break:strict;text-wrap:balance");
    expect(html).not.toContain('id="caption"');
    const text = { scrollHeight: 252 };
    const content = { style: { opacity: "" }, querySelector: () => text };
    const white = { style: { opacity: "" } };
    const window = {} as ScenePageWindow;
    runInNewContext(/<script>([\s\S]*)<\/script>/.exec(html)?.[1] ?? "", {
      window,
      document: { getElementById: (id: string) => (id === "white" ? white : content) },
      getComputedStyle: () => ({ lineHeight: "84px" }),
    });
    expect(window.__busyRanges).toEqual([
      [0, 0.4],
      [3.4, 4],
    ]);
    for (const [time, opacity, whiteOpacity] of [
      [0, 0, 0],
      [0.2, 0.5, 0],
      [0.4, 1, 0],
      [2, 1, 0],
      [3.4, 1, 0],
      [3.7, 1, 0.5],
      [4, 1, 1],
      [5, 1, 1],
      [0, 0, 0],
    ]) {
      await window.__setTime(time);
      expect(Number(content.style.opacity)).toBeCloseTo(opacity);
      expect(Number(white.style.opacity)).toBeCloseTo(whiteOpacity);
    }
    expect(window.__overflows()).toEqual([]);
    text.scrollHeight = 336;
    expect(window.__overflows()).toEqual(["まとめの文が3行に収まりません"]);
  },
);
it.each(["title", "summary"] as const)(
  "%sは長い読み上げでも字幕を出さず、伸びた末尾でフェードする",
  async (id) => {
    const entry = sceneVideoSequence(
      [],
      [],
      { title: "学ぶ流れ", takeaway: "確認して提出します。" },
      {},
      {
        title: 6.013,
        summary: 7.017,
      },
    ).find((entry) => entry.scene.id === id);
    if (entry?.scene.kind !== "text") throw new Error("文字の場面ではありません");
    const html = textSceneHtml(entry.scene);
    expect(html).not.toContain('id="caption"');
    const content = { style: { opacity: "" } };
    const white = { style: { opacity: "" } };
    const window = {} as ScenePageWindow;
    runInNewContext(/<script>([\s\S]*)<\/script>/.exec(html)?.[1] ?? "", {
      window,
      document: { getElementById: (id: string) => (id === "white" ? white : content) },
    });
    await window.__setTime(entry.timing.beats[0].end);
    expect(Number(content.style.opacity)).toBe(1);
    expect(Number(white.style.opacity)).toBe(0);
    const fade = id === "title" ? 0.4 : 0.6;
    expect(window.__busyRanges[1][0]).toBeCloseTo(entry.timing.duration - fade);
    await window.__setTime(entry.timing.duration - fade / 2);
    expect(Number(id === "title" ? content.style.opacity : white.style.opacity)).toBeCloseTo(0.5);
    await window.__setTime(entry.timing.duration);
    expect(Number(id === "title" ? content.style.opacity : white.style.opacity)).toBeCloseTo(
      id === "title" ? 0 : 1,
    );
  },
);
describe.each(["view", "board"] as const)("%s のタイトル札と字幕", (kind) => {
  function titlePage(previous?: Scene, role: Scene["role"] = "point", say = "読みます。") {
    const scene: Scene = {
      ...(kind === "view" ? { kind, image: "shot:web/one" } : { kind, board: "main" }),
      id: "title",
      role,
      point: role === "point" ? 1 : undefined,
      title: "読む場所と、書く場所",
      beats: [{ say }, { say: "次の文です。" }],
    };
    const board = { cols: 1, rows: 1, nodes: [] };
    const state = storyboardStates({ ...sample, boards: { main: board }, scenes: [scene] })[0];
    const timing = sceneTimelines([scene], [[5.013, 2.017]])[0];
    timing.beats[0].speechEnd = 4.213;
    const html = sceneHtml({
      scene,
      state,
      board,
      timing,
      index: previous ? 1 : 0,
      total: 2,
      previous,
      images: {
        "shot:web/one": { url: "file:///tmp/one.png", width: 1600, height: 1000, regions: {} },
      },
    });
    const elements = new Map<
      string,
      {
        style: Record<string, string>;
        innerHTML: string;
        textContent?: string;
        firstElementChild: { scrollHeight: number };
      }
    >();
    const document = {
      getElementById: (id: string) => {
        if (id === "heading" && !html.includes('id="heading"')) return null;
        if (!["heading", "surface", "white", "caption"].includes(id)) return null;
        if (!elements.has(id))
          elements.set(id, { style: {}, innerHTML: "", firstElementChild: { scrollHeight: 44 } });
        return elements.get(id);
      },
      querySelectorAll: () => [],
    };
    const window = {} as ScenePageWindow;
    runInNewContext(/<script>([\s\S]*)<\/script>/.exec(html)?.[1] ?? "", { window, document });
    return { html, scene, window, elements, timing };
  }
  it("字幕を下端の2行分の欄に出し、白より奥・図や画像より手前にする", () => {
    const { html } = titlePage();
    expect(html).toContain(
      "#caption{position:absolute;left:72px;right:72px;top:990px;height:90px;display:flex;align-items:center;justify-content:center;font-size:34px;line-height:1.3;color:#0E0E10;text-align:center;z-index:1;overflow:hidden}",
    );
    expect(html).toContain('</svg><div id="caption"></div><div id="white"></div>');
  });
  it("sayをエスケープし、読み終わりで消す。巻き戻しても同じ字幕になる", async () => {
    const { window, elements, timing } = titlePage(undefined, "point", "<b>&</script>");
    for (const [time, text] of [
      [0, ""],
      [0.8, "&lt;b&gt;&amp;&lt;/script&gt;"],
      [4.212, "&lt;b&gt;&amp;&lt;/script&gt;"],
      [4.213, ""],
      [timing.beats[1].start, "次の文です。"],
      [timing.beats[1].end, ""],
      [timing.duration, ""],
      [0.8, "&lt;b&gt;&amp;&lt;/script&gt;"],
    ] as const) {
      await window.__setTime(time);
      expect(elements.get("caption")?.innerHTML).toBe(`<span>${text}</span>`);
    }
  });
  it("30fpsで静止コマを使い回しても、字幕の開始と終了の最初のコマを撮り直す", async () => {
    const { window, elements, timing } = titlePage();
    let previousBusy = true,
      captured = "",
      captures = 0;
    for (let frame = 0; frame < Math.round(timing.duration * 30); frame++) {
      const time = frame / 30;
      const busy = window.__busyRanges.some(([a, b]) => time >= a && time <= b);
      if (!frame || busy || previousBusy) {
        await window.__setTime(time);
        captured = elements.get("caption")?.innerHTML ?? "";
        captures++;
      }
      expect(captured, `frame ${frame}`).toBe(`<span>${sceneCaptionAt(timing, time)}</span>`);
      previousBusy = busy;
    }
    expect(captures).toBeLessThan((timing.duration * 30) / 2);
  });
  it("2行を超える字幕は文を添えて報告し、消えた字幕は報告しない", async () => {
    const { window, elements } = titlePage();
    const caption = elements.get("caption");
    if (!caption) throw new Error("字幕欄がありません");
    caption.textContent = "読みます。";
    caption.firstElementChild.scrollHeight = 89;
    await window.__setTime(1);
    expect(window.__overflows()).toEqual([]);
    caption.firstElementChild.scrollHeight = 133;
    await window.__setTime(1);
    expect(window.__overflows()).toEqual(["字幕が2行に収まりません: 読みます。"]);
    caption.firstElementChild.scrollHeight = 0;
    await window.__setTime(0);
    expect(window.__overflows()).toEqual([]);
  });
  it("帯と進捗の点を出さず、タイトルを上部中央の札にする", () => {
    const { html } = titlePage();
    expect(html).not.toMatch(/<header|previous-heading|\.dots?\b|class="dots?\b/);
    expect(html).toContain('<div id="heading"><span>要点 1</span> 読む場所と、書く場所</div>');
    expect(html).toContain("top:24px;left:50%;transform:translateX(-50%)");
    expect(html).toContain("white-space:nowrap;z-index:1;opacity:0;height:80px");
    expect(html).toContain("#white{position:absolute;inset:0;z-index:2;");
    expect(titlePage(undefined, "recap").html).toContain('<div id="heading"><span>まとめ</span>');
    if (kind === "board") {
      expect(html).toContain('id="diagram" viewBox="0 170 1920 760"');
      expect(html).toContain("top:170px;width:1920px;height:760px");
    }
  });
  it("最初の3秒だけ表示し、フェードアウト中も毎コマ更新する", async () => {
    const { window, elements } = titlePage();
    for (const [time, opacity] of [
      [0, 0],
      [0.2, 0.5],
      [1, 1],
      [2.6, 1],
      [2.8, 0.5],
      [3, 0],
      [10, 0],
      [0.2, 0.5],
    ]) {
      await window.__setTime(time);
      expect(Number(elements.get("heading")?.style.opacity)).toBeCloseTo(opacity);
    }
    expect(window.__busyRanges).toContainEqual([2.6, 3]);
    expect(window.__busyRanges.some(([start, end]) => start === 0 && end >= 0.4)).toBe(true);
  });
  it("直前とrole・point・titleが一致すると札を出さず、どれかが違えば出す", async () => {
    const { scene } = titlePage();
    const same = titlePage({ ...scene, id: "previous" });
    expect(same.html).not.toContain('id="heading"');
    await same.window.__setTime(1);
    expect(same.elements.has("heading")).toBe(false);
    for (const difference of [
      { role: "recap" as const },
      { point: 2 },
      { title: "別のタイトル" },
    ]) {
      expect(titlePage({ ...scene, ...difference }).html).toContain('id="heading"');
    }
  });
});
function page(index: number, sb = sample) {
  const states = storyboardStates(sb),
    timelines = sceneTimelines(
      sb.scenes,
      sb.scenes.map((s) => s.beats.map(() => 2)),
    );
  const html = sceneHtml({
    board: sb.boards.main,
    scene: sb.scenes[index],
    state: states[index],
    timing: timelines[index],
    index,
    total: sb.scenes.length,
    previous: sb.scenes[index - 1],
  });
  const script = /<script>([\s\S]*)<\/script>/.exec(html)?.[1] ?? "";
  interface TestElement {
    firstElementChild: { scrollHeight: number };
    attrs: Record<string, string>;
    style: Record<string, string>;
    setAttribute: (key: string, value: string) => void;
    querySelector: (selector: string) => TestElement | null;
    querySelectorAll: () => never[];
    getTotalLength: () => number;
  }
  const elements = new Map<string, TestElement>();
  const document = {
    getElementById: (id: string): TestElement => {
      let el = elements.get(id);
      if (!el) {
        const attrs: Record<string, string> = {};
        el = {
          firstElementChild: { scrollHeight: 44 },
          attrs,
          style: {},
          setAttribute: (k, v) => {
            attrs[k] = v;
          },
          querySelector: (selector) =>
            selector === ".ring"
              ? document.getElementById(`ring-${id}`)
              : selector === ".link" && sb.boards.main.links?.some((l) => id === `element-${l.id}`)
                ? document.getElementById(`path-${id}`)
                : null,
          getTotalLength: () => 100,
          querySelectorAll: () => [],
        };
        elements.set(id, el);
      }
      return el;
    },
    querySelectorAll: () => [],
  };
  const window = {} as ScenePageWindow;
  runInNewContext(script, { window, document });
  return { window, elements, html, timing: timelines[index] };
}
describe("場面HTMLの時刻による描画", () => {
  it("単体で実行でき、同じ時刻は前の呼び出し順に依存しない", () => {
    const p = page(4);
    p.window.__setTime(1);
    const snap = JSON.stringify([...p.elements]);
    p.window.__setTime(7);
    p.window.__setTime(0);
    p.window.__setTime(1);
    expect(JSON.stringify([...p.elements])).toBe(snap);
  });
  it("空の囲みは大きいまま引き継ぎ、最初のノードで0.5秒かけて縮む", () => {
    const hook = page(0),
      places = page(1);
    hook.window.__setTime(hook.timing.duration);
    places.window.__setTime(0);
    for (const id of ["web", "vscode"]) {
      const icon = `zone-icon-${id}`,
        label = `zone-label-${id}`;
      expect(hook.elements.get(icon)?.attrs.width).toBe("160");
      expect(places.elements.get(icon)?.attrs).toEqual(hook.elements.get(icon)?.attrs);
      expect(places.elements.get(label)?.attrs["font-size"]).toBe("64");
    }
    const start = places.timing.beats[0].start;
    places.window.__setTime(start + 0.25);
    expect(Number(places.elements.get("zone-icon-web")?.attrs.width)).toBeCloseTo(98);
    places.window.__setTime(start + 0.5);
    expect(places.elements.get("zone-icon-web")?.attrs.width).toBe("36");
    expect(places.elements.get("zone-label-web")?.attrs["font-size"]).toBe("36");
    expect(places.elements.get("zone-icon-vscode")?.attrs.width).toBe("160");
    const snap = JSON.stringify([...places.elements]);
    places.window.__setTime(places.timing.duration);
    places.window.__setTime(start + 0.5);
    expect(JSON.stringify([...places.elements])).toBe(snap);
  });
  it("zone経由のノードとリンクは薄くせず、直接指定した要素だけ強調する", () => {
    for (const direct of [undefined, "read", "read-quiz"]) {
      const sb = structuredClone(sample);
      const beat = sb.scenes[1].beats[0];
      beat.show = ["read", "quiz", "read-quiz"];
      beat.focus = direct ? ["web", direct] : ["web"];
      const p = page(1, sb);
      p.window.__setTime(p.timing.beats[0].start + 1);
      for (const id of ["read", "quiz", "read-quiz"])
        expect(p.elements.get(`element-${id}`)?.attrs.opacity).toBe("1");
      expect(p.elements.get("ring-element-read")?.attrs.opacity).toBe(
        direct === "read" ? "1" : "0",
      );
      expect(p.elements.get("ring-element-quiz")?.attrs.opacity).toBe("0");
      expect(p.elements.get("path-element-read-quiz")?.attrs.stroke).toBe(
        direct === "read-quiz" ? "#E62F9A" : "#5C5C66",
      );
      expect(p.elements.get("ring-element-web")?.attrs.stroke).toBe("#2563EB");
      expect(Number(p.elements.get("element-vscode")?.attrs.opacity)).toBeCloseTo(0.3);
    }
  });
  it("最初のノードと囲み内のリンクは0.3秒遅れて現れ、囲みと境界をまたぐリンクはすぐ動く", () => {
    const sb = structuredClone(sample);
    sb.scenes[1].beats[0].show = ["read", "quiz", "read-quiz", "write", "quiz-write"];
    const p = page(1, sb),
      start = p.timing.beats[0].start;
    p.window.__setTime(start + 0.2);
    expect(Number(p.elements.get("zone-icon-web")?.attrs.width)).toBeLessThan(160);
    for (const id of ["read", "quiz", "read-quiz", "write"])
      expect(p.elements.get(`element-${id}`)?.attrs.opacity).toBe("0");
    expect(p.elements.get("path-element-read-quiz")?.attrs["stroke-dashoffset"]).toBe("100");
    expect(p.elements.get("path-element-read-quiz")?.attrs["marker-end"]).toBe("");
    expect(Number(p.elements.get("element-quiz-write")?.attrs.opacity)).toBeGreaterThan(0);
    p.window.__setTime(start + 0.55);
    expect(Number(p.elements.get("element-read")?.attrs.opacity)).toBeCloseTo(0.875);
    expect(
      Number(p.elements.get("path-element-read-quiz")?.attrs["stroke-dashoffset"]),
    ).toBeCloseTo(12.5);
    const snap = JSON.stringify([...p.elements]);
    p.window.__setTime(p.timing.duration);
    p.window.__setTime(start + 0.55);
    expect(JSON.stringify([...p.elements])).toBe(snap);
    p.window.__setTime(start + 0.81);
    expect(p.elements.get("element-read")?.attrs.opacity).toBe("1");
    expect(p.elements.get("path-element-read-quiz")?.attrs["stroke-dashoffset"]).toBe("0");
    expect(p.elements.get("path-element-read-quiz")?.attrs["marker-end"]).toBe("url(#arrow)");
    expect(p.window.__busyRanges.some(([a, b]) => a <= start + 0.3 && b >= start + 0.8)).toBe(true);
  });
  it("すでにノードのあるzoneへの追加と、zone外のノードは遅らせない", () => {
    const p = page(1),
      start = p.timing.beats[1].start;
    p.window.__setTime(start + 0.2);
    expect(Number(p.elements.get("element-quiz")?.attrs.opacity)).toBeGreaterThan(0);
    expect(
      Number(p.elements.get("path-element-read-quiz")?.attrs["stroke-dashoffset"]),
    ).toBeLessThan(100);
    const sb = structuredClone(sample);
    sb.boards.main.zones = [];
    sb.scenes[1].beats[0].focus = [];
    const outside = page(1, sb);
    outside.window.__setTime(outside.timing.beats[0].start + 0.2);
    expect(Number(outside.elements.get("element-read")?.attrs.opacity)).toBeGreaterThan(0);
  });
  it("focus・pulseの矢じりは線と同じaccentになり、最後に通常色に戻る", () => {
    const spec = sample.scenes[3].beats[0];
    const original = structuredClone(spec);
    try {
      for (const effect of ["focus", "pulse"] as const) {
        spec[effect] = ["write-check"];
        const p = page(3),
          start = p.timing.beats[0].start;
        p.window.__setTime(start + 0.3);
        const path = p.elements.get("path-element-write-check");
        expect(path?.attrs.stroke).toBe("#E62F9A");
        expect(path?.attrs["marker-end"]).toBe("url(#arrow-accent)");
        p.window.__setTime(p.timing.beats[0].end + 0.25);
        expect(path?.attrs.stroke).toBe("#5C5C66");
        expect(path?.attrs["marker-end"]).toBe("url(#arrow)");
        delete spec[effect];
      }
    } finally {
      Object.assign(spec, original);
      delete spec.pulse;
    }
  });
  it("toneのある囲みのfocusは自分の色を保ち、pulseはaccentを使う", () => {
    const zone = sample.boards.main.zones?.[0];
    if (!zone) throw new Error("囲みがありません");
    const original = zone.tone;
    const spec = sample.scenes[0].beats[1];
    const originalBeat = structuredClone(spec);
    try {
      for (const [tone, color] of [
        ["blue", "#2563EB"],
        ["violet", "#8330C7"],
      ] as const) {
        zone.tone = tone;
        spec.focus = [zone.id];
        const p = page(0);
        p.window.__setTime(p.timing.beats[1].start + 0.3);
        const ring = p.elements.get(`ring-element-${zone.id}`);
        expect(ring?.attrs).toMatchObject({
          stroke: color,
          "stroke-opacity": "1",
          "stroke-width": "4",
          fill: color,
          "fill-opacity": "0.10",
        });
        p.window.__setTime(p.timing.beats[1].end + 0.25);
        expect(ring?.attrs.opacity).toBe("0");
        expect(ring?.attrs.stroke).toBe("#E62F9A");
        delete spec.focus;
        spec.pulse = [zone.id];
        const pulse = page(0);
        pulse.window.__setTime(pulse.timing.beats[1].start + 0.3);
        expect(pulse.elements.get(`ring-element-${zone.id}`)?.attrs.stroke).toBe("#E62F9A");
        delete spec.pulse;
      }
      delete zone.tone;
      spec.focus = [zone.id];
      expect(page(0).html).toContain('fill="rgba(230,47,154,0.08)" stroke="#E62F9A"');
    } finally {
      zone.tone = original;
      for (const key of ["focus", "pulse"] as const) delete spec[key];
      Object.assign(spec, originalBeat);
    }
  });
  it("矢じりは通常色とaccentの三角形で、印は白縁と白い記号を持つ", () => {
    const { html } = page(0);
    expect(html).toContain('d="M1 1L9 5L1 9Z" fill="#5C5C66"');
    expect(html).toContain('d="M1 1L9 5L1 9Z" fill="#E62F9A"');
    for (const color of ["#16A34A", "#E5342B", "#5C5C66", "#E62F9A"])
      expect(html).toContain(`r="28" fill="${color}" stroke="white" stroke-width="3"`);
    expect(html).toContain('stroke-opacity="0.45"');
    expect(html).toContain('fill-opacity="0.05"');
  });
  it("前の場面の可視状態とカメラから始まる", () => {
    const p = page(3);
    p.window.__setTime(0);
    expect(p.elements.get("element-check")?.attrs.opacity).toBe("1");
    expect(p.elements.get("diagram")?.attrs.viewBox).not.toBe("0 170 1920 760");
  });
  it("focusは文の間だけで、その後に不透明度が戻る", () => {
    const p = page(3);
    p.window.__setTime(1);
    expect(Number(p.elements.get("element-write")?.attrs.opacity)).toBeCloseTo(0.3);
    p.window.__setTime(p.timing.beats[0].end + 0.25);
    expect(p.elements.get("element-write")?.attrs.opacity).toBe("1");
  });
  it("showと白からのフェードが時刻だけで決まる", () => {
    const p = page(0);
    p.window.__setTime(0);
    expect(p.elements.get("white")?.style.opacity).toBe("1");
    expect(p.elements.get("element-web")?.attrs.opacity).toBe("0");
    p.window.__setTime(p.timing.beats[0].start + 0.25);
    expect(Number(p.elements.get("element-web")?.attrs.opacity)).toBeGreaterThan(0);
    expect(Number(p.elements.get("element-web")?.attrs.opacity)).toBeLessThan(1);
    p.window.__setTime(p.timing.beats[0].start + 0.7);
    expect(p.elements.get("element-web")?.attrs.opacity).toBe("1");
  });
  it("travelの全文区間とfocusを戻す区間はbusyに含む", () => {
    const p = page(3),
      b = p.timing.beats[1];
    expect(p.window.__busyRanges.some(([start, end]) => start <= b.start && end >= b.end)).toBe(
      true,
    );
    expect(
      p.window.__busyRanges.some(([start, end]) => start === p.timing.beats[0].end && end > start),
    ).toBe(true);
  });
  it("字幕欄を持ち、外部リソースと時計を含まない", () => {
    const { html } = page(4);
    expect(html.split("<script>")[0]).not.toContain(sample.scenes[4].beats[0].say);
    expect(html).toContain('<div id="caption"></div>');
    expect(html).not.toMatch(/(?:src|href)="https?:/);
    expect(html).not.toMatch(/requestAnimationFrame|setInterval|Date\.now|transition:/);
    expect(html).toContain("file://");
  });
});

it("イラストの上端からラベルの72px枠の上までを画像に使う", () => {
  const sb = structuredClone(sample);
  sb.art = { read: { prompt: "Learner" } };
  sb.boards.main.nodes[0].art = "read";
  const html = page(0, sb).html;
  const node = /<g id="element-read">([\s\S]*?)<g class="mark">/.exec(html)?.[1] ?? "";
  const image = /<image [^>]*y="([\d.]+)"[^>]*height="([\d.]+)"/.exec(node);
  const box = JSON.parse(/data-fit='([^']+)'/.exec(node)?.[1] ?? "{}");
  expect(box.h).toBe(72);
  expect(Number(image?.[1]) + Number(image?.[2])).toBe(box.y);
  const cardY = Number(/<rect [^>]*y="([\d.]+)"/.exec(node)?.[1]);
  expect(Number(image?.[1]) - cardY).toBe(8);
});

it("1行のノードとリンクのラベル枠は文字サイズの1.5倍以上ある", () => {
  const { html } = page(4);
  for (const match of html.matchAll(
    /<text data-fit='([^']+)'[^>]*font-size="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g,
  )) {
    if ((match[3].match(/<tspan/g) ?? []).length !== 1) continue;
    expect(JSON.parse(match[1]).h).toBeGreaterThanOrEqual(Number(match[2]) * 1.5);
  }
});

for (const art of [true, false])
  it(`3行目の低いカードでも${art ? "イラスト" : "アイコン"}とラベルに正の描画領域を確保する`, () => {
    const sb = structuredClone(sample);
    sb.boards.main = {
      cols: 2,
      rows: 3,
      zones: [{ id: "last", label: "操作", cells: [1, 3, 2, 1] }],
      nodes: [
        {
          id: "a",
          label: "書く",
          ...(art ? { art: "write" } : { icon: "write" as const }),
          at: [1, 3],
        },
        {
          id: "b",
          label: "確認",
          ...(art ? { art: "check" } : { icon: "check" as const }),
          at: [2, 3],
        },
      ],
      links: [{ id: "back", from: "b", to: "a", route: "under" }],
    };
    const { html } = page(0, sb);
    expect(html).not.toMatch(/(?:width|height)="-/);
    const boxes = [...html.matchAll(/data-fit='([^']+)'/g)].map((m) => JSON.parse(m[1]));
    expect(boxes.length).toBeGreaterThanOrEqual(2);
    for (const box of boxes) {
      expect(box.w).toBeGreaterThan(0);
      expect(box.h).toBeGreaterThan(40);
    }
  });
