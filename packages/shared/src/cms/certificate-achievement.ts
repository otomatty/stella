export interface CertificateAchievementItem {
  done: number;
  total: number;
}

export interface CertificateAchievement {
  lessons?: CertificateAchievementItem;
  quizzes?: CertificateAchievementItem;
  assignments?: CertificateAchievementItem;
}

/** 発行時の条件と数だけを取り出す。古い・不正な snapshot は公開しない。 */
export function achievementFromSnapshot(snapshot: unknown): CertificateAchievement | null {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;
  const row = snapshot as Record<string, unknown>;
  if (!row.criteria || typeof row.criteria !== "object" || Array.isArray(row.criteria)) return null;
  const criteria = row.criteria as Record<string, unknown>;
  const achievement: CertificateAchievement = {};
  const fields = [
    ["lessons", "require_all_lessons", "completed_lessons", "total_lessons"],
    ["quizzes", "require_quiz_pass", "passed_quizzes", "total_quizzes"],
    ["assignments", "require_assignment_pass", "passed_assignments", "total_assignments"],
  ] as const;
  for (const [key, required, doneKey, totalKey] of fields) {
    if (criteria[required] !== true) continue;
    const done = row[doneKey];
    const total = row[totalKey];
    if (
      typeof done !== "number" ||
      typeof total !== "number" ||
      !Number.isFinite(done) ||
      !Number.isFinite(total) ||
      done < 0 ||
      total < 0
    )
      return null;
    if (total > 0) achievement[key] = { done, total };
  }
  return Object.keys(achievement).length > 0 ? achievement : null;
}
