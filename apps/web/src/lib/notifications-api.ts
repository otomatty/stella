/**
 * 通知・お知らせのデータアクセス層 (Issue #25 — Neon / Hono API)。
 *
 * 旧 BaaS 直アクセス (RLS + fan-out トリガー) を Hono API 経由に置き換えた。
 * author の確定・受講者への fan-out・本人限定の既読化はすべてサーバ側で行う。
 */

import type { AnnouncementRow, NotificationRow } from "@stella/shared/cms/types";
import { apiFetch } from "./api-client";

export interface ListAnnouncementsOpts {
  tenantId: string;
  /** ステージ単位のお知らせに絞る (未指定時はテナント全体 + 全ステージ)。 */
  stageId?: string;
  /** 取得件数の上限 (既定 20)。 */
  limit?: number;
}

/** 公開順 (published_at 降順) でお知らせを取得する。 */
export async function listAnnouncements(opts: ListAnnouncementsOpts): Promise<AnnouncementRow[]> {
  const p = new URLSearchParams();
  if (opts.stageId) p.set("stageId", opts.stageId);
  if (opts.limit) p.set("limit", String(opts.limit));
  const qs = p.toString();
  const { rows } = await apiFetch<{ rows: AnnouncementRow[] }>(
    `/api/announcements${qs ? `?${qs}` : ""}`,
  );
  return rows ?? [];
}

export interface CreateAnnouncementInput {
  tenantId: string;
  /** ステージ単位のお知らせにする場合の対象ステージ (省略 / null でテナント全体)。 */
  stageId?: string | null;
  title: string;
  body: string;
}

/**
 * お知らせを作成する。 author はサーバが caller から確定し、 対象受講者へ fan-out する。
 */
export async function createAnnouncement(input: CreateAnnouncementInput): Promise<AnnouncementRow> {
  const { row } = await apiFetch<{ row: AnnouncementRow }>("/api/announcements", {
    method: "POST",
    body: {
      stageId: input.stageId ?? null,
      title: input.title,
      body: input.body,
    },
  });
  if (!row) throw new Error("お知らせの作成結果が空でした");
  return row;
}

export interface ListNotificationsOpts {
  /** 対象テナント (サーバは caller のテナントに固定するため送信のみ互換)。 */
  tenantId: string;
  /** 未読のみに絞る。 */
  unreadOnly?: boolean;
  /** 取得件数の上限 (既定 30)。 */
  limit?: number;
}

/** 自分宛の通知を新着順で取得する。 */
export async function listNotifications(opts: ListNotificationsOpts): Promise<NotificationRow[]> {
  const p = new URLSearchParams();
  if (opts.unreadOnly) p.set("unreadOnly", "true");
  if (opts.limit) p.set("limit", String(opts.limit));
  const qs = p.toString();
  const { rows } = await apiFetch<{ rows: NotificationRow[] }>(
    `/api/notifications${qs ? `?${qs}` : ""}`,
  );
  return rows ?? [];
}

/** 通知を既読にする。 */
export async function markNotificationRead(id: string): Promise<void> {
  await apiFetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: "PATCH",
  });
}

/** 自分宛の未読通知をすべて既読にする (当該テナント内)。 */
export async function markAllNotificationsRead(_tenantId: string): Promise<void> {
  await apiFetch("/api/notifications/read-all", { method: "POST" });
}
