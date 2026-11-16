import { beforeEach, expect, it, vi } from "vitest";
import { ApiClientError, apiFetch } from "./api-client";
import { revokeManualCompletion } from "./manual-completion-api";
vi.mock("./api-client", async (original) => ({
  ...(await original<typeof import("./api-client")>()),
  apiFetch: vi.fn(),
}));
beforeEach(() => vi.clearAllMocks());
it("409でも取り消せた分とblockedを読み出す", async () => {
  const result = {
    deleted: 2,
    blocked: [{ taskId: "fictional-task", reason: "本人の提出で合格済み" }],
  };
  vi.mocked(apiFetch).mockRejectedValue(new ApiClientError("409", 409, result));
  expect(
    await revokeManualCompletion({
      userId: "fictional-user",
      stageId: "fictional-stage",
      items: [{ taskId: "fictional-task" }],
    }),
  ).toEqual(result);
});
it("通常の失敗と形式の違う409は成功扱いしない", async () => {
  for (const error of [
    new ApiClientError("通信エラー", 500),
    new ApiClientError("競合", 409, { error: "競合" }),
  ]) {
    vi.mocked(apiFetch).mockRejectedValue(error);
    await expect(
      revokeManualCompletion({ userId: "fictional-user", stageId: "fictional-stage", items: [] }),
    ).rejects.toBe(error);
  }
});
