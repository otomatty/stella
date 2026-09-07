/**
 * 組織マスタ一覧を取得する Hook (Issue #29)。
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { OrganizationRow } from "@stella/shared/admin/types";
import { listOrganizations } from "@/lib/organizations-api";

interface UseOrganizationsResult {
  organizations: OrganizationRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useOrganizations(enabled: boolean): UseOrganizationsResult {
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    if (!enabled) {
      setOrganizations([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listOrganizations();
      if (reqId !== requestIdRef.current) return;
      setOrganizations(rows);
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

  return { organizations, loading, error, refetch };
}
