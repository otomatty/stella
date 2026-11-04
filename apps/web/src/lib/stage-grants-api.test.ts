import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetch = vi.fn();
vi.mock("./api-client", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

const { applySavedStageGrants, formatSavedStageGrantsMessage, saveStageGrants } = await import(
  "./stage-grants-api"
);

function stage(id: string, title: string, profileIds: string[]) {
  return { id, slug: id, title, category: null, profile_ids: profileIds };
}

beforeEach(() => apiFetch.mockReset());

describe("saveStageGrants", () => {
  it("応答の ancestor_grants を返す", async () => {
    const ancestorGrants = [{ stage_id: "python", profile_ids: ["a"] }];
    apiFetch.mockResolvedValueOnce({
      stage_id: "devops",
      profile_ids: ["a"],
      ancestor_grants: ancestorGrants,
    });
    await expect(saveStageGrants("devops", ["a"])).resolves.toEqual({
      stage_id: "devops",
      profile_ids: ["a"],
      ancestor_grants: ancestorGrants,
    });
  });

  it("応答に ancestor_grants が無いときは空配列にする", async () => {
    apiFetch.mockResolvedValueOnce({ stage_id: "devops", profile_ids: ["a"] });
    await expect(saveStageGrants("devops", ["a"])).resolves.toEqual({
      stage_id: "devops",
      profile_ids: ["a"],
      ancestor_grants: [],
    });
  });
});

describe("applySavedStageGrants", () => {
  it("祖先の保存済みと下書きに足した受講者を和集合で入れる", () => {
    const stages = [stage("devops", "DevOps", []), stage("python", "Python", ["b"])];
    const drafts = { devops: ["a"], python: ["b"] };
    const next = applySavedStageGrants(
      stages,
      drafts,
      "devops",
      ["a"],
      [{ stage_id: "python", profile_ids: ["a", "b"] }],
    );
    expect(next.stages).toEqual([
      stage("devops", "DevOps", ["a"]),
      stage("python", "Python", ["b", "a"]),
    ]);
    expect(next.drafts).toEqual({ devops: ["a"], python: ["b", "a"] });
    expect(stages[1]?.profile_ids).toEqual(["b"]);
    expect(drafts.python).toEqual(["b"]);
  });

  it("祖先の未保存の編集を残して足した受講者だけを加える", () => {
    const stages = [stage("devops", "DevOps", []), stage("python", "Python", ["a", "b"])];
    const drafts = { devops: ["c"], python: ["b", "x"] };
    const next = applySavedStageGrants(
      stages,
      drafts,
      "devops",
      ["c"],
      [{ stage_id: "python", profile_ids: ["c"] }],
    );
    expect(next.stages.find((row) => row.id === "python")?.profile_ids).toEqual(["a", "b", "c"]);
    expect(next.drafts.python).toEqual(["b", "x", "c"]);
    expect(next.drafts.devops).toEqual(["c"]);
  });

  it("祖先が無ければ保存した講座だけが変わる", () => {
    const stages = [stage("devops", "DevOps", ["a"]), stage("python", "Python", ["b"])];
    const drafts = { devops: ["a", "c"], python: ["b", "x"] };
    const next = applySavedStageGrants(stages, drafts, "devops", ["a", "c"], []);
    expect(next.stages[0]).toEqual(stage("devops", "DevOps", ["a", "c"]));
    expect(next.stages[1]).toBe(stages[1]);
    expect(next.drafts).toEqual(drafts);
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
