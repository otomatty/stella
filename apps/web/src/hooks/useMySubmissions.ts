import { useCallback, useEffect, useState } from "react";
import type { Submission } from "@falcon/shared/review/types";
import { isBackendConfigured } from "@/lib/backend";
import { fetchMySubmissions } from "@/lib/submissions-api";

export function useMySubmissions(enabled: boolean): {
  submissions: Submission[];
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const backend = isBackendConfigured();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(backend && enabled);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: tick は reload() の再取得トリガー
  useEffect(() => {
    if (!enabled || !backend) {
      setSubmissions([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void fetchMySubmissions()
      .then((rows) => {
        if (cancelled) return;
        setSubmissions(rows);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[useMySubmissions] failed", err);
        setSubmissions([]);
        setError(err instanceof Error ? err.message : "提出履歴の取得に失敗しました");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, backend, tick]);

  return { submissions, loading, error, reload };
}
