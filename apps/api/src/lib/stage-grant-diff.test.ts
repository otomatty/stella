import { describe, expect, it } from "vitest";

import {
  ancestorGrantRows,
  assignmentAfterDiff,
  groupAncestorGrants,
  parseStageGrantDiff,
  prepareStageGrantDiff,
} from "./stage-grant-diff.js";

const students = new Map([
  ["ada", { role: "student", disabled: false }],
  ["ken", { role: "student", disabled: false }],
  ["old", { role: "student", disabled: true }],
  ["teacher", { role: "admin", disabled: false }],
]);

describe("parseStageGrantDiff", () => {
  it("空白と重複を除き、空なら拒否する", () => {
    const parsed = parseStageGrantDiff({ add: [" ada ", "", "ada"], remove: ["ken"] });
    expect(parsed.ok && parsed.value).toEqual({
      add: ["ada"],
      remove: ["ken"],
      exempt: [],
      unexempt: [],
    });
    expect(parseStageGrantDiff({}).ok).toBe(false);
    expect(parseStageGrantDiff({ add: [] }).ok).toBe(false);
  });

  it("追加と削除、免除とその解除が重なれば拒否する", () => {
    expect(parseStageGrantDiff({ add: ["ada"], remove: ["ada"] }).ok).toBe(false);
    expect(parseStageGrantDiff({ exempt: ["ada"], unexempt: ["ada"] }).ok).toBe(false);
  });

  it("文字列の配列でなければ拒否する", () => {
    expect(parseStageGrantDiff({ add: "ada" }).ok).toBe(false);
    expect(parseStageGrantDiff(null).ok).toBe(false);
  });
});

describe("prepareStageGrantDiff", () => {
  it("存在しない人・無効な人の追加を拒否し、講師の追加と割当済みの免除を受け付ける", () => {
    expect(
      prepareStageGrantDiff(
        { add: ["missing"], remove: [], exempt: [], unexempt: [] },
        students,
        new Set(),
        new Set(),
      ).ok,
    ).toBe(false);
    expect(
      prepareStageGrantDiff(
        { add: ["teacher"], remove: [], exempt: [], unexempt: [] },
        students,
        new Set(),
        new Set(),
      ).ok,
    ).toBe(true);
    expect(
      prepareStageGrantDiff(
        { add: ["old"], remove: [], exempt: [], unexempt: [] },
        students,
        new Set(),
        new Set(),
      ).ok,
    ).toBe(false);
    expect(
      prepareStageGrantDiff(
        { add: [], remove: [], exempt: ["teacher"], unexempt: [] },
        students,
        new Set(["teacher"]),
        new Set(),
      ).ok,
    ).toBe(true);
  });

  it("保存後に割り当てが無い人の免除は拒否する", () => {
    const result = prepareStageGrantDiff(
      { add: [], remove: ["ada"], exempt: ["ada"], unexempt: [] },
      students,
      new Set(["ada"]),
      new Set(),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("前提を免除できるのは、割り当てるユーザーだけです");
  });

  it("新しい割り当てと免除を足し、既にある割り当てと腕試しは書き直さない", () => {
    const result = prepareStageGrantDiff(
      { add: ["ada", "ken"], remove: ["old"], exempt: ["ken", "ada"], unexempt: ["old"] },
      students,
      new Set(["ada", "old"]),
      new Set(["ada"]),
    );
    expect(result.ok && result.value).toEqual({
      added: ["ken"],
      removed: ["old"],
      exempted: ["ken"],
      unexempted: ["old"],
      deleteStaffIds: ["old"],
    });
  });

  it("外した人の staff 免除も消す対象に入れる", () => {
    const result = prepareStageGrantDiff(
      { add: [], remove: ["ada"], exempt: [], unexempt: [] },
      students,
      new Set(["ada"]),
      new Set(),
    );
    expect(result.ok && result.value.deleteStaffIds).toEqual(["ada"]);
    if (!result.ok) return;
    expect(assignmentAfterDiff(new Set(["ada"]), new Set(["ada"]), result.value)).toEqual({
      assigned: new Set(),
      staffUnlocks: new Set(),
    });
  });
});

describe("ancestorGrantRows", () => {
  it("既にある祖先の割り当ては足さない", () => {
    expect(ancestorGrantRows(["mid", "root"], ["ada"], new Set(["mid\0ada"]))).toEqual([
      { stageId: "root", profileId: "ada" },
    ]);
    expect(groupAncestorGrants([{ stageId: "root", profileId: "ada" }])).toEqual([
      { stage_id: "root", profile_ids: ["ada"] },
    ]);
  });
});
