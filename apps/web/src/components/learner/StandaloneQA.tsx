/**
 * スタンドアロン Q&A (Issue #24)。
 *
 * 受講者の「あなたのスレッド」 を実データで表示する。 自分が投稿した質問を一覧し、
 * コースを選んで新しい質問 (コース単位 / lesson 無し) を投稿できる。 各スレッドには
 * 追記の返信もできる。
 */

import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Loader2 } from '@/lib/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { QAThread } from '@/components/common/QAThread';
import { QuestionComposer } from '@/components/common/QuestionComposer';
import { useMyQuestions } from '@/hooks/useQuestions';
import { createQuestion, createReply } from '@/lib/qa-api';
import { isBackendConfigured } from "@/lib/backend";
import { toast } from 'sonner';
import type { Course, Tenant } from '@/data/types';

interface StandaloneQAProps {
  tenantId: Tenant['id'];
  currentUserId: string | null;
  courses: Course[];
}

/** 受講者の「あなたのスレッド」: 自分の質問一覧 + コース単位の新規投稿。 */
export const StandaloneQA = ({
  tenantId,
  currentUserId,
  courses,
}: StandaloneQAProps) => {
  const enabled = isBackendConfigured() && Boolean(currentUserId);
  const { threads, loading, refetch } = useMyQuestions(currentUserId, enabled);

  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  // courses は非同期で後から届くため、 選択中 ID が一覧に無ければ先頭へ追従させる
  // (初期化時の空 courses で選択が陳腐化し、 存在しない courseId を送るのを防ぐ)。
  useEffect(() => {
    if (courses.length === 0) {
      if (selectedCourseId !== '') setSelectedCourseId('');
      return;
    }
    if (!courses.some((c) => c.id === selectedCourseId)) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  const courseTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of courses) map.set(c.id, c.title);
    return map;
  }, [courses]);

  const canCompose = enabled && courses.length > 0;

  const handleCreate = async ({
    title,
    body,
  }: {
    title: string;
    body: string;
  }) => {
    // 選択 ID が一覧に残っていれば採用、 さもなくば先頭にフォールバック。
    const courseId = courses.some((c) => c.id === selectedCourseId)
      ? selectedCourseId
      : courses[0]?.id;
    if (!courseId) {
      toast.error('質問するコースを選択してください');
      return;
    }
    try {
      await createQuestion({ tenantId, courseId, lessonId: null, title, body });
      await refetch();
      toast.success('質問を投稿しました');
    } catch (err) {
      console.error('[StandaloneQA] createQuestion failed', err);
      toast.error(err instanceof Error ? err.message : '質問の投稿に失敗しました');
      // 失敗を QuestionComposer へ伝播し、 入力フォームのクリアを防ぐ。
      throw err;
    }
  };

  const handleReply = async (questionId: string, body: string) => {
    try {
      await createReply(questionId, body);
      await refetch();
    } catch (err) {
      console.error('[StandaloneQA] createReply failed', err);
      toast.error(err instanceof Error ? err.message : '返信の送信に失敗しました');
      throw err;
    }
  };

  return (
    <>
      <PageHeader title="Q&A" sub="あなたのスレッド · 講師に質問する" />

      {!enabled ? (
        <Card className="px-5 py-10 text-center text-sm text-ink-3">
          Q&amp;A を利用するにはログインが必要です。
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <QuestionComposer
            onSubmit={handleCreate}
            disabled={!canCompose}
            bodyPlaceholder="コースについて講師に質問する…"
            submitLabel="質問を投稿"
          >
            <select
              aria-label="質問するコース"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              disabled={courses.length === 0}
              className="h-9 rounded-sm border border-input bg-card px-3 text-sm"
            >
              {courses.length === 0 ? (
                <option value="">受講中のコースがありません</option>
              ) : (
                courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))
              )}
            </select>
          </QuestionComposer>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-ink-3">
              <Loader2 size={16} className="animate-spin" /> 読み込み中…
            </div>
          ) : threads.length === 0 ? (
            <Card className="flex flex-col items-center justify-center gap-2 py-14 text-center text-sm text-ink-3">
              <MessageCircle size={28} className="text-ink-4" />
              <div className="font-medium text-ink-2">まだ質問はありません</div>
              <div className="text-[12.5px]">
                上のフォームから最初の質問を投稿してみましょう。
              </div>
            </Card>
          ) : (
            threads.map((t) => (
              <QAThread
                key={t.id}
                thread={t}
                currentUserId={currentUserId}
                canReply
                contextLabel={
                  courseTitleById.get(t.course_id) ?? undefined
                }
                onReply={(body) => handleReply(t.id, body)}
              />
            ))
          )}
        </div>
      )}
    </>
  );
};
