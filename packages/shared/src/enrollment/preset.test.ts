/**
 * 割当プリセットの入力バリデーション。
 *
 * Phase 3b で **適用** (計画・期限の展開・衝突ポリシー) は退役したので、 ここに残るのは
 * 定義の CRUD が使う `validatePresetInput` の検査だけ。
 */

import { describe, expect, it } from "vitest";

import { PRESET_DUE_OFFSET_MAX, PRESET_MAX_ITEMS, validatePresetInput } from "./preset.js";

describe("validatePresetInput", () => {
  const base = {
    name: " 新入社員パック ",
    description: "  ",
    items: [
      { stage_id: "c1", required: true, due_offset_days: 30 },
      { stage_id: "c2", required: false, due_offset_days: null },
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
    expect(result.value.items.map((i) => [i.stage_id, i.order])).toEqual([
      ["c2", 0],
      ["c1", 1],
    ]);
  });

  it("required は既定 true (明示的な false のみ任意)", () => {
    const result = validatePresetInput({ ...base, items: [{ stage_id: "c1" }] });
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
      items: [{ stage_id: "c1" }, { stage_id: "c1" }],
    });
    expect(result.ok).toBe(false);
  });

  it("上限件数を超えたら弾く", () => {
    const items = Array.from({ length: PRESET_MAX_ITEMS + 1 }, (_, i) => ({ stage_id: `c${i}` }));
    expect(validatePresetInput({ ...base, items }).ok).toBe(false);
  });

  it("オフセットが整数でない / 範囲外なら弾く", () => {
    expect(
      validatePresetInput({ ...base, items: [{ stage_id: "c1", due_offset_days: 1.5 }] }).ok,
    ).toBe(false);
    expect(
      validatePresetInput({
        ...base,
        items: [{ stage_id: "c1", due_offset_days: PRESET_DUE_OFFSET_MAX + 1 }],
      }).ok,
    ).toBe(false);
  });
});
