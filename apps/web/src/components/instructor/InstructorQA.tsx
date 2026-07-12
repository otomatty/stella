/**
 * 講師向け Q&A 未返信キュー (Issue #24)。
 *
 * テナント横断で status='open' の質問を新着順に一覧し、 講師がその場で回答できる。
 * 講師が返信すると DB トリガーで status が 'answered' に遷移し、 キューから外れる。
 * 「クローズ」 で回答不要のスレッドを閉じることもできる。
 */

import { Inbox, Loader2 } from '@/lib/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QAThread } from '@/components/common/QAThread';
import { useOpenQuestions } from '@/hooks/useQuestions';
import { createReply, updateQuestionStatus } from '@/lib/qa-api';
import { isBackendConfigured } from "@/lib/backend";
import { toast } from 'sonner';
import type { QuestionStatus } from '@falcon/shared/cms/types';
import type { Tenant } from '@/data/types';

interface InstructorQAProps {
  tenantId: Tenant['id'];
  currentUserId: string | null;
}

/** 講師の未返信キュー: open スレッドを一覧し、 その場で回答 / クローズする。 */
export const InstructorQA = ({ currentUserId }: InstructorQAProps) => {
  const enabled = isBackendConfigured() && Boolean(currentUserId);
  const { threads, loading, refetch } = useOpenQuestions(enabled);

  const handleReply = async (questionId: string, body: string) => {
    try {
      await createReply(questionId, body);
      toast.success('回答を送信しました');
      await refetch();
    } catch (err) {
      console.error('[InstructorQA] createReply failed', err);
      toast.error(err instanceof Error ? err.message : '回答の送信に失敗しました');
      throw err;
    }
  };

  const handleSetStatus = async (
    questionId: string,
    status: QuestionStatus,
  ) => {
    try {
      await updateQuestionStatus(questionId, status);
      await refetch();
    } catch (err) {
      console.error('[InstructorQA] updateStatus failed', err);
      toast.error(err instanceof Error ? err.message : 'ステータス更新に失敗しました');
    }
  };

  return (
    <>
      <PageHeader
        title="Q&A 未返信"
        sub="受講者からの未返信の質問キュー"
        actions={
          threads.length > 0 ? (
            <Badge variant="warning">{threads.length} 件 未返信</Badge>
          ) : undefined
        }
      />

      {!enabled ? (
        <Card className="px-5 py-10 text-center text-sm text-ink-3">
          Q&amp;A を利用するにはログインが必要です。
        </Card>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-3">
          <Loader2 size={16} className="animate-spin" /> 読み込み中…
        </div>
      ) : threads.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-ink-3">
          <Inbox size={28} className="text-ink-4" />
          <div className="font-medium text-ink-2">未返信の質問はありません</div>
          <div className="text-[12.5px]">
            新しい質問が届くとここに表示されます。
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {threads.map((t) => (
            <QAThread
              key={t.id}
              thread={t}
              currentUserId={currentUserId}
              canReply
              showStatusControls
              onReply={(body) => handleReply(t.id, body)}
              onSetStatus={(status) => handleSetStatus(t.id, status)}
            />
          ))}
        </div>
      )}
    </>
  );
};
