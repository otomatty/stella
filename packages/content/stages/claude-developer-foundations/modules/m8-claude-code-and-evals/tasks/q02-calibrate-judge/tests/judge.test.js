import { describe, expect, it } from "vitest";
import { calibrateJudge } from "../src/judge.js";

function rows(passes) {
  return passes.map((pass, index) => ({ id: `R${index + 1}`, pass }));
}

describe("採点器を人の判定で校正する", () => {
  const labels = rows([true, true, true, false, true]);
  it("同じ合格件数でも、誤りの向きと ID で区別する", () => {
    const judged = rows([true, false, true, true, true]).reverse();
    expect(calibrateJudge(labels, judged)).toEqual({
      agreement: 0.6,
      falsePassIds: ["R4"],
      falseFailIds: ["R2"],
      ready: false,
    });
  });
  it("一致率がちょうど8割で誤合格がないときだけ境界を通る", () => {
    const strict = rows([true, true, false, false, true]);
    const loose = rows([true, true, true, true, true]);
    expect(calibrateJudge(labels, strict.reverse()).ready).toBe(true);
    expect(calibrateJudge(labels, loose).ready).toBe(false);
  });
  it("誤合格がなくても一致率が低ければ戻し、誤りを人の記録順に残す", () => {
    const judged = rows([false, false, true, false, true]).reverse();
    expect(calibrateJudge(labels, judged)).toEqual({
      agreement: 0.6,
      falsePassIds: [],
      falseFailIds: ["R1", "R2"],
      ready: false,
    });
  });
  it("未評価・余分・重複の ID を検出する", () => {
    expect(() => calibrateJudge(labels, labels.slice(1))).toThrow();
    expect(() => calibrateJudge(labels, [...labels, { id: "X", pass: true }])).toThrow();
    expect(() => calibrateJudge(labels, [labels[0], ...labels.slice(0, 4)])).toThrow();
    expect(() => calibrateJudge([labels[0], ...labels.slice(0, 4)], labels)).toThrow();
    expect(() => calibrateJudge(labels, [{ id: "X", pass: true }, ...labels.slice(1)])).toThrow();
  });
  it("人が両方の判定を付けた集合が必要", () => {
    for (const data of [[], rows([true, true]), rows([false, false])]) {
      expect(() => calibrateJudge(data, data)).toThrow();
    }
  });
});
