import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  asCliPath,
  checkSubmitSizes,
  hashFile,
  isFileInRoot,
  listFiles,
  matchPatterns,
  readFileInRoot,
  UnsafePathError,
} from "./files.js";

async function makeTree(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "stella-files-"));
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, ...rel.split("/"));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  }
  return root;
}

describe("listFiles", () => {
  it("node_modules・.git・.stella には入らない", async () => {
    const root = await makeTree({
      "src/a.js": "",
      ".prettierrc.json": "{}",
      "node_modules/x/index.js": "",
      ".git/HEAD": "",
      ".stella/task.json": "{}",
      "tests/a.test.js": "",
    });
    expect(await listFiles(root)).toEqual([".prettierrc.json", "src/a.js", "tests/a.test.js"]);
  });

  it("上限を超えたら止める", async () => {
    const root = await makeTree({ "a.js": "", "b.js": "", "c.js": "" });
    await expect(listFiles(root, 2)).rejects.toThrow("2 件");
  });
});

describe("matchPatterns", () => {
  const files = ["src/a.js", "src/lib/b.js", "src/c.css", "tests/a.test.js", ".prettierrc.json"];

  it("glob に当たったファイルと、当たらなかった glob を返す", () => {
    expect(matchPatterns(files, ["src/**/*.js", "README.md"])).toEqual({
      files: ["src/a.js", "src/lib/b.js"],
      unmatched: ["README.md"],
    });
  });

  it("ドットで始まるファイルにも当てる", () => {
    expect(matchPatterns(files, [".prettierrc.json"]).files).toEqual([".prettierrc.json"]);
  });
});

describe("hashFile", () => {
  it("改行コードが違っても同じハッシュになる", async () => {
    const root = await makeTree({ "lf.js": "a\nb\n", "crlf.js": "a\r\nb\r\n" });
    const lf = await hashFile(root, "lf.js");
    const crlf = await hashFile(root, "crlf.js");
    expect(lf.sha256).toBe(crlf.sha256);
    expect(lf.bytes).toBe(4);
    expect(crlf.bytes).toBe(6);
  });
});

describe("課題フォルダーの外を読まない", () => {
  it("シンボリックリンクは一覧に出さず、読もうとしても拒む", async () => {
    const outside = await makeTree({ "secret.txt": "secret" });
    const root = await makeTree({ "a.js": "" });
    await symlink(path.join(outside, "secret.txt"), path.join(root, "link.txt"));
    await symlink(outside, path.join(root, "linked-dir"));
    expect(await listFiles(root)).toEqual(["a.js"]);
    await expect(readFileInRoot(root, "link.txt")).rejects.toBeInstanceOf(UnsafePathError);
    await expect(hashFile(root, "link.txt")).rejects.toBeInstanceOf(UnsafePathError);
    await expect(readFileInRoot(root, "linked-dir/secret.txt")).rejects.toBeInstanceOf(
      UnsafePathError,
    );
    expect(await isFileInRoot(root, "link.txt")).toBe(false);
    expect(await isFileInRoot(root, "../secret.txt")).toBe(false);
    expect(await isFileInRoot(root, "a.js")).toBe(true);
  });
});

describe("checkSubmitSizes", () => {
  it("1MB を超えるファイルを報告する", async () => {
    const root = await makeTree({ "big.txt": "x".repeat(1024 * 1024 + 1), "small.txt": "x" });
    const result = await checkSubmitSizes(root, ["big.txt", "small.txt"]);
    expect(result.problems).toEqual([{ path: "big.txt", reason: "too-large" }]);
    expect(result.tooMany).toBe(false);
  });
});

describe("asCliPath", () => {
  it("オプションと読まれないよう ./ を付ける", () => {
    expect(asCliPath("-rf.js")).toBe("./-rf.js");
  });
});
