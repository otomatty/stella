import { describe, expect, it } from "vitest";

import { coursesReadyForPublishedOnly, publishedCatalogRows } from "./courses-source.js";
import type { CourseRow } from "@falcon/shared/cms/types";

function row(id: string, status: CourseRow["status"]): CourseRow {
  return {
    id,
    tenant_id: "ses",
    slug: id,
    title: id,
    category: null,
    color: null,
    duration_hours: null,
    description: null,
    status,
    created_by: null,
    created_at: "",
    updated_at: "",
  };
}

describe("publishedCatalogRows", () => {
  const rows = [row("pub", "published"), row("draft", "draft"), row("arch", "archived")];

  it("keeps every row when publishedOnly is false", () => {
    expect(publishedCatalogRows(rows, false).map((r) => r.id)).toEqual(["pub", "draft", "arch"]);
  });

  it("drops draft and archived rows for learner preview", () => {
    expect(publishedCatalogRows(rows, true).map((r) => r.id)).toEqual(["pub"]);
  });
});

describe("coursesReadyForPublishedOnly", () => {
  it("hides the unfiltered cache as soon as publishedOnly is on", () => {
    expect(coursesReadyForPublishedOnly(["draft", "pub"], true, false)).toEqual([]);
    expect(coursesReadyForPublishedOnly(["draft", "pub"], true, null)).toEqual([]);
  });

  it("shows courses after a published-only fetch finishes", () => {
    expect(coursesReadyForPublishedOnly(["pub"], true, true)).toEqual(["pub"]);
  });
});
