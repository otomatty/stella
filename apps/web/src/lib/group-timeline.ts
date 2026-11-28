import type { GroupTimelineEvent } from "@stella/shared/groups/types";
import { addStudyDays, toStudyDate } from "@stella/shared/study/activity";

export function timelineEventText({ member, kind, stage, task }: GroupTimelineEvent): string {
  const subject = `${member.name}さん${member.isMe ? " (あなた) " : ""}が`;
  switch (kind) {
    case "stage_start":
      return `${subject}「${stage?.title ?? "ステージ"}」を始めました`;
    case "task_pass":
      return `${subject}「${stage?.title ?? "ステージ"}」の課題「${task?.title ?? "課題"}」に合格しました`;
    case "stage_clear":
      return `${subject}「${stage?.title ?? "ステージ"}」を修了しました 🎉`;
    case "ahead":
      return `${subject}先に進んでいます`;
  }
}

export function timelineDateHeading(date: string, now: Date | number): string {
  const today = toStudyDate(now);
  if (date === today) return "今日";
  if (date === addStudyDays(today, -1)) return "昨日";
  const [, month, day] = date.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

export function groupTimelineByDate(events: readonly GroupTimelineEvent[]) {
  const days = new Map<string, GroupTimelineEvent[]>();
  for (const event of events) {
    const rows = days.get(event.date) ?? [];
    rows.push(event);
    days.set(event.date, rows);
  }
  return [...days.entries()].sort(([a], [b]) => b.localeCompare(a));
}
