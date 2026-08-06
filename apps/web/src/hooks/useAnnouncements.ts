/**
 * お知らせ一覧を取得する Hook (Issue #25)。
 *
 * - バックエンド設定時: `announcements` テーブルから同テナントのお知らせを公開順で取得。
 * - 未設定時 (demo-only): fixtures の ANNOUNCEMENTS を AnnouncementRow 形へ写像して返す。
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { AnnouncementRow } from "@falcon/shared/cms/types";
import { listAnnouncements } from "@/lib/notifications-api";
import { isBackendConfigured } from "@/lib/backend";
import { ANNOUNCEMENTS } from "@/demo/fixtures";

export interface UseAnnouncementsResult {
  announcements: AnnouncementRow[];
  loading: boolean;
  error: string | null;
  source: "db" | "fixtures" | "error";
  refetch: () => Promise<void>;
}

/** fixtures の Announcement を AnnouncementRow 形へ写像する (demo-only 用)。 */
function fixtureAnnouncements(tenantId: string): AnnouncementRow[] {
  const now = Date.now();
  return ANNOUNCEMENTS.map((a, i) => ({
    id: `fixture-${a.id}`,
    tenant_id: tenantId,
    course_id: null,
    author_id: null,
    author_name: a.by,
    title: a.title,
    body: "",
    // 先頭ほど新しく見えるよう、 数日ずつ過去にずらす (新着判定用)。
    published_at: new Date(now - i * 3 * 86_400_000).toISOString(),
    created_at: new Date(now - i * 3 * 86_400_000).toISOString(),
  }));
}

export function useAnnouncements(
  tenantId: string,
  enabled = true,
): UseAnnouncementsResult {
  const backend = isBackendConfigured();
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>(() =>
    backend ? [] : fixtureAnnouncements(tenantId),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"db" | "fixtures" | "error">(
    backend ? "db" : "fixtures",
  );
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    if (!enabled || !isBackendConfigured()) {
      const backend = isBackendConfigured();
      setAnnouncements(backend ? [] : fixtureAnnouncements(tenantId));
      setSource(backend ? "db" : "fixtures");
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listAnnouncements({ tenantId });
      if (reqId !== requestIdRef.current) return;
      setAnnouncements(rows);
      setSource("db");
      setError(null);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      console.error("[useAnnouncements] fetch failed", err);
      setAnnouncements([]);
      setSource("error");
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [enabled, tenantId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { announcements, loading, error, source, refetch };
}
