import { describe, expect, it } from "vitest";
import { studyDateStartMs } from "../study/activity.js";
import {
  assistDecidingPass,
  nextVariantSlot,
  pickVariant,
  variantKindProblem,
  type VariantSlotRecord,
  type VariantStockItem,
  type VariantStockSummary,
  variantStockAlert,
} from "./variants.js";

/** 日本時間のその日の正午 (UNIX ミリ秒)。 */
const at = (date: string) => studyDateStartMs(date) + 12 * 3_600_000;
const B = { hasRegularAssessmentB: false };

function passed(
  step: number,
  purpose: VariantSlotRecord["purpose"],
  passedOn: string,
  assisted: boolean,
  anchorOn = "2026-10-01",
): VariantSlotRecord {
  return {
    step,
    purpose,
    status: "passed",
    anchorAt: at(anchorOn),
    dueOn: passedOn,
    passedAt: at(passedOn),
    passedAssisted: assisted,
  };
}

describe("類題を出す時期", () => {
  it("起点に達していなければ積まない", () => {
    expect(nextVariantSlot([], null, B)).toBeNull();
  });

  it("自力で合格したパターンは約 3 日後・1 週間後・3 週間後 (起点から数える)", () => {
    const completion = { at: at("2026-10-01"), assisted: false };
    expect(nextVariantSlot([], completion, B)).toEqual({
      step: 1,
      purpose: "day3",
      anchorAt: at("2026-10-01"),
      dueOn: "2026-10-04",
    });
    expect(nextVariantSlot([passed(1, "day3", "2026-10-04", false)], completion, B)).toMatchObject({
      step: 2,
      purpose: "week1",
      dueOn: "2026-10-08",
    });
    expect(
      nextVariantSlot(
        [passed(1, "day3", "2026-10-04", false), passed(2, "week1", "2026-10-08", false)],
        completion,
        B,
      ),
    ).toMatchObject({ step: 3, purpose: "week3", dueOn: "2026-10-22" });
    expect(
      nextVariantSlot(
        [
          passed(1, "day3", "2026-10-04", false),
          passed(2, "week1", "2026-10-08", false),
          passed(3, "week3", "2026-10-22", false),
        ],
        completion,
        B,
      ),
    ).toBeNull();
  });

  it("通常の確認Bがあるパターンは 1 週間後を確認Bに任せ、3 週間後へ進む", () => {
    expect(
      nextVariantSlot([passed(1, "day3", "2026-10-04", false)], null, {
        hasRegularAssessmentB: true,
      }),
    ).toMatchObject({ purpose: "week3", dueOn: "2026-10-22" });
  });

  it("前の類題を遅れて解いたら、次との間を設計どおり空ける", () => {
    // 3 日後の類題を 10/9 に解いた → 1 週間後は起点の 7 日後 (10/8) ではなく 10/9 + 4 日。
    expect(nextVariantSlot([passed(1, "day3", "2026-10-09", false)], null, B)).toMatchObject({
      purpose: "week1",
      dueOn: "2026-10-13",
    });
  });

  it("支援付きでしか解けなかったパターンは、翌日から補習の小問題 3 問 → 翌日以降に未見の問題", () => {
    const completion = { at: at("2026-10-01"), assisted: true };
    expect(nextVariantSlot([], completion, B)).toMatchObject({
      step: 1,
      purpose: "remedial",
      dueOn: "2026-10-02",
    });
    const r1 = passed(1, "remedial", "2026-10-02", true);
    const r2 = passed(2, "remedial", "2026-10-03", false);
    const r3 = passed(3, "remedial", "2026-10-05", true);
    expect(nextVariantSlot([r1], completion, B)).toMatchObject({
      purpose: "remedial",
      dueOn: "2026-10-03",
    });
    expect(nextVariantSlot([r1, r2], completion, B)).toMatchObject({ purpose: "remedial" });
    expect(nextVariantSlot([r1, r2, r3], completion, B)).toMatchObject({
      step: 4,
      purpose: "unseen",
      dueOn: "2026-10-06",
    });
    // 未見の問題に自力で合格したら、そこを起点に自力の間隔へ戻る。
    expect(
      nextVariantSlot([r1, r2, r3, passed(4, "unseen", "2026-10-06", false)], completion, B),
    ).toMatchObject({
      step: 5,
      purpose: "day3",
      anchorAt: at("2026-10-06"),
      dueOn: "2026-10-09",
    });
    // 未見の問題も支援付きなら補習からやり直す。
    expect(
      nextVariantSlot([r1, r2, r3, passed(4, "unseen", "2026-10-06", true)], completion, B),
    ).toMatchObject({ step: 5, purpose: "remedial", dueOn: "2026-10-07" });
  });

  it("時間を空けた類題が支援付きの合格なら補習へ", () => {
    expect(nextVariantSlot([passed(1, "week1", "2026-10-08", true)], null, B)).toMatchObject({
      purpose: "remedial",
      dueOn: "2026-10-09",
    });
  });

  it("前の出題に合格するまで次を積まない。教材から外れた出題は同じ目的で出し直す", () => {
    const issued: VariantSlotRecord = {
      ...passed(1, "day3", "2026-10-04", false),
      status: "issued",
      passedAt: null,
      passedAssisted: null,
    };
    expect(nextVariantSlot([issued], null, B)).toBeNull();
    expect(nextVariantSlot([{ ...issued, status: "out-of-stock" }], null, B)).toBeNull();
    expect(nextVariantSlot([{ ...issued, status: "withdrawn" }], null, B)).toEqual({
      step: 2,
      purpose: "day3",
      anchorAt: issued.anchorAt,
      dueOn: issued.dueOn,
    });
  });

  it("教材から外れた補習は補習の数に入れない", () => {
    const withdrawn: VariantSlotRecord = {
      ...passed(2, "remedial", "2026-10-03", false),
      status: "withdrawn",
      passedAt: null,
    };
    expect(
      nextVariantSlot(
        [
          passed(1, "remedial", "2026-10-02", false),
          withdrawn,
          passed(3, "remedial", "2026-10-04", false),
        ],
        null,
        B,
      ),
    ).toMatchObject({ step: 4, purpose: "remedial" });
  });
});

describe("自力か支援付きかを決める課題", () => {
  it("解いた順ではなく、種別がいちばん難しい課題で決める", () => {
    // 自力課題を先に解き、易しい基礎課題を最後に解いても、自力課題で決める。
    expect(
      assistDecidingPass([
        { id: "independent", kind: "independent", passedAt: at("2026-10-01") },
        { id: "basic", kind: "basic", passedAt: at("2026-10-03") },
      ])?.id,
    ).toBe("independent");
    expect(
      assistDecidingPass([
        { id: "basic", kind: "basic", passedAt: at("2026-10-01") },
        { id: "connection", kind: "connection", passedAt: at("2026-10-02") },
        { id: "a", kind: "assessment-a", passedAt: at("2026-10-01") },
        { id: "debug", kind: "debug", passedAt: at("2026-10-05") },
      ])?.id,
    ).toBe("a");
  });
  it("同じ種別なら最後に合格した課題で決める (基礎だけのパターンは今までと同じ)", () => {
    expect(
      assistDecidingPass([
        { id: "basic-1", kind: "basic", passedAt: at("2026-10-01") },
        { id: "basic-3", kind: "basic", passedAt: at("2026-10-03") },
        { id: "basic-2", kind: "basic", passedAt: at("2026-10-02") },
      ])?.id,
    ).toBe("basic-3");
  });
  it("知らない種別はいちばん下に置き、合格が無ければ null", () => {
    expect(
      assistDecidingPass([
        { id: "unknown", kind: "future-kind", passedAt: at("2026-10-05") },
        { id: "basic", kind: "basic", passedAt: at("2026-10-01") },
      ])?.id,
    ).toBe("basic");
    expect(assistDecidingPass([])).toBeNull();
  });
});

describe("在庫から類題を選ぶ", () => {
  const stock: VariantStockItem[] = [
    { id: "c/u/v-independent", kind: "independent", order: 2 },
    { id: "c/u/v-b", kind: "assessment-b", order: 3 },
    { id: "c/u/v-basic-2", kind: "basic", order: 5 },
    { id: "c/u/v-basic-1", kind: "basic", order: 4 },
  ];
  it("目的に合う種別を優先し、出したことのある類題は選ばない", () => {
    expect(pickVariant("week1", stock, new Set())?.id).toBe("c/u/v-b");
    expect(pickVariant("day3", stock, new Set())?.id).toBe("c/u/v-independent");
    expect(pickVariant("remedial", stock, new Set())?.id).toBe("c/u/v-basic-1");
    expect(pickVariant("remedial", stock, new Set(["c/u/v-basic-1"]))?.id).toBe("c/u/v-basic-2");
    expect(pickVariant("week1", stock, new Set(["c/u/v-b"]))?.id).toBe("c/u/v-independent");
  });
  it("未見の類題が無ければ在庫切れ (null)", () => {
    expect(pickVariant("remedial", stock, new Set(["c/u/v-basic-1", "c/u/v-basic-2"]))).toBeNull();
    expect(pickVariant("unseen", [], new Set())).toBeNull();
  });
  it("統合は類題にできない", () => {
    expect(variantKindProblem("integration")).toMatch(/kind/);
    expect(variantKindProblem("basic")).toBeUndefined();
    expect(variantKindProblem("assessment-b")).toBeUndefined();
  });
});

describe("在庫の見立て", () => {
  const summary = (patch: Partial<VariantStockSummary> = {}): VariantStockSummary => ({
    pattern: "p",
    practiceTitles: [],
    stageTitles: [],
    stock: { remedial: 3, check: 3 },
    learners: 1,
    fewestUnseen: { remedial: 3, check: 2 },
    waiting: [],
    ...patch,
  });

  it("足りていれば ok", () => {
    expect(variantStockAlert(summary())).toEqual({ level: "ok", notes: [] });
    // 受講者がまだいなければ、残りは見ない。
    expect(variantStockAlert(summary({ learners: 0, fewestUnseen: null })).level).toBe("ok");
  });

  it("在庫切れで待っている受講者がいれば danger", () => {
    const alert = variantStockAlert(
      summary({
        stock: { remedial: 3, check: 0 },
        waiting: [{ userId: "u", name: "受講者", purpose: "day3", dueOn: "2026-10-04" }],
      }),
    );
    expect(alert.level).toBe("danger");
    expect(alert.notes[0]).toContain("1 人");
  });

  it("確認用が無い・補習が 3 問に足りない・未見が 1 問以下の受講者がいれば warning", () => {
    expect(variantStockAlert(summary({ stock: { remedial: 3, check: 0 } })).notes).toEqual([
      expect.stringContaining("確認用"),
    ]);
    expect(variantStockAlert(summary({ stock: { remedial: 2, check: 3 } })).notes).toEqual([
      expect.stringContaining("補習の小問題が 3 問"),
    ]);
    const low = variantStockAlert(summary({ fewestUnseen: { remedial: 3, check: 1 } }));
    expect(low.level).toBe("warning");
    expect(low.notes).toEqual([expect.stringContaining("残り 1 問")]);
  });
});
