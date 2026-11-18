import type { Submission } from "@stella/shared/review/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchSubmissions } from "@/lib/submissions-api";

vi.mock("@/lib/submissions-api", () => ({ fetchSubmissions: vi.fn() }));
vi.mock("@/lib/backend", () => ({ isBackendConfigured: () => true }));

const fetchMock = vi.mocked(fetchSubmissions);
const pendingSubmission: Submission = {
  id: "submission-1",
  studentName: "受講者",
  studentInitials: "受",
  avatarTone: "c1",
  stageTitle: "ステージ",
  assignmentTitle: "課題",
  codeLines: [],
  submittedAt: 1,
  status: "pending",
  priority: "normal",
  attempt: 1,
  aiReady: false,
  aiSuggestions: [],
  rubric: [],
  reviewNotes: "",
  verdict: null,
};

beforeEach(() => {
  vi.resetModules();
  fetchMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("提出一覧の取得", () => {
  it("取得に失敗したあと、件数や一覧を何度読んでも取り直さない", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    fetchMock.mockRejectedValue(new Error("取得に失敗"));
    const { countPending, listSubmissions } = await import("./submissions-store");

    expect(countPending()).toBe(0);
    await vi.waitFor(() => expect(errorLog).toHaveBeenCalledOnce());

    for (let i = 0; i < 3; i += 1) {
      expect(countPending()).toBe(0);
      expect(listSubmissions()).toEqual([]);
    }
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("取得に失敗しても refreshSubmissions で取り直し、成功した一覧を反映する", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    fetchMock.mockRejectedValueOnce(new Error("取得に失敗"));
    fetchMock.mockResolvedValueOnce([pendingSubmission]);
    const { countPending, listSubmissions, refreshSubmissions } = await import(
      "./submissions-store"
    );

    expect(listSubmissions()).toEqual([]);
    await vi.waitFor(() => expect(errorLog).toHaveBeenCalledOnce());

    await refreshSubmissions();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.waitFor(() => expect(listSubmissions()).toEqual([pendingSubmission]));
    expect(countPending()).toBe(1);
  });

  it("取得に成功したあとは、件数を何度読んでも取り直さない", async () => {
    fetchMock.mockResolvedValue([pendingSubmission]);
    const { countPending } = await import("./submissions-store");

    expect(countPending()).toBe(0);
    await vi.waitFor(() => expect(countPending()).toBe(1));

    for (let i = 0; i < 3; i += 1) {
      expect(countPending()).toBe(1);
    }
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
