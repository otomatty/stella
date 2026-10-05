import { isPublicSourceUrl } from "../../shared/src/tasks/source-reference.js";

export interface SourceLinkResult {
  sourceRef: string;
  url: string;
  finalUrl?: string;
  checkedAt: string;
  status: "available" | "removed" | "manual-confirmation";
  reason:
    | "ok"
    | "http-404"
    | "http-410"
    | "access-restricted"
    | "timeout"
    | "network-error"
    | "server-error"
    | "unexpected-response"
    | "anchor-missing"
    | "section-missing";
  httpStatus?: number;
  /** ページの見出しに見つからなかった読む節。手動確認で見る場所を示す。 */
  missingSections?: string[];
}
export type FetchSource = (url: string, init: RequestInit) => Promise<Response>;

/** 台帳の `section` は読む節を ` / ` で区切る。`Request/Response` のような節名は割らない。 */
export function sourceSections(section: string | undefined): string[] {
  return (section ?? "")
    .split(/\s+[/／]\s+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};
function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (!name.startsWith("#")) return NAMED_ENTITIES[name.toLowerCase()] ?? whole;
    const code = /^#x/i.test(name)
      ? Number.parseInt(name.slice(2), 16)
      : Number.parseInt(name.slice(1), 10);
    return code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  });
}
/** 全角・半角、大文字・小文字、空白 (和文の前後の空白の有無を含む) の違いでは見失わない。 */
function headingKey(text: string): string {
  return decodeEntities(text).normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}
/**
 * 読む節のうち、ページの見出し (h1〜h6) に見つからないもの。見出しの前後に付く節番号や
 * 記号は許すため、見出しが節名を含めば見つかったとみなす。
 */
export function missingSourceSections(html: string, sections: readonly string[]): string[] {
  const headings = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi)].map((m) =>
    headingKey(m[2].replace(/<[^>]*>/g, "")),
  );
  return sections.filter((name) => {
    const key = headingKey(name);
    return !headings.some((heading) => heading.includes(key));
  });
}

/**
 * 削除と、応答を確認できない状態を分ける。本文や台帳を自動で削除しない。
 * URL の `#` と台帳の `section` が指す場所は、HTML の本文を取得して確かめる。
 * 書籍の節は販売・紹介ページに載らないので照合しない。
 */
export async function checkSourceLink(
  source: { id: string; url: string; section?: string; kind?: string },
  fetcher: FetchSource = fetch,
  timeoutMs = 10_000,
  now = new Date(),
): Promise<SourceLinkResult> {
  const base = { sourceRef: source.id, url: source.url, checkedAt: now.toISOString() };
  if (!isPublicSourceUrl(source.url)) throw new Error("参照元に公開資料の HTTP(S) URL が必要です");
  const sections = source.kind === "book" ? [] : sourceSections(source.section);
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const url = new URL(source.url);
    const readsBody = Boolean(url.hash) || sections.length > 0;
    let response = await fetcher(source.url, {
      method: readsBody ? "GET" : "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
    if ([405, 501].includes(response.status)) {
      await response.body?.cancel();
      response = await fetcher(source.url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
      });
    }
    const details = { ...base, httpStatus: response.status, finalUrl: response.url || source.url };
    if ([404, 410].includes(response.status)) {
      await response.body?.cancel();
      return {
        ...details,
        status: "removed",
        reason: response.status === 404 ? "http-404" : "http-410",
      };
    }
    if ([401, 403, 407, 429, 451].includes(response.status)) {
      await response.body?.cancel();
      return { ...details, status: "manual-confirmation", reason: "access-restricted" };
    }
    if (!response.ok) {
      await response.body?.cancel();
      return {
        ...details,
        status: "manual-confirmation",
        reason: response.status >= 500 ? "server-error" : "unexpected-response",
      };
    }
    // 見出しを照合できるのは HTML だけ。PDF などは応答の確認にとどめる。
    if (!readsBody || !response.headers.get("content-type")?.includes("text/html")) {
      await response.body?.cancel();
      return { ...details, status: "available", reason: "ok" };
    }
    const body = await response.text();
    if (url.hash) {
      const anchor = decodeURIComponent(url.hash.slice(1));
      const ids = [...body.matchAll(/(?:id|name)\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
      if (!ids.includes(anchor))
        return { ...details, status: "manual-confirmation", reason: "anchor-missing" };
    }
    // 節が消えてもページは残るので削除にはせず、人がページと節を確かめる。
    const missingSections = missingSourceSections(body, sections);
    if (missingSections.length > 0)
      return {
        ...details,
        status: "manual-confirmation",
        reason: "section-missing",
        missingSections,
      };
    return { ...details, status: "available", reason: "ok" };
  } catch {
    return {
      ...base,
      status: "manual-confirmation",
      reason: timedOut ? "timeout" : "network-error",
    };
  } finally {
    clearTimeout(timer);
  }
}

export interface ManualLinkCheck {
  sourceRef: string;
  url: string;
  checkedAt: string;
  reviewer: string;
  result: "available" | "removed";
  note: string;
}
export function parseManualLinkChecks(raw: unknown): ManualLinkCheck[] {
  if (!Array.isArray(raw))
    throw new Error("sources/link-checks.json は手動確認記録の配列が必要です");
  return raw.map((entry) => {
    if (typeof entry !== "object" || !entry || Array.isArray(entry))
      throw new Error("手動確認記録が不正です");
    const row = entry as Record<string, unknown>;
    for (const key of ["sourceRef", "checkedAt", "reviewer", "note"])
      if (typeof row[key] !== "string" || !row[key].trim())
        throw new Error(`手動確認の ${key} が必要です`);
    if (
      !isPublicSourceUrl(row.url) ||
      !["available", "removed"].includes(String(row.result)) ||
      !Number.isFinite(Date.parse(String(row.checkedAt)))
    )
      throw new Error("手動確認の URL・結果・日時が不正です");
    return {
      sourceRef: row.sourceRef as string,
      url: row.url,
      checkedAt: row.checkedAt as string,
      reviewer: row.reviewer as string,
      result: row.result as ManualLinkCheck["result"],
      note: row.note as string,
    };
  });
}
