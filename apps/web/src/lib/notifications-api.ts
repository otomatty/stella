/**
 * 通知・お知らせのデータアクセス層 (Issue #25)。
 *
 * RLS:
 *   - announcements は同テナントの認証済みユーザが read、 講師/管理者が write。
 *     author_id / author_name は DB トリガーが auth.uid() の profile から確定する。
 *   - notifications は本人のみ read/既読化/削除。 生成 (insert) は DB トリガー経由のみで、
 *     クライアントからは直接作れない (他人宛の捏造を防ぐ)。
 *
 * いずれも RLS 配下の Supabase クライアントから直接 read/write する。
 */

import type {
  AnnouncementRow,
  NotificationRow,
} from "@falcon/shared/cms/types";
import { getSupabase } from "./supabase";

const ANNOUNCEMENT_COLS =
  "id, tenant_id, course_id, author_id, author_name, title, body, published_at, created_at";
const NOTIFICATION_COLS =
  "id, user_id, tenant_id, type, title, body, payload, read, created_at";

export interface ListAnnouncementsOpts {
  tenantId: string;
  /** コース単位のお知らせに絞る (未指定時はテナント全体 + 全コース)。 */
  courseId?: string;
  /** 取得件数の上限 (既定 20)。 */
  limit?: number;
}

/** 公開順 (published_at 降順) でお知らせを取得する。 */
export async function listAnnouncements(
  opts: ListAnnouncementsOpts,
): Promise<AnnouncementRow[]> {
  const supabase = getSupabase();
  let query = supabase
    .from("announcements")
    .select(ANNOUNCEMENT_COLS)
    .eq("tenant_id", opts.tenantId)
    .order("published_at", { ascending: false })
    .limit(opts.limit ?? 20);

  if (opts.courseId) query = query.eq("course_id", opts.courseId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as AnnouncementRow[] | null) ?? [];
}

export interface CreateAnnouncementInput {
  tenantId: string;
  /** コース単位のお知らせにする場合の対象コース (省略 / null でテナント全体)。 */
  courseId?: string | null;
  title: string;
  body: string;
}

/**
 * お知らせを作成する。 author_id / author_name は DB トリガーが確定するため
 * クライアントからは渡さない。 作成後、 DB トリガーが対象受講者へ通知を fan-out する。
 */
export async function createAnnouncement(
  input: CreateAnnouncementInput,
): Promise<AnnouncementRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("announcements")
    .insert({
      tenant_id: input.tenantId,
      course_id: input.courseId ?? null,
      title: input.title,
      body: input.body,
    })
    .select(ANNOUNCEMENT_COLS)
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("お知らせの作成結果が空でした");
  return data as AnnouncementRow;
}

export interface ListNotificationsOpts {
  /** 対象テナント。 RLS は本人の行に絞るが、 多テナント混入を防ぐため明示的に絞り込む。 */
  tenantId: string;
  /** 未読のみに絞る。 */
  unreadOnly?: boolean;
  /** 取得件数の上限 (既定 30)。 */
  limit?: number;
}

/** 自分宛の通知を新着順で取得する (RLS により本人の行のみ)。 */
export async function listNotifications(
  opts: ListNotificationsOpts,
): Promise<NotificationRow[]> {
  const supabase = getSupabase();
  let query = supabase
    .from("notifications")
    .select(NOTIFICATION_COLS)
    .eq("tenant_id", opts.tenantId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 30);

  if (opts.unreadOnly) query = query.eq("read", false);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as NotificationRow[] | null) ?? [];
}

/**
 * 通知を既読にする。
 *
 * Postgres は対象行が無い / RLS で除外された更新を 0 件成功として返すため、
 * `.select().maybeSingle()` で実更新行を確認し、 0 件なら明示的に失敗させる。
 */
export async function markNotificationRead(id: string): Promise<void> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error("対象の通知が見つからないか、 更新権限がありません");
  }
}

/** 自分宛の未読通知をすべて既読にする (当該テナント内)。 */
export async function markAllNotificationsRead(tenantId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("tenant_id", tenantId)
    .eq("read", false);
  if (error) throw new Error(error.message);
}
