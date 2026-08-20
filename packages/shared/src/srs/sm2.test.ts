import { describe, expect, it } from "vitest";

import { INITIAL_EASE, MIN_EASE, sm2Next } from "./sm2.js";

describe("sm2Next", () => {
  it("新規カードの初回正解は 1 日後", () => {
    expect(sm2Next(null, true)).toEqual({ ease: 2.6, intervalDays: 1, reps: 1 });
  });

  it("2 回目の連続正解は 6 日後", () => {
    const first = sm2Next(null, true);
    expect(sm2Next(first, true)).toEqual({ ease: 2.7, intervalDays: 6, reps: 2 });
  });

  it("3 回目以降は interval × ease で伸びる", () => {
    const second = { ease: 2.7, intervalDays: 6, reps: 2 };
    const third = sm2Next(second, true);
    expect(third).toEqual({ ease: 2.8, intervalDays: Math.round(6 * 2.8), reps: 3 });
  });

  it("誤答で reps と interval がリセットされ ease が下がる", () => {
    const state = { ease: 2.7, intervalDays: 6, reps: 2 };
    expect(sm2Next(state, false)).toEqual({ ease: 2.38, intervalDays: 1, reps: 0 });
  });

  it("新規カードの初回誤答も翌日 due", () => {
    expect(sm2Next(null, false)).toEqual({ ease: 2.18, intervalDays: 1, reps: 0 });
  });

  it("ease は下限 1.3 を下回らない", () => {
    let state = sm2Next(null, false);
    for (let i = 0; i < 10; i++) state = sm2Next(state, false);
    expect(state.ease).toBe(MIN_EASE);
  });

  it("初期 ease は 2.5", () => {
    expect(INITIAL_EASE).toBe(2.5);
  });
});
