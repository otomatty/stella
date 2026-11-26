export type QuizOptionOutcome = "hit" | "missed" | "wrong" | "none";

export function quizOptionOutcome(selected: boolean, correct: boolean): QuizOptionOutcome {
  if (correct) return selected ? "hit" : "missed";
  return selected ? "wrong" : "none";
}
