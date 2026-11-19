import { describe, expect, it } from "vitest";

import { selectQuestionSample } from "./sample.js";

const pool = (n: number) => Array.from({ length: n }, (_, i) => `q${i}`);

const sample = (over: Partial<Parameters<typeof selectQuestionSample>[0]> = {}) =>
  selectQuestionSample({
    questionIds: pool(40),
    userId: "seed-learner",
    stageId: "id-d",
    attempt: 0,
    ...over,
  });

describe("selectQuestionSample", () => {
  it("同じ種なら常に同じ設問を選ぶ", () => {
    expect(sample()).toEqual(sample());
  });

  it("候補の並び順に依存しない (D1 の返す順が変わっても同じ)", () => {
    expect(sample({ questionIds: [...pool(40)].reverse() })).toEqual(sample());
  });

  it("種の attempt が変わると別の設問を選ぶ", () => {
    expect(sample({ attempt: 1 })).not.toEqual(sample());
  });

  it("利用者が変わると別の設問を選ぶ", () => {
    expect(sample({ userId: "other" })).not.toEqual(sample());
  });

  it("上限まで、候補が少なければ候補ぶんだけ出す", () => {
    expect(sample()).toHaveLength(10);
    expect(sample({ questionIds: pool(6) })).toHaveLength(6);
  });

  it("同じ設問を 2 度出さない (候補が重複していても)", () => {
    const ids = sample({ questionIds: [...pool(12), ...pool(12)] });
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("出すのは候補にある設問だけ", () => {
    const candidates = new Set(pool(40));
    expect(sample().every((id) => candidates.has(id))).toBe(true);
  });

  it("候補が空なら空のサンプル", () => {
    expect(sample({ questionIds: [] })).toEqual([]);
  });
});
