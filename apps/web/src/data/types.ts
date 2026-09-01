/**
 * Shared domain types for the LMS prototype.
 * Intentionally kept narrow — reflects only what the UI renders today.
 */

export type Role = "learner" | "instructor" | "admin" | "sales";

export type AvatarTone = "c1" | "c2" | "c3" | "c4" | "c5" | "c6";

export type StageColor = "indigo" | "green" | "amber" | "slate";

export type LessonType = "video" | "slides" | "text" | "quiz" | "assignment" | "code";

export type LessonStatus = "done" | "active" | "todo" | "locked";

export interface Tenant {
  /** seed テナント ('ses') に限らず、 DB 上の任意のテナント ID を取り得る。 */
  id: string;
  name: string;
  subtitle: string;
  icon: "school" | "cpu";
  active: number;
}

export interface User {
  name: string;
  email: string;
  initials: string;
  /** Google アカウントのプロフィール画像。 未取得 / 読み込み失敗時はイニシャル表示。 */
  avatarUrl?: string | null;
}

export interface Lesson {
  id: string;
  title: string;
  type: LessonType;
  duration: string;
  status: LessonStatus;
  progress?: number;

  /** R2 バケット内のパス (video lesson 用) */
  videoPath?: string;
  /** R2 バケット内のパス (slides lesson 用) */
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

/**
 * 受講単位 (旧 Course)。 ステージ → セクション → レッスンの木の根。
 *
 * 同名異義に注意: `@falcon/shared` (`packages/shared/src/types.ts`) の `Stage` は
 * 演習カリキュラムの難易度段階 (S0-S5) で、 こちらとは別物。
 */
export interface Stage {
  id: string;
  title: string;
  category: string;
  color: StageColor;
  /**
   * 一覧カードのサムネイル画像の R2 パス (`stages.thumbnail_path` 由来)。
   * 未設定なら color のストライプ表示にフォールバックする。
   */
  thumbnailPath?: string;
  /**
   * スキルツリーの星に出す講座アイコンの R2 パス (`stages.icon_path` 由来)。
   * 正本は `packages/content/courses/<slug>/icon.svg` (単色シルエット)。
   * 未設定なら星は状態グリフ (★/▶/🔒/✨) のまま。
   */
  iconPath?: string;
  duration?: number;
  lessonsCount: number;
  progress: number;
  enrolledBy?: string;
  dueAt?: string | null;
  /** 受講登録 (Issue #20) 由来。 必須 / 任意の区別。 */
  required?: boolean;
  description?: string;
  completed?: boolean;
  /**
   * 前提ステージの **slug** 配列 (`stages.prerequisites` の JSON 由来)。
   * すべてクリアするまでこのステージは開けない (スキルツリーのハードロック)。
   * id ではなく slug を持つのは、教材リポジトリが正本で slug しか知らないため。
   */
  prerequisites?: string[];
  /**
   * スキルツリーで線を引く親の **slug** (`stages.parent` 由来。`prerequisites` のうちの 1 つ)。
   * 未設定なら `prerequisites` の先頭を親に倒す (評価器 `parentSlugOf`)。
   */
  parent?: string;
  /** 到達説明。「このスキルを身につけた人は◯◯ができる」のホバー表示に使う 1 文。 */
  canDo?: string;
  /** まだ見えないスキルに見せるテーマ名。視界外のステージはタイトルの代わりにこれだけが見える。 */
  theme?: string;
  /** スキルツリーのカタログ掲載範囲 (`stages.audience` 由来)。省略 = catalog。 */
  audience?: "catalog" | "granted";
  /**
   * スキルツリー上で同じステージを複数の扇に置くときの扇名。実体は 1 行のまま
   * (クリアは共有)。未設定なら `category` の扇に 1 つ。
   */
  appearances?: string[];
  sections?: Section[];
  /** 修了基準 (DB 由来ステージのみ)。 未定義なら表示しない。 */
  criteria?: {
    requireAllLessons: boolean;
    requireQuizPass: boolean;
    requireAssignmentPass: boolean;
  };
}

/**
 * 教材リポジトリ (`packages/content`) 向けの別名。
 *
 * 教材側は 「講座 = course」 の語彙のまま (`courses/<slug>/course.json`) で、 course →
 * stage の写像は seed exporter (`packages/shared/scripts/export-seed-sql.ts`) が担う。
 * `packages/content/src/manifest.ts` / `material-pdf.ts` はこの型名で参照するので、
 * 境界としてここに残す。 アプリ側の新規コードは `Stage` を使うこと。
 */
export type Course = Stage;

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
  stage: string;
  assignment: string;
  submittedAt: string;
  aiReady: boolean;
  priority: "high" | "normal" | "low";
}

export interface AISuggestion {
  id: string;
  line: number;
  severity: "high" | "med" | "low";
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

export interface CompletionByStage {
  name: string;
  n: number;
  pct: number;
}

export interface Stumble {
  q: string;
  wrong: number;
  n: number;
}
