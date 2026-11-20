import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { sceneCaptionAt, sceneTimelines, sceneVideoSequence } from "../../src/scene-timeline.js";
import { storyboardStates, type BoardStoryboard, type Scene } from "../../src/video-storyboard.js";
import { sceneHtml, textSceneHtml, type ScenePageWindow } from "./scene-html.js";
const sampleJson = readFileSync(
  new URL("../../src/__fixtures__/board-video.json", import.meta.url),
  "utf8",
);
const sample = JSON.parse(sampleJson) as BoardStoryboard;
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
it("takeawayを文字場面として追加しない", () => {
  const sequence = sceneVideoSequence([], [], {
    title: "学ぶ流れ",
    takeaway: "確認して提出します。",
  });
  expect(sequence.map(({ scene }) => scene.id)).toEqual(["title"]);
  expect(
    textSceneHtml(sequence[0].scene as import("../../src/scene-timeline.js").TextScene),
  ).not.toContain("確認して提出します。");
});
it.each(["title"] as const)(
  "%sは長い読み上げでも字幕を出さず、伸びた末尾でフェードする",
  async (id) => {
    const entry = sceneVideoSequence(
      [],
      [],
      { title: "学ぶ流れ", takeaway: "確認して提出します。" },
      {},
      {
        title: 6.013,
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
    const fade = 0.4;
    expect(window.__busyRanges[1][0]).toBeCloseTo(entry.timing.duration - fade);
    await window.__setTime(entry.timing.duration - fade / 2);
    expect(Number(content.style.opacity)).toBeCloseTo(0.5);
    await window.__setTime(entry.timing.duration);
    expect(Number(content.style.opacity)).toBeCloseTo(0);
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
    expect(titlePage(undefined, "recap").html).toContain('<div id="heading"><span>問題へ</span>');
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

const lessonHeadings = [
  ["goal", "学ぶこと"],
  ["example", "身近な例"],
  ["syntax", "書き方"],
  ["apply", "例を書く"],
  ["note", "補足"],
  ["quiz", "問題"],
  ["answer", "答え合わせ"],
  ["explain", "解説"],
  ["usage", "使う場面"],
  ["next", "次の課題"],
] as const;

function renderScene(kind: "board" | "view" | "code", role: Scene["role"]) {
  const common = {
    id: "scene",
    title: "値を比べる",
    role,
    ...(role === "point" ? { point: 1 } : {}),
    beats: [{ say: "値を比べます。" }],
  };
  const scene: Scene =
    kind === "board"
      ? { ...common, kind, board: "main" }
      : kind === "view"
        ? { ...common, kind, image: "art:example" }
        : { ...common, kind, code: ["// 値を比べる", "const larger = 2 > 1;"], show: true };
  const [state] = storyboardStates({ ...sample, scenes: [scene] });
  const [timing] = sceneTimelines([scene], [[2]], {}, 2);
  const html = sceneHtml({
    scene,
    state,
    timing,
    board: sample.boards.main,
    index: 0,
    total: 1,
    images: { "art:example": { url: "example.png", width: 1600, height: 1000, regions: {} } },
  });
  return { html, timing };
}

describe.each(["board", "view", "code"] as const)("%s のレッスン型の見出しと問題", (kind) => {
  it.each(lessonHeadings)("%s の見出しは「%s」", (role, label) => {
    const { html } = renderScene(kind, role);
    expect(html).toContain(`<span>${label}</span>`);
    expect(html.includes('id="think-time"')).toBe(role === "quiz");
    expect(html.includes("function thinkRuntime")).toBe(role === "quiz");
  });
  it("schema 1 の見出しは従来の文言のまま", () => {
    expect(renderScene(kind, "hook").html).toContain(
      `<span>${kind === "code" ? "つかみ" : ""}</span>`,
    );
    expect(renderScene(kind, "point").html).toContain("<span>要点 1</span>");
    expect(renderScene(kind, "recap").html).toContain("<span>問題へ</span>");
  });
});

it("考える時間の残りを場面内の時刻だけで計算し、フェード区間も撮る", async () => {
  const { html, timing } = renderScene("board", "quiz");
  const { start, duration } = timing.think as NonNullable<typeof timing.think>;
  const end = start + duration;
  const think = { style: {} as Record<string, string> };
  const seconds = { textContent: "" };
  const ring = {
    setAttribute: (_name: string, offset: string) => {
      ring.offset = Number(offset);
    },
    offset: 0,
  };
  const document = {
    getElementById: (id: string) =>
      ({
        "think-time": think,
        "think-seconds": seconds,
        "think-ring": ring,
      })[id],
  };
  const window = {
    __setTime: async () => undefined,
    __busyRanges: [],
  } as unknown as ScenePageWindow;
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)?.[1] ?? "";
  runInNewContext(script, { window, document });
  expect(window.__busyRanges).toEqual([[start - 0.3, end + 0.3]]);
  for (const [time, opacity, remaining] of [
    [0, 0, 6],
    [start - 0.15, 0.5, 6],
    [start, 1, 6],
    [start + 2.2, 1, 4],
    [end - 0.01, 1, 1],
    [end + 0.15, 0.5, 1],
    [end + 0.3, 0, 1],
    [start + 2, 1, 4],
  ]) {
    await window.__setTime(time);
    expect(Number(think.style.opacity)).toBeCloseTo(opacity);
    expect(seconds.textContent).toBe(String(remaining));
    expect(ring.offset).toBeCloseTo(1 - Math.max(0, Math.min(1, (end - time) / duration)));
  }
});

it("札があるノードにだけ札を描き、引き継いだ値と変更後の値を用意する", () => {
  const sb = structuredClone(sample);
  sb.scenes[0].beats[0].show = ["read"];
  sb.scenes[0].beats[0].tag = { read: "2件" };
  sb.scenes[1].reset = false;
  sb.scenes[1].beats = [{ say: "値を変えます。", tag: { read: "3<&件" } }];
  const scene = sb.scenes[1];
  const html = sceneHtml({
    scene,
    state: storyboardStates(sb)[1],
    timing: sceneTimelines([scene], [[2]])[0],
    board: sb.boards.main,
    index: 1,
    total: 2,
  });
  expect(html.match(/data-board-tag="/g)).toHaveLength(1);
  expect(html).toContain('data-board-tag="read"');
  expect(html).toContain('data-value="2件"');
  expect(html).toContain('data-value="3&lt;&amp;件"');
  expect(html).toContain("function boardTagRuntime");
  expect(page(0).html).not.toContain("data-board-tag");
});

it("札を使わない schema 1 の概念図の HTML を維持する", () => {
  const html = page(0, JSON.parse(sampleJson) as BoardStoryboard).html.replace(
    /file:\/\/[^)]*\/([^/)]*\.woff2?)/g,
    "file:///font/$1",
  );
  expect(createHash("sha256").update(html).digest("hex")).toBe(
    "eb90870448578e2cdd6b42cc1d5ba0c4f7218df34e9ace13a3c111577dbbe4a4",
  );
});

describe("用語とダイアログの描画", () => {
  const board = {
    cols: 3,
    rows: 1,
    zones: [{ id: "zone", label: "引数", cells: [1, 1, 3, 1] }],
    nodes: [
      { id: "input", label: "引数", icon: "file", at: [1, 1] },
      { id: "result", label: "戻り値", icon: "file", at: [3, 1] },
    ],
    links: [{ id: "call", from: "input", to: "result", label: "値" }],
  } satisfies NonNullable<BoardStoryboard["boards"]>[string];
  type Overlay = Pick<Scene["beats"][number], "term" | "dialog">;
  const term = { text: "引数", ruby: "ひきすう", note: "関数が受け取る値" };
  const dialog = { title: "関数の形", code: ["// 戻り値", "const value = 1;"] };
  const kinds = ["board", "view", "code"] as const;
  function render(kind: (typeof kinds)[number], first: Overlay = {}, second: Overlay = {}) {
    const actualBoard = kind === "code" ? { ...board, zones: undefined } : board;
    const common = { id: "example", role: "next", title: "引数と戻り値" } as const;
    const narration = [
      { say: "戻り値と値です。", ...first },
      { say: "戻り値と引数です。", ...second },
    ];
    const scene: Scene =
      kind === "board"
        ? {
            ...common,
            kind,
            board: "main",
            beats: [
              { ...narration[0], show: ["input", "result", "call"], tag: { input: "引数" } },
              { ...narration[1], pulse: ["input"] },
            ],
          }
        : kind === "view"
          ? {
              ...common,
              kind,
              image: "art:example",
              beats: narration.map((beat) => ({
                ...beat,
                label: [{ at: "item", text: "引数" }],
              })),
            }
          : {
              ...common,
              kind,
              panel: { kind: "figure", board: "main" },
              show: true,
              code: ["// 戻り値", "const value = 1;"],
              beats: [
                {
                  ...narration[0],
                  figure: { show: ["input", "result", "call"], tag: { input: "引数" } },
                },
                narration[1],
              ],
            };
    const [state] = storyboardStates({ ...sample, boards: { main: actualBoard }, scenes: [scene] });
    const [timing] = sceneTimelines([scene], [[2, 2]], {}, 2);
    const html = sceneHtml({
      scene,
      schema: 2,
      state,
      timing,
      board: actualBoard,
      index: 2,
      total: 3,
    });
    return { html, timing };
  }

  function script(html: string, name: string): string {
    const found = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(([, script]) =>
      script.includes(`function ${name}(`),
    );
    if (!found) throw new Error(`描画処理がありません: ${name}`);
    return found[1];
  }

  it.each(["board", "view", "code"] as const)(
    "%s で用語の幕と字幕を文の時刻から描く",
    async (kind) => {
      const { html, timing } = render(kind, { term });
      expect(html).toContain("rgba(14,14,16,0.78)");
      expect(html).toContain('<ruby>引数<rt style="font-size:40px">ひきすう</rt></ruby>');
      expect(html).toContain('<div class="term-note">関数が受け取る値</div>');
      const entry = { hidden: true, style: {} };
      const overlay = { style: {} as Record<string, string>, children: [entry] };
      const caption = { style: {} as Record<string, string> };
      const window = { __setTime: async () => undefined, __busyRanges: [], __overflows: () => [] };
      const document = { getElementById: (id: string) => (id === "caption" ? caption : overlay) };
      runInNewContext(script(html, "beatOverlayRuntime"), { window, document });
      const { start, end } = timing.beats[0];
      expect(window.__busyRanges).toEqual([
        [start, start + 0.3],
        [end, end + 0.3],
      ]);
      for (const [time, opacity] of [
        [0, 0],
        [start + 0.15, 0.5],
        [start + 0.4, 1],
        [end - 1 / 30, 1],
        [end + 0.15, 0.5],
        [end + 0.31, 0],
        [start + 0.4, 1],
      ]) {
        await (window as unknown as ScenePageWindow).__setTime(time);
        expect(Number(overlay.style.opacity)).toBeCloseTo(opacity);
        expect(caption.style.color).toBe(opacity > 0 ? "white" : "");
        expect(caption.style.zIndex).toBe(opacity > 0 ? "6" : "");
        expect(entry.hidden).toBe(opacity === 0);
      }
    },
  );

  it.each(kinds)("%s の字幕・図・札・コードにフリガナを足さない", (kind) => {
    const { html } = render(kind);
    expect(html).toContain("<span>次の課題</span>");
    expect(html).toContain("引数と戻り値");
    expect(html).toContain("戻り値と値です。");
    expect(html).not.toMatch(/<ruby>|<rt[ >]|ruby-fit|beat-overlay/);
    if (kind === "board") {
      const markup = html.split("<script>")[0];
      expect(markup).toMatch(/<tspan[^>]*>戻り値<\/tspan>/);
      expect(markup).toMatch(/<tspan[^>]*>値<\/tspan>/);
      expect(markup).toMatch(/data-value="引数"[\s\S]*?<text[^>]*>引数<\/text>/);
      expect(markup).toMatch(/id="zone-label-zone"[^>]*>引数<\/text>/);
    } else if (kind === "code") {
      expect(html).toMatch(/hljs-comment[^>]*>\/\/ 戻り値/);
      expect(html).toContain('"label":"戻り値"');
      expect(html).toContain('"tags":{"input":"引数"}');
    } else {
      expect(html).toContain('"text":"引数"');
    }
  });

  it.each(kinds)("%s のダイアログに同じ幕・見出し・コードを描く", async (kind) => {
    const { html, timing } = render(kind, { dialog });
    expect(html).toContain("rgba(14,14,16,0.55)");
    expect(html).toContain('<h2 class="dialog-title">関数の形</h2>');
    expect(html).toContain(
      '<code><span class="hljs-comment">// 戻り値</span>\n<span class="hljs-keyword">const</span> value = <span class="hljs-number">1</span>;</code>',
    );
    expect(html).toContain("JetBrains Mono");
    const code = { scrollWidth: 100, clientWidth: 100 };
    const entry = {
      hidden: true,
      style: { transform: "" },
      classList: { contains: (name: string) => name === "code-dialog" },
      querySelectorAll: () => [code],
      querySelector: () => ({ textContent: "関数の形" }),
    };
    const overlay = { style: {} as Record<string, string>, children: [entry] };
    const caption = { style: {} as Record<string, string> };
    const window = { __setTime: async () => undefined, __busyRanges: [], __overflows: () => [] };
    const document = { getElementById: (id: string) => (id === "caption" ? caption : overlay) };
    runInNewContext(script(html, "beatOverlayRuntime"), { window, document });
    const { start, end } = timing.beats[0];
    for (const [time, opacity] of [
      [0, 0],
      [start + 0.15, 0.5],
      [start + 0.4, 1],
      [end - 1 / 30, 1],
      [end, 1],
      [end + 0.15, 0.5],
      [timing.beats[1].start, 0],
    ]) {
      await (window as unknown as ScenePageWindow).__setTime(time);
      expect(Number(overlay.style.opacity)).toBeCloseTo(opacity);
      expect(entry.hidden).toBe(opacity === 0);
      expect(caption.style.color).toBe(opacity > 0 ? "white" : "");
      expect(caption.style.zIndex).toBe(opacity > 0 ? "6" : "");
      if (opacity > 0) expect(overlay.style.background).toBe("rgba(14,14,16,0.55)");
      expect(window.__overflows()).toEqual([]);
    }
    await (window as unknown as ScenePageWindow).__setTime(start + 0.15);
    expect(entry.style.transform).toBe("scale(1.06)");
    code.scrollWidth = 125;
    expect(window.__overflows()).toEqual(["ダイアログに文字が収まりません: 関数の形"]);
    await (window as unknown as ScenePageWindow).__setTime(start + 0.4);
    expect(entry.style.transform).toBe("scale(1)");
  });

  it("同じ場面に用語とダイアログがあるときは、文に合わせて幕と内容を切り替える", async () => {
    const { html, timing } = render("view", { term }, { dialog });
    const entries = [0, 1].map(() => ({ hidden: true, style: {} }));
    const overlay = { style: {} as Record<string, string>, children: entries };
    const window = { __setTime: async () => undefined, __busyRanges: [], __overflows: () => [] };
    const document = {
      getElementById: (id: string) => (id === "caption" ? { style: {} } : overlay),
    };
    runInNewContext(script(html, "beatOverlayRuntime"), { window, document });
    for (const index of [0, 1, 0]) {
      await (window as unknown as ScenePageWindow).__setTime(timing.beats[index].start + 0.4);
      expect(entries.map(({ hidden }) => hidden)).toEqual([index !== 0, index !== 1]);
      expect(overlay.style.background).toBe(
        index === 0 ? "rgba(14,14,16,0.78)" : "rgba(14,14,16,0.55)",
      );
    }
  });

  it("コードを収めるために最長行に合わせて文字を縮める", () => {
    const { html } = render("view", { dialog: { ...dialog, code: ["a".repeat(80)] } });
    expect(html).toContain('<pre class="dialog-code" style="font-size:22px">');
  });

  it.each(kinds)("%s に dialog がなければ HTML に要素・CSS・描画処理を足さない", (kind) => {
    expect(render(kind).html).toBe(render(kind, { dialog: undefined }).html);
    expect(render(kind, { term }).html).not.toMatch(
      /code-dialog|dialog-heading|dialog-code|dialogOverflow/,
    );
  });
});
