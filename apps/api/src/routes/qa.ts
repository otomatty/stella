/**
 * Q&A API (旧 questions / question_replies 直アクセス + RLS + トリガーの置き換え / Issue #24)。
 *
 * 旧トリガーのアプリ層での再現:
 *   - 投稿時、 author_id / author_name / author_initials は caller の profile から確定する
 *     (クライアント値は信用しない)。
 *   - 返信が講師/管理者によるものなら is_instructor=true、 親 question を 'answered' に更新。
 *
 * 認可 (旧 RLS): 同テナントの認証済みユーザが read。 status 変更は投稿者本人 or staff。
 */

import { Hono } from "hono";
import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { notifications, questions, questionReplies } from "../db/schema.js";
import { errorResponse, getCaller, ApiError } from "../lib/authz.js";
import type { Env } from "../env.js";

export const qaRoute = new Hono<{ Bindings: Env }>();

const Q_COLS = {
  id: questions.id,
  tenant_id: questions.tenantId,
  course_id: questions.courseId,
  lesson_id: questions.lessonId,
  author_id: questions.authorId,
  author_name: questions.authorName,
  author_initials: questions.authorInitials,
  title: questions.title,
  body: questions.body,
  status: questions.status,
  created_at: questions.createdAt,
  updated_at: questions.updatedAt,
} as const;

const R_COLS = {
  id: questionReplies.id,
  question_id: questionReplies.questionId,
  author_id: questionReplies.authorId,
  author_name: questionReplies.authorName,
  author_initials: questionReplies.authorInitials,
  body: questionReplies.body,
  is_instructor: questionReplies.isInstructor,
  created_at: questionReplies.createdAt,
} as const;

/** 条件に合うスレッドを返信ネスト付きで取得する (新着順)。 */
qaRoute.get("/api/questions", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const q = c.req.query();
    const conds = [eq(questions.tenantId, caller.tenantId)];
    if (q.lessonId) conds.push(eq(questions.lessonId, q.lessonId));
    if (q.courseId) conds.push(eq(questions.courseId, q.courseId));
    if (q.authorId) conds.push(eq(questions.authorId, q.authorId));
    if (q.status === "open" || q.status === "answered" || q.status === "closed") {
      conds.push(eq(questions.status, q.status));
    }

    const threads = await db
      .select(Q_COLS)
      .from(questions)
      .where(and(...conds))
      .orderBy(desc(questions.updatedAt));

    // 返信をスレッドごとにまとめる (created_at 昇順)。
    const ids = threads.map((t) => t.id);
    const replies =
      ids.length > 0
        ? await db
            .select(R_COLS)
            .from(questionReplies)
            .where(inArray(questionReplies.questionId, ids))
            .orderBy(asc(questionReplies.createdAt))
        : [];
    const byQuestion = new Map<string, (typeof replies)[number][]>();
    for (const r of replies) {
      const list = byQuestion.get(r.question_id) ?? [];
      list.push(r);
      byQuestion.set(r.question_id, list);
    }
    const rows = threads.map((t) => ({ ...t, replies: byQuestion.get(t.id) ?? [] }));
    return c.json({ rows });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 質問スレッドを作成する。 author は caller から確定する。 */
qaRoute.post("/api/questions", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const body = (await c.req.json()) as {
      courseId: string;
      lessonId?: string | null;
      title?: string;
      body: string;
    };
    if (!body.courseId || !body.body) {
      throw new ApiError("courseId / body が必要です", 400);
    }
    const initials = caller.name.slice(0, 2).toUpperCase();
    const rows = await db
      .insert(questions)
      .values({
        tenantId: caller.tenantId,
        courseId: body.courseId,
        lessonId: body.lessonId ?? null,
        authorId: caller.id,
        authorName: caller.name,
        authorInitials: initials,
        title: body.title ?? "",
        body: body.body,
      })
      .returning(Q_COLS);
    return c.json({ row: rows[0] });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** スレッドへ返信する。 講師/管理者の返信は親を 'answered' に更新する。 */
qaRoute.post("/api/questions/:id/replies", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const questionId = c.req.param("id");
    const body = (await c.req.json()) as { body: string };
    if (!body.body) throw new ApiError("body が必要です", 400);

    // 同テナントのスレッドであることを確認する。
    const parent = await db
      .select({
        id: questions.id,
        tenant_id: questions.tenantId,
        author_id: questions.authorId,
        course_id: questions.courseId,
        lesson_id: questions.lessonId,
      })
      .from(questions)
      .where(eq(questions.id, questionId))
      .limit(1);
    if (!parent[0]) throw new ApiError("対象スレッドが見つかりません", 404);
    if (parent[0].tenant_id !== caller.tenantId) {
      throw new ApiError("他テナントのスレッドには返信できません", 403);
    }

    const isInstructor = caller.role === "instructor" || caller.role === "admin";
    const initials = caller.name.slice(0, 2).toUpperCase();
    const rows = await db
      .insert(questionReplies)
      .values({
        questionId,
        authorId: caller.id,
        authorName: caller.name,
        authorInitials: initials,
        body: body.body,
        isInstructor,
      })
      .returning(R_COLS);

    // 講師/管理者の返信でスレッドを回答済みにし、 updated_at を更新する。
    await db
      .update(questions)
      .set({
        updatedAt: new Date(),
        ...(isInstructor ? { status: "answered" as const } : {}),
      })
      .where(eq(questions.id, questionId));

    // 講師/管理者の返信なら質問者本人へ通知する (旧 notify_qa_answered トリガー)。
    if (isInstructor && parent[0].author_id !== caller.id) {
      await db.insert(notifications).values({
        userId: parent[0].author_id,
        tenantId: caller.tenantId,
        type: "qa_answered",
        title: "質問に回答がつきました",
        body: body.body.slice(0, 140),
        payload: {
          question_id: questionId,
          course_id: parent[0].course_id,
          lesson_id: parent[0].lesson_id,
          reply_id: rows[0]!.id,
        },
      });
    }

    return c.json({ row: rows[0] });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** スレッドのステータスを更新する (投稿者本人 or staff)。 */
qaRoute.patch("/api/questions/:id/status", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const questionId = c.req.param("id");
    const body = (await c.req.json()) as { status: "open" | "answered" | "closed" };

    const parent = await db
      .select({ tenant_id: questions.tenantId, author_id: questions.authorId })
      .from(questions)
      .where(eq(questions.id, questionId))
      .limit(1);
    if (!parent[0] || parent[0].tenant_id !== caller.tenantId) {
      throw new ApiError("対象スレッドが見つからないか、 更新権限がありません", 404);
    }
    const isStaff = caller.role === "instructor" || caller.role === "admin";
    if (!isStaff && parent[0].author_id !== caller.id) {
      throw new ApiError("更新権限がありません", 403);
    }

    await db
      .update(questions)
      .set({ status: body.status, updatedAt: new Date() })
      .where(eq(questions.id, questionId));
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});
