import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "./release-shots.js";

const listArgs = ["list", "--changelog", "CHANGELOG.md", "--version", "1.2.0"];
const uploadArgs = [
  "upload",
  "--product",
  "vscode",
  "--version",
  "1.2.0+build",
  "--dir",
  "screenshots",
  "--out",
  "images.json",
];

type Dependencies = NonNullable<Parameters<typeof main>[1]>;

function mockDeps(baseUrl: string | undefined = "https://materials.example.test/public/") {
  const put = vi.fn().mockResolvedValue(undefined);
  return {
    env: { MATERIALS_BASE_URL: baseUrl },
    listFiles: vi.fn<Dependencies["listFiles"]>().mockResolvedValue(["learner-home.png"]),
    readText: vi.fn<Dependencies["readText"]>(),
    readFile: vi.fn<Dependencies["readFile"]>().mockResolvedValue(Buffer.from("abc")),
    writeFile: vi.fn<Dependencies["writeFile"]>().mockResolvedValue(undefined),
    createClient: vi.fn<Dependencies["createClient"]>().mockReturnValue({
      put,
    }),
    sleep: vi.fn<Dependencies["sleep"]>().mockResolvedValue(undefined),
    put,
  };
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("list", () => {
  it("対象の版から初出順に名前を重複なしで 1 行に出す", async () => {
    const deps = mockDeps();
    deps.readText.mockResolvedValue(
      "## [1.2.0] - 2026-11-24\n### ホーム\n![画面](shot:learner-home)\n![まとめ](shot:lesson-summary)\n### 一覧\n![画面](shot:learner-home)\n## [1.1.0]\n![以前](shot:older)",
    );
    await expect(main(listArgs, deps)).resolves.toBe(0);
    expect(deps.readText).toHaveBeenCalledExactlyOnceWith("CHANGELOG.md");
    expect(console.log).toHaveBeenCalledExactlyOnceWith("learner-home,lesson-summary");
  });

  it("画像が無ければ空行を出す", async () => {
    const deps = mockDeps();
    deps.readText.mockResolvedValue("## 1.2.0\n- 説明");
    await expect(main(listArgs, deps)).resolves.toBe(0);
    expect(console.log).toHaveBeenCalledExactlyOnceWith("");
  });

  it.each(["## 1.2.1\n- 別の版", "## 1.2.0\n![入力](shot:Bad_name)"])(
    "対象の節が無いか、画像の書き方が不正なら失敗する",
    async (markdown) => {
      const deps = mockDeps();
      deps.readText.mockResolvedValue(markdown);
      await expect(main(listArgs, deps)).resolves.toBe(1);
      expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/^::error::/));
      expect(console.log).not.toHaveBeenCalled();
    },
  );
});

describe("upload", () => {
  it("PNG を内容ハッシュ付きのキーで put し、公開 URL の台帳を書く", async () => {
    const deps = mockDeps();
    deps.listFiles.mockResolvedValue(["learner-home.png", "ignored.txt"]);
    const key = "release-notes/vscode/1.2.0+build/learner-home-ba7816bf8f01cfea.png";

    await expect(main(uploadArgs, deps)).resolves.toBe(0);
    expect(deps.createClient).toHaveBeenCalledExactlyOnceWith("stella-materials-public", deps.env);
    expect(deps.readFile).toHaveBeenCalledExactlyOnceWith(join("screenshots", "learner-home.png"));
    expect(deps.put).toHaveBeenCalledExactlyOnceWith(key, Buffer.from("abc"), "image/png");
    expect(deps.writeFile).toHaveBeenCalledExactlyOnceWith("images.json", expect.any(String));
    expect(JSON.parse(deps.writeFile.mock.calls[0][1])).toEqual({
      shots: { "learner-home": { url: `https://materials.example.test/public/${key}` } },
    });
  });

  it("PNG が無ければ空の台帳を書く", async () => {
    const deps = mockDeps();
    deps.listFiles.mockResolvedValue(["ignored.txt"]);
    await expect(main(uploadArgs, deps)).resolves.toBe(0);
    expect(deps.createClient).not.toHaveBeenCalled();
    expect(JSON.parse(deps.writeFile.mock.calls[0][1])).toEqual({ shots: {} });
  });

  it("一時的な put の失敗は再試行し、成功したら台帳を書く", async () => {
    const deps = mockDeps();
    deps.put.mockRejectedValueOnce(new Error("R2 PUT failed (HTTP 503)"));

    await expect(main(uploadArgs, deps)).resolves.toBe(0);
    expect(deps.put).toHaveBeenCalledTimes(2);
    expect(deps.put.mock.calls[1]).toEqual(deps.put.mock.calls[0]);
    expect(deps.sleep).toHaveBeenCalledExactlyOnceWith(1000);
    expect(deps.writeFile).toHaveBeenCalledExactlyOnceWith("images.json", expect.any(String));
  });

  it("put が 3 回失敗したら最後のエラーを表示し、台帳を書かない", async () => {
    const deps = mockDeps();
    deps.put
      .mockRejectedValueOnce(new Error("R2 PUT failed (HTTP 503)"))
      .mockRejectedValueOnce(new Error("R2 PUT failed (HTTP 502)"))
      .mockRejectedValueOnce(new Error("R2 PUT failed (HTTP 500)"));

    await expect(main(uploadArgs, deps)).resolves.toBe(1);
    expect(deps.put).toHaveBeenCalledTimes(3);
    expect(deps.sleep.mock.calls).toEqual([[1000], [2000]]);
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      "::error::スクリーンショットの処理に失敗しました (R2 PUT failed (HTTP 500))",
    );
    expect(deps.writeFile).not.toHaveBeenCalled();
  });

  it.each(["z_invalid.png", "z-large.png"])(
    "%s があれば他の PNG も put しない",
    async (filename) => {
      const deps = mockDeps();
      deps.listFiles.mockResolvedValue(["learner-home.png", filename]);
      deps.readFile.mockResolvedValueOnce(Buffer.from("abc"));
      deps.readFile.mockResolvedValueOnce(new Uint8Array(5 * 1024 * 1024 + 1));

      await expect(main(uploadArgs, deps)).resolves.toBe(1);
      expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/^::error::/));
      expect(deps.createClient).not.toHaveBeenCalled();
      expect(deps.writeFile).not.toHaveBeenCalled();
    },
  );

  it.each(["", "http://materials.example.test/", "https:"])(
    "公開先 URL が不正なら処理を開始しない",
    async (baseUrl) => {
      const deps = mockDeps(baseUrl);
      await expect(main(uploadArgs, deps)).resolves.toBe(1);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining("MATERIALS_BASE_URL"));
      expect(deps.listFiles).not.toHaveBeenCalled();
      expect(deps.createClient).not.toHaveBeenCalled();
    },
  );

  it("バージョンがキーの階層を変える場合は拒否する", async () => {
    const deps = mockDeps();
    const args = uploadArgs.map((arg) => (arg === "1.2.0+build" ? "../latest" : arg));
    await expect(main(args, deps)).resolves.toBe(1);
    expect(deps.createClient).not.toHaveBeenCalled();
  });
});
