/**
 * Q&A スレッド表示 + 返信コンポーザ (Issue #24)。
 *
 * 受講者のレッスン内 Q&A・スタンドアロン Q&A・講師の未返信キューで共有する
 * プレゼンテーション部品。 データ取得・更新は呼び出し側 (hook + qa-api) が担い、
 * ここは描画と入力に専念する。
 */

import { useState } from 'react';
import { Send, Loader2 } from '@/lib/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type {
  QuestionStatus,
  QuestionWithReplies,
} from '@falcon/shared/cms/types';

/** ISO 文字列を「たった今 / N分前 / N時間前 / 昨日 / N日前」 に整形する。 */
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return '';
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'たった今';
  if (min < 60) return `${min}分前`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '昨日';
  return `${days}日前`;
}

interface StatusMeta {
  label: string;
  variant: 'default' | 'success' | 'warning' | 'accent';
}

/** ステータス → 表示ラベル / バッジ配色。 */
export const STATUS_META: Record<QuestionStatus, StatusMeta> = {
  open: { label: '未返信', variant: 'warning' },
  answered: { label: '回答済み', variant: 'success' },
  closed: { label: 'クローズ', variant: 'default' },
};

/** 表示用のイニシャルを決める (明示値が無ければ氏名先頭2文字、 それも無ければ '?')。 */
function initialsFor(name: string, initials: string | null): string {
  const v = (initials ?? '').trim();
  if (v) return v.slice(0, 2);
  return name.trim().slice(0, 2) || '?';
}

interface QAThreadProps {
  thread: QuestionWithReplies;
  currentUserId: string | null;
  /** 返信コンポーザを表示する。 */
  canReply?: boolean;
  /** 講師向け: ステータス変更ボタンを表示する。 */
  showStatusControls?: boolean;
  /** ヘッダ右に出す補足ラベル (コース名など)。 */
  contextLabel?: string;
  onReply?: (body: string) => Promise<void>;
  onSetStatus?: (status: QuestionStatus) => Promise<void>;
}

interface Bubble {
  id: string;
  authorId: string;
  name: string;
  initials: string | null;
  body: string;
  createdAt: string;
  isInstructor: boolean;
}

/** 1 件のスレッド (質問 + 返信) を描画し、 任意で返信 / ステータス操作を提供する。 */
export function QAThread({
  thread,
  currentUserId,
  canReply = false,
  showStatusControls = false,
  contextLabel,
  onReply,
  onSetStatus,
}: QAThreadProps) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  const status = STATUS_META[thread.status];

  // 質問本文を先頭メッセージとして扱い、 返信を時系列で続ける。
  const bubbles: Bubble[] = [
    {
      id: thread.id,
      authorId: thread.author_id,
      name: thread.author_name,
      initials: thread.author_initials,
      body: thread.body,
      createdAt: thread.created_at,
      isInstructor: false,
    },
    ...thread.replies.map((r) => ({
      id: r.id,
      authorId: r.author_id,
      name: r.author_name,
      initials: r.author_initials,
      body: r.body,
      createdAt: r.created_at,
      isInstructor: r.is_instructor,
    })),
  ];

  const send = async () => {
    const body = draft.trim();
    if (!body || !onReply || sending) return;
    setSending(true);
    try {
      await onReply(body);
      // 成功時のみ入力をクリアする (失敗時は再入力を避けるため保持)。
      setDraft('');
    } catch {
      // onReply 側で通知済み。 未処理の Promise 拒否を防ぎつつ draft を保持する。
    } finally {
      setSending(false);
    }
  };

  const setStatus = async (next: QuestionStatus) => {
    if (!onSetStatus || statusBusy) return;
    setStatusBusy(true);
    try {
      await onSetStatus(next);
    } finally {
      setStatusBusy(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="px-[18px] py-3.5 border-b border-border flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={status.variant}>{status.label}</Badge>
            {thread.title ? (
              <span className="text-[13.5px] font-semibold">{thread.title}</span>
            ) : null}
          </div>
          <div className="text-[11.5px] text-ink-3 mt-1">
            {contextLabel ? `${contextLabel} · ` : ''}
            {thread.author_name} · {relativeTime(thread.created_at)} · 返信{' '}
            {thread.replies.length}
          </div>
        </div>
        {showStatusControls ? (
          <div className="flex items-center gap-1.5 shrink-0">
            {thread.status !== 'answered' ? (
              <Button
                size="sm"
                variant="accent"
                disabled={statusBusy}
                onClick={() => setStatus('answered')}
              >
                回答済みにする
              </Button>
            ) : null}
            {thread.status !== 'closed' ? (
              <Button
                size="sm"
                disabled={statusBusy}
                onClick={() => setStatus('closed')}
              >
                クローズ
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="p-[18px] flex flex-col gap-3.5 max-h-[420px] overflow-y-auto">
        {bubbles.map((b) => {
          const me = currentUserId != null && b.authorId === currentUserId;
          return (
            <div
              key={b.id}
              className={cn(
                'flex gap-2.5 max-w-[88%]',
                me && 'self-end flex-row-reverse',
              )}
            >
              <Avatar size="sm">
                <AvatarFallback tone={b.isInstructor ? 'brand' : 'c2'}>
                  {initialsFor(b.name, b.initials)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div
                  className={cn(
                    'rounded-xl px-3 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words',
                    me
                      ? 'bg-brand text-white'
                      : b.isInstructor
                        ? 'bg-brand-soft text-foreground border border-brand/30'
                        : 'bg-sunken text-foreground',
                  )}
                >
                  {b.body}
                </div>
                <div
                  className={cn(
                    'text-[11px] text-ink-3 mt-1 flex items-center gap-1.5',
                    me ? 'justify-end' : '',
                  )}
                >
                  <span>
                    {b.name} · {relativeTime(b.createdAt)}
                  </span>
                  {b.isInstructor ? (
                    <Badge variant="accent">講師</Badge>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {canReply ? (
        <div className="px-3.5 py-3 border-t border-border flex gap-2 items-end bg-card">
          <Textarea
            placeholder="返信を入力…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // IME 変換確定の Enter で誤送信しないよう composition 中はスキップ。
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            className="min-h-[38px] max-h-[120px] text-[13px] py-2 px-2.5"
          />
          <Button
            variant="accent"
            size="icon"
            disabled={sending || !draft.trim()}
            onClick={() => void send()}
          >
            {sending ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Send size={13} />
            )}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
