import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest, apiSession } from "./api.js";
import { sendLocalRunReport } from "./local-run-report.js";

vi.mock("./api.js", () => ({ apiRequest: vi.fn(), apiSession: vi.fn() }));

const request = vi.mocked(apiRequest);
const session = vi.mocked(apiSession);
const receipt = { taskId: "course/unit/task", contentHash: "ab".repeat(32) };
const failed = { outcome: "failed" as const, steps: [] };
const passed = { outcome: "passed" as const, steps: [] };

beforeEach(() => {
  request.mockReset().mockResolvedValue({});
  session.mockReset().mockReturnValue(1);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sendLocalRunReport", () => {
  it("先の報告が終わるまで待ち、確認した順に送る", async () => {
    let releaseFirst: () => void = () => undefined;
    request.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        releaseFirst = resolve;
      }),
    );
    const first = sendLocalRunReport(failed, receipt);
    const second = sendLocalRunReport(passed, receipt);
    session.mockReturnValue(2);
    try {
      await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
      expect(request).toHaveBeenNthCalledWith(
        1,
        "/api/tasks/local-runs",
        expect.objectContaining({ body: expect.objectContaining({ outcome: "failed" }) }),
      );
    } finally {
      releaseFirst();
      await Promise.all([first, second]);
    }
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenNthCalledWith(
      2,
      "/api/tasks/local-result",
      expect.objectContaining({ body: expect.objectContaining({ outcome: "passed" }), session: 1 }),
    );
  });

  it("先の報告が失敗しても、呼び出し元に失敗を返し、次の報告を送る", async () => {
    const error = new Error("offline");
    request.mockRejectedValueOnce(error);
    const first = sendLocalRunReport(failed, receipt);
    const second = sendLocalRunReport(passed, receipt);
    await expect(first).rejects.toBe(error);
    await expect(second).resolves.toBeUndefined();
    expect(request.mock.calls.map(([path]) => path)).toEqual([
      "/api/tasks/local-runs",
      "/api/tasks/local-result",
    ]);
  });

  it("報告ごとに 15 秒のタイムアウトを設定する", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    await sendLocalRunReport(passed, receipt);
    await sendLocalRunReport(failed, receipt);
    expect(timeout.mock.calls).toEqual([[15_000], [15_000]]);
    expect(request).toHaveBeenNthCalledWith(
      1,
      "/api/tasks/local-result",
      expect.objectContaining({ signal: timeout.mock.results[0]?.value }),
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      "/api/tasks/local-runs",
      expect.objectContaining({ signal: timeout.mock.results[1]?.value }),
    );
  });
});
