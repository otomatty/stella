import { describe, expect, it } from "vitest";
import {
  extraStageAncestors,
  groupDueDate,
  groupDueValue,
  type GroupStageNode,
} from "./admin-group-stages";

describe("extraStageAncestors", () => {
  it("Basic を通って Extra の親だけを最上位から含める", () => {
    const root = { id: "root", audience: "granted" } as const;
    const basic = { id: "basic", parent_id: root.id };
    const middle = { id: "middle", parent_id: basic.id, audience: "granted" } as const;
    const child = { id: "child", parent_id: middle.id, audience: "granted" } as const;
    const nodes = new Map<string, GroupStageNode>(
      [root, basic, middle, child].map((stage) => [stage.id, stage]),
    );
    expect(extraStageAncestors(child, nodes)).toEqual([root, middle]);
    expect(extraStageAncestors(root, nodes)).toEqual([]);
  });

  it("循環や見つからない親で止まる", () => {
    const first = { id: "first", parent_id: "second", audience: "granted" } as const;
    const second = { id: "second", parent_id: first.id, audience: "granted" } as const;
    expect(
      extraStageAncestors(first, new Map<string, GroupStageNode>([[second.id, second]])),
    ).toEqual([second]);
    expect(extraStageAncestors(first, new Map())).toEqual([]);
  });
});

describe("group due dates", () => {
  it("UTC の日時を日本時間の日付に変換する", () => {
    expect(groupDueDate("2026-11-24T15:00:00.000Z")).toBe("2026-11-25");
    expect(groupDueDate("2026-11-25T14:59:59.000Z")).toBe("2026-11-25");
    expect(groupDueDate(null)).toBe("");
  });

  it("新しい日付は日付だけを送り、変更のない時刻は保持し、空欄で解除する", () => {
    const original = "2026-11-24T15:00:00.000Z";
    expect(groupDueValue("2026-11-25", original)).toBe(original);
    expect(groupDueValue("2026-11-26", original)).toBe("2026-11-26");
    expect(groupDueValue("2026-11-26", null)).toBe("2026-11-26");
    expect(groupDueValue("", original)).toBeNull();
  });
});
