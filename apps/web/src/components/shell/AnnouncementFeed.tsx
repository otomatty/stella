import { useCallback, useEffect, useRef, useState } from "react";
import type { AnnouncementRow } from "@stella/shared/cms/types";
import { Button } from "@/components/ui/button";
import { SkeletonRows } from "@/components/ui/skeleton";
import { isBackendConfigured } from "@/lib/backend";
import { listAnnouncements } from "@/lib/notifications-api";

/** 通知に残っていない連絡や、受講開始前に公開された連絡も読める一覧。 */
export function AnnouncementFeed() {
  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(isBackendConfigured);
  const [error, setError] = useState<string | null>(null);
  const failedOffset = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const load = useCallback(async (offset: number) => {
    if (!isBackendConfigured()) return;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    failedOffset.current = offset;
    setLoading(true);
    setError(null);
    try {
      const page = await listAnnouncements(offset, controller.signal);
      if (controller.signal.aborted) return;
      setRows((previous) => {
        if (offset === 0) return page.rows;
        const seen = new Set(previous.map((row) => row.id));
        return [...previous, ...page.rows.filter((row) => !seen.has(row.id))];
      });
      setNextOffset(page.nextOffset);
    } catch (err) {
      if (!controller.signal.aborted)
        setError(err instanceof Error ? err.message : "お知らせを取得できませんでした");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(0);
    return () => pending.current?.abort();
  }, [load]);

  return (
    <div>
      {rows.map((row) => (
        <article key={row.id} className="border-b border-border px-4 py-3">
          <h3 className="text-[12.5px] font-semibold leading-snug">{row.title}</h3>
          <p className="mt-1 whitespace-pre-wrap break-words text-[12px] text-ink-2">{row.body}</p>
          <p className="mt-2 text-[10.5px] text-ink-3">
            {row.author_name || "お知らせ"} ·{" "}
            {new Date(row.published_at).toLocaleDateString("ja-JP")}
          </p>
        </article>
      ))}
      {loading ? <SkeletonRows rows={3} className="p-4" /> : null}
      {error ? (
        <div className="space-y-2 p-4">
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
          <Button size="sm" variant="outline" onClick={() => void load(failedOffset.current)}>
            再試行
          </Button>
        </div>
      ) : !loading && rows.length === 0 ? (
        <p className="p-4 text-[12.5px] text-ink-3">お知らせはありません。</p>
      ) : null}
      {!loading && !error && nextOffset != null ? (
        <div className="p-3 text-center">
          <Button size="sm" variant="outline" onClick={() => void load(nextOffset)}>
            以前のお知らせを表示
          </Button>
        </div>
      ) : null}
    </div>
  );
}
