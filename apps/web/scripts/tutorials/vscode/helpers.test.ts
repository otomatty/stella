import { describe, expect, it } from "vitest";
import { assertScenario, mergeRegions, recordedRegion, unionBox, type Scenario } from "./helpers";

const base = {
  id: "edit-save",
  title: "編集して保存する",
  summary: "ファイルを保存します。",
  topic: "dev-env-basics/modules/u02-first-task/l1-first-task/t1-edit-save",
  task: "dev-env-basics/u02-first-task/q01-first-page",
  async run() {
    /* 検査では実行しない。 */
  },
} satisfies Scenario;

describe("assertScenario", () => {
  it("requires clip for bare and rejects combined keys", () => {
    expect(() => assertScenario({ ...base, bare: "ja" })).toThrow("clip");
    expect(() =>
      assertScenario({ ...base, bare: "ja", clip: "vscode/install-extension", lms: false }),
    ).toThrow("lms");
    expect(() =>
      assertScenario({ ...base, bare: "en", clip: "vscode/display-language", others: [] }),
    ).toThrow("others");
    expect(() =>
      assertScenario({ ...base, bare: "ja", clip: "vscode/japanese-ui", open: null }),
    ).toThrow("open");
    expect(() =>
      assertScenario({
        ...base,
        bare: "ja",
        clip: "vscode/install-extension",
        prepare: async () => {
          /* 併用は読み込み時に落とす。 */
        },
      }),
    ).toThrow("prepare");
    expect(() =>
      assertScenario({
        id: "install-extension",
        title: "拡張",
        summary: "入れる",
        bare: "ja",
        clip: "vscode/install-extension",
        topic: base.topic,
        task: base.task,
        async run() {
          /* bare でも topic と task はあってよい。 */
        },
      }),
    ).not.toThrow();
  });
  it("requires topic and task when the scenario is not bare", () => {
    const { topic: _topic, ...noTopic } = base;
    expect(() => assertScenario(noTopic)).toThrow("topic");
    const { task: _task, ...noTask } = base;
    expect(() => assertScenario(noTask)).toThrow("task");
  });
});

describe("recordedRegion", () => {
  it("scales the 1280x800 window to 1600x1000", () => {
    expect(recordedRegion({ x: 0, y: 0, width: 1280, height: 800 }, "all")).toEqual([
      0, 0, 1600, 1000,
    ]);
    expect(recordedRegion({ x: 10, y: 20, width: 100, height: 40 }, "row")).toEqual([
      12, 25, 126, 50,
    ]);
    expect(() => recordedRegion(null, "missing")).toThrow("領域が見つかりません: missing");
    expect(() => recordedRegion({ x: -1, y: 0, width: 10, height: 10 }, "off")).toThrow(/off/);
  });
});

describe("unionBox", () => {
  it("covers every box", () => {
    expect(
      unionBox([
        { x: 10, y: 20, width: 30, height: 40 },
        { x: 5, y: 50, width: 100, height: 10 },
      ]),
    ).toEqual({ x: 5, y: 20, width: 100, height: 40 });
    expect(mergeRegions([10, 20, 30, 40], [0, 50, 20, 10])).toEqual([0, 20, 40, 40]);
    expect(() => unionBox([])).toThrow("領域がありません");
  });
});
