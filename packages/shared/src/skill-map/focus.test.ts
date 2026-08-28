import { describe, expect, it } from "vitest";

import { computeFocusBonus, focusBonusOf, type FocusCompletion } from "./focus.js";

const TODAY = "2026-08-27";

/** `today` から `back` 日前の `YYYY-MM-DD`。 */
function day(back: number): string {
  const ms = Date.UTC(2026, 7, 27) - back * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

function completions(...rows: [back: number, stageId: string][]): FocusCompletion[] {
  return rows.map(([back, stageId]) => ({ date: day(back), stageId }));
}

describe("focusBonusOf", () => {
  it("1 日以下は倍率なし。次の段を案内する", () => {
    const bonus = focusBonusOf(1);
    expect(bonus.multiplier).toBe(1);
    expect(bonus.nextTierDays).toBe(2);
    expect(bonus.nextMultiplier).toBe(1.25);
  });

  it("2 日以上で ×1.25、5 日以上で ×1.5", () => {
    expect(focusBonusOf(2).multiplier).toBe(1.25);
    expect(focusBonusOf(4).multiplier).toBe(1.25);
    expect(focusBonusOf(5).multiplier).toBe(1.5);
    expect(focusBonusOf(30).multiplier).toBe(1.5);
  });

  it("最上段では次の段を案内しない", () => {
    expect(focusBonusOf(5).nextTierDays).toBeNull();
    expect(focusBonusOf(5).nextMultiplier).toBeNull();
  });
});

describe("computeFocusBonus", () => {
  it("アクティブステージが無ければボーナス無し", () => {
    const bonus = computeFocusBonus(completions([0, "s1"], [1, "s1"]), null, TODAY);
    expect(bonus.streakDays).toBe(0);
    expect(bonus.multiplier).toBe(1);
  });

  it("アクティブステージだけを完了した日を遡って数える", () => {
    const bonus = computeFocusBonus(completions([0, "s1"], [1, "s1"], [2, "s1"]), "s1", TODAY);
    expect(bonus.streakDays).toBe(3);
    expect(bonus.multiplier).toBe(1.25);
  });

  it("他ステージの完了が混ざった日で途切れる", () => {
    const bonus = computeFocusBonus(
      completions([0, "s1"], [1, "s1"], [1, "s2"], [2, "s1"]),
      "s1",
      TODAY,
    );
    expect(bonus.streakDays).toBe(1);
  });

  it("完了が 1 件も無い日で途切れる", () => {
    // 昨日 (back=1) に完了が無い。
    const bonus = computeFocusBonus(completions([0, "s1"], [2, "s1"], [3, "s1"]), "s1", TODAY);
    expect(bonus.streakDays).toBe(1);
  });

  it("今日まだ完了していなくても、昨日までの連続は保たれる", () => {
    const bonus = computeFocusBonus(
      completions([1, "s1"], [2, "s1"], [3, "s1"], [4, "s1"], [5, "s1"]),
      "s1",
      TODAY,
    );
    expect(bonus.streakDays).toBe(5);
    expect(bonus.multiplier).toBe(1.5);
  });

  it("昨日も完了が無ければ 0 (今日と昨日が空)", () => {
    const bonus = computeFocusBonus(completions([2, "s1"], [3, "s1"]), "s1", TODAY);
    expect(bonus.streakDays).toBe(0);
    expect(bonus.multiplier).toBe(1);
  });

  it("今日に他ステージの完了が 1 件混ざるだけで 0 に落ちる (崖の仕様)", () => {
    // 昨日まで 4 日続いていても、今日ほかの星を 1 本進めた時点でその日は「集中して
    // いない日」になり、起点の今日で止まるので連続は 0。段が 1 つ落ちるのではなく
    // 0 まで落ちるのは意図した崖 — 表示専用の係数なので失うものは無いが、
    // 「1 本の寄り道でボーナスが消える」ことをここで固定しておく。
    const bonus = computeFocusBonus(
      completions([0, "s1"], [0, "s2"], [1, "s1"], [2, "s1"], [3, "s1"], [4, "s1"]),
      "s1",
      TODAY,
    );
    expect(bonus.streakDays).toBe(0);
    expect(bonus.multiplier).toBe(1);
  });

  it("履歴が空でも落ちない", () => {
    expect(computeFocusBonus([], "s1", TODAY).streakDays).toBe(0);
  });

  it("アクティブ以外の星だけを進めた日は数えない", () => {
    const bonus = computeFocusBonus(completions([0, "s2"], [1, "s2"]), "s1", TODAY);
    expect(bonus.streakDays).toBe(0);
  });
});
