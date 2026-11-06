import { describe, expect, it } from "vitest";

import {
  countStageGrantLearners,
  listStageGrantLearners,
  normalizeStageGrantSearch,
  parseStageGrantLearnerQuery,
  type StageGrantLearnerProfile,
  type StageGrantLearnerQuery,
  type StageGrantLearnerSource,
} from "./stage-grant-learners.js";

function profile(
  id: string,
  displayName: string,
  email: string | null = `${id}@example.com`,
  role = "student",
  disabled = false,
): StageGrantLearnerProfile {
  return { id, display_name: displayName, email, role, disabled };
}

function source(overrides: Partial<StageGrantLearnerSource> = {}): StageGrantLearnerSource {
  return {
    profiles: [],
    instructorLinks: [],
    assignedIds: new Set(),
    staffUnlockIds: new Set(),
    skillCheckUnlockIds: new Set(),
    prerequisiteSlugs: [],
    stagesBySlug: new Map(),
    clearedByUser: new Map(),
    enrolledByUser: new Map(),
    ...overrides,
  };
}

function query(overrides: Partial<StageGrantLearnerQuery> = {}): StageGrantLearnerQuery {
  return {
    q: "",
    status: "all",
    instructor: { type: "all" },
    prereq: "all",
    offset: 0,
    limit: 50,
    ...overrides,
  };
}

function parsedQuery(raw: Parameters<typeof parseStageGrantLearnerQuery>[0]) {
  const parsed = parseStageGrantLearnerQuery(raw);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

describe("parseStageGrantLearnerQuery", () => {
  it("検索語は全角半角と大文字小文字を揃え、前後の空白を外す", () => {
    expect(normalizeStageGrantSearch("  Ａｄａ  ")).toBe("ada");
    expect(parsedQuery({ q: "  ＫＥＮ  " }).q).toBe("ken");
  });

  it("limit は 1〜100 に丸め、省略と不正な offset は既定にする", () => {
    expect(parsedQuery({})).toMatchObject({ offset: 0, limit: 50, status: "all", prereq: "all" });
    expect(parsedQuery({ limit: "1000", offset: "20" })).toMatchObject({ limit: 100, offset: 20 });
    expect(parsedQuery({ limit: "0" }).limit).toBe(1);
    expect(parsedQuery({ limit: "x", offset: "-3" })).toMatchObject({ limit: 50, offset: 0 });
  });

  it("知らない status と prereq は拒否する", () => {
    expect(parseStageGrantLearnerQuery({ status: "gone" }).ok).toBe(false);
    expect(parseStageGrantLearnerQuery({ prereq: "started" }).ok).toBe(false);
  });

  it("instructor は all / mine / none / id に分ける", () => {
    expect(parsedQuery({ instructor: "mine" }).instructor).toEqual({ type: "mine" });
    expect(parsedQuery({ instructor: "none" }).instructor).toEqual({ type: "none" });
    expect(parsedQuery({ instructor: "teacher-2" }).instructor).toEqual({
      type: "id",
      id: "teacher-2",
    });
  });
});

describe("listStageGrantLearners", () => {
  const stagesBySlug = new Map([
    ["pre-a", { id: "stage-pre-a", title: "前提A" }],
    ["pre-b", { id: "stage-pre-b", title: "前提B" }],
  ]);

  function listed(overrides: Partial<StageGrantLearnerSource> = {}, listQuery = query()) {
    return listStageGrantLearners(
      source({
        profiles: [
          profile("ada", "山田", "Ada@Example.com"),
          profile("ken", "Ｋｅｎ", null),
          profile("sato", "佐藤"),
        ],
        prerequisiteSlugs: ["pre-a", "pre-b"],
        stagesBySlug,
        ...overrides,
      }),
      listQuery,
      "teacher-1",
    );
  }

  it("名前とメールを、全角半角と大文字小文字を無視して部分一致する", () => {
    expect(listed({}, query({ q: "ada" })).learners.map((row) => row.id)).toEqual(["ada"]);
    expect(listed({}, query({ q: "  ＡＤＡ " })).learners.map((row) => row.id)).toEqual(["ada"]);
    expect(listed({}, query({ q: "ken" })).learners.map((row) => row.id)).toEqual(["ken"]);
    expect(listed({}, query({ q: "ＫＥＮ" })).learners.map((row) => row.id)).toEqual(["ken"]);
  });

  it("割り当て・免除・担当・前提で絞り、件数は絞り込み前のまま", () => {
    const result = listed(
      {
        profiles: [
          profile("ada", "あ"),
          profile("ken", "い"),
          profile("sato", "う"),
          profile("old", "無効", "old@example.com", "student", true),
          profile("staff", "講師", "teacher@example.com", "instructor", false),
        ],
        assignedIds: new Set(["ada", "ken", "old"]),
        staffUnlockIds: new Set(["ada"]),
        instructorLinks: [
          { learnerId: "ada", instructorId: "teacher-1" },
          { learnerId: "ken", instructorId: "teacher-2" },
          { learnerId: "sato", instructorId: "teacher-2" },
        ],
        clearedByUser: new Map([["ada", new Set(["stage-pre-a", "stage-pre-b"])]]),
        enrolledByUser: new Map([["ken", new Set(["stage-pre-a"])]]),
      },
      query({ status: "unassigned" }),
    );
    expect(result.counts).toEqual({ learners: 4, assigned: 3, unassigned: 1, exempted: 1 });
    expect(result.learners.map((row) => row.id)).toEqual(["sato"]);
    expect(result.total).toBe(1);
    expect(
      listed(
        {
          profiles: [profile("ada", "あ"), profile("ken", "い"), profile("sato", "う")],
          assignedIds: new Set(["ada", "ken"]),
          staffUnlockIds: new Set(["ada"]),
          instructorLinks: [
            { learnerId: "ada", instructorId: "teacher-1" },
            { learnerId: "sato", instructorId: "teacher-2" },
          ],
        },
        query({ status: "exempted" }),
      ).learners.map((row) => row.id),
    ).toEqual(["ada"]);
    const base = {
      profiles: [profile("ada", "あ"), profile("ken", "い"), profile("sato", "う")],
      instructorLinks: [
        { learnerId: "ada", instructorId: "teacher-1" },
        { learnerId: "sato", instructorId: "teacher-2" },
      ],
    };
    expect(
      listed(base, query({ instructor: { type: "mine" } })).learners.map((row) => row.id),
    ).toEqual(["ada"]);
    expect(
      listed(base, query({ instructor: { type: "none" } })).learners.map((row) => row.id),
    ).toEqual(["ken"]);
    expect(
      listed(base, query({ instructor: { type: "id", id: "teacher-2" } })).learners.map(
        (row) => row.id,
      ),
    ).toEqual(["sato"]);
  });

  it("前提の 3 状態と、前提が空なら全員クリア済み", () => {
    const result = listed({
      assignedIds: new Set(["ada"]),
      clearedByUser: new Map([["ada", new Set(["stage-pre-a", "stage-pre-b"])]]),
      enrolledByUser: new Map([["ken", new Set(["stage-pre-a"])]]),
      skillCheckUnlockIds: new Set(["ada"]),
    });
    const byId = new Map(result.learners.map((row) => [row.id, row]));
    expect(byId.get("ada")).toMatchObject({
      prerequisites_cleared: true,
      prerequisite_status: "done",
      unlocked_by_skill_check: true,
      exempted: false,
    });
    expect(byId.get("ken")).toMatchObject({
      prerequisites_cleared: false,
      prerequisite_status: "doing",
    });
    expect(byId.get("sato")).toMatchObject({
      prerequisites_cleared: false,
      prerequisite_status: "none",
    });
    expect(result.prerequisites).toEqual([
      { id: "stage-pre-a", slug: "pre-a", title: "前提A" },
      { id: "stage-pre-b", slug: "pre-b", title: "前提B" },
    ]);

    const open = listStageGrantLearners(
      source({ profiles: [profile("ada", "山田"), profile("ken", "佐藤")] }),
      query({ prereq: "done" }),
      "teacher-1",
    );
    expect(open.learners).toHaveLength(2);
    expect(
      open.learners.every((row) => row.prerequisites_cleared && row.prerequisite_status === "done"),
    ).toBe(true);
    expect(
      listStageGrantLearners(
        source({ profiles: [profile("ada", "山田")] }),
        query({ prereq: "none" }),
        "teacher-1",
      ).total,
    ).toBe(0);
  });

  it("解けない前提 slug は一覧から落とし、クリア済みにはしない", () => {
    const result = listed({
      prerequisiteSlugs: ["pre-a", "missing"],
      clearedByUser: new Map([["ada", new Set(["stage-pre-a"])]]),
      enrolledByUser: new Map([["ada", new Set(["stage-pre-a"])]]),
    });
    expect(result.prerequisites).toEqual([{ id: "stage-pre-a", slug: "pre-a", title: "前提A" }]);
    expect(result.learners.find((row) => row.id === "ada")).toMatchObject({
      prerequisites_cleared: false,
      prerequisite_status: "doing",
    });
  });

  it("修了証だけの一部クリアは doing、全部なら done", () => {
    const result = listed({
      clearedByUser: new Map([
        ["ken", new Set(["stage-pre-a"])],
        ["ada", new Set(["stage-pre-a", "stage-pre-b"])],
      ]),
    });
    expect(result.learners.find((row) => row.id === "ken")?.prerequisite_status).toBe("doing");
    expect(result.learners.find((row) => row.id === "ada")?.prerequisite_status).toBe("done");
  });

  it("日本語の名前順、同名は id 順で、ページの次の位置を返す", () => {
    const profiles = [
      profile("b", "あ"),
      profile("a", "あ"),
      profile("c", "ん"),
      profile("d", "い"),
    ];
    const first = listStageGrantLearners(source({ profiles }), query({ limit: 2 }), "teacher-1");
    expect(first.learners.map((row) => row.id)).toEqual(["a", "b"]);
    expect(first.next_offset).toBe(2);
    expect(first.total).toBe(4);
    const second = listStageGrantLearners(
      source({ profiles }),
      query({ limit: 2, offset: 2 }),
      "teacher-1",
    );
    expect(second.learners.map((row) => row.id)).toEqual(["d", "c"]);
    expect(second.next_offset).toBeNull();
  });

  it("担当講師は名前順で、無効でも割り当てが残る人は選べない", () => {
    const result = listed({
      profiles: [
        profile("old", "無効", null, "student", true),
        profile("ada", "山田"),
        profile("teacher-2", "講師B", null, "instructor", false),
        profile("teacher-1", "講師A", null, "instructor", false),
      ],
      assignedIds: new Set(["old"]),
      instructorLinks: [
        { learnerId: "ada", instructorId: "teacher-2" },
        { learnerId: "old", instructorId: "teacher-1" },
      ],
    });
    expect(result.learners.map((row) => [row.id, row.selectable])).toEqual([
      ["ada", true],
      ["old", false],
    ]);
    expect(result.instructors).toEqual([
      { id: "teacher-1", display_name: "講師A" },
      { id: "teacher-2", display_name: "講師B" },
    ]);
  });
});

describe("countStageGrantLearners", () => {
  it("絞り込み前の人数を、割り当てと免除に分ける", () => {
    expect(
      countStageGrantLearners(
        [profile("ada", "あ"), profile("ken", "い"), profile("old", "う", null, "student", true)],
        new Set(["ada", "old"]),
        new Set(["old"]),
      ),
    ).toEqual({ learners: 3, assigned: 2, unassigned: 1, exempted: 1 });
  });
});
