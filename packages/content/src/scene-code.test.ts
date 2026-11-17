import { describe, expect, it } from "vitest";
import {
  codeFrame,
  codeLineWidth,
  codeSceneState,
  validateCodeScene,
  type CodeScene,
} from "./scene-code.js";
import { sceneTimelines } from "./scene-timeline.js";
const sample = (): CodeScene => ({
  kind: "code",
  id: "names",
  role: "point",
  point: 1,
  title: "名前と値",
  code: ["// 価格を作る", "const price = 1200;", "// 合計を作る", "const total = price + 500;"],
  panel: { kind: "values", items: ["price", "total"] },
  beats: [
    { say: "価格に名前を付けます。", type: [0, 1], set: { price: "1200" } },
    { say: "価格を確かめます。", focus: [1], part: { line: 1, text: "=" } },
    {
      say: "送料を足します。",
      type: [2, 3],
      calc: { on: "total", expr: "1200 + 500", result: "1700" },
    },
    { say: "誤りを示します。", mark: [{ line: 3, kind: "cross" }], set: { price: "980" } },
    { say: "誤りを消します。", clear: [3] },
  ],
});
describe("コードの状態とコマ", () => {
  it("値と印を引き継ぎ、clearで行と印を消す。場面間では初期化する", () => {
    const scene = sample(),
      original = structuredClone(scene),
      state = codeSceneState(scene);
    expect(state.start).toEqual({ visible: [], values: {}, rows: [], marks: {} });
    expect(state.beats[2].after.values).toEqual({ price: "1200", total: "1700" });
    expect(state.beats[3].after.marks).toEqual({ 3: "cross" });
    expect(state.end).toMatchObject({
      visible: [0, 1, 2],
      marks: {},
      values: { price: "980", total: "1700" },
    });
    expect(scene).toEqual(original);
    expect(codeSceneState(scene).start.values).toEqual({});
  });
  it("showはコードだけを最初から出す", () => {
    const scene = { ...sample(), show: true };
    expect(codeSceneState(scene).start).toEqual({
      visible: [0, 1, 2, 3],
      values: {},
      rows: [],
      marks: {},
    });
  });
  it("文字数に比例して順に打ち、短い音声でも7割で完了する", () => {
    const scene = sample();
    scene.code = ["ab😀", "123456789"];
    scene.beats = [{ say: "書きます。", type: [0, 1] }];
    const timing = sceneTimelines([scene], [[0.4]])[0],
      state = codeSceneState(scene),
      start = timing.beats[0].start;
    const at = (elapsed: number) =>
      codeFrame(scene, state, timing, start + elapsed).lines.map((l) => l.text);
    expect(at(-0.1)).toEqual(["", ""]);
    expect(at(0)).toEqual(["", ""]);
    expect(at(0.14)).toEqual(["ab😀", "123"]);
    expect(at(0.281)).toEqual(scene.code);
    expect(at(0.07)[0]).toBe("ab😀");
  });
  it("強調は次の文で解け、計算は式のあと結果を出す。任意の時刻へ戻れる", () => {
    const scene = sample(),
      timing = sceneTimelines([scene], [[4, 4, 4, 4, 4]])[0],
      state = codeSceneState(scene);
    const at = (i: number, elapsed: number) =>
      codeFrame(scene, state, timing, timing.beats[i].start + elapsed);
    expect(at(1, 1).lines[0].dim).toBe(true);
    expect(at(1, 1).part).toEqual({ line: 1, text: "=" });
    expect(at(2, 0).resultProgress).toBe(0);
    expect(at(2, 0).calc?.expr).toBe("1200 + 500");
    expect(at(2, 1.2).resultProgress).toBe(1);
    expect(at(2, 1.2).lines.every((l) => !l.dim)).toBe(true);
    expect(at(3, 0.1).oldValues.price).toBe("1200");
    expect(at(3, 1).values.price).toBe("980");
    expect(at(0, 0).values.total).toBeUndefined();
  });
  it("callsの行を追加順に引き継ぐ", () => {
    const scene: CodeScene = {
      ...sample(),
      panel: { kind: "calls", rows: [{ call: "addTax(980)", result: "1078" }] },
      beats: [{ say: "結果を見ます。", row: [0] }],
    };
    expect(codeSceneState(scene).end.rows).toEqual([0]);
  });
  it("全角換算はUnicode文字単位で数える", () => {
    expect(codeLineWidth("abcあ😀")).toBe(3.5);
  });
});

const numberLine = (): CodeScene => ({
  kind: "code",
  id: "floor",
  role: "point",
  point: 1,
  title: "切り捨て",
  code: ["const points = Math.floor(19.8);"],
  panel: { kind: "numberLine", from: 18, to: 21, items: ["points"] },
  beats: [
    { say: "点を置きます。", type: [0], plot: { at: 19.8, label: "19.8" } },
    { say: "間にあります。", range: [19, 20] },
    { say: "切り捨てます。", snap: { to: 19, label: "切り捨て" } },
    {
      say: "二十ではありません。",
      tick: [
        { at: 20, kind: "cross" },
        { at: 19, kind: "check" },
      ],
    },
    { say: "値を入れます。", set: { points: "19" } },
    { say: "計算します。", calc: { on: "points", expr: "19 + 1", result: "20" } },
  ],
});
describe("数直線", () => {
  it("点・区間・矢印・目盛りの印を引き継ぎ、時刻を戻して再現する", () => {
    const scene = numberLine(),
      original = structuredClone(scene);
    expect(validateCodeScene(scene as unknown as Record<string, unknown>, "scene")).toEqual([]);
    const state = codeSceneState(scene),
      timing = sceneTimelines([scene], [[3, 3, 3, 3, 3, 3]])[0];
    const at = (i: number, elapsed: number) =>
      codeFrame(scene, state, timing, timing.beats[i].start + elapsed);
    expect(at(0, 0).numberLine?.opacity).toBe(0);
    expect(at(0, 0.4).numberLine?.opacity).toBe(1);
    expect(at(2, 0).numberLine?.point?.at).toBe(19.8);
    expect(at(2, 0.5).numberLine?.point?.at).toBeGreaterThan(19);
    expect(at(2, 0.5).numberLine?.point?.at).toBeLessThan(19.8);
    expect(at(2, 1).numberLine?.point?.at).toBe(19);
    expect(at(5, 1).numberLine).toMatchObject({
      range: [19, 20],
      arrow: { from: 19.8, to: 19 },
      ticks: { 19: "check", 20: "cross" },
    });
    expect(at(5, 1).values.points).toBe("20");
    expect(at(0, 1).numberLine?.arrow).toBeUndefined();
    expect(scene).toEqual(original);
  });
  it.each([
    { from: 20, to: 20 },
    { from: 21, to: 18 },
    { from: 0, to: 8 },
    { from: 18.5, to: 21 },
    { from: 18, to: Infinity },
  ])("不正な範囲 %j を拒む", (bounds) => {
    const scene = numberLine();
    scene.panel = { kind: "numberLine", ...bounds };
    expect(
      validateCodeScene(scene as unknown as Record<string, unknown>, "scene").length,
    ).toBeGreaterThan(0);
  });
  it.each([
    { plot: { at: 22, label: "22" } },
    { plot: { at: NaN, label: "数" } },
    { range: [17, 20] },
    { range: [19.5, 20] },
    { range: [20, 19] },
    { range: [19] },
    { snap: { to: 22, label: "移動" } },
    { snap: { to: 19.5, label: "移動" } },
    { tick: [{ at: 22, kind: "cross" }] },
    { tick: [{ at: 19.5, kind: "check" }] },
    { tick: [{ at: 20, kind: "unknown" }] },
    { plot: null },
    { snap: null },
    { tick: [null] },
  ])("不正な動き %j を拒む", (action) => {
    const scene = numberLine();
    Object.assign(scene.beats[1], action);
    expect(
      validateCodeScene(scene as unknown as Record<string, unknown>, "scene").length,
    ).toBeGreaterThan(0);
  });
  it("前の文にplotが必要で、ほかのパネルでは4種類の動きを使えない", () => {
    const scene = numberLine();
    scene.beats = [
      { say: "移動します。", plot: { at: 19.8, label: "19.8" }, snap: { to: 19, label: "移動" } },
    ];
    expect(
      validateCodeScene(scene as unknown as Record<string, unknown>, "scene").some((i) =>
        i.path.endsWith("snap"),
      ),
    ).toBe(true);
    for (const panel of [
      undefined,
      { kind: "values", items: ["points"] },
      { kind: "calls", rows: [] },
    ]) {
      const other = { ...numberLine(), panel };
      const issues = validateCodeScene(other, "scene");
      for (const key of ["plot", "range", "snap", "tick"])
        expect(issues.some((i) => i.path.endsWith(key))).toBe(true);
    }
  });
  it("値の箱は省略でき、2個・8個の目盛りと負の数も使える", () => {
    for (const to of [-2, 4]) {
      const scene = {
        ...numberLine(),
        panel: { kind: "numberLine", from: -3, to },
        beats: [{ say: "点を置きます。", plot: { at: -2.8, label: "負の数" } }],
      };
      expect(validateCodeScene(scene, "scene")).toEqual([]);
    }
  });
});
