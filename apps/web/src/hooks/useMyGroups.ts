import { useEffect, useState } from "react";
import type { LearnerGroup } from "@stella/shared/groups/types";
import { listMyGroups } from "@/lib/groups-api";

export type MyGroups =
  | { status: "loading" | "error" }
  | { status: "ready"; groups: LearnerGroup[] };

export function useMyGroups(userId: string | null): MyGroups {
  const [result, setResult] = useState<{ userId: string; data: MyGroups } | null>(null);
  useEffect(() => {
    if (userId === null) {
      setResult(null);
      return;
    }
    let request: AbortController | undefined;
    const load = () => {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      const { signal } = controller;
      void listMyGroups(signal).then(
        (groups) => {
          if (!signal.aborted) setResult({ userId, data: { status: "ready", groups } });
        },
        () => {
          if (!signal.aborted) setResult({ userId, data: { status: "error" } });
        },
      );
    };
    load();
    window.addEventListener("focus", load);
    return () => {
      window.removeEventListener("focus", load);
      request?.abort();
    };
  }, [userId]);

  if (userId === null) return { status: "ready", groups: [] };
  return result?.userId === userId ? result.data : { status: "loading" };
}
