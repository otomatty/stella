import { describe, expect, it } from "vitest";

import type { SkillMapStageNode } from "@/lib/skill-map-api";

import { buildLanes } from "./lanes";

const star = (id: string, over: Partial<SkillMapStageNode> = {}): SkillMapStageNode => ({
  id,
  category: "基礎",
  state: "unlocked",
  visibility: "full",
  ...over,
});

describe("buildLanes", () => {
  it("幽霊・hidden を除き、空の行を作らない", () => {
    expect(
      buildLanes(
        [
          star("visible"),
          star("fog", { visibility: "fog" }),
          star("edge", { visibility: "edge" }),
          star("hidden", { visibility: "hidden", category: "別の行" }),
          star("edge-only", { visibility: "edge", category: "先の行" }),
        ],
        false,
      ).map((lane) => lane.stars.map((node) => node.id)),
    ).toEqual([["fog", "visible"]]);
    expect(buildLanes([], false)).toEqual([]);
  });

  it("ルートが星雲より先、星雲はキー順", () => {
    expect(
      buildLanes(
        [
          star("python", { category: "Python" }),
          star("base"),
          star("aws", { category: "AWS資格" }),
        ],
        false,
      ).map(({ key, kind }) => [key, kind]),
    ).toEqual([
      ["基礎", "route"],
      ["AWS資格", "nebula"],
      ["Python", "nebula"],
    ]);
  });

  it("浅い行が先、同じ深さならキー順。描かない親も深さに含む", () => {
    expect(
      buildLanes(
        [
          star("deep", { category: "A", parent_id: "middle" }),
          star("middle", { category: "隠れた親", parent_id: "root", visibility: "edge" }),
          star("root", { category: "B" }),
          star("orphan", { category: "C", parent_id: "missing" }),
        ],
        false,
      ).map((lane) => lane.key),
    ).toEqual(["B", "C", "A"]);
  });

  it("行の中は深さ、名前（テーマへフォールバック）、id の順。入力は変更しない", () => {
    const nodes = [
      star("child", { title: "A", parent_id: "a" }),
      star("z", { title: "B" }),
      star("a", { theme: "B" }),
      star("first", { title: "A" }),
    ];
    const original = [...nodes];
    expect(buildLanes(nodes, false)[0]?.stars.map((node) => node.id)).toEqual([
      "first",
      "a",
      "z",
      "child",
    ]);
    expect(nodes).toEqual(original);
  });

  it("同じキーの edge があれば hasMore。theme と その他にも分類する", () => {
    expect(
      buildLanes(
        [
          star("base"),
          star("edge", { visibility: "edge" }),
          star("theme", { category: undefined, theme: "テーマ" }),
          star("other", { category: undefined }),
        ],
        false,
      ).map(({ key, hasMore }) => [key, hasMore]),
    ).toEqual(
      expect.arrayContaining([
        ["基礎", true],
        ["テーマ", false],
        ["その他", false],
      ]),
    );
  });

  it("category が空文字なら theme の行、theme も無ければ「その他」に入る", () => {
    const lanes = buildLanes(
      [
        star("theme", { category: "", theme: "テーマ" }),
        star("edge", { category: "", theme: "テーマ", visibility: "edge" }),
        star("other", { category: "" }),
        star("empty-theme", { category: "", theme: "" }),
      ],
      false,
    );
    expect(lanes).toHaveLength(2);
    expect(lanes.find((lane) => lane.key === "テーマ")).toMatchObject({
      stars: [{ id: "theme" }],
      hasMore: true,
    });
    expect(lanes.find((lane) => lane.key === "その他")?.stars.map((node) => node.id)).toEqual([
      "empty-theme",
      "other",
    ]);
  });

  it("親の循環・自己参照で止まる", () => {
    expect(
      buildLanes(
        [
          star("b", { parent_id: "a" }),
          star("a", { parent_id: "b" }),
          star("self", { parent_id: "self" }),
        ],
        false,
      )[0]?.stars.map((node) => node.id),
    ).toEqual(["self", "a", "b"]);
  });

  it("開発者表示では幽霊も星として入る", () => {
    const lanes = buildLanes([star("edge", { visibility: "edge" })], true);
    expect(lanes[0]?.stars.map((node) => node.id)).toEqual(["edge"]);
    expect(lanes[0]?.hasMore).toBe(true);
  });
});
