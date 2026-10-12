/**
 * 管理 UI 向けに同テナントの profiles を取得する Hook。
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { listProfiles, type AccessRequestRow, type AdminProfileRow } from "@/lib/admin-users-api";

interface UseProfilesResult {
  profiles: AdminProfileRow[];
  requests: AccessRequestRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProfiles(tenantId: string | null): UseProfilesResult {
  const [profiles, setProfiles] = useState<AdminProfileRow[]>([]);
  const [requests, setRequests] = useState<AccessRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    if (!tenantId) {
      setProfiles([]);
      setRequests([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const listed = await listProfiles(tenantId);
      if (reqId !== requestIdRef.current) return;
      setProfiles(listed.profiles);
      setRequests(listed.requests);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { profiles, requests, loading, error, refetch };
}
