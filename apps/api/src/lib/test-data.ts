/**
 * テストモード時のテストデータ投入。
 *
 * テナントの `test_mode` が ON のとき、 ユーザー登録 (招待) の直後に呼ばれ、
 * 新規ユーザーがすぐ画面を確認できる状態を作る:
 *
 *   - student: テナントの published コースへの受講登録 (期限 30 日後 / 必須)
 *              + 最初のレッスンを完了済みにする進捗
 *              + 直近数日の日別学習ログ (週間チャート / ストリークの確認用)
 *              + サンプル提出 (添削待ち 2 件 + 添削済み 1 件)
 *              + サンプル Q&A (未返信 1 件 + 回答済み 1 件)
 *   - instructor / admin: テナントに受講者が居れば、 添削待ち / 未返信 Q&A が
 *              1 件も無いときだけ既存受講者名義でサンプルを補充する
 *              (受講者を先に招待していれば何もしない)
 *   - 全ロール: ウェルカム通知 1 件
 *
 * 招待自体を失敗させないため、 呼び出し側で best-effort (try/catch) にすること。
 */

import { and, asc, eq, inArray } from "drizzle-orm";
import { addStudyDays, toStudyDate } from "@falcon/shared/study/activity";
import type {
  ReviewPriority,
  ReviewSuggestion,
  ReviewVerdict,
  RubricCriterion,
  SubmissionStatus,
} from "@falcon/shared/review/types";
import type { QuestionStatus } from "@falcon/shared/cms/types";

import type { Db } from "../db/client.js";
import {
  courses,
  enrollments,
  lessonProgress,
  lessons,
  notifications,
  profiles,
  questionReplies,
  questions,
  sections,
  studyActivity,
  submissions,
} from "../db/schema.js";

const HOUR_MS = 3_600_000;

const TEST_ENROLLMENT_DUE_DAYS = 30;

/**
 * 日別学習ログのテストデータ (今日を 0 とした「N 日前 → 学習秒数」)。
 * 意図的に 3 日前を空けて、 ストリークが途切れる挙動も確認できるようにしている
 * (この並びだと連続学習は「今日から 3 日」になる)。
 */
const TEST_STUDY_ACTIVITY: ReadonlyArray<{ daysAgo: number; watchedSec: number }> = [
  { daysAgo: 8, watchedSec: 1_800 },
  { daysAgo: 7, watchedSec: 2_700 },
  { daysAgo: 6, watchedSec: 1_200 },
  { daysAgo: 5, watchedSec: 3_600 },
  { daysAgo: 4, watchedSec: 900 },
  { daysAgo: 2, watchedSec: 2_400 },
  { daysAgo: 1, watchedSec: 1_500 },
  { daysAgo: 0, watchedSec: 600 },
];

/** 提出物 / Q&A を紐付けられるレッスンの種別。 */
const ASSIGNMENT_LESSON_TYPES = ["assignment", "code"] as const;

const STAFF_ROLES = ["instructor", "admin", "platform_admin"] as const;

// ---------------------------------------------------------------
// サンプル提出物の雛形
// ---------------------------------------------------------------

/** 時刻は「今から N 時間前」の相対値で持ち、 投入時に Date へ解決する。 */
interface SubmissionTemplate {
  submittedHoursAgo: number;
  reviewedHoursAgo: number | null;
  status: SubmissionStatus;
  priority: ReviewPriority;
  attempt: number;
  aiReady: boolean;
  aiSuggestions: ReviewSuggestion[];
  rubric: RubricCriterion[];
  reviewNotes: string;
  verdict: ReviewVerdict | null;
  code: string;
}

/**
 * 添削待ち 2 件 + 添削済み 1 件。 それぞれ別の画面 / 操作を埋めるために用意している:
 *   1. AI 下書き未生成 … ReviewEditor を開くと `/api/review-draft` が走る (生成経路の確認)
 *   2. AI 下書き生成済み … 指摘とルーブリックが載った状態の ReviewEditor
 *   3. 添削済み … 受講者の添削結果画面 (ReviewResultView) と講師側の履歴
 */
const SUBMISSION_TEMPLATES: readonly SubmissionTemplate[] = [
  {
    submittedHoursAgo: 3,
    reviewedHoursAgo: null,
    status: "pending",
    priority: "high",
    attempt: 1,
    aiReady: false,
    aiSuggestions: [],
    rubric: [],
    reviewNotes: "",
    verdict: null,
    // heuristic 下書きが指摘を返すよう、 `==` / `var` / innerHTML を含めてある。
    code: [
      "const todos = [];",
      "",
      "function addTodo(text) {",
      '  if (text == "") {',
      "    return;",
      "  }",
      "  todos.push({ text: text, done: false });",
      "  render();",
      "}",
      "",
      "function render() {",
      '  var list = document.getElementById("list");',
      '  list.innerHTML = todos.map((t) => "<li>" + t.text + "</li>").join("");',
      "}",
    ].join("\n"),
  },
  {
    submittedHoursAgo: 26,
    reviewedHoursAgo: null,
    status: "pending",
    priority: "normal",
    attempt: 2,
    aiReady: true,
    // line は下の code の行番号と対応させている (2: var / 4: == / 11: innerHTML)。
    aiSuggestions: [
      {
        id: "sample-1",
        line: 2,
        severity: "low",
        category: "ES2015+",
        body: "`var` ではなく `let` / `const` の使用を推奨します。",
        adopted: null,
      },
      {
        id: "sample-2",
        line: 4,
        severity: "med",
        category: "等価演算子",
        body: "`==` ではなく `===` を使うと型変換による予期しない挙動を防げます。",
        adopted: null,
      },
      {
        id: "sample-3",
        line: 11,
        severity: "high",
        category: "XSS脆弱性",
        body:
          "`innerHTML` にユーザー入力を直接挿入すると XSS の危険があります。" +
          "`textContent` やサニタイズを検討してください。",
        adopted: null,
      },
    ],
    rubric: [
      { id: "rb1", name: "機能要件の達成", desc: "仕様どおり動作すること", max: 4, score: 3 },
      { id: "rb2", name: "コード可読性", desc: "命名・構造・一貫性", max: 4, score: 3 },
      { id: "rb3", name: "保守性・設計", desc: "関数分割・責務の分離", max: 4, score: 2 },
      { id: "rb4", name: "セキュリティ配慮", desc: "XSS・入力検証など", max: 4, score: 2 },
    ],
    reviewNotes:
      "コードはおおむね理解できています（AI下書き）。 指摘事項を確認のうえ、 講師の判断で最終採点してください。",
    verdict: null,
    code: [
      "async function loadUsers() {",
      '  var res = await fetch("/api/users");',
      "  const json = await res.json();",
      '  if (json.status == "ok") {',
      "    show(json.items);",
      "  }",
      "}",
      "",
      "function show(items) {",
      '  const el = document.querySelector("#users");',
      '  el.innerHTML = items.map((u) => "<div>" + u.name + "</div>").join("");',
      "}",
    ].join("\n"),
  },
  {
    submittedHoursAgo: 96,
    reviewedHoursAgo: 72,
    status: "passed",
    priority: "low",
    attempt: 1,
    aiReady: true,
    aiSuggestions: [
      {
        id: "sample-4",
        line: 6,
        severity: "low",
        category: "全体",
        body: "空配列の扱いまで考慮できています。 テストケースも書けるとさらに良いです。",
        adopted: true,
      },
    ],
    rubric: [
      { id: "rb1", name: "機能要件の達成", desc: "仕様どおり動作すること", max: 4, score: 4 },
      { id: "rb2", name: "コード可読性", desc: "命名・構造・一貫性", max: 4, score: 4 },
      { id: "rb3", name: "保守性・設計", desc: "関数分割・責務の分離", max: 4, score: 3 },
      { id: "rb4", name: "セキュリティ配慮", desc: "XSS・入力検証など", max: 4, score: 3 },
    ],
    reviewNotes:
      "関数の分割と境界値の扱いが良いです。 このまま次の課題に進んでください。 (テストデータ)",
    verdict: "pass",
    code: [
      "export function sum(numbers) {",
      "  return numbers.reduce((total, n) => total + n, 0);",
      "}",
      "",
      "export function average(numbers) {",
      "  if (numbers.length === 0) return 0;",
      "  return sum(numbers) / numbers.length;",
      "}",
    ].join("\n"),
  },
];

// ---------------------------------------------------------------
// サンプル Q&A の雛形
// ---------------------------------------------------------------

interface QaThreadTemplate {
  hoursAgo: number;
  /** 課題レッスンに紐付けるか (false なら最初のレッスン)。 */
  onAssignmentLesson: boolean;
  status: QuestionStatus;
  title: string;
  body: string;
  replies: ReadonlyArray<{ hoursAgo: number; fromInstructor: boolean; body: string }>;
}

/** 未返信 1 件 (講師の未返信キュー用) + 回答済み 1 件 (受講者のスレッド表示用)。 */
const QA_TEMPLATES: readonly QaThreadTemplate[] = [
  {
    hoursAgo: 5,
    onAssignmentLesson: true,
    status: "open",
    title: "課題のテストが 1 件だけ失敗します",
    body:
      "課題を提出する前にテストを実行したところ、 空文字を渡すケースだけ失敗してしまいます。" +
      " 入力チェックはどこで行うのが定石でしょうか。 (テストデータ)",
    replies: [],
  },
  {
    hoursAgo: 50,
    onAssignmentLesson: false,
    status: "answered",
    title: "動画の再生位置が引き継がれません",
    body:
      "レッスン動画を途中で閉じて開き直すと、 最初から再生されることがあります。" +
      " 再開位置はどの操作で保存されますか。 (テストデータ)",
    replies: [
      {
        hoursAgo: 48,
        fromInstructor: true,
        body:
          "再開位置は再生を止めたタイミングで保存されます。 タブを閉じる直前に一時停止すると確実です。" +
          " それでも戻る場合は、 ブラウザのプライベートウィンドウを使っていないかご確認ください。",
      },
      {
        hoursAgo: 47,
        fromInstructor: false,
        body: "ありがとうございます。 一時停止してから閉じたら再開できました。",
      },
    ],
  },
];

// ---------------------------------------------------------------

export interface TestDataTarget {
  tenantId: string;
  userId: string;
  role: string;
  displayName: string;
  /** 招待した管理者 (enrollments.assigned_by に記録)。 */
  invitedBy: string;
}

/** Q&A / 提出物の名義に使うプロフィール。 */
interface SampleAuthor {
  id: string;
  name: string;
  initials: string | null;
}

interface CourseLesson {
  id: string;
  title: string;
  type: string;
  assignmentId: string | null;
  sectionTitle: string;
}

function initialsOf(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export async function insertTestDataForNewUser(
  db: Db,
  target: TestDataTarget,
): Promise<void> {
  const now = new Date();

  if (target.role === "student") {
    await insertStudentTestData(db, target, now);
  } else if ((STAFF_ROLES as readonly string[]).includes(target.role)) {
    await insertStaffTestData(db, target, now);
  }

  await db.insert(notifications).values({
    userId: target.userId,
    tenantId: target.tenantId,
    type: "announcement",
    title: "ようこそ (テストデータ)",
    body: `${target.displayName} さんのアカウントはテストモード中に登録されたため、 動作確認用のテストデータ (受講登録・進捗) を投入しました。`,
    payload: { test_data: true },
  });
}

// ---------------------------------------------------------------
// 受講者
// ---------------------------------------------------------------

async function insertStudentTestData(
  db: Db,
  target: TestDataTarget,
  now: Date,
): Promise<void> {
  const published = await listPublishedCourses(db, target.tenantId);

  if (published.length > 0) {
    const dueAt = new Date(now.getTime() + TEST_ENROLLMENT_DUE_DAYS * 86_400_000);
    await db
      .insert(enrollments)
      .values(
        published.map((course) => ({
          tenantId: target.tenantId,
          userId: target.userId,
          courseId: course.id,
          assignedBy: target.invitedBy,
          dueAt,
          required: true,
        })),
      )
      .onConflictDoNothing({
        target: [enrollments.userId, enrollments.courseId],
      });

    const course = published[0]!;
    const courseLessons = await listCourseLessons(db, course.id);

    // 最初のコースの最初のレッスンを完了済みにして、 進捗表示を確認できるようにする。
    const firstLesson = courseLessons[0];
    if (firstLesson) {
      await db
        .insert(lessonProgress)
        .values({
          tenantId: target.tenantId,
          userId: target.userId,
          lessonId: firstLesson.id,
          completed: true,
          updatedAt: now,
        })
        .onConflictDoNothing({
          target: [lessonProgress.userId, lessonProgress.lessonId],
        });
    }

    const author: SampleAuthor = {
      id: target.userId,
      name: target.displayName,
      initials: initialsOf(target.displayName),
    };
    const responder = await pickResponder(db, target.tenantId, target.userId);

    await insertSampleSubmissions(db, target.tenantId, author, course.title, courseLessons, now);
    await insertSampleQaThreads(
      db,
      target.tenantId,
      author,
      responder,
      course.id,
      courseLessons,
      now,
    );
  }

  // 週間学習チャート / 連続学習ストリークをすぐ確認できるよう、 日別ログも入れる。
  // 完了レッスン 1 件は「今日」に計上して lesson_progress と辻褄を合わせる。
  const today = toStudyDate(now);
  await db
    .insert(studyActivity)
    .values(
      TEST_STUDY_ACTIVITY.map((row) => ({
        tenantId: target.tenantId,
        userId: target.userId,
        date: addStudyDays(today, -row.daysAgo),
        watchedSec: row.watchedSec,
        completedLessons: row.daysAgo === 0 ? 1 : 0,
      })),
    )
    .onConflictDoNothing({
      target: [studyActivity.userId, studyActivity.date],
    });
}

// ---------------------------------------------------------------
// 講師 / 管理者
// ---------------------------------------------------------------

/**
 * 講師 / 管理者を先に招待したときのための補充。
 *
 * 講師 ↔ 受講者の担当割当モデルは無く、 講師画面の母集合はテナント全体なので、
 * 「テナントに添削待ち / 未返信 Q&A があるか」だけを見て、 足りない分を既存受講者
 * 名義で補う。 受講者が 1 人も居なければ何もしない (その後の受講者招待で埋まる)。
 */
async function insertStaffTestData(
  db: Db,
  target: TestDataTarget,
  now: Date,
): Promise<void> {
  const [pending, openQuestions] = await Promise.all([
    db
      .select({ id: submissions.id })
      .from(submissions)
      .where(
        and(eq(submissions.tenantId, target.tenantId), eq(submissions.status, "pending")),
      )
      .limit(1),
    db
      .select({ id: questions.id })
      .from(questions)
      .where(and(eq(questions.tenantId, target.tenantId), eq(questions.status, "open")))
      .limit(1),
  ]);
  const needSubmissions = pending.length === 0;
  const needQuestions = openQuestions.length === 0;
  if (!needSubmissions && !needQuestions) return;

  const student = (
    await db
      .select({ id: profiles.id, displayName: profiles.displayName, initials: profiles.initials })
      .from(profiles)
      .where(and(eq(profiles.tenantId, target.tenantId), eq(profiles.role, "student")))
      .orderBy(asc(profiles.createdAt))
      .limit(1)
  )[0];
  if (!student) return;

  const published = await listPublishedCourses(db, target.tenantId);
  const course = published[0];
  if (!course) return;

  const courseLessons = await listCourseLessons(db, course.id);
  const author: SampleAuthor = {
    id: student.id,
    name: student.displayName,
    initials: student.initials ?? initialsOf(student.displayName),
  };

  if (needSubmissions) {
    await insertSampleSubmissions(
      db,
      target.tenantId,
      author,
      course.title,
      courseLessons,
      now,
    );
  }
  if (needQuestions) {
    const responder = await pickResponder(db, target.tenantId, target.userId);
    await insertSampleQaThreads(
      db,
      target.tenantId,
      author,
      responder,
      course.id,
      courseLessons,
      now,
    );
  }
}

// ---------------------------------------------------------------
// 共通ヘルパ
// ---------------------------------------------------------------

async function listPublishedCourses(
  db: Db,
  tenantId: string,
): Promise<Array<{ id: string; title: string }>> {
  return db
    .select({ id: courses.id, title: courses.title })
    .from(courses)
    .where(and(eq(courses.tenantId, tenantId), eq(courses.status, "published")))
    .orderBy(asc(courses.createdAt));
}

/** コース配下のレッスンをセクション順 / レッスン順で返す。 */
async function listCourseLessons(db: Db, courseId: string): Promise<CourseLesson[]> {
  return db
    .select({
      id: lessons.id,
      title: lessons.title,
      type: lessons.type,
      assignmentId: lessons.assignmentId,
      sectionTitle: sections.title,
    })
    .from(lessons)
    .innerJoin(sections, eq(lessons.sectionId, sections.id))
    .where(eq(sections.courseId, courseId))
    .orderBy(asc(sections.order), asc(lessons.order));
}

/**
 * サンプル Q&A の講師返信に使うプロフィールを選ぶ。
 * 講師 > その他スタッフ の順で、 可能なら本人以外を選ぶ (招待した管理者が残る)。
 */
async function pickResponder(
  db: Db,
  tenantId: string,
  excludeUserId: string,
): Promise<SampleAuthor | null> {
  const staff = await db
    .select({
      id: profiles.id,
      displayName: profiles.displayName,
      initials: profiles.initials,
      role: profiles.role,
    })
    .from(profiles)
    .where(and(eq(profiles.tenantId, tenantId), inArray(profiles.role, [...STAFF_ROLES])))
    .orderBy(asc(profiles.createdAt));

  const picked =
    staff.find((p) => p.role === "instructor" && p.id !== excludeUserId) ??
    staff.find((p) => p.id !== excludeUserId) ??
    staff[0];
  if (!picked) return null;
  return {
    id: picked.id,
    name: picked.displayName,
    initials: picked.initials ?? initialsOf(picked.displayName),
  };
}

/**
 * 講師の添削待ちキュー / 受講者の提出履歴を埋めるサンプル提出物。
 * 課題・演習レッスンが 1 件も無いコースでは何もしない。
 */
async function insertSampleSubmissions(
  db: Db,
  tenantId: string,
  author: SampleAuthor,
  courseTitle: string,
  courseLessons: readonly CourseLesson[],
  now: Date,
): Promise<void> {
  const targets = courseLessons
    .filter((l) => (ASSIGNMENT_LESSON_TYPES as readonly string[]).includes(l.type))
    .slice(0, SUBMISSION_TEMPLATES.length);
  if (targets.length === 0) return;

  const base = now.getTime();
  const rows = targets.map((lesson, i) => {
    const t = SUBMISSION_TEMPLATES[i]!;
    return {
      tenantId,
      studentId: author.id,
      lessonId: lesson.id,
      assignmentId: lesson.assignmentId,
      courseTitle,
      sectionTitle: lesson.sectionTitle,
      assignmentTitle: lesson.title,
      code: t.code,
      status: t.status,
      priority: t.priority,
      attempt: t.attempt,
      aiReady: t.aiReady,
      aiSuggestions: t.aiSuggestions,
      rubric: t.rubric,
      reviewNotes: t.reviewNotes,
      verdict: t.verdict,
      submittedAt: new Date(base - t.submittedHoursAgo * HOUR_MS),
      reviewedAt:
        t.reviewedHoursAgo == null ? null : new Date(base - t.reviewedHoursAgo * HOUR_MS),
    };
  });
  const inserted = await db.insert(submissions).values(rows).returning({ id: submissions.id });

  // 添削済みの提出には、 通常フローと同じく受講者宛の完了通知も入れておく
  // (受講者の通知画面も主要画面のため)。
  const reviewed = rows
    .map((row, i) => ({ row, id: inserted[i]?.id }))
    .filter((x) => x.row.reviewedAt != null && x.id != null);
  if (reviewed.length === 0) return;
  await db.insert(notifications).values(
    reviewed.map(({ row, id }) => ({
      userId: author.id,
      tenantId,
      type: "review_completed" as const,
      title: `${row.assignmentTitle} の添削が完了しました`,
      body:
        row.verdict === "pass"
          ? "合格しました。 おめでとうございます。"
          : "フィードバックが届いています。",
      payload: {
        submission_id: id,
        verdict: row.verdict,
        status: row.status,
        course_title: row.courseTitle,
        test_data: true,
      },
    })),
  );
}

/**
 * 講師の未返信キュー / 受講者のレッスン内 Q&A を埋めるサンプルスレッド。
 * 返信者 (講師 / 管理者) が居ないテナントでは、 返信付きスレッドを飛ばす。
 */
async function insertSampleQaThreads(
  db: Db,
  tenantId: string,
  author: SampleAuthor,
  responder: SampleAuthor | null,
  courseId: string,
  courseLessons: readonly CourseLesson[],
  now: Date,
): Promise<void> {
  const firstLessonId = courseLessons[0]?.id ?? null;
  const assignmentLessonId =
    courseLessons.find((l) => (ASSIGNMENT_LESSON_TYPES as readonly string[]).includes(l.type))
      ?.id ?? firstLessonId;

  const base = now.getTime();
  const threads = QA_TEMPLATES.filter(
    (t) => responder != null || t.replies.every((r) => !r.fromInstructor),
  ).map((t) => {
    const replies = t.replies.map((r) => ({
      fromInstructor: r.fromInstructor,
      body: r.body,
      createdAt: new Date(base - r.hoursAgo * HOUR_MS),
    }));
    const createdAt = new Date(base - t.hoursAgo * HOUR_MS);
    return {
      lessonId: t.onAssignmentLesson ? assignmentLessonId : firstLessonId,
      status: t.status,
      title: t.title,
      body: t.body,
      createdAt,
      // 一覧は updated_at 降順のため、 最後の返信時刻を反映させる。
      updatedAt: replies[replies.length - 1]?.createdAt ?? createdAt,
      replies,
    };
  });
  if (threads.length === 0) return;

  const inserted = await db
    .insert(questions)
    .values(
      threads.map((t) => ({
        tenantId,
        courseId,
        lessonId: t.lessonId,
        authorId: author.id,
        authorName: author.name,
        authorInitials: author.initials,
        title: t.title,
        body: t.body,
        status: t.status,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    )
    .returning({ id: questions.id });

  const replyRows = threads.flatMap((t, i) => {
    const questionId = inserted[i]?.id;
    if (!questionId) return [];
    return t.replies.map((r) => {
      const by = r.fromInstructor ? responder! : author;
      return {
        questionId,
        authorId: by.id,
        authorName: by.name,
        authorInitials: by.initials,
        body: r.body,
        isInstructor: r.fromInstructor,
        createdAt: r.createdAt,
      };
    });
  });
  if (replyRows.length === 0) return;
  await db.insert(questionReplies).values(replyRows);

  // 講師返信のあるスレッドには、 通常フローと同じく質問者宛の通知も入れておく。
  const answered = threads
    .map((thread, i) => ({ thread, id: inserted[i]?.id }))
    .filter((x) => x.id != null && x.thread.replies.some((r) => r.fromInstructor));
  if (answered.length === 0) return;
  await db.insert(notifications).values(
    answered.map(({ thread, id }) => ({
      userId: author.id,
      tenantId,
      type: "qa_answered" as const,
      title: "質問に回答がつきました",
      body: (thread.replies.find((r) => r.fromInstructor)?.body ?? "").slice(0, 140),
      payload: {
        question_id: id,
        course_id: courseId,
        lesson_id: thread.lessonId,
        test_data: true,
      },
    })),
  );
}
