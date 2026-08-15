/**
 * 自分宛の通知を取得・既読化する Hook (Issue #25)。
 *
 * バックエンド未設定時は no-op (空配列) で fixtures に依存しない (Q&A と同方針)。
 * 既読化は楽観更新で即座に UI へ反映し、 失敗時はサーバ状態へ refetch で巻き戻す。
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { NotificationRow } from "@falcon/shared/cms/types";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications-api";
import { isBackendConfigured } from "@/lib/backend";

export interface UseNotificationsResult {
  notifications: NotificationRow[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export function useNotifications(
  tenantId: string,
  userId: string | null,
  enabled = true,
): UseNotificationsResult {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  // userId を鍵に含め、 ログアウト→別ユーザーのログイン (同テナント) でも
  // 前ユーザーの通知が残らないよう refetch / クリアされるようにする。
  const active = enabled && isBackendConfigured() && Boolean(userId);

  const refetch = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    if (!active) {
      setNotifications([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listNotifications({ tenantId, limit: 30 });
      if (reqId !== requestIdRef.current) return;
      setNotifications(rows);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [active, tenantId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const markRead = useCallback(
    async (id: string) => {
      if (!active) return;
      // 楽観更新: 先に既読へ。 失敗したら refetch でサーバ状態へ戻す。
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      try {
        await markNotificationRead(id);
      } catch (err) {
        console.error("[useNotifications] markRead failed", err);
        await refetch();
      }
    },
    [active, refetch],
  );

  const markAllRead = useCallback(async () => {
    if (!active) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsRead(tenantId);
    } catch (err) {
      console.error("[useNotifications] markAllRead failed", err);
      await refetch();
    }
  }, [active, tenantId, refetch]);

  const unreadCount = notifications.reduce((n, x) => n + (x.read ? 0 : 1), 0);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refetch,
    markRead,
    markAllRead,
  };
}
