import { isRunnerId, RUNNERS } from "@stella/shared/tasks/runners";
import type { StageContentPayload } from "./skill-map-api";

export function sumStageContent(
  contents: (StageContentPayload | undefined)[],
): StageContentPayload {
  const total: StageContentPayload = {
    units: 0,
    videos: 0,
    texts: 0,
    knowledge_questions: 0,
    tasks: 0,
    problems: 0,
    runners: [],
    planned_hours: null,
  };
  const runners = new Set<string>();
  for (const content of contents) {
    if (!content) continue;
    total.units += content.units;
    total.videos += content.videos;
    total.texts += content.texts;
    total.knowledge_questions += content.knowledge_questions;
    total.tasks += content.tasks;
    total.problems += content.problems;
    if (content.planned_hours !== null) {
      total.planned_hours = (total.planned_hours ?? 0) + content.planned_hours;
    }
    for (const runner of content.runners) runners.add(runner);
  }
  total.runners = [...runners];
  return total;
}

export function hasTasksOnly({ videos, texts, tasks }: StageContentPayload): boolean {
  return videos === 0 && texts === 0 && tasks > 0;
}

export function runnerLabelOf(id: string): string {
  return isRunnerId(id) ? RUNNERS[id].label : id;
}
