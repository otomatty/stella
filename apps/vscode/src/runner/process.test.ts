import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { childEnv, quoteForCmd, runProcess, stripAnsi, tailLines } from "./process.js";

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

  it("起動できなければ spawnError", async () => {
    const out = await runProcess({ ...base, file: "/no/such/binary", args: [] });
    expect(out.spawnError).toBe("ENOENT");
  });
});

describe("childEnv / quoteForCmd / stripAnsi / tailLines", () => {
  it("対話と色を止める", () => {
    expect(childEnv({ PATH: "/bin" })).toMatchObject({ PATH: "/bin", CI: "1", NO_COLOR: "1" });
  });

  it("空白入りのパスを引用する", () => {
    expect(quoteForCmd("C:\\Program Files\\nodejs\\npm.cmd")).toBe(
      '"C:\\Program Files\\nodejs\\npm.cmd"',
    );
    expect(quoteForCmd("--no-audit")).toBe("--no-audit");
  });

  it("色指定を外し、末尾の行を返す", () => {
    expect(stripAnsi("\u001b[31mred\u001b[39m")).toBe("red");
    expect(tailLines("1\r\n2\n3\n", 2)).toBe("2\n3");
  });
});
