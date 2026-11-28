import { levelProgress, type XpBreakdown } from "@stella/shared/skill-map/xp";

/** ストリーク算出のために遡る日数 (今日を含む。 `/api/study-activity/mine` と同じ)。 */
export const STREAK_LOOKBACK_DAYS = 365;

export function skillProfileLevel(xp: XpBreakdown) {
  const progress = levelProgress(xp.total);
  return {
    level: progress.level,
    xp_into_level: progress.xpIntoLevel,
    xp_to_next_level: progress.xpToNextLevel,
    next_level_at: progress.nextLevelAt,
  };
}

export function skillProfileView(
  xp: XpBreakdown,
  streak: { current: number; longest: number; today: string },
  now = new Date(),
) {
  return {
    xp: {
      total: xp.total,
      completed_lessons: xp.completedLessons,
      passed_quizzes: xp.passedQuizzes,
      cleared_stages: xp.clearedStages,
      passed_discoveries: xp.passedDiscoveries,
      from_lessons: xp.fromLessons,
      from_quizzes: xp.fromQuizzes,
      from_stages: xp.fromStages,
      from_discoveries: xp.fromDiscoveries,
    },
    level: skillProfileLevel(xp),
    streak,
    generated_at: now.toISOString(),
  };
}
