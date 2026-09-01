import { describe, expect, it } from "vitest";

import {
  dropOrphanGrantedStages,
  filterStagesByAudience,
  isCatalogAudience,
  isGrantedStageVisibleToLearner,
} from "./stage-audience.js";

type Row = {
  id: string;
  slug: string;
  audience: string | null;
  prerequisites: string | null;
  parent: string | null;
};

function row(
  id: string,
  slug: string,
  audience: string | null,
  opts?: { parent?: string; prerequisites?: string[] },
): Row {
  return {
    id,
    slug,
    audience,
    parent: opts?.parent ?? null,
    prerequisites: opts?.prerequisites ? JSON.stringify(opts.prerequisites) : null,
  };
}

describe("isCatalogAudience", () => {
  it("granted 以外は catalog 扱い", () => {
    expect(isCatalogAudience("catalog")).toBe(true);
    expect(isCatalogAudience(null)).toBe(true);
    expect(isCatalogAudience("granted")).toBe(false);
  });
});

describe("filterStagesByAudience", () => {
  it("granted は割当がある id だけ残す", () => {
    const rows = [row("1", "a", "catalog"), row("2", "b", "granted"), row("3", "c", "granted")];
    const filtered = filterStagesByAudience(rows, new Set(["2"]));
    expect(filtered.map((r) => r.id)).toEqual(["1", "2"]);
  });
});

describe("isGrantedStageVisibleToLearner", () => {
  it("割当か読める enrollment があれば見える", () => {
    expect(isGrantedStageVisibleToLearner(true, false)).toBe(true);
    expect(isGrantedStageVisibleToLearner(false, true)).toBe(true);
    expect(isGrantedStageVisibleToLearner(false, false)).toBe(false);
  });
});

describe("dropOrphanGrantedStages", () => {
  it("親がカタログに無い granted を落とす", () => {
    const rows = [
      row("1", "parent", "catalog"),
      row("2", "child", "granted", { parent: "missing" }),
      row("3", "ok", "granted", { parent: "parent" }),
    ];
    expect(dropOrphanGrantedStages(rows).map((r) => r.id)).toEqual(["1", "3"]);
  });
});
