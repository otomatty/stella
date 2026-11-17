import { describe, expect, it } from "vitest";
import { codeFrame, codeLineWidth, codeSceneState, type CodeScene } from "./scene-code.js";
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
