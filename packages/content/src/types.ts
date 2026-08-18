/**
 * 教材ファイル（practice.md の確認クイズ）から生成する quiz seed 型。
 * DB 行型 (`@falcon/shared` の QuizRow / QuizQuestionRow / QuizOptionRow) へ
 * export-seed-sql.ts が変換する。
 */

export interface QuizOptionSeed {
  /** "A" / "B" / "C" の表示ラベルを除いた選択肢本文 */
  label: string;
  isCorrect: boolean;
}

export interface QuizQuestionSeed {
  /** 設問文（"Q1. " の接頭辞を除いたもの） */
  prompt: string;
  explanation: string;
  options: QuizOptionSeed[];
}

export type CourseColor = "indigo" | "green" | "amber" | "slate";

/** レッスンに紐づくコード演習。id は `@falcon/shared` の Assignment.id。 */
export interface ExerciseRef {
  id: string;
  title: string;
}

/** courses/<slug>/course.json。slug はディレクトリ名。 */
export interface CourseConfig {
  title: string;
  category?: string;
  color?: CourseColor;
  /**
   * 一覧カードのサムネイル画像。講座ディレクトリからの相対パス。
   * 省略時は `thumbnail.webp` / `.png` / `.jpg` を順に探す（無ければ color のストライプ表示）。
   */
  thumbnail?: string;
  description?: string;
  header?: string;
  tenantId?: string;
  modules?: Record<string, string>;
  /** レッスンキー ("1-1" 形式) → VS Code 拡張で解くコード演習 */
  exercises?: Record<string, ExerciseRef[]>;
}

export interface QuizSeed {
  /** 所属講座。lessonId は講座内でのみ一意なので、seed 照合に両方使う。 */
  courseId: string;
  /** 紐づく lesson の安定キー（manifest が振る Lesson.id と一致させる） */
  lessonId: string;
  passScore: number;
  questions: QuizQuestionSeed[];
}
