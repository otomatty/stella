import type { IntegrationStageInput } from "@stella/shared/integrations/types";

export interface GroupStage {
  id: string;
  slug: string;
  title: string;
  dueAt: string | null;
  message: string | null;
  exempt: boolean;
}

export interface GroupStageNode {
  id: string;
  parent_id?: string;
  audience?: "granted";
}

/** Basic の親もたどり、割り当てに必要な Extra だけを返す。 */
export function extraStageAncestors<T extends GroupStageNode>(
  stage: T,
  stages: ReadonlyMap<string, T>,
): T[] {
  const ancestors: T[] = [];
  const seen = new Set([stage.id]);
  let parentId = stage.parent_id;
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = stages.get(parentId);
    if (!parent) break;
    if (parent.audience === "granted") ancestors.push(parent);
    parentId = parent.parent_id;
  }
  return ancestors.reverse();
}

const tokyoDay = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", dateStyle: "short" });

export function groupDueDate(dueAt: string | null): string {
  return dueAt ? tokyoDay.format(new Date(dueAt)) : "";
}

export function groupDueValue(date: string, original: string | null): string | null {
  // 連携 API などで入った日時は、日付が編集されなければ時刻も保つ。
  return date === groupDueDate(original) ? original : date || null;
}

export interface GroupStageDraft extends GroupStage {
  date: string;
}

export function toGroupStageDraft(stage: GroupStage): GroupStageDraft {
  return { ...stage, date: groupDueDate(stage.dueAt) };
}

export function toGroupStageInput(stage: GroupStageDraft): Required<IntegrationStageInput> {
  return {
    slug: stage.slug,
    due_at: groupDueValue(stage.date, stage.dueAt),
    message: stage.message,
    exempt: stage.exempt,
  };
}
