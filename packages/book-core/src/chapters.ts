// 章を作る・つなぐ・分ける(純粋な関数)。docs/02-architecture/system-architecture.md「split」、ADR-0007。
import { MAX_CHAPTER_BYTES, byteLength } from "./util";

export interface PageText {
  pageNo: number;
  markdown: string;
}

export interface ChapterDraft {
  title: string;
  markdown: string;
  startPage: number;
  endPage: number;
}

export const FRONT_MATTER_TITLE = "前付け";
const MAX_TITLE = 200;
const FOOTNOTE_DEF = /^\[\^([^\]\s]+)\]:/;
// この文字で終わる行は文が終わっているとみなし、次のページとつながない
const SENTENCE_END = /[。．.！？!?」』）)】:：]$/;

const cleanTitle = (t: string) => t.replace(/\s+/g, " ").trim().slice(0, MAX_TITLE) || "(無題)";

/** 本文と脚注の定義(`[^x]: …` とその字下げされた続き)を分ける。 */
export function separateFootnotes(markdown: string): {
  body: string;
  defs: { label: string; text: string }[];
} {
  const body: string[] = [];
  const defs: { label: string; lines: string[] }[] = [];
  let inFence = false;
  let inDef = false;
  for (const line of markdown.split("\n")) {
    if (/^(```|~~~)/.test(line)) inFence = !inFence;
    const m = !inFence && line.match(FOOTNOTE_DEF);
    if (m) {
      defs.push({ label: m[1], lines: [line] });
      inDef = true;
    } else if (inDef && /^( {4}|\t)/.test(line)) {
      defs[defs.length - 1].lines.push(line);
    } else {
      inDef = false;
      body.push(line);
    }
  }
  return {
    body: body
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
    defs: defs.map((d) => ({ label: d.label, text: d.lines.join("\n") })),
  };
}

/** 行が「ふつうの段落の文」か(見出し・箇条書き・表・コード・図・引用ではない)。 */
const isProse = (line: string | undefined) =>
  !!line && line.trim() !== "" && !/^(#|[-*+] |\d+[.)] |>|\||```|~~~|!\[| {4}|\t|\[\^)/.test(line);

/** ページの切れ目をまたぐ段落なら、空行を入れずにつなぐ。 */
function joinAcrossPage(prev: string, next: string): string {
  if (!prev) return next;
  if (!next) return prev;
  const last = prev.slice(prev.lastIndexOf("\n") + 1);
  const first = next.slice(0, next.indexOf("\n") === -1 ? undefined : next.indexOf("\n"));
  if (isProse(last) && isProse(first) && !SENTENCE_END.test(last.trimEnd())) {
    const space = /[A-Za-z0-9,]$/.test(last.trimEnd()) && /^[A-Za-z0-9]/.test(first) ? " " : "";
    return prev.trimEnd() + space + next.trimStart();
  }
  return `${prev}\n\n${next}`;
}

/** 脚注の定義を、参照している章の末尾に付ける。参照が見つからなければ fallback の章に付ける。 */
function attachFootnotes(
  bodies: string[],
  defs: { label: string; text: string; fallback: number }[],
): string[] {
  const extra: string[][] = bodies.map(() => []);
  for (const d of defs) {
    const ref = `[^${d.label}]`;
    const at = bodies.findIndex((b) =>
      b.split(ref).some((_, i, parts) => i > 0 && !parts[i].startsWith(":")),
    );
    extra[at === -1 ? Math.min(d.fallback, bodies.length - 1) : at].push(d.text);
  }
  return bodies.map((b, i) => (extra[i].length ? `${b}\n\n${extra[i].join("\n")}` : b));
}

/** 大きすぎる本文を、段落の切れ目で上限に収まるように分ける。 */
function splitBySize(body: string, maxBytes: number): string[] {
  if (byteLength(body) <= maxBytes) return [body];
  const parts: string[] = [];
  let current = "";
  for (const para of body.split(/\n{2,}/)) {
    const fragments: string[] = [];
    let fragment = "",
      bytes = 0;
    for (const char of para) {
      const size = byteLength(char);
      if (bytes + size > maxBytes) {
        fragments.push(fragment);
        fragment = "";
        bytes = 0;
      }
      fragment += char;
      bytes += size;
    }
    if (fragment) fragments.push(fragment);
    for (const part of fragments) {
      const candidate = current ? `${current}\n\n${part}` : part;
      if (current && byteLength(candidate) > maxBytes) {
        parts.push(current);
        current = part;
      } else {
        current = candidate;
      }
    }
  }
  if (current) parts.push(current);
  return parts;
}

/**
 * OCR結果(ページごとのMarkdown)から章を作る。
 * - `#` の見出しごとに章を作る。見出しの文字列が章のタイトル
 * - 最初の `#` より前に本文があれば「前付け」の章にする
 * - `#` が1つもなければ、本のタイトルを章名にして全体を1章にする
 * - ページをまたぐ段落はつなぐ。脚注の定義は、参照している章の末尾に集める
 * - 1章が上限を超える場合は、段落の切れ目で「(続き)」の章に分ける
 */
export function splitIntoChapters(
  pages: PageText[],
  bookTitle: string,
  maxBytes = MAX_CHAPTER_BYTES,
): ChapterDraft[] {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 8) throw new Error("章のサイズ上限が無効です");
  type Draft = { title: string | null; body: string; startPage: number; endPage: number };
  const drafts: Draft[] = [];
  const defs: { label: string; text: string; fallback: number }[] = [];
  let current: Draft | null = null;

  for (const page of [...pages].sort((a, b) => a.pageNo - b.pageNo)) {
    const { body, defs: pageDefs } = separateFootnotes(page.markdown ?? "");
    // そのページの本文を、章見出しの位置で区切る(コードブロックの中の # は見出しではない)
    const segments: { heading: string | null; lines: string[] }[] = [{ heading: null, lines: [] }];
    let inFence = false;
    for (const line of body.split("\n")) {
      if (/^(```|~~~)/.test(line)) inFence = !inFence;
      const h = !inFence && line.match(/^# +(.+?)\s*#*\s*$/);
      if (h) segments.push({ heading: cleanTitle(h[1].replace(/[*_`]/g, "")), lines: [line] });
      else segments[segments.length - 1].lines.push(line);
    }
    for (const seg of segments) {
      const text = seg.lines.join("\n").trim();
      if (seg.heading !== null) {
        current = { title: seg.heading, body: text, startPage: page.pageNo, endPage: page.pageNo };
        drafts.push(current);
        continue;
      }
      if (!text) continue;
      if (!current) {
        current = { title: null, body: "", startPage: page.pageNo, endPage: page.pageNo };
        drafts.push(current);
      }
      current.body = joinAcrossPage(current.body, text);
      current.endPage = page.pageNo;
    }
    for (const d of pageDefs) defs.push({ ...d, fallback: Math.max(0, drafts.length - 1) });
  }

  if (drafts.length === 0) {
    if (byteLength(defs.map((d) => d.text).join("\n")) > maxBytes)
      throw new Error("脚注が章のサイズ上限を超えています");
    return [
      {
        title: cleanTitle(bookTitle),
        markdown: defs.map((d) => d.text).join("\n"),
        startPage: pages[0]?.pageNo ?? 1,
        endPage: pages.at(-1)?.pageNo ?? 1,
      },
    ];
  }
  const hasHeading = drafts.some((d) => d.title !== null);
  const titled = drafts.map((d) => ({
    ...d,
    title: d.title ?? (hasHeading ? FRONT_MATTER_TITLE : cleanTitle(bookTitle)),
  }));

  // 大きさの上限で分ける。脚注の分を見込んで本文は9割までにする
  const expanded: (Draft & { title: string; draftIndex: number })[] = [];
  titled.forEach((d, i) => {
    splitBySize(d.body, Math.floor(maxBytes * 0.9)).forEach((body, k) => {
      expanded.push({
        ...d,
        body,
        title: k === 0 ? d.title : cleanTitle(`${d.title}(続き${k + 1})`),
        draftIndex: i,
      });
    });
  });
  const firstPartOf = (draftIndex: number) =>
    expanded.findIndex((e) => e.draftIndex === draftIndex);
  const bodies = attachFootnotes(
    expanded.map((e) => e.body),
    defs.map((d) => ({ ...d, fallback: firstPartOf(d.fallback) })),
  );
  if (bodies.some((body) => byteLength(body) > maxBytes))
    throw new Error("脚注を含む本文が章のサイズ上限を超えています");
  return expanded.map((e, i) => ({
    title: e.title,
    markdown: bodies[i],
    startPage: e.startPage,
    endPage: e.endPage,
  }));
}

/** 章の結合: 本文をつなぐ。 */
export function mergeMarkdown(a: string, b: string): string {
  return `${a.trimEnd()}\n\n${b.trimStart()}`;
}

/**
 * 章の分割: 指定した行(1始まり)の前で2つに分ける。脚注の定義は参照している側に移す。
 * どちらかが空になる場合は null。
 */
export function splitMarkdownAt(markdown: string, line: number): [string, string] | null {
  const lines = markdown.split("\n");
  if (line < 2 || line > lines.length) return null;
  const first = lines.slice(0, line - 1).join("\n");
  const second = lines.slice(line - 1).join("\n");
  const a = separateFootnotes(first);
  const b = separateFootnotes(second);
  if (!a.body || !b.body) return null;
  const [x, y] = attachFootnotes(
    [a.body, b.body],
    [...a.defs.map((d) => ({ ...d, fallback: 0 })), ...b.defs.map((d) => ({ ...d, fallback: 1 }))],
  );
  return [x, y];
}
