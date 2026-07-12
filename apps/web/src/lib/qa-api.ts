/**
 * Q&A・ディスカッションのデータアクセス層 (Issue #24 — Neon / Hono API)。
 *
 * 旧 BaaS 直アクセス (RLS + DB トリガー) を Hono API 経由に置き換えた。
 * author_id / 表示名 / is_instructor の確定と、 講師返信時の 'answered' 自動更新は
 * サーバ側 (アプリ層) で行う。
 */

import type {
  QuestionRow,
  QuestionReplyRow,
  QuestionStatus,
  QuestionWithReplies,
} from "@falcon/shared/cms/types";
import { apiFetch } from "./api-client";

export interface ListQuestionsOpts {
  /** レッスン単位のスレッドに絞る。 */
  lessonId?: string;
  /** コース単位のスレッドに絞る。 */
  courseId?: string;
  /** 投稿者本人のスレッドに絞る (受講者の「あなたのスレッド」)。 */
  authorId?: string;
  /** ステータスで絞る (未返信キューは 'open')。 */
  status?: QuestionStatus;
}

/** 条件に合うスレッドを返信ネスト付きで取得する (新着順)。 */
export async function listQuestions(
  opts: ListQuestionsOpts,
): Promise<QuestionWithReplies[]> {
  const p = new URLSearchParams();
  if (opts.lessonId) p.set("lessonId", opts.lessonId);
  if (opts.courseId) p.set("courseId", opts.courseId);
  if (opts.authorId) p.set("authorId", opts.authorId);
  if (opts.status) p.set("status", opts.status);
  const qs = p.toString();
  const { rows } = await apiFetch<{ rows: QuestionWithReplies[] }>(
    `/api/questions${qs ? `?${qs}` : ""}`,
  );
  return rows ?? [];
}

export interface CreateQuestionInput {
  tenantId: string;
  courseId: string;
  lessonId?: string | null;
  title?: string;
  body: string;
}

/** 質問スレッドを作成する。 author / tenant はサーバが caller から確定する。 */
export async function createQuestion(
  input: CreateQuestionInput,
): Promise<QuestionRow> {
  const { row } = await apiFetch<{ row: QuestionRow }>("/api/questions", {
    method: "POST",
    body: {
      courseId: input.courseId,
      lessonId: input.lessonId ?? null,
      title: input.title ?? "",
      body: input.body,
    },
  });
  if (!row) throw new Error("質問の作成結果が空でした");
  return row;
}

/** スレッドへ返信する。 is_instructor / 表示名はサーバが確定する。 */
export async function createReply(
  questionId: string,
  body: string,
): Promise<QuestionReplyRow> {
  const { row } = await apiFetch<{ row: QuestionReplyRow }>(
    `/api/questions/${encodeURIComponent(questionId)}/replies`,
    { method: "POST", body: { body } },
  );
  if (!row) throw new Error("返信の作成結果が空でした");
  return row;
}

/** スレッドのステータスを更新する (投稿者本人 or staff)。 */
export async function updateQuestionStatus(
  questionId: string,
  status: QuestionStatus,
): Promise<void> {
  await apiFetch(`/api/questions/${encodeURIComponent(questionId)}/status`, {
    method: "PATCH",
    body: { status },
  });
}
