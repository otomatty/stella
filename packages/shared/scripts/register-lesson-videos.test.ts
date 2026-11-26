import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { executeChunks } from "../../../apps/api/scripts/lib/d1-remote.js";
import { verifyRemoteContent } from "../../content/scripts/content-state.js";
import { registerLessonVideos } from "./register-lesson-videos.js";

vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  return { ...fs, readFileSync: vi.fn(fs.readFileSync) };
});
vi.mock("@stella/content", () => ({ buildContentManifest: () => ({ stages: [] }) }));
vi.mock("../../content/scripts/content-state.js", () => ({ verifyRemoteContent: vi.fn() }));
vi.mock("../../../apps/api/scripts/lib/d1-remote.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../apps/api/scripts/lib/d1-remote.js")>()),
  executeChunks: vi.fn(),
}));

const defaultManifest = resolve(import.meta.dirname, "../../content/dist/video-manifest.json");
const accountId = "test-account";
const databaseId = "12345678-1234-1234-1234-123456789abc";
const toml = `account_id = "${accountId}"
[[d1_databases]]
database_name = "stella-db"
database_id = "00000000-0000-0000-0000-000000000000"`;

describe("registerLessonVideos", () => {
  const fetchCloudflare = vi.fn<typeof fetch>();
  const readUtf8: (path: string, encoding: "utf8") => string = readFileSync;
  const read = vi.mocked(readUtf8);

  beforeEach(() => {
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "test-token");
    vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", accountId);
    vi.stubEnv("PDF_KEY_SALT", "test-salt");
    vi.stubEnv("VIDEO_MANIFEST", undefined);
    vi.stubGlobal("fetch", fetchCloudflare);
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("未設定の環境変数をまとめて表示する", async () => {
    vi.stubEnv("CLOUDFLARE_API_TOKEN", undefined);
    vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", undefined);
    vi.stubEnv("PDF_KEY_SALT", undefined);

    await expect(registerLessonVideos()).rejects.toThrow(
      "環境変数 CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, PDF_KEY_SALT を設定してください。PDF_KEY_SALT は deploy の GitHub Secret と同じ値が必要です。",
    );
    expect(fetchCloudflare).not.toHaveBeenCalled();
  });

  it("既定の manifest が無ければ作成コマンドを案内する", async () => {
    read.mockImplementationOnce(() => {
      throw Object.assign(new Error("file missing"), { code: "ENOENT" });
    });

    await expect(registerLessonVideos()).rejects.toThrow(/video-manifest\.json.*--cached-only/);
    expect(read).toHaveBeenCalledWith(defaultManifest, "utf8");
    expect(fetchCloudflare).not.toHaveBeenCalled();
  });

  it.each([undefined, "/custom/manifest.json"])(
    "VIDEO_MANIFEST が %s のときの manifest を読み、同じ D1 ID で照合して登録する",
    async (file) => {
      vi.stubEnv("VIDEO_MANIFEST", file);
      read.mockReturnValueOnce("{}").mockReturnValueOnce(toml);
      fetchCloudflare.mockResolvedValueOnce(
        Response.json({ success: true, result: [{ name: "stella-db", uuid: databaseId }] }),
      );
      vi.mocked(executeChunks).mockResolvedValue({ rowsWritten: 0, counted: 0, missing: 0 });

      await registerLessonVideos();

      expect(read).toHaveBeenCalledWith(file ?? defaultManifest, "utf8");
      expect(verifyRemoteContent).toHaveBeenCalledWith({ databaseId });
      expect(executeChunks).toHaveBeenCalledWith(
        { accountId, databaseId, apiToken: "test-token" },
        [],
      );
    },
  );
});
