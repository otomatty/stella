import { describe, expect, it } from "vitest";

import { mapStageToUi, type StageRow, type StageWithChildren } from "./types.js";

function stageRow(overrides: Partial<StageRow> = {}): StageRow {
  return {
    id: "stage-1",
    tenant_id: "ses",
    slug: "typescript-basics",
    title: "TypeScript 入門研修",
    category: "フロントエンド",
    color: "indigo",
    duration_hours: 28,
    description: null,
    status: "published",
    created_by: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function withChildren(stage: StageRow): StageWithChildren {
  return { stage, sections: [] };
}

describe("mapStageToUi — 講師名 (Issue #74)", () => {
  it("instructor_name を enrolledBy に載せる", () => {
    const ui = mapStageToUi(withChildren(stageRow({ instructor_name: "堀江メンター" })));
    expect(ui.enrolledBy).toBe("堀江メンター");
  });

  it("前後の空白を落とす", () => {
    const ui = mapStageToUi(withChildren(stageRow({ instructor_name: "  堀江メンター  " })));
    expect(ui.enrolledBy).toBe("堀江メンター");
  });

  it("null / 空白のみ / 未マイグレーション (undefined) では enrolledBy を付けない", () => {
    for (const value of [null, "", "   ", undefined]) {
      const ui = mapStageToUi(withChildren(stageRow({ instructor_name: value })));
      expect(ui.enrolledBy).toBeUndefined();
      expect("enrolledBy" in ui).toBe(false);
    }
  });
});

describe("mapStageToUi — サムネイル", () => {
  it("thumbnail_path を thumbnailPath に載せる", () => {
    const ui = mapStageToUi(
      withChildren(
        stageRow({
          thumbnail_path: "tenant/ses/courses/typescript-basics/thumbnail-abcd1234.webp",
        }),
      ),
    );
    expect(ui.thumbnailPath).toBe("tenant/ses/courses/typescript-basics/thumbnail-abcd1234.webp");
  });

  it("null / 空文字 / 未マイグレーション (undefined) では付けない (ストライプ表示のまま)", () => {
    for (const value of [null, "", undefined]) {
      const ui = mapStageToUi(withChildren(stageRow({ thumbnail_path: value })));
      expect("thumbnailPath" in ui).toBe(false);
    }
  });
});
