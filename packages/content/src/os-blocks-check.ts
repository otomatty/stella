/**
 * OS 別のブロック (`:::os windows` / `:::os macos`。07 §11) の公開前検査。`content:check` が使う。
 *
 * - 書けるのはまとめ (`<レッスン>/doc.md`) と課題文 (`tasks/<課題>/README.md`) だけ。
 *   スライド・動画・pptx は OS に依存しない説明にする。ほかの教材に書くと、受講者に
 *   `:::os` がそのまま見える。
 * - 記法の誤り (閉じ忘れ・入れ子・未知の OS など) と、Windows・macOS の片方しか無い組を落とす。
 * - OS ごとの画像 (`name.windows.png` / `name.macos.png`) は、その OS のブロックの中で使い、
 *   同じ組のもう一方の OS のブロックで対になる画像を使う。`assets/` にも両方を置く。
 *
 * 記法の解析は Web・VS Code・配布 PDF と同じ `@stella/shared/markdown/os-blocks`。
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";

import {
  OS_LABELS,
  OS_NAMES,
  type OsName,
  parseOsBlocks,
} from "../../shared/src/markdown/os-blocks.js";
import { markdownImageDestinations } from "./source-references.js";

export interface OsBlockDiagnostic {
  /** courses/ からの相対パス。 */
  file: string;
  line: number;
  message: string;
}

/** OS ごとの画像のファイル名 (`<名前>.<OS>.<拡張子>`)。 */
const OS_IMAGE = /^(.+)\.(windows|macos)\.([A-Za-z0-9]+)$/;

/** 画像の参照先から、OS ごとの画像なら名前・OS・拡張子を取り出す。 */
export function osImageOf(destination: string): { stem: string; os: OsName; ext: string } | null {
  const path = destination.replace(/[?#][\s\S]*$/, "");
  const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/") + 1) : "";
  const m = OS_IMAGE.exec(path.slice(dir.length));
  if (!m?.[1] || !m[3]) return null;
  return { stem: `${dir}${m[1]}`, os: m[2] as OsName, ext: m[3] };
}

/** OS 別のブロックを書ける場所か (modules/ からの相対パスで判定)。 */
export function allowsOsBlocks(relFromModules: string): boolean {
  const parts = relFromModules.split("/");
  // <単元>/<レッスン>/doc.md
  if (parts.length === 3 && parts[2] === "doc.md" && parts[1] !== "tasks") return true;
  // <単元>/tasks/<課題>/README.md
  return parts.length === 4 && parts[1] === "tasks" && parts[3] === "README.md";
}

function walk(dir: string, visit: (file: string) => void): void {
  for (const entry of readdirSync(dir).sort()) {
    if (entry === "node_modules" || entry === ".git") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, visit);
    else visit(full);
  }
}

/** 1 つの教材ファイル (doc.md / README.md) の本文を検査する。 */
export function checkOsBlockSource(file: string, source: string): OsBlockDiagnostic[] {
  const diagnostics: OsBlockDiagnostic[] = [];
  const { segments, issues } = parseOsBlocks(source);
  for (const issue of issues) diagnostics.push({ file, ...issue });

  for (const segment of segments) {
    if (segment.kind === "markdown") {
      for (const destination of markdownImageDestinations(segment.markdown)) {
        const image = osImageOf(destination);
        if (image)
          diagnostics.push({
            file,
            line: segment.line,
            message: `OS ごとの画像 (${destination}) は \`:::os ${image.os}\` の中で使います`,
          });
      }
      continue;
    }
    /** OS → その OS のブロックで使った OS ごとの画像 (`名前.拡張子`)。 */
    const used = new Map<OsName, Set<string>>();
    for (const block of segment.blocks) {
      const names = used.get(block.os) ?? new Set<string>();
      used.set(block.os, names);
      for (const destination of markdownImageDestinations(block.markdown)) {
        const image = osImageOf(destination);
        if (!image) continue;
        if (image.os !== block.os) {
          diagnostics.push({
            file,
            line: block.line,
            message: `${destination} は ${OS_LABELS[image.os]} の画像です。\`:::os ${block.os}\` には ${OS_LABELS[block.os]} の画像を使います`,
          });
          continue;
        }
        names.add(`${image.stem}.${image.ext}`);
      }
    }
    // 両方の OS のブロックがある組だけ対を確かめる (片方が無い組は記法の検査が落とす)。
    if (!OS_NAMES.every((os) => used.has(os))) continue;
    for (const os of OS_NAMES) {
      const other = OS_NAMES.find((o) => o !== os) as OsName;
      for (const name of used.get(os) ?? []) {
        if (used.get(other)?.has(name)) continue;
        const ext = name.slice(name.lastIndexOf(".") + 1);
        const stem = name.slice(0, name.lastIndexOf("."));
        diagnostics.push({
          file,
          line: segment.line,
          message: `画像を OS ごとに用意します: ${stem}.${os}.${ext} と対になる ${stem}.${other}.${ext} を \`:::os ${other}\` の中で使ってください`,
        });
      }
    }
  }
  return diagnostics;
}

/** OS 別のブロックを書けない教材 (スライド・知識問題・ヒントなど) を検査する。 */
export function checkOsAgnosticSource(file: string, source: string): OsBlockDiagnostic[] {
  const diagnostics: OsBlockDiagnostic[] = [];
  if (/^[ \t]*:::os/m.test(source)) {
    const { segments, issues } = parseOsBlocks(source);
    const lines = source.replace(/\r\n/g, "\n").split("\n");
    const line =
      segments.find((s) => s.kind === "os")?.line ??
      issues.find((i) => /^[ \t]*:::os/.test(lines[i.line - 1] ?? ""))?.line;
    if (line !== undefined)
      diagnostics.push({
        file,
        line,
        message:
          "OS 別のブロックは、まとめ (doc.md) と課題文 (README.md) にだけ書けます。スライド・知識問題・ヒントは OS に依存しない説明にします",
      });
  }
  for (const destination of markdownImageDestinations(source)) {
    if (osImageOf(destination))
      diagnostics.push({
        file,
        line: 0,
        message: `OS ごとの画像 (${destination}) は、まとめ (doc.md) の \`:::os\` の中でだけ使えます`,
      });
  }
  return diagnostics;
}

/**
 * 全講座の教材を検査する。`coursesRoot` は `packages/content/courses`。
 * `private/` も対象にする (解説・ヒントに書いても OS のタブにならない)。
 */
export function checkOsBlocks(coursesRoot: string): OsBlockDiagnostic[] {
  const diagnostics: OsBlockDiagnostic[] = [];
  for (const slug of readdirSync(coursesRoot).sort()) {
    const modulesRoot = join(coursesRoot, slug, "modules");
    if (!existsSync(modulesRoot) || !statSync(modulesRoot).isDirectory()) continue;
    walk(modulesRoot, (full) => {
      const file = relative(coursesRoot, full).split("\\").join("/");
      const fromModules = relative(modulesRoot, full).split("\\").join("/");
      const name = basename(full);
      if (/\.md$/i.test(name)) {
        const source = readFileSync(full, "utf8");
        diagnostics.push(
          ...(allowsOsBlocks(fromModules)
            ? checkOsBlockSource(file, source)
            : checkOsAgnosticSource(file, source)),
        );
        return;
      }
      // assets/ の OS ごとの画像は対で置く (生成物の .diagram.png と図解の元 .html は除く)。
      if (!full.split(/[\\/]/).includes("assets") || /\.diagram\.png$/.test(name)) return;
      const image = osImageOf(name);
      if (!image || image.ext === "html") return;
      const other = OS_NAMES.find((o) => o !== image.os) as OsName;
      const pair = join(full, "..", `${image.stem}.${other}.${image.ext}`);
      if (!existsSync(pair))
        diagnostics.push({
          file,
          line: 0,
          message: `画像を OS ごとに用意します: ${image.stem}.${other}.${image.ext} がありません`,
        });
    });
  }
  return diagnostics;
}
