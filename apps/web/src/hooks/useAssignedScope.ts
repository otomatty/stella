/**
 * 「担当の受講者だけ」の切り替え (#38)。添削待ちキューと講師ダッシュボードで共有する。
 *
 * 担当は `GET /api/learning-pace/learners` から取り、自分が担当講師の行だけを使う
 * (講師には担当の受講者だけが返り、管理者には全員と担当講師が返る)。
 * 既定は「担当がいれば担当だけ」。担当講師はまず自分の受講者を見るため (07 §6.5)。
 * 担当のいない講師と、取得に失敗したときは、これまでどおり全員を出す (何も隠さない)。
 * 明示した選択だけをこのブラウザに覚える。
 */

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

const STORAGE_KEY = "stella_assigned_scope_v1";
const NONE: ReadonlySet<string> = new Set();

function readChoice(): boolean | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === "assigned" ? true : raw === "all" ? false : null;
  } catch {
    return null;
  }
}

function writeChoice(assignedOnly: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, assignedOnly ? "assigned" : "all");
  } catch {
    /* 保存できなくても今の画面では切り替わる */
  }
}

export interface AssignedScope {
  /** 担当の取得が済んだか。済むまでは絞り込まない。 */
  ready: boolean;
  /** 担当している受講者の ID。 */
  assignedIds: ReadonlySet<string>;
  hasAssigned: boolean;
  assignedOnly: boolean;
  setAssignedOnly: (value: boolean) => void;
}

export function useAssignedScope(currentUserId: string | null, enabled: boolean): AssignedScope {
  const [assignedIds, setAssignedIds] = useState<ReadonlySet<string> | null>(null);
  const [choice, setChoice] = useState<boolean | null>(readChoice);

  useEffect(() => {
    if (!enabled || !currentUserId) {
      setAssignedIds(NONE);
      return;
    }
    const controller = new AbortController();
    setAssignedIds(null);
    apiFetch<{ learners: { id: string; instructorId: string | null }[] }>(
      "/api/learning-pace/learners",
      { signal: controller.signal },
    )
      .then((data) => {
        if (controller.signal.aborted) return;
        setAssignedIds(
          new Set(data.learners.filter((l) => l.instructorId === currentUserId).map((l) => l.id)),
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setAssignedIds(NONE);
      });
    return () => controller.abort();
  }, [currentUserId, enabled]);

  const setAssignedOnly = useCallback((value: boolean) => {
    setChoice(value);
    writeChoice(value);
  }, []);

  const ids = assignedIds ?? NONE;
  const hasAssigned = ids.size > 0;
  return {
    ready: assignedIds !== null,
    assignedIds: ids,
    hasAssigned,
    assignedOnly: hasAssigned && (choice ?? true),
    setAssignedOnly,
  };
}
