import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
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
function date(raw: unknown, at: string): string {
  const value = text(raw, at);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(value).toISOString().slice(0, 10) !== value)
    throw new Error(`${at}: YYYY-MM-DD の日付が必要です`);
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
        conditionsUrl: attr.conditionsUrl,
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
          ...(use.attribution ? { attribution: use.attribution.text } : {}),
        };
      }),
    );
}
function markdownText(value: string): string {
  return value.replace(/[\\`*_{}\[\]<>]/g, "\\$&").replace(/[\r\n]+/g, " ");
}
export function referencesMarkdown(refs: PublicSourceReference[], heading = "参照元"): string {
  if (refs.length === 0) return "";
  const rows = new Map<string, PublicSourceReference>();
  for (const ref of refs) rows.set(`${ref.id}:${ref.usedFor}:${ref.attribution ?? ""}`, ref);
  return `\n\n## ${heading}\n\n${[...rows.values()].map((r) => `- [${markdownText(r.title)}](<${r.url}>) — ${markdownText(r.publisher)} / ${markdownText(r.section)}\n  - 確認すること: ${markdownText(r.usedFor)}\n  - ${SOURCE_AUTHORSHIP_LABELS[r.authorship]}・${SOURCE_REUSE_LABELS[r.reuse]} / 資料: ${markdownText(r.documentVersion)} / 確認日: ${r.checkedAt} / 環境: ${markdownText(r.environmentRef)}${r.attribution ? `\n  - ${markdownText(r.attribution)}` : ""}`).join("\n")}\n`;
}
export function referenceContentIds(source: string, contentId: string): string[] {
  return [
    contentId,
    ...[...source.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) =>
      posix.normalize(posix.join(posix.dirname(contentId), m[1])),
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
  if (!refs) return source;
  const body = /^---\r?\n/.test(source) ? stripFrontMatter(source) : source;
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
