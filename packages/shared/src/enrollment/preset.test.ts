import { describe, expect, it } from "vitest";

import {
  PRESET_DUE_OFFSET_MAX,
  PRESET_MAX_ITEMS,
  dueDateFromOffset,
  dueOffsetLabel,
  isDateKey,
  isPresetConflictPolicy,
  planPresetApply,
  validatePresetInput,
  type PresetItemInput,
} from "./preset.js";

describe("dueDateFromOffset", () => {
  it("基準日 + 日数を UTC 0 時の ISO で返す", () => {
    expect(dueDateFromOffset("2026-04-01", 30)).toBe("2026-05-01T00:00:00.000Z");
  });

  it("0 日は基準日そのもの", () => {
    expect(dueDateFromOffset("2026-04-01", 0)).toBe("2026-04-01T00:00:00.000Z");
  });

  it("負のオフセットは基準日より前になる", () => {
    expect(dueDateFromOffset("2026-04-01", -1)).toBe("2026-03-31T00:00:00.000Z");
  });

  it("月またぎ / うるう年をカレンダー通りに跨ぐ", () => {
    expect(dueDateFromOffset("2028-02-28", 1)).toBe("2028-02-29T00:00:00.000Z");
    expect(dueDateFromOffset("2026-12-31", 1)).toBe("2027-01-01T00:00:00.000Z");
  });

  it("null は期限なし", () => {
    expect(dueDateFromOffset("2026-04-01", null)).toBeNull();
  });

  it("基準日の形式が不正なら投げる", () => {
    expect(() => dueDateFromOffset("2026/04/01", 1)).toThrow();
  });
});

describe("dueOffsetLabel", () => {
  it("期限なし / 当日 / 前後を出し分ける", () => {
    expect(dueOffsetLabel(null)).toBe("期限なし");
    expect(dueOffsetLabel(0)).toBe("基準日当日");
    expect(dueOffsetLabel(30)).toBe("基準日から 30 日後");
    expect(dueOffsetLabel(-3)).toBe("基準日から 3 日前");
  });
});

describe("isPresetConflictPolicy", () => {
  it("既知の値だけ通す", () => {
    expect(isPresetConflictPolicy("skip")).toBe(true);
    expect(isPresetConflictPolicy("overwrite")).toBe(true);
    expect(isPresetConflictPolicy("merge")).toBe(false);
    expect(isPresetConflictPolicy(undefined)).toBe(false);
  });
});

describe("validatePresetInput", () => {
  const base = {
    name: " 新入社員パック ",
    description: "  ",
    items: [
      { course_id: "c1", required: true, due_offset_days: 30 },
      { course_id: "c2", required: false, due_offset_days: null },
    ],
  };

  it("name を trim し、 空の説明は null にする", () => {
    const result = validatePresetInput(base);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.name).toBe("新入社員パック");
    expect(result.value.description).toBeNull();
  });

  it("order は配列の並び順で振り直す", () => {
    const result = validatePresetInput({ ...base, items: [...base.items].reverse() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items.map((i) => [i.course_id, i.order])).toEqual([
      ["c2", 0],
      ["c1", 1],
    ]);
  });

  it("required は既定 true (明示的な false のみ任意)", () => {
    const result = validatePresetInput({ ...base, items: [{ course_id: "c1" }] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items[0]?.required).toBe(true);
    expect(result.value.items[0]?.due_offset_days).toBeNull();
  });

  it("名前が空なら弾く", () => {
    expect(validatePresetInput({ ...base, name: "   " }).ok).toBe(false);
  });

  it("教材が 0 件なら弾く", () => {
    expect(validatePresetInput({ ...base, items: [] }).ok).toBe(false);
  });

  it("教材が重複していたら弾く", () => {
    const result = validatePresetInput({
      ...base,
      items: [{ course_id: "c1" }, { course_id: "c1" }],
    });
    expect(result.ok).toBe(false);
  });

  it("上限件数を超えたら弾く", () => {
    const items = Array.from({ length: PRESET_MAX_ITEMS + 1 }, (_, i) => ({ course_id: `c${i}` }));
    expect(validatePresetInput({ ...base, items }).ok).toBe(false);
  });

  it("オフセットが整数でない / 範囲外なら弾く", () => {
    expect(
      validatePresetInput({ ...base, items: [{ course_id: "c1", due_offset_days: 1.5 }] }).ok,
    ).toBe(false);
    expect(
      validatePresetInput({
        ...base,
        items: [{ course_id: "c1", due_offset_days: PRESET_DUE_OFFSET_MAX + 1 }],
      }).ok,
    ).toBe(false);
  });
});

describe("planPresetApply", () => {
  const items: PresetItemInput[] = [
    { course_id: "c1", required: true, due_offset_days: 30, order: 0 },
    { course_id: "c2", required: false, due_offset_days: null, order: 1 },
  ];
  // u1 は c1 に既に登録済み。 u2 は未登録。
  const existing = new Set(["u1:c1"]);
  const has = (userId: string, courseId: string) => existing.has(`${userId}:${courseId}`);

  it("skip では既存を触らず未割当だけ追加する", () => {
    const plan = planPresetApply(items, ["u1", "u2"], "2026-04-01", "skip", has);
    expect(plan.assigned).toBe(3);
    expect(plan.skipped).toBe(1);
    expect(plan.overwritten).toBe(0);
    expect(plan.rows).toHaveLength(3);
    expect(plan.rows.every((r) => !r.overwrite)).toBe(true);
    expect(plan.rows.some((r) => r.user_id === "u1" && r.course_id === "c1")).toBe(false);
  });

  it("overwrite では既存も対象にする", () => {
    const plan = planPresetApply(items, ["u1", "u2"], "2026-04-01", "overwrite", has);
    expect(plan.assigned).toBe(3);
    expect(plan.overwritten).toBe(1);
    expect(plan.skipped).toBe(0);
    expect(plan.rows).toHaveLength(4);
  });

  it("行ごとに項目の期限 / 必須が乗る", () => {
    const plan = planPresetApply(items, ["u2"], "2026-04-01", "skip", has);
    const c1 = plan.rows.find((r) => r.course_id === "c1");
    const c2 = plan.rows.find((r) => r.course_id === "c2");
    expect(c1?.due_at).toBe("2026-05-01T00:00:00.000Z");
    expect(c1?.required).toBe(true);
    expect(c2?.due_at).toBeNull();
    expect(c2?.required).toBe(false);
  });

  it("details は組の総数ぶん返る (プレビューと本適用で同じ数)", () => {
    const plan = planPresetApply(items, ["u1", "u2"], "2026-04-01", "skip", has);
    expect(plan.details).toHaveLength(4);
    expect(plan.assigned + plan.overwritten + plan.skipped).toBe(4);
  });
});

describe("isDateKey", () => {
  it("実在する暦日だけ通す", () => {
    expect(isDateKey("2026-04-01")).toBe(true);
    expect(isDateKey("2028-02-29")).toBe(true);
  });

  it("形式が違うものを弾く", () => {
    expect(isDateKey("2026/04/01")).toBe(false);
    expect(isDateKey("2026-4-1")).toBe(false);
    expect(isDateKey("")).toBe(false);
    expect(isDateKey(undefined)).toBe(false);
  });

  it("形式は合っていても実在しない日付は弾く", () => {
    // JS の Date は 2026-02-30 を NaN にせず 3/2 へ繰り上げるため、 形式チェックだけでは
    // 「受け付けたのに期限が静かにずれる」 が起きる。
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("2026-04-31")).toBe(false);
    expect(isDateKey("2026-02-29")).toBe(false);
    expect(isDateKey("2026-13-01")).toBe(false);
    expect(isDateKey("2026-00-10")).toBe(false);
  });

  it("実在しない基準日で期限を計算しようとすると投げる", () => {
    expect(() => dueDateFromOffset("2026-02-30", 1)).toThrow();
  });
});
