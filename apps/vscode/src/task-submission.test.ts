import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { submissionFixture } from "@stella/shared/testing/task-submission";
import {
  prepareTaskSubmission,
  readRecordedSupport,
  sendTaskSubmission,
} from "./task-submission.js";
import { apiRequest } from "./api.js";

vi.mock("./api.js", () => ({ apiRequest: vi.fn() }));
describe("確認した課題の提出", () => {
  let root: string;
  let fixture: Awaited<ReturnType<typeof submissionFixture>>;
  const notes = { explanation: "実装の説明", support: [] };
  beforeEach(async () => {
    vi.clearAllMocks();
    root = await mkdtemp(path.join(tmpdir(), "stella-submit-"));
    fixture = await submissionFixture();
    for (const [file, content] of Object.entries(fixture.bundle.files)) {
      await mkdir(path.dirname(path.join(root, file)), { recursive: true });
      await writeFile(path.join(root, file), Buffer.from(content, "base64"));
    }
    await writeFile(
      path.join(root, ".stella/last-run.json"),
      JSON.stringify(fixture.input.localResult),
    );
    await writeFile(
      path.join(root, ".stella/distribution.json"),
      JSON.stringify({ taskId: fixture.input.taskId, contentHash: fixture.bundle.contentHash }),
    );
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });
  it("submit.files だけを送る。README・テスト・無関係なファイルは送らない", async () => {
    await writeFile(path.join(root, "secret.txt"), "secret");
    const body = await prepareTaskSubmission(root, "submit", notes, fixture.bundle);
    expect(body.files.map((f) => f.path)).toEqual(["index.html"]);
    expect(body.protected).toEqual(fixture.input.protected);
    expect(body.contentHash).toBe(fixture.bundle.contentHash);
  });
  it.each(["index.html", "tests/config.json", ".stella/task.json"])(
    "確認後の変更 %s は再確認を求める",
    async (file) => {
      if (file === ".stella/task.json")
        await writeFile(path.join(root, file), `${fixture.manifestText}\n`);
      else await writeFile(path.join(root, file), "changed");
      await expect(prepareTaskSubmission(root, "submit", notes, fixture.bundle)).rejects.toThrow(
        "もう一度確認",
      );
    },
  );
  it("失敗した結果は相談として送る", async () => {
    fixture.input.localResult.outcome = "failed";
    await writeFile(
      path.join(root, ".stella/last-run.json"),
      JSON.stringify(fixture.input.localResult),
    );
    await expect(prepareTaskSubmission(root, "submit", notes, fixture.bundle)).rejects.toThrow(
      "すべて通って",
    );
    expect((await prepareTaskSubmission(root, "consult", notes, fixture.bundle)).mode).toBe(
      "consult",
    );
  });
  it("配布記録が無い結果は最新の版として送らない", async () => {
    await rm(path.join(root, ".stella/distribution.json"));
    await expect(prepareTaskSubmission(root, "submit", notes, fixture.bundle)).rejects.toThrow(
      "配布した課題の記録がありません",
    );
  });
  it("教材更新後も実行時の版で提出し、配布記録の置き換えは再確認を求める", async () => {
    fixture.input.localResult.taskContentHash = fixture.bundle.contentHash;
    await writeFile(
      path.join(root, ".stella/last-run.json"),
      JSON.stringify(fixture.input.localResult),
    );
    const current = { ...fixture.bundle, contentHash: "b".repeat(64) };
    expect((await prepareTaskSubmission(root, "submit", notes, current)).contentHash).toBe(
      fixture.bundle.contentHash,
    );
    await writeFile(
      path.join(root, ".stella/distribution.json"),
      JSON.stringify({ taskId: fixture.input.taskId, contentHash: current.contentHash }),
    );
    await expect(prepareTaskSubmission(root, "submit", notes, current)).rejects.toThrow(
      "課題の版が変わっています",
    );
  });
  it("リンク先の提出ファイルと支援記録は読み出さない", async () => {
    await rm(path.join(root, "index.html"));
    await symlink(path.join(root, "README.md"), path.join(root, "index.html"));
    await expect(prepareTaskSubmission(root, "submit", notes, fixture.bundle)).rejects.toThrow(
      "もう一度確認",
    );
    await symlink(path.join(root, "README.md"), path.join(root, ".stella/support.json"));
    await expect(readRecordedSupport(root)).rejects.toThrow();
  });
  it("API に結果とファイルをまとめて送る", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({ bundle: fixture.bundle })
      .mockResolvedValueOnce({ row: { id: "submission", attempt: 2 } });
    expect(await sendTaskSubmission(root, "submit", notes)).toEqual({
      id: "submission",
      attempt: 2,
    });
    expect(vi.mocked(apiRequest).mock.calls[1]).toEqual([
      "/api/submissions",
      {
        method: "POST",
        body: expect.objectContaining({
          taskId: fixture.input.taskId,
          explanation: notes.explanation,
          localResult: fixture.input.localResult,
        }),
      },
    ]);
  });
});
