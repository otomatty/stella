/**
 * AI が書いた類題の下書きの検査を、ホストから切り離したコンテナーで動かす (#69)。
 *
 * 下書きのテスト・解答例・誤答は人が読む前に動くので、ホストのファイル (`~/.ssh`・クラウドの
 * 認証情報・リポジトリの `.dev.vars` など) と環境変数の秘密に届かないようにする。
 *
 * - 拡張と同じ固定ランナー (`runTask`) を 1 ファイルに束ね、検査する一式だけを置いた作業フォルダーと
 *   一緒にコンテナーへ渡す。ホストのほかの場所はマウントしない。
 * - コンテナーは権限を落とし (`--cap-drop ALL`・`no-new-privileges`)、root 以外の利用者で動かし、
 *   終わったら捨てる (`--rm`)。ルートを読み取り専用にすると Playwright がイメージのブラウザーを
 *   ロックできずに止まるので、コンテナーの中への書き込みは許す (ホストには残らない)。
 *   環境変数はロケールとプロキシ (認証情報なし) だけを渡す。
 * - `npm ci` のためにネットワークは使える (既定は bridge)。コンテナーの中に秘密は無い。
 *   要らなければ `VARIANT_DRAFT_SANDBOX_NETWORK=none` で切れる (依存の取得は失敗する)。
 * - イメージは Node・npm・Playwright のブラウザーを持つ `mcr.microsoft.com/playwright`
 *   (runner のテンプレートの Playwright と同じ版)。`VARIANT_DRAFT_SANDBOX_IMAGE` で替えられる。
 */

import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { TaskManifest } from "../../../shared/src/tasks/manifest.js";
import type { RunResult } from "../../../shared/src/tasks/run-result.js";
import { scrubbedEnv } from "./task-run-check.js";

export const DEFAULT_SANDBOX_IMAGE = "mcr.microsoft.com/playwright:v1.63.0-noble";
/** コンテナー 1 回 (依存の取得と検査) の上限。固定ランナーの手順ごとの上限より長くとる。 */
const SANDBOX_TIMEOUT_MS = 20 * 60_000;
/** 作業フォルダーをコンテナーの中から書けるようにする利用者 (Playwright のイメージの pwuser)。 */
const CONTAINER_USER = "1000:1000";
const CONTAINER_CA = "/etc/stella/ca.crt";
const CONTAINER_RUNNER = "/opt/stella/run-task.mjs";
const LOOPBACK = /^(localhost|127\.\d+\.\d+\.\d+|\[?::1\]?)$/i;

export interface SandboxConfig {
  image: string;
  network: string;
  /** 束ねた固定ランナー (ホストのパス)。 */
  runner: string;
  /** TLS を中継するプロキシの CA (ホストのパス)。読み取り専用で渡す。 */
  caFile?: string;
  /** コンテナーに渡す環境変数。 */
  env: Record<string, string>;
  /** コンテナーの利用者 (`uid:gid`)。 */
  user: string;
}

/**
 * コンテナーに渡す環境変数。ロケールとプロキシだけで、認証情報を含むプロキシ (`scrubbedEnv` が落とす)
 * と、コンテナーから届かないホストのループバックを指すプロキシは渡さない。
 */
export function containerEnv(base: NodeJS.ProcessEnv): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(scrubbedEnv(base))) {
    if (value === undefined) continue;
    const upper = name.toUpperCase();
    if (upper === "LANG" || upper === "LC_ALL" || upper === "TZ" || upper === "NO_PROXY") {
      out[name] = value;
      continue;
    }
    if (upper !== "HTTP_PROXY" && upper !== "HTTPS_PROXY") continue;
    try {
      const url = new URL(value.includes("://") ? value : `http://${value}`);
      if (!LOOPBACK.test(url.hostname)) out[name] = value;
    } catch {
      // 読めないプロキシは渡さない
    }
  }
  return out;
}

/** `docker run` の引数。ホストからは作業フォルダー・束ねたランナー・CA だけを見せる。 */
export function dockerArgs(config: SandboxConfig, name: string, workDir: string): string[] {
  return [
    "run",
    "--rm",
    "--name",
    name,
    "--network",
    config.network,
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--tmpfs",
    "/tmp:rw,exec,size=2g",
    "--pids-limit",
    "1024",
    "--memory",
    "4g",
    "--user",
    config.user,
    "-e",
    "HOME=/tmp/home",
    "-e",
    "CI=1",
    ...Object.entries(config.env).flatMap(([key, value]) => ["-e", `${key}=${value}`]),
    ...(config.caFile
      ? [
          "-v",
          `${config.caFile}:${CONTAINER_CA}:ro`,
          "-e",
          `NODE_EXTRA_CA_CERTS=${CONTAINER_CA}`,
          "-e",
          `npm_config_cafile=${CONTAINER_CA}`,
        ]
      : []),
    "-v",
    `${workDir}:/work`,
    "-v",
    `${config.runner}:${CONTAINER_RUNNER}:ro`,
    "-w",
    "/work",
    config.image,
    "node",
    CONTAINER_RUNNER,
  ];
}

function docker(args: string[]) {
  return spawnSync("docker", args, { encoding: "utf8" });
}

/**
 * Docker が使えるかを確かめ、イメージを用意し、固定ランナーを束ねる。下書きを頼む (費用がかかる) 前に呼ぶ。
 */
export function prepareSandbox(log: (line: string) => void = () => {}): SandboxConfig {
  const image = process.env.VARIANT_DRAFT_SANDBOX_IMAGE ?? DEFAULT_SANDBOX_IMAGE;
  const version = docker(["version", "--format", "{{.Server.Version}}"]);
  if (version.error || version.status !== 0)
    throw new Error(
      "Docker が要ります。AI の下書きはテストや解答例を人が読む前に動かすので、ホストから切り離したコンテナーで検査します。Docker を起動してからもう一度実行してください",
    );
  if (docker(["image", "inspect", image]).status !== 0) {
    log(`検査用のイメージ ${image} を取得します (初回だけ時間がかかります)`);
    const pulled = spawnSync("docker", ["pull", image], { stdio: "inherit" });
    if (pulled.status !== 0) throw new Error(`イメージ ${image} を取得できませんでした`);
  }
  const outDir = mkdtempSync(join(tmpdir(), "stella-sandbox-runner-"));
  const runner = join(outDir, "run-task.mjs");
  const entry = join(dirname(fileURLToPath(import.meta.url)), "sandbox-entry.ts");
  const bun = process.versions.bun ? process.execPath : "bun";
  const built = spawnSync(
    bun,
    ["build", entry, "--target", "node", "--format", "esm", "--outfile", runner],
    { encoding: "utf8" },
  );
  if (built.status !== 0 || !existsSync(runner))
    throw new Error(`固定ランナーを束ねられませんでした\n${built.stderr ?? ""}`);
  const ca = [process.env.NODE_EXTRA_CA_CERTS, process.env.SSL_CERT_FILE].find(
    (path) => path && existsSync(path),
  );
  return {
    image,
    network: process.env.VARIANT_DRAFT_SANDBOX_NETWORK ?? "bridge",
    runner,
    ...(ca ? { caFile: ca } : {}),
    env: containerEnv(process.env),
    user: CONTAINER_USER,
  };
}

/** 一式 (相対パス → base64) をコンテナーの中の固定ランナーで実行する。 */
export function sandboxRunner(config: SandboxConfig) {
  return async (manifest: TaskManifest, files: Record<string, string>): Promise<RunResult> => {
    const workDir = mkdtempSync(join(tmpdir(), "stella-sandbox-"));
    try {
      for (const [key, value] of Object.entries(files)) {
        const path = join(workDir, "task", key);
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, Buffer.from(value, "base64"));
      }
      writeFileSync(join(workDir, "job.json"), JSON.stringify({ manifest }));
      // コンテナーの利用者 (root 以外) が書けるようにする。中身は検査する一式だけ。
      chmodRecursive(workDir);
      const name = `stella-variant-check-${randomBytes(6).toString("hex")}`;
      const output = await runContainer(dockerArgs(config, name, workDir), name);
      const resultPath = join(workDir, "result.json");
      if (!existsSync(resultPath))
        throw new Error(`コンテナーでの検査が結果を返しませんでした\n${output.slice(-2000)}`);
      return JSON.parse(readFileSync(resultPath, "utf8")) as RunResult;
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  };
}

function chmodRecursive(path: string) {
  chmodSync(path, 0o777);
  const stack = [path];
  while (stack.length > 0) {
    const dir = stack.pop() as string;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const child = join(dir, entry.name);
      chmodSync(child, entry.isDirectory() ? 0o777 : 0o666);
      if (entry.isDirectory()) stack.push(child);
    }
  }
}

function runContainer(args: string[], name: string): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn("docker", args, { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    const append = (chunk: Buffer) => {
      output = (output + chunk.toString()).slice(-20_000);
    };
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    const timer = setTimeout(() => {
      spawnSync("docker", ["rm", "-f", name]);
      // コンテナーを消せなくても待ち続けないよう、docker のクライアントも止める。
      child.kill("SIGKILL");
      output += `\n${SANDBOX_TIMEOUT_MS / 60_000} 分で打ち切りました`;
    }, SANDBOX_TIMEOUT_MS);
    child.on("close", () => {
      clearTimeout(timer);
      resolve(output);
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve(`${output}\n${err.message}`);
    });
  });
}
