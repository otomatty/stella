/**
 * Shared domain types for the LMS prototype.
 * Intentionally kept narrow — reflects only what the UI renders today.
 */

export type Role = 'learner' | 'instructor' | 'admin';

export type AvatarTone = 'c1' | 'c2' | 'c3' | 'c4' | 'c5' | 'c6';

export type CourseColor = 'indigo' | 'green' | 'amber' | 'slate';

export type LessonType = 'video' | 'slides' | 'text' | 'quiz' | 'assignment' | 'code';

export type LessonStatus = 'done' | 'active' | 'todo' | 'locked';

export interface Tenant {
  id: 'coach' | 'ses';
  name: string;
  subtitle: string;
  icon: 'school' | 'cpu';
  active: number;
}

export interface User {
  name: string;
  email: string;
  initials: string;
}

export interface Lesson {
  id: string;
  title: string;
  type: LessonType;
  duration: string;
  status: LessonStatus;
  progress?: number;

  /** Supabase Storage `materials-public` バケット内のパス (video lesson 用) */
  videoPath?: string;
  /** Supabase Storage `materials-public` バケット内のパス (slides lesson 用) */
  pdfPath?: string;
  /** `text` レッスンの本文 (将来 CMS 化までは fixtures 直書き) */
  markdown?: string;
  /** `code` / `assignment` で参照する `@falcon/shared` の Assignment.id (P2 で使用) */
  assignmentId?: string;
  /** 想定総ページ数 (slides) — 進捗バー初期表示用、 実際の numPages は PDF 読み込み後に確定 */
  totalPages?: number;
  /** 想定総再生秒数 (video) — 進捗バー初期表示用、 実際の duration は loadedmetadata で確定 */
  totalSec?: number;
}

export interface Section {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  category: string;
  color: CourseColor;
  duration?: number;
  lessonsCount: number;
  progress: number;
  enrolledBy?: string;
  dueAt?: string | null;
  /** 受講登録 (Issue #20) 由来。 必須 / 任意の区別。 */
  required?: boolean;
  description?: string;
  completed?: boolean;
  sections?: Section[];
}

export interface Announcement {
  id: number;
  title: string;
  date: string;
  by: string;
  unread: boolean;
}

export interface ReviewItem {
  id: string;
  student: string;
  initials: string;
  c: AvatarTone;
  course: string;
  assignment: string;
  submittedAt: string;
  aiReady: boolean;
  priority: 'high' | 'normal' | 'low';
}

export interface AISuggestion {
  id: string;
  line: number;
  severity: 'high' | 'med' | 'low';
  category: string;
  body: string;
  adopted: boolean | null;
}

export interface RubricCriterion {
  id: string;
  name: string;
  desc: string;
  max: number;
  score: number;
}

export interface QAMessage {
  id: number;
  who: string;
  me: boolean;
  initials: string;
  time: string;
  body: string;
  c?: AvatarTone;
}

export interface CompletionByCourse {
  name: string;
  n: number;
  pct: number;
}

export interface Stumble {
  q: string;
  wrong: number;
  n: number;
}
