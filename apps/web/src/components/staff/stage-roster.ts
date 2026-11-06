/**
 * 受講者の割り当て一覧で、サーバーの行に未保存の変更を重ねる。
 *
 * ページを移動しても変更は残す。割り当てを外した人の免除は、差分の unexempt には
 * 入れない（サーバーの remove が staff の免除を消す）。
 */

export interface StageRosterRow {
  id: string;
  display_name: string;
  email: string | null;
  selectable: boolean;
  instructor: { id: string; display_name: string } | null;
  assigned: boolean;
  exempted: boolean;
  unlocked_by_skill_check: boolean;
  prerequisites_cleared: boolean;
  prerequisite_status: "done" | "doing" | "none";
}

export interface StageRosterChange {
  assigned?: boolean;
  exempted?: boolean;
}

/** 未保存の変更と、変更した時点のサーバー上の行。 */
export interface StageRosterPendingEntry {
  row: StageRosterRow;
  change: StageRosterChange;
}

export type StageRosterPending = Map<string, StageRosterPendingEntry>;

export type RosterMark = "追加" | "外す" | "免除" | "免除を外す";

export type ExemptionControl =
  | { kind: "text"; label: "前提クリア済み" | "腕試しで解放済み" }
  | { kind: "switch"; checked: boolean; enabled: boolean };

export interface StageRosterView {
  id: string;
  /** 差分の基準になる、サーバー上の行。 */
  baseline: StageRosterRow;
  assigned: boolean;
  exempted: boolean;
  marks: RosterMark[];
  canAssign: boolean;
  exemption: ExemptionControl;
}

export interface StageRosterDiff {
  add: string[];
  remove: string[];
  exempt: string[];
  unexempt: string[];
}

export interface RosterLocalFilter {
  q: string;
  status: "all" | "assigned" | "unassigned" | "exempted";
  /** `all` / `mine` / `none` / 講師の id。 */
  instructor: string;
  prereq: "all" | "done" | "doing" | "none" | "not_done";
}

export function prerequisiteStatusLabel(
  status: StageRosterRow["prerequisite_status"],
): "修了" | "受講中" | "未着手" {
  if (status === "done") return "修了";
  if (status === "doing") return "受講中";
  return "未着手";
}

/** サーバーの行に未保存の変更を重ねる。割り当てが無い人の免除は外れた扱い。 */
export function effectiveRoster(
  row: Pick<StageRosterRow, "assigned" | "exempted">,
  change: StageRosterChange | undefined,
): { assigned: boolean; exempted: boolean } {
  const assigned = change?.assigned ?? row.assigned;
  return { assigned, exempted: assigned ? (change?.exempted ?? row.exempted) : false };
}

export function rosterMarks(
  row: Pick<StageRosterRow, "assigned" | "exempted">,
  change: StageRosterChange | undefined,
): RosterMark[] {
  const next = effectiveRoster(row, change);
  const marks: RosterMark[] = [];
  if (next.assigned && !row.assigned) marks.push("追加");
  if (!next.assigned && row.assigned) marks.push("外す");
  if (next.assigned && next.exempted && !row.exempted) marks.push("免除");
  if (next.assigned && !next.exempted && row.exempted) marks.push("免除を外す");
  return marks;
}

/** 前提クリア済み、腕試しで解放済みは操作しない。スイッチは割り当て済みのときだけ押せる。 */
export function exemptionControl(
  row: Pick<StageRosterRow, "prerequisites_cleared" | "unlocked_by_skill_check">,
  assigned: boolean,
  exempted: boolean,
): ExemptionControl {
  if (row.prerequisites_cleared) return { kind: "text", label: "前提クリア済み" };
  if (row.unlocked_by_skill_check) return { kind: "text", label: "腕試しで解放済み" };
  return { kind: "switch", checked: exempted, enabled: assigned };
}

/** 無効な受講者は、いま割り当て済みなら外すことだけできる。 */
export function canToggleAssignment(
  row: Pick<StageRosterRow, "selectable">,
  assigned: boolean,
): boolean {
  if (row.selectable) return true;
  return assigned;
}

function normalizeChange(row: StageRosterRow, change: StageRosterChange): StageRosterChange | null {
  const next: StageRosterChange = {};
  if (change.assigned !== undefined && change.assigned !== row.assigned) {
    next.assigned = change.assigned;
  }
  const assigned = next.assigned ?? row.assigned;
  if (assigned && change.exempted !== undefined && change.exempted !== row.exempted) {
    next.exempted = change.exempted;
  }
  if (next.assigned === undefined && next.exempted === undefined) return null;
  return next;
}

function writePending(
  pending: StageRosterPending,
  baseline: StageRosterRow,
  change: StageRosterChange | null,
): StageRosterPending {
  const next = new Map(pending);
  if (change === null) {
    next.delete(baseline.id);
    return next;
  }
  const stored = pending.get(baseline.id)?.row ?? baseline;
  next.set(baseline.id, { row: stored, change });
  return next;
}

export function setRosterAssigned(
  pending: StageRosterPending,
  baseline: StageRosterRow,
  assigned: boolean,
): StageRosterPending {
  const stored = pending.get(baseline.id)?.row ?? baseline;
  const current = pending.get(baseline.id)?.change;
  if (assigned && !canToggleAssignment(stored, effectiveRoster(stored, current).assigned)) {
    return pending;
  }
  return writePending(pending, stored, normalizeChange(stored, { ...current, assigned }));
}

export function setRosterExempted(
  pending: StageRosterPending,
  baseline: StageRosterRow,
  exempted: boolean,
): StageRosterPending {
  const stored = pending.get(baseline.id)?.row ?? baseline;
  const current = pending.get(baseline.id)?.change;
  const effective = effectiveRoster(stored, current);
  const control = exemptionControl(stored, effective.assigned, effective.exempted);
  if (control.kind !== "switch" || !control.enabled) return pending;
  return writePending(pending, stored, normalizeChange(stored, { ...current, exempted }));
}

export function visibleAssignmentState(
  rows: readonly StageRosterRow[],
  pending: StageRosterPending,
): { checked: boolean; disabled: boolean; visibleCount: number; pressableCount: number } {
  let pressableCount = 0;
  let assignedCount = 0;
  for (const row of rows) {
    const stored = pending.get(row.id)?.row ?? row;
    const effective = effectiveRoster(stored, pending.get(row.id)?.change);
    if (!canToggleAssignment(stored, effective.assigned)) continue;
    pressableCount += 1;
    if (effective.assigned) assignedCount += 1;
  }
  return {
    checked: pressableCount > 0 && assignedCount === pressableCount,
    disabled: pressableCount === 0,
    visibleCount: rows.length,
    pressableCount,
  };
}

/**
 * 表示中の押せる行がすべて割り当て済みなら外し、そうでなければ割り当てる。
 * 押せない行（無効で未割り当て）は変えない。
 */
export function toggleVisibleAssignments(
  pending: StageRosterPending,
  rows: readonly StageRosterRow[],
): StageRosterPending {
  const state = visibleAssignmentState(rows, pending);
  if (state.pressableCount === 0) return pending;
  const assign = !state.checked;
  let next = pending;
  for (const row of rows) {
    const stored = next.get(row.id)?.row ?? row;
    const effective = effectiveRoster(stored, next.get(row.id)?.change);
    if (!canToggleAssignment(stored, effective.assigned)) continue;
    if (effective.assigned === assign) continue;
    next = setRosterAssigned(next, stored, assign);
  }
  return next;
}

export function rosterDiff(pending: StageRosterPending): StageRosterDiff {
  const add: string[] = [];
  const remove: string[] = [];
  const exempt: string[] = [];
  const unexempt: string[] = [];
  const entries = [...pending.values()].sort((a, b) => a.row.id.localeCompare(b.row.id));
  for (const entry of entries) {
    const marks = rosterMarks(entry.row, entry.change);
    if (marks.includes("追加")) add.push(entry.row.id);
    if (marks.includes("外す")) remove.push(entry.row.id);
    if (marks.includes("免除")) exempt.push(entry.row.id);
    if (marks.includes("免除を外す")) unexempt.push(entry.row.id);
  }
  return { add, remove, exempt, unexempt };
}

/** 保存で送る差分の件数。追加・外す・前提を免除・免除を外すをそれぞれ数える。 */
export function rosterChangeCount(diff: StageRosterDiff): number {
  return diff.add.length + diff.remove.length + diff.exempt.length + diff.unexempt.length;
}

/** 変更した受講者の人数。同じ人への複数の操作は 1 人。 */
export function rosterChangedLearnerCount(diff: StageRosterDiff): number {
  return new Set([...diff.add, ...diff.remove, ...diff.exempt, ...diff.unexempt]).size;
}

/** 0 件の内訳は出さない。変更が無ければ「変更はありません」。 */
export function formatRosterChangeSummary(diff: StageRosterDiff): string {
  const parts: string[] = [];
  if (diff.add.length > 0) parts.push(`追加 ${diff.add.length} 人`);
  if (diff.remove.length > 0) parts.push(`外す ${diff.remove.length} 人`);
  if (diff.exempt.length > 0) parts.push(`前提を免除 ${diff.exempt.length} 人`);
  if (diff.unexempt.length > 0) parts.push(`免除を外す ${diff.unexempt.length} 人`);
  const count = rosterChangeCount(diff);
  if (count === 0) return "変更はありません";
  return `変更 ${count} 件: ${parts.join(" · ")}`;
}

export function formatStageGrantSavedMessage(
  stageTitle: string,
  ancestorGrants: readonly { stage_id: string; profile_ids: readonly string[] }[],
  stageTitleOf?: (stageId: string) => string | undefined,
): string {
  const head = `「${stageTitle}」の割り当てを保存しました。`;
  const idsByStage = new Map<string, Set<string>>();
  const order: string[] = [];
  for (const grant of ancestorGrants) {
    let ids = idsByStage.get(grant.stage_id);
    if (!ids) {
      ids = new Set();
      idsByStage.set(grant.stage_id, ids);
      order.push(grant.stage_id);
    }
    for (const id of grant.profile_ids) ids.add(id);
  }
  const extras: string[] = [];
  for (const stageId of order) {
    const count = idsByStage.get(stageId)?.size ?? 0;
    if (count === 0) continue;
    const name = stageTitleOf?.(stageId) ?? "前の Extra ステージ";
    extras.push(`前のステージ「${name}」にも ${count} 人を割り当てました。`);
  }
  if (extras.length === 0) return head;
  return `${head}${extras.join("")}`;
}

function normalizeRosterSearch(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase();
}

function matchesQuery(row: StageRosterRow, rawNeedle: string): boolean {
  const needle = normalizeRosterSearch(rawNeedle);
  if (needle === "") return true;
  if (row.display_name.normalize("NFKC").toLowerCase().includes(needle)) return true;
  return row.email?.normalize("NFKC").toLowerCase().includes(needle) ?? false;
}

function matchesLocal(
  row: StageRosterRow,
  view: { assigned: boolean; exempted: boolean },
  filter: RosterLocalFilter,
  callerId: string | null,
): boolean {
  if (!matchesQuery(row, filter.q)) return false;
  if (filter.status === "assigned" && !view.assigned) return false;
  if (filter.status === "unassigned" && view.assigned) return false;
  if (filter.status === "exempted" && !view.exempted) return false;
  if (filter.prereq === "not_done") {
    if (row.prerequisite_status === "done") return false;
  } else if (filter.prereq !== "all" && row.prerequisite_status !== filter.prereq) {
    return false;
  }
  if (filter.instructor === "all") return true;
  if (filter.instructor === "none") return row.instructor === null;
  if (filter.instructor === "mine") return callerId !== null && row.instructor?.id === callerId;
  return row.instructor?.id === filter.instructor;
}

function viewOf(baseline: StageRosterRow, pending: StageRosterPending): StageRosterView {
  const change = pending.get(baseline.id)?.change;
  const stored = pending.get(baseline.id)?.row ?? baseline;
  const effective = effectiveRoster(stored, change);
  return {
    id: stored.id,
    baseline: stored,
    assigned: effective.assigned,
    exempted: effective.exempted,
    marks: rosterMarks(stored, change),
    canAssign: canToggleAssignment(stored, effective.assigned),
    exemption: exemptionControl(stored, effective.assigned, effective.exempted),
  };
}

function compareViews(a: StageRosterView, b: StageRosterView): number {
  const byName = a.baseline.display_name.localeCompare(b.baseline.display_name, "ja");
  if (byName !== 0) return byName;
  return a.id.localeCompare(b.id);
}

/**
 * 画面に出す行。
 * `changesOnly` は手元の変更だけ（サーバーには聞かない）。
 * `assignedScope` は前提を免除タブで、割り当て済みだけを出し、今回割り当てた人を先頭に足す。
 */
export function composeRosterRows(args: {
  loaded: readonly StageRosterRow[];
  pending: StageRosterPending;
  changesOnly: boolean;
  assignedScope: boolean;
  filter: RosterLocalFilter;
  callerId: string | null;
}): StageRosterView[] {
  const { loaded, pending, changesOnly, assignedScope, filter, callerId } = args;

  if (changesOnly) {
    const fresh: StageRosterView[] = [];
    const rest: StageRosterView[] = [];
    for (const entry of pending.values()) {
      const view = viewOf(entry.row, pending);
      if (assignedScope && !view.assigned) continue;
      if (!matchesLocal(entry.row, view, filter, callerId)) continue;
      if (assignedScope && !entry.row.assigned) fresh.push(view);
      else rest.push(view);
    }
    fresh.sort(compareViews);
    rest.sort(compareViews);
    if (assignedScope) return [...fresh, ...rest];
    return rest;
  }

  if (assignedScope) {
    const fresh: StageRosterView[] = [];
    for (const entry of pending.values()) {
      const view = viewOf(entry.row, pending);
      if (entry.row.assigned || !view.assigned) continue;
      if (!matchesLocal(entry.row, view, filter, callerId)) continue;
      fresh.push(view);
    }
    fresh.sort(compareViews);
    const freshIds = new Set(fresh.map((view) => view.id));
    const rest: StageRosterView[] = [];
    for (const row of loaded) {
      if (freshIds.has(row.id)) continue;
      const view = viewOf(row, pending);
      if (!view.assigned) continue;
      if (filter.status === "exempted" && !view.exempted) continue;
      rest.push(view);
    }
    return [...fresh, ...rest];
  }

  return loaded.map((row) => viewOf(row, pending));
}
