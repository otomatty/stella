/**
 * 受講者の端末にある道具 (Node.js・npm・Git) と、課題フォルダーに入った
 * パッケージの実行ファイルを探す。
 *
 * 拡張そのものは VS Code 同梱の実行環境で動くので、`process.execPath` は受講者が
 * 入れた Node.js ではない。PATH から探す。
 */

import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

export type FileExists = (file: string) => Promise<boolean>;

export async function isFile(file: string): Promise<boolean> {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

/** Windows の環境変数は大文字小文字を区別しないので、名前を問わず引く。 */
export function readEnv(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const key = Object.keys(env).find((k) => k.toUpperCase() === name.toUpperCase());
  return key === undefined ? undefined : env[key];
}

function pathModule(platform: NodeJS.Platform): typeof path.posix {
  return platform === "win32" ? path.win32 : path.posix;
}

/**
 * PATH から実行ファイルを探す。Windows は PATHEXT の順に .exe / .com だけを試す。
 * プロセスはシェルを通さずに起動するので、.cmd / .bat は起動できず、探さない。
 */
export async function findExecutable(
  name: string,
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform,
  exists: FileExists = isFile,
): Promise<string | null> {
  const p = pathModule(platform);
  const extensions =
    platform === "win32"
      ? (readEnv(env, "PATHEXT") ?? ".COM;.EXE")
          .split(";")
          .map((ext) => ext.toLowerCase())
          .filter((ext) => ext === ".exe" || ext === ".com")
      : [""];
  for (const dir of pathDirs(env, platform)) {
    for (const ext of extensions) {
      const candidate = p.join(dir, name + ext);
      if (await exists(candidate)) return candidate;
    }
  }
  return null;
}

function pathDirs(env: NodeJS.ProcessEnv, platform: NodeJS.Platform): string[] {
  return (readEnv(env, "PATH") ?? "")
    .split(platform === "win32" ? ";" : ":")
    .map((dir) => dir.replace(/^"(.*)"$/, "$1"))
    .filter((dir) => dir.length > 0);
}

/** npm の起動方法。npm-cli.js を Node.js で直接動かすのが基本。シェルは通さない。 */
export interface NpmInvocation {
  file: string;
  prefixArgs: string[];
}

/** フォルダーに入っている npm 本体 (npm-cli.js) の候補。 */
function npmCliCandidates(dir: string, platform: NodeJS.Platform): string[] {
  const p = pathModule(platform);
  const sibling = p.join(dir, "node_modules", "npm", "bin", "npm-cli.js");
  return platform === "win32"
    ? [sibling]
    : [p.join(dir, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"), sibling];
}

/**
 * npm を探す。順に次を試す。
 * 1. Node.js と同じ場所の npm-cli.js (Windows の公式インストーラー・nvm-windows は
 *    `<node のフォルダー>/node_modules/npm`、macOS・Linux の公式・Homebrew・nvm は
 *    `<node のフォルダー>/../lib/node_modules/npm`)。シンボリックリンクの実体の場所も見る。
 * 2. PATH の各フォルダーの npm-cli.js (npm.cmd だけが PATH にある場合の本体)。
 * 3. PATH の npm の実行ファイル (macOS・Linux のスクリプト、Windows の .exe のシム)。
 * Windows の npm.cmd はシェル無しで起動できないので使わない。
 */
export async function resolveNpm(
  nodePath: string | null,
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform,
  exists: FileExists = isFile,
  resolveLink: (file: string) => Promise<string> = realpath,
): Promise<NpmInvocation | null> {
  const p = pathModule(platform);
  if (nodePath) {
    const dirs = [p.dirname(nodePath)];
    try {
      const real = p.dirname(await resolveLink(nodePath));
      if (!dirs.includes(real)) dirs.push(real);
    } catch {
      // シンボリックリンクでなければそのまま。
    }
    dirs.push(...pathDirs(env, platform));
    for (const dir of dirs) {
      for (const candidate of npmCliCandidates(dir, platform)) {
        if (await exists(candidate))
          return { file: nodePath, prefixArgs: [p.normalize(candidate)] };
      }
    }
  }
  const npm = await findExecutable("npm", env, platform, exists);
  return npm ? { file: npm, prefixArgs: [] } : null;
}

/**
 * 課題フォルダーの node_modules に入ったパッケージの実行ファイル (package.json の bin)。
 * Node.js で直接動かす。`.bin` のシム (Windows では .cmd) を通さないため。
 */
export async function resolvePackageBin(
  root: string,
  packageName: string,
  binName: string = packageName.split("/").pop() ?? packageName,
): Promise<{ file: string; version: string } | null> {
  const packageDir = path.join(root, "node_modules", ...packageName.split("/"));
  let manifest: { bin?: string | Record<string, string>; version?: string };
  try {
    manifest = JSON.parse(await readFile(path.join(packageDir, "package.json"), "utf8"));
  } catch {
    return null;
  }
  const bin = typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.[binName];
  if (!bin) return null;
  const file = path.resolve(packageDir, bin);
  if (!file.startsWith(packageDir + path.sep)) return null;
  if (!(await isFile(file))) return null;
  return { file, version: manifest.version ?? "" };
}
