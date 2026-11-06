import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetch = vi.fn();
vi.mock("./api-client", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}));

const { listStageGrantLearners, updateStageGrants } = await import("./stage-grants-api");

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
  instructors: [],
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
          instructor: "mine",
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
      instructor: "mine",
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
    });
    expect(apiFetch).toHaveBeenCalledWith(`/api/stage-grants/${encodeURIComponent("stage id")}`, {
      method: "PATCH",
      body: { add: ["a"], remove: ["b"] },
    });
  });
});
