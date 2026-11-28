import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getDb } from "../db/client.js";
import type { Env } from "../env.js";
import { signAccessToken } from "../lib/auth-jwt.js";
import { json, mountTestApp, request } from "../testing/route-harness.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { adminRoute, updateProfileAsAdmin } from "./admin.js";
import { skillMapRoute } from "./skill-map.js";
import { tasksRoute } from "./tasks.js";

describe("ユーザー管理", () => {
  const SECRET = "admin-test-secret";
  let db: ReturnType<typeof sqliteD1>;
  let env: Env;
  let app: ReturnType<typeof mountTestApp>["app"];

  beforeEach(() => {
    db = sqliteD1();
    db.sqlite.exec(`
      INSERT INTO tenants (id, name, active_count, active, created_at, updated_at) VALUES
        ('ses', 'SES', 0, 1, 1, 1);
      INSERT INTO profiles (id, tenant_id, role, display_name, email, disabled, name_source, created_at) VALUES
        ('admin', 'ses', 'admin', '管理者', 'admin@example.test', 0, 'invite', 1),
        ('taken', 'ses', 'student', '別', 'taken@example.test', 0, 'invite', 2);
    `);
    env = { DB: db.binding, AUTH_JWT_SECRET: SECRET } as Env;
    app = mountTestApp(env, adminRoute, skillMapRoute, tasksRoute).app;
  });
  afterEach(() => {
    vi.useRealTimers();
    db.sqlite.close();
  });

  const token = () => signAccessToken(SECRET, "admin", "admin@example.test");

  describe("ユーザーの学習状況", () => {
    const overview = "/api/admin/users/overview";
    const detail = "/api/admin/users/taken";
    const now = Date.parse("2026-11-27T15:00:00Z");
    const fetchAdmin = async (path: string) => request(app, env, path, { token: await token() });

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(now);
    });

    it.each([overview, detail])("受講者は %s を参照できない", async (path) => {
      const studentToken = await signAccessToken(SECRET, "taken", "taken@example.test");
      expect((await request(app, env, path, { token: studentToken })).status).toBe(403);
    });

    it("詳細は存在しないユーザーに 404 を返す", async () => {
      expect((await fetchAdmin("/api/admin/users/missing")).status).toBe(404);
    });

    it("既存一覧と同じ集合を groupId で絞り、管理者も一覧に含める", async () => {
      db.sqlite.exec(`
        insert into groups (id, name, created_at, updated_at) values ('group', '組', 1, 1);
        insert into group_members (group_id, profile_id, joined_at) values ('group', 'taken', 1);
      `);
      const all = await fetchAdmin(overview);
      expect(all.status).toBe(200);
      expect(await json(all)).toMatchObject({
        rows: [
          {
            user_id: "admin",
            level: { level: 1, xp_total: 0, xp_into_level: 0, xp_to_next_level: 100 },
            current_stage: null,
            days: [],
            last_study_date: null,
            streak_current: 0,
            pending_reviews: 0,
            stumble_signals: [],
            status: { kind: "admin" },
          },
          { user_id: "taken", status: { kind: "ok" } },
        ],
      });
      const old = await json<{ rows: { id: string }[] }>(
        await fetchAdmin("/api/admin/users?groupId=group"),
      );
      const filtered = await json<{ rows: { user_id: string }[] }>(
        await fetchAdmin(`${overview}?groupId=group`),
      );
      expect(old.rows.map((row) => row.id)).toEqual(["taken"]);
      expect(filtered.rows.map((row) => row.user_id)).toEqual(old.rows.map((row) => row.id));
      expect(await json(await fetchAdmin(`${overview}?groupId=missing`))).toEqual({ rows: [] });
    });

    it("100 人を超える一覧でもユーザーごとのクエリを発行せず、バインド上限を守る", async () => {
      db.sqlite.exec(`
        with recursive ids(n) as (select 1 union all select n + 1 from ids where n < 101)
        insert into profiles (id, tenant_id, role, display_name, email, disabled, name_source, created_at)
        select 'student-' || n, 'ses', 'student', '受講者', n || '@example.test', 0, 'invite', n + 2 from ids;
      `);
      const prepare = vi.spyOn(db.binding, "prepare");
      const res = await fetchAdmin(overview);
      expect(res.status).toBe(200);
      expect((await json<{ rows: unknown[] }>(res)).rows).toHaveLength(103);
      expect(prepare.mock.calls.length).toBeLessThan(40);
    });

    it("受講中のステージに活動がなければ最後に受講登録したものを返す", async () => {
      db.sqlite.exec(`
        insert into stages (id, tenant_id, slug, title, created_at, updated_at)
          values ('older', 'ses', 'older', '先の登録', 1, 1),
                 ('newer', 'ses', 'newer', '後の登録', 1, 1);
        insert into enrollments (id, tenant_id, user_id, stage_id, status, enrolled_at)
          values ('new', 'ses', 'taken', 'newer', 'active', 20),
                 ('old', 'ses', 'taken', 'older', 'active', 10);
      `);
      const list = await fetchAdmin(overview);
      expect(list.status).toBe(200);
      expect(await json(list)).toMatchObject({
        rows: [
          { user_id: "admin", current_stage: null },
          { user_id: "taken", current_stage: { stage_id: "newer", title: "後の登録" } },
        ],
      });
      const res = await fetchAdmin(detail);
      expect(res.status).toBe(200);
      expect(await json(res)).toMatchObject({ current_stage: "newer" });
    });

    it("ストリークは今日を含む365日で数え、それより古い最終学習日は表示する", async () => {
      db.sqlite.exec(`
        insert into study_activity
          (id, tenant_id, user_id, date, watched_sec, completed_lessons, created_at, updated_at)
          values ('old-admin', 'ses', 'admin', '2025-11-28', 10, 0, 1, 1),
                 ('before', 'ses', 'taken', '2025-11-28', 10, 0, 1, 1),
                 ('first', 'ses', 'taken', '2025-11-29', 10, 0, 1, 1),
                 ('second', 'ses', 'taken', '2025-11-30', 10, 0, 1, 1);
      `);
      const list = await fetchAdmin(overview);
      expect(list.status).toBe(200);
      expect(await json(list)).toMatchObject({
        rows: [
          { user_id: "admin", last_study_date: "2025-11-28", days: [], streak_current: 0 },
          { user_id: "taken", last_study_date: "2025-11-30", days: [], streak_current: 0 },
        ],
      });
      const res = await fetchAdmin(detail);
      expect(res.status).toBe(200);
      expect(await json(res)).toMatchObject({ streak: { current: 0, longest: 2 } });
    });

    it("一覧と詳細で学習状況を共有し、最新の通知と受講・課題の正本を返す", async () => {
      db.sqlite.exec(`
        insert into groups (id, name, created_at, updated_at) values ('group', '組', 1, 1);
        insert into group_members (group_id, profile_id, joined_at) values ('group', 'taken', 1);
        insert into auth_users (id, name, email, created_at, updated_at)
          values ('taken', '別', 'taken@example.test', 1, 1);
        insert into auth_sessions (id, user_id, token, expires_at, created_at, updated_at)
          values ('session', 'taken', 'private-token', ${now + 1}, 20, 99),
                 ('old-session', 'taken', 'old-token', ${now + 1}, 10, 100);
        insert into auth_vscode_links (id, user_id, code_hash, expires_at, used_at, created_at)
          values ('link', 'taken', 'private-code', ${now}, 30, 10),
                 ('unused', 'taken', 'unused-code', ${now}, null, 40);
        insert into stages (id, tenant_id, slug, title, created_at, updated_at)
          values ('focus', 'ses', 'focus', 'フォーカス', 1, 1),
                 ('recent', 'ses', 'recent', '直近', 1, 1),
                 ('done', 'ses', 'done', '修了', 1, 1);
        insert into enrollments (id, tenant_id, user_id, stage_id, status, enrolled_at)
          values ('e1', 'ses', 'taken', 'focus', 'active', 10),
                 ('e2', 'ses', 'taken', 'recent', 'active', 20),
                 ('e3', 'ses', 'taken', 'done', 'active', 30);
        insert into certificates
          (id, tenant_id, user_id, stage_id, cert_code, issued_at, recipient_name, stage_title, tenant_name)
          values ('cert', 'ses', 'taken', 'done', 'cert-code', 50, '別', '修了', 'STELLA');
        insert into learner_focus (user_id, tenant_id, active_stage_id, updated_at)
          values ('taken', 'ses', 'focus', 1);
        insert into sections (id, stage_id, title, created_at)
          values ('unit', 'focus', '単元', 1), ('other-unit', 'recent', '別単元', 1);
        insert into lessons (id, section_id, title, type, created_at, updated_at)
          values ('lesson', 'unit', 'レッスン', 'text', 1, 1),
                 ('other-lesson', 'other-unit', '別レッスン', 'text', 1, 1);
        insert into lesson_progress (id, tenant_id, user_id, lesson_id, completed, updated_at)
          values ('p1', 'ses', 'taken', 'lesson', 0, 10),
                 ('p2', 'ses', 'taken', 'other-lesson', 1, 200);
        insert into quizzes (id, lesson_id, created_at, updated_at)
          values ('quiz', 'other-lesson', 1, 1);
        insert into quiz_attempts (id, tenant_id, quiz_id, user_id, score, max_score, passed, submitted_at)
          values ('q1', 'ses', 'quiz', 'taken', 1, 1, 1, 100),
                 ('q2', 'ses', 'quiz', 'taken', 1, 1, 1, 150);
        insert into discovery_materials (id, tenant_id, stage_id, title, created_at)
          values ('material', 'ses', 'recent', '発見教材', 1);
        insert into discovery_attempts
          (id, tenant_id, user_id, material_id, score, max_score, percent, passed, submitted_at)
          values ('d1', 'ses', 'taken', 'material', 1, 1, 100, 1, 100),
                 ('d2', 'ses', 'taken', 'material', 1, 1, 100, 1, 150);
        insert into tasks
          (id, section_id, title, kind, pattern, skills, estimated_minutes, "order", content_hash, definition, bundle, variant_of)
          values ('task', 'unit', '課題', 'basic', 'p', '[]', 10, 0, 'new', '{}', '{}', null),
                 ('variant', 'unit', '類題', 'basic', 'p', '[]', 10, 1, 'new', '{}', '{}', 'task'),
                 ('stale', 'unit', '古い版', 'basic', 'p', '[]', 10, 2, 'new', '{}', '{}', null);
        insert into task_progress (user_id, task_id, status, content_hash, updated_at)
          values ('taken', 'task', 'passed', 'old', 80),
                 ('taken', 'stale', 'local-passed', 'old', 80);
        insert into task_local_runs
          (user_id, task_id, tenant_id, content_hash, failure_streak, last_outcome, first_run_at, last_run_at)
          values ('taken', 'stale', 'ses', 'new', 3, 'failed', 4, 7);
        insert into task_help_opens
          (tenant_id, user_id, task_id, item, level, content_hash, private_hash, opened_at)
          values ('ses', 'taken', 'task', 'hint', 1, 'old', 'private', 40);
        insert into study_activity
          (id, tenant_id, user_id, date, watched_sec, completed_lessons, created_at, updated_at)
          values ('today', 'ses', 'taken', '2026-11-28', 120, 0, 1, 1),
                 ('yesterday', 'ses', 'taken', '2026-11-27', 0, 1, 1, 1),
                 ('first', 'ses', 'taken', '2026-11-01', 10, 0, 1, 1),
                 ('old', 'ses', 'taken', '2026-10-31', 10, 0, 1, 1),
                 ('zero', 'ses', 'taken', '2026-11-26', 0, 0, 1, 1),
                 ('future', 'ses', 'taken', '2026-11-29', 900, 0, 1, 1);
        insert into submissions
          (id, tenant_id, student_id, stage_title, assignment_title, code, submitted_at, task_id,
           task_content_hash, status, verdict, ai_review_status)
          values ('pass', 'ses', 'taken', 'フォーカス', '課題', 'SECRET_CODE', 50, 'task',
                    'old', 'passed', 'pass', 'human'),
                 ('legacy', 'ses', 'taken', '旧ステージ', '旧課題', '', 60, null, null, 'pending', null, null),
                 ('escalated', 'ses', 'taken', '学習', '課題', '', 61, null, null, 'pending', null, 'escalated'),
                 ('ai', 'ses', 'taken', '学習', '課題', '', 62, null, null, 'pending', null, 'queued'),
                 ('replaced', 'ses', 'taken', '学習', '課題', '', 63, null, null, 'pending', null, 'superseded');
        insert into notifications (id, user_id, tenant_id, type, title, body, payload, created_at)
          values ('stumble-old', 'admin', 'ses', 'learner_stumble', '古い通知', '以前の本文',
                    '{"learner_id":"taken","signal":"local-failures"}', ${now - 2}),
                 ('stumble-latest', 'admin', 'ses', 'learner_stumble', '新しい通知', '最新の本文',
                    '{"learner_id":"taken","signal":"local-failures"}', ${now - 1}),
                 ('stumble-duplicate', 'taken', 'ses', 'learner_stumble', '新しい通知', '最新の本文',
                    '{"learner_id":"taken","signal":"local-failures"}', ${now - 1}),
                 ('stumble-expired', 'admin', 'ses', 'learner_stumble', '期間外', '期間外',
                    '{"learner_id":"taken","signal":"idle"}', ${now - 14 * 86_400_000 - 1});
        insert into mentor_memos
          (id, tenant_id, learner_id, week_start, state, summary, next_attempt_at, created_at)
          values ('memo1', 'ses', 'taken', '2026-11-09', 'ready', '前の週', 1, 1),
                 ('memo2', 'ses', 'taken', '2026-11-16', 'ready', '最新のメモ', 2, 2);
      `);

      const list = await fetchAdmin(overview);
      expect(list.status).toBe(200);
      expect(await json(list)).toMatchObject({
        rows: [
          { user_id: "admin", pending_reviews: 0, stumble_signals: [] },
          {
            user_id: "taken",
            level: { level: 3, xp_total: 270, xp_into_level: 20, xp_to_next_level: 200 },
            current_stage: { stage_id: "focus", title: "フォーカス", progress_percent: 33 },
            days: [
              { date: "2026-11-01", watched_sec: 10, completed_lessons: 0 },
              { date: "2026-11-27", watched_sec: 0, completed_lessons: 1 },
              { date: "2026-11-28", watched_sec: 120, completed_lessons: 0 },
            ],
            last_study_date: "2026-11-28",
            streak_current: 2,
            pending_reviews: 2,
            stumble_signals: ["local-failures"],
            status: { kind: "stumble" },
          },
        ],
      });

      const res = await fetchAdmin(detail);
      expect(res.status).toBe(200);
      const response = await json(res);
      expect(response).toMatchObject({
        profile: {
          id: "taken",
          display_name: "別",
          role: "student",
          groups: [{ id: "group", name: "組" }],
          vscode_connected_at: new Date(30).toISOString(),
          last_login_at: new Date(20).toISOString(),
        },
        level: {
          xp: {
            total: 270,
            from_lessons: 10,
            from_stages: 200,
            from_quizzes: 30,
            from_discoveries: 30,
          },
          level: { level: 3 },
        },
        streak: { current: 2, longest: 2 },
        active_days_28: 3,
        active_days_84: 4,
        stages: [
          { stage_id: "focus", status: "in_progress", progress_percent: 33 },
          { stage_id: "recent", status: "in_progress", progress_percent: 100 },
          { stage_id: "done", status: "completed", completed_at: new Date(50).toISOString() },
        ],
        current_stage: "focus",
        current_stage_tasks: [
          {
            task_id: "task",
            unit_title: "単元",
            state: "passed",
            assisted: true,
            local_failure_streak: 0,
          },
          { task_id: "stale", state: "not-started", assisted: false, local_failure_streak: 3 },
        ],
        concerns: [
          {
            signal: "local-failures",
            title: "新しい通知",
            body: "最新の本文",
            created_at: new Date(now - 1).toISOString(),
          },
        ],
        mentor_memo: { id: "memo2", weekStart: "2026-11-16", summary: "最新のメモ" },
        status: { kind: "stumble" },
      });
      expect(JSON.stringify(response)).not.toMatch(/SECRET_CODE|private-token|private-code/);

      db.sqlite.exec("update stages set format = 2, status = 'published' where id = 'focus'");
      const studentToken = await signAccessToken(SECRET, "taken", "taken@example.test");
      const mine = await request(app, env, "/api/skill-profile/mine", { token: studentToken });
      expect(mine.status).toBe(200);
      const { skill_profile } = await json<{
        skill_profile: { xp: unknown; level: unknown; generated_at: string };
      }>(mine);
      expect(response).toMatchObject({
        level: {
          ...skill_profile,
          streak: { current: 2, longest: 2, today: "2026-11-28" },
        },
      });

      const stageTasks = await request(app, env, "/api/tasks/for-stage/focus", {
        token: studentToken,
      });
      expect(stageTasks.status).toBe(200);
      const { tasks } = await json<{ tasks: { id: string; status: string }[] }>(stageTasks);
      expect(response).toMatchObject({
        current_stage_tasks: tasks.map(({ id, status }) => ({ task_id: id, state: status })),
      });

      db.sqlite.exec("update learner_focus set active_stage_id = 'done' where user_id = 'taken'");
      expect(await json(await fetchAdmin(detail))).toMatchObject({
        current_stage: "recent",
        current_stage_tasks: [],
      });
    });
  });

  describe("GET /api/admin/users/:userId/activity-hours", () => {
    const path = "/api/admin/users/taken/activity-hours";

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-11-27T15:00:00Z"));
    });

    it("受講者は参照できない", async () => {
      const studentToken = await signAccessToken(SECRET, "taken", "taken@example.test");
      const res = await request(app, env, path, { token: studentToken });
      expect(res.status).toBe(403);
    });

    it("存在しないユーザーは 404", async () => {
      const res = await request(app, env, "/api/admin/users/missing/activity-hours", {
        token: await token(),
      });
      expect(res.status).toBe(404);
    });

    it.each(["", "8", "04", "12.0"])("weeks=%s は 400", async (weeks) => {
      const res = await request(app, env, `${path}?weeks=${weeks}`, { token: await token() });
      expect(res.status).toBe(400);
    });

    it.each([
      [4, "2026-11-01"],
      [26, "2026-05-31"],
    ])("weeks=%s の空の集計を返す", async (weeks, from) => {
      const res = await request(app, env, `${path}?weeks=${weeks}`, { token: await token() });
      expect(res.status).toBe(200);
      expect(await json(res)).toEqual({
        weeks,
        from,
        to: "2026-11-28",
        cells: [],
        weekday_totals: Array(7).fill(0),
        hour_totals: Array(24).fill(0),
        active_days: 0,
        midnight_days: 0,
        hours_recorded_since: null,
      });
    });

    it("管理者自身の時間帯ログと提出を集計する", async () => {
      const at = Date.parse("2026-11-23T12:00:00Z");
      db.sqlite.exec(`
        insert into study_activity_hours
          (id, tenant_id, user_id, date, hour, watched_sec, completed_lessons, created_at, updated_at)
          values ('hour', 'ses', 'admin', '2026-11-23', 21, 300, 1, 1, 1);
        insert into submissions
          (id, tenant_id, student_id, stage_title, assignment_title, code, submitted_at)
          values ('submit', 'ses', 'admin', 'ステージ', '課題', '', ${at});
      `);
      const res = await request(app, env, "/api/admin/users/admin/activity-hours", {
        token: await token(),
      });
      expect(res.status).toBe(200);
      expect(await json(res)).toMatchObject({
        cells: [
          { weekday: 0, hour: 21, watched_sec: 300, completed_lessons: 1, events: 1, score: 4 },
        ],
        active_days: 1,
        midnight_days: 0,
      });
    });

    it("全ソースを JST の曜日と時で合算し、活動日を重複なしで数える", async () => {
      const monday = Date.parse("2026-11-22T15:00:00Z");
      const firstDay = Date.parse("2026-09-05T15:00:00Z");
      db.sqlite.exec(`
        insert into stages (id, tenant_id, slug, title, created_at, updated_at)
          values ('stage', 'ses', 'test-stage', 'ステージ', 1, 1);
        insert into sections (id, stage_id, title, created_at) values ('unit', 'stage', '単元', 1);
        insert into lessons (id, section_id, title, type, created_at, updated_at)
          values ('lesson', 'unit', 'レッスン', 'quiz', 1, 1);
        insert into quizzes (id, lesson_id, created_at, updated_at) values ('quiz', 'lesson', 1, 1);
        insert into discovery_materials (id, tenant_id, stage_id, title, created_at)
          values ('material', 'ses', 'stage', '教材', 1);
        insert into tasks (id, section_id, title, kind, pattern, skills, estimated_minutes, "order", content_hash, definition, bundle)
          values ('task', 'unit', '課題', 'basic', 'p', '{}', 10, 0, 'hash', '{}', '{}');
        insert into study_activity_hours
          (id, tenant_id, user_id, date, hour, watched_sec, completed_lessons, created_at, updated_at)
        values
          ('a', 'ses', 'taken', '2026-11-23', 0, 100, 1, 1, 1),
          ('b', 'ses', 'taken', '2026-11-16', 0, 150, 1, 1, 1),
          ('zero', 'ses', 'taken', '2026-11-17', 1, 0, 0, 1, 1),
          ('other', 'ses', 'admin', '2026-08-01', 0, 999, 9, 1, 1);
        insert into quiz_attempts (id, tenant_id, quiz_id, user_id, score, max_score, passed, submitted_at)
        values
          ('monday', 'ses', 'quiz', 'taken', 1, 1, 1, ${monday}),
          ('first', 'ses', 'quiz', 'taken', 1, 1, 1, ${firstDay}),
          ('before', 'ses', 'quiz', 'taken', 1, 1, 1, ${firstDay - 1}),
          ('other', 'ses', 'quiz', 'admin', 1, 1, 1, ${monday});
        insert into discovery_attempts
          (id, tenant_id, user_id, material_id, score, max_score, percent, passed, submitted_at)
          values ('discovery', 'ses', 'taken', 'material', 1, 1, 100, 1, ${monday + 3 * 3_600_000});
        insert into submissions
          (id, tenant_id, student_id, stage_title, assignment_title, code, submitted_at, review_source)
        values
          ('submit', 'ses', 'taken', 'ステージ', '課題', '', ${Date.parse("2026-11-27T19:00:00Z")}, null),
          ('after', 'ses', 'taken', 'ステージ', '課題', '', ${Date.parse("2026-11-28T15:00:00Z")}, null),
          ('manual', 'ses', 'taken', 'ステージ', '課題', '', ${monday}, 'manual');
        insert into task_help_opens
          (tenant_id, user_id, task_id, item, level, content_hash, private_hash, opened_at)
          values ('ses', 'taken', 'task', 'hint', 1, 'hash', 'private', ${monday});
      `);

      const res = await request(app, env, path, { token: await token() });
      expect(res.status).toBe(200);
      expect(await json(res)).toEqual({
        weeks: 12,
        from: "2026-09-06",
        to: "2026-11-28",
        cells: [
          { weekday: 0, hour: 0, watched_sec: 250, completed_lessons: 2, events: 2, score: 7 },
          { weekday: 0, hour: 3, watched_sec: 0, completed_lessons: 0, events: 1, score: 1 },
          { weekday: 5, hour: 4, watched_sec: 0, completed_lessons: 0, events: 1, score: 1 },
          { weekday: 6, hour: 0, watched_sec: 0, completed_lessons: 0, events: 1, score: 1 },
        ],
        weekday_totals: [8, 0, 0, 0, 0, 1, 1],
        hour_totals: [8, 0, 0, 1, 1, ...Array(19).fill(0)],
        active_days: 4,
        midnight_days: 3,
        hours_recorded_since: "2026-08-01",
      });
    });
  });

  it("招待前にログインした人のGoogle画像をプロフィールに保存し、ユーザー一覧に返す", async () => {
    const image = "https://lh3.googleusercontent.com/a/avatar";
    const insert = db.sqlite.prepare(
      "INSERT INTO auth_users (id, email, image, created_at) VALUES (?, ?, ?, 1)",
    );
    insert.run("early", "early@example.test", image);
    insert.run("other", "other@example.test", "https://example.test/avatar");
    const adminToken = await token();
    const invite = await request(app, env, "/api/admin/users/invite", {
      method: "POST",
      token: adminToken,
      body: JSON.stringify({
        invites: [
          { email: "early@example.test", displayName: "受講者A", role: "student" },
          { email: "other@example.test", displayName: "受講者B", role: "student" },
        ],
      }),
    });
    expect(invite.status).toBe(200);
    const list = await request(app, env, "/api/admin/users", { token: adminToken });
    const { rows } = await json<{ rows: { id: string; avatar_url: string | null }[] }>(list);
    expect(rows.find((row) => row.id === "early")?.avatar_url).toBe(image);
    expect(rows.find((row) => row.id === "other")?.avatar_url).toBeNull();
  });

  it("招待するとロールが保存され、受講登録は作られない", async () => {
    const res = await request(app, env, "/api/admin/users/invite", {
      method: "POST",
      token: await token(),
      body: JSON.stringify({
        invites: [{ email: "new@example.test", displayName: "新規", role: "student" }],
      }),
    });
    expect(res.status).toBe(200);
    const body = await json<{ results: { email: string; ok: boolean; userId?: string }[] }>(res);
    expect(body.results).toEqual([
      { email: "new@example.test", ok: true, userId: body.results[0]?.userId },
    ]);
    const row = db.sqlite
      .prepare("select role from profiles where email = ?")
      .get("new@example.test") as { role: string };
    expect(row).toEqual({ role: "student" });
    expect(
      db.sqlite.prepare("select count(*) as n from enrollments").get() as { n: number },
    ).toEqual({ n: 0 });
  });

  it("登録済みのメールは同じ文言で拒む", async () => {
    const res = await request(app, env, "/api/admin/users/invite", {
      method: "POST",
      token: await token(),
      body: JSON.stringify({
        invites: [{ email: "taken@example.test", displayName: "別", role: "student" }],
      }),
    });
    const body = await json<{ results: { email: string; ok: boolean; error?: string }[] }>(res);
    expect(body.results).toEqual([
      {
        email: "taken@example.test",
        ok: false,
        error: "このメールアドレスは既に登録されています",
      },
    ]);
    expect(JSON.stringify(body)).not.toContain("別のテナント");
  });

  it("廃止した講師ロールは招待も変更も受け付けない", async () => {
    const invite = await request(app, env, "/api/admin/users/invite", {
      method: "POST",
      token: await token(),
      body: JSON.stringify({
        invites: [{ email: "new@example.test", displayName: "新規", role: "instructor" }],
      }),
    });
    expect(invite.status).toBe(400);

    const change = await request(app, env, "/api/admin/users/role", {
      method: "POST",
      token: await token(),
      body: JSON.stringify({ userId: "taken", role: "instructor" }),
    });
    expect(change.status).toBe(400);
    const row = db.sqlite.prepare("select role from profiles where id = ?").get("taken") as {
      role: string;
    };
    expect(row).toEqual({ role: "student" });
  });

  it("管理者は別の管理者を無効化し、受講者に変更できる", async () => {
    db.sqlite.prepare("UPDATE profiles SET role = 'admin' WHERE id = ?").run("taken");
    const adminToken = await token();
    const target = db.sqlite.prepare("SELECT role, disabled FROM profiles WHERE id = ?");

    const disable = await request(app, env, "/api/admin/users/disable", {
      method: "POST",
      token: adminToken,
      body: JSON.stringify({ userId: "taken", disabled: true }),
    });
    expect(disable.status).toBe(200);
    expect(target.get("taken")).toEqual({ role: "admin", disabled: 1 });

    const change = await request(app, env, "/api/admin/users/role", {
      method: "POST",
      token: adminToken,
      body: JSON.stringify({ userId: "taken", role: "student" }),
    });
    expect(change.status).toBe(200);
    expect(target.get("taken")).toEqual({ role: "student", disabled: 1 });
  });

  it.each([
    { operation: "降格", changes: { role: "student" } },
    { operation: "無効化", changes: { disabled: true } },
  ] as const)(
    "互いを$operation すると後続の更新を拒否し、有効な管理者が1人残る",
    async ({ changes }) => {
      db.sqlite.prepare("UPDATE profiles SET role = 'admin' WHERE id = ?").run("taken");
      const drizzle = getDb(env);
      const profile = db.sqlite.prepare("SELECT role, disabled FROM profiles WHERE id = ?");

      expect(await updateProfileAsAdmin(drizzle, "admin", "taken", changes)).toBe(true);
      expect(await updateProfileAsAdmin(drizzle, "taken", "admin", changes)).toBe(false);
      expect(profile.get("admin")).toEqual({ role: "admin", disabled: 0 });
      expect(
        db.sqlite.prepare("SELECT id FROM profiles WHERE role = 'admin' AND disabled = 0").all(),
      ).toEqual([{ id: "admin" }]);
    },
  );

  it.each([
    {
      path: "role",
      changes: { role: "admin" },
      revoke: "UPDATE profiles SET disabled = 1 WHERE id = 'admin'",
    },
    {
      path: "disable",
      changes: { disabled: true },
      revoke: "UPDATE profiles SET role = 'student' WHERE id = 'admin'",
    },
  ])(
    "$path の書き込み直前に権限を失うと 409 を返し、対象と監査ログはそのまま",
    async ({ path, changes, revoke }) => {
      const auditCount = db.sqlite.prepare("SELECT count(*) AS n FROM audit_logs");
      const before = auditCount.get();
      const prepare = db.binding.prepare.bind(db.binding);
      db.binding.prepare = (sql) => {
        // 認可と対象の確認を通ったあと、UPDATE の直前に別の操作が完了した状態を作る。
        if (/^update "profiles"/i.test(sql)) db.sqlite.exec(revoke);
        return prepare(sql);
      };
      const res = await request(app, env, `/api/admin/users/${path}`, {
        method: "POST",
        token: await token(),
        body: JSON.stringify({ userId: "taken", ...changes }),
      });
      expect(res.status).toBe(409);
      expect(await json(res)).toEqual({
        error: "権限が変わったため、操作できませんでした。画面を読み込み直してください",
      });
      expect(
        db.sqlite.prepare("SELECT role, disabled FROM profiles WHERE id = ?").get("taken"),
      ).toEqual({ role: "student", disabled: 0 });
      expect(auditCount.get()).toEqual(before);
    },
  );

  it("存在しないユーザーは 404", async () => {
    const res = await request(app, env, "/api/admin/users/disable", {
      method: "POST",
      token: await token(),
      body: JSON.stringify({ userId: "missing", disabled: true }),
    });
    expect(res.status).toBe(404);
  });
});

const SECRET = "admin-delete-test-secret";
const ADMIN = "33333333-3333-4333-8333-333333333333";
const INSTRUCTOR = "44444444-4444-4444-8444-444444444444";
const LEARNER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const SUB_A = "sub-learner-a";
const SUB_B = "sub-learner-b";
const SUB_OTHER = "sub-other";
const AI_REVIEW = "ai-review-learner";
const MISSING = "00000000-0000-4000-8000-000000000000";

describe("受講者の削除 (POST /api/admin/users/delete、実 SQLite)", () => {
  let database: ReturnType<typeof sqliteD1>;
  let env: Env;
  let app: ReturnType<typeof mountTestApp>["app"];

  function run(query: string, ...params: (string | number | null)[]) {
    database.sqlite.prepare(query).run(...params);
  }

  function countRows(query: string, ...params: string[]): number {
    const row = database.sqlite.prepare(query).get(...params) as { n: number };
    return Number(row.n);
  }

  function seed() {
    run(
      `INSERT INTO tenants
        (id, name, active_count, active, test_mode, created_at, updated_at)
       VALUES (?, ?, 0, 1, 0, 1, 1)`,
      "ses",
      "SES",
    );
    const profile = `INSERT INTO profiles
      (id, tenant_id, role, display_name, email, disabled, created_at)
     VALUES (?, ?, ?, ?, ?, 0, 1)`;
    run(profile, ADMIN, "ses", "admin", "管理者", "admin@example.com");
    run(profile, INSTRUCTOR, "ses", "admin", "講師", "staff@example.com");
    run(profile, LEARNER, "ses", "student", "受講者太郎", "Learner@Example.com");
    run(profile, OTHER, "ses", "student", "別の受講者", "other@example.com");

    const authUser = `INSERT INTO auth_users
      (id, email, name, email_verified, created_at, updated_at)
     VALUES (?, ?, ?, 1, 1, 1)`;
    run(authUser, LEARNER, "auth-learner@example.com", "受講者太郎");
    run(authUser, OTHER, "auth-other@example.com", "別の受講者");
    const session = `INSERT INTO auth_sessions
      (id, user_id, token, expires_at, created_at, updated_at)
     VALUES (?, ?, ?, 1, 1, 1)`;
    run(session, "sess-learner", LEARNER, "tok-learner");
    run(session, "sess-other", OTHER, "tok-other");
    const account = `INSERT INTO auth_accounts
      (id, user_id, account_id, provider_id, created_at, updated_at)
     VALUES (?, ?, ?, 'google', 1, 1)`;
    run(account, "acct-learner", LEARNER, "google-learner");
    run(account, "acct-other", OTHER, "google-other");

    run("INSERT INTO skills (id, title) VALUES ('html', 'HTML')");
    const submission = `INSERT INTO submissions
      (id, tenant_id, student_id, stage_title, assignment_title, code, submitted_at)
     VALUES (?, 'ses', ?, 'ステージ', '課題', 'code', 1)`;
    run(submission, SUB_A, LEARNER);
    run(submission, SUB_B, LEARNER);
    run(submission, SUB_OTHER, OTHER);
    const file = `INSERT INTO submission_files
      (submission_id, path, object_key, sha256, bytes)
     VALUES (?, 'index.html', ?, 'abc', 1)`;
    run(file, SUB_A, "objects/learner");
    run(file, SUB_OTHER, "objects/other");
    run(
      `INSERT INTO submission_reviews
        (id, submission_id, source, verdict, notes, created_at)
       VALUES ('rev-learner', ?, 'human', 'pass', 'ok', 1)`,
      SUB_A,
    );
    run(
      `INSERT INTO ai_review_jobs
        (submission_id, tenant_id, state, attempts, next_attempt_at, enqueued_at)
       VALUES (?, 'ses', 'queued', 0, 1, 1)`,
      SUB_A,
    );
    run(
      `INSERT INTO ai_reviews (
        id, submission_id, tenant_id, task_id, task_content_hash, task_kind,
        outcome, prompt_version, threshold_version, created_at
      ) VALUES (?, ?, 'ses', 'task', 'hash', 'html', 'confirmed', 'p', 't', 1)`,
      AI_REVIEW,
      SUB_A,
    );
    run(
      `INSERT INTO submission_checks
        (id, tenant_id, submission_id, ai_review_id, reviewer_id, result, created_at)
       VALUES ('check-learner', 'ses', ?, ?, ?, 'confirmed', 1)`,
      SUB_A,
      AI_REVIEW,
      INSTRUCTOR,
    );
    run(
      `INSERT INTO ai_review_overrides (
        id, tenant_id, submission_id, ai_review_id, source,
        ai_verdict, human_verdict, reviewer_id, created_at
      ) VALUES ('over-learner', 'ses', ?, ?, 'post-check', 'pass', 'resubmit', ?, 1)`,
      SUB_A,
      AI_REVIEW,
      INSTRUCTOR,
    );
    const evidence = `INSERT INTO skill_evidence
      (id, tenant_id, user_id, skill_id, level, submission_id, assisted, created_at)
     VALUES (?, 'ses', ?, 'html', 'independent', ?, 0, 1)`;
    run(evidence, "ev-learner", LEARNER, SUB_A);
    run(evidence, "ev-other", OTHER, SUB_OTHER);

    const note = `INSERT INTO notifications
      (id, user_id, tenant_id, type, title, payload, created_at)
     VALUES (?, ?, 'ses', 'learner_stumble', ?, ?, 1)`;
    run(note, "note-own", LEARNER, "自分宛", "{}");
    run(note, "note-payload", INSTRUCTOR, "つまずき", `{"userId":"${LEARNER}"}`);
    run(note, "note-title", INSTRUCTOR, `つまずき ${LEARNER}`, "{}");
    run(note, "note-other", INSTRUCTOR, "別の人", `{"userId":"${OTHER}"}`);
    run(note, "note-other-own", OTHER, "自分宛", "{}");

    const audit = `INSERT INTO audit_logs (
      id, tenant_id, actor_id, actor_name, actor_role, action,
      target_type, target_id, metadata, created_at
    ) VALUES (?, 'ses', ?, ?, ?, ?, ?, ?, ?, 1)`;
    run(
      audit,
      "audit-invite",
      ADMIN,
      "管理者",
      "admin",
      "user_invite",
      "user",
      LEARNER,
      '{"email":"Learner@Example.com","role":"student"}',
    );
    run(
      audit,
      "audit-actor",
      LEARNER,
      "受講者太郎",
      "student",
      "login",
      "session",
      "sess-learner",
      '{"email":"Learner@Example.com"}',
    );
    run(
      audit,
      "audit-other",
      OTHER,
      "別の受講者",
      "student",
      "login",
      "session",
      "sess-other",
      '{"email":"other@example.com"}',
    );

    const link = `INSERT INTO auth_vscode_links
      (id, user_id, code_hash, expires_at, created_at)
     VALUES (?, ?, ?, 1, 1)`;
    run(link, "link-learner", LEARNER, "hash-learner");
    run(link, "link-other", OTHER, "hash-other");
    const inquiry = `INSERT INTO support_inquiries
      (id, email, message, user_id, created_at)
     VALUES (?, ?, ?, ?, 1)`;
    run(inquiry, "inq-learner", "Learner@Example.com", "助けて", LEARNER);
    run(inquiry, "inq-other", "other@example.com", "別件", OTHER);
    run(
      `INSERT INTO support_inquiries (id, email, message, created_at)
       VALUES ('inq-anon', 'anon@example.com', '公開', 1)`,
    );
  }

  beforeEach(() => {
    database = sqliteD1();
    seed();
    env = { DB: database.binding, AUTH_JWT_SECRET: SECRET } as Env;
    app = mountTestApp(env, adminRoute).app;
  });
  afterEach(() => database.sqlite.close());

  async function remove(body: unknown, as = ADMIN) {
    return request(app, env, "/api/admin/users/delete", {
      method: "POST",
      token: await signAccessToken(SECRET, as, "caller@example.test"),
      body: JSON.stringify(body),
    });
  }

  function expectNotDeleted() {
    expect(countRows("SELECT count(*) AS n FROM profiles WHERE id = ?", LEARNER)).toBe(1);
    expect(countRows("SELECT count(*) AS n FROM submissions WHERE student_id = ?", LEARNER)).toBe(
      2,
    );
    expect(countRows("SELECT count(*) AS n FROM audit_logs WHERE action = 'user_delete'")).toBe(0);
    expect(countRows("SELECT count(*) AS n FROM profiles WHERE id = ?", OTHER)).toBe(1);
    expect(countRows("SELECT count(*) AS n FROM submissions WHERE student_id = ?", OTHER)).toBe(1);
  }

  async function expectRejected(body: unknown, status: number, message: string, as = ADMIN) {
    const res = await remove(body, as);
    expect(res.status).toBe(status);
    expect(await json<{ error: string }>(res)).toEqual({ error: message });
    expectNotDeleted();
  }

  it("受講者を消すと動画コメント・メンション・投稿記録と、消えたスレッドや返信の通知が消える", async () => {
    run(`INSERT INTO stages (id, tenant_id, slug, title, status, created_at, updated_at)
      VALUES ('video-stage', 'ses', 'video-stage', '動画ステージ', 'published', 1, 1)`);
    run(`INSERT INTO sections (id, stage_id, title, "order", created_at)
      VALUES ('video-section', 'video-stage', '単元', 0, 1)`);
    run(`INSERT INTO lessons (id, section_id, title, type, video_path, created_at, updated_at)
      VALUES ('video', 'video-section', '動画', 'video', 'video.mp4', 1, 1)`);
    const comment = `INSERT INTO lesson_comments (id, lesson_id, user_id, parent_id, body, created_at)
      VALUES (?, 'video', ?, ?, '本文', 1)`;
    run(comment, "learner-root", LEARNER, null);
    run(comment, "third-reply", ADMIN, "learner-root");
    run(comment, "cascaded-reply", OTHER, "learner-root");
    run(comment, "other-root", OTHER, null);
    run(comment, "learner-reply", LEARNER, "other-root");
    run(comment, "retained-reply", OTHER, "other-root");
    const mention = "INSERT INTO lesson_comment_mentions (comment_id, user_id) VALUES (?, ?)";
    run(mention, "learner-reply", OTHER);
    run(mention, "retained-reply", LEARNER);
    run(mention, "retained-reply", ADMIN);
    const record = "INSERT INTO lesson_comment_posts (id, user_id, created_at) VALUES (?, ?, 1)";
    run(record, "learner-post", LEARNER);
    run(record, "other-post", OTHER);
    const notification = `INSERT INTO notifications
      (id, user_id, tenant_id, type, title, payload, created_at) VALUES (?, ?, 'ses', ?, '通知', ?, 1)`;
    run(
      notification,
      "comment-note",
      ADMIN,
      "lesson_comment",
      JSON.stringify({ from_id: LEARNER, comment_id: "learner-root" }),
    );
    run(
      notification,
      "cascaded-note",
      ADMIN,
      "lesson_comment_reply",
      JSON.stringify({ from_id: OTHER, thread_id: "learner-root", comment_id: "cascaded-reply" }),
    );
    run(
      notification,
      "reply-note",
      ADMIN,
      "lesson_comment_mention",
      JSON.stringify({ thread_id: "other-root", comment_id: "learner-reply" }),
    );
    run(notification, "invalid-note", ADMIN, "lesson_comment_reply", "{");
    run(
      notification,
      "unrelated-note",
      ADMIN,
      "announcement",
      JSON.stringify({ thread_id: "learner-root" }),
    );
    expect(countRows("SELECT count(*) AS n FROM notifications WHERE id = ?", "cascaded-note")).toBe(
      1,
    );

    const res = await remove({ userId: LEARNER, confirmEmail: "learner@example.com" });
    expect(res.status).toBe(200);
    expect(database.sqlite.prepare("SELECT id FROM lesson_comments ORDER BY id").all()).toEqual([
      { id: "other-root" },
      { id: "retained-reply" },
    ]);
    expect(
      database.sqlite.prepare("SELECT comment_id, user_id FROM lesson_comment_mentions").all(),
    ).toEqual([{ comment_id: "retained-reply", user_id: ADMIN }]);
    for (const id of ["comment-note", "cascaded-note", "reply-note"]) {
      expect(countRows("SELECT count(*) AS n FROM notifications WHERE id = ?", id)).toBe(0);
    }
    for (const id of ["invalid-note", "unrelated-note"]) {
      expect(countRows("SELECT count(*) AS n FROM notifications WHERE id = ?", id)).toBe(1);
    }
    expect(database.sqlite.prepare("SELECT id FROM lesson_comment_posts").all()).toEqual([
      { id: "other-post" },
    ]);
  });

  it("受講者を消すと提出・接続・認証が消え、監査の個人情報だけ外れる", async () => {
    const activityHour = `INSERT INTO study_activity_hours
      (id, tenant_id, user_id, date, hour, watched_sec, created_at, updated_at)
      VALUES (?, 'ses', ?, '2026-11-28', 10, 300, 1, 1)`;
    const countActivityHours = "SELECT count(*) AS n FROM study_activity_hours WHERE user_id = ?";
    run(activityHour, "hour-learner", LEARNER);
    run(activityHour, "hour-other", OTHER);
    const res = await remove({
      userId: LEARNER,
      confirmEmail: "  learner@example.com ",
    });
    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({
      ok: true,
      deleted: { submissions: 2 },
    });

    expect(countRows("SELECT count(*) AS n FROM profiles WHERE id = ?", LEARNER)).toBe(0);
    expect(countRows(countActivityHours, LEARNER)).toBe(0);
    expect(countRows(countActivityHours, OTHER)).toBe(1);
    expect(countRows("SELECT count(*) AS n FROM auth_users WHERE id = ?", LEARNER)).toBe(0);
    expect(countRows("SELECT count(*) AS n FROM auth_sessions WHERE user_id = ?", LEARNER)).toBe(0);
    expect(countRows("SELECT count(*) AS n FROM auth_accounts WHERE user_id = ?", LEARNER)).toBe(0);
    expect(countRows("SELECT count(*) AS n FROM submissions WHERE student_id = ?", LEARNER)).toBe(
      0,
    );
    expect(
      countRows("SELECT count(*) AS n FROM submission_files WHERE submission_id = ?", SUB_A),
    ).toBe(0);
    expect(
      countRows("SELECT count(*) AS n FROM submission_reviews WHERE submission_id = ?", SUB_A),
    ).toBe(0);
    expect(
      countRows("SELECT count(*) AS n FROM ai_review_jobs WHERE submission_id = ?", SUB_A),
    ).toBe(0);
    expect(countRows("SELECT count(*) AS n FROM ai_reviews WHERE submission_id = ?", SUB_A)).toBe(
      0,
    );
    expect(
      countRows("SELECT count(*) AS n FROM submission_checks WHERE submission_id = ?", SUB_A),
    ).toBe(0);
    expect(
      countRows("SELECT count(*) AS n FROM ai_review_overrides WHERE submission_id = ?", SUB_A),
    ).toBe(0);
    expect(countRows("SELECT count(*) AS n FROM skill_evidence WHERE user_id = ?", LEARNER)).toBe(
      0,
    );
    expect(
      countRows("SELECT count(*) AS n FROM auth_vscode_links WHERE user_id = ?", LEARNER),
    ).toBe(0);
    expect(
      countRows("SELECT count(*) AS n FROM support_inquiries WHERE user_id = ?", LEARNER),
    ).toBe(0);
    expect(countRows("SELECT count(*) AS n FROM notifications WHERE id = ?", "note-own")).toBe(0);
    expect(countRows("SELECT count(*) AS n FROM notifications WHERE id = ?", "note-payload")).toBe(
      0,
    );

    const keptTitle = database.sqlite
      .prepare("SELECT title, payload FROM notifications WHERE id = 'note-title'")
      .get() as { title: string; payload: string };
    expect(keptTitle.title).toContain(LEARNER);
    expect(keptTitle.payload).toBe("{}");

    const invite = database.sqlite
      .prepare("SELECT actor_name, action, metadata FROM audit_logs WHERE id = 'audit-invite'")
      .get() as { actor_name: string; action: string; metadata: string };
    expect(invite.action).toBe("user_invite");
    expect(invite.actor_name).toBe("管理者");
    expect(JSON.parse(invite.metadata)).toEqual({});
    const acted = database.sqlite
      .prepare(
        "SELECT actor_id, actor_name, action, metadata FROM audit_logs WHERE id = 'audit-actor'",
      )
      .get() as { actor_id: string; actor_name: string; action: string; metadata: string };
    expect(acted.actor_id).toBe(LEARNER);
    expect(acted.action).toBe("login");
    expect(acted.actor_name).toBe("削除したユーザー");
    expect(JSON.parse(acted.metadata)).toEqual({});

    const logged = database.sqlite
      .prepare(
        `SELECT actor_id, actor_name, target_type, target_id, metadata
         FROM audit_logs WHERE action = 'user_delete'`,
      )
      .get() as {
      actor_id: string;
      actor_name: string;
      target_type: string;
      target_id: string;
      metadata: string;
    };
    expect(logged.actor_id).toBe(ADMIN);
    expect(logged.actor_name).toBe("管理者");
    expect(logged.target_type).toBe("user");
    expect(logged.target_id).toBe(LEARNER);
    expect(JSON.parse(logged.metadata)).toEqual({ submissions: 2 });
    expect(logged.metadata).not.toContain("Learner@Example.com");
    expect(logged.metadata).not.toContain("受講者太郎");
    expect(logged.actor_name).not.toContain("受講者太郎");

    expect(countRows("SELECT count(*) AS n FROM profiles WHERE id = ?", OTHER)).toBe(1);
    expect(countRows("SELECT count(*) AS n FROM auth_users WHERE id = ?", OTHER)).toBe(1);
    expect(countRows("SELECT count(*) AS n FROM auth_sessions WHERE user_id = ?", OTHER)).toBe(1);
    expect(countRows("SELECT count(*) AS n FROM auth_accounts WHERE user_id = ?", OTHER)).toBe(1);
    expect(countRows("SELECT count(*) AS n FROM submissions WHERE id = ?", SUB_OTHER)).toBe(1);
    expect(
      countRows("SELECT count(*) AS n FROM submission_files WHERE submission_id = ?", SUB_OTHER),
    ).toBe(1);
    expect(countRows("SELECT count(*) AS n FROM skill_evidence WHERE id = ?", "ev-other")).toBe(1);
    expect(
      countRows("SELECT count(*) AS n FROM auth_vscode_links WHERE id = ?", "link-other"),
    ).toBe(1);
    expect(countRows("SELECT count(*) AS n FROM support_inquiries WHERE id = ?", "inq-other")).toBe(
      1,
    );
    expect(countRows("SELECT count(*) AS n FROM support_inquiries WHERE id = ?", "inq-anon")).toBe(
      1,
    );
    expect(countRows("SELECT count(*) AS n FROM notifications WHERE id = ?", "note-other")).toBe(1);
    expect(
      countRows("SELECT count(*) AS n FROM notifications WHERE id = ?", "note-other-own"),
    ).toBe(1);
    expect(countRows("SELECT count(*) AS n FROM profiles WHERE id = ?", ADMIN)).toBe(1);
    expect(countRows("SELECT count(*) AS n FROM profiles WHERE id = ?", INSTRUCTOR)).toBe(1);
    const otherAudit = database.sqlite
      .prepare("SELECT actor_name, metadata FROM audit_logs WHERE id = 'audit-other'")
      .get() as { actor_name: string; metadata: string };
    expect(otherAudit.actor_name).toBe("別の受講者");
    expect(JSON.parse(otherAudit.metadata)).toEqual({ email: "other@example.com" });
    expect(countRows("SELECT count(*) AS n FROM skills WHERE id = 'html'")).toBe(1);

    const again = await remove({ userId: LEARNER, confirmEmail: "learner@example.com" });
    expect(again.status).toBe(404);
    expect(await json<{ error: string }>(again)).toEqual({
      error: "対象ユーザーが見つかりません",
    });
  });

  it("自分自身は削除できない", async () => {
    await expectRejected(
      { userId: ADMIN, confirmEmail: "admin@example.com" },
      400,
      "自分自身は削除できません",
    );
  });

  it("受講者以外は削除できない", async () => {
    await expectRejected(
      { userId: INSTRUCTOR, confirmEmail: "staff@example.com" },
      400,
      "削除できるのは受講者だけです",
    );
  });

  it("確認のメールが違うと消さない", async () => {
    await expectRejected(
      { userId: LEARNER, confirmEmail: "other@example.com" },
      400,
      "確認のメールアドレスが一致しません",
    );
  });

  it("メールアドレスの無い受講者は確認が空でも消せない", async () => {
    run("UPDATE profiles SET email = NULL WHERE id = ?", LEARNER);
    await expectRejected(
      { userId: LEARNER, confirmEmail: "" },
      400,
      "メールアドレスの無い受講者は削除できません",
    );
  });

  it("一覧に出ない auth_users のメールでは消せない", async () => {
    await expectRejected(
      { userId: LEARNER, confirmEmail: "auth-learner@example.com" },
      400,
      "確認のメールアドレスが一致しません",
    );
  });

  it("userId が無いと 400", async () => {
    await expectRejected({}, 400, "userId は必須です");
    await expectRejected({ userId: 1 }, 400, "userId は必須です");
  });

  it("存在しないユーザーは 404", async () => {
    await expectRejected(
      { userId: MISSING, confirmEmail: "nobody@example.com" },
      404,
      "対象ユーザーが見つかりません",
    );
  });

  it("受講者からは削除できない", async () => {
    await expectRejected(
      { userId: OTHER, confirmEmail: "other@example.com" },
      403,
      "権限がありません",
      LEARNER,
    );
  });
});
