import type { GuidedStage, StageGrantGuidance } from "@stella/shared/stage-grants/types";

const DAY = 86_400_000;
const JST = 9 * 60 * 60 * 1000;

/** 端末のタイムゾーンによらず、日本時間の暦日で数える。 */
export function guidanceDate(iso: string): string {
  return new Date(Date.parse(iso) + JST).toISOString().slice(0, 10);
}

export function guidedDeadline(dueAt: string | null, now = new Date()) {
  if (!dueAt) return null;
  const date = guidanceDate(dueAt);
  const [, month, day] = date.split("-").map(Number);
  const label = `${month}/${day}`;
  const days = Math.round((Date.parse(date) - Date.parse(guidanceDate(now.toISOString()))) / DAY);
  return {
    days,
    urgent: days <= 3,
    short: days < 0 ? "期限を過ぎています" : days === 0 ? "今日まで" : `あと ${days} 日`,
    text:
      days < 0
        ? `期限を過ぎています（${label}）`
        : days === 0
          ? "今日まで"
          : `${label} まで・あと ${days} 日`,
  };
}

export function guidedStageCard(stage: GuidedStage) {
  return {
    button:
      stage.status === "locked" ? null : stage.status === "available" ? "始める" : "続きを開く",
    prerequisite:
      stage.status !== "locked"
        ? null
        : stage.prerequisite_titles.length
          ? `${stage.prerequisite_titles.map((title) => `『${title}』`).join("・")}を終えると始められます`
          : "開始の条件がそろうと始められます",
    progress: `${stage.progress.passed}/${stage.progress.total} ${stage.progress.unit === "problems" ? "問" : "課題"}`,
    percent:
      stage.progress.total > 0
        ? Math.min(100, Math.max(0, (stage.progress.passed / stage.progress.total) * 100))
        : 0,
  };
}

export interface GuidanceFields {
  sourceName: string;
  date: string;
  message: string;
}

/** 日付の実在も確認し、日本時間のその日の終わりを UTC にする。 */
export function guidancePayload(fields: GuidanceFields): StageGrantGuidance {
  if ([...fields.sourceName].length > 80)
    throw new Error("案内元の名前は80文字以内で入力してください");
  if ([...fields.message].length > 500) throw new Error("案内の文は500文字以内で入力してください");
  let dueAt: string | null = null;
  if (fields.date) {
    const time = Date.parse(`${fields.date}T23:59:59+09:00`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(fields.date) ||
      !Number.isFinite(time) ||
      guidanceDate(new Date(time).toISOString()) !== fields.date
    )
      throw new Error("期限は有効な日付で入力してください");
    dueAt = new Date(time).toISOString();
  }
  return {
    source_name: fields.sourceName.trim() || null,
    due_at: dueAt,
    message: fields.message.trim() || null,
  };
}

/** 畳んだ帯では、ステージ名の先頭にある案内元を重ねない。 */
export function guidedStageLineTitle(stage: Pick<GuidedStage, "title" | "source_name">): string {
  return stage.source_name && !stage.title.startsWith(stage.source_name)
    ? `${stage.source_name}・${stage.title}`
    : stage.title;
}
