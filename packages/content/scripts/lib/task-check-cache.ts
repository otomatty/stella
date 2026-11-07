/**
 * 課題の解答例・誤答の実行を飛ばす鍵。
 * 課題の bundle、private の解答例と誤答、固定した開始点、道具の指紋が同じなら同じ鍵。
 */

import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

/** オブジェクトのキー順に依存しない JSON。配列の順は内容の一部として残す。 */
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort())
      out[key] = stable((value as Record<string, unknown>)[key]);
    return out;
  }
  return value;
}

export interface TaskCheckCacheInput {
  bundle: unknown;
  /** `solution/` から始まる解答例。値は配布と同じ base64。 */
  solution: Record<string, string>;
  mutants?: Record<string, Record<string, string>>;
  fixedStart?: Record<string, string>;
  toolFingerprint: string;
}

/** 課題 1 件の検査キャッシュのファイル名 (sha256 の hex)。 */
export function taskCheckCacheKey(input: TaskCheckCacheInput): string {
  return createHash("sha256")
    .update(
      JSON.stringify(
        stable({
          bundle: input.bundle,
          solution: input.solution,
          mutants: input.mutants ?? {},
          fixedStart: input.fixedStart ?? {},
          toolFingerprint: input.toolFingerprint,
        }),
      ),
    )
    .digest("hex");
}

/**
 * ディレクトリの中身の指紋。パスは `root` からの相対 (スラッシュ区切り) で、
 * ファイルのバイト列を名前順に畳む。道具 (ランナー・テンプレート・課題の型) 用。
 */
export function directoryFingerprint(roots: readonly { root: string; base: string }[]): string {
  const files: { name: string; path: string }[] = [];
  const walk = (dir: string, base: string) => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink())
        throw new Error(`指紋の対象にシンボリックリンクは使えません: ${path}`);
      if (stat.isDirectory()) walk(path, base);
      else if (stat.isFile()) {
        const rel = relative(base, path).replaceAll("\\", "/");
        files.push({ name: rel, path });
      }
    }
  };
  for (const { root, base } of roots) walk(root, base);
  files.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file.name);
    hash.update("\0");
    hash.update(readFileSync(file.path));
    hash.update("\0");
  }
  return hash.digest("hex");
}
