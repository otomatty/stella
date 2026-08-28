/**
 * 「今日のプラン」の組み立て — 純関数 (I/O を持たない)。
 *
 * ホームの一番上で「今日はこれをやれば良い」を 20〜30 分ぶんに束ねる。ダッシュボードに
 * 数字を並べるのをやめた代わりに、**その日の手順を 3 つ以内** で出すのがこの関数の役目。
 *
 * ## 決めたこと
 *
 * - **合計は 30 分を超えない**。超えるプランは読んだ時点で諦められる。目標は 20 分
 *   (`TODAY_PLAN_TARGET_MINUTES`) で、そこに届くまで項目を足す
 * - **並びは「短くて時効があるもの」から**。復習 (SRS) は今日やらないと忘却が進む一方、
 *   レッスンは明日でも同じ価値なので後ろに置く
 * - **レッスンは 1 本 15 分の見積り**。実際の長さは教材ごとに違うが、プランは
 *   「だいたいこれくらい」を伝えるためのもので、正確な合計時間の予告ではない
 * - **つまずきの見直しは余りがあるときだけ**。時間が無い日に「宿題が増える」と
 *   感じさせないため、最後に置いて溢れたら落とす
 * - 何も無い日は **空の配列を返す** (「やることがありません」の描き分けは画面側)
 */

/** 復習 1 問あたりの見積り秒数。 */
const REVIEW_SEC_PER_QUESTION = 40;
/** 復習項目の下限 / 上限 (分)。何問あっても 10 分で切り上げる。 */
const REVIEW_MIN_MINUTES = 3;
const REVIEW_MAX_MINUTES = 10;
/** レッスン 1 本の見積り (分)。 */
const LESSON_MINUTES = 15;
/** つまずきの見直しの見積り (分)。 */
const MISS_MINUTES = 5;
/** 目標の合計 (分)。ここに届くまで項目を足す。 */
export const TODAY_PLAN_TARGET_MINUTES = 20;
/** 合計の上限 (分)。 */
export const TODAY_PLAN_MAX_MINUTES = 30;

export type TodayPlanItemKind = "review" | "lesson" | "miss";

export interface TodayPlanItem {
  kind: TodayPlanItemKind;
  /** 見出し (何をやるか)。 */
  title: string;
  /** なぜ今日それをやるのか、の 1 行。 */
  reason: string;
  /** 見積り (分)。 */
  minutes: number;
}

export interface TodayPlanInput {
  /** 期日が来た復習カードの数 (`GET /api/srs/today` の `questions.length`)。 */
  srsDueCount: number;
  /** いま進めている星と、その次のレッスン。未着手 / 全完了なら null。 */
  activeStage?: {
    stageTitle: string;
    nextLessonTitle: string;
    /** 次のレッスンを含む残りレッスン数。 */
    remainingLessons: number;
  } | null;
  /**
   * 直近のつまずき。確認テストの不合格 (`quiz`) か、再提出になった課題 (`submission`)。
   * 無ければ null。
   */
  recentMiss?: {
    title: string;
    kind: "quiz" | "submission";
  } | null;
}

export interface TodayPlan {
  items: TodayPlanItem[];
  /** 見積りの合計 (分)。 */
  totalMinutes: number;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/** 今日やることを 20〜30 分ぶんに束ねる。 */
export function buildTodayPlan(input: TodayPlanInput): TodayPlan {
  const items: TodayPlanItem[] = [];
  let total = 0;

  const due = Math.max(0, Math.floor(input.srsDueCount));
  if (due > 0) {
    const minutes = clamp(
      Math.ceil((due * REVIEW_SEC_PER_QUESTION) / 60),
      REVIEW_MIN_MINUTES,
      REVIEW_MAX_MINUTES,
    );
    items.push({
      kind: "review",
      title: `今日の復習 ${due} 問`,
      reason: "期日が来たカードです。忘れる前の数分がいちばん効きます。",
      minutes,
    });
    total += minutes;
  }

  const active = input.activeStage;
  if (active && active.remainingLessons > 0) {
    // 残り時間に収まるだけ束ねる。1 本も入らない日でも、次の 1 本だけは必ず出す
    // (今日の主役はここなので、復習だけ出して終わりにしない)。
    const fits = Math.floor((TODAY_PLAN_MAX_MINUTES - total) / LESSON_MINUTES);
    const count = clamp(Math.min(active.remainingLessons, fits), 1, active.remainingLessons);
    const minutes = count * LESSON_MINUTES;
    items.push({
      kind: "lesson",
      title:
        count === 1 ? active.nextLessonTitle : `${active.nextLessonTitle} ほか ${count - 1} 本`,
      reason: `${active.stageTitle} の続きです。残り ${active.remainingLessons} レッスン。`,
      minutes,
    });
    total += minutes;
  }

  const miss = input.recentMiss;
  if (miss && total < TODAY_PLAN_TARGET_MINUTES && total + MISS_MINUTES <= TODAY_PLAN_MAX_MINUTES) {
    items.push({
      kind: "miss",
      title: miss.title,
      reason:
        miss.kind === "quiz"
          ? "直近の確認テストが不合格でした。要点だけ読み直しましょう。"
          : "再提出になった課題です。指摘を見直しましょう。",
      minutes: MISS_MINUTES,
    });
    total += MISS_MINUTES;
  }

  return { items, totalMinutes: total };
}
