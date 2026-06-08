/**
 * Q&A・ディスカッションのデータアクセス層 (Issue #24)。
 *
 * RLS:
 *   - 同テナントの認証済みユーザは質問・返信を read。
 *   - 投稿は本人のみ (author_id / 表示名 / is_instructor は DB トリガーが確定)。
 *   - 講師/管理者は status 変更可。 講師が返信すると親 question は自動で 'answered' に。
 *
 * いずれも RLS 配下の Supabase クライアントから直接 read/write する。
 */

import type {
  QuestionRow,
  QuestionReplyRow,
  QuestionStatus,
  QuestionWithReplies,
} from "@falcon/shared/cms/types";
import { getSupabase } from "./supabase";

const QUESTION_COLS =
  "id, tenant_id, course_id, lesson_id, author_id, author_name, author_initials, title, body, status, created_at, updated_at";
const REPLY_COLS =
  "id, question_id, author_id, author_name, author_initials, body, is_instructor, created_at";

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

/** ネストされた返信を created_at 昇順に整え、 配列を保証する。 */
function normalizeThread(row: QuestionWithReplies): QuestionWithReplies {
  const replies = (row.replies ?? [])
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  return { ...row, replies };
}

/**
 * 条件に合うスレッドを返信ネスト付きで取得する (新着順)。
 * 返信は PostgREST の埋め込み (`question_replies`) で 1 クエリにまとめて取る。
 */
export async function listQuestions(
  opts: ListQuestionsOpts,
): Promise<QuestionWithReplies[]> {
  const supabase = getSupabase();
  let query = supabase
    .from("questions")
    .select(`${QUESTION_COLS}, replies:question_replies(${REPLY_COLS})`)
    .order("updated_at", { ascending: false });

  if (opts.lessonId) query = query.eq("lesson_id", opts.lessonId);
  if (opts.courseId) query = query.eq("course_id", opts.courseId);
  if (opts.authorId) query = query.eq("author_id", opts.authorId);
  if (opts.status) query = query.eq("status", opts.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data as QuestionWithReplies[] | null) ?? []).map(normalizeThread);
}

export interface CreateQuestionInput {
  tenantId: string;
  courseId: string;
  lessonId?: string | null;
  title?: string;
  body: string;
}

/**
 * 質問スレッドを作成する。 author_id / 表示名は DB トリガーが auth.uid() の
 * profile から確定するため、 クライアントからは渡さない。
 */
export async function createQuestion(
  input: CreateQuestionInput,
): Promise<QuestionRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("questions")
    .insert({
      tenant_id: input.tenantId,
      course_id: input.courseId,
      lesson_id: input.lessonId ?? null,
      title: input.title ?? "",
      body: input.body,
    })
    .select(QUESTION_COLS)
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("質問の作成結果が空でした");
  return data as QuestionRow;
}

/** スレッドへ返信する。 is_instructor / 表示名は DB トリガーが確定する。 */
export async function createReply(
  questionId: string,
  body: string,
): Promise<QuestionReplyRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("question_replies")
    .insert({ question_id: questionId, body })
    .select(REPLY_COLS)
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("返信の作成結果が空でした");
  return data as QuestionReplyRow;
}

/**
 * スレッドのステータスを更新する (講師の回答完了 / 受講者の自己解決クローズ等)。
 *
 * Postgres は対象行が無い / RLS で除外された更新を 0 件成功として返すため、
 * `.select().maybeSingle()` で実更新行を確認し、 0 件なら明示的に失敗させる。
 */
export async function updateQuestionStatus(
  questionId: string,
  status: QuestionStatus,
): Promise<void> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("questions")
    .update({ status })
    .eq("id", questionId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error("対象スレッドが見つからないか、 更新権限がありません");
  }
}
