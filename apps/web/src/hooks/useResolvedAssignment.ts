/**
 * Assignment を id から解決する Hook。
 *
 * 認証付き API の課題データだけを使う。課題定義の静的 import は解答例まで
 * Web の配信物へ混ぜるため、デモや API エラー時にも行わない (#35)。
 * id が null の間は問い合わせない (通常のレッスンや閉じたチャット)。
 */

import { useEffect, useState } from "react";
import type { Assignment } from "@stella/shared/types";
import { mapAssignmentRowToAssignment } from "@stella/shared/cms/types";
import { isBackendConfigured } from "@/lib/backend";
import { getAssignmentRow } from "@/lib/cms-api";

interface Result {
  assignment: Assignment | null;
  loading: boolean;
  error: string | null;
}

/** id がある間だけ API から課題を取得し、別の id に対する古い応答は採用しない。 */
export function useResolvedAssignment(id: string | null): Result {
  const backendEnabled = isBackendConfigured();
  const [state, setState] = useState<{ id: string | null; result: Result }>({
    id,
    result: { assignment: null, loading: backendEnabled && id !== null, error: null },
  });

  useEffect(() => {
    if (!backendEnabled || id === null) {
      setState({ id, result: { assignment: null, loading: false, error: null } });
      return;
    }
    let cancelled = false;
    setState({ id, result: { assignment: null, loading: true, error: null } });
    (async () => {
      try {
        const row = await getAssignmentRow(id);
        if (cancelled) return;
        setState({
          id,
          result: {
            assignment: row ? mapAssignmentRowToAssignment(row) : null,
            loading: false,
            error: null,
          },
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          id,
          result: {
            assignment: null,
            loading: false,
            error: err instanceof Error ? err.message : "unknown",
          },
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, backendEnabled]);

  // effect の実行前の render でも、前の課題を新しい文脈へ渡さない。
  if (!backendEnabled || state.id !== id) {
    return { assignment: null, loading: backendEnabled && id !== null, error: null };
  }
  return state.result;
}
