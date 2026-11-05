import { describe, expect, it } from "vitest";

import { layoutRadialSkillTree } from "@/components/learner/tree/radial-layout";
import type { StaffSkillMapStageNode } from "@/lib/skill-map-api";

import {
  entryStageId,
  filterStagesByQuery,
  formatStageManagementCounts,
  nextPublishStatus,
  offBoardNote,
  planStaffStages,
  publishToggleLabel,
  staffStarTag,
  stageAudienceLabel,
  stageManagementCounts,
  stageManagementTitle,
  stageStatusLabel,
} from "./stage-management";

function stage(
  over: Partial<StaffSkillMapStageNode> & Pick<StaffSkillMapStageNode, "id">,
): StaffSkillMapStageNode {
  return {
    state: "unlocked",
    visibility: "full",
    title: over.title ?? over.id,
    slug: over.slug ?? over.id,
    category: "基礎",
    status: "published",
    granted_count: 0,
    enrolled_count: 0,
    ...over,
  };
}

describe("planStaffStages", () => {
  const root = stage({ id: "root", title: "入口", slug: "dev-env", category: "基礎" });
  const fe = stage({
    id: "fe",
    title: "HTML",
    slug: "html",
    category: "フロントエンド",
    parent_id: "root",
    enrolled_count: 4,
  });
  const extra = stage({
    id: "py",
    title: "Python 入門",
    slug: "python-basics",
    category: "Python",
    parent_id: "root",
    audience: "granted",
    granted_count: 2,
  });
  const orphan = stage({
    id: "new",
    title: "新しいステージ",
    slug: "stage-new",
    category: "",
    status: "draft",
  });
  const archived = stage({
    id: "old",
    title: "旧ステージ",
    slug: "old-stage",
    status: "archived",
    parent_id: "root",
  });
  const childOfArchived = stage({
    id: "after-old",
    title: "続編",
    slug: "after-old",
    category: "フロントエンド",
    parent_id: "old",
    appearance_parent_ids: { フロントエンド: "old", バックエンド: "root" },
  });

  const plan = planStaffStages([root, fe, extra, orphan, archived, childOfArchived]);

  it("公開中と下書きで扇がある星は盤面に載せ、アーカイブと孤立した下書きは外す", () => {
    expect(plan.board.map((node) => node.id)).toEqual(["root", "fe", "py", "after-old"]);
    expect(plan.offBoard.map((node) => node.id)).toEqual(["new", "old"]);
  });

  it("盤面から外した星を指す parent_id と appearance_parent_ids を外す", () => {
    const child = plan.board.find((node) => node.id === "after-old");
    expect(child?.parent_id).toBeUndefined();
    expect(child?.appearance_parent_ids).toEqual({ バックエンド: "root" });
    const kept = plan.board.find((node) => node.id === "fe");
    expect(kept?.parent_id).toBe("root");
  });

  it("カテゴリが無くても、盤面に残る星を親に持つ下書きは載せる", () => {
    const attached = stage({
      id: "attached",
      category: "",
      status: "draft",
      parent_id: "root",
    });
    const next = planStaffStages([root, attached]);
    expect(next.board.map((node) => node.id)).toEqual(["root", "attached"]);
    expect(next.board.find((node) => node.id === "attached")?.parent_id).toBe("root");
  });

  it("親がアーカイブだけでカテゴリも無い星は盤面に載せない", () => {
    const dangling = stage({
      id: "dangling",
      category: "",
      status: "draft",
      parent_id: "old",
    });
    const next = planStaffStages([root, archived, dangling]);
    expect(next.board.map((node) => node.id)).toEqual(["root"]);
    expect(next.offBoard.map((node) => node.id)).toContain("dangling");
  });
});

describe("entryStageId", () => {
  it("配列の先頭ではなく、レイアウトの中心 (ring 0) を返す", () => {
    const root = stage({ id: "root", title: "入口", category: "基礎" });
    const child = stage({
      id: "child",
      title: "HTML",
      category: "フロントエンド",
      parent_id: "root",
    });
    expect(entryStageId([child, root])).toBe("root");
  });

  it("中心が無いときは盤面の先頭を返す。空なら null", () => {
    const hidden = stage({ id: "hidden", visibility: "fog", category: "基礎" });
    const later = stage({ id: "later", visibility: "fog", category: "基礎" });
    expect(layoutRadialSkillTree([hidden, later]).nodes.some((node) => node.ring === 0)).toBe(
      false,
    );
    expect(entryStageId([hidden, later])).toBe("hidden");
    expect(entryStageId([])).toBeNull();
  });
});

describe("stageManagementCounts", () => {
  it("公開中・下書き・Extra を数える。アーカイブの Extra は Extra に入れない", () => {
    const counts = stageManagementCounts([
      stage({ id: "a", status: "published" }),
      stage({ id: "b", status: "draft" }),
      stage({ id: "c", status: "published", audience: "granted" }),
      stage({ id: "d", status: "archived", audience: "granted" }),
    ]);
    expect(counts).toEqual({ published: 2, draft: 1, extra: 1 });
    expect(formatStageManagementCounts(counts)).toBe("公開中 2 · 下書き 1 · Extra 1");
  });
});

describe("staffStarTag", () => {
  it("下書きと Extra の札を出す。公開中の Basic には出さない", () => {
    expect(staffStarTag({ status: "published" })).toBeNull();
    expect(staffStarTag({ status: "draft" })).toBe("下書き");
    expect(staffStarTag({ status: "published", audience: "granted" })).toBe("Extra");
    expect(staffStarTag({ status: "draft", audience: "granted" })).toBe("下書き · Extra");
  });
});

describe("filterStagesByQuery", () => {
  const rows = [
    stage({ id: "1", title: "HTML と CSS", slug: "html-css" }),
    stage({ id: "2", title: "API の基本", slug: "node-api" }),
  ];

  it("空の入力では候補を出さない", () => {
    expect(filterStagesByQuery(rows, "  ")).toEqual([]);
  });

  it("タイトルと slug を大文字小文字を区別せずに絞る", () => {
    expect(filterStagesByQuery(rows, "html").map((row) => row.id)).toEqual(["1"]);
    expect(filterStagesByQuery(rows, "NODE").map((row) => row.id)).toEqual(["2"]);
    expect(filterStagesByQuery(rows, "無い")).toEqual([]);
  });
});

describe("表示文言", () => {
  it("状態・掲載範囲・公開の切り替えの文言", () => {
    expect(stageStatusLabel("published")).toBe("公開中");
    expect(stageStatusLabel("draft")).toBe("下書き");
    expect(stageStatusLabel("archived")).toBe("アーカイブ");
    expect(stageAudienceLabel(undefined)).toBe("Basic");
    expect(stageAudienceLabel("granted")).toBe("Extra");
    expect(nextPublishStatus("published")).toBe("draft");
    expect(nextPublishStatus("draft")).toBe("published");
    expect(nextPublishStatus("archived")).toBe("published");
    expect(publishToggleLabel("published")).toBe("下書きに戻す");
    expect(publishToggleLabel("draft")).toBe("公開する");
    expect(stageManagementTitle("admin")).toBe("ステージ管理");
    expect(stageManagementTitle("instructor")).toBe("ステージ");
    expect(offBoardNote(stage({ id: "a", status: "archived" }))).toBe(
      "アーカイブのため、盤面には載せていません",
    );
    expect(offBoardNote(stage({ id: "b", status: "draft", category: "" }))).toBe(
      "カテゴリも親も無いため、盤面には載せていません",
    );
  });
});
