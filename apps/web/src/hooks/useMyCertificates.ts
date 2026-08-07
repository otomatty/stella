/**
 * 受講者本人の修了証一覧を取得する Hook。
 * バックエンド未設定 / 未ログイン時は no-op (空配列) で、 fixtures に依存しない。
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { CertificateRow } from "@falcon/shared/cms/types";
import { listCertificatesForUser } from "@/lib/certificates-api";
import { isBackendConfigured } from "@/lib/backend";

export interface UseMyCertificatesResult {
  certificates: CertificateRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMyCertificates(
  userId: string | null,
  enabled = true,
): UseMyCertificatesResult {
  const [certificates, setCertificates] = useState<CertificateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    if (!enabled || !userId || !isBackendConfigured()) {
      setCertificates([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listCertificatesForUser(userId);
      if (reqId !== requestIdRef.current) return;
      setCertificates(rows.filter((r) => !r.revoked));
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [enabled, userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { certificates, loading, error, refetch };
}
