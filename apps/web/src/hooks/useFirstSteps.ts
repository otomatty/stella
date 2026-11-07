import { useEffect, useState } from "react";
import type { FirstSteps } from "@stella/shared/study/first-steps";
import { apiFetch } from "@/lib/api-client";
import { isBackendConfigured } from "@/lib/backend";

/** 取得失敗・ユーザー切り替え時は隠す。VS Code から戻ったときにも取り直す。 */
export function useFirstSteps(userId?: string, enabled = true): FirstSteps | null {
  const [loaded, setLoaded] = useState<{ userId?: string; data: FirstSteps } | null>(null);
  useEffect(() => {
    if (!enabled || !isBackendConfigured()) return;
    let controller: AbortController | undefined;
    const load = () => {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      void apiFetch<FirstSteps>(
        `/api/onboarding/first-steps${userId ? `/${encodeURIComponent(userId)}` : ""}`,
        { signal: current.signal },
      )
        .then((data) => {
          if (!current.signal.aborted) setLoaded({ userId, data });
        })
        .catch(() => {
          if (!current.signal.aborted) setLoaded(null);
        });
    };
    load();
    window.addEventListener("focus", load);
    return () => {
      controller?.abort();
      window.removeEventListener("focus", load);
    };
  }, [userId, enabled]);
  return enabled && loaded?.userId === userId ? (loaded?.data ?? null) : null;
}
