import type {
  CommentReply,
  CommentThread,
  LessonCommentsResponse,
} from "@stella/shared/lessons/comments";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Env } from "../env.js";
import { getDb } from "../db/client.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { readableUserIds } from "../lib/lesson-access.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { lessonCommentsRoute } from "./lesson-comments.js";

const secret = "lesson-comments-test-secret";
const path = "/api/lesson-comments";
const learner = "learner";
const other = "other";
const third = "third";
const admin = "admin";
const outsider = "outsider";
const lessons = { video: "video", legacy: "legacy", text: "text" };

const initialScenes = [
  { id: "intro", startSec: 0, durationSec: 10, hash: "a" },
  { id: "search", startSec: 10, durationSec: 10, hash: "b" },
  { id: "end", startSec: 20, durationSec: 10, hash: "c" },
];

describe("動画レッスンのコメント API", () => {
  let db: ReturnType<typeof sqliteD1>;
  let test: ReturnType<typeof mountTestApp>;

  beforeEach(() => {
    db = sqliteD1();
    db.sqlite.exec(`
      INSERT INTO tenants (id, name, active_count, active, created_at, updated_at)
        VALUES ('ses', 'SES', 0, 1, 1, 1);
      INSERT INTO profiles (id, tenant_id, role, display_name, email, disabled, created_at) VALUES
        ('learner', 'ses', 'student', '受講者', 'learner@example.test', 0, 1),
        ('other', 'ses', 'student', '別の受講者', 'other@example.test', 0, 1),
        ('third', 'ses', 'student', '第三の受講者', 'third@example.test', 0, 1),
        ('outsider', 'ses', 'student', '未登録', 'outsider@example.test', 0, 1),
        ('admin', 'ses', 'admin', '管理者', 'admin@example.test', 0, 1),
        ('disabled', 'ses', 'admin', '無効', 'disabled@example.test', 1, 1);
      INSERT INTO stages (id, tenant_id, slug, title, status, created_at, updated_at)
        VALUES ('stage', 'ses', 'stage', 'ステージ', 'published', 1, 1);
      INSERT INTO sections (id, stage_id, title, "order", created_at)
        VALUES ('section', 'stage', '単元', 0, 1);
      INSERT INTO lessons (id, section_id, title, type, video_path, created_at, updated_at) VALUES
        ('video', 'section', '動画', 'video', 'old.mp4', 1, 1),
        ('legacy', 'section', '旧形式の動画', 'video', 'legacy.mp4', 1, 1),
        ('text', 'section', '本文', 'text', NULL, 1, 1);
      INSERT INTO enrollments (id, tenant_id, user_id, stage_id, status, enrolled_at) VALUES
        ('one', 'ses', 'learner', 'stage', 'active', 1),
        ('two', 'ses', 'other', 'stage', 'completed', 1),
        ('three', 'ses', 'third', 'stage', 'active', 1);
    `);
    db.sqlite
      .prepare("UPDATE lessons SET video_scenes = ? WHERE id = 'video'")
      .run(JSON.stringify(initialScenes));
    test = mountTestApp({ DB: db.binding, AUTH_JWT_SECRET: secret } as Env, lessonCommentsRoute);
  });
  afterEach(() => db.sqlite.close());

  async function call(
    url: string,
    user: string | null,
    method = "GET",
    body?: Record<string, unknown>,
  ) {
    return request(test.app, test.env, url, {
      method,
      token: user ? await signAccessToken(secret, user, `${user}@example.test`) : undefined,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  function post(user: string, details: Record<string, unknown> = {}) {
    return call(path, user, "POST", { lessonId: lessons.video, body: "コメント", ...details });
  }

  async function create<T = CommentThread>(user = learner, details: Record<string, unknown> = {}) {
    const response = await post(user, details);
    expect(response.status, await response.clone().text()).toBe(201);
    return json<T>(response);
  }

  async function list(query = "", user = learner, lessonId = lessons.video) {
    const response = await call(`${path}?lessonId=${lessonId}${query}`, user);
    expect(response.status, await response.clone().text()).toBe(200);
    return json<LessonCommentsResponse>(response);
  }

  function notes(commentId: string) {
    return db.sqlite
      .prepare(`
      SELECT user_id, type, title, body, payload FROM notifications
      WHERE json_extract(payload, '$.comment_id') = ? ORDER BY user_id
    `)
      .all(commentId);
  }

  it("ログインと閲覧できる受講登録が必要で、動画が無ければ一覧は空で投稿は 409", async () => {
    const url = `${path}?lessonId=video`;
    expect((await call(url, null)).status).toBe(401);
    expect((await call(path, null, "POST")).status).toBe(401);
    for (const response of [await call(url, outsider), await post(outsider)]) {
      expect(response.status).toBe(404);
      expect(await json(response)).toEqual({ error: "教材が見つかりません" });
    }
    expect((await call(url, other)).status).toBe(200);
    const noVideo = await post(learner, { lessonId: lessons.text });
    expect(noVideo.status).toBe(409);
    expect(await json(noVideo)).toEqual({ error: "この教材にはコメントできません" });
    expect(await list("", learner, lessons.text)).toEqual({
      video: { scenes: [] },
      total: 0,
      orphaned_count: 0,
      markers: [],
      threads: [],
    });
    db.sqlite.exec("UPDATE stages SET status = 'draft' WHERE id = 'stage'");
    expect((await call(url, learner)).status).toBe(404);
    expect((await call(url, admin)).status).toBe(200);
  });

  it("投稿時の場面と版を記録し、有効な管理者にだけ通知する", async () => {
    const body = "あ".repeat(121);
    const thread = await create(learner, { body: `  ${body}\n`, positionSec: 12.5 });
    expect(thread).toEqual({
      id: expect.any(String),
      author: { id: learner, name: "受講者", role: "student", is_self: true },
      body,
      position_sec: 12.5,
      state: "current",
      scene_id: "search",
      resolved: false,
      created_at: expect.any(Number),
      can_delete: true,
      can_resolve: true,
      replies: [],
      mention_candidates: [],
    });
    expect(
      db.sqlite
        .prepare(`
      SELECT position_sec, video_path, scene_id, scene_offset_sec, scene_hash
      FROM lesson_comments WHERE id = ?
    `)
        .get(thread.id),
    ).toEqual({
      position_sec: 12.5,
      video_path: "old.mp4",
      scene_id: "search",
      scene_offset_sec: 2.5,
      scene_hash: "b",
    });
    expect(notes(thread.id)).toEqual([
      {
        user_id: admin,
        type: "lesson_comment",
        title: "受講者さんが動画にコメントしました",
        body: body.slice(0, 120),
        payload: JSON.stringify({
          stage_id: "stage",
          lesson_id: lessons.video,
          thread_id: thread.id,
          comment_id: thread.id,
          from_id: learner,
        }),
      },
    ]);
    expect(notes((await create(admin)).id)).toEqual([]);
    const legacy = await create(learner, { lessonId: lessons.legacy, positionSec: 42 });
    expect(legacy).toMatchObject({ position_sec: 42, state: "current", scene_id: null });
    expect((await list("", learner, lessons.legacy)).video).toEqual({ scenes: [] });
  });

  it("返信は先頭だけに付き、メンションと通常の返信を参加者に 1 通ずつ送る", async () => {
    const root = await create();
    const first = await create<CommentReply>(other, { parentId: root.id });
    db.sqlite.prepare("UPDATE lesson_comments SET created_at = 1 WHERE id = ?").run(first.id);
    await create<CommentReply>(other, { parentId: root.id });
    const reply = await create<CommentReply>(third, {
      parentId: root.id,
      mentionUserIds: [learner, learner],
      positionSec: 5,
      videoPath: "older.mp4",
    });
    expect(reply.mentions).toEqual([{ id: learner, name: "受講者" }]);
    expect(
      db.sqlite
        .prepare(`
      SELECT parent_id, position_sec, video_path, scene_id, scene_offset_sec, scene_hash
      FROM lesson_comments WHERE id = ?
    `)
        .get(reply.id),
    ).toEqual({
      parent_id: root.id,
      position_sec: null,
      video_path: null,
      scene_id: null,
      scene_offset_sec: null,
      scene_hash: null,
    });
    expect(notes(reply.id)).toMatchObject([
      {
        user_id: learner,
        type: "lesson_comment_mention",
        title: "第三の受講者さんがあなたにメンションしました",
      },
      { user_id: other, type: "lesson_comment_reply", title: "第三の受講者さんが返信しました" },
    ]);
    const returningAuthor = await create<CommentReply>(other, { parentId: root.id });
    expect(notes(returningAuthor.id)).toMatchObject([
      { user_id: learner, type: "lesson_comment_reply" },
      { user_id: third, type: "lesson_comment_reply" },
    ]);
    expect((await post(other, { parentId: first.id })).status).toBe(404);
    expect((await post(other, { lessonId: lessons.legacy, parentId: root.id })).status).toBe(404);
    const [thread] = (await list("", third)).threads;
    expect(thread.author).toEqual({ id: learner, name: "受講者", role: "student", is_self: false });
    expect(thread.replies[0].id).toBe(first.id);
    expect(thread.replies.find(({ id }) => id === reply.id)).toEqual(reply);
  });

  it("先頭の投稿は表示中の動画と版が違うと拒否し、同じ版と旧クライアントの投稿は保存する", async () => {
    const stale = await post(learner, { videoPath: "older.mp4", positionSec: 12 });
    expect(stale.status).toBe(409);
    expect(await json(stale)).toEqual({
      error: "動画が更新されました。画面を読み込み直してからコメントしてください",
    });
    expect((await list()).total).toBe(0);
    expect(await create(learner, { videoPath: "old.mp4", positionSec: 12 })).toMatchObject({
      position_sec: 12,
      scene_id: "search",
    });
    expect(await create(learner, { positionSec: 13 })).toMatchObject({ position_sec: 13 });
  });

  it("投稿の保存直前に動画が差し替わった場合も旧版の位置を拒否する", async () => {
    const batch = db.binding.batch.bind(db.binding);
    db.binding.batch = (statements) => {
      db.sqlite.exec("UPDATE lessons SET video_path = 'new.mp4' WHERE id = 'video'");
      return batch(statements);
    };
    const stale = await post(learner, { videoPath: "old.mp4", positionSec: 12 });
    expect(stale.status).toBe(409);
    expect((await list()).total).toBe(0);
    expect(db.sqlite.prepare("SELECT count(*) AS n FROM lesson_comment_posts").get()).toEqual({
      n: 0,
    });
  });

  it("最後の場面の終点と 1 秒の余裕を受け付け、その先は拒否する", async () => {
    db.sqlite.exec("UPDATE lessons SET total_sec = 100 WHERE id = 'video'");
    expect(await create(learner, { positionSec: 30 })).toMatchObject({
      position_sec: 30,
      scene_id: "end",
    });
    expect(await create(learner, { positionSec: 31 })).toMatchObject({ position_sec: 31 });
    const pastEnd = await post(learner, { positionSec: 31.01 });
    expect(pastEnd.status).toBe(400);
    expect(await json(pastEnd)).toEqual({ error: "動画の位置が動画の長さを超えています" });
  });

  it("場面がなければ total_sec を使い、それもなければ 86400 秒まで受け付ける", async () => {
    const lessonId = lessons.legacy;
    expect(await create(learner, { lessonId, positionSec: 86400 })).toMatchObject({
      position_sec: 86400,
    });
    expect((await post(learner, { lessonId, positionSec: 86401 })).status).toBe(400);
    db.sqlite.exec("UPDATE lessons SET total_sec = 60 WHERE id = 'legacy'");
    expect(await create(learner, { lessonId, positionSec: 61 })).toMatchObject({
      position_sec: 61,
    });
    const pastEnd = await post(learner, { lessonId, positionSec: 61.01 });
    expect(pastEnd.status).toBe(400);
    expect(await json(pastEnd)).toEqual({ error: "動画の位置が動画の長さを超えています" });
  });

  it("本文・位置・メンションを検証する", async () => {
    const root = await create();
    for (const details of [
      { body: "   " },
      { body: "あ".repeat(2001) },
      { positionSec: -1 },
      { positionSec: 86401 },
      { positionSec: "1" },
    ]) {
      expect((await post(learner, details)).status).toBe(400);
    }
    const noRootMentions = await post(learner, { mentionUserIds: [other] });
    expect(noRootMentions.status).toBe(400);
    expect(await json(noRootMentions)).toEqual({ error: "メンションは返信でだけ使えます" });
    for (const id of [admin, other]) {
      const invalid = await post(other, { parentId: root.id, mentionUserIds: [id] });
      expect(invalid.status).toBe(400);
      expect(await json(invalid)).toEqual({
        error: "メンションできるのは、このスレッドに参加している人だけです",
      });
    }
    expect(
      (
        await post(other, {
          parentId: root.id,
          mentionUserIds: Array.from({ length: 11 }, (_, index) => String(index)),
        })
      ).status,
    ).toBe(400);
  });

  it("閲覧権を失った参加者のコメントを残し、通知とメンションの候補から外す", async () => {
    const root = await create();
    const disabledReply = await create<CommentReply>(third, { parentId: root.id });
    const demotedReply = await create<CommentReply>(admin, { parentId: root.id });
    const readableReply = await create<CommentReply>(other, { parentId: root.id });
    db.sqlite.exec(`
      DELETE FROM enrollments WHERE user_id = 'learner';
      UPDATE profiles SET disabled = 1 WHERE id = 'third';
      UPDATE profiles SET role = 'student' WHERE id = 'admin';
    `);

    for (const id of [learner, third, admin]) {
      const response = await post(other, { parentId: root.id, mentionUserIds: [id] });
      expect(response.status).toBe(400);
      expect(await json(response)).toEqual({
        error: "メンションできるのは、このスレッドに参加している人だけです",
      });
    }
    const [thread] = (await list("", other)).threads;
    expect(thread.author.id).toBe(learner);
    expect(thread.replies.map(({ id }) => id)).toEqual(
      expect.arrayContaining([disabledReply.id, demotedReply.id, readableReply.id]),
    );
    expect(thread.mention_candidates).toEqual([]);

    const reply = await create<CommentReply>(other, { parentId: root.id });
    expect(notes(reply.id)).toEqual([]);
    db.sqlite.exec("UPDATE profiles SET role = 'admin' WHERE id = 'admin'");
    const [threadForAdmin] = (await list("", admin)).threads;
    expect(threadForAdmin.mention_candidates).toEqual([{ id: other, name: "別の受講者" }]);
    const replyForOther = await create<CommentReply>(admin, {
      parentId: root.id,
      mentionUserIds: [other],
    });
    expect(notes(replyForOther.id)).toMatchObject([
      { user_id: other, type: "lesson_comment_mention" },
    ]);
    const replyForAdmin = await create<CommentReply>(other, { parentId: root.id });
    expect(notes(replyForAdmin.id)).toMatchObject([
      { user_id: admin, type: "lesson_comment_reply" },
    ]);
  });

  it("readableUserIds は有効な管理者と公開中の教材を閲覧できる受講者を返す", async () => {
    const client = getDb(test.env);
    db.sqlite.exec("UPDATE enrollments SET status = 'expired' WHERE user_id = 'third'");
    const ids = [admin, "disabled", learner, other, third, outsider, "missing", learner];
    expect(await readableUserIds(client, lessons.video, ids)).toEqual(
      new Set([admin, learner, other]),
    );
    expect(await readableUserIds(client, lessons.video, [])).toEqual(new Set());
    expect(await readableUserIds(client, "missing", ids)).toEqual(new Set());

    db.sqlite.exec("UPDATE stages SET status = 'draft' WHERE id = 'stage'");
    expect(await readableUserIds(client, lessons.video, ids)).toEqual(new Set([admin]));
  });

  it("30 件投稿して 1 件消しても、直近 10 分の 31 件目は拒否する", async () => {
    const first = await create();
    for (let i = 1; i < 30; i++) await create();
    expect((await call(`${path}/${first.id}`, learner, "DELETE")).status).toBe(200);
    expect((await post(learner)).status).toBe(429);
    expect(db.sqlite.prepare("SELECT count(*) AS n FROM lesson_comment_posts").get()).toEqual({
      n: 30,
    });
    expect(db.sqlite.prepare("SELECT count(*) AS n FROM lesson_comments").get()).toEqual({ n: 29 });
    expect(db.sqlite.prepare("SELECT count(*) AS n FROM notifications").get()).toEqual({ n: 29 });
  });

  it("10 分より古い投稿記録は件数に含めず、その人の分を削除する", async () => {
    const insert = db.sqlite.prepare(
      "INSERT INTO lesson_comment_posts (id, user_id, created_at) VALUES (?, ?, ?)",
    );
    const now = Date.now();
    for (let i = 0; i < 29; i++) insert.run(`recent-${i}`, learner, now);
    insert.run("expired", learner, now - 10 * 60 * 1000 - 10_000);
    insert.run("other-expired", other, now - 10 * 60 * 1000 - 10_000);
    await create();
    expect((await post(learner)).status).toBe(429);
    expect(
      db.sqlite.prepare("SELECT id FROM lesson_comment_posts WHERE created_at < ?").all(now),
    ).toEqual([{ id: "other-expired" }]);
  });

  it("削除は本人か管理者に限り、通知を一緒に消して管理者の操作を監査する", async () => {
    const root = await create();
    const first = await create<CommentReply>(other, {
      parentId: root.id,
      mentionUserIds: [learner],
    });
    const second = await create<CommentReply>(other, { parentId: root.id });
    expect((await call(`${path}/${root.id}`, other, "DELETE")).status).toBe(404);
    expect((await call(`${path}/${first.id}`, other, "DELETE")).status).toBe(200);
    expect(notes(first.id)).toEqual([]);
    expect(notes(second.id)).toHaveLength(1);
    expect(notes(root.id)).toHaveLength(1);
    expect((await call(`${path}/${root.id}`, admin, "DELETE")).status).toBe(200);
    expect(notes(root.id)).toEqual([]);
    expect(notes(second.id)).toEqual([]);
    expect(db.sqlite.prepare("SELECT count(*) AS n FROM lesson_comments").get()).toEqual({ n: 0 });
    const audit = db.sqlite
      .prepare(`
      SELECT actor_id, action, target_id, metadata FROM audit_logs WHERE action = 'lesson_comment_delete'
    `)
      .all();
    expect(audit).toEqual([
      {
        actor_id: admin,
        action: "lesson_comment_delete",
        target_id: root.id,
        metadata: JSON.stringify({ lesson_id: lessons.video, user_id: learner }),
      },
    ]);
  });

  it("先頭の投稿者と管理者が解決済みを切り替えられる", async () => {
    const root = await create(learner, { positionSec: 5 });
    const reply = await create<CommentReply>(other, { parentId: root.id });
    const resolve = (id: string, user: string, resolved: boolean) =>
      call(`${path}/${id}/resolve`, user, "POST", { resolved });
    expect((await resolve(root.id, other, true)).status).toBe(404);
    expect((await resolve(reply.id, other, true)).status).toBe(400);
    const resolved = await resolve(root.id, learner, true);
    expect(resolved.status).toBe(200);
    expect(await json(resolved)).toEqual({ resolved: true });
    const response = await list("", other);
    expect(response.markers).toEqual([
      { id: root.id, position_sec: 5, resolved: true, author_name: "受講者", excerpt: "コメント" },
    ]);
    expect(response.threads[0]).toMatchObject({
      resolved: true,
      can_delete: false,
      can_resolve: false,
    });
    expect(
      db.sqlite.prepare("SELECT resolved_by FROM lesson_comments WHERE id = ?").get(root.id),
    ).toEqual({ resolved_by: learner });
    const reopened = await resolve(root.id, admin, false);
    expect(reopened.status).toBe(200);
    expect(await json(reopened)).toEqual({ resolved: false });
    expect(
      db.sqlite
        .prepare("SELECT resolved_at, resolved_by FROM lesson_comments WHERE id = ?")
        .get(root.id),
    ).toEqual({ resolved_at: null, resolved_by: null });
  });

  it("動画の更新後に位置を引き直し、scope・並び順・ページを適用する", async () => {
    const untimed = await create();
    const removed = await create(learner, { positionSec: 25 });
    const changed = await create(learner, { positionSec: 15 });
    const same = await create(learner, { positionSec: 6 });
    const tied = await create(learner, { positionSec: 2 });
    const timestamp = db.sqlite.prepare("UPDATE lesson_comments SET created_at = ? WHERE id = ?");
    for (const [index, thread] of [untimed, removed, changed, same, tied].entries()) {
      timestamp.run(index, thread.id);
    }
    db.sqlite
      .prepare("UPDATE lessons SET video_path = 'new.mp4', video_scenes = ? WHERE id = 'video'")
      .run(
        JSON.stringify([
          { id: "intro", startSec: 3, durationSec: 2, hash: "a" },
          { id: "search", startSec: 5, durationSec: 15, hash: "b2" },
        ]),
      );

    const active = await list();
    expect(active.total).toBe(4);
    expect(active.orphaned_count).toBe(1);
    expect(
      active.threads.map(({ id, state, position_sec, scene_id }) => [
        id,
        state,
        position_sec,
        scene_id,
      ]),
    ).toEqual([
      [changed.id, "outdated", 5, "search"],
      [same.id, "current", 5, "intro"],
      [tied.id, "current", 5, "intro"],
      [untimed.id, "untimed", null, null],
    ]);
    expect(active.video.scenes).toEqual([
      { id: "intro", start_sec: 3, duration_sec: 2 },
      { id: "search", start_sec: 5, duration_sec: 15 },
    ]);
    const page = await list("&sort=new&offset=1&limit=2");
    expect(page.total).toBe(4);
    expect(page.threads.map(({ id }) => id)).toEqual([same.id, changed.id]);
    const archived = await list("&scope=orphaned&sort=time");
    expect(archived.total).toBe(1);
    expect(archived.threads[0]).toMatchObject({
      id: removed.id,
      state: "orphaned",
      position_sec: null,
      scene_id: null,
    });
    expect(archived.markers).toEqual(active.markers);
    expect(archived.markers).toHaveLength(3);
  });

  it("自分のスレッドだけを返し、印は全体の投稿者名と本文の先頭 60 文字を返す", async () => {
    const mine = await create(learner, { positionSec: 5 });
    const theirs = await create(other, {
      positionSec: 7,
      body: `本文\r\n続き\n${"あ".repeat(60)}`,
    });
    await create<CommentReply>(learner, { parentId: theirs.id });

    const filtered = await list("&filter=mine");
    expect(filtered.total).toBe(1);
    expect(filtered.threads.map(({ id }) => id)).toEqual([mine.id]);
    expect(filtered.markers).toHaveLength(2);
    expect(filtered.markers).toContainEqual({
      id: theirs.id,
      position_sec: 7,
      resolved: false,
      author_name: "別の受講者",
      excerpt: `本文 続き ${"あ".repeat(54)}`,
    });
  });

  it("現在の動画に引き直した場面で絞り込み、印と場面不明の件数は全体を返す", async () => {
    const intro = await create(learner, { positionSec: 9 });
    const search = await create(learner, { positionSec: 12 });
    await create(learner, { positionSec: 25 });
    await create();
    db.sqlite
      .prepare("UPDATE lessons SET video_path = 'new.mp4', video_scenes = ? WHERE id = 'video'")
      .run(
        JSON.stringify([
          { ...initialScenes[0], id: "moved-intro", durationSec: 6 },
          { ...initialScenes[1], startSec: 6 },
        ]),
      );

    const result = await list(`&filter=scene&sceneId=moved-intro&include=${search.id}`);
    expect(result.total).toBe(1);
    expect(result.threads).toMatchObject([
      { id: intro.id, scene_id: "moved-intro", position_sec: 6, state: "current" },
    ]);
    expect((await list("&filter=scene&sceneId=intro")).total).toBe(0);
    expect(result.orphaned_count).toBe(1);
    expect(result.markers).toHaveLength(2);
    expect((await call(`${path}?lessonId=video&filter=scene`, learner)).status).toBe(400);
    expect((await call(`${path}?lessonId=video&filter=invalid`, learner)).status).toBe(400);
  });

  it("対象のスレッドをページの先頭に追加し、件数と既に入っているスレッドの順序を保つ", async () => {
    const first = await create(learner, { positionSec: 2 });
    const second = await create(learner, { positionSec: 8 });
    const otherThread = await create(other, { positionSec: 12 });
    const foreign = await create(learner, { lessonId: lessons.legacy });

    const included = await list(`&limit=1&include=${second.id}`);
    expect(included.total).toBe(3);
    expect(included.threads.map(({ id }) => id)).toEqual([second.id, first.id]);

    const alreadyInPage = await list(`&limit=2&include=${second.id}`);
    expect(alreadyInPage.threads.map(({ id }) => id)).toEqual([first.id, second.id]);

    const emptyPage = await list(`&offset=100&include=${second.id}`);
    expect(emptyPage.threads.map(({ id }) => id)).toEqual([second.id]);

    for (const query of [`&filter=mine&include=${otherThread.id}`, `&include=${foreign.id}`]) {
      expect((await list(`&limit=1${query}`)).threads.map(({ id }) => id)).toEqual([first.id]);
    }
    expect((await list(`&scope=orphaned&include=${second.id}`)).threads).toEqual([]);
  });

  it("参加者が D1 のバインド上限より多くても通知し、表示する返信は 200 件まで", async () => {
    const root = await create();
    const addProfile = db.sqlite.prepare(`
      INSERT INTO profiles (id, tenant_id, role, display_name, created_at)
      VALUES (?, 'ses', 'admin', ?, 1)
    `);
    const addReply = db.sqlite.prepare(`
      INSERT INTO lesson_comments (id, lesson_id, user_id, parent_id, body, created_at)
      VALUES (?, 'video', ?, ?, '返信', ?)
    `);
    for (let i = 0; i < 205; i++) {
      const user = `participant-${i}`;
      addProfile.run(user, user);
      addReply.run(`reply-${i}`, user, root.id, i);
    }
    const latest = await create<CommentReply>(other, { parentId: root.id });
    expect(notes(latest.id)).toHaveLength(206);
    const [thread] = (await list()).threads;
    expect(thread.replies).toHaveLength(200);
    expect(thread.replies.at(-1)?.id).toBe("reply-199");
    expect(thread.mention_candidates).toHaveLength(206);
    expect(thread.mention_candidates).toContainEqual({
      id: "participant-204",
      name: "participant-204",
    });
  });
});
