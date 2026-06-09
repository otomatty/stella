/**
 * 通知センター (Issue #25)。
 *
 * Topbar のベルアイコンに紐づくドロップダウン。 自分宛の通知を一覧し、 未読バッジを出し、
 * クリックで既読化する。 講師/管理者にはお知らせ作成フォームを併設する。
 *
 * 通知データ・既読化は useNotifications から渡される (App でロールに応じて有効化)。
 * Supabase 未設定時は通知が空のため、 ベルはバッジ無しで描画される。
 */

import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  CheckCheck,
  Megaphone,
  Check,
  MessageCircle,
  Loader2,
  X,
  Send,
} from '@/lib/icons';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createAnnouncement } from '@/lib/notifications-api';
import { cn } from '@/lib/utils';
import type { NotificationRow, NotificationType } from '@falcon/shared/cms/types';
import type { Course, Role, Tenant } from '@/data/types';

interface NotificationCenterProps {
  role: Role;
  tenantId: Tenant['id'];
  notifications: NotificationRow[];
  unreadCount: number;
  loading: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  /** お知らせ作成後に呼ぶ (通知一覧を再取得して fan-out を反映する)。 */
  onAfterCreateAnnouncement: () => void;
  /** お知らせのコース指定に使う (任意。 空ならテナント全体)。 */
  courses: Course[];
}

const TYPE_META: Record<
  NotificationType,
  { icon: typeof Bell; tone: string; label: string }
> = {
  announcement: { icon: Megaphone, tone: 'text-brand', label: 'お知らせ' },
  review_completed: { icon: Check, tone: 'text-success', label: '添削完了' },
  qa_answered: { icon: MessageCircle, tone: 'text-info', label: 'Q&A 回答' },
  assignment_due: { icon: Bell, tone: 'text-warning', label: '課題期限' },
};

/** 相対時刻 (例: 3分前 / 2時間前 / 4日前)。 1週間以上は日付表記。 */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'たった今';
  if (min < 60) return `${min}分前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}時間前`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}日前`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export const NotificationCenter = ({
  role,
  tenantId,
  notifications,
  unreadCount,
  loading,
  onMarkRead,
  onMarkAllRead,
  onAfterCreateAnnouncement,
  courses,
}: NotificationCenterProps) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isStaff = role === 'instructor' || role === 'admin';

  // 外側クリック / Escape で閉じる。
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        className="w-8 h-8 rounded-sm grid place-items-center text-ink-2 hover:bg-sunken border border-transparent hover:border-border relative"
        title="通知"
        type="button"
        aria-label={`通知${unreadCount > 0 ? ` (未読 ${unreadCount} 件)` : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={16} />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 grid place-items-center rounded-full bg-brand text-white text-[9px] font-semibold leading-none border-[1.5px] border-card">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[70vh] flex flex-col bg-card border border-border rounded-md shadow-lg z-50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
            <div className="text-[13px] font-semibold">通知</div>
            {unreadCount > 0 ? (
              <span className="text-[11px] text-brand font-medium">
                未読 {unreadCount}
              </span>
            ) : null}
            <div className="flex-1" />
            {unreadCount > 0 ? (
              <button
                type="button"
                className="flex items-center gap-1 text-[11.5px] text-ink-3 hover:text-foreground"
                onClick={() => onMarkAllRead()}
              >
                <CheckCheck size={13} />
                すべて既読
              </button>
            ) : null}
            <button
              type="button"
              className="text-ink-3 hover:text-foreground"
              aria-label="閉じる"
              onClick={() => setOpen(false)}
            >
              <X size={15} />
            </button>
          </div>

          {isStaff ? (
            <AnnouncementComposer
              tenantId={tenantId}
              courses={courses}
              onCreated={onAfterCreateAnnouncement}
            />
          ) : null}

          <div className="overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-[12.5px] text-ink-3">
                <Loader2 size={15} className="animate-spin" /> 読み込み中…
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1.5 py-10 text-center">
                <Bell size={22} className="text-ink-4" />
                <div className="text-[12.5px] text-ink-3">通知はありません</div>
              </div>
            ) : (
              notifications.map((n) => {
                const meta = TYPE_META[n.type] ?? TYPE_META.announcement;
                const Icon = meta.icon;
                return (
                  <button
                    type="button"
                    key={n.id}
                    onClick={() => {
                      if (!n.read) onMarkRead(n.id);
                    }}
                    className={cn(
                      'w-full text-left flex gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-sunken transition-colors',
                      !n.read && 'bg-brand-soft/40',
                    )}
                  >
                    <div className={cn('shrink-0 mt-0.5', meta.tone)}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-[12.5px] leading-snug truncate">
                          {n.title}
                        </div>
                        {!n.read ? (
                          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-brand" />
                        ) : null}
                      </div>
                      {n.body ? (
                        <div className="text-[11.5px] text-ink-3 mt-0.5 line-clamp-2">
                          {n.body}
                        </div>
                      ) : null}
                      <div className="text-[10.5px] text-ink-4 mt-1 flex items-center gap-1.5">
                        <span>{meta.label}</span>
                        <span>·</span>
                        <span>{relativeTime(n.created_at)}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

interface AnnouncementComposerProps {
  tenantId: Tenant['id'];
  courses: Course[];
  onCreated: () => void;
}

/** 講師/管理者向けのお知らせ作成フォーム (通知センター内蔵)。 */
const AnnouncementComposer = ({
  tenantId,
  courses,
  onCreated,
}: AnnouncementComposerProps) => {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [courseId, setCourseId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTitle('');
    setBody('');
    setCourseId('');
  };

  const handleSubmit = async () => {
    const t = title.trim();
    const b = body.trim();
    if (!t) {
      toast.error('タイトルを入力してください');
      return;
    }
    setSubmitting(true);
    try {
      await createAnnouncement({
        tenantId,
        courseId: courseId || null,
        title: t,
        body: b,
      });
      reset();
      setExpanded(false);
      toast.success('お知らせを公開しました');
      onCreated();
    } catch (err) {
      console.error('[AnnouncementComposer] createAnnouncement failed', err);
      toast.error(err instanceof Error ? err.message : 'お知らせの公開に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (!expanded) {
    return (
      <div className="px-4 py-2.5 border-b border-border bg-sunken/40">
        <button
          type="button"
          className="flex items-center gap-1.5 text-[12px] text-ink-2 hover:text-foreground font-medium"
          onClick={() => setExpanded(true)}
        >
          <Megaphone size={14} />
          お知らせを作成
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-b border-border bg-sunken/40 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Megaphone size={14} className="text-brand" />
        <span className="text-[12px] font-semibold">新しいお知らせ</span>
        <div className="flex-1" />
        <button
          type="button"
          className="text-ink-3 hover:text-foreground"
          aria-label="キャンセル"
          onClick={() => {
            setExpanded(false);
            reset();
          }}
        >
          <X size={14} />
        </button>
      </div>
      <input
        aria-label="お知らせのタイトル"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="タイトル"
        className="h-8 rounded-sm border border-input bg-card px-2.5 text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <textarea
        aria-label="お知らせの本文"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="本文 (任意)"
        rows={3}
        className="rounded-sm border border-input bg-card px-2.5 py-1.5 text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
      />
      <select
        aria-label="お知らせの対象"
        value={courseId}
        onChange={(e) => setCourseId(e.target.value)}
        className="h-8 rounded-sm border border-input bg-card px-2 text-[12.5px]"
      >
        <option value="">テナント全体</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>
      <div className="flex justify-end">
        <Button
          variant="accent"
          size="sm"
          onClick={() => void handleSubmit()}
          disabled={submitting || !title.trim()}
        >
          {submitting ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Send size={13} />
          )}
          公開する
        </Button>
      </div>
    </div>
  );
};
