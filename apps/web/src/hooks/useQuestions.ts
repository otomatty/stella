/**
 * Q&A スレッド一覧を取得する Hook (Issue #24)。
 *
 * - `useLessonQuestions`: レッスン単位のスレッド (受講者のレッスン内 Q&A)。
 * - `useMyQuestions`: 投稿者本人のスレッド (受講者の「あなたのスレッド」)。
 * - `useOpenQuestions`: 未返信キュー (status='open') — 講師の未返信一覧。
 *
 * いずれも Supabase 未設定時は no-op (空配列) で、 fixtures に依存しない。
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { QuestionWithReplies } from "@falcon/shared/cms/types";
import { listQuestions, type ListQuestionsOpts } from "@/lib/qa-api";
import { isSupabaseConfigured } from "@/lib/supabase";

export interface UseQuestionsResult {
  threads: QuestionWithReplies[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * 汎用ローダー。 `enabled` が false の間は何もしない (空配列)。
 * 連続フェッチの取り違えを requestId で防ぐ (useEnrollments と同方針)。
 */
function useQuestionList(
  opts: ListQuestionsOpts,
  enabled: boolean,
): UseQuestionsResult {
  const [threads, setThreads] = useState<QuestionWithReplies[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  // opts はオブジェクトで毎回新しい参照になるため、 プリミティブに展開して依存させる。
  const { lessonId, courseId, authorId, status } = opts;

  const refetch = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    if (!enabled || !isSupabaseConfigured()) {
      setThreads([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listQuestions({ lessonId, courseId, authorId, status });
      if (reqId !== requestIdRef.current) return;
      setThreads(rows);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  }, [enabled, lessonId, courseId, authorId, status]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { threads, loading, error, refetch };
}

/** レッスン単位のスレッド。 lessonId が無い (非 uuid 等) ときは無効化。 */
export function useLessonQuestions(
  lessonId: string | null,
  enabled = true,
): UseQuestionsResult {
  return useQuestionList(
    { lessonId: lessonId ?? undefined },
    enabled && Boolean(lessonId),
  );
}

/** 投稿者本人のスレッド (あなたのスレッド)。 */
export function useMyQuestions(
  authorId: string | null,
  enabled = true,
): UseQuestionsResult {
  return useQuestionList(
    { authorId: authorId ?? undefined },
    enabled && Boolean(authorId),
  );
}

/** 未返信キュー (テナント横断の status='open')。 講師の未返信一覧。 */
export function useOpenQuestions(enabled = true): UseQuestionsResult {
  return useQuestionList({ status: "open" }, enabled);
}
