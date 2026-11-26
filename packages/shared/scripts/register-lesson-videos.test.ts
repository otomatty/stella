import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { executeChunks } from "../../../apps/api/scripts/lib/d1-remote.js";
import {
  checkoutContentFingerprint,
  verifyRemoteContent,
} from "../../content/scripts/content-state.js";
import {
  SEED_INPUT_PATHS,
  fingerprintFrom,
} from "../../content/scripts/lib/content-fingerprint.js";
import { registerLessonVideos } from "./register-lesson-videos.js";

vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  return { ...fs, readFileSync: vi.fn(fs.readFileSync) };
});
vi.mock("@stella/content", () => ({ buildContentManifest: () => ({ stages: [] }) }));
vi.mock("../../content/scripts/content-state.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../content/scripts/content-state.js")>();
  return {
    ...actual,
    checkoutContentFingerprint: vi.fn(),
    verifyRemoteContent: vi.fn(actual.verifyRemoteContent),
  };
});
vi.mock("../../../apps/api/scripts/lib/d1-remote.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../apps/api/scripts/lib/d1-remote.js")>()),
  executeChunks: vi.fn(),
}));

const defaultManifest = resolve(import.meta.dirname, "../../content/dist/video-manifest.json");
const accountId = "test-account";
const databaseId = "12345678-1234-1234-1234-123456789abc";
const source = { checkoutFingerprint: "checkout", dirty: false };
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
    vi.mocked(checkoutContentFingerprint).mockReturnValue(source);
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
      "環境変数 CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID を設定してください。deploy で PDF_KEY_SALT を設定している場合は同じ値を設定してください。値が違うと指紋が合わず登録できません。",
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

  it.each([
    [undefined, false, "付帯ファイルがありません"],
    ["not json", false, "付帯ファイルを読み取れません"],
    [JSON.stringify({ ...source, dirty: true }), false, "上げたときの教材に未コミットの変更"],
    [
      JSON.stringify({ ...source, checkoutFingerprint: "previous" }),
      false,
      "教材指紋が今のチェックアウトと一致しません",
    ],
    [JSON.stringify(source), true, "今のチェックアウトの教材に未コミットの変更"],
  ])(
    "付帯ファイルが %s で現在の dirty が %s のときは通信前に止まる",
    async (body, dirty, reason) => {
      read.mockReturnValueOnce("{}").mockImplementationOnce(() => {
        if (body === undefined) throw Object.assign(new Error("file missing"), { code: "ENOENT" });
        return body;
      });
      vi.mocked(checkoutContentFingerprint).mockReturnValue({ ...source, dirty });

      await expect(registerLessonVideos()).rejects.toThrow(
        new RegExp(
          `${reason}.*このチェックアウトで .*video:sync .*--remote --tts gemini --cached-only から作り直してください`,
        ),
      );
      expect(fetchCloudflare).not.toHaveBeenCalled();
      expect(verifyRemoteContent).not.toHaveBeenCalled();
      expect(executeChunks).not.toHaveBeenCalled();
    },
  );

  it.each([
    [undefined, undefined],
    ["/custom/manifest.json", "test-salt"],
  ])(
    "VIDEO_MANIFEST が %s、PDF_KEY_SALT が %s のとき、同じ D1 ID で本番指紋を照合して登録する",
    async (file, salt) => {
      vi.stubEnv("VIDEO_MANIFEST", file);
      vi.stubEnv("PDF_KEY_SALT", salt);
      read
        .mockReturnValueOnce("{}")
        .mockReturnValueOnce(JSON.stringify(source))
        .mockReturnValueOnce(toml);
      const gitIndex = execFileSync("git", ["ls-files", "-s", "--", ...SEED_INPUT_PATHS], {
        cwd: resolve(import.meta.dirname, "../../.."),
        encoding: "utf8",
        maxBuffer: 256 * 1024 * 1024,
      });
      const fingerprint = fingerprintFrom(gitIndex, SEED_INPUT_PATHS, {
        pdfKeySalt: salt ? createHash("sha256").update(salt).digest("hex") : "none",
        d1DatabaseId: databaseId,
      });
      fetchCloudflare
        .mockResolvedValueOnce(
          Response.json({ success: true, result: [{ name: "stella-db", uuid: databaseId }] }),
        )
        .mockResolvedValueOnce(Response.json({ version: 1, fingerprint }));
      vi.mocked(executeChunks).mockResolvedValue({ rowsWritten: 0, counted: 0, missing: 0 });

      await registerLessonVideos();

      expect(read).toHaveBeenCalledWith(file ?? defaultManifest, "utf8");
      expect(read).toHaveBeenCalledWith(
        (file ?? defaultManifest).replace(/\.json$/, ".source.json"),
        "utf8",
      );
      expect(verifyRemoteContent).toHaveBeenCalledWith({ databaseId });
      expect(fetchCloudflare).toHaveBeenLastCalledWith(
        expect.stringContaining(
          "/r2/buckets/stella-materials-public/objects/deploy/content-state.json",
        ),
        expect.anything(),
      );
      expect(executeChunks).toHaveBeenCalledWith(
        { accountId, databaseId, apiToken: "test-token" },
        [],
      );
    },
  );
});
