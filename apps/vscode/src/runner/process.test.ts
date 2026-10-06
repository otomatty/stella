import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  childEnv,
  type KillTreeDeps,
  killTree,
  runProcess,
  spawnOptions,
  stripAnsi,
  tailLines,
  windowsTreeKill,
} from "./process.js";

const node = process.execPath;
const base = { file: node, cwd: tmpdir(), env: process.env, timeoutMs: 10_000 };

describe("runProcess", () => {
  it("stdout と stderr を分けて受け取り、終了コードを返す", async () => {
    const out = await runProcess({
      ...base,
      args: ["-e", "process.stdout.write('out'); process.stderr.write('err'); process.exit(3)"],
    });
    expect(out).toMatchObject({
      exitCode: 3,
      stdout: "out",
      stderr: "err",
      timedOut: false,
      aborted: false,
    });
  });

  it("シェルを通さないので、引数の記号はそのまま渡る", async () => {
    const out = await runProcess({
      ...base,
      args: ["-e", "process.stdout.write(process.argv[1])", "a; echo hacked && $(x)"],
    });
    expect(out.stdout).toBe("a; echo hacked && $(x)");
  });

  it("時間切れで止める", async () => {
    const out = await runProcess({
      ...base,
      args: ["-e", "setInterval(() => {}, 1000)"],
      timeoutMs: 300,
    });
    expect(out.timedOut).toBe(true);
    expect(out.exitCode).not.toBe(0);
  });

  it("中断で止める", async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 200);
    const out = await runProcess(
      { ...base, args: ["-e", "setInterval(() => {}, 1000)"] },
      { signal: controller.signal },
    );
    expect(out.aborted).toBe(true);
  });

  it("出力は末尾だけを残す", async () => {
    const out = await runProcess(
      { ...base, args: ["-e", "process.stdout.write('a'.repeat(5000) + 'END')"] },
      { maxOutputChars: 100 },
    );
    expect(out.truncated).toBe(true);
    expect(out.stdout).toHaveLength(100);
    expect(out.stdout.endsWith("END")).toBe(true);
  });

  it("始める前に中断されていれば、起動せずに中断として返す", async () => {
    const controller = new AbortController();
    controller.abort();
    const out = await runProcess(
      { ...base, args: ["-e", "require('node:fs').writeFileSync('should-not-run', '')"] },
      { signal: controller.signal },
    );
    expect(out).toMatchObject({ aborted: true, exitCode: null, stdout: "", timedOut: false });
  });

  it("起動できなければ spawnError", async () => {
    const out = await runProcess({ ...base, file: "/no/such/binary", args: [] });
    expect(out.spawnError).toBe("ENOENT");
  });
});

describe("子プロセスごと止める", () => {
  function isRunning(pid: number): boolean {
    try {
      // Linux では、止まったが親に回収されていないプロセス (状態 Z) も残るので、状態を見る。
      const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
      return stat.slice(stat.lastIndexOf(")") + 2)[0] !== "Z";
    } catch {
      // /proc が無い (macOS) か、もう回収された。
    }
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  it.skipIf(process.platform === "win32")(
    "時間切れのとき、孫のプロセスも止める (POSIX はプロセスグループ)",
    async () => {
      // 子が孫を起動し、孫の pid を出力してから待ち続ける (npm が Vitest を起動するのと同じ形)。
      const script = [
        "const { spawn } = require('node:child_process');",
        "const grandchild = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });",
        "process.stdout.write(String(grandchild.pid));",
        "setInterval(() => {}, 1000);",
      ].join("\n");
      const out = await runProcess({ ...base, args: ["-e", script], timeoutMs: 1000 });
      expect(out.timedOut).toBe(true);
      const grandchild = Number(out.stdout);
      expect(grandchild).toBeGreaterThan(0);
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(isRunning(grandchild)).toBe(false);
    },
  );

  function recorder() {
    const calls: { spawn: [string, string[], object][]; kill: [number, string][] } = {
      spawn: [],
      kill: [],
    };
    const deps: KillTreeDeps = {
      spawn: (file, args, options) => {
        calls.spawn.push([file, args, options]);
        return { on: () => ({}) as never };
      },
      kill: (pid, signal) => {
        calls.kill.push([pid, signal]);
      },
      env: { SystemRoot: "D:\\WINDOWS" },
    };
    return { calls, deps };
  }

  it("Windows は taskkill /T /F で子孫ごと止め、シェルを通さない", () => {
    const { calls, deps } = recorder();
    killTree(4321, "win32", deps);
    expect(calls.kill).toEqual([]);
    expect(calls.spawn).toEqual([
      [
        "D:\\WINDOWS\\System32\\taskkill.exe",
        ["/pid", "4321", "/T", "/F"],
        { windowsHide: true, stdio: "ignore", shell: false },
      ],
    ]);
  });

  it("macOS・Linux はプロセスグループ (負の pid) に SIGKILL を送る", () => {
    for (const platform of ["darwin", "linux"] as const) {
      const { calls, deps } = recorder();
      killTree(4321, platform, deps);
      expect(calls.spawn).toEqual([]);
      expect(calls.kill).toEqual([[-4321, "SIGKILL"]]);
    }
  });

  it("すでに終わったプロセスを止めようとしても例外を出さない", () => {
    const { deps } = recorder();
    deps.kill = () => {
      throw Object.assign(new Error("kill ESRCH"), { code: "ESRCH" });
    };
    expect(() => killTree(1, "linux", deps)).not.toThrow();
  });

  it("taskkill は SystemRoot から決め打ちで探す (名前の大小を問わず、無ければ C:\\Windows)", () => {
    expect(windowsTreeKill(10, { SYSTEMROOT: "C:\\Windows\\" }).file).toBe(
      "C:\\Windows\\System32\\taskkill.exe",
    );
    expect(windowsTreeKill(10, {}).file).toBe("C:\\Windows\\System32\\taskkill.exe");
    // PATH に別の taskkill.exe があっても使わない。
    expect(windowsTreeKill(10, { PATH: "C:\\task", SystemRoot: "C:\\Windows" }).file).toBe(
      "C:\\Windows\\System32\\taskkill.exe",
    );
  });

  it("起動はどの OS でもシェルを通さない。Windows だけ detached にしない", () => {
    const spec = { cwd: "C:\\work\\課題", env: { PATH: "x" } };
    expect(spawnOptions(spec, "win32")).toEqual({
      cwd: "C:\\work\\課題",
      env: { PATH: "x" },
      shell: false,
      windowsHide: true,
      detached: false,
    });
    expect(spawnOptions(spec, "darwin")).toMatchObject({ shell: false, detached: true });
    expect(spawnOptions(spec, "linux")).toMatchObject({ shell: false, detached: true });
  });
});

describe("childEnv / stripAnsi / tailLines", () => {
  it("対話と色を止める", () => {
    expect(childEnv({ PATH: "/bin" })).toMatchObject({ PATH: "/bin", CI: "1", NO_COLOR: "1" });
  });

  it("課題の道具に利用状況を送らせない", () => {
    expect(childEnv({})).toMatchObject({
      NEXT_TELEMETRY_DISABLED: "1",
      STORYBOOK_DISABLE_TELEMETRY: "1",
    });
  });

  it("色指定を外し、末尾の行を返す", () => {
    expect(stripAnsi("\u001b[31mred\u001b[39m")).toBe("red");
    expect(tailLines("1\r\n2\n3\n", 2)).toBe("2\n3");
  });
});
