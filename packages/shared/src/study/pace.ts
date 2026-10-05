import type { TaskKind } from "../tasks/manifest.js";
import type { TaskStatus } from "../tasks/catalog.js";
import { addStudyDays, studyDateStartMs, studyDateWeekday } from "./activity.js";

export const DEFAULT_WEEKLY_HOURS = 35;
/** 新設計 §3.1 の標準プログラム。時間の正本は各course.json。補習・資格は別枠。 */
export const LEARNING_PROGRAM_SLUGS = [
  "dev-env-basics",
  "html-css-basics",
  "javascript-basics",
  "javascript-data-basics",
  "dom-basics",
  "ui-components-basics",
  "http-async-basics",
  "react-basics",
  "react-ui-basics",
  "ui-integration-basics",
  "node-api-basics",
  "sql-basics",
  "auth-basics",
  "nextjs-basics",
  "design-quality-basics",
  "deploy-ops-basics",
  "code-reading-basics",
  "fullstack-capstone",
] as const;
const DAY_MS = 86_400_000;

function calendarDayOffset(days: number): number {
  // 講座ごとの除算を足した丸め誤差で、整数日の予定を翌日に送らない。
  return Math.ceil(days - Number.EPSILON * Math.max(1, Math.abs(days)) * 32);
}

export interface PaceSettings {
  weeklyHours: number;
  startDate: string | null;
}
export interface PaceChange {
  date: string;
  weeklyHours: number;
}
export interface PaceTask {
  id: string;
  title: string;
  kind: TaskKind;
  pattern: string;
  skills: string[];
  minutes: number;
  status: TaskStatus;
  passedDate: string | null;
}
export interface PaceUnit {
  id: string;
  title: string;
  minutes: number;
  lessons: { id: string; title: string; minutes: number; completed: boolean }[];
  tasks: PaceTask[];
}
export interface PaceStage {
  id: string;
  slug: string;
  title: string;
  prerequisites: string[];
  minutes: number;
  units: PaceUnit[];
  completed?: boolean;
}
export interface PaceTarget {
  stageId: string;
  title: string;
  targetDate: string | null;
  remainingMinutes: number;
}
export interface PaceWeekUnit {
  stageId: string;
  unitId: string;
  title: string;
  minutes: number;
  sessions: number;
  /** 教材が用意されているコマだけ。未作成部分の名前は捏造しない。 */
  lessons: { id: string; title: string }[];
}
export interface PaceAssessment {
  taskId: string;
  stageId: string;
  title: string;
  dueDate: string;
}
export interface LearningPace {
  settings: PaceSettings;
  today: string;
  weekStart: string;
  weekEnd: string;
  totalMinutes: number;
  completedMinutes: number;
  skippedPracticeMinutes: number;
  expectedMinutes: number;
  differenceMinutes: number;
  delayDays: number;
  needsInstructor: boolean;
  remainingWeeks: number;
  finishDate: string | null;
  targets: PaceTarget[];
  thisWeek: PaceWeekUnit[];
  assessments: PaceAssessment[];
  incomplete: boolean;
}

export function isStudyDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(studyDateStartMs(value)) &&
    addStudyDays(value, 0) === value
  );
}

/** 部分更新用。本人・担当講師の API で同じ検証を使う。 */
export function parsePaceSettings(raw: Record<string, unknown>): Partial<PaceSettings> {
  const result: Partial<PaceSettings> = {};
  if ("weekly_hours" in raw) {
    if (
      typeof raw.weekly_hours !== "number" ||
      !Number.isFinite(raw.weekly_hours) ||
      raw.weekly_hours < 1 ||
      raw.weekly_hours > 80
    )
      throw new Error("週の学習時間は1〜80時間で入力してください");
    result.weeklyHours = raw.weekly_hours;
  }
  if ("learning_start_date" in raw) {
    if (raw.learning_start_date !== null && !isStudyDate(raw.learning_start_date))
      throw new Error("開始日は実在する日付 (YYYY-MM-DD) で入力してください");
    result.startDate = raw.learning_start_date as string | null;
  }
  return result;
}

export function isPassed(status: TaskStatus): boolean {
  return status === "passed" || status === "ai-passed";
}

/** 前提の順を守り、同順位は slug で決める。DB の返す順序に依存しない。 */
function orderedStages(stages: PaceStage[]): PaceStage[] {
  const bySlug = new Map(stages.map((s) => [s.slug, s]));
  const ordered: PaceStage[] = [];
  const done = new Set<string>();
  const visiting = new Set<string>();
  const visit = (s: PaceStage) => {
    if (done.has(s.slug)) return;
    if (visiting.has(s.slug)) throw new Error("学習計画の前提が循環しています");
    visiting.add(s.slug);
    for (const slug of [...s.prerequisites].sort()) {
      const prerequisite = bySlug.get(slug);
      if (prerequisite) visit(prerequisite);
    }
    visiting.delete(s.slug);
    done.add(s.slug);
    ordered.push(s);
  };
  for (const stage of [...stages].sort((a, b) => a.slug.localeCompare(b.slug))) visit(stage);
  return ordered;
}

/** 過去の時間設定を積分する。週の時間の変更で過去の進み具合を改変しない。 */
function expectedAt(start: string, today: string, changes: PaceChange[], current: number): number {
  const sorted = [...changes].sort((a, b) => a.date.localeCompare(b.date));
  let hours = sorted.length ? DEFAULT_WEEKLY_HOURS : current;
  let cursor = start;
  let minutes = 0;
  for (const change of sorted) {
    if (change.date <= start) {
      hours = change.weeklyHours;
    } else if (change.date < today) {
      minutes +=
        (((studyDateStartMs(change.date) - studyDateStartMs(cursor)) / DAY_MS) * hours * 60) / 7;
      cursor = change.date;
      hours = change.weeklyHours;
    }
  }
  return (
    minutes +
    (Math.max(0, (studyDateStartMs(today) - studyDateStartMs(cursor)) / DAY_MS) * hours * 60) / 7
  );
}

/**
 * 予定日は永続化しない。合格・完了した項目の予定時間だけを進捗に数える。
 * 遅れた分を週の負担に上乗せせず、今日から残りを同じペースで引き直す。
 * 補習はこの入力の外。開始診断も確認A・Bの時間には適用しない。
 */
export function calculateLearningPace(input: {
  today: string;
  settings: PaceSettings;
  stages: PaceStage[];
  changes?: PaceChange[];
  confirmedSkills?: Set<string>;
}): LearningPace {
  const { today, settings } = input;
  const dailyMinutes = (settings.weeklyHours * 60) / 7;
  const weekStart = addStudyDays(today, -((studyDateWeekday(today) + 6) % 7));
  const weekEnd = addStudyDays(weekStart, 6);
  const started = settings.startDate !== null && settings.startDate <= today;
  const anchor = started ? today : settings.startDate;
  let weeklyBudget = anchor
    ? Math.max(
        0,
        (studyDateStartMs(addStudyDays(weekEnd, 1)) - studyDateStartMs(anchor)) / DAY_MS,
      ) * dailyMinutes
    : 0;
  const targets: PaceTarget[] = [];
  const thisWeek: PaceWeekUnit[] = [];
  const assessments: PaceAssessment[] = [];
  let totalMinutes = 0;
  let completedMinutes = 0;
  let skippedPracticeMinutes = 0;
  let cumulativeRemaining = 0;
  let calendarDays = 0;
  let incomplete = false;

  for (const stage of orderedStages(input.stages)) {
    let stageRemaining = 0;
    let earliestFinishDays = 0;
    const detailedMinutes = stage.units.reduce((n, u) => n + u.minutes, 0);
    const addRemaining = (unit: PaceWeekUnit, minutes: number) => {
      stageRemaining += minutes;
      if (weeklyBudget > 0 && minutes > 0) {
        const allocated = Math.min(weeklyBudget, minutes);
        thisWeek.push({ ...unit, minutes: allocated, sessions: Math.ceil(allocated / 90) });
        weeklyBudget -= allocated;
      }
    };
    for (const unit of stage.units) {
      const taskMinutes = unit.tasks.reduce((n, t) => n + t.minutes, 0);
      const lessonBudget = Math.max(0, unit.minutes - taskMinutes);
      if (taskMinutes > unit.minutes) incomplete = true;
      const lessonWeight = unit.lessons.reduce((n, l) => n + l.minutes, 0);
      let earned = 0;
      let skipped = 0;
      let blockedBMinutes = 0;
      let readyBMinutes = 0;
      for (const task of unit.tasks) {
        const assessment = task.kind === "assessment-a" || task.kind === "assessment-b";
        if (
          !assessment &&
          task.skills.length > 0 &&
          task.skills.every((s) => input.confirmedSkills?.has(s))
        ) {
          skipped += task.minutes;
          continue;
        }
        if (stage.completed || isPassed(task.status)) {
          earned += task.minutes;
          continue;
        }
        if (task.kind === "assessment-b") {
          blockedBMinutes += task.minutes;
          const preceding = unit.tasks.filter(
            (a) => a.kind === "assessment-a" && a.pattern === task.pattern,
          );
          if (preceding.length && preceding.every((a) => isPassed(a.status) && a.passedDate)) {
            const passedDate =
              preceding
                .map((a) => a.passedDate ?? "")
                .sort()
                .at(-1) ?? "";
            const dueDate = addStudyDays(passedDate, 7);
            assessments.push({ taskId: task.id, stageId: stage.id, title: task.title, dueDate });
            if (dueDate <= weekEnd) readyBMinutes += task.minutes;
            if (anchor)
              earliestFinishDays = Math.max(
                earliestFinishDays,
                Math.max(0, (studyDateStartMs(dueDate) - studyDateStartMs(anchor)) / DAY_MS) +
                  task.minutes / dailyMinutes,
              );
          } else if (preceding.length) {
            // Aが未合格なら、残りの学習後にも7日間の間隔を確保する。
            earliestFinishDays = Math.max(
              earliestFinishDays,
              calendarDays +
                (stageRemaining + Math.max(0, unit.minutes - task.minutes)) / dailyMinutes +
                7 +
                task.minutes / dailyMinutes,
            );
          }
        }
      }
      for (const lesson of unit.lessons) {
        if ((stage.completed || lesson.completed) && lessonWeight > 0)
          earned += (lessonBudget * lesson.minutes) / lessonWeight;
      }
      const budget = Math.max(unit.minutes, taskMinutes);
      if (stage.completed) earned = budget - skipped;
      totalMinutes += budget - skipped;
      completedMinutes += earned;
      skippedPracticeMinutes += skipped;
      const remaining = Math.max(0, budget - skipped - earned);
      // 確認BはAの7日後まで「今週のコマ」に入れない。
      const eligible = Math.max(0, remaining - blockedBMinutes + readyBMinutes);
      addRemaining(
        {
          stageId: stage.id,
          unitId: unit.id,
          title: unit.title,
          minutes: 0,
          sessions: 0,
          lessons: unit.lessons.filter((l) => !l.completed).map(({ id, title }) => ({ id, title })),
        },
        Math.min(remaining, eligible),
      );
      stageRemaining += remaining - Math.min(remaining, eligible);
    }
    const undetailed = Math.max(0, stage.minutes - detailedMinutes);
    if (undetailed > 0 || detailedMinutes > stage.minutes) incomplete = true;
    totalMinutes += undetailed;
    if (stage.completed) completedMinutes += undetailed;
    else stageRemaining += undetailed;
    cumulativeRemaining += stageRemaining;
    calendarDays = Math.max(calendarDays + stageRemaining / dailyMinutes, earliestFinishDays);
    targets.push({
      stageId: stage.id,
      title: stage.title,
      remainingMinutes: stageRemaining,
      targetDate: anchor ? addStudyDays(anchor, calendarDayOffset(calendarDays)) : null,
    });
  }
  const expectedMinutes =
    started && settings.startDate
      ? Math.min(
          totalMinutes,
          expectedAt(settings.startDate, today, input.changes ?? [], settings.weeklyHours),
        )
      : 0;
  const differenceMinutes = completedMinutes - expectedMinutes;
  const delayDays = Math.max(0, -differenceMinutes / dailyMinutes);
  return {
    settings,
    today,
    weekStart,
    weekEnd,
    totalMinutes,
    completedMinutes,
    skippedPracticeMinutes,
    expectedMinutes,
    differenceMinutes,
    delayDays,
    needsInstructor: delayDays > 7,
    remainingWeeks: cumulativeRemaining / (settings.weeklyHours * 60),
    finishDate: anchor ? addStudyDays(anchor, calendarDayOffset(calendarDays)) : null,
    targets,
    thisWeek,
    assessments: assessments.sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    incomplete,
  };
}
