/**
 * 島の表示条件 (`filterIslandStages`) の単体テスト。
 *
 * 実カテゴリ名 (`SKILL_MAP_ISLANDS`) に依存した検証と、汎用の規則
 * (条件未達 = 存在ごと落とす / 未知 slug = 誰にも出ない) の両方を見る。
 */

import { describe, expect, it } from "vitest";

import {
  dropIslandsUnknownToClient,
  filterIslandStages,
  SKILL_MAP_ISLAND_CATEGORIES,
  SKILL_MAP_ISLAND_MIN_TIERS,
  SKILL_MAP_ISLANDS,
} from "./islands";

interface Row {
  id: string;
  slug: string;
  category?: string;
}

const stage = (slug: string, category?: string): Row => ({
  id: `id-${slug}`,
  slug,
  ...(category ? { category } : {}),
});

const slugsOf = (rows: Row[]) => rows.map((r) => r.slug).sort();

describe("filterIslandStages", () => {
  const mainland = [stage("it-basics", "基礎"), stage("html-css-basics", "フロントエンド")];
  const islands = [
    stage("aws-clf-c02-basics", "AWS資格"),
    stage("fe-kamoku-a", "情報処理資格"),
    stage("fe-kamoku-b", "情報処理資格"),
    stage("ai-fluency-basics", "AI駆動開発"),
  ];

  it("条件を満たしていない島は存在ごと落ちる (本土は常に残る)", () => {
    const visible = filterIslandStages([...mainland, ...islands], new Set());
    expect(slugsOf(visible)).toEqual(slugsOf(mainland));
  });

  it("ITのきほんをクリアすると島が現れる (既定の表示条件)", () => {
    const visible = filterIslandStages([...mainland, ...islands], new Set(["id-it-basics"]));
    expect(slugsOf(visible)).toEqual(slugsOf([...mainland, ...islands]));
  });

  it("DevOps 島は Python 入門をクリアするまで存在ごと落ちる", () => {
    const python = stage("python-basics", "バックエンド");
    const devops = stage("devops-basics", "DevOps");
    const rows = [...mainland, python, devops, ...islands];
    const afterIt = filterIslandStages(rows, new Set(["id-it-basics"]));
    expect(slugsOf(afterIt)).toEqual(slugsOf([...mainland, python, ...islands]));
    const afterPython = filterIslandStages(rows, new Set(["id-it-basics", "id-python-basics"]));
    expect(slugsOf(afterPython)).toEqual(slugsOf(rows));
  });

  it("カテゴリを持たない / 島でないカテゴリのステージは条件に関わらず残る", () => {
    const rows = [stage("no-category"), stage("sql-basics", "バックエンド")];
    expect(filterIslandStages(rows, new Set())).toEqual(rows);
  });

  it("requires の slug が入力に無い島は誰にも出ない (開きすぎより閉じすぎ)", () => {
    // it-basics 行そのものが無い入力 = 条件の slug が解決できない。
    const visible = filterIslandStages(islands, new Set(["id-it-basics"]));
    expect(visible).toEqual([]);
  });

  it("島のカテゴリ一覧は定義と一致する (レイアウト側が扇から外すキー)", () => {
    for (const island of SKILL_MAP_ISLANDS) {
      expect(SKILL_MAP_ISLAND_CATEGORIES.has(island.category)).toBe(true);
    }
    expect(SKILL_MAP_ISLAND_CATEGORIES.size).toBe(SKILL_MAP_ISLANDS.length);
  });
});

describe("dropIslandsUnknownToClient", () => {
  const python = stage("python-basics", "バックエンド");
  const devops = stage("devops-basics", "DevOps");
  const aws = stage("aws-clf-c02-basics", "AWS資格");

  it("tiers=3 以上なら DevOps を残す", () => {
    expect(slugsOf(dropIslandsUnknownToClient([python, devops, aws], "3"))).toEqual(
      slugsOf([python, devops, aws]),
    );
  });

  it("tiers=2 (現行本番の旧 bundle) と申告なしでは DevOps だけ落とす", () => {
    expect(slugsOf(dropIslandsUnknownToClient([python, devops, aws], "2"))).toEqual(
      slugsOf([python, aws]),
    );
    expect(slugsOf(dropIslandsUnknownToClient([python, devops, aws], undefined))).toEqual(
      slugsOf([python, aws]),
    );
  });

  it("下限を書いた島だけが対象 (資格 / AI は常に残る)", () => {
    expect(SKILL_MAP_ISLAND_MIN_TIERS.DevOps).toBe(3);
    expect(SKILL_MAP_ISLAND_MIN_TIERS["AWS資格"]).toBeUndefined();
  });
});
