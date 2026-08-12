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

export interface QuizSeed {
  /** 紐づく lesson の安定キー（manifest が振る Lesson.id と一致させる） */
  lessonId: string;
  passScore: number;
  questions: QuizQuestionSeed[];
}
