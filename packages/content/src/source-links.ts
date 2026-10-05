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
    | "anchor-missing";
  httpStatus?: number;
}
export type FetchSource = (url: string, init: RequestInit) => Promise<Response>;

/** 削除と、応答を確認できない状態を分ける。本文や台帳を自動で削除しない。 */
export async function checkSourceLink(
  source: { id: string; url: string },
  fetcher: FetchSource = fetch,
  timeoutMs = 10_000,
  now = new Date(),
): Promise<SourceLinkResult> {
  const base = { sourceRef: source.id, url: source.url, checkedAt: now.toISOString() };
  if (!isPublicSourceUrl(source.url)) throw new Error("参照元に公開資料の HTTP(S) URL が必要です");
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const url = new URL(source.url);
    let response = await fetcher(source.url, {
      method: url.hash ? "GET" : "HEAD",
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
    if (url.hash && response.headers.get("content-type")?.includes("text/html")) {
      const body = await response.text();
      const anchor = decodeURIComponent(url.hash.slice(1));
      const ids = [...body.matchAll(/(?:id|name)\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
      if (!ids.includes(anchor))
        return { ...details, status: "manual-confirmation", reason: "anchor-missing" };
    } else await response.body?.cancel();
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
