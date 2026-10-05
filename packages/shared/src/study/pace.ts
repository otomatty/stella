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
  previousWeeklyHours: number;
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

/** 月曜始まりの週。今週の目安と、遅れ通知の週ごとの重複排除が同じ境界を使う。 */
export function studyWeekStart(date: string): string {
  return addStudyDays(date, -((studyDateWeekday(date) + 6) % 7));
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
  let hours = sorted[0]?.previousWeeklyHours ?? current;
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

interface RemainingUnit {
  minutes: number;
  week: PaceWeekUnit | null;
  assessments: { minutes: number; releaseAt: number | null; showInWeek: boolean }[];
}

interface ReadyAssessment {
  minutes: number;
  releaseAt: number;
  week: PaceWeekUnit | null;
}

/** 講座ごとの残り。`finishedAt` は最後の単元・Bを終える時間軸上の時点。 */
interface StagePlan {
  prerequisites: StagePlan[];
  units: RemainingUnit[];
  index: number;
  ready: ReadyAssessment[];
  finishedAt: number | null;
}

/**
 * 1人の時間軸に全講座を置く。講座の中は単元の順に進め、Bの解禁を待つ間は次の単元へ進む。
 * 講座の残りが未解禁のBだけになったら、前提を終えた別の講座 (同じ親の兄弟など) を進め、
 * 解禁したBから順に割り込ませる。子講座は親のBまで終えてから始める (アプリの解放と同じ)。
 * 進めている講座は単元が残る限り続け、講座を行き来させない。
 */
function scheduleStages(
  plans: StagePlan[],
  dailyMinutes: number,
  record: (unit: PaceWeekUnit | null, start: number, end: number) => void,
): void {
  let cursor = 0;
  let current: StagePlan | undefined;
  for (;;) {
    // 前提順に見るので、親がこの時点で終わった子も同じ周で着手できる。
    const open: StagePlan[] = [];
    for (const plan of plans) {
      if (plan.finishedAt !== null || plan.prerequisites.some((p) => p.finishedAt === null))
        continue;
      for (
        let unit = plan.units[plan.index];
        unit && unit.minutes === 0;
        unit = plan.units[++plan.index]
      )
        for (const b of unit.assessments)
          if (b.releaseAt === null)
            plan.ready.push({
              minutes: b.minutes,
              releaseAt: cursor + 7 * dailyMinutes,
              week: unit.week,
            });
      if (plan.index >= plan.units.length && plan.ready.length === 0) plan.finishedAt = cursor;
      else open.push(plan);
    }
    let next: { plan: StagePlan; b: ReadyAssessment } | undefined;
    for (const plan of open) {
      plan.ready.sort((a, b) => a.releaseAt - b.releaseAt);
      const b = plan.ready[0];
      if (b && (!next || b.releaseAt < next.b.releaseAt)) next = { plan, b };
    }
    if (next && next.b.releaseAt <= cursor) {
      record(next.b.week, cursor, cursor + next.b.minutes);
      cursor += next.b.minutes;
      next.plan.ready.shift();
      continue;
    }
    if (!current || current.index >= current.units.length)
      current = open.find((p) => p.index < p.units.length);
    const unit = current?.units[current.index];
    if (unit) {
      const minutes = Math.min(unit.minutes, next ? next.b.releaseAt - cursor : Infinity);
      record(unit.week, cursor, cursor + minutes);
      cursor += minutes;
      unit.minutes -= minutes;
    } else if (next) {
      // どの講座にも今できる単元がない。最も早いBの解禁まで進める。
      cursor = next.b.releaseAt;
    } else return;
  }
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
  const weekStart = studyWeekStart(today);
  const weekEnd = addStudyDays(weekStart, 6);
  const started = settings.startDate !== null && settings.startDate <= today;
  const anchor = started ? today : settings.startDate;
  const weekUntil = anchor
    ? Math.max(
        0,
        (studyDateStartMs(addStudyDays(weekEnd, 1)) - studyDateStartMs(anchor)) / DAY_MS,
      ) * dailyMinutes
    : 0;
  const weeklyUnits = new Map<string, PaceWeekUnit>();
  const assessments: PaceAssessment[] = [];
  let totalMinutes = 0;
  let completedMinutes = 0;
  let skippedPracticeMinutes = 0;
  let cumulativeRemaining = 0;
  let incomplete = false;
  const recordWeek = (unit: PaceWeekUnit | null, start: number, end: number) => {
    const minutes = Math.max(0, Math.min(end, weekUntil) - start);
    if (!unit || minutes === 0) return;
    const previous = weeklyUnits.get(unit.unitId);
    const allocated = (previous?.minutes ?? 0) + minutes;
    weeklyUnits.set(unit.unitId, {
      ...unit,
      minutes: allocated,
      sessions: Math.ceil(allocated / 90),
    });
  };

  const plans = new Map<string, StagePlan>();
  const scheduled: { stage: PaceStage; plan: StagePlan; remainingMinutes: number }[] = [];
  for (const stage of orderedStages(input.stages)) {
    let stageRemaining = 0;
    const work: RemainingUnit[] = [];
    const detailedMinutes = stage.units.reduce((n, u) => n + u.minutes, 0);
    for (const unit of stage.units) {
      const taskMinutes = unit.tasks.reduce((n, t) => n + t.minutes, 0);
      const lessonBudget = Math.max(0, unit.minutes - taskMinutes);
      if (taskMinutes > unit.minutes) incomplete = true;
      const lessonWeight = unit.lessons.reduce((n, l) => n + l.minutes, 0);
      let earned = 0;
      let skipped = 0;
      let blockedBMinutes = 0;
      const delayed: RemainingUnit["assessments"] = [];
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
            delayed.push({
              minutes: task.minutes,
              releaseAt:
                Math.max(
                  0,
                  (studyDateStartMs(dueDate) - studyDateStartMs(anchor ?? today)) / DAY_MS,
                ) * dailyMinutes,
              showInWeek: true,
            });
          } else if (preceding.length) {
            // 完了・診断を差し引いた通常の学習が終わった時点から7日間待つ。
            delayed.push({ minutes: task.minutes, releaseAt: null, showInWeek: true });
          } else {
            // 対応するAがない教材ではBの実施日を捏造しない。
            incomplete = true;
            delayed.push({ minutes: task.minutes, releaseAt: 0, showInWeek: false });
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
      stageRemaining += remaining;
      work.push({
        minutes: Math.max(0, remaining - blockedBMinutes),
        assessments: delayed,
        week: {
          stageId: stage.id,
          unitId: unit.id,
          title: unit.title,
          minutes: 0,
          sessions: 0,
          lessons: unit.lessons.filter((l) => !l.completed).map(({ id, title }) => ({ id, title })),
        },
      });
    }
    const undetailed = Math.max(0, stage.minutes - detailedMinutes);
    if (undetailed > 0 || detailedMinutes > stage.minutes) incomplete = true;
    totalMinutes += undetailed;
    if (stage.completed) completedMinutes += undetailed;
    else {
      stageRemaining += undetailed;
      work.push({ minutes: undetailed, week: null, assessments: [] });
    }
    cumulativeRemaining += stageRemaining;
    const plan: StagePlan = {
      // 前提順に並べてあるので、計画に含まれる前提はすでに登録済み。
      prerequisites: stage.prerequisites.flatMap((slug) => plans.get(slug) ?? []),
      units: work,
      index: 0,
      ready: work.flatMap(({ assessments, week }) =>
        assessments.flatMap(({ minutes, releaseAt, showInWeek }) =>
          releaseAt === null ? [] : [{ minutes, releaseAt, week: showInWeek ? week : null }],
        ),
      ),
      // 修了済みは前提の計画によらず完了。アプリの解放と同じく直接の前提だけを見る。
      finishedAt: stage.completed ? 0 : null,
    };
    plans.set(stage.slug, plan);
    scheduled.push({ stage, plan, remainingMinutes: stageRemaining });
  }
  scheduleStages(
    scheduled.map(({ plan }) => plan),
    dailyMinutes,
    recordWeek,
  );
  const dateAt = (minutes: number) =>
    anchor ? addStudyDays(anchor, calendarDayOffset(minutes / dailyMinutes)) : null;
  const targets: PaceTarget[] = scheduled.map(({ stage, plan, remainingMinutes }) => ({
    stageId: stage.id,
    title: stage.title,
    remainingMinutes,
    targetDate: dateAt(plan.finishedAt ?? 0),
  }));
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
    finishDate: dateAt(Math.max(0, ...scheduled.map(({ plan }) => plan.finishedAt ?? 0))),
    targets,
    thisWeek: [...weeklyUnits.values()],
    assessments: assessments.sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    incomplete,
  };
}
