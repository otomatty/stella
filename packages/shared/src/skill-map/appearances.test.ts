/**
 * スキルツリーの「見た目の複製」(`appearances`)。
 *
 * 1 つのステージを複数の扇に置く (Git をフロントエンドとバックエンドの両方に出す)
 * ための対応表。実体は 1 行のまま (クリアは共有)。未知 slug は複製しない。
 */

import { describe, expect, it } from "vitest";

import {
  appearancePrerequisitesOf,
  appearancesOf,
  SKILL_MAP_APPEARANCE_PREREQUISITES,
  SKILL_MAP_APPEARANCES,
} from "./appearances";

describe("appearancesOf", () => {
  it("退役した Git 講座は複製の対応表に残さない", () => {
    expect(appearancesOf("git-basics")).toBeUndefined();
    expect(appearancePrerequisitesOf("git-basics")).toBeUndefined();
  });

  it("表に無い slug は複製しない (扇は category のまま)", () => {
    expect(appearancesOf("dev-env-basics")).toBeUndefined();
    expect(appearancesOf("http-async-basics")).toBeUndefined();
  });

  it("対応表のキーは slug、値は空でない扇名", () => {
    for (const [slug, sectors] of Object.entries(SKILL_MAP_APPEARANCES)) {
      expect(slug.trim()).not.toBe("");
      expect(sectors.length).toBeGreaterThan(1);
      expect(new Set(sectors).size).toBe(sectors.length);
      for (const sector of sectors) expect(sector.trim()).not.toBe("");
    }
  });
});

describe("appearancePrerequisitesOf", () => {
  it("退役した Git 講座は複製の対応表に残さない", () => {
    expect(appearancesOf("git-basics")).toBeUndefined();
    expect(appearancePrerequisitesOf("git-basics")).toBeUndefined();
  });

  it("表に無い slug は扇ごとの前提を持たない", () => {
    expect(appearancePrerequisitesOf("dev-env-basics")).toBeUndefined();
    expect(appearancePrerequisitesOf("javascript-basics")).toBeUndefined();
  });

  it("複製する slug は扇と同じキーで、扇ごとの前提はちょうど 1 つ (線の元)", () => {
    for (const [slug, sectors] of Object.entries(SKILL_MAP_APPEARANCES)) {
      const groups = SKILL_MAP_APPEARANCE_PREREQUISITES[slug];
      expect(groups, `${slug} の扇ごとの前提`).toBeDefined();
      expect(Object.keys(groups ?? {}).sort()).toEqual([...sectors].sort());
      for (const slugs of Object.values(groups ?? {})) {
        expect(slugs.length).toBe(1);
        expect(new Set(slugs).size).toBe(slugs.length);
      }
    }
  });
});
