/**
 * ホームのスキルマップに載せる星を、いま取り組んでいるコース中心に絞る。
 *
 * スキルツリーは全体を俯瞰する場所。ホームは「今どこにいて、次は何か」だけを縦に描く。
 * 入口講座をクリアした直後に入門講座が一度に開いても、ホームに全部並べない。
 *
 * 秘匿はサーバ済み。霧の星はここに載せない (名前が無く、今の一手にならない)。
 */

import type { SkillMapStageNode } from "@/lib/skill-map-api";

/** 進行中でないときに並べる「次の一歩」の上限。 */
export const HOME_PATH_MAX_NEXT = 3;

function nodeById(nodes: SkillMapStageNode[]): Map<string, SkillMapStageNode> {
  return new Map(nodes.map((node) => [node.id, node]));
}

/** `id` から前提を根まで辿る (循環は seen で止める)。 */
export function ancestorIdsOf(id: string, nodes: SkillMapStageNode[]): string[] {
  const byId = nodeById(nodes);
  const found: string[] = [];
  const seen = new Set<string>([id]);
  const stack = [...(byId.get(id)?.prerequisite_ids ?? [])];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined || seen.has(current)) continue;
    seen.add(current);
    found.push(current);
    for (const parent of byId.get(current)?.prerequisite_ids ?? []) stack.push(parent);
  }
  return found;
}

function childrenOf(id: string, nodes: SkillMapStageNode[]): SkillMapStageNode[] {
  return nodes.filter((node) => node.prerequisite_ids?.includes(id));
}

/**
 * 進行中の次。`next_stage_ids` は unlocked だけなので、まだ locked の子は入らない。
 * 子そのものを採り、開けているもの → 鍵付き → その他、同段はタイトル順。
 */
function nextChildrenOf(id: string, nodes: SkillMapStageNode[]): SkillMapStageNode[] {
  const rank = (node: SkillMapStageNode) => {
    if (node.state === "unlocked" || node.state === "active") return 0;
    if (node.state === "locked") return 1;
    return 2;
  };
  return childrenOf(id, nodes)
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (a.title ?? a.theme ?? "").localeCompare(b.title ?? b.theme ?? "", "ja"),
    )
    .slice(0, HOME_PATH_MAX_NEXT);
}

function addWithAncestors(ids: Set<string>, id: string, visible: SkillMapStageNode[]): void {
  const byId = nodeById(visible);
  if (!byId.has(id)) return;
  ids.add(id);
  for (const ancestor of ancestorIdsOf(id, visible)) {
    if (byId.has(ancestor)) ids.add(ancestor);
  }
}

/**
 * ホームに描く星。並び順は呼び出し側 (`StagePath`) が決める。
 *
 * - 進行中の星がある … その星と前提の鎖。先は **この星の子** だけ
 *   (`next_stage_ids` は unlocked のみなので、鍵付きの次が見えなくなる)。
 *   子が多いときは `HOME_PATH_MAX_NEXT` 件まで (入口の子 10 件は並べない)
 * - 無い … 受講中の未クリアは `HOME_PATH_MAX_NEXT` 件まで + 推奨の次 + その前提
 *   (seed-learner のように全講座に登録があると、上限無しではカタログ全体になる)
 * - 発見教材の源流が鎖の外にあっても、開ける場所が要るので追加する
 */
export function homePathNodes(
  nodes: SkillMapStageNode[],
  options: {
    activeStageId: string | null;
    nextStageIds: string[];
    extraStageIds?: string[];
  },
): SkillMapStageNode[] {
  const visible = nodes.filter((node) => node.visibility !== "fog");
  const ids = new Set<string>();
  const active = options.activeStageId
    ? visible.find((node) => node.id === options.activeStageId)
    : undefined;

  if (active) {
    addWithAncestors(ids, active.id, visible);
    for (const child of nextChildrenOf(active.id, visible)) {
      addWithAncestors(ids, child.id, visible);
    }
  } else {
    const enrolled = visible
      .filter((node) => node.enrolled === true && node.state !== "cleared")
      .sort((a, b) => (a.title ?? a.theme ?? "").localeCompare(b.title ?? b.theme ?? "", "ja"))
      .slice(0, HOME_PATH_MAX_NEXT);
    for (const node of enrolled) {
      addWithAncestors(ids, node.id, visible);
    }
    for (const id of options.nextStageIds.slice(0, HOME_PATH_MAX_NEXT)) {
      addWithAncestors(ids, id, visible);
    }
  }

  for (const id of options.extraStageIds ?? []) {
    addWithAncestors(ids, id, visible);
  }

  // 空のときは「始められるもの」だけ。クリア済みを全部足すと、修了後にカタログ全体が戻る。
  if (ids.size === 0) {
    for (const node of visible) {
      if (node.state === "unlocked" || node.state === "active") {
        ids.add(node.id);
      }
    }
  }

  return visible.filter((node) => ids.has(node.id));
}
