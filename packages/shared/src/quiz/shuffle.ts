import type { LearnerQuizQuestion } from "../cms/types.js";

/** Fisher-Yates シャッフル (元配列は破壊しない)。 */
export function shuffled<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j] as T;
    a[j] = tmp as T;
  }
  return a;
}

/** 設問順・各設問の選択肢順をシャッフルした新配列を返す。 */
export function shuffleLearnerQuizQuestions(
  questions: readonly LearnerQuizQuestion[],
): LearnerQuizQuestion[] {
  return shuffled(questions).map((q) => ({ ...q, options: shuffled(q.options) }));
}
