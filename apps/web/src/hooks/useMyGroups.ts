import { useEffect, useState } from "react";
import type { LearnerGroup } from "@stella/shared/groups/types";
import { ApiClientError } from "@/lib/api-client";
import { listMyGroups } from "@/lib/groups-api";

export type MyGroups =
  | { status: "loading" }
  | { status: "error"; accessDenied: boolean }
  | { status: "ready"; groups: LearnerGroup[] };

type GroupResult = { userId: string; data: MyGroups } | null;

export function resolveMyGroups(
  previous: GroupResult,
  userId: string,
  outcome: { groups: LearnerGroup[] } | { error: unknown },
): GroupResult {
  if ("groups" in outcome) return { userId, data: { status: "ready", groups: outcome.groups } };
  const status = outcome.error instanceof ApiClientError ? outcome.error.status : undefined;
  const accessDenied = status === 401 || status === 403 || status === 404;
  if (
    (status === undefined || status >= 500) &&
    previous?.userId === userId &&
    previous.data.status === "ready"
  ) {
    return previous;
  }
  return { userId, data: { status: "error", accessDenied } };
}

export function useMyGroups(userId: string | null): MyGroups {
  const [result, setResult] = useState<GroupResult>(null);
  useEffect(() => {
    setResult(null);
    if (userId === null) return;
    let request: AbortController | undefined;
    const load = () => {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      const { signal } = controller;
      void listMyGroups(signal).then(
        (groups) => {
          if (!signal.aborted)
            setResult((previous) => resolveMyGroups(previous, userId, { groups }));
        },
        (error: unknown) => {
          if (!signal.aborted)
            setResult((previous) => resolveMyGroups(previous, userId, { error }));
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
