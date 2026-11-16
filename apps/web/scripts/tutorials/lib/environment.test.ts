import { type ChildProcess, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { afterEach, expect, it, vi } from "vitest";
import { seedSqlArgs, TutorialEnvironment } from "./environment";

vi.mock("node:child_process", () => ({ spawn: vi.fn() }));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

function windowsEnvironment() {
  vi.useFakeTimers();
  vi.spyOn(process, "platform", "get").mockReturnValue("win32");
  const child = Object.assign(new EventEmitter(), {
    pid: 123,
    exitCode: null,
    signalCode: null,
  });
  const killer = new EventEmitter();
  vi.mocked(spawn).mockReturnValue(killer as ChildProcess);
  const environment = new TutorialEnvironment();
  Object.assign(environment, { api: child });
  return { environment, child, killer };
}

it.each([
  { event: "exit", value: 1, result: "終了コード 1" },
  { event: "error", value: new Error("spawn taskkill ENOENT"), result: "spawn taskkill ENOENT" },
])(
  "Windows の停止が10秒で終わらなければ taskkill の結果を返す: $event",
  async ({ event, value, result }) => {
    const { environment, killer } = windowsEnvironment();
    const closing = environment.close();
    const assertion = expect(closing).rejects.toThrow(
      `API のプロセスを止められませんでした (taskkill: ${result})`,
    );
    killer.emit(event, value);
    await vi.advanceTimersByTimeAsync(9_999);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  },
);

it("taskkill が非ゼロで終了しても子が終了すれば成功し、タイマーを片付ける", async () => {
  const { environment, child, killer } = windowsEnvironment();
  const closing = environment.close();
  killer.emit("exit", 128);
  await vi.advanceTimersByTimeAsync(1);
  child.emit("exit", 0);
  await expect(closing).resolves.toBeUndefined();
  expect(vi.getTimerCount()).toBe(0);
  expect(spawn).toHaveBeenCalledWith("taskkill", ["/PID", "123", "/T", "/F"], {
    stdio: "ignore",
    windowsHide: true,
  });
});

it("収録用 D1 を指定した Wrangler の引数配列を作る", () => {
  expect(seedSqlArgs("/tmp/tutorial state", "SELECT 1;")).toEqual([
    "x",
    "wrangler",
    "d1",
    "execute",
    "stella-db",
    "--local",
    "--persist-to",
    "/tmp/tutorial state",
    "--command",
    "SELECT 1;",
  ]);
});

it("空白・引用符・改行・シェルの記号を含む SQL も、そのまま 1 引数で渡す", () => {
  const sql = "INSERT INTO example (value) VALUES ('引用符 \" $HOME `id` $(id);');\nSELECT 2;";
  const args = seedSqlArgs("/tmp/tutorial", sql);
  expect(args).toHaveLength(10);
  expect(args.at(-2)).toBe("--command");
  expect(args.at(-1)).toBe(sql);
});
