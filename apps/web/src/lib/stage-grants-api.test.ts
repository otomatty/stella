import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetch = vi.fn();
vi.mock("./api-client", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

const { applySavedStageGrants, formatSavedStageGrantsMessage, listStageGrants, saveStageGrants } =
  await import("./stage-grants-api");

function stage(id: string, title: string, profileIds: string[], unlockedIds: string[] = []) {
  return {
    id,
    slug: id,
    title,
    category: null,
    profile_ids: profileIds,
    unlocked_profile_ids: unlockedIds,
  };
}

function draft(profileIds: string[], unlockedIds: string[] = []) {
  return { profileIds, unlockedIds };
}

beforeEach(() => apiFetch.mockReset());

describe("listStageGrants", () => {
  it("unlocked_profile_ids を返す", async () => {
    apiFetch.mockResolvedValueOnce({
      stages: [stage("devops", "DevOps", ["a"], ["a"])],
      learners: [],
    });
    await expect(listStageGrants()).resolves.toEqual({
      stages: [stage("devops", "DevOps", ["a"], ["a"])],
      learners: [],
    });
  });

  it("unlocked_profile_ids が無い講座は空配列にする", async () => {
    apiFetch.mockResolvedValueOnce({
      stages: [
        { id: "devops", slug: "devops", title: "DevOps", category: null, profile_ids: ["a"] },
      ],
      learners: [],
    });
    await expect(listStageGrants()).resolves.toEqual({
      stages: [stage("devops", "DevOps", ["a"])],
      learners: [],
    });
  });
});

describe("saveStageGrants", () => {
  it("応答の ancestor_grants を返す", async () => {
    const ancestorGrants = [{ stage_id: "python", profile_ids: ["a"] }];
    apiFetch.mockResolvedValueOnce({
      stage_id: "devops",
      profile_ids: ["a"],
      ancestor_grants: ancestorGrants,
    });
    await expect(saveStageGrants("devops", ["a"], [])).resolves.toEqual({
      stage_id: "devops",
      profile_ids: ["a"],
      unlocked_profile_ids: [],
      ancestor_grants: ancestorGrants,
    });
  });

  it("応答に ancestor_grants が無いときは空配列にする", async () => {
    apiFetch.mockResolvedValueOnce({ stage_id: "devops", profile_ids: ["a"] });
    await expect(saveStageGrants("devops", ["a"], [])).resolves.toEqual({
      stage_id: "devops",
      profile_ids: ["a"],
      unlocked_profile_ids: [],
      ancestor_grants: [],
    });
  });

  it("unlocked_profile_ids を送り、応答にあればそれを返す", async () => {
    apiFetch.mockResolvedValueOnce({
      stage_id: "devops",
      profile_ids: ["a", "b"],
      unlocked_profile_ids: ["b"],
      ancestor_grants: [],
    });
    await expect(saveStageGrants("devops", ["a", "b"], ["a", "b"])).resolves.toEqual({
      stage_id: "devops",
      profile_ids: ["a", "b"],
      unlocked_profile_ids: ["b"],
      ancestor_grants: [],
    });
    expect(apiFetch).toHaveBeenCalledWith("/api/stage-grants/devops", {
      method: "PUT",
      body: { profile_ids: ["a", "b"], unlocked_profile_ids: ["a", "b"] },
    });
  });

  it("応答に unlocked_profile_ids が無いときは送った値を使う", async () => {
    apiFetch.mockResolvedValueOnce({ stage_id: "devops", profile_ids: ["a"] });
    await expect(saveStageGrants("devops", ["a"], ["a"])).resolves.toEqual({
      stage_id: "devops",
      profile_ids: ["a"],
      unlocked_profile_ids: ["a"],
      ancestor_grants: [],
    });
  });
});

describe("applySavedStageGrants", () => {
  it("祖先の保存済みと下書きに足した受講者を和集合で入れる", () => {
    const stages = [stage("devops", "DevOps", []), stage("python", "Python", ["b"])];
    const drafts = { devops: draft(["a"]), python: draft(["b"]) };
    const next = applySavedStageGrants(
      stages,
      drafts,
      "devops",
      ["a"],
      [],
      [{ stage_id: "python", profile_ids: ["a", "b"] }],
    );
    expect(next.stages).toEqual([
      stage("devops", "DevOps", ["a"]),
      stage("python", "Python", ["b", "a"]),
    ]);
    expect(next.drafts).toEqual({ devops: draft(["a"]), python: draft(["b", "a"]) });
    expect(stages[1]?.profile_ids).toEqual(["b"]);
    expect(drafts.python).toEqual(draft(["b"]));
  });

  it("祖先の未保存の編集を残して足した受講者だけを加える", () => {
    const stages = [stage("devops", "DevOps", []), stage("python", "Python", ["a", "b"])];
    const drafts = { devops: draft(["c"]), python: draft(["b", "x"]) };
    const next = applySavedStageGrants(
      stages,
      drafts,
      "devops",
      ["c"],
      [],
      [{ stage_id: "python", profile_ids: ["c"] }],
    );
    expect(next.stages.find((row) => row.id === "python")?.profile_ids).toEqual(["a", "b", "c"]);
    expect(next.drafts.python).toEqual(draft(["b", "x", "c"]));
    expect(next.drafts.devops).toEqual(draft(["c"]));
  });

  it("祖先が無ければ保存した講座だけが変わる", () => {
    const stages = [stage("devops", "DevOps", ["a"]), stage("python", "Python", ["b"])];
    const drafts = { devops: draft(["a", "c"]), python: draft(["b", "x"]) };
    const next = applySavedStageGrants(stages, drafts, "devops", ["a", "c"], [], []);
    expect(next.stages[0]).toEqual(stage("devops", "DevOps", ["a", "c"]));
    expect(next.stages[1]).toBe(stages[1]);
    expect(next.drafts).toEqual(drafts);
  });

  it("保存した講座の入口だけを置き換え、祖先の入口は変えない", () => {
    const stages = [
      stage("devops", "DevOps", ["a"], ["old"]),
      stage("python", "Python", ["b"], ["b"]),
    ];
    const drafts = {
      devops: draft(["a"], ["a"]),
      python: draft(["b", "x"], ["b"]),
    };
    const next = applySavedStageGrants(
      stages,
      drafts,
      "devops",
      ["a"],
      ["a"],
      [{ stage_id: "python", profile_ids: ["a"] }],
    );
    expect(next.stages).toEqual([
      stage("devops", "DevOps", ["a"], ["a"]),
      stage("python", "Python", ["b", "a"], ["b"]),
    ]);
    expect(next.drafts).toEqual({
      devops: draft(["a"], ["a"]),
      python: draft(["b", "x", "a"], ["b"]),
    });
    expect(stages[1]?.unlocked_profile_ids).toEqual(["b"]);
    expect(drafts.python.unlockedIds).toEqual(["b"]);
  });

  it("応答の入口が送った値より少ないとき、保存した講座の下書きもそれに合わせる", () => {
    const stages = [stage("devops", "DevOps", ["a", "b"], [])];
    const drafts = { devops: draft(["a", "b"], ["a", "b"]) };
    const next = applySavedStageGrants(stages, drafts, "devops", ["a", "b"], ["a"], []);
    expect(next.stages[0]?.unlocked_profile_ids).toEqual(["a"]);
    expect(next.drafts.devops).toEqual(draft(["a", "b"], ["a"]));
    expect(drafts.devops.unlockedIds).toEqual(["a", "b"]);
  });
});

describe("formatSavedStageGrantsMessage", () => {
  const stages = [stage("python", "Python", []), stage("net", "ネットワーク", [])];

  it("祖先が無ければ保存した講座だけを告げる", () => {
    expect(formatSavedStageGrantsMessage("DevOps", stages, [])).toBe(
      "「DevOps」の割当を保存しました",
    );
  });

  it("祖先の講座名を「・」でつないで添える", () => {
    expect(
      formatSavedStageGrantsMessage("Kubernetes", stages, [
        { stage_id: "net", profile_ids: ["a"] },
        { stage_id: "python", profile_ids: ["a"] },
        { stage_id: "missing", profile_ids: ["a"] },
        { stage_id: "net", profile_ids: [] },
      ]),
    ).toBe(
      "「Kubernetes」の割当を保存しました。前の講座「ネットワーク・Python」にも割り当てました",
    );
  });
});
