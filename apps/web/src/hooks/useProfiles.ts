/**
 * 管理 UI 向けに profiles を取得する Hook。
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { listProfiles, type AdminProfileRow } from "@/lib/admin-users-api";

interface UseProfilesResult {
  profiles: AdminProfileRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/** `enabled` が false のあいだは取らない (ログイン前・権限の無い画面)。 */
export function useProfiles(enabled = true): UseProfilesResult {
  const [profiles, setProfiles] = useState<AdminProfileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    if (!enabled) {
      setProfiles([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listProfiles();
      if (reqId !== requestIdRef.current) return;
      setProfiles(rows);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { profiles, loading, error, refetch };
}
