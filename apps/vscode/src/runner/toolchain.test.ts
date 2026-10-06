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

  it("Windows は PATHEXT が無ければ .COM・.EXE の順に試し、フォルダーの順を優先する", async () => {
    const tried: string[] = [];
    const found = await findExecutable("git", { Path: "C:\\a;C:\\b" }, "win32", async (file) => {
      tried.push(file);
      return file === "C:\\b\\git.exe";
    });
    expect(found).toBe("C:\\b\\git.exe");
    expect(tried).toEqual(["C:\\a\\git.com", "C:\\a\\git.exe", "C:\\b\\git.com", "C:\\b\\git.exe"]);
  });

  it("Windows の既定の PATHEXT (.BAT・.CMD・.JS など) から、.exe・.com 以外を除く", async () => {
    const tried: string[] = [];
    await findExecutable(
      "npm",
      { PATH: "C:\\nodejs", PATHEXT: ".COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC;.CPL" },
      "win32",
      async (file) => {
        tried.push(file);
        return false;
      },
    );
    expect(tried).toEqual(["C:\\nodejs\\npm.com", "C:\\nodejs\\npm.exe"]);
  });

  it("Windows の PATH の空の項目・末尾の区切り・引用符・日本語のフォルダーを扱う", async () => {
    const found = await findExecutable(
      "node",
      {
        PATH: ';;"C:\\Users\\山田 太郎\\AppData\\Local\\fnm_multishells\\123";C:\\Windows\\;',
        PATHEXT: ".EXE",
      },
      "win32",
      fakeFs(["C:\\Users\\山田 太郎\\AppData\\Local\\fnm_multishells\\123\\node.exe"]),
    );
    expect(found).toBe("C:\\Users\\山田 太郎\\AppData\\Local\\fnm_multishells\\123\\node.exe");
  });

  it("Windows の長いパス (260 文字を超える) もそのまま返す", async () => {
    const deep = `C:\\Users\\山田\\${"とても長いフォルダー名\\".repeat(30)}bin`;
    expect(deep.length).toBeGreaterThan(260);
    const found = await findExecutable(
      "node",
      { PATH: deep, PATHEXT: ".EXE" },
      "win32",
      fakeFs([`${deep}\\node.exe`]),
    );
    expect(found).toBe(`${deep}\\node.exe`);
  });

  it("macOS は区切りが : で、拡張子を付けずに探す", async () => {
    const found = await findExecutable(
      "node",
      { PATH: "/usr/bin:/Users/山田/.nvm/versions/node/v22.13.0/bin" },
      "darwin",
      fakeFs(["/Users/山田/.nvm/versions/node/v22.13.0/bin/node"]),
    );
    expect(found).toBe("/Users/山田/.nvm/versions/node/v22.13.0/bin/node");
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

  it("nvm-windows (日本語のユーザー名) は node.exe と同じフォルダーの npm-cli.js を使う", async () => {
    const dir = "C:\\Users\\山田 太郎\\AppData\\Roaming\\nvm\\v22.13.0";
    const npm = await resolveNpm(
      `${dir}\\node.exe`,
      { PATH: "C:\\nvm4w\\nodejs", PATHEXT: ".EXE;.CMD" },
      "win32",
      fakeFs([`${dir}\\node_modules\\npm\\bin\\npm-cli.js`, `${dir}\\npm.cmd`]),
      async (file) => file,
    );
    expect(npm).toEqual({
      file: `${dir}\\node.exe`,
      prefixArgs: [`${dir}\\node_modules\\npm\\bin\\npm-cli.js`],
    });
  });

  it("nvm-windows の symlink (C:\\nvm4w\\nodejs) は実体のフォルダーからも探す", async () => {
    const real = "C:\\Users\\yamada\\AppData\\Local\\nvm\\v24.1.0";
    const npm = await resolveNpm(
      "C:\\nvm4w\\nodejs\\node.exe",
      {},
      "win32",
      fakeFs([`${real}\\node_modules\\npm\\bin\\npm-cli.js`]),
      async () => `${real}\\node.exe`,
    );
    expect(npm?.prefixArgs).toEqual([`${real}\\node_modules\\npm\\bin\\npm-cli.js`]);
  });

  it("Windows の結果は常に Node.js か .exe で、.cmd・.ps1 を返さない", async () => {
    const env = { PATH: "C:\\Program Files\\nodejs", PATHEXT: ".COM;.EXE;.BAT;.CMD;.PS1" };
    const files = ["C:\\Program Files\\nodejs\\npm.cmd", "C:\\Program Files\\nodejs\\npm.ps1"];
    expect(await resolveNpm(null, env, "win32", fakeFs(files), async (f) => f)).toBeNull();
    const withCli = await resolveNpm(
      "C:\\Program Files\\nodejs\\node.exe",
      env,
      "win32",
      fakeFs([...files, "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js"]),
      async (f) => f,
    );
    expect(withCli?.file).toBe("C:\\Program Files\\nodejs\\node.exe");
    expect(withCli?.prefixArgs[0]).toMatch(/npm-cli\.js$/);
  });

  it("node.exe の場所が読めない (リンクの解決に失敗した) ときも、同じフォルダーと PATH から探す", async () => {
    const npm = await resolveNpm(
      "C:\\tools\\node.exe",
      { PATH: "C:\\npm" },
      "win32",
      fakeFs(["C:\\npm\\node_modules\\npm\\bin\\npm-cli.js"]),
      async () => {
        throw new Error("EPERM");
      },
    );
    expect(npm?.prefixArgs).toEqual(["C:\\npm\\node_modules\\npm\\bin\\npm-cli.js"]);
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

  it("日本語・空白を含む長いパスの課題フォルダーでも読む", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "stella-bin-"));
    const root = path.join(
      base,
      "山田 太郎",
      ...Array.from({ length: 30 }, () => "とても長いフォルダー名"),
    );
    expect(root.length).toBeGreaterThan(260);
    const dir = path.join(root, "node_modules", "vitest");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "package.json"),
      JSON.stringify({ version: "5.0.3", bin: { vitest: "./vitest.mjs" } }),
    );
    await writeFile(path.join(dir, "vitest.mjs"), "");
    expect(await resolvePackageBin(root, "vitest")).toEqual({
      file: path.join(dir, "vitest.mjs"),
      version: "5.0.3",
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
