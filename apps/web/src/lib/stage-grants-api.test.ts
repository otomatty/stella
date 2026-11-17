import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetch = vi.fn();
vi.mock("./api-client", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

const { listStageGrantLearners, listStageGrantDescendants, updateStageGrants } = await import(
  "./stage-grants-api"
);

beforeEach(() => apiFetch.mockReset());

const page = {
  stage: {
    id: "stage id",
    slug: "extra",
    title: "Extra",
    category: null,
    prerequisites: [],
  },
  counts: { learners: 1, assigned: 1, unassigned: 0, exempted: 0 },
  total: 1,
  next_offset: 50,
  learners: [],
};

describe("listStageGrantLearners", () => {
  it("検索と絞り込みとページをクエリにして、中断用の signal を渡す", async () => {
    apiFetch.mockResolvedValueOnce(page);
    const signal = new AbortController().signal;
    await expect(
      listStageGrantLearners(
        "stage id",
        {
          q: "山田",
          status: "assigned",
          prereq: "doing",
          offset: 50,
          limit: 25,
        },
        signal,
      ),
    ).resolves.toEqual(page);
    const params = new URLSearchParams({
      q: "山田",
      status: "assigned",
      prereq: "doing",
      offset: "50",
      limit: "25",
    });
    expect(apiFetch).toHaveBeenCalledWith(
      `/api/stage-grants/${encodeURIComponent("stage id")}/learners?${params.toString()}`,
      { signal },
    );
  });

  it("前提が未修了の絞り込みを prereq=not_done で送る", async () => {
    apiFetch.mockResolvedValueOnce(page);
    await listStageGrantLearners("stage id", { prereq: "not_done" });
    expect(apiFetch).toHaveBeenCalledWith(
      `/api/stage-grants/${encodeURIComponent("stage id")}/learners?prereq=not_done`,
      { signal: undefined },
    );
  });
});

describe("updateStageGrants", () => {
  it("差分を PATCH し、祖先の割当が無い応答は空配列にする", async () => {
    apiFetch.mockResolvedValueOnce({
      stage_id: "stage id",
      counts: { learners: 2, assigned: 1, unassigned: 1, exempted: 0 },
    });
    await expect(updateStageGrants("stage id", { add: ["a"], remove: ["b"] })).resolves.toEqual({
      stage_id: "stage id",
      counts: { learners: 2, assigned: 1, unassigned: 1, exempted: 0 },
      ancestor_grants: [],
      descendant_grants: [],
      descendant_removals: [],
    });
    expect(apiFetch).toHaveBeenCalledWith(`/api/stage-grants/${encodeURIComponent("stage id")}`, {
      method: "PATCH",
      body: { add: ["a"], remove: ["b"] },
    });
  });
});

it("続きの一覧を中断可能なリクエストで取得する", async () => {
  const stages = [{ id: "ch1", slug: "ch1", title: "第1章" }];
  apiFetch.mockResolvedValueOnce({ stages });
  const signal = new AbortController().signal;
  await expect(listStageGrantDescendants("stage id", signal)).resolves.toEqual({ stages });
  expect(apiFetch).toHaveBeenCalledWith("/api/stage-grants/stage%20id/descendants", { signal });
});

it.each([true, false])("descendants=%s を送り、続きの変更を返す", async (descendants) => {
  const changes = {
    descendant_grants: [{ stage_id: "ch1", profile_ids: ["a"] }],
    descendant_removals: [{ stage_id: "ch2", profile_ids: ["b"] }],
  };
  apiFetch.mockResolvedValueOnce(changes);
  await expect(
    updateStageGrants("stage id", { add: ["a"], remove: ["b"], descendants }),
  ).resolves.toMatchObject(changes);
  expect(apiFetch).toHaveBeenCalledWith("/api/stage-grants/stage%20id", {
    method: "PATCH",
    body: { add: ["a"], remove: ["b"], descendants },
  });
});
