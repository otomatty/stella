import { describe, expect, it } from "vitest";

import { deriveQuestionPrepStatus, prepRate } from "./progress";

describe("deriveQuestionPrepStatus", () => {
  it("confident は個別の型の有無より優先される", () => {
    expect(
      deriveQuestionPrepStatus({ hasPersonalTemplate: true, progressStatus: "confident" }),
    ).toBe("confident");
    expect(
      deriveQuestionPrepStatus({ hasPersonalTemplate: false, progressStatus: "confident" }),
    ).toBe("confident");
  });

  it("個別の型があれば read でも drafted になる", () => {
    expect(deriveQuestionPrepStatus({ hasPersonalTemplate: true, progressStatus: "read" })).toBe(
      "drafted",
    );
    expect(deriveQuestionPrepStatus({ hasPersonalTemplate: true, progressStatus: null })).toBe(
      "drafted",
    );
  });

  it("進捗行のみなら read、 何もなければ none", () => {
    expect(deriveQuestionPrepStatus({ hasPersonalTemplate: false, progressStatus: "read" })).toBe(
      "read",
    );
    expect(deriveQuestionPrepStatus({ hasPersonalTemplate: false, progressStatus: null })).toBe(
      "none",
    );
    expect(
      deriveQuestionPrepStatus({ hasPersonalTemplate: false, progressStatus: undefined }),
    ).toBe("none");
  });
});

describe("prepRate", () => {
  it("A 必修 (逆質問除く) だけを分母にする", () => {
    const r = prepRate([
      { freq: "A", is_reverse: false, status: "confident" },
      { freq: "A", is_reverse: false, status: "drafted" },
      { freq: "A", is_reverse: false, status: "none" },
      { freq: "A", is_reverse: true, status: "none" }, // 逆質問は除外
      { freq: "B", is_reverse: false, status: "confident" }, // B は除外
    ]);
    expect(r.total).toBe(3);
    expect(r.confident).toBe(1);
    expect(r.drafted).toBe(1);
    expect(r.percent).toBe(33);
  });

  it("read を未着手に混ぜず 4 状態を別々に数える", () => {
    const r = prepRate([
      { freq: "A", is_reverse: false, status: "confident" },
      { freq: "A", is_reverse: false, status: "drafted" },
      { freq: "A", is_reverse: false, status: "read" },
      { freq: "A", is_reverse: false, status: "read" },
      { freq: "A", is_reverse: false, status: "none" },
    ]);
    expect(r.total).toBe(5);
    expect(r.confident).toBe(1);
    expect(r.drafted).toBe(1);
    expect(r.read).toBe(2);
    expect(r.none).toBe(1);
    // 内訳の合計は total に一致する (引き算での導出が不要)
    expect(r.confident + r.drafted + r.read + r.none).toBe(r.total);
  });

  it("対象 0 問なら percent 0 (ゼロ除算しない)", () => {
    expect(prepRate([]).percent).toBe(0);
  });
});
