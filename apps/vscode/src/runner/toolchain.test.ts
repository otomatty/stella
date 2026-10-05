import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findExecutable, readEnv, resolveNpm, resolvePackageBin } from "./toolchain.js";

function fakeFs(files: string[]) {
  const set = new Set(files);
  return async (file: string) => set.has(file);
}

describe("findExecutable", () => {
  it("POSIX は PATH の順に探す", async () => {
    const found = await findExecutable(
      "node",
      { PATH: "/usr/bin:/opt/node/bin" },
      "linux",
      fakeFs(["/opt/node/bin/node", "/usr/local/bin/node"]),
    );
    expect(found).toBe("/opt/node/bin/node");
  });

  it("Windows は PATHEXT の .exe を付けて探し、環境変数名の大小を問わない", async () => {
    const found = await findExecutable(
      "node",
      { Path: 'C:\\Windows;"C:\\Program Files\\nodejs"', PATHEXT: ".COM;.EXE;.BAT;.CMD" },
      "win32",
      fakeFs(["C:\\Program Files\\nodejs\\node.exe"]),
    );
    expect(found).toBe("C:\\Program Files\\nodejs\\node.exe");
  });

  it("Windows の .cmd / .bat はシェル無しで起動できないので探さない", async () => {
    const found = await findExecutable(
      "npm",
      { PATH: "C:\\tools", PATHEXT: ".COM;.EXE;.BAT;.CMD" },
      "win32",
      fakeFs(["C:\\tools\\npm.cmd", "C:\\tools\\npm.bat"]),
    );
    expect(found).toBeNull();
  });

  it("見つからなければ null", async () => {
    expect(await findExecutable("git", {}, "darwin", fakeFs([]))).toBeNull();
  });
});

describe("readEnv", () => {
  it("名前の大小を区別しない", () => {
    expect(readEnv({ Path: "a" }, "PATH")).toBe("a");
  });
});

describe("resolveNpm", () => {
  it("Windows は node.exe と同じフォルダーの npm-cli.js を Node.js で動かす", async () => {
    const npm = await resolveNpm(
      "C:\\Program Files\\nodejs\\node.exe",
      {},
      "win32",
      fakeFs(["C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js"]),
      async (file) => file,
    );
    expect(npm).toEqual({
      file: "C:\\Program Files\\nodejs\\node.exe",
      prefixArgs: ["C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js"],
    });
  });

  it("Homebrew のようなシンボリックリンクは実体の場所からも探す", async () => {
    const npm = await resolveNpm(
      "/opt/homebrew/bin/node",
      {},
      "darwin",
      fakeFs(["/opt/homebrew/Cellar/node/24.1.0/lib/node_modules/npm/bin/npm-cli.js"]),
      async () => "/opt/homebrew/Cellar/node/24.1.0/bin/node",
    );
    expect(npm?.prefixArgs).toEqual([
      "/opt/homebrew/Cellar/node/24.1.0/lib/node_modules/npm/bin/npm-cli.js",
    ]);
  });

  it("npm.cmd だけが PATH にある場合は、その隣の npm-cli.js を Node.js で動かす", async () => {
    const npm = await resolveNpm(
      "C:\\volta\\node.exe",
      { PATH: "C:\\volta;C:\\npm-global", PATHEXT: ".EXE;.CMD" },
      "win32",
      fakeFs(["C:\\npm-global\\npm.cmd", "C:\\npm-global\\node_modules\\npm\\bin\\npm-cli.js"]),
      async (file) => file,
    );
    expect(npm).toEqual({
      file: "C:\\volta\\node.exe",
      prefixArgs: ["C:\\npm-global\\node_modules\\npm\\bin\\npm-cli.js"],
    });
  });

  it("npm-cli.js が見つからなければ .exe のシムを使い、.cmd しか無ければ見つからない扱い", async () => {
    const env = { PATH: "C:\\shims", PATHEXT: ".EXE;.CMD" };
    const exe = await resolveNpm(
      null,
      env,
      "win32",
      fakeFs(["C:\\shims\\npm.exe"]),
      async (f) => f,
    );
    expect(exe).toEqual({ file: "C:\\shims\\npm.exe", prefixArgs: [] });
    const cmdOnly = await resolveNpm(
      null,
      env,
      "win32",
      fakeFs(["C:\\shims\\npm.cmd"]),
      async (f) => f,
    );
    expect(cmdOnly).toBeNull();
  });
});

describe("resolvePackageBin", () => {
  it("package.json の bin を読む", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "stella-bin-"));
    const dir = path.join(root, "node_modules", "@playwright", "test");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "package.json"),
      JSON.stringify({ version: "1.63.0", bin: { playwright: "cli.js" } }),
    );
    await writeFile(path.join(dir, "cli.js"), "");
    expect(await resolvePackageBin(root, "@playwright/test", "playwright")).toEqual({
      file: path.join(dir, "cli.js"),
      version: "1.63.0",
    });
  });

  it("パッケージの外を指す bin や、入っていないパッケージは null", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "stella-bin-"));
    const dir = path.join(root, "node_modules", "evil");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "package.json"), JSON.stringify({ bin: "../../outside.js" }));
    expect(await resolvePackageBin(root, "evil")).toBeNull();
    expect(await resolvePackageBin(root, "vitest")).toBeNull();
  });
});
