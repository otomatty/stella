import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { isSafeRelativePattern } from "../../shared/src/tasks/manifest.js";
import {
  isPublicSourceUrl,
  SOURCE_AUTHORSHIP_LABELS,
  SOURCE_REUSE_LABELS,
  type PublicSourceReference,
} from "../../shared/src/tasks/source-reference.js";
import { stringList } from "./task-schema.js";
import { stripFrontMatter } from "./split-slides.js";

export interface SourceRecord {
  id: string;
  title: string;
  publisher: string;
  url: string;
  section: string;
  kind: string;
  language: string;
  documentVersion: { kind: "rolling" | "fixed"; revision: string | null };
  checkedAt: string;
  review: {
    status: "draft" | "approved";
    reviewer: string | null;
    reviewedAt: string | null;
    scope: string | null;
  };
  book?: { isbn: string; year: number; edition: string; pages: string; textChecked: boolean };
}
export interface SourceUse {
  /** 単元から見た公開ファイルのパス。資料と本文の対応を固定する。 */
  contentId: string;
  sourceRefs: string[];
  usedFor: string;
  authorship: "original" | "original-exercise" | "summary" | "quotation" | "adapted";
  reuse: "original" | "concept-reference" | "quote" | "reprint" | "adapt-code" | "adapt-diagram";
  reviewStatus: "draft" | "approved";
  attribution?: {
    text: string;
    creator: string;
    scope: string;
    conditionsUrl: string;
    checkedAt: string;
    displayAt: string;
  };
}
/**
 * 利用方法ごとに名乗れる制作区分。要約・引用・改変・独自制作を混同しないよう、
 * 引用 (quote / reprint) は quotation、改変 (adapt-*) は adapted、独自制作は
 * original / original-exercise に限る。quotation・adapted は対応する利用方法にしか
 * 現れないので、逆向き (quotation なのに concept-reference 等) もこの表で弾ける。
 */
const AUTHORSHIP_BY_REUSE: Readonly<
  Record<SourceUse["reuse"], readonly SourceUse["authorship"][]>
> = {
  original: ["original", "original-exercise"],
  "concept-reference": ["original", "original-exercise", "summary"],
  quote: ["quotation"],
  reprint: ["quotation"],
  "adapt-code": ["adapted"],
  "adapt-diagram": ["adapted"],
};
export interface UnitReferences {
  schemaVersion: "2.1";
  unitId: string;
  /**
   * `unitId` の版で参照元を確認した単元の内容指紋 (`unitContentHash`)。同じ版のまま
   * 本文・課題・採点を変えると一致しなくなり、公開ゲートが版の更新と再確認を求める。
   */
  contentHash: string;
  environmentRef: string;
  uses: SourceUse[];
}

export function object(raw: unknown, at: string): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw))
    throw new Error(`${at}: オブジェクトが必要です`);
  return raw as Record<string, unknown>;
}
function text(raw: unknown, at: string): string {
  if (typeof raw !== "string" || !raw.trim()) throw new Error(`${at}: 空でない文字列が必要です`);
  return raw.trim();
}
/** 実在する暦日の YYYY-MM-DD か。`2026-99-99`・`2026-02-30` のように形だけ合う値は通さない。 */
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value;
}
function date(raw: unknown, at: string): string {
  const value = text(raw, at);
  if (!isCalendarDate(value)) throw new Error(`${at}: YYYY-MM-DD の日付が必要です`);
  return value;
}
function status(raw: unknown): "draft" | "approved" {
  if (raw !== "draft" && raw !== "approved")
    throw new Error("review.status: draft / approved が必要です");
  return raw;
}
export function parseSourceRegistry(raw: unknown): Map<string, SourceRecord> {
  const registry = object(raw, "sources/registry.json");
  if (registry.schemaVersion !== "2.1" || !Array.isArray(registry.sources))
    throw new Error("sources/registry.json: schemaVersion 2.1 と sources 配列が必要です");
  const sources = new Map<string, SourceRecord>();
  for (const value of registry.sources) {
    const row = object(value, "source");
    const id = text(row.id, "source.id");
    if (!/^[A-Za-z0-9][A-Za-z0-9._@-]*$/.test(id) || sources.has(id))
      throw new Error(`source.id: 不正または重複した ID: ${id}`);
    if (!isPublicSourceUrl(row.url)) throw new Error(`${id}: 公開資料の HTTP(S) URL が必要です`);
    const version = object(row.documentVersion, `${id}.documentVersion`);
    if (version.kind !== "fixed" && version.kind !== "rolling")
      throw new Error(`${id}: documentVersion.kind は fixed / rolling が必要です`);
    if (
      ![
        "explanation",
        "specification",
        "reference",
        "book",
        "history",
        "experiment",
        "internal",
      ].includes(String(row.kind))
    )
      throw new Error(`${id}: 根拠にできる資料の kind が必要です`);
    const review = object(row.review, `${id}.review`);
    const reviewStatus = status(review.status);
    const source: SourceRecord = {
      id,
      title: text(row.title, `${id}.title`),
      publisher: text(row.publisher, `${id}.publisher`),
      url: new URL(row.url).href,
      section: text(row.section, `${id}.section`),
      kind: text(row.kind, `${id}.kind`),
      language: text(row.language, `${id}.language`),
      checkedAt: date(row.checkedAt, `${id}.checkedAt`),
      documentVersion: {
        kind: version.kind,
        revision:
          version.kind === "fixed"
            ? text(version.revision, `${id}.revision`)
            : version.revision === null
              ? null
              : text(version.revision, `${id}.revision`),
      },
      review: {
        status: reviewStatus,
        reviewer: reviewStatus === "approved" ? text(review.reviewer, `${id}.reviewer`) : null,
        reviewedAt:
          reviewStatus === "approved" ? date(review.reviewedAt, `${id}.reviewedAt`) : null,
        scope: reviewStatus === "approved" ? text(review.scope, `${id}.scope`) : null,
      },
    };
    if (source.kind === "book") {
      const book = object(row.book, `${id}.book`);
      if (
        typeof book.year !== "number" ||
        !Number.isInteger(book.year) ||
        typeof book.textChecked !== "boolean"
      )
        throw new Error(`${id}: 書籍の刊行年と本文確認が必要です`);
      source.book = {
        isbn: text(book.isbn, "ISBN"),
        year: book.year,
        edition: text(book.edition, "版"),
        pages: text(book.pages, "ページ"),
        textChecked: book.textChecked,
      };
      if (reviewStatus === "approved" && !source.book.textChecked)
        throw new Error(`${id}: 書籍本文の未確認`);
    }
    sources.set(id, source);
  }
  return sources;
}
export function readSourceRegistry(root: string): Map<string, SourceRecord> {
  return parseSourceRegistry(JSON.parse(readFileSync(join(root, "sources/registry.json"), "utf8")));
}
export function parseUnitId(value: string): { path: string; version: string } {
  const match =
    /^([A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*)@((?:0|[1-9]\d*)(?:\.(?:0|[1-9]\d*))*)$/.exec(
      value,
    );
  if (!match) throw new Error("unitId: <slug>/<module>@<数字またはドット区切りの版> が必要です");
  return { path: match[1], version: match[2] };
}
export function parseUnitReferences(raw: unknown): UnitReferences {
  const row = object(raw, "references.json");
  if (row.schemaVersion !== "2.1" || !Array.isArray(row.uses))
    throw new Error("references.json: schemaVersion 2.1 と uses 配列が必要です");
  const unitId = text(row.unitId, "unitId");
  parseUnitId(unitId);
  if (typeof row.contentHash !== "string" || !/^[0-9a-f]{64}$/.test(row.contentHash))
    throw new Error(
      "contentHash: unitId の版で確認した単元の内容指紋 (64 桁の16進数、bun run --filter=@stella/content hash:unit で表示) が必要です",
    );
  const contentHash = row.contentHash;
  const uses = row.uses.map((value): SourceUse => {
    const use = object(value, "uses");
    const contentId = text(use.contentId, "contentId");
    if (
      !isSafeRelativePattern(contentId) ||
      /[*?{}[\]]/.test(contentId) ||
      contentId.split("/").includes("private")
    )
      throw new Error(`contentId: 公開ファイルの相対パスが必要です: ${contentId}`);
    const authorship = use.authorship as SourceUse["authorship"];
    const reuse = use.reuse as SourceUse["reuse"];
    if (
      !["original", "original-exercise", "summary", "quotation", "adapted"].includes(authorship) ||
      !Object.hasOwn(AUTHORSHIP_BY_REUSE, reuse)
    )
      throw new Error(`${contentId}: authorship / reuse が不正です`);
    const result: SourceUse = {
      contentId,
      sourceRefs: stringList(use.sourceRefs, "sourceRefs"),
      usedFor: text(use.usedFor, "usedFor"),
      authorship,
      reuse,
      reviewStatus: status(use.reviewStatus),
    };
    // 片方向だけだと original のまま引用・改変を記録でき、「教材独自・引用」のような
    // 食い違う表示が公開ゲートを通ってしまう。
    if (!AUTHORSHIP_BY_REUSE[reuse].includes(authorship))
      throw new Error(
        `${contentId}: authorship ${authorship} と reuse ${reuse} が食い違います。引用は quotation、改変は adapted、独自制作は original / original-exercise にしてください`,
      );
    if (
      result.sourceRefs.length === 0 &&
      (reuse !== "original" || !["original", "original-exercise"].includes(authorship))
    )
      throw new Error(`${contentId}: 根拠となる sourceRefs が必要です`);
    if (["quote", "reprint", "adapt-code", "adapt-diagram"].includes(reuse)) {
      const attr = object(use.attribution, `${contentId}.attribution`);
      if (!isPublicSourceUrl(attr.conditionsUrl))
        throw new Error("attribution.conditionsUrl: HTTP(S) URL が必要です");
      result.attribution = {
        text: text(attr.text, "attribution.text"),
        creator: text(attr.creator, "原作者"),
        scope: text(attr.scope, "再利用範囲"),
        conditionsUrl: new URL(attr.conditionsUrl).href,
        checkedAt: date(attr.checkedAt, "条件確認日"),
        displayAt: text(attr.displayAt, "表示位置"),
      };
      if (result.attribution.displayAt !== contentId)
        throw new Error(`${contentId}: 帰属表示は利用する公開ファイルに置いてください`);
    }
    return result;
  });
  return {
    schemaVersion: "2.1",
    unitId,
    contentHash,
    environmentRef: text(row.environmentRef, "environmentRef"),
    uses,
  };
}
export function readUnitReferences(directory: string): UnitReferences | undefined {
  const file = join(directory, "references.json");
  return existsSync(file) ? parseUnitReferences(JSON.parse(readFileSync(file, "utf8"))) : undefined;
}

/** front-matter は既存の台帳と同じインライン配列。doc/practice/knowledge でも使う。 */
export function readSourceRefs(markdown: string): string[] | undefined {
  const head = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(markdown.replace(/\r\n/g, "\n"));
  if (!head) return undefined;
  const matches = head[1].split("\n").filter((line) => /^sourceRefs:/.test(line));
  if (matches.length === 0) return undefined;
  if (matches.length !== 1) throw new Error("sourceRefs: 重複した front-matter フィールドです");
  const list = /^sourceRefs:\s*\[(.*)\]\s*$/.exec(matches[0]);
  if (!list) throw new Error("sourceRefs: インライン配列で書いてください");
  return stringList(
    list[1].trim() ? list[1].split(",").map((v) => v.trim().replace(/^['"]|['"]$/g, "")) : [],
    "sourceRefs",
  );
}
export function publicReferences(
  refs: UnitReferences | undefined,
  registry: Map<string, SourceRecord>,
  contentId?: string | readonly string[],
): PublicSourceReference[] {
  return (refs?.uses ?? [])
    .filter(
      (use) =>
        contentId === undefined ||
        (typeof contentId === "string"
          ? use.contentId === contentId
          : contentId.includes(use.contentId)),
    )
    .flatMap((use) =>
      use.sourceRefs.map((id) => {
        const source = registry.get(id);
        if (!source) throw new Error(`未登録の sourceRef: ${id}`);
        return {
          id: source.id,
          title: source.title,
          publisher: source.publisher,
          url: source.url,
          section: source.book
            ? `${source.section} (${source.book.edition}, p.${source.book.pages}, ISBN ${source.book.isbn})`
            : source.section,
          documentVersion:
            source.documentVersion.kind === "rolling"
              ? `更新型${source.documentVersion.revision ? ` (${source.documentVersion.revision})` : ""}`
              : (source.documentVersion.revision ?? ""),
          checkedAt: source.checkedAt,
          environmentRef: refs?.environmentRef ?? "",
          usedFor: use.usedFor,
          authorship: use.authorship,
          reuse: use.reuse,
          // 文言 (text) に原作者や条件が書かれているとは限らない。台帳で必須にした項目は
          // 文言と一緒に配り、表示側でも省略しない。表示位置 (displayAt) は配らない。
          ...(use.attribution
            ? {
                attribution: use.attribution.text,
                attributionTerms: {
                  creator: use.attribution.creator,
                  scope: use.attribution.scope,
                  conditionsUrl: use.attribution.conditionsUrl,
                  checkedAt: use.attribution.checkedAt,
                },
              }
            : {}),
        };
      }),
    );
}
function markdownText(value: string): string {
  return value.replace(/[\\`*_{}\[\]<>]/g, "\\$&").replace(/[\r\n]+/g, " ");
}
/**
 * 帰属表示の文言と、その根拠 (原作者・再利用範囲・利用条件・条件の確認日)。条件の URL は
 * 文言に混ぜてエスケープすると GFM の自動リンクが `\_` ごと href にしてしまうので、リンクで書く。
 */
function attributionMarkdown(ref: PublicSourceReference): string {
  if (!ref.attribution) return "";
  const terms = ref.attributionTerms;
  return `\n  - ${markdownText(ref.attribution)}${terms ? `\n  - 原作者: ${markdownText(terms.creator)} / 再利用範囲: ${markdownText(terms.scope)} / 利用条件: [${markdownText(terms.conditionsUrl)}](<${terms.conditionsUrl}>) / 条件確認日: ${terms.checkedAt}` : ""}`;
}
export function referencesMarkdown(refs: PublicSourceReference[], heading = "参照元"): string {
  if (refs.length === 0) return "";
  const rows = new Map<string, PublicSourceReference>();
  for (const ref of refs)
    rows.set(
      `${ref.id}:${ref.usedFor}:${ref.attribution ?? ""}:${JSON.stringify(ref.attributionTerms ?? null)}`,
      ref,
    );
  return `\n\n## ${heading}\n\n${[...rows.values()].map((r) => `- [${markdownText(r.title)}](<${r.url}>) — ${markdownText(r.publisher)} / ${markdownText(r.section)}\n  - 確認すること: ${markdownText(r.usedFor)}\n  - ${SOURCE_AUTHORSHIP_LABELS[r.authorship]}・${SOURCE_REUSE_LABELS[r.reuse]} / 資料: ${markdownText(r.documentVersion)} / 確認日: ${r.checkedAt} / 環境: ${markdownText(r.environmentRef)}${attributionMarkdown(r)}`).join("\n")}\n`;
}
/** front-matter は本文ではない。受講者の本文 (referencedMarkdown) と同じ範囲を読む。 */
function markdownBody(source: string): string {
  return /^---\r?\n/.test(source) ? stripFrontMatter(source) : source;
}
/**
 * Markdown の画像の参照先。受講者の画面・配布 PDF と同じ CommonMark + GFM の構文木で読むので、
 * alt のエスケープ (`![a\]b](...)`)・`<...>` 囲み・括弧・タイトル付きの参照先も、参照形式
 * (`![図][page]`・`![page][]`・`![page]` と `[page]: assets/page.svg`) の画像も拾う。
 * コード・HTML コメントの中の画像の書き方は画像として描かれないので数えない。
 */
/** 構文解析器は使い回す (教材全体の manifest で文書ごとに組み立て直すと重い)。 */
const markdownParser = unified().use(remarkParse).use(remarkGfm).freeze();
export function markdownImageDestinations(source: string): string[] {
  // 画像の構文は必ず `![` を含むので、無い文書は解析しない。
  if (!source.includes("![")) return [];
  const tree = markdownParser.parse(markdownBody(source));
  // ラベルは構文木の identifier (大文字小文字・空白を正規化した値) で引く。同じラベルの
  // 定義が重なったら CommonMark と同じく最初の定義を使う。
  const definitions = new Map<string, string>();
  visit(tree, "definition", (node) => {
    if (!definitions.has(node.identifier)) definitions.set(node.identifier, node.url);
  });
  const destinations: string[] = [];
  visit(tree, (node) => {
    const url =
      node.type === "image"
        ? node.url
        : node.type === "imageReference"
          ? definitions.get(node.identifier)
          : undefined;
    if (url) destinations.push(url);
  });
  return destinations;
}
export function referenceContentIds(source: string, contentId: string): string[] {
  return [
    contentId,
    ...markdownImageDestinations(source).map((destination) =>
      posix.normalize(posix.join(posix.dirname(contentId), destination)),
    ),
  ];
}
/**
 * 本文の後ろに付ける出典欄。独自制作の記録を外部資料の一覧より先に出す。
 * 解説・知識問題・課題・スライドで文言を揃えるため、本文の組み立て方が違ってもここを通す。
 * `source` は使用箇所 (本文と図) を解決するための元ファイルの本文。
 */
export function referenceNotesMarkdown(
  source: string,
  references: PublicSourceReference[],
  refs: UnitReferences,
  contentId?: string,
): string {
  const ids = contentId ? referenceContentIds(source, contentId) : [];
  const originals = refs.uses.filter((u) => ids.includes(u.contentId) && u.reuse === "original");
  return (
    originals.map((u) => `\n\n> 教材独自に作成: ${markdownText(u.usedFor)}\n`).join("") +
    referencesMarkdown(references)
  );
}
export function referencedMarkdown(
  source: string,
  references: PublicSourceReference[],
  refs?: UnitReferences,
  contentId?: string,
): string {
  // 参照元の記録が読めない単元でも、front-matter (sourceRefs) を受講者の本文に出さない。
  const body = markdownBody(source);
  if (!refs) return body;
  return body + referenceNotesMarkdown(source, references, refs, contentId);
}

/** 公開教材だけ列挙する。private/ とスターター・実行用テストは出典の対応先にしない。 */
export function publicContentFiles(directory: string): string[] {
  const files: string[] = [];
  function walk(dir: string, prefix: string) {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      const rel = prefix ? `${prefix}/${entry}` : entry;
      if (["private", "starter", "tests", ".git", "node_modules"].includes(entry)) continue;
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) throw new Error(`参照先にシンボリックリンクは使えません: ${rel}`);
      if (stat.isDirectory()) walk(path, rel);
      else if (
        ["slides.md", "doc.md", "practice.md", "knowledge.md", "README.md"].includes(entry) ||
        /\/assets\/[^/]+\.(svg|png|webp|jpg)$/.test(rel)
      )
        files.push(rel);
    }
  }
  walk(directory, "");
  return files.sort();
}
