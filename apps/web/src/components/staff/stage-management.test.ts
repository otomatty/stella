import { describe, expect, it } from "vitest";

import { layoutRadialSkillTree } from "@/components/learner/tree/radial-layout";
import type { StaffSkillMapStageNode } from "@/lib/skill-map-api";

import {
  entryStageId,
  filterStagesByQuery,
  formatStageManagementCounts,
  offBoardNote,
  planStaffStages,
  staffMapContents,
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
  it("状態・掲載範囲の文言", () => {
    expect(stageStatusLabel("published")).toBe("公開中");
    expect(stageStatusLabel("draft")).toBe("下書き");
    expect(stageStatusLabel("archived")).toBe("アーカイブ");
    expect(stageAudienceLabel(undefined)).toBe("Basic");
    expect(stageAudienceLabel("granted")).toBe("Extra");
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

describe("staffMapContents", () => {
  const extra = (id: string, category: string, parent_id?: string, title = id) =>
    stage({ id, slug: id, title, category, parent_id, audience: "granted" });
  const catalog = [
    stage({ id: "dev-env-basics", title: "開発環境とWebの入口" }),
    stage({ id: "html", category: "フロントエンド", parent_id: "dev-env-basics" }),
    stage({
      id: "node-api-basics",
      title: "Node API 入門",
      category: "バックエンド",
      parent_id: "html",
    }),
    stage({ id: "full", category: "フルスタック", parent_id: "node-api-basics" }),
    stage({ id: "z", category: "その他Z", parent_id: "full" }),
    stage({ id: "a", category: "その他A", parent_id: "full" }),
    extra("python-next", "Python", "python-basics", "A 続編"),
    extra("python-basics", "Python", "node-api-basics", "Python 入門"),
    extra("python-z", "Python", "python-basics", "Z 続編"),
    extra("devops", "DevOps", "python-basics"),
    extra("devlab-ts-prework", "開発ラボG"),
    extra("aws", "AWS資格", "dev-env-basics"),
    extra("archived", "C#", undefined),
  ];
  const board = catalog.filter((row) => row.id !== "archived");
  const contents = staffMapContents(board, catalog);
  const island = (key: string) => contents.islands.find((entry) => entry.key === key);

  it("本土の数とカテゴリを優先順、そのほかは日本語の名前順にする", () => {
    expect(contents.mainland).toEqual({
      title: "開発スキル",
      count: 6,
      routes: [
        { key: "基礎", count: 1 },
        { key: "フロントエンド", count: 1 },
        { key: "バックエンド", count: 1 },
        { key: "フルスタック", count: 1 },
        { key: "その他A", count: 1 },
        { key: "その他Z", count: 1 },
      ],
    });
  });

  it("盤面にある島だけを名前順に出し、島内は親の深さ、同じ深さはタイトル順にする", () => {
    expect(contents.islands.map((entry) => entry.key)).toEqual([
      "AWS資格",
      "DevOps",
      "Python",
      "開発ラボG",
    ]);
    expect(island("Python")?.stages.map((row) => row.id)).toEqual([
      "python-basics",
      "python-next",
      "python-z",
    ]);
    expect(island("Python")?.count).toBe(3);
    expect(island("Python")?.allExtra).toBe(true);
  });

  it("表示条件と最初の前提を分け、島の先も親から求める", () => {
    expect(island("Python")?.prerequisite).toEqual({
      id: "node-api-basics",
      title: "Node API 入門",
      routeKey: "バックエンド",
    });
    expect(island("DevOps")?.visibility).toBe("Python 入門 クリア後");
    expect(island("DevOps")?.prerequisite).toEqual({
      id: "python-basics",
      title: "Python 入門",
      routeKey: "Python",
    });
    expect(island("開発ラボG")?.visibility).toBe("割り当てのみ");
    expect(island("開発ラボG")?.prerequisite).toBeNull();
    expect(island("AWS資格")?.visibility).toBe("入口 クリア後");
    expect(island("Python")?.next).toEqual([{ key: "DevOps", visibility: "Python 入門 クリア後" }]);
  });

  it("空の盤面と Basic が混じる島も扱う。入力を並べ替えない", () => {
    expect(staffMapContents([], catalog)).toEqual({
      mainland: { title: "開発スキル", count: 0, routes: [] },
      islands: [],
    });
    const mixed = staffMapContents(
      [...board, stage({ id: "py-basic", category: "Python" })],
      catalog,
    );
    expect(mixed.islands.find((entry) => entry.key === "Python")?.allExtra).toBe(false);
    expect(board[6]?.id).toBe("python-next");
  });
});
