import { and, count, eq, inArray, isNull, sql } from "drizzle-orm";

import type { Db } from "../db/client.js";
import {
  lessons,
  quizQuestions,
  quizzes,
  sections,
  stages,
  taskProblemSteps,
  tasks,
} from "../db/schema.js";
import { chunk, D1_MAX_BOUND_PARAMS } from "./enrollment-bulk.js";

export interface StageContentSummary {
  units: number;
  videos: number;
  texts: number;
  knowledgeQuestions: number;
  tasks: number;
  problems: number;
  runners: string[];
  plannedHours: number | null;
}

const STAGE_IDS_PER_QUERY = D1_MAX_BOUND_PARAMS - 10;

async function loadBatch(db: Db, summaries: Map<string, StageContentSummary>, ids?: string[]) {
  const sectionScope = ids === undefined ? undefined : inArray(sections.stageId, ids);
  // CASE guards the JSON functions even when an active task has a malformed definition.
  const definition = sql`case when json_valid(${tasks.definition}) then ${tasks.definition} end`;
  const runner = sql<string | null>`case when json_type(${definition}, '$.runner') = 'text'
    then json_extract(${definition}, '$.runner') end`;

  const [stageRows, lessonRows, knowledgeRows, taskRows] = await Promise.all([
    db
      .select({ id: stages.id, plannedHours: stages.durationHours, units: count(sections.id) })
      .from(stages)
      .leftJoin(sections, eq(sections.stageId, stages.id))
      .where(ids === undefined ? undefined : inArray(stages.id, ids))
      .groupBy(stages.id),
    db
      .select({
        id: sections.stageId,
        // 生成された教材動画は slides のまま video_path に入る。
        videos: sql<number>`count(*) filter (where ${lessons.type} = 'video'
          or (${lessons.type} = 'slides' and ${lessons.videoPath} <> ''))`,
        // 課題文と課題の問題ページも text として取り込まれる。
        texts: sql<number>`count(*) filter (where ${lessons.type} = 'text'
          and not exists (select 1 from ${tasks} where ${tasks.lessonId} = ${lessons.id})
          and not exists (select 1 from ${taskProblemSteps}
            where ${taskProblemSteps.stepLessonId} = ${lessons.id}))`,
      })
      .from(sections)
      .innerJoin(lessons, eq(lessons.sectionId, sections.id))
      .where(sectionScope)
      .groupBy(sections.stageId),
    db
      .select({ id: sections.stageId, knowledgeQuestions: count() })
      .from(sections)
      .innerJoin(lessons, eq(lessons.sectionId, sections.id))
      .innerJoin(quizzes, eq(quizzes.lessonId, lessons.id))
      .innerJoin(quizQuestions, eq(quizQuestions.quizId, quizzes.id))
      .where(and(sectionScope, eq(quizzes.source, "knowledge")))
      .groupBy(sections.stageId),
    db
      .select({
        id: sections.stageId,
        tasks: count(),
        problems: sql<number>`coalesce(sum(json_array_length(${definition}, '$.problems')), 0)`,
        runner,
      })
      .from(sections)
      .innerJoin(tasks, eq(tasks.sectionId, sections.id))
      .where(and(sectionScope, eq(tasks.active, true), isNull(tasks.variantOf)))
      .groupBy(sections.stageId, runner),
  ]);

  for (const { id, plannedHours, units } of stageRows) {
    summaries.set(id, {
      units,
      videos: 0,
      texts: 0,
      knowledgeQuestions: 0,
      tasks: 0,
      problems: 0,
      runners: [],
      plannedHours,
    });
  }

  for (const { id, videos, texts } of lessonRows) {
    const summary = summaries.get(id);
    if (summary) {
      summary.videos = videos;
      summary.texts = texts;
    }
  }

  for (const { id, knowledgeQuestions } of knowledgeRows) {
    const summary = summaries.get(id);
    if (summary) summary.knowledgeQuestions = knowledgeQuestions;
  }

  for (const row of taskRows) {
    const summary = summaries.get(row.id);
    if (!summary) continue;
    summary.tasks += row.tasks;
    summary.problems += row.problems;
    if (row.runner !== null) summary.runners.push(row.runner);
  }
}

export async function loadStageContentSummaries(
  db: Db,
  stageIds?: readonly string[],
): Promise<Map<string, StageContentSummary>> {
  const summaries = new Map<string, StageContentSummary>();
  if (stageIds === undefined) {
    await loadBatch(db, summaries);
  } else {
    for (const ids of chunk([...new Set(stageIds)], STAGE_IDS_PER_QUERY)) {
      await loadBatch(db, summaries, ids);
    }
  }
  for (const summary of summaries.values()) summary.runners.sort();
  return summaries;
}
