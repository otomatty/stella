/**
 * 課題の手順で外部プロセスを起動する。
 *
 * - シェルを通さず、実行ファイルと引数の配列で起動する。引数は runner の固定の手順が
 *   決めたものだけで、課題ファイルや画面から来た文字列は入らない。
 * - 時間切れ・中断のときは子プロセスごと止める (npm や Vitest は子を起動するため)。
 * - 出力は末尾だけを持つ。巨大なログでメモリを使い切らないため。
 */

import { type ChildProcess, spawn } from "node:child_process";

export interface ProcessSpec {
  /** 実行ファイルの絶対パス。シェルは通さないので、Windows の .cmd / .bat は起動できない。 */
  file: string;
  args: readonly string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
}

export interface ProcessOptions {
  signal?: AbortSignal;
  /** 出力を逐次受け取る (実行ログ用)。 */
  onOutput?: (chunk: string) => void;
  /** stdout・stderr それぞれに残す最大の文字数。 */
  maxOutputChars?: number;
  platform?: NodeJS.Platform;
}

export interface ProcessOutcome {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  truncated: boolean;
  timedOut: boolean;
  aborted: boolean;
  /** 起動できなかったときの理由 (ENOENT など)。 */
  spawnError?: string;
  durationMs: number;
}

const DEFAULT_MAX_OUTPUT_CHARS = 256 * 1024;

class TailBuffer {
  private text = "";
  truncated = false;

  constructor(private readonly max: number) {}

  push(chunk: string): void {
    this.text += chunk;
    if (this.text.length > this.max) {
      this.text = this.text.slice(this.text.length - this.max);
      this.truncated = true;
    }
  }

  toString(): string {
    return this.text;
  }
}

function killTree(pid: number, platform: NodeJS.Platform): void {
  try {
    if (platform === "win32") {
      const systemRoot = process.env.SystemRoot ?? "C:\\Windows";
      spawn(`${systemRoot}\\System32\\taskkill.exe`, ["/pid", String(pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore",
      }).on("error", () => undefined);
    } else {
      // detached で起動しているので、負の pid でプロセスグループごと止まる。
      process.kill(-pid, "SIGKILL");
    }
  } catch {
    // すでに終わっている。
  }
}

export function runProcess(
  spec: ProcessSpec,
  options: ProcessOptions = {},
): Promise<ProcessOutcome> {
  const platform = options.platform ?? process.platform;
  const max = options.maxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS;
  const stdout = new TailBuffer(max);
  const stderr = new TailBuffer(max);
  const started = Date.now();

  return new Promise((resolve) => {
    // 始める前に中断されていれば、起動しない。
    if (options.signal?.aborted) {
      resolve({
        exitCode: null,
        stdout: "",
        stderr: "",
        truncated: false,
        timedOut: false,
        aborted: true,
        durationMs: 0,
      });
      return;
    }

    let settled = false;
    let timedOut = false;
    let aborted = false;
    let child: ChildProcess | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const stop = () => {
      if (child?.pid !== undefined) killTree(child.pid, platform);
    };
    const onAbort = () => {
      aborted = true;
      stop();
    };
    const finish = (exitCode: number | null, spawnError?: string) => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
      resolve({
        exitCode,
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        truncated: stdout.truncated || stderr.truncated,
        timedOut,
        aborted,
        ...(spawnError ? { spawnError } : {}),
        durationMs: Date.now() - started,
      });
    };

    try {
      child = spawn(spec.file, [...spec.args], {
        cwd: spec.cwd,
        env: spec.env,
        shell: false,
        windowsHide: true,
        detached: platform !== "win32",
      });
    } catch (error) {
      // Windows で .cmd を渡したときなど、同期的に失敗することがある。
      const code = (error as NodeJS.ErrnoException).code;
      finish(null, code ?? (error instanceof Error ? error.message : String(error)));
      return;
    }

    timer = setTimeout(() => {
      timedOut = true;
      stop();
    }, spec.timeoutMs);
    options.signal?.addEventListener("abort", onAbort, { once: true });

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      stdout.push(chunk);
      options.onOutput?.(chunk);
    });
    child.stderr?.on("data", (chunk: string) => {
      stderr.push(chunk);
      options.onOutput?.(chunk);
    });
    child.on("error", (error: NodeJS.ErrnoException) => finish(null, error.code ?? error.message));
    child.on("close", (code) => finish(code));
  });
}

/** 子プロセスに渡す環境変数。対話や色付き出力を止める。 */
export function childEnv(base: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return {
    ...base,
    CI: "1",
    NO_COLOR: "1",
    FORCE_COLOR: "0",
    npm_config_update_notifier: "false",
    npm_config_fund: "false",
    npm_config_audit: "false",
  };
}

const ANSI_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*[A-Za-z]`, "g");

/** 端末の色指定を取り除く。NO_COLOR を付けても色を出す道具がある。 */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

/** ログの末尾 n 行。 */
export function tailLines(text: string, lines = 30): string {
  const all = stripAnsi(text).replace(/\r\n/g, "\n").trimEnd().split("\n");
  return all.slice(Math.max(0, all.length - lines)).join("\n");
}
