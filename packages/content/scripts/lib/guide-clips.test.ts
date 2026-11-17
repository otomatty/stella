import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GUIDE_ACTIONS, parseGuideClips } from "./guide-clips.js";

const pages = new Set(["guide-01.html"]);
const fresh = () => [
  {
    id: "guide/c01-q05-1",
    page: "guide-01.html",
    steps: [{ mark: "open", do: "scroll", to: "#c01-q05-1" }],
    regions: { task: "#c01-q05-1 .task" },
  },
];
describe("ガイドクリップの定義", () => {
  it("8種類の操作を受け付け、ファイルの読み書きをしない", () => {
    const input = fresh();
    const steps = GUIDE_ACTIONS.map((action) =>
      action === "wait"
        ? { mark: action, do: action, seconds: 1 }
        : { mark: action, do: action, to: "#target" },
    );
    expect(parseGuideClips([{ ...input[0], steps }], pages)[0].steps).toEqual(steps);
    expect(input).toEqual(fresh());
  });
  it("zoom の省略時は 1.5、指定時はその倍率を返し、入力は書き換えない", () => {
    const input = fresh();
    expect(parseGuideClips(input, pages)[0].zoom).toBe(1.5);
    expect(parseGuideClips([{ ...input[0], zoom: 2 }], pages)[0].zoom).toBe(2);
    expect(parseGuideClips([{ ...input[0], zoom: 0.75 }], pages)[0].zoom).toBe(0.75);
    expect(input).toEqual(fresh());
  });
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, "1.5", null])(
    "不正な zoom %j を拒否",
    (zoom) => {
      expect(() => parseGuideClips([{ ...fresh()[0], zoom }], pages)).toThrow("zoom");
    },
  );
  it.each([null, {}, "guide", 1])("配列でない値 %j を拒否", (input) => {
    expect(() => parseGuideClips(input, pages)).toThrow("配列");
  });
  it.each(["../outside", "web/one", "guide/../one", "guide/a/b", "guide/UPPER", "guide/"])(
    "不正な id %s",
    (id) => {
      expect(() => parseGuideClips([{ ...fresh()[0], id }], pages)).toThrow("id");
    },
  );
  it("id の重複を絞り込みの前に検出する", () => {
    expect(() => parseGuideClips([...fresh(), ...fresh()], pages)).toThrow("id が重複");
  });
  it.each(["guide-00.html", "guide-02.html", "../guide-01.html", null])(
    "存在しない page %s",
    (page) => {
      expect(() => parseGuideClips([{ ...fresh()[0], page }], pages)).toThrow("page");
    },
  );
  it.each([
    { steps: [] },
    { steps: {} },
    { steps: [null] },
    { steps: [{ mark: "open", do: "shell", to: "#x" }] },
    { steps: [{ mark: "bad#mark", do: "scroll", to: "#x" }] },
    { steps: [{ mark: "open", do: "focus" }] },
    { steps: [{ mark: "open", do: "type", to: "  " }] },
    { steps: [{ mark: "open", do: "wait", seconds: 0 }] },
    { steps: [{ mark: "open", do: "wait", seconds: -1 }] },
    { steps: [{ mark: "open", do: "wait", seconds: Number.NaN }] },
    { steps: [{ mark: "open", do: "wait", seconds: Number.POSITIVE_INFINITY }] },
    { steps: [{ mark: "open", do: "wait", seconds: "1" }] },
    { regions: [] },
    { regions: null },
    { regions: { task: 42 } },
    { regions: { "bad/name": "#x" } },
    { regions: { task: "" } },
  ])("不正な項目を拒否 %j", (change) => {
    expect(() => parseGuideClips([{ ...fresh()[0], ...change }], pages)).toThrow();
  });
  it("mark の重複に定義と step の位置を添える", () => {
    const clip = fresh()[0];
    clip.steps.push(...clip.steps);
    expect(() => parseGuideClips([clip], pages)).toThrow("guide/c01-q05-1 step[1]");
  });
  it("実際の見本2本の定義とページの存在を検証する", () => {
    const input = JSON.parse(
      readFileSync(new URL("../../clips/guide.json", import.meta.url), "utf8"),
    );
    const existing = new Set(
      readdirSync(new URL("../../../../docs/devlab-ts-prework-guide/pages", import.meta.url)),
    );
    expect(parseGuideClips(input, existing).map((d) => d.id)).toEqual([
      "guide/c01-q05-1",
      "guide/c01-q05-item",
    ]);
  });
});
