/**
 * 教材の OS 別ブロック (07 §11)。まとめ (`doc.md`) と課題文 (`README.md`) にだけ書ける。
 *
 * ```markdown
 * :::os windows
 * PowerShellで次を実行します。
 * :::
 * :::os macos
 * ターミナルで次を実行します。
 * :::
 * ```
 *
 * Web・VS Code・配布 PDF・`content:check` が同じ解析を使う。記法は次のとおり厳格に決める。
 *
 * - 開始は行頭の `:::os <OS>`、終わりは行頭の `:::` だけの行。OS は `windows` / `macos`。
 * - 入れ子にしない。リストや引用の中にも書けない (行頭から書く)。
 * - 空行だけを挟んで続くブロックは 1 組 (タブ 1 つ) にまとめる。同じ OS が出たら次の組になる。
 * - コードブロック (``` / ~~~) の中の `:::` は記法として扱わない。
 *
 * 解析は寛容で、記法の誤りは `issues` に積んだうえで該当行を普通の本文として残す
 * (受講者の画面から本文を消さない)。教材は `content:check` が `issues` を 0 件に保つ。
 * CMS で直した本文など検査を通らない本文でも、描画が壊れないようにするため。
 */

export const OS_NAMES = ["windows", "macos"] as const;
export type OsName = (typeof OS_NAMES)[number];

export const OS_LABELS: Record<OsName, string> = { windows: "Windows", macos: "macOS" };

/** 推定できないとき (Linux など) の既定。主教材は Windows (06 §3)。 */
export const DEFAULT_OS: OsName = "windows";

export function isOsName(value: unknown): value is OsName {
  return typeof value === "string" && (OS_NAMES as readonly string[]).includes(value);
}

export interface OsBlock {
  os: OsName;
  /** ブロックの中身 (開始行・終了行は含まない)。 */
  markdown: string;
  /** 開始行 `:::os` の行番号 (1 始まり)。 */
  line: number;
}

export type OsSegment =
  /** OS に依存しない本文。`line` は先頭行の行番号 (1 始まり)。 */
  | { kind: "markdown"; markdown: string; line: number }
  /** タブ 1 組。`blocks` は書いた順。 */
  | { kind: "os"; blocks: OsBlock[]; line: number };

export interface OsBlockIssue {
  line: number;
  message: string;
}

export interface ParsedOsBlocks {
  segments: OsSegment[];
  issues: OsBlockIssue[];
}

const OPEN = /^:::os(?:[ \t]+(\S+))?[ \t]*$/;
const CLOSE = /^:::[ \t]*$/;
/** リストの中のコードブロックも拾うため、字下げの深さは問わない。 */
const FENCE_OPEN = /^[ \t]*(`{3,}|~{3,})(.*)$/;

interface Fence {
  char: string;
  length: number;
}

function fenceOpen(line: string): Fence | null {
  const m = FENCE_OPEN.exec(line);
  if (!m?.[1]) return null;
  // CommonMark: ``` の情報文字列にバッククォートは入らない (入っていればインラインコード)。
  if (m[1][0] === "`" && (m[2] ?? "").includes("`")) return null;
  return { char: m[1][0] ?? "`", length: m[1].length };
}

function fenceCloses(line: string, fence: Fence): boolean {
  const m = /^[ \t]*(`{3,}|~{3,})[ \t]*$/.exec(line);
  return !!m?.[1] && m[1][0] === fence.char && m[1].length >= fence.length;
}

/** 本文を OS 別ブロックとそれ以外に分ける。 */
export function parseOsBlocks(source: string): ParsedOsBlocks {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const segments: OsSegment[] = [];
  const issues: OsBlockIssue[] = [];
  /** 書き足している本文の行。行ごとに join し直さないよう、最後にまとめて本文にする。 */
  let text: string[] | null = null;
  const texts: { segment: Extract<OsSegment, { kind: "markdown" }>; lines: string[] }[] = [];
  /** 直前に閉じた組。空行だけを挟んだ次のブロックはここへ足す。 */
  let group: Extract<OsSegment, { kind: "os" }> | null = null;
  /** 組のあとに続いた空行。次がブロックでなければ本文へ戻す。 */
  let pendingBlank: number[] = [];
  let block: { os: OsName; lines: string[]; line: number; opener: string } | null = null;
  let fence: Fence | null = null;

  const pushText = (value: string, lineNo: number) => {
    if (group) {
      group = null;
      for (const blank of pendingBlank) pushText("", blank);
      pendingBlank = [];
    }
    if (!text) {
      const segment = { kind: "markdown" as const, markdown: "", line: lineNo };
      text = [];
      segments.push(segment);
      texts.push({ segment, lines: text });
    }
    text.push(value);
  };

  for (const [index, line] of lines.entries()) {
    const lineNo = index + 1;
    if (block) {
      if (fence) {
        if (fenceCloses(line, fence)) fence = null;
        block.lines.push(line);
        continue;
      }
      if (CLOSE.test(line)) {
        const markdown = block.lines.join("\n");
        if (markdown.trim() === "")
          issues.push({ line: block.line, message: "OS 別のブロックが空です" });
        const entry: OsBlock = { os: block.os, markdown, line: block.line };
        if (group && !group.blocks.some((b) => b.os === entry.os)) {
          group.blocks.push(entry);
        } else {
          group = { kind: "os", blocks: [entry], line: block.line };
          segments.push(group);
        }
        pendingBlank = [];
        block = null;
        continue;
      }
      if (OPEN.test(line))
        issues.push({
          line: lineNo,
          message: "OS 別のブロックは入れ子にできません。先に `:::` で閉じてください",
        });
      else if (/^:::/.test(line))
        issues.push({
          line: lineNo,
          message: "OS 別のブロックの中に `:::` で始まる行は書けません",
        });
      fence = fenceOpen(line);
      block.lines.push(line);
      continue;
    }

    if (fence) {
      if (fenceCloses(line, fence)) fence = null;
      pushText(line, lineNo);
      continue;
    }
    const open = OPEN.exec(line);
    if (open) {
      const name = open[1];
      if (isOsName(name)) {
        // 組と組の間の空行は捨てる。本文はここで区切る。
        pendingBlank = [];
        text = null;
        block = { os: name, lines: [], line: lineNo, opener: line };
        continue;
      }
      issues.push({
        line: lineNo,
        message: name
          ? `未知の OS です: ${name} (windows か macos を書きます)`
          : "`:::os` のあとに OS (windows か macos) を書きます",
      });
    } else if (CLOSE.test(line)) {
      issues.push({ line: lineNo, message: "対応する `:::os` の無い `:::` です" });
    } else if (/^:::/.test(line)) {
      issues.push({
        line: lineNo,
        message: "未知の記法です。OS 別のブロックは `:::os windows` / `:::os macos` で始めます",
      });
    } else if (/^ {1,3}:::/.test(line)) {
      // 4 文字以上の字下げはコードブロック (記法の見本) なので咎めない。
      issues.push({
        line: lineNo,
        message: "`:::` は行頭から書きます (リストや引用の中には書けません)",
      });
    }
    if (group && line.trim() === "") {
      pendingBlank.push(lineNo);
      continue;
    }
    fence = fenceOpen(line);
    pushText(line, lineNo);
  }

  if (block) {
    const open = block;
    issues.push({ line: open.line, message: `\`:::os ${open.os}\` が \`:::\` で閉じていません` });
    // 閉じていないブロックは本文に戻す (後ろの本文がタブの中に隠れないように)。
    text = null;
    pushText(open.opener, open.line);
    for (const [i, l] of open.lines.entries()) pushText(l, open.line + 1 + i);
  }

  for (const { segment, lines: body } of texts) segment.markdown = body.join("\n");
  for (const segment of segments) {
    if (segment.kind !== "os") continue;
    const missing = OS_NAMES.filter((os) => !segment.blocks.some((b) => b.os === os));
    if (missing.length > 0)
      issues.push({
        line: segment.line,
        message: `Windows と macOS の両方を書きます (足りない OS: ${missing.map((os) => OS_LABELS[os]).join("・")})`,
      });
  }
  issues.sort((a, b) => a.line - b.line);
  return { segments, issues };
}

/** OS 別ブロックを 1 組でも含むか。 */
export function hasOsBlocks(source: string): boolean {
  return /^:::os/m.test(source) && parseOsBlocks(source).segments.some((s) => s.kind === "os");
}

/** 組の中から表示するブロック。その OS が無い組 (検査を通っていない本文) は先頭を出す。 */
export function pickOsBlock(blocks: readonly OsBlock[], os: OsName): OsBlock | undefined {
  return blocks.find((b) => b.os === os) ?? blocks[0];
}

/** 組を Windows・macOS の順に並べる (タブの並びを本文の書き順に左右させない)。 */
export function orderedOsBlocks(blocks: readonly OsBlock[]): OsBlock[] {
  return [...blocks].sort((a, b) => OS_NAMES.indexOf(a.os) - OS_NAMES.indexOf(b.os));
}

/** 1 つの OS だけの本文にする (OS 別の配布 PDF)。 */
export function selectOsMarkdown(source: string, os: OsName): string {
  return parseOsBlocks(source)
    .segments.map((s) =>
      s.kind === "markdown" ? s.markdown : (pickOsBlock(s.blocks, os)?.markdown ?? ""),
    )
    .join("\n\n");
}

/** VS Code 拡張の `process.platform` から OS を決める。Windows・macOS 以外は null。 */
export function osFromNodePlatform(platform: string): OsName | null {
  if (platform === "win32") return "windows";
  if (platform === "darwin") return "macos";
  return null;
}

/**
 * プロフィールの OS 設定 (`profiles.os_preference`)。null は「端末から推定する」。
 * 不正な値は throw する (API が 400 で返す)。
 */
export function parseOsPreference(value: unknown): OsName | null {
  if (value === null) return null;
  if (isOsName(value)) return value;
  throw new Error("OS は windows・macos・null (自動) のどれかにしてください");
}
