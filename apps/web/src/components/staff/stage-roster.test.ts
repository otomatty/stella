import { describe, expect, it } from "vitest";

import {
  composeRosterRows,
  exemptionControl,
  formatRosterChangeSummary,
  formatStageGrantSavedMessage,
  rosterChangeCount,
  rosterChangedLearnerCount,
  rosterDiff,
  setRosterAssigned,
  setRosterExempted,
  stageGrantRoleLabel,
  toggleVisibleAssignments,
  visibleAssignmentState,
  type RosterLocalFilter,
  type StageRosterPending,
  type StageRosterRow,
} from "./stage-roster";

function row(partial: Partial<StageRosterRow> & Pick<StageRosterRow, "id">): StageRosterRow {
  return {
    display_name: partial.id,
    email: null,
    selectable: true,
    assigned: false,
    exempted: false,
    unlocked_by_skill_check: false,
    prerequisites_cleared: false,
    prerequisite_status: "none",
    ...partial,
  };
}

const openFilter: RosterLocalFilter = {
  q: "",
  status: "all",
  prereq: "all",
};

describe("割り当てと免除の差分", () => {
  it("元の値に戻すと pending から消え、免除だけの変更は unexempt になる", () => {
    const ada = row({ id: "ada", assigned: true, exempted: true });
    let pending: StageRosterPending = new Map();
    pending = setRosterExempted(pending, ada, false);
    expect(rosterDiff(pending)).toEqual({ add: [], remove: [], exempt: [], unexempt: ["ada"] });
    pending = setRosterExempted(pending, ada, true);
    expect(pending.size).toBe(0);
    expect(formatRosterChangeSummary(rosterDiff(pending))).toBe("変更はありません");
  });

  it("割り当てを外すと免除も外れた扱いにし、unexempt には入れない", () => {
    const ada = row({ id: "ada", assigned: true, exempted: true });
    const pending = setRosterAssigned(new Map(), ada, false);
    expect(rosterDiff(pending)).toEqual({ add: [], remove: ["ada"], exempt: [], unexempt: [] });
    const again = setRosterAssigned(pending, ada, true);
    expect(again.size).toBe(0);
  });

  it("追加と免除は両方の差分になり、外すとどちらも残らない", () => {
    const ken = row({ id: "ken", display_name: "佐藤" });
    let pending = setRosterAssigned(new Map(), ken, true);
    pending = setRosterExempted(pending, ken, true);
    expect(rosterDiff(pending)).toEqual({
      add: ["ken"],
      remove: [],
      exempt: ["ken"],
      unexempt: [],
    });
    const diff = rosterDiff(pending);
    expect(rosterChangeCount(diff)).toBe(2);
    expect(rosterChangedLearnerCount(diff)).toBe(1);
    expect(formatRosterChangeSummary(diff)).toBe("変更 2 件: 追加 1 人 · 前提を免除 1 人");
    expect(setRosterAssigned(pending, ken, false).size).toBe(0);
  });

  it("2 人の追加と 1 人を外し、追加した 1 人を免除すると 4 件・3 人", () => {
    const added = row({ id: "added", display_name: "追加" });
    const also = row({ id: "also", display_name: "もう一人" });
    const removed = row({ id: "removed", display_name: "外す", assigned: true });
    let pending = setRosterAssigned(new Map(), added, true);
    pending = setRosterAssigned(pending, also, true);
    pending = setRosterAssigned(pending, removed, false);
    pending = setRosterExempted(pending, added, true);
    const diff = rosterDiff(pending);
    expect(diff).toEqual({
      add: ["added", "also"],
      remove: ["removed"],
      exempt: ["added"],
      unexempt: [],
    });
    expect(rosterChangeCount(diff)).toBe(4);
    expect(rosterChangedLearnerCount(diff)).toBe(3);
    expect(formatRosterChangeSummary(diff)).toBe(
      "変更 4 件: 追加 2 人 · 外す 1 人 · 前提を免除 1 人",
    );
  });

  it("無効で未割り当ての人は割り当てられず、割り当て済みなら外せる", () => {
    const disabled = row({ id: "old", selectable: false });
    expect(setRosterAssigned(new Map(), disabled, true).size).toBe(0);
    const assigned = row({ id: "old", selectable: false, assigned: true, exempted: true });
    expect(rosterDiff(setRosterAssigned(new Map(), assigned, false)).remove).toEqual(["old"]);
  });

  it("前提クリア済みと腕試しは免除を変えられない。未割り当てはスイッチを押せない", () => {
    const cleared = row({ id: "ada", assigned: true, prerequisites_cleared: true });
    const skill = row({
      id: "ken",
      assigned: true,
      unlocked_by_skill_check: true,
      prerequisites_cleared: false,
    });
    const open = row({ id: "sato" });
    expect(exemptionControl(cleared, true, false)).toEqual({
      kind: "text",
      label: "前提クリア済み",
    });
    expect(exemptionControl(skill, true, false)).toEqual({
      kind: "text",
      label: "腕試しで解放済み",
    });
    expect(exemptionControl(open, false, false)).toEqual({
      kind: "switch",
      checked: false,
      enabled: false,
    });
    expect(exemptionControl(open, true, true)).toEqual({
      kind: "switch",
      checked: true,
      enabled: true,
    });
    expect(setRosterExempted(new Map(), cleared, true).size).toBe(0);
    expect(setRosterExempted(new Map(), skill, true).size).toBe(0);
    expect(setRosterExempted(new Map(), open, true).size).toBe(0);
  });
});

describe("表示中の全員", () => {
  const rows = [
    row({ id: "a", display_name: "あ" }),
    row({ id: "b", display_name: "い", assigned: true }),
    row({ id: "c", display_name: "う", selectable: false }),
    row({ id: "d", display_name: "え", selectable: false, assigned: true }),
  ];

  it("押せる行が揃っていなければ割り当て、揃っていれば外す", () => {
    const assigned = toggleVisibleAssignments(new Map(), rows);
    expect(rosterDiff(assigned)).toEqual({
      add: ["a"],
      remove: [],
      exempt: [],
      unexempt: [],
    });
    expect(visibleAssignmentState(rows, assigned).checked).toBe(true);
    const cleared = toggleVisibleAssignments(assigned, rows);
    expect(rosterDiff(cleared)).toEqual({
      add: [],
      remove: ["b", "d"],
      exempt: [],
      unexempt: [],
    });
    expect(cleared.has("c")).toBe(false);
  });
});

describe("変更だけと免除タブ", () => {
  it("別ページの変更を名前順で並べ、検索は全角半角を無視する", () => {
    const ken = row({ id: "ken", display_name: "Ｋｅｎ", email: "ken@example.com" });
    const sato = row({ id: "sato", display_name: "佐藤", prerequisite_status: "doing" });
    let pending: StageRosterPending = new Map();
    pending = setRosterAssigned(pending, sato, true);
    pending = setRosterAssigned(pending, ken, true);
    const views = composeRosterRows({
      loaded: [],
      pending,
      changesOnly: true,
      assignedScope: false,
      filter: { ...openFilter, q: "  ｋｅｎ " },
    });
    expect(views.map((view) => view.id)).toEqual(["ken"]);
    expect(views[0]?.marks).toEqual(["追加"]);
    expect(pending.get("ken")?.row).toEqual(ken);
    expect(pending.get("sato")?.row.display_name).toBe("佐藤");
  });

  it("免除タブは割り当て済みだけを出し、今回割り当てた人を先頭に置く", () => {
    const fresh = row({ id: "fresh", display_name: "新規", prerequisite_status: "none" });
    const finished = row({
      id: "finished",
      display_name: "追加修了",
      prerequisite_status: "done",
    });
    const kept = row({
      id: "kept",
      display_name: "継続",
      assigned: true,
      prerequisite_status: "doing",
    });
    const dropped = row({ id: "drop", display_name: "外す", assigned: true });
    let pending: StageRosterPending = new Map();
    pending = setRosterAssigned(pending, fresh, true);
    pending = setRosterAssigned(pending, finished, true);
    pending = setRosterAssigned(pending, dropped, false);
    const views = composeRosterRows({
      loaded: [kept, dropped],
      pending,
      changesOnly: false,
      assignedScope: true,
      filter: { ...openFilter, status: "assigned", prereq: "not_done" },
    });
    expect(views.map((view) => view.id)).toEqual(["fresh", "kept"]);
    expect(views[0]?.assigned).toBe(true);
  });

  it("免除と前提の絞り込みは、いまの状態で手元の行に当てる", () => {
    const mine = row({
      id: "ada",
      display_name: "山田",
      prerequisite_status: "doing",
    });
    const other = row({
      id: "ken",
      display_name: "佐藤",
      prerequisite_status: "done",
    });
    let pending = setRosterAssigned(new Map(), mine, true);
    pending = setRosterExempted(pending, mine, true);
    pending = setRosterAssigned(pending, other, true);
    pending = setRosterExempted(pending, other, true);
    const views = composeRosterRows({
      loaded: [],
      pending,
      changesOnly: true,
      assignedScope: true,
      filter: { ...openFilter, status: "exempted", prereq: "not_done" },
    });
    expect(views.map((view) => view.id)).toEqual(["ada"]);
    expect(views[0]?.marks).toEqual(["追加", "免除"]);
  });
});

describe("保存の文言", () => {
  it("祖先が無ければステージ名だけ、名前が不明なら前の Extra ステージと書く", () => {
    expect(formatStageGrantSavedMessage("DevOps", [])).toBe("「DevOps」の割り当てを保存しました。");
    expect(
      formatStageGrantSavedMessage(
        "Kubernetes",
        [
          { stage_id: "net", profile_ids: ["a", "a", "b"] },
          { stage_id: "missing", profile_ids: [] },
          { stage_id: "py", profile_ids: ["c"] },
        ],
        (id) => (id === "net" ? "ネットワーク" : undefined),
      ),
    ).toBe(
      "「Kubernetes」の割り当てを保存しました。前のステージ「ネットワーク」にも 2 人を割り当てました。前のステージ「前の Extra ステージ」にも 1 人を割り当てました。",
    );
  });
});

describe("stageGrantRoleLabel", () => {
  it.each([
    ["admin", "管理者"],
    ["platform_admin", "管理者"],
    ["student", null],
    [undefined, null],
    ["unknown", null],
  ])("%s のバッジは %s", (role, label) => {
    expect(stageGrantRoleLabel(role)).toBe(label);
  });
});
