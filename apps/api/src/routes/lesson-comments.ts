import {
  COMMENT_BODY_MAX,
  COMMENT_MENTIONS_MAX,
  COMMENT_NOTIFICATION_TYPES,
  COMMENT_PAGE_SIZE,
  type CommentAuthor,
  type CommentMarker,
  type CommentMention,
  type CommentPosition,
  type CommentReply,
  type CommentResolveResponse,
  type CommentThread,
  type LessonCommentsResponse,
  type VideoScene,
  mentionCandidates,
  resolveCommentPosition,
  sceneAt,
} from "@stella/shared/lessons/comments";
import { and, asc, desc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { Hono } from "hono";

import type { Db } from "../db/client.js";
import {
  lessonCommentMentions,
  lessonCommentPosts,
  lessonComments,
  lessons,
  notifications,
  profiles,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { auditLogInsert, clientIp } from "../lib/audit.js";
import {
  ApiError,
  type Caller,
  errorResponse,
  getCaller,
  isStaffRole,
  loadActiveStaffIds,
} from "../lib/authz.js";
import {
  assertLessonReadable,
  lessonReadableByProfile,
  readableUserIds,
} from "../lib/lesson-access.js";

export const lessonCommentsRoute = new Hono<{ Bindings: Env }>();
const PATH = "/api/lesson-comments";
const ROOT_LIMIT = 1000;
const REPLY_LIMIT = 200;
const POST_WINDOW_MS = 10 * 60 * 1000;
const POST_LIMIT = 30;
const VIDEO_UPDATED = "動画が更新されました。画面を読み込み直してからコメントしてください";

const anchorColumns = {
  id: lessonComments.id,
  videoPath: lessonComments.videoPath,
  positionSec: lessonComments.positionSec,
  sceneId: lessonComments.sceneId,
  sceneOffsetSec: lessonComments.sceneOffsetSec,
  sceneHash: lessonComments.sceneHash,
  resolvedAt: lessonComments.resolvedAt,
  createdAt: lessonComments.createdAt,
};

const entryColumns = {
  id: lessonComments.id,
  userId: lessonComments.userId,
  name: profiles.displayName,
  avatarUrl: profiles.avatarUrl,
  role: profiles.role,
  body: lessonComments.body,
  createdAt: lessonComments.createdAt,
};

type Entry = {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: CommentAuthor["role"];
  body: string;
  createdAt: Date;
};

function canManage(caller: Caller, authorId: string) {
  return caller.id === authorId || isStaffRole(caller.role);
}

function commentEntry(row: Entry, caller: Caller) {
  return {
    id: row.id,
    author: {
      id: row.userId,
      name: row.name,
      avatar_url: row.avatarUrl,
      role: row.role,
      is_self: row.userId === caller.id,
    },
    body: row.body,
    created_at: row.createdAt.getTime(),
    can_delete: canManage(caller, row.userId),
  };
}

function threadResponse(
  row: Entry,
  caller: Caller,
  position: CommentPosition,
  resolved: boolean,
  replies: CommentReply[],
  candidates: CommentMention[],
  replyCount = replies.length,
): CommentThread {
  return {
    ...commentEntry(row, caller),
    position_sec: position.positionSec,
    state: position.state,
    scene_id: position.sceneId,
    resolved,
    can_resolve: canManage(caller, row.userId),
    reply_count: replyCount,
    replies,
    mention_candidates: candidates,
  };
}

async function readableVideo(db: Db, caller: Caller, lessonId: string) {
  const { stageId } = await assertLessonReadable(db, caller, lessonId);
  const [video] = await db
    .select({
      videoPath: lessons.videoPath,
      scenes: lessons.videoScenes,
      totalSec: lessons.totalSec,
    })
    .from(lessons)
    .where(eq(lessons.id, lessonId));
  if (!video) throw new ApiError("教材が見つかりません", 404);
  return { stageId, ...video };
}

async function pageEntries(db: Db, caller: Caller, threadIds: string[]) {
  // ページは include を含めて最大 51 件。返信・メンションもページの ID で絞り、個々の返信 ID はバインドしない。
  const rankedReplies = db
    .select({
      id: lessonComments.id,
      rank: sql<number>`row_number() over (
        partition by ${lessonComments.parentId}
        order by ${lessonComments.createdAt} desc, ${lessonComments.id} desc
      )`.as("rank"),
      replyCount: sql<number>`count(*) over (partition by ${lessonComments.parentId})`.as(
        "reply_count",
      ),
    })
    .from(lessonComments)
    .where(inArray(lessonComments.parentId, threadIds))
    .as("ranked_replies");

  const [roots, replies, mentions, participants] = await db.batch([
    db
      .select(entryColumns)
      .from(lessonComments)
      .innerJoin(profiles, eq(profiles.id, lessonComments.userId))
      .where(inArray(lessonComments.id, threadIds)),
    db
      .select({
        ...entryColumns,
        parentId: lessonComments.parentId,
        replyCount: rankedReplies.replyCount,
      })
      .from(rankedReplies)
      .innerJoin(lessonComments, eq(lessonComments.id, rankedReplies.id))
      .innerJoin(profiles, eq(profiles.id, lessonComments.userId))
      .where(sql`${rankedReplies.rank} <= ${REPLY_LIMIT}`)
      .orderBy(asc(lessonComments.createdAt), asc(lessonComments.id)),
    db
      .select({
        commentId: lessonCommentMentions.commentId,
        id: profiles.id,
        name: profiles.displayName,
      })
      .from(rankedReplies)
      .innerJoin(lessonCommentMentions, eq(lessonCommentMentions.commentId, rankedReplies.id))
      .innerJoin(profiles, eq(profiles.id, lessonCommentMentions.userId))
      .where(sql`${rankedReplies.rank} <= ${REPLY_LIMIT}`)
      .orderBy(asc(profiles.id)),
    // 候補には、表示されない古い返信にだけ参加している人も含める。
    db
      .select({
        parentId: lessonComments.parentId,
        id: profiles.id,
        name: profiles.displayName,
      })
      .from(lessonComments)
      .innerJoin(profiles, eq(profiles.id, lessonComments.userId))
      .where(inArray(lessonComments.parentId, threadIds))
      .groupBy(lessonComments.parentId, profiles.id, profiles.displayName)
      .orderBy(sql`min(${lessonComments.createdAt})`, asc(profiles.id)),
  ]);

  const mentionsByReply = new Map<string, CommentMention[]>();
  for (const { commentId, id, name } of mentions) {
    const list = mentionsByReply.get(commentId) ?? [];
    list.push({ id, name });
    mentionsByReply.set(commentId, list);
  }
  const repliesByThread = new Map<string, { replies: CommentReply[]; count: number }>();
  for (const row of replies) {
    if (!row.parentId) continue;
    const group = repliesByThread.get(row.parentId) ?? { replies: [], count: row.replyCount };
    group.replies.push({
      ...commentEntry(row, caller),
      mentions: mentionsByReply.get(row.id) ?? [],
    });
    repliesByThread.set(row.parentId, group);
  }
  const participantsByThread = new Map<string, Map<string, string>>();
  for (const root of roots) {
    participantsByThread.set(root.id, new Map([[root.userId, root.name]]));
  }
  for (const { parentId, id, name } of participants) {
    if (parentId) participantsByThread.get(parentId)?.set(id, name);
  }
  return {
    roots: new Map(roots.map((row) => [row.id, row])),
    repliesByThread,
    participantsByThread,
  };
}

function sceneResponse(scenes: VideoScene[] | null): LessonCommentsResponse["video"] {
  return {
    scenes: (scenes ?? []).map(({ id, startSec, durationSec }) => ({
      id,
      start_sec: startSec,
      duration_sec: durationSec,
    })),
  };
}

lessonCommentsRoute.get(PATH, async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const {
      lessonId,
      scope = "active",
      sort = "time",
      filter = "all",
      sceneId,
      include,
    } = c.req.query();
    const offset = Number(c.req.query("offset") ?? 0);
    const limit = Number(c.req.query("limit") ?? COMMENT_PAGE_SIZE);
    if (!lessonId) throw new ApiError("lessonId が必要です", 400);
    if (scope !== "active" && scope !== "orphaned")
      throw new ApiError("scope の指定が不正です", 400);
    if (sort !== "time" && sort !== "new") throw new ApiError("sort の指定が不正です", 400);
    if (filter !== "all" && filter !== "mine" && filter !== "scene") {
      throw new ApiError("filter の指定が不正です", 400);
    }
    if (filter === "scene" && !sceneId) throw new ApiError("sceneId が必要です", 400);
    if (
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 50
    ) {
      throw new ApiError("offset は 0 以上、limit は 1〜50 の整数で指定してください", 400);
    }

    const video = await readableVideo(db, caller, lessonId);
    const response: LessonCommentsResponse = {
      video: sceneResponse(video.videoPath === null ? null : video.scenes),
      total: 0,
      orphaned_count: 0,
      ...(include !== undefined ? { include_state: null } : {}),
      markers: [],
      threads: [],
    };
    if (video.videoPath === null && !include) return c.json(response);

    const lessonRoots = and(eq(lessonComments.lessonId, lessonId), isNull(lessonComments.parentId));
    const selectRoots = () =>
      db
        .select({
          ...anchorColumns,
          userId: lessonComments.userId,
          authorName: profiles.displayName,
          excerpt: sql<string>`substr(replace(replace(replace(
            ${lessonComments.body}, char(13, 10), ' '), char(13), ' '), char(10), ' '), 1, 60)`,
        })
        .from(lessonComments)
        .innerJoin(profiles, eq(profiles.id, lessonComments.userId));
    const roots =
      video.videoPath === null
        ? []
        : await selectRoots()
            .where(lessonRoots)
            .orderBy(desc(lessonComments.createdAt), desc(lessonComments.id))
            .limit(ROOT_LIMIT);

    const matchesQuery = (userId: string, position: CommentPosition) =>
      (scope === "orphaned") === (position.state === "orphaned") &&
      (filter !== "mine" || userId === caller.id) &&
      (filter !== "scene" || position.sceneId === sceneId);
    const matches = [];
    const markers: CommentMarker[] = [];
    let orphanedCount = 0;
    for (const root of roots) {
      const position = resolveCommentPosition(root, video);
      if (root.id === include) response.include_state = position.state;
      if (position.state === "orphaned") orphanedCount++;
      if (position.positionSec !== null) {
        markers.push({
          id: root.id,
          position_sec: position.positionSec,
          resolved: root.resolvedAt !== null,
          author_name: root.authorName,
          excerpt: root.excerpt,
        });
      }
      if (matchesQuery(root.userId, position)) matches.push({ root, position });
    }
    if (scope === "active" && sort === "time") {
      matches.sort((a, b) => {
        const aSec = a.position.positionSec ?? Infinity;
        const bSec = b.position.positionSec ?? Infinity;
        return aSec === bSec
          ? a.root.createdAt.getTime() - b.root.createdAt.getTime() ||
              a.root.id.localeCompare(b.root.id)
          : aSec - bSec;
      });
    }

    const page = matches.slice(offset, offset + limit);
    if (include && !page.some(({ root }) => root.id === include)) {
      const included = matches.find(({ root }) => root.id === include);
      if (included) {
        page.unshift(included);
      } else if (response.include_state === null) {
        // 通知先が通常の取得範囲より古い場合も、このページだけに加える。
        const [root] = await selectRoots()
          .where(and(lessonRoots, eq(lessonComments.id, include)))
          .limit(1);
        if (root) {
          const position = resolveCommentPosition(root, video);
          response.include_state = position.state;
          if (video.videoPath !== null && matchesQuery(root.userId, position)) {
            page.unshift({ root, position });
          }
        }
      }
    }
    response.total = matches.length;
    response.orphaned_count = orphanedCount;
    response.markers = markers;
    if (!page.length) return c.json(response);

    const entries = await pageEntries(
      db,
      caller,
      page.map(({ root }) => root.id),
    );
    const participantIds = new Set<string>();
    for (const participants of entries.participantsByThread.values()) {
      for (const id of participants.keys()) {
        if (id !== caller.id) participantIds.add(id);
      }
    }
    const readableIds = await readableUserIds(db, lessonId, [...participantIds]);
    for (const { root, position } of page) {
      const entry = entries.roots.get(root.id);
      if (!entry) continue;
      const candidates: CommentMention[] = [];
      for (const [id, name] of entries.participantsByThread.get(root.id) ?? []) {
        if (readableIds.has(id)) candidates.push({ id, name });
      }
      const replyGroup = entries.repliesByThread.get(root.id);
      response.threads.push(
        threadResponse(
          entry,
          caller,
          position,
          root.resolvedAt !== null,
          replyGroup?.replies ?? [],
          candidates,
          replyGroup?.count,
        ),
      );
    }
    return c.json(response);
  } catch (err) {
    return errorResponse(c, err);
  }
});

function parsePost(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ApiError("投稿内容が不正です", 400);
  }
  const {
    lessonId,
    body,
    positionSec = null,
    videoPath,
    parentId,
    mentionUserIds = [],
  } = input as Record<string, unknown>;
  if (typeof lessonId !== "string" || !lessonId) throw new ApiError("lessonId が必要です", 400);
  const content = typeof body === "string" ? body.trim() : "";
  if (!content || content.length > COMMENT_BODY_MAX) {
    throw new ApiError(`本文は 1〜${COMMENT_BODY_MAX} 文字で入力してください`, 400);
  }
  if (parentId !== undefined && (typeof parentId !== "string" || !parentId)) {
    throw new ApiError("parentId の指定が不正です", 400);
  }
  if (parentId === undefined && (typeof videoPath !== "string" || !videoPath.trim())) {
    throw new ApiError("動画の版を指定してください", 400);
  }
  if (
    parentId === undefined &&
    positionSec !== null &&
    (typeof positionSec !== "number" || !Number.isFinite(positionSec) || positionSec < 0)
  ) {
    throw new ApiError("動画の位置は 0 以上の秒数で指定してください", 400);
  }
  if (
    !Array.isArray(mentionUserIds) ||
    !mentionUserIds.every((id): id is string => typeof id === "string" && id.length > 0)
  ) {
    throw new ApiError("メンションはユーザー ID の配列で指定してください", 400);
  }
  const mentionIds = [...new Set(mentionUserIds)];
  if (!parentId && mentionIds.length) throw new ApiError("メンションは返信でだけ使えます", 400);
  if (mentionIds.length > COMMENT_MENTIONS_MAX) {
    throw new ApiError(`メンションは ${COMMENT_MENTIONS_MAX} 人までです`, 400);
  }
  return {
    lessonId,
    body: content,
    positionSec: !parentId && typeof positionSec === "number" ? positionSec : null,
    expectedVideoPath: !parentId && typeof videoPath === "string" ? videoPath : undefined,
    parentId,
    mentionIds,
  };
}

function commentNotFound() {
  return new ApiError("コメントが見つかりません", 404);
}

async function replyParticipants(db: Db, caller: Caller, lessonId: string, parentId: string) {
  const [root] = await db
    .select({ userId: lessonComments.userId })
    .from(lessonComments)
    .where(
      and(
        eq(lessonComments.id, parentId),
        eq(lessonComments.lessonId, lessonId),
        isNull(lessonComments.parentId),
      ),
    );
  if (!root) throw commentNotFound();

  const replies = await db
    .selectDistinct({ userId: lessonComments.userId })
    .from(lessonComments)
    .where(eq(lessonComments.parentId, parentId));
  const participants = mentionCandidates(
    root.userId,
    replies.map(({ userId }) => userId),
    caller.id,
  );
  return readableUserIds(db, lessonId, participants);
}

lessonCommentsRoute.post(PATH, async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const input = parsePost(await c.req.json().catch(() => null));
    const { lessonId, body, expectedVideoPath, parentId, mentionIds } = input;
    let positionSec = input.positionSec;
    const video = await readableVideo(db, caller, lessonId);
    if (video.videoPath === null) throw new ApiError("この教材にはコメントできません", 409);
    if (expectedVideoPath !== undefined && expectedVideoPath !== video.videoPath) {
      throw new ApiError(VIDEO_UPDATED, 409);
    }
    if (positionSec !== null) {
      if (positionSec > 86400) {
        throw new ApiError("動画の位置は 0〜86400 秒で指定してください", 400);
      }
      const lastScene = video.scenes?.at(-1);
      const duration = lastScene ? lastScene.startSec + lastScene.durationSec : video.totalSec;
      if (duration !== null && (lastScene || duration > 0)) {
        if (positionSec > duration + 1) {
          throw new ApiError("動画の位置が動画の長さを超えています", 400);
        }
        positionSec = Math.min(positionSec, duration);
      }
    }
    const recipientIds = parentId
      ? await replyParticipants(db, caller, lessonId, parentId)
      : new Set((await loadActiveStaffIds(db)).filter((id) => id !== caller.id));
    if (!mentionIds.every((id) => recipientIds.has(id))) {
      throw new ApiError("メンションできるのは、このスレッドに参加している人だけです", 400);
    }
    const mentions = new Set(mentionIds);
    const scene = positionSec === null ? null : sceneAt(video.scenes, positionSec);
    const id = crypto.randomUUID();
    const createdAt = new Date();
    const videoPath = parentId ? null : video.videoPath;
    const offset = scene && positionSec !== null ? positionSec - scene.startSec : null;
    const payload = {
      stage_id: video.stageId,
      lesson_id: lessonId,
      thread_id: parentId ?? id,
      comment_id: id,
      from_id: caller.id,
    };

    // INSERT の条件で件数を確かめ、同時投稿でも 30 件を超えないようにする。
    const windowStart = new Date(createdAt.getTime() - POST_WINDOW_MS);
    const recentPosts = db
      .select({ id: lessonCommentPosts.id })
      .from(lessonCommentPosts)
      .where(
        and(
          eq(lessonCommentPosts.userId, caller.id),
          gte(lessonCommentPosts.createdAt, windowStart),
        ),
      )
      .limit(1)
      .offset(POST_LIMIT - 1);
    // 動画を読んでから INSERT するまでに差し替わった場合も、旧版の位置は保存しない。
    const matchingVideo = db
      .select({ id: lessons.id })
      .from(lessons)
      .where(and(eq(lessons.id, lessonId), eq(lessons.videoPath, video.videoPath)));
    const insert = db
      .insert(lessonComments)
      .select(sql`
      select ${id}, ${lessonId}, ${caller.id}, ${parentId ?? null}, ${body},
        ${positionSec}, ${videoPath}, ${scene?.id ?? null}, ${offset}, ${scene?.hash ?? null},
        null, null, ${createdAt.getTime()}
      where not exists ${recentPosts}
      ${expectedVideoPath === undefined ? sql.empty() : sql`and exists ${matchingVideo}`}
    `)
      .returning({
        avatarUrl: sql<
          string | null
        >`(select ${profiles.avatarUrl} from ${profiles} where ${profiles.id} = ${caller.id})`,
      });

    const pending = [...recipientIds].map((userId) => {
      const mentioned = mentions.has(userId);
      const type = parentId
        ? mentioned
          ? "lesson_comment_mention"
          : "lesson_comment_reply"
        : "lesson_comment";
      const message = parentId
        ? mentioned
          ? "あなたにメンションしました"
          : "返信しました"
        : "動画にコメントしました";
      return { id: crypto.randomUUID(), userId, type, title: `${caller.name}さんが${message}` };
    });

    // 投稿が作られた場合だけ関連行を入れる。
    const insertedComment = db
      .select({ id: lessonComments.id })
      .from(lessonComments)
      .where(eq(lessonComments.id, id));
    const recordPost = db.insert(lessonCommentPosts).select(sql`
      select ${id}, ${caller.id}, ${createdAt.getTime()}
      where exists ${insertedComment}
    `);
    const prunePosts = db
      .delete(lessonCommentPosts)
      .where(
        and(
          eq(lessonCommentPosts.userId, caller.id),
          lt(lessonCommentPosts.createdAt, windowStart),
        ),
      );
    // 宛先の一覧は JSON 1 バインドで渡す。
    const insertMentions = db.insert(lessonCommentMentions).select(sql`
      select ${id}, ${profiles.id}
      from json_each(${JSON.stringify(mentionIds)}) as recipient
      inner join ${profiles} on ${profiles.id} = recipient.value
      where exists ${insertedComment}
    `);
    // 宛先を調べた後に閲覧権が失われても、返信本文を含む通知は保存しない。
    const insertNotifications = db.insert(notifications).select(sql`
      select json_extract(recipient.value, '$.id'), ${profiles.id}, ${profiles.tenantId},
        json_extract(recipient.value, '$.type'), json_extract(recipient.value, '$.title'),
        ${body.slice(0, 120)}, ${JSON.stringify(payload)}, 0, ${createdAt.getTime()}
      from json_each(${JSON.stringify(pending)}) as recipient
      inner join ${profiles} on ${profiles.id} = json_extract(recipient.value, '$.userId')
      where exists ${insertedComment}
      ${parentId ? sql`and ${lessonReadableByProfile(db, lessonId)}` : sql.empty()}
    `);

    const selectMentions = db
      .select({ id: profiles.id, name: profiles.displayName })
      .from(lessonCommentMentions)
      .innerJoin(profiles, eq(profiles.id, lessonCommentMentions.userId))
      .where(eq(lessonCommentMentions.commentId, id))
      .orderBy(asc(profiles.id));

    const [inserted, , , , , savedMentions, matchedVideo] = await db.batch([
      insert,
      recordPost,
      prunePosts,
      insertMentions,
      insertNotifications,
      selectMentions,
      ...(expectedVideoPath === undefined ? [] : ([matchingVideo] as const)),
    ]);
    if (matchedVideo?.length === 0) throw new ApiError(VIDEO_UPDATED, 409);
    const [saved] = inserted;
    if (!saved) throw new ApiError("コメントが多すぎます。時間をおいて再試行してください", 429);

    const entry = {
      id,
      userId: caller.id,
      name: caller.name,
      avatarUrl: saved.avatarUrl,
      role: caller.role,
      body,
      createdAt,
    };
    if (parentId) {
      const reply: CommentReply = { ...commentEntry(entry, caller), mentions: savedMentions };
      return c.json(reply, 201);
    }

    const position = resolveCommentPosition(
      {
        positionSec,
        videoPath,
        sceneId: scene?.id ?? null,
        sceneOffsetSec: offset,
        sceneHash: scene?.hash ?? null,
      },
      video,
    );
    return c.json(threadResponse(entry, caller, position, false, [], []), 201);
  } catch (err) {
    return errorResponse(c, err);
  }
});

async function manageableComment(db: Db, caller: Caller, id: string) {
  const [row] = await db
    .select({
      id: lessonComments.id,
      parentId: lessonComments.parentId,
      userId: lessonComments.userId,
      lessonId: lessonComments.lessonId,
    })
    .from(lessonComments)
    .where(eq(lessonComments.id, id));
  if (!row || !canManage(caller, row.userId)) throw commentNotFound();
  return row;
}

lessonCommentsRoute.delete(`${PATH}/:id`, async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const row = await manageableComment(db, caller, c.req.param("id"));
    const payloadKey = row.parentId === null ? "$.thread_id" : "$.comment_id";
    const removeNotifications = db
      .delete(notifications)
      .where(
        and(
          inArray(notifications.type, COMMENT_NOTIFICATION_TYPES),
          sql`case when json_valid(${notifications.payload}) then json_extract(${notifications.payload}, ${payloadKey}) end = ${row.id}`,
        ),
      );
    const removeComment = db.delete(lessonComments).where(eq(lessonComments.id, row.id));
    const audit =
      caller.id === row.userId
        ? []
        : [
            auditLogInsert(db, caller, {
              action: "lesson_comment_delete",
              targetType: "lesson_comment",
              targetId: row.id,
              metadata: { lesson_id: row.lessonId, user_id: row.userId },
              ip: clientIp(c),
            }),
          ];
    await db.batch([removeNotifications, removeComment, ...audit]);
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

lessonCommentsRoute.post(`${PATH}/:id/resolve`, async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const row = await manageableComment(db, caller, c.req.param("id"));
    if (row.parentId !== null)
      throw new ApiError("解決済みにできるのはスレッドの先頭だけです", 400);
    const input: unknown = await c.req.json().catch(() => null);
    if (
      !input ||
      typeof input !== "object" ||
      !("resolved" in input) ||
      typeof input.resolved !== "boolean"
    ) {
      throw new ApiError("resolved に真偽値を指定してください", 400);
    }
    const [updated] = await db
      .update(lessonComments)
      .set({
        resolvedAt: input.resolved ? new Date() : null,
        resolvedBy: input.resolved ? caller.id : null,
      })
      .where(eq(lessonComments.id, row.id))
      .returning({ resolvedAt: lessonComments.resolvedAt });
    if (!updated) throw commentNotFound();
    const response: CommentResolveResponse = { resolved: updated.resolvedAt !== null };
    return c.json(response);
  } catch (err) {
    return errorResponse(c, err);
  }
});
